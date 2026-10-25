import test, {type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import { LocalMiniflareD1 } from '../../../scripts/food/local-miniflare-d1';
import type { LocalTableDatabase } from '../../../scripts/food/local-test-d1';
import { LocalTableOrderRepository, TableLocalConflict } from './table-local-order-repository';
import { createTableCheckoutService } from './table-checkout-service';
import { createOfflineStripeTestAdapter, type TestCheckout } from './table-test-payment';
import { createTableLocalDiagnostics } from './table-local-diagnostics';
import { TABLE_CATALOG } from './table-catalog';
import { syntheticAuthority, syntheticCosting, SYNTHETIC_NOW as NOW, SYNTHETIC_HANDOFF as HANDOFF } from '../../../scripts/food/order-simulation';
import { SYNTHETIC_STRIPE_CONFIG, realisticSyntheticWebhook, signedFixture } from '../../../scripts/food/signed-payment-fixtures';

const LATER = '2026-10-21T14:05:00.000Z';
async function setup(t: TestContext, capacity = 6) {
  const db = await LocalMiniflareD1.create(); t.after(() => db.close());
  const diagnostics = createTableLocalDiagnostics(), authority = syntheticAuthority(capacity);
  const repo = await LocalTableOrderRepository.open(db, authority, diagnostics);
  return {db, repo, authority, diagnostics, app: createTableCheckoutService(repo, createOfflineStripeTestAdapter(SYNTHETIC_STRIPE_CONFIG))};
}
type App = Awaited<ReturnType<typeof setup>>['app'];
async function draft(app: App, repo: LocalTableOrderRepository, id = 'synthetic-order', quantity = 1) {
  await app.select({id, key: 'create', productId: 'food-product:synthetic-bowl', version: 1, quantity, windowId: 'synthetic-window', locationReference: 'synthetic-handoff', now: NOW, delivery: null});
  await app.quote(id, 'quote', 1, NOW); return repo.get(id);
}
async function hold(app: App, repo: LocalTableOrderRepository, id = 'synthetic-order', quantity = 1) {
  await draft(app, repo, id, quantity); return app.reserve(id, 'hold', 2, NOW);
}
async function receive(app: App, checkout: TestCheckout, type = 'checkout.session.completed', id = 'evt_synthetic_success', at = NOW, patch: Record<string, unknown> = {}) {
  const fixture = await signedFixture(realisticSyntheticWebhook(checkout, type, id, patch));
  return app.receiveWebhook(fixture.rawBody, fixture.signature, at);
}
async function invariant(repo: LocalTableOrderRepository) {
  const s = await repo.snapshot();
  for (const r of s.capacity.resources) {assert.ok(r.available >= 0); assert.equal(r.available + r.reserved + r.committed, r.capacity);}
  assert.equal(new Set(s.orders.map(o => o.id)).size, s.orders.length);
  assert.equal(new Set(s.checkouts.map(c => c.intent.paymentId)).size, s.checkouts.length);
  for (const o of s.orders) {
    assert.equal(o.version, o.events.length + 1); assert.equal(o.realPaymentVerified, false);
    const holds = s.capacity.holds.filter(h => h.orderId === o.id && ['held','committed'].includes(h.status)); assert.ok(holds.length <= 1);
    if (['accepted','preparing','ready-for-pickup','out-for-delivery','fulfilled'].includes(o.status)) {assert.ok(o.paymentEventId); assert.equal(holds[0]?.status, 'committed');}
    if (o.events.some(e => e.status === 'preparing')) assert.equal(holds[0]?.status, 'committed');
  }
  assert.equal((await repo.operations()).realRevenueCents, null); return s;
}
function readBarrier(db: LocalTableDatabase, count: number) {
  let active = false, arrivals = 0, release!: () => void;
  const gate = new Promise<void>(resolve => {release = resolve;});
  const client: LocalTableDatabase = {mode: 'local-synthetic-only', batch: s => db.batch(s), prepare(sql) {
    const statement = db.prepare(sql), wrapped = {bind: (...v: (string|number|null)[]) => {statement.bind(...v); return wrapped;}, all: async () => {
      const result = await statement.all();
      if (active && sql.startsWith('SELECT revision,payload_json') && arrivals < count) {if (++arrivals === count) release(); await gate;}
      return result;
    }}; return wrapped;
  }};
  return {client, arm: () => {active = true;}};
}

test('actual local D1 prepared statements, RETURNING, unique constraints and batch rollback', {timeout: 30000}, async t => {
  const {db, repo} = await setup(t);
  assert.equal(db.runtime, 'local-miniflare-workerd-d1');
  const before = (await repo.snapshot()).revision;
  const changed = await db.prepare('UPDATE table_synthetic_order_store SET revision=revision+1 WHERE id=? AND revision=? RETURNING revision').bind(1,before).all();
  assert.equal(changed.success, true); assert.equal(changed.meta?.changes, 1); assert.equal(changed.results.length, 1);
  const stale = await db.prepare('UPDATE table_synthetic_order_store SET revision=revision+1 WHERE revision=? RETURNING revision').bind(before).all();
  assert.equal(stale.results.length, 0); assert.equal(stale.meta?.changes, 0);
  await assert.rejects(db.batch([db.prepare('UPDATE table_synthetic_order_store SET revision=revision+1'),db.prepare('UPDATE table_synthetic_order_store SET revision=-1')]), /CHECK/);
  assert.equal((await repo.snapshot()).revision, before+1);
  await assert.rejects(db.prepare("INSERT INTO table_synthetic_order_store SELECT * FROM table_synthetic_order_store").all(), /UNIQUE/);
  await assert.rejects(db.prepare('BEGIN TRANSACTION').all());
  await invariant(repo);
});
test('two isolated request clients compete for the final serving; retry cannot inflate capacity', {timeout: 30000}, async t => {
  const {db,repo,app,authority} = await setup(t,1);
  await draft(app,repo,'synthetic-one'); await draft(app,repo,'synthetic-two');
  const gate = readBarrier(db,2);
  const a = await LocalTableOrderRepository.open(gate.client,authority), b = await LocalTableOrderRepository.open(gate.client,authority);
  gate.arm();
  const results = await Promise.allSettled([a.checkout('synthetic-one','hold',2,NOW),b.checkout('synthetic-two','hold',2,NOW)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length,1);
  assert.ok((results.find(r => r.status === 'rejected') as PromiseRejectedResult).reason instanceof TableLocalConflict);
  const loser = results[0].status === 'rejected' ? 'synthetic-one' : 'synthetic-two';
  await assert.rejects(repo.checkout(loser,'hold',2,NOW), /Capacity exhausted/);
  assert.equal((await invariant(repo)).capacity.resources[0].available,0);
});
test('five competing requests for three servings admit exactly three after bounded local retries', {timeout: 30000}, async t => {
  const {db,repo,app,authority} = await setup(t,3), gate = readBarrier(db,5), clients: LocalTableOrderRepository[] = [];
  for (let i=0;i<5;i++) {await draft(app,repo,`synthetic-${i}`); clients.push(await LocalTableOrderRepository.open(gate.client,authority));}
  gate.arm();
  const first = await Promise.allSettled(clients.map((r,i) => r.checkout(`synthetic-${i}`,'hold',2,NOW)));
  assert.equal(first.filter(r => r.status === 'fulfilled').length,1);
  for (let i=0;i<5;i++) if (first[i].status === 'rejected') {
    try {await repo.checkout(`synthetic-${i}`,'hold',2,NOW);} catch (error) {assert.match((error as Error).message,/Capacity exhausted/);}
    await invariant(repo);
  }
  const s = await invariant(repo); assert.equal(s.capacity.holds.length,3); assert.equal(s.capacity.resources[0].reserved,3);
});
test('duplicate checkout and concurrent signed success resolve one persisted hold, acceptance and payment', {timeout: 30000}, async t => {
  const {db,repo,app,authority} = await setup(t), intent = await hold(app,repo);
  assert.deepEqual(await app.reserve('synthetic-order','hold',2,NOW),intent);
  const b = await LocalTableOrderRepository.open(db,authority), secondApp = createTableCheckoutService(b,createOfflineStripeTestAdapter(SYNTHETIC_STRIPE_CONFIG));
  const results = await Promise.allSettled([receive(app,intent),receive(secondApp,intent)]);
  for (const r of results) if (r.status === 'rejected') assert.ok(r.reason instanceof TableLocalConflict);
  await receive(app,intent); await receive(app,intent,'checkout.session.async_payment_succeeded','evt_other');
  const s=await invariant(repo); assert.equal(s.capacity.resources[0].committed,1);
  assert.equal(s.orders[0].events.filter(e=>e.status==='accepted').length,1);
  assert.equal((await app.operations()).totalSyntheticReceiptsCents,1380n);
});
test('expiration during payment never commits an expired hold and late money remains recoverable', {timeout: 30000}, async t => {
  const {repo,app} = await setup(t), intent=await hold(app,repo);
  await app.recover('expire',LATER); await invariant(repo);
  assert.equal((await repo.diagnostics()).expiredHolds,1);
  assert.equal(await receive(app,intent,'checkout.session.completed','evt_late',LATER),'refund-required');
  assert.equal((await invariant(repo)).orders[0].status,'canceled');
  assert.equal((await repo.diagnostics()).unresolved.length,1);
  await receive(app,intent,'refund.updated','evt_late_refund',LATER);
  assert.equal((await repo.diagnostics()).unresolved.length,0); await invariant(repo);
});
test('local D1 SQL interruption rolls back payment, capacity, inbox and receipt together', {timeout: 30000}, async t => {
  const {db,repo,app}=await setup(t), intent=await hold(app,repo), before=await repo.snapshot();
  await db.prepare("CREATE TRIGGER interrupted BEFORE UPDATE ON table_synthetic_order_store BEGIN SELECT RAISE(ABORT,'synthetic interrupted write'); END").all();
  await assert.rejects(receive(app,intent), /synthetic interrupted write/); assert.deepEqual(await repo.snapshot(),before);
  await db.prepare('DROP TRIGGER interrupted').all(); await receive(app,intent); await invariant(repo);
});
test('workerd shutdown and D1 reopen recover committed acceptance after acknowledgment loss', {timeout: 30000}, async t => {
  const {db,repo,app,authority}=await setup(t), intent=await hold(app,repo); let lose=true;
  const bridge: LocalTableDatabase={mode:'local-synthetic-only',batch:s=>db.batch(s),prepare(sql) {
    const statement=db.prepare(sql), wrapped={bind:(...v:(string|number|null)[])=>{statement.bind(...v);return wrapped;},all:async()=>{
      const result=await statement.all();if(sql.startsWith('UPDATE')&&lose){lose=false;throw new Error('lost acknowledgment');}return result;
    }};return wrapped;
  }};
  const interrupted=createTableCheckoutService(await LocalTableOrderRepository.open(bridge,authority),createOfflineStripeTestAdapter(SYNTHETIC_STRIPE_CONFIG));
  await assert.rejects(receive(interrupted,intent),/lost acknowledgment/);
  const before=await repo.snapshot();await db.restart();
  const reopened=await LocalTableOrderRepository.open(db,authority), resumed=createTableCheckoutService(reopened,createOfflineStripeTestAdapter(SYNTHETIC_STRIPE_CONFIG));
  assert.deepEqual(await reopened.snapshot(),before);assert.equal(await receive(resumed,intent),'accepted');
  await invariant(reopened);assert.equal((await resumed.operations()).totalSyntheticReceiptsCents,1380n);
});
for (const prepared of [false,true]) test(`D1 cancellation and refund ${prepared?'after':'before'} preparation retain correct capacity`, {timeout:30000}, async t=>{
  const {repo,app}=await setup(t),intent=await hold(app,repo);await receive(app,intent);
  if(prepared) await app.progress('synthetic-order','prepare',(await repo.get('synthetic-order')).version,'prepare',NOW);
  await app.progress('synthetic-order','cancel',(await repo.get('synthetic-order')).version,'cancel',NOW);
  await receive(app,intent,'refund.updated','evt_refund');await receive(app,intent,'refund.updated','evt_refund');
  const s=await invariant(repo);assert.equal(s.capacity.resources[0].available,prepared?5:6);
  await assert.rejects(app.progress('synthetic-order','bad',(await repo.get('synthetic-order')).version,'fulfill',HANDOFF));
});
test('D1 full journey, handling evidence, original quote, sanitized confirmation and unknown costs', {timeout:30000},async t=>{
  const {repo,app}=await setup(t),intent=await hold(app,repo,'synthetic-order',2);const quoted=(await repo.get('synthetic-order')).quote;
  await assert.rejects(app.progress('synthetic-order','early',3,'prepare',NOW));await receive(app,intent);await invariant(repo);
  await app.progress('synthetic-order','prepare',(await repo.get('synthetic-order')).version,'prepare',NOW);
  await assert.rejects(app.progress('synthetic-order','ready',(await repo.get('synthetic-order')).version,'ready',NOW));
  await app.progress('synthetic-order','ready',(await repo.get('synthetic-order')).version,'ready',NOW,'synthetic-handling');
  await app.progress('synthetic-order','fulfill',(await repo.get('synthetic-order')).version,'fulfill',HANDOFF,'synthetic-handoff');await invariant(repo);
  const confirmation=await app.confirmation('synthetic-order');assert.equal(confirmation.stage,'fulfilled');assert.equal(confirmation.realPaymentVerified,false);
  assert.deepEqual((await repo.get('synthetic-order')).quote,quoted);assert.doesNotMatch(JSON.stringify(confirmation),/secret|signature|evidenceReference|weeklyProfit|customerReference/);
  assert.equal((await app.operations()).operatingProfitCents,null);assert.equal((await app.operations(syntheticCosting())).operatingProfitCents,1200n);
});
test('refund initiated, failed, completed and duplicate reconcile durably without automatic external retry', {timeout:30000},async t=>{
  const {db,repo,app,authority}=await setup(t),intent=await hold(app,repo);await receive(app,intent);
  assert.equal(await receive(app,intent,'refund.created','evt_request'),'refund-requested');
  assert.equal((await repo.get('synthetic-order')).status,'refund-pending');await invariant(repo);
  assert.equal(await receive(app,intent,'refund.failed','evt_failed'),'refund-failed');assert.ok((await repo.diagnostics()).unresolved.length>0);
  await db.restart();const fresh=await LocalTableOrderRepository.open(db,authority),resumed=createTableCheckoutService(fresh,createOfflineStripeTestAdapter(SYNTHETIC_STRIPE_CONFIG));
  await receive(resumed,intent,'refund.updated','evt_refunded');await receive(resumed,intent,'refund.updated','evt_refunded_again');
  assert.equal((await resumed.operations()).refundedCents,1380n);assert.equal((await fresh.diagnostics()).unresolved.length,0);await invariant(fresh);
});
test('refund-before-payment, pending checkout with null PaymentIntent and out-of-order failure are safe in D1', {timeout:30000},async t=>{
  const {repo,app}=await setup(t),intent=await hold(app,repo);
  await receive(app,intent,'checkout.session.completed','evt_pending',NOW,{payment_status:'unpaid'});
  await receive(app,intent,'refund.created','evt_request');await receive(app,intent,'refund.updated','evt_refund');
  await receive(app,intent);await receive(app,intent,'checkout.session.async_payment_failed','evt_failed',NOW,{payment_status:'unpaid'});
  assert.equal((await invariant(repo)).orders[0].status,'refunded');assert.equal((await app.operations()).netOperatingRevenueCents,0n);
});
test('structured diagnostics identify failures and retries without raw errors, keys, signatures or contacts', {timeout:30000},async t=>{
  const {repo,app,diagnostics}=await setup(t,1),intent=await hold(app,repo);
  await assert.rejects(app.receiveWebhook('{"address":"sensitive"}','signature-secret',NOW));
  await app.reserve('synthetic-order','hold',2,NOW);await receive(app,intent);await receive(app,intent);
  await assert.rejects(repo.execute('synthetic-order','private-secret-operation',1,{type:'cancel'},NOW));
  await draft(app,repo,'synthetic-competing');
  await assert.rejects(app.reserve('synthetic-competing','hold',2,NOW),/Capacity exhausted/);
  const report=await repo.diagnostics();assert.ok(diagnostics.snapshot().some(r=>r.code==='payment-evidence-rejected'));
  assert.ok(report.attempts.some(r=>r.code==='duplicate-request'));assert.ok(report.attempts.some(r=>r.code==='version-conflict'));
  assert.ok(report.attempts.some(r=>r.code==='capacity-exhausted'&&r.boundary==='checkout'));
  assert.doesNotMatch(JSON.stringify(report),/signature-secret|private-secret-operation|sensitive|rawBody|webhookSecret|sk_test_/);
  assert.equal(report.productionBehavior,'UNVERIFIED');await invariant(repo);
});
test('target-compatible local D1 never makes the actual product payable or accepts client-total authority', {timeout:30000},async t=>{
  const db=await LocalMiniflareD1.create();t.after(()=>db.close());
  const authority={...syntheticAuthority(),catalog:TABLE_CATALOG};
  const repo=await LocalTableOrderRepository.open(db,authority),app=createTableCheckoutService(repo,createOfflineStripeTestAdapter(SYNTHETIC_STRIPE_CONFIG));
  const request={id:'synthetic-actual',key:'create',productId:TABLE_CATALOG[0].product.id,version:1,quantity:1,windowId:'synthetic-window',locationReference:'synthetic-handoff',now:NOW,delivery:null};
  await assert.rejects(app.select(request),/blocked/);
  await assert.rejects(app.select({...request,total:1} as typeof request));
  assert.equal((await app.eligibility(request.productId,1)).commercialAuthorized,false);
  assert.equal((await invariant(repo)).orders.length,0);
});
