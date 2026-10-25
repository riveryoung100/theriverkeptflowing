import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { LocalTestD1, type LocalTableDatabase } from '../../../scripts/food/local-test-d1';
import { LocalTableOrderRepository } from './table-local-order-repository';
import { createTableCheckoutService, type SyntheticSelection } from './table-checkout-service';
import { createOfflineStripeTestAdapter, type TestCheckout } from './table-test-payment';
import { TABLE_CATALOG } from './table-catalog';
import { TABLE_ORDER_STATUSES } from './table-order-status';
import { modelFingerprint } from './table-capacity-model';
import { SYNTHETIC_STRIPE_CONFIG, signedFixture, syntheticWebhook } from '../../../scripts/food/signed-payment-fixtures';
import { syntheticAuthority, syntheticCosting, SYNTHETIC_NOW as NOW, SYNTHETIC_HANDOFF as HANDOFF } from '../../../scripts/food/order-simulation';
import type { SimulationAuthority } from './table-order-engine';

const selection = (id = 'synthetic-integrated'): SyntheticSelection => ({id, key: 'select', productId: 'food-product:synthetic-bowl', version: 1, quantity: 2, windowId: 'synthetic-window', locationReference: 'synthetic-handoff', now: NOW, delivery: null});
const adapter = () => createOfflineStripeTestAdapter(SYNTHETIC_STRIPE_CONFIG);
async function setup(authority: SimulationAuthority = syntheticAuthority()) {
  const db = new LocalTestD1(':memory:'), repo = await LocalTableOrderRepository.open(db, authority);
  return {db, repo, app: createTableCheckoutService(repo, adapter())};
}
type App = Awaited<ReturnType<typeof setup>>['app'];
async function quote(app: App, input = selection()) {await app.select(input); return app.quote(input.id, 'quote', 1, NOW);}
async function reserve(app: App, input = selection()) {await quote(app, input); return app.reserve(input.id, 'reserve', 2, NOW);}
async function event(app: App, intent: TestCheckout, type = 'checkout.session.completed', id = 'evt_integrated_success', at = NOW, patch: Record<string, unknown> = {}) {
  const signed = await signedFixture(syntheticWebhook(intent, type, id, patch));
  return app.receiveWebhook(signed.rawBody, signed.signature, at);
}
async function accepted(app: App) {const intent = await reserve(app); await event(app, intent); return intent;}
async function progress(app: App, repo: LocalTableOrderRepository, stage: Parameters<App['progress']>[3], at = NOW, key = stage) {
  const order = await repo.get('synthetic-integrated');
  return app.progress(order.id, key, order.version, stage, at, ['ready','dispatch','fulfill','request-refund'].includes(stage) ? 'synthetic-handling-evidence' : undefined);
}

