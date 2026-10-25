import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {LocalMiniflareD1} from './local-miniflare-d1';
import {LocalTableOrderRepository} from '../../src/lib/food/table-local-order-repository';
import {createTableCheckoutService} from '../../src/lib/food/table-checkout-service';
import {createOfflineStripeTestAdapter} from '../../src/lib/food/table-test-payment';
import {syntheticAuthority,SYNTHETIC_NOW} from './order-simulation';
import {SYNTHETIC_STRIPE_CONFIG,signedFixture,realisticSyntheticWebhook} from './signed-payment-fixtures';
import {syntheticLongHoldAuthority} from './long-hold-fixture';
import {createLocalProviderSessionLedger,createLocalProviderEventBoundary} from './provider-session-ledger';

const now=SYNTHETIC_NOW;
const at=(minutes:number)=>new Date(Date.parse(now)+minutes*60000).toISOString();
const verifier=()=>createOfflineStripeTestAdapter(SYNTHETIC_STRIPE_CONFIG);
async function setup(id='synthetic-009-one') {
  const db=await LocalMiniflareD1.create();
  try {
    const authority=syntheticLongHoldAuthority(syntheticAuthority(),now);
    const repo=await LocalTableOrderRepository.open(db,authority);
    const app=createTableCheckoutService(repo,verifier());
    await app.select({id,key:'new-'+id,productId:'food-product:synthetic-bowl',version:1,quantity:1,windowId:'synthetic-window',locationReference:'synthetic-handoff',now,delivery:null});
    await app.quote(id,'quote-'+id,1,now);
    const intent=await app.reserve(id,'reserve-'+id,2,now);
    const ledger=await createLocalProviderSessionLedger(db);
    await ledger.register(intent,now,at(30));
    return {db,repo,app,ledger,intent,id,boundary:createLocalProviderEventBoundary(ledger,verifier(),app)};
  }catch(e){await db.close();throw e;}
}
async function signed(intent:Awaited<ReturnType<typeof setup>>['intent'],kind='checkout.session.completed',event='evt_009_paid',patch:Record<string,unknown>={}){
  return signedFixture(realisticSyntheticWebhook(intent,kind,event,patch));
}
test('provider expiry is persisted separately from actual 40-minute hold on local workerd D1',async t=>{
  const s=await setup();t.after(()=>s.db.close());
  const found=await s.ledger.register(s.intent,now,at(30));
  assert.equal(found.providerExpiresAt,at(30));assert.equal(found.holdExpiresAt,at(40));
  assert.equal((await s.repo.get(s.id)).status,'awaiting-payment');
  assert.equal((await s.ledger.summary()).livePaymentVerified,false);
});
test('durable provider expiry and event review survive workerd restart',async t=>{
  const s=await setup();t.after(()=>s.db.close());
  const f=await signed(s.intent,'checkout.session.completed','evt_009_late');
  assert.equal(await s.boundary.receive(f.rawBody,f.signature,at(31)),'manual-review-required');
  await s.db.restart();
  const reopened=await createLocalProviderSessionLedger(s.db);
  assert.equal((await reopened.summary()).manualReview,1);
  assert.equal(await createLocalProviderEventBoundary(reopened,verifier(),s.app).receive(f.rawBody,f.signature,at(32)),'manual-review-required');
  assert.equal((await s.repo.get(s.id)).status,'awaiting-payment');
});
test('valid signed synthetic success inside separate provider window is accepted once',async t=>{
  const s=await setup();t.after(()=>s.db.close());
  const f=await signed(s.intent,'checkout.session.completed','evt_009_once');
  assert.equal(await s.boundary.receive(f.rawBody,f.signature,at(29)),'accepted');
  assert.equal(await s.boundary.receive(f.rawBody,f.signature,at(29)),'accepted');
  assert.equal((await s.ledger.summary()).delivered,1);
  assert.equal((await s.repo.snapshot()).capacity.resources.find(r=>r.kind==='batch')?.committed,1);
});
test('signed payment arriving after provider expiry requires review even if local capacity hold is still live',async t=>{
  const s=await setup();t.after(()=>s.db.close());
  const f=await signed(s.intent,'checkout.session.completed','evt_009_needs_review');
  assert.equal(await s.boundary.receive(f.rawBody,f.signature,at(31)),'manual-review-required');
  assert.equal((await s.repo.get(s.id)).status,'awaiting-payment');
  assert.equal((await s.ledger.summary()).manualReview,1);
  assert.equal((await s.repo.snapshot()).capacity.resources.find(r=>r.kind==='batch')?.committed,0);
});
test('signed expiry may cancel a local synthetic order and later paid evidence remains quarantined',async t=>{
  const s=await setup();t.after(()=>s.db.close());
  const expiry=await signed(s.intent,'checkout.session.expired','evt_009_expired');
  assert.equal(await s.boundary.receive(expiry.rawBody,expiry.signature,at(30)),'expired');
  const success=await signed(s.intent,'checkout.session.completed','evt_009_after_expiry');
  assert.equal(await s.boundary.receive(success.rawBody,success.signature,at(31)),'manual-review-required');
  assert.equal((await s.repo.get(s.id)).status,'canceled');
  assert.equal((await s.ledger.summary()).manualReview,1);
});
test('tampered signatures cause no provider event writes',async t=>{
  const s=await setup();t.after(()=>s.db.close());
  const f=await signed(s.intent,'checkout.session.completed','evt_009_bad');
  await assert.rejects(s.boundary.receive(f.rawBody+' ',f.signature,at(25)));
  assert.equal((await s.ledger.summary()).pending,0);
  assert.equal((await s.ledger.summary()).delivered,0);
});
test('conflicting session price or expiry cannot replace a recorded session',async t=>{
  const s=await setup();t.after(()=>s.db.close());
  await assert.rejects(s.ledger.register({...s.intent,amount:s.intent.amount+1},now,at(30)),/conflict/);
  await assert.rejects(s.ledger.register(s.intent,now,at(31)),/conflict/);
  await assert.rejects(s.ledger.register(s.intent,now,at(36)),/margin/);
  await assert.rejects(s.ledger.register(s.intent,now,at(29)),/between 30 minutes/);
});
test('lost acknowledgment after existing order service commits leaves event PENDING; replay is idempotent',async t=>{
  const s=await setup();t.after(()=>s.db.close());
  const f=await signed(s.intent,'checkout.session.completed','evt_009_lost_ack');
  const interrupted=createLocalProviderEventBoundary(s.ledger,verifier(),s.app,{afterForward:()=>{throw Error('synthetic-lost-ack');}});
  await assert.rejects(interrupted.receive(f.rawBody,f.signature,at(26)),/synthetic-lost-ack/);
  assert.equal((await s.ledger.summary()).pending,1);
  const restarted=await createLocalProviderSessionLedger(s.db);
  assert.equal(await createLocalProviderEventBoundary(restarted,verifier(),s.app).receive(f.rawBody,f.signature,at(26)),'accepted');
  assert.equal((await restarted.summary()).delivered,1);
  assert.equal((await s.repo.snapshot()).orders.filter(o=>o.status==='accepted').length,1);
});
test('replayed same event id with changed signed body is rejected',async t=>{
  const s=await setup();t.after(()=>s.db.close());
  const one=await signed(s.intent,'checkout.session.completed','evt_009_conflict');
  assert.equal(await s.boundary.receive(one.rawBody,one.signature,at(28)),'accepted');
  const altered=await signed(s.intent,'checkout.session.completed','evt_009_conflict',{status:'different'});
  await assert.rejects(s.boundary.receive(altered.rawBody,altered.signature,at(28)),/replay conflict/);
});
test('synthetic ledger cannot be imported from a public route',async()=>{
  for(const path of ['../../src/pages/api/commerce/create-checkout.ts','../../src/pages/api/commerce/stripe-webhook.ts']){
    const content=await readFile(new URL(path,import.meta.url),'utf8');
    assert.doesNotMatch(content,/provider-session-ledger/);
  }
  const content=await readFile(new URL('./provider-session-ledger.ts',import.meta.url),'utf8');
  assert.doesNotMatch(content,/new\s+Stripe\s*\(|\bfetch\s*\(|\.sessions\.create\s*\(/);
});
