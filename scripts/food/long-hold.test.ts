import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {LocalMiniflareD1} from './local-miniflare-d1';
import {LocalTableOrderRepository} from '../../src/lib/food/table-local-order-repository';
import {createTableCheckoutService} from '../../src/lib/food/table-checkout-service';
import {createOfflineStripeTestAdapter} from '../../src/lib/food/table-test-payment';
import {syntheticAuthority,SYNTHETIC_NOW} from './order-simulation';
import {SYNTHETIC_STRIPE_CONFIG,signedFixture,realisticSyntheticWebhook} from './signed-payment-fixtures';
import {syntheticLongHoldAuthority,evaluateActualSyntheticHold} from './long-hold-fixture';

const now=SYNTHETIC_NOW;
const later=(minutes:number)=>new Date(Date.parse(now)+minutes*60000).toISOString();
function input(id:string,qty=1){return {id,key:`select-${id}`,productId:'food-product:synthetic-bowl',version:1,quantity:qty,windowId:'synthetic-window',locationReference:'synthetic-handoff',now,delivery:null};}
async function setup(capacity?:number){
  const db=await LocalMiniflareD1.create();
  try {
    const authority=syntheticLongHoldAuthority(syntheticAuthority(capacity),now);
    const repo=await LocalTableOrderRepository.open(db,authority);
    const app=createTableCheckoutService(repo,createOfflineStripeTestAdapter(SYNTHETIC_STRIPE_CONFIG));
    return {db,authority,repo,app};
  }catch(e){await db.close();throw e;}
}
async function reserve(s:Awaited<ReturnType<typeof setup>>,id:string,qty=1){
  await s.app.select(input(id,qty));
  const quoted=await s.app.quote(id,`quote-${id}`,1,now);
  assert.equal(quoted.status,'quote-ready');
  const intent=await s.app.reserve(id,`reserve-${id}`,2,now);
  return {quoted,intent};
}
async function webhook(s:Awaited<ReturnType<typeof setup>>,intent:Awaited<ReturnType<typeof reserve>>['intent'],type:string,id:string,at:string){
  const fixture=await signedFixture(realisticSyntheticWebhook(intent,type,id));
  return s.app.receiveWebhook(fixture.rawBody,fixture.signature,at);
}
test('real local workerd D1 holds 40 minutes and offline 30-minute provider proposal has five-minute margin',async t=>{
  const s=await setup();t.after(()=>s.db.close());
  const {quoted,intent}=await reserve(s,'synthetic-008-long');
  assert.equal(intent.expiresAt,later(40));
  assert.equal(quoted.quote?.expiresAt,later(40));
  const result=evaluateActualSyntheticHold(intent,quoted.quote!.expiresAt,now,s.authority.windows[0].startsAt,3,1);
  assert.equal(result.status,'OFFLINE_POLICY_COMPATIBLE');
  assert.equal(result.providerExpiresAt,later(30));
  assert.equal(result.providerExpirationPersistedInCurrentRepository,false);
  assert.equal(result.commercialAuthorized,false);
  assert.equal((await s.app.confirmation('synthetic-008-long')).realPaymentVerified,false);
});
test('signed synthetic payment inside provider window is accepted exactly once in local D1',async t=>{
  const s=await setup();t.after(()=>s.db.close());
  const {intent}=await reserve(s,'synthetic-008-paid');
  assert.equal(await webhook(s,intent,'checkout.session.completed','evt_008_once',later(29)),'accepted');
  assert.equal(await webhook(s,intent,'checkout.session.completed','evt_008_once',later(29)),'accepted');
  const snapshot=await s.repo.snapshot();
  assert.equal(snapshot.orders.filter(o=>o.status==='accepted').length,1);
  assert.equal(snapshot.capacity.resources.filter(r=>r.kind==='batch')[0].committed,1);
});
test('signed session-expired event cancels and late payment is recorded for refund without accepting order',async t=>{
  const s=await setup();t.after(()=>s.db.close());
  const {intent}=await reserve(s,'synthetic-008-expired');
  assert.equal(await webhook(s,intent,'checkout.session.expired','evt_008_expire',later(30)),'expired');
  assert.equal(await webhook(s,intent,'checkout.session.completed','evt_008_late',later(31)),'refund-required');
  assert.equal((await s.repo.get('synthetic-008-expired')).status,'canceled');
  assert.equal((await s.app.recover('recovery-008',later(32))).pending.some(p=>p.reason==='refund-required'),true);
});
test('concurrent local workerd D1 capacity does not oversell final serving',async t=>{
  const s=await setup(1);t.after(()=>s.db.close());
  await s.app.select(input('synthetic-008-a'));
  await s.app.select(input('synthetic-008-b'));
  assert.equal((await s.app.quote('synthetic-008-a','q-a',1,now)).status,'quote-ready');
  assert.equal((await s.app.quote('synthetic-008-b','q-b',1,now)).status,'quote-ready');
  const outcomes=await Promise.allSettled([s.app.reserve('synthetic-008-a','r-a',2,now),s.app.reserve('synthetic-008-b','r-b',2,now)]);
  assert.equal(outcomes.filter(o=>o.status==='fulfilled').length,1);
  assert.equal((await s.repo.snapshot()).capacity.resources.find(r=>r.kind==='batch')?.available,0);
});
test('cleanup after long hold expires cancels unpaid order and frees capacity',async t=>{
  const s=await setup();t.after(()=>s.db.close());
  const {intent}=await reserve(s,'synthetic-008-unpaid');
  assert.equal(intent.expiresAt,later(40));
  await s.repo.cleanup('cleanup-008',later(40));
  assert.equal((await s.repo.get('synthetic-008-unpaid')).status,'canceled');
  assert.equal((await s.repo.snapshot()).capacity.resources.find(r=>r.kind==='batch')?.available,6);
});
test('fixture validates synthetic boundary and never changes live authorization',async()=>{
  assert.throws(()=>syntheticLongHoldAuthority({...syntheticAuthority(),fixtureLabel:'OTHER'} as unknown as import("../../src/lib/food/table-order-engine").SimulationAuthority,now));
  const src=await readFile(new URL('./long-hold-fixture.ts',import.meta.url),'utf8');
  assert.doesNotMatch(src,/\bfetch\s*\(|new\s+Stripe\s*\(|\.sessions\.create\s*\(/);
});
