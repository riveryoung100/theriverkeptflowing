import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {LocalMiniflareD1} from './local-miniflare-d1';
import {LocalTableOrderRepository} from '../../src/lib/food/table-local-order-repository';
import {createTableCheckoutService} from '../../src/lib/food/table-checkout-service';
import {createOfflineStripeTestAdapter} from '../../src/lib/food/table-test-payment';
import {syntheticAuthority,SYNTHETIC_NOW as NOW} from './order-simulation';
import {syntheticLongHoldAuthority} from './long-hold-fixture';
import {SYNTHETIC_STRIPE_CONFIG,signedFixture,realisticSyntheticWebhook} from './signed-payment-fixtures';
import {createLocalProviderSessionLedger,createLocalProviderEventBoundary} from './provider-session-ledger';
import {createLocalProviderExceptionQueue} from './provider-exception-queue';

const at=(mins:number)=>new Date(Date.parse(NOW)+mins*60_000).toISOString();
const payment=()=>createOfflineStripeTestAdapter(SYNTHETIC_STRIPE_CONFIG);
async function setup(id='synthetic-010-case') {
  const db=await LocalMiniflareD1.create();
  try {
    const repo=await LocalTableOrderRepository.open(db,syntheticLongHoldAuthority(syntheticAuthority(),NOW));
    const app=createTableCheckoutService(repo,payment());
    await app.select({id,key:'create',productId:'food-product:synthetic-bowl',version:1,quantity:1,windowId:'synthetic-window',locationReference:'synthetic-handoff',now:NOW,delivery:null});
    await app.quote(id,'quote',1,NOW);
    const intent=await app.reserve(id,'reserve',2,NOW);
    const ledger=await createLocalProviderSessionLedger(db);
    await ledger.register(intent,NOW,at(30));
    const boundary=createLocalProviderEventBoundary(ledger,payment(),app);
    const queue=await createLocalProviderExceptionQueue(db);
    return {db,repo,app,intent,ledger,boundary,queue,id};
  } catch(error) {await db.close();throw error;}
}
async function send(s:Awaited<ReturnType<typeof setup>>,atMinute:number,event='evt_010_late') {
  const signature=await signedFixture(realisticSyntheticWebhook(s.intent,'checkout.session.completed',event));
  return s.boundary.receive(signature.rawBody,signature.signature,at(atMinute));
}
test('signed late event is quarantined; private sync never accepts an order or commits capacity',async t=>{
  const s=await setup();t.after(()=>s.db.close());
  assert.equal(await send(s,31),'manual-review-required');
  const before=await s.queue.summary();assert.equal(before.unsyncedCases,1);
  const synced=await s.queue.sync();assert.equal(synced.open,1);assert.equal(synced.unsyncedCases,0);
  assert.equal((await s.repo.get(s.id)).status,'awaiting-payment');
  assert.equal((await s.repo.snapshot()).capacity.resources.find(r=>r.kind==='batch')?.committed,0);
  assert.equal(synced.paymentAuthorized,false);
});
test('failed signed signature never inserts either an event or a case',async t=>{
  const s=await setup();t.after(()=>s.db.close());
  const signed=await signedFixture(realisticSyntheticWebhook(s.intent,'checkout.session.completed','evt_010_bad'));
  await assert.rejects(s.boundary.receive(signed.rawBody+'altered',signed.signature,at(31)));
  assert.equal((await s.queue.sync()).materializedCases,0);
});
test('acknowledge and escalate are durable audit states, not payment approval',async t=>{
  const s=await setup();t.after(()=>s.db.close());await send(s,31);await s.queue.sync();
  assert.equal((await s.queue.acknowledge('evt_010_late','ack_010_1')).status,'ACKNOWLEDGED');
  assert.equal((await s.queue.acknowledge('evt_010_late','ack_010_1')).status,'ACKNOWLEDGED');
  await assert.rejects(s.queue.acknowledge('evt_010_late','ack_010_other'),/collision/);
  assert.equal((await s.queue.escalate('evt_010_late','escalate_010_1')).status,'ESCALATED');
  assert.equal((await s.queue.escalate('evt_010_late','escalate_010_1')).status,'ESCALATED');
  await assert.rejects(s.queue.escalate('evt_010_late','escalate_010_2'),/collision/);
  assert.equal((await s.queue.summary()).escalated,1);
  assert.equal((await s.repo.get(s.id)).status,'awaiting-payment');
});
test('cannot escalate an unacknowledged case, invent a case, or use unsafe references',async t=>{
  const s=await setup();t.after(()=>s.db.close());await send(s,31);await s.queue.sync();
  await assert.rejects(s.queue.escalate('evt_010_late','key_010'),/Acknowledge/);
  await assert.rejects(s.queue.acknowledge('evt_unknown','key_010'),/Unknown/);
  await assert.rejects(s.queue.acknowledge('evt_010_late','x'),/Safe synthetic/);
  await assert.rejects(s.queue.inspect('other-order'),/Synthetic event/);
});
test('restart recovers quarantine case and transitions without running any Stripe network operation',async t=>{
  const s=await setup();t.after(()=>s.db.close());await send(s,31);await s.queue.sync();
  await s.queue.acknowledge('evt_010_late','ack_010_1');
  await s.db.restart();const reopened=await createLocalProviderExceptionQueue(s.db);
  assert.equal((await reopened.inspect('evt_010_late'))?.status,'ACKNOWLEDGED');
  assert.equal((await reopened.escalate('evt_010_late','escalate_010_1')).status,'ESCALATED');
  assert.equal((await reopened.sync()).materializedCases,1);
});
test('concurrent sync produces one durable case without duplicate receipts',async t=>{
  const s=await setup();t.after(()=>s.db.close());await send(s,31);
  await Promise.all([s.queue.sync(),s.queue.sync(),s.queue.sync()]);
  assert.equal((await s.queue.summary()).materializedCases,1);
});
test('concurrent acknowledgement cannot overwrite an existing action key',async t=>{
  const s=await setup();t.after(()=>s.db.close());await send(s,31);await s.queue.sync();
  const results=await Promise.allSettled([s.queue.acknowledge('evt_010_late','ack_010_one'),s.queue.acknowledge('evt_010_late','ack_010_two')]);
  assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
  assert.equal((await s.queue.summary()).acknowledged,1);
});
test('database interruption never half-applies acknowledgment; retry works',async t=>{
  const s=await setup();t.after(()=>s.db.close());await send(s,31);await s.queue.sync();
  await s.db.prepare("CREATE TRIGGER synthetic_review_interrupt BEFORE UPDATE ON table_synthetic_payment_review_010 BEGIN SELECT RAISE(ABORT,'synthetic interruption'); END").all();
  await assert.rejects(s.queue.acknowledge('evt_010_late','ack_010_1'),/interruption/);
  assert.equal((await s.queue.inspect('evt_010_late'))?.status,'OPEN');
  await s.db.prepare('DROP TRIGGER synthetic_review_interrupt').all();
  assert.equal((await s.queue.acknowledge('evt_010_late','ack_010_1')).status,'ACKNOWLEDGED');
});
test('early signed success does not produce a review case; existing order service retains authority',async t=>{
  const s=await setup();t.after(()=>s.db.close());assert.equal(await send(s,28,'evt_010_early'),'accepted');
  assert.equal((await s.queue.sync()).materializedCases,0);
  assert.equal((await s.repo.get(s.id)).status,'accepted');
});
test('private case listings redact identities and expose no customer or payment approval',async t=>{
  const s=await setup();t.after(()=>s.db.close());await send(s,31);await s.queue.sync();
  const result=JSON.stringify(await s.queue.cases());
  assert.doesNotMatch(result,/evt_010_late|cs_test|pi_synthetic|synthetic-010-case|webhookSecret|rawBody/);
  assert.match(result,/eventHash/);
  assert.equal((await s.queue.cases(1)).length,1);
  await assert.rejects(s.queue.cases(101));
});
test('public pages and commerce handlers cannot import private FOOD-010 diagnostics',async()=>{
  for(const path of ['../../src/pages/api/commerce/create-checkout.ts','../../src/pages/api/commerce/stripe-webhook.ts']){
    const content=await readFile(new URL(path,import.meta.url),'utf8');
    assert.doesNotMatch(content,/provider-exception-queue|provider-exception-report/);
  }
  const source=await readFile(new URL('./provider-exception-queue.ts',import.meta.url),'utf8');
  assert.doesNotMatch(source,/\bfetch\s*\(|new\s+Stripe\s*\(|\.sessions\.create\s*\(/);
});