test('integrated pickup: disclosures -> quote -> hold -> signed payment -> preparation -> handoff -> sanitized confirmation', async t => {
  const {db, repo, app} = await setup(); t.after(() => db.close());
  const intent = await accepted(app);
  assert.equal(intent.amount, 2580); assert.equal((await repo.snapshot()).capacity.resources[0].committed, 2);
  await progress(app, repo, 'prepare'); await progress(app, repo, 'ready'); await progress(app, repo, 'fulfill', HANDOFF);
  const confirmation = await app.confirmation('synthetic-integrated');
  assert.equal(confirmation.stage, 'fulfilled'); assert.equal(confirmation.realOrder, false); assert.equal(confirmation.realPaymentVerified, false);
  assert.equal(confirmation.lines[0].quantity, 2); assert.equal(confirmation.total?.minorUnits, 2580);
  assert.deepEqual(confirmation.lines[0].ingredients, ['SYNTHETIC ingredient']);
  assert.equal(confirmation.fulfillment.confirmedWindow?.startsAt, '2026-10-21T18:00:00.000Z');
  const report = await app.operations(syntheticCosting());
  assert.equal(report.operatingProfitCents, 1200n); assert.equal(report.foodCostsCents, 300n); assert.equal(report.packagingCostsCents, 150n); assert.equal(report.fulfillmentCostsCents, 50n);
});
test('real product and a complete synthetic checklist cannot authorize commercial activation', async t => {
  const authority = {...syntheticAuthority(), catalog: TABLE_CATALOG}, actual = await setup(authority), synthetic = await setup();
  t.after(() => {actual.db.close(); synthetic.db.close();});
  const result = await actual.app.eligibility(TABLE_CATALOG[0].product.id, 1);
  assert.equal(result.domainEligible, false); assert.equal(result.simulatedTestEligible, false); assert.equal(result.commercialAuthorized, false);
  await assert.rejects(actual.app.select({...selection(), productId: TABLE_CATALOG[0].product.id}), /blocked/);
  const testResult = await synthetic.app.eligibility(selection().productId, 1);
  assert.equal(testResult.domainEligible, true); assert.equal(testResult.simulatedTestEligible, true); assert.equal(testResult.commercialAuthorized, false);
  assert.equal(testResult.fulfillmentAuthorized, false); assert.equal(testResult.realPaymentVerified, false);
});
for (const patch of [{quantity: 0}, {quantity: 5}, {quantity: 1.5}, {productId: 'food-product:unknown'}, {version: 2}, {id: 'real-customer'}, {total: 1}, {address: 'sensitive'}, {paymentVerified: true}]) test(`selection rejects ${JSON.stringify(patch)} before persisting`, async t => {
  const {db, repo, app} = await setup(); t.after(() => db.close());
  await assert.rejects(app.select({...selection(), ...patch})); assert.equal((await repo.snapshot()).orders.length, 0);
});
test('missing approved price, missing launch review and unavailable product cannot quote or reserve', async t => {
  for (const change of ['price','launch','availability']) {
    const base = syntheticAuthority(), product = {...base.catalog[0]};
    if (change === 'price') product.approvedPrice = null;
    if (change === 'availability') {product.state = 'PAUSED'; product.availability = 'temporarily-paused';}
    const {db, repo, app} = await setup({...base, catalog: [product], launchReviews: change === 'launch' ? [] : base.launchReviews});
    t.after(() => db.close()); await assert.rejects(app.select(selection()), /blocked/); assert.equal((await repo.snapshot()).capacity.holds.length, 0);
  }
});
for (const variant of ['unknown-window','wrong-location','closed-window','insufficient-capacity']) test(`fulfillment rejection: ${variant}`, async t => {
  const base = syntheticAuthority(), input = selection();
  let authority = base;
  if (variant === 'unknown-window') input.windowId = 'unknown';
  if (variant === 'wrong-location') input.locationReference = 'wrong';
  if (variant === 'closed-window') authority = {...base, windows: [{...base.windows[0], closed: true}]};
  if (variant === 'insufficient-capacity') authority = {...base, windows: [{...base.windows[0], capacity: 1}], resources: base.resources.map(r => r.kind === 'window' ? {...r, capacity: 1} : r)};
  const {db, repo, app} = await setup(authority); t.after(() => db.close());
  assert.equal((await quote(app, input)).status, 'fulfillment-unavailable');
  await assert.rejects(app.reserve(input.id, 'reserve', 2, NOW)); assert.equal((await repo.snapshot()).capacity.holds.length, 0);
});
test('duplicate selection, quote, reserve, event and fulfillment remain idempotent', async t => {
  const {db, repo, app} = await setup(); t.after(() => db.close()); const input = selection();
  await app.select(input); await app.select(input); await quote(app); const intent = await app.reserve(input.id, 'reserve', 2, NOW);
  assert.deepEqual(await app.reserve(input.id, 'reserve', 2, NOW), intent);
  await event(app, intent); await event(app, intent); await event(app, intent, 'checkout.session.async_payment_succeeded', 'evt_second');
  await progress(app, repo, 'prepare'); await progress(app, repo, 'ready'); const complete = await progress(app, repo, 'fulfill', HANDOFF);
  assert.equal((await progress(app, repo, 'fulfill', HANDOFF)).version, complete.version);
  assert.equal((await app.operations()).totalSyntheticReceiptsCents, 2580n); assert.equal((await repo.snapshot()).orders.length, 1);
});
test('expired quote cannot reserve; no provisional slot or payment is confirmed', async t => {
  const {db, repo, app} = await setup(); t.after(() => db.close()); await quote(app);
  const before = await app.confirmation(selection().id);
  assert.equal(before.paymentStatus, 'not-confirmed'); assert.equal(before.fulfillment.confirmedWindow, null);
  await assert.rejects(app.reserve(selection().id, 'reserve', 2, '2026-10-21T14:10:00.000Z'), /Quote expired/);
  assert.equal((await repo.snapshot()).capacity.holds.length, 0);
});
test('checkout expiry and cancellation cannot accept late paid events and remain visible for recovery', async t => {
  const {db, repo, app} = await setup(); t.after(() => db.close()); const intent = await reserve(app);
  await progress(app, repo, 'cancel'); assert.equal(await event(app, intent), 'refund-required');
  assert.equal((await app.confirmation(selection().id)).stage, 'canceled');
  assert.equal((await app.confirmation(selection().id)).paymentStatus, 'synthetic-payment-requires-refund');
  assert.equal((await app.recover('recovery', HANDOFF)).pending[0].reason, 'refund-required');
  await event(app, intent, 'refund.updated', 'evt_late_refund', HANDOFF);
  assert.equal((await app.recover('recovery-next', HANDOFF)).pending.length, 0);
});
test('unsigned events, wrong amount/currency/order and browser redirect cannot authorize payment', async t => {
  const {db, repo, app} = await setup(); t.after(() => db.close()); const intent = await reserve(app);
  await assert.rejects(app.receiveWebhook('{"paid":true}', 'unsigned', NOW));
  for (const variant of [{...intent, amount: 1}, {...intent, orderId: 'synthetic-unknown'}]) await assert.rejects(event(app, variant));
  await assert.rejects(event(app, intent, 'checkout.session.completed', 'evt_currency', NOW, {currency: 'eur'}));
  assert.equal((await repo.get(selection().id)).status, 'awaiting-payment');
});
test('out-of-order refund persists pending work and reconciles once after success', async t => {
  const {db, repo, app} = await setup(); t.after(() => db.close()); const intent = await reserve(app);
  await event(app, intent, 'refund.updated', 'evt_early_refund');
  assert.equal((await app.recover('pending', NOW)).pending.length, 1);
  await event(app, intent); assert.equal((await app.confirmation(selection().id)).paymentStatus, 'synthetic-refund-confirmed');
  assert.equal((await repo.get(selection().id)).status, 'refunded'); assert.equal((await app.operations()).netOperatingRevenueCents, 0n);
});
test('lost acknowledgment after reconciliation commit survives restart and exact signed retry', async t => {
  const {db, repo, app} = await setup(); t.after(() => db.close()); const intent = await reserve(app);
  let lose = true;
  const bridge: LocalTableDatabase = {mode: 'local-synthetic-only', batch: s => db.batch(s), prepare(sql) {
    const statement = db.prepare(sql), wrapped = {bind: (...v: (string|number|null)[]) => {statement.bind(...v); return wrapped;}, all: async () => {
      const result = await statement.all(); if (sql.startsWith('UPDATE') && lose) {lose = false; throw new Error('lost response');} return result;
    }}; return wrapped;
  }};
  const interrupted = createTableCheckoutService(await LocalTableOrderRepository.open(bridge, syntheticAuthority()), adapter());
  await assert.rejects(event(interrupted, intent), /lost response/);
  const restarted = createTableCheckoutService(await LocalTableOrderRepository.open(db, syntheticAuthority()), adapter());
  assert.equal(await event(restarted, intent), 'accepted'); assert.equal((await restarted.operations()).totalSyntheticReceiptsCents, 2580n);
  assert.equal((await repo.snapshot()).capacity.resources[0].committed, 2);
});
test('database interruption leaves no partial payment, acceptance or capacity commitment', async t => {
  const {db, repo, app} = await setup(); t.after(() => db.close()); const intent = await reserve(app), before = await repo.snapshot();
  await db.prepare("CREATE TRIGGER interrupted BEFORE UPDATE ON table_synthetic_order_store BEGIN SELECT RAISE(ABORT,'interruption'); END").all();
  await assert.rejects(event(app, intent), /interruption/); assert.deepEqual(await repo.snapshot(), before);
  await db.prepare('DROP TRIGGER interrupted').all(); assert.equal(await event(app, intent), 'accepted');
});
test('competing application reservations cannot oversell and stale transitions cannot overwrite', async t => {
  const {db, repo, app} = await setup(syntheticAuthority(2)); t.after(() => db.close());
  await quote(app, selection('synthetic-one')); await quote(app, selection('synthetic-two'));
  const attempts = await Promise.allSettled([app.reserve('synthetic-one','reserve',2,NOW),app.reserve('synthetic-two','reserve',2,NOW)]);
  assert.equal(attempts.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal((await repo.snapshot()).capacity.resources[0].available, 0);
  const id = attempts[0].status === 'fulfilled' ? 'synthetic-one' : 'synthetic-two';
  await assert.rejects(app.progress(id, 'stale', 1, 'cancel', NOW), /Stale/);
});
test('authority changes before payment produce refund recovery without accepting an unavailable product', async t => {
  const {db, repo, app} = await setup(); t.after(() => db.close()); const intent = await reserve(app);
  const source = syntheticAuthority();
  await repo.updateAuthorities('pause', {...source, catalog: [{...source.catalog[0], state: 'PAUSED', availability: 'temporarily-paused'}]});
  assert.equal(await event(app, intent), 'refund-required'); assert.equal((await repo.snapshot()).capacity.resources[0].available, 6);
});
test('authority change between service assessment and durable transition fails inside the CAS boundary', async t => {
  const {db, repo, app} = await setup(); t.after(() => db.close()); await accepted(app);
  await progress(app, repo, 'prepare'); await progress(app, repo, 'ready');
  const order = await repo.get(selection().id), oldFingerprint = modelFingerprint(await repo.authoritySnapshot());
  const source = syntheticAuthority(); await repo.updateAuthorities('changed', {...source, pickupFee: {state: 'verified', money: {currency: 'USD', minorUnits: 101}, evidenceReference: 'synthetic-updated-fee'}});
  await assert.rejects(repo.execute(order.id, 'guarded-fulfill', order.version, {type: 'fulfill', evidenceReference: 'synthetic-evidence'}, HANDOFF, {authorityFingerprint: oldFingerprint}), /Authority changed/);
  assert.equal((await repo.get(order.id)).status, 'ready-for-pickup');
});
test('delivery manual approval expiry/withdrawal blocks payment; prepared food is not reused after refund', async t => {
  const source = syntheticAuthority(), authority = {...source, windows: [{...source.windows[0], method: 'personal-delivery' as const}]};
  const input = selection(); input.delivery = {id: 'synthetic-delivery', orderId: input.id, locationReference: input.locationReference, addressEvidenceReference: 'synthetic-address', distanceMeters: 1500, distanceEvidenceReference: 'synthetic-distance', approval: {requestId: 'synthetic-delivery', orderId: input.id, locationReference: input.locationReference, windowId: input.windowId, policyVersion: 1, distanceMeters: 1500, feeCents: 100, expiresAt: '2026-10-21T14:04:00.000Z', evidenceReference: 'synthetic-owner-approval'}};
  const {db, repo, app} = await setup(authority); t.after(() => db.close()); const intent = await reserve(app, input);
  assert.equal(await event(app, intent, 'checkout.session.completed', 'evt_expired_approval', '2026-10-21T14:04:00.000Z'), 'refund-required');
  assert.equal((await repo.get(input.id)).status, 'canceled');
});
test('prepared cancellation/refund keeps waste costs and consumed capacity, never fulfills a canceled order', async t => {
  const {db, repo, app} = await setup(); t.after(() => db.close()); const intent = await accepted(app);
  await progress(app, repo, 'prepare'); await progress(app, repo, 'cancel'); await event(app, intent, 'refund.updated', 'evt_refund');
  await assert.rejects(progress(app, repo, 'fulfill', HANDOFF));
  assert.equal((await repo.snapshot()).capacity.resources[0].available, 4); assert.equal((await app.operations(syntheticCosting())).operatingProfitCents, -1300n);
});
test('integrated delivery requires payment, preparation and dispatch before a confirmed handoff', async t => {
  const source = syntheticAuthority(), authority = {...source, windows: [{...source.windows[0], method: 'personal-delivery' as const}]};
  const {db, repo, app} = await setup(authority); t.after(() => db.close());
  const input = selection(); input.delivery = {id: 'synthetic-delivery', orderId: input.id, locationReference: input.locationReference, addressEvidenceReference: 'synthetic-address', distanceMeters: 100, distanceEvidenceReference: 'synthetic-distance', approval: null};
  const intent = await reserve(app, input);
  await assert.rejects(progress(app, repo, 'dispatch', HANDOFF));
  await event(app, intent); await progress(app, repo, 'prepare'); await progress(app, repo, 'ready');
  assert.equal((await app.confirmation(input.id)).status, 'Ready for delivery');
  await assert.rejects(progress(app, repo, 'fulfill', HANDOFF));
  await progress(app, repo, 'dispatch', HANDOFF); await progress(app, repo, 'fulfill', HANDOFF);
  assert.equal((await app.confirmation(input.id)).fulfillment.kind, 'personal-delivery');
  assert.equal((await app.confirmation(input.id)).stage, 'fulfilled');
  assert.equal((await app.confirmation(input.id)).fulfillment.active, false);
});
test('delivery approval withdrawal after reservation produces refund recovery', async t => {
  const source = syntheticAuthority(), authority = {...source, windows: [{...source.windows[0], method: 'personal-delivery' as const}]};
  const {db, repo, app} = await setup(authority); t.after(() => db.close());
  const input = selection(); input.delivery = {id: 'synthetic-delivery', orderId: input.id, locationReference: input.locationReference, addressEvidenceReference: 'synthetic-address', distanceMeters: 100, distanceEvidenceReference: 'synthetic-distance', approval: null};
  const intent = await reserve(app, input);
  await repo.updateAuthorities('withdraw-delivery', {...authority, deliveryPolicy: {...authority.deliveryPolicy!, verified: false}});
  assert.equal(await event(app, intent), 'refund-required');
  assert.equal((await app.recover('withdrawn-recovery', NOW)).pending.length, 1);
});
test('confirmation pins original quote-time schedule and omits private costs, evidence, credentials and history', async t => {
  const {db, repo, app} = await setup(); t.after(() => db.close()); await accepted(app);
  const before = await app.confirmation(selection().id), source = syntheticAuthority();
  await repo.updateAuthorities('new-schedule', {...source, windows: [{...source.windows[0], startsAt: '2026-10-21T19:00:00.000Z', endsAt: '2026-10-21T20:00:00.000Z', localStart: '14:00', localEnd: '15:00'}]});
  const after = await app.confirmation(selection().id); assert.deepEqual(after, before);
  await progress(app, repo, 'prepare'); await progress(app, repo, 'ready');
  await assert.rejects(progress(app, repo, 'fulfill', HANDOFF), /schedule changed/);
  assert.doesNotMatch(JSON.stringify(after), /evidenceReference|sourceReference|quoteFingerprint|paymentId|customerReference|events|secret|weekly|profit|labor|ingredientsCents|addressEvidence/);
  assert.deepEqual(Object.keys(after).sort(), ['cancellationGuidance','fulfillment','fulfillmentFee','lines','paymentStatus','provenance','realOrder','realPaymentVerified','reference','stage','status','subtotal','tax','total'].sort());
});
test('unknown costs stay null while known signed receipts remain available; incomplete costs fail', async t => {
  const {db, app} = await setup(); t.after(() => db.close()); await accepted(app);
  const report = await app.operations(); assert.equal(report.costStatus, 'unverified');
  for (const field of ['variableCostsCents','foodCostsCents','packagingCostsCents','fulfillmentCostsCents','fixedExpensesCents','operatingProfitCents'] as const) assert.equal(report[field], null);
  assert.equal(report.totalSyntheticReceiptsCents, 2580n); assert.equal(report.realRevenueCents, null);
  await assert.rejects(app.operations({ingredientsCents: 150}));
});
test('status vocabulary covers the future journey and public source has no private pipeline imports', async () => {
  for (const key of ['unavailable','awaiting-confirmation','accepted','preparing','ready-for-pickup','out-for-delivery','fulfilled','canceled','refunded']) assert.ok(key in TABLE_ORDER_STATUSES);
  async function files(path: string): Promise<string[]> {
    return (await Promise.all((await readdir(path,{withFileTypes:true})).map(e => e.isDirectory() ? files(join(path,e.name)) : [join(path,e.name)]))).flat();
  }
  for (const file of [...await files('src/pages'), ...await files('src/components'), ...await files('src/lib/commerce')].filter(p => !p.endsWith('.test.ts'))) assert.doesNotMatch(await readFile(file,'utf8'), /table-checkout-service|table-checkout-confirmation|table-local-order-repository|table-test-payment/);
});
