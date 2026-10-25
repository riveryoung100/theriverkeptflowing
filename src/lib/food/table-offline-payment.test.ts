import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { LocalTestD1 } from '../../../scripts/food/local-test-d1';
import { LocalTableOrderRepository } from './table-local-order-repository';
import { createTableCheckoutService } from './table-checkout-service';
import { createOfflineStripeTestAdapter, type TestCheckout } from './table-test-payment';
import { createTableLocalDiagnostics, type TableDiagnosticCode } from './table-local-diagnostics';
import { validateFoodElectronicPaymentConfirmationVersion } from './electronic-payment-confirmation-domain';
import { syntheticAuthority, SYNTHETIC_NOW as NOW, SYNTHETIC_HANDOFF as HANDOFF } from '../../../scripts/food/order-simulation';
import { SYNTHETIC_STRIPE_CONFIG, realisticSyntheticWebhook, signedFixture } from '../../../scripts/food/signed-payment-fixtures';

const adapter = () => createOfflineStripeTestAdapter(SYNTHETIC_STRIPE_CONFIG);
async function setup() {
  const db=new LocalTestD1(':memory:'),repo=await LocalTableOrderRepository.open(db,syntheticAuthority(),createTableLocalDiagnostics());
  return {db,repo,app:createTableCheckoutService(repo,adapter())};
}
async function hold(s:Awaited<ReturnType<typeof setup>>,id='synthetic-payment') {
  await s.app.select({id,key:'create',productId:'food-product:synthetic-bowl',version:1,quantity:1,windowId:'synthetic-window',locationReference:'synthetic-handoff',now:NOW,delivery:null});
  await s.app.quote(id,'quote',1,NOW);return s.app.reserve(id,'reserve',2,NOW);
}
async function send(s:Awaited<ReturnType<typeof setup>>,intent:TestCheckout,type='checkout.session.completed',id='evt_synthetic_success',patch:Record<string,unknown>={}) {
  const signed=await signedFixture(realisticSyntheticWebhook(intent,type,id,patch));return s.app.receiveWebhook(signed.rawBody,signed.signature,NOW);
}
test('official SDK authenticates realistic synthetic raw body, but evidence cannot satisfy a production food confirmation',async t=>{
  const s=await setup();t.after(()=>s.db.close());const intent=await hold(s),fixture=await signedFixture(realisticSyntheticWebhook(intent));
  const evidence=await adapter().verify(fixture.rawBody,fixture.signature);
  assert.equal(evidence.provenance,'synthetic-stripe-test');assert.throws(()=>validateFoodElectronicPaymentConfirmationVersion(evidence));
  assert.equal(adapter().networkEnabled,false);assert.equal((await s.app.confirmation(intent.orderId)).paymentStatus,'not-confirmed');
});
test('invalid, altered and expired signatures reject before writes',async t=>{
  const s=await setup();t.after(()=>s.db.close());const intent=await hold(s),before=await s.repo.snapshot();
  const raw=realisticSyntheticWebhook(intent),valid=await signedFixture(raw),old=await signedFixture(raw,1);
  for(const fixture of [{rawBody:raw,signature:'invalid'}, {rawBody:raw+' ',signature:valid.signature},old]) await assert.rejects(s.app.receiveWebhook(fixture.rawBody,fixture.signature,NOW));
  assert.deepEqual(await s.repo.snapshot(),before);
});
for(const [name,patch] of Object.entries({amount:{amount_total:1},currency:{currency:'eur'},unpaidSuccess:{payment_status:'unpaid',payment_intent:'pi_synthetic_wrong'},unknownSession:{id:'cs_test_synthetic_unknown'}})) test(`realistic signed ${name} cannot authorize an order`,async t=>{
  const s=await setup();t.after(()=>s.db.close());const intent=await hold(s),before=await s.repo.snapshot();
  await assert.rejects(send(s,intent,'checkout.session.async_payment_succeeded','evt_invalid',patch));assert.deepEqual(await s.repo.snapshot(),before);
});
test('incorrect order, product/version fingerprint and quote fingerprint are rejected despite valid signature',async t=>{
  const s=await setup();t.after(()=>s.db.close());const intent=await hold(s);
  for(const patch of [{orderId:'synthetic-wrong'},{productFingerprint:'wrong-version'},{quoteFingerprint:'wrong-quote'}]) await assert.rejects(send(s,{...intent,...patch}));
  assert.equal((await s.repo.get(intent.orderId)).status,'awaiting-payment');
});
test('unknown signed event types and non-test envelopes fail closed',async t=>{
  const s=await setup();t.after(()=>s.db.close());const intent=await hold(s),before=await s.repo.snapshot();
  await assert.rejects(send(s,intent,'payment_intent.succeeded'));
  for(const patch of [{livemode:true},{account:'acct_synthetic_other'}]) {
    const raw=JSON.stringify({...JSON.parse(realisticSyntheticWebhook(intent)),...patch}),fixture=await signedFixture(raw);
    await assert.rejects(s.app.receiveWebhook(fixture.rawBody,fixture.signature,NOW));
  }
  assert.deepEqual(await s.repo.snapshot(),before);
});
test('checkout pending with null PaymentIntent is nonpayable until signed asynchronous success',async t=>{
  const s=await setup();t.after(()=>s.db.close());const intent=await hold(s);
  assert.equal(await send(s,intent,'checkout.session.completed','evt_pending',{payment_status:'unpaid'}),'pending-payment');
  assert.equal((await s.app.confirmation(intent.orderId)).fulfillment.confirmedWindow,null);
  assert.equal(await send(s,intent,'checkout.session.async_payment_succeeded','evt_paid'),'accepted');
  await send(s,intent,'checkout.session.completed','evt_paid_again');assert.equal((await s.app.operations()).totalSyntheticReceiptsCents,1380n);
});
test('refund initiation and failure never fabricate a successful refund; pending updated objects are supported',async t=>{
  const s=await setup();t.after(()=>s.db.close());const intent=await hold(s);await send(s,intent);
  await send(s,intent,'refund.created','evt_refund_created');await send(s,intent,'refund.updated','evt_refund_pending',{status:'pending'});
  assert.equal((await s.repo.get(intent.orderId)).status,'refund-pending');assert.equal((await s.app.operations()).refundedCents,0n);
  await send(s,intent,'refund.failed','evt_refund_failed');assert.equal((await s.app.recover('recover',NOW)).pending.some(i=>i.reason==='refund-failed'),true);
  await send(s,intent,'refund.updated','evt_refund_completed');await send(s,intent,'refund.updated','evt_refund_duplicate');
  assert.equal((await s.app.operations()).refundedCents,1380n);assert.equal((await s.repo.diagnostics()).unresolved.length,0);
});
test('a refund provider identity cannot bind to a different payment/order',async t=>{
  const s=await setup();t.after(()=>s.db.close());const a=await hold(s,'synthetic-a');await send(s,a,'checkout.session.completed','evt_a');
  const b=await hold(s,'synthetic-b');await send(s,b,'checkout.session.completed','evt_b');
  const refundId=`re_synthetic_${a.quoteId}`;await send(s,a,'refund.created','evt_refund_a',{id:refundId});
  await assert.rejects(send(s,b,'refund.created','evt_refund_b',{id:refundId}),/Refund identity/);
  assert.equal((await s.repo.get(b.orderId)).status,'accepted');
});
test('expired/canceled checkout records delayed success for refund rather than reactivating an order',async t=>{
  const s=await setup();t.after(()=>s.db.close());const intent=await hold(s);
  await send(s,intent,'checkout.session.expired','evt_expired');assert.equal(await send(s,intent),'refund-required');
  assert.equal((await s.repo.get(intent.orderId)).status,'canceled');assert.equal((await s.repo.snapshot()).capacity.resources[0].available,6);
});
test('test mode configuration rejects missing configuration and live key shape without reading environment secrets',()=>{
  for(const patch of [{mode:'live'},{fixturesOnly:false},{secretKey:''},{secretKey:'sk_live_SYNTHETIC_REJECT'},{webhookSecret:''},{account:'acct_not_synthetic'}]) assert.throws(()=>createOfflineStripeTestAdapter({...SYNTHETIC_STRIPE_CONFIG,...patch} as typeof SYNTHETIC_STRIPE_CONFIG));
});
test('pending delivery refunds provision finance immediately and confirmed refunds remain consistent after handoff recovery',async t=>{
  const db=new LocalTestD1(':memory:');t.after(()=>db.close());const base=syntheticAuthority(),authority={...base,windows:[{...base.windows[0],method:'personal-delivery' as const}]};
  const repo=await LocalTableOrderRepository.open(db,authority),app=createTableCheckoutService(repo,adapter()),s={db,repo,app},id='synthetic-delivery';
  await app.select({id,key:'create',productId:'food-product:synthetic-bowl',version:1,quantity:1,windowId:'synthetic-window',locationReference:'synthetic-handoff',now:NOW,delivery:{id:'synthetic-address-request',orderId:id,locationReference:'synthetic-handoff',addressEvidenceReference:'synthetic-address',distanceMeters:100,distanceEvidenceReference:'synthetic-distance',approval:null}});
  await app.quote(id,'quote',1,NOW);const intent=await app.reserve(id,'reserve',2,NOW);await send(s,intent);
  for(const stage of ['prepare','ready','dispatch'] as const) await app.progress(id,stage,(await repo.get(id)).version,stage,stage==='dispatch'?HANDOFF:NOW,stage==='prepare'?undefined:'synthetic-handling');
  async function refund(type:string,eventId:string) {const signed=await signedFixture(realisticSyntheticWebhook(intent,type,eventId));return app.receiveWebhook(signed.rawBody,signed.signature,HANDOFF);}
  await refund('refund.created','evt_delivery_pending');let report=await app.operations();
  assert.equal(report.pendingRefundCents,1380n);assert.equal(report.netOperatingRevenueCents,0n);assert.equal(report.refundedCents,0n);
  await refund('refund.updated','evt_delivery_refunded');report=await app.operations();assert.equal(report.pendingRefundCents,0n);assert.equal(report.refundedCents,1380n);
  await app.progress(id,'fulfill',(await repo.get(id)).version,'fulfill',HANDOFF,'synthetic-handoff');await app.recover('recover',HANDOFF);
  assert.equal((await app.operations()).refundedCents,1380n);assert.equal((await repo.diagnostics()).unresolved.length,0);
});
test('diagnostic buffer is bounded, whitelisted and redacts all supplied operation strings',()=>{
  const diagnostics=createTableLocalDiagnostics();for(let i=0;i<205;i++) diagnostics.record('storage-failure',`signature-private-address-${i}`);
  assert.equal(diagnostics.snapshot().length,200);assert.equal(diagnostics.snapshot()[0].sequence,6);
  assert.throws(()=>diagnostics.record('raw-secret' as TableDiagnosticCode,'ignored'));
  assert.doesNotMatch(JSON.stringify(diagnostics.snapshot()),/signature-private|raw-secret|address/);
});
test('public routes and commerce handlers cannot import local D1 harness, diagnostics or synthetic contracts',async()=>{
  async function files(path:string):Promise<string[]> {return (await Promise.all((await readdir(path,{withFileTypes:true})).map(e=>e.isDirectory()?files(join(path,e.name)):[join(path,e.name)]))).flat();}
  for(const file of [...await files('src/pages'),...await files('src/components'),...await files('src/lib/commerce')].filter(p=>!p.endsWith('.test.ts'))) assert.doesNotMatch(await readFile(file,'utf8'),/local-miniflare-d1|table-local-diagnostics|realisticSyntheticWebhook|table-test-payment|table-local-order-repository/);
  const source=await readFile('scripts/food/local-miniflare-d1.ts','utf8');assert.match(source,/cf: false/);assert.doesNotMatch(source,/remoteProxyConnectionString|database_id|process\.env/);
});
