import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalTestD1, type LocalTableDatabase } from '../../../scripts/food/local-test-d1';
import { LocalTableOrderRepository, TableLocalConflict } from './table-local-order-repository';
import { createOfflineStripeTestAdapter, type TestPaymentEvidence } from './table-test-payment';
import { SYNTHETIC_STRIPE_CONFIG, authenticatedFixture, signedFixture } from '../../../scripts/food/signed-payment-fixtures';
import { syntheticAuthority, syntheticCosting, SYNTHETIC_NOW as NOW, SYNTHETIC_HANDOFF as HANDOFF } from '../../../scripts/food/order-simulation';
import { TABLE_CATALOG } from './table-catalog';

const lines = [{productId: 'food-product:synthetic-bowl', version: 1, quantity: 2}];
const LATER = '2026-10-21T14:05:00.000Z';
async function setup(capacity = 6) {
  const db = new LocalTestD1(':memory:'), authority = syntheticAuthority(capacity);
  return {db, authority, repo: await LocalTableOrderRepository.open(db, authority)};
}
async function draft(repo: LocalTableOrderRepository, id = 'synthetic-order') {
  await repo.create('create', id, lines, 'synthetic-window', 'synthetic-handoff', NOW);
  return repo.execute(id, 'quote', 1, {type: 'quote'}, NOW);
}
async function checkout(repo: LocalTableOrderRepository, id = 'synthetic-order') {
  const order = await draft(repo, id); return repo.checkout(id, 'checkout', order.version, NOW);
}
async function paid(repo: LocalTableOrderRepository) {
  const intent = await checkout(repo); await repo.reconcile(await authenticatedFixture(intent), NOW); return intent;
}
async function command(repo: LocalTableOrderRepository, type: string, at = NOW) {
  const order = await repo.get('synthetic-order');
  return repo.execute(order.id, type, order.version, {type, ...(['ready','fulfill','request-refund','dispatch'].includes(type) ? {evidenceReference: 'synthetic-evidence'} : {})}, at);
}

test('draft/create/read, immutable quote, duplicate identity and durable idempotency conflict', async t => {
  const {db, repo} = await setup(); t.after(() => db.close());
  const order = await draft(repo);
  assert.equal((await repo.get(order.id)).quote?.assessment.amountDue.minorUnits, 2580);
  assert.ok(Object.isFrozen((await repo.get(order.id)).quote));
  assert.equal((await repo.execute(order.id, 'quote', 1, {type: 'quote'}, NOW)).version, order.version);
  await assert.rejects(repo.execute(order.id, 'quote', order.version, {type: 'cancel'}, NOW), /Idempotency/);
  await assert.rejects(repo.create('other', order.id, lines, 'synthetic-window', 'synthetic-handoff', NOW), /identity/);
  assert.equal((await repo.snapshot()).orders.length, 1);
});
test('stale versions and invalid transitions leave persisted state unchanged', async t => {
  const {db, repo} = await setup(); t.after(() => db.close()); await draft(repo);
  const before = await repo.snapshot();
  await assert.rejects(repo.execute('synthetic-order', 'stale', 1, {type: 'cancel'}, NOW), /Stale/);
  await assert.rejects(command(repo, 'fulfill'), /Invalid transition/);
  await assert.rejects(command(repo, 'simulate-payment'), /authenticated/);
  await assert.rejects(command(repo, 'accept'), /authenticated/);
  assert.deepEqual(await repo.snapshot(), before);
});
test('two SQLite connections conflict on concurrent writes and retry cannot oversell', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'table-003-')), filename = join(directory, 'synthetic-table-concurrent.sqlite');
  const a = new LocalTestD1(filename), b = new LocalTestD1(filename), authority = syntheticAuthority(2);
  t.after(async () => {a.close(); b.close(); await rm(directory, {recursive: true});});
  const x = await LocalTableOrderRepository.open(a, authority), y = await LocalTableOrderRepository.open(b, authority);
  await draft(x, 'synthetic-one'); await draft(y, 'synthetic-two');
  const outcomes = await Promise.allSettled([x.checkout('synthetic-one', 'checkout', 2, NOW), y.checkout('synthetic-two', 'checkout', 2, NOW)]);
  assert.equal(outcomes.filter(o => o.status === 'fulfilled').length, 1);
  const loser = outcomes[0].status === 'rejected' ? 'synthetic-one' : 'synthetic-two';
  assert.ok((outcomes.find(o => o.status === 'rejected') as PromiseRejectedResult).reason instanceof TableLocalConflict);
  await assert.rejects(x.checkout(loser, 'checkout', 2, NOW), /Capacity exhausted/);
  assert.equal((await y.snapshot()).capacity.resources[0].available, 0);
  assert.equal((await x.get(loser)).status, 'quote-ready');
});
test('SQL interruption atomically rolls back order, capacity and idempotency; identical retry succeeds', async t => {
  const {db, repo} = await setup(); t.after(() => db.close()); await draft(repo);
  const before = await repo.snapshot();
  await db.prepare("CREATE TRIGGER synthetic_fail BEFORE UPDATE ON table_synthetic_order_store BEGIN SELECT RAISE(ABORT,'synthetic disk failure'); END").all();
  await assert.rejects(repo.checkout('synthetic-order', 'checkout', 2, NOW), /synthetic disk failure/);
  assert.deepEqual(await repo.snapshot(), before);
  await db.prepare('DROP TRIGGER synthetic_fail').all();
  await repo.checkout('synthetic-order', 'checkout', 2, NOW);
  assert.equal((await repo.snapshot()).capacity.resources[0].reserved, 2);
});
test('committed write with lost response resolves exact durable receipt on retry', async t => {
  const {db, authority, repo} = await setup(); t.after(() => db.close()); await draft(repo);
  let lose = true;
  // Explicit adapter failure after successful persistence models uncertain acknowledgment.
  const wrapper: LocalTableDatabase = {mode: 'local-synthetic-only', batch: s => db.batch(s), prepare: sql => {
    const statement = db.prepare(sql);
    const wrapped = {bind: (...v: (string | number | null)[]) => {statement.bind(...v); return wrapped;}, all: async () => {
      const result = await statement.all();
      if (sql.startsWith('UPDATE') && lose) {lose = false; throw new Error('lost acknowledgment');} return result;
    }}; return wrapped;
  }};
  const interrupted = await LocalTableOrderRepository.open(wrapper, authority);
  await assert.rejects(interrupted.checkout('synthetic-order', 'checkout', 2, NOW), /lost acknowledgment/);
  const intent = await interrupted.checkout('synthetic-order', 'checkout', 2, NOW);
  assert.equal(intent.amount, 2580); assert.equal((await repo.snapshot()).capacity.holds.length, 1);
});
test('close and reopen preserves accepted order, exact quotes, event receipts and capacity', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'table-003-')), filename = join(directory, 'synthetic-table-restart.sqlite');
  let db = new LocalTestD1(filename); t.after(async () => {db.close(); await rm(directory, {recursive: true});});
  let repo = await LocalTableOrderRepository.open(db, syntheticAuthority());
  const intent = await paid(repo), before = await repo.snapshot(); db.close();
  db = new LocalTestD1(filename); repo = await LocalTableOrderRepository.open(db, syntheticAuthority());
  assert.deepEqual(await repo.snapshot(), before);
  assert.equal(await repo.reconcile(await authenticatedFixture(intent), NOW), 'accepted');
  assert.equal((await repo.get('synthetic-order')).realPaymentVerified, false);
  assert.equal((await repo.snapshot()).capacity.resources[0].committed, 2);
});
test('checkout hold expiration is durable and retry-safe', async t => {
  const {db, repo} = await setup(); t.after(() => db.close()); await checkout(repo);
  await repo.cleanup('expiry', LATER); const before = await repo.snapshot(); await repo.cleanup('expiry', LATER);
  assert.deepEqual(await repo.snapshot(), before); assert.equal((await repo.get('synthetic-order')).status, 'canceled');
  assert.equal(before.capacity.resources[0].available, 6);
});
test('unsigned and copied evidence, browser redirects and engine proofs cannot reconcile', async t => {
  const {db, repo} = await setup(); t.after(() => db.close()); const intent = await checkout(repo), evidence = await authenticatedFixture(intent);
  for (const fake of [{...evidence}, {paid: true}, {kind: 'simulation-only-payment'}, null]) await assert.rejects(repo.reconcile(fake as TestPaymentEvidence, NOW), /Authenticated/);
  assert.equal((await repo.get('synthetic-order')).status, 'awaiting-payment');
});
test('invalid/stale signature and altered raw body are rejected by installed Stripe verifier', async () => {
  const adapter = createOfflineStripeTestAdapter(SYNTHETIC_STRIPE_CONFIG);
  await assert.rejects(adapter.verify('{}', 'bad'));
  const signed = await signedFixture('{}'); await assert.rejects(adapter.verify('{"different":true}', signed.signature));
  const stale = await signedFixture('{}', 1); await assert.rejects(adapter.verify(stale.rawBody, stale.signature));
});
test('explicit test config, fixture mode, missing secrets, live keys and foreign account fail closed', async () => {
  let databaseCalls = 0;
  const forbidden = {mode: 'production', prepare: () => {databaseCalls++; throw new Error('must not access');}} as unknown as LocalTableDatabase;
  await assert.rejects(LocalTableOrderRepository.open(forbidden, syntheticAuthority()), /Local isolated test database/);
  assert.equal(databaseCalls, 0);
  assert.throws(() => new LocalTestD1('production.sqlite'), /Dedicated synthetic/);
  for (const patch of [{mode: 'live'}, {fixturesOnly: false}, {secretKey: ''}, {secretKey: 'sk_live_SYNTHETIC_REJECT'}, {webhookSecret: ''}, {account: 'acct_real'}])
    assert.throws(() => createOfflineStripeTestAdapter({...SYNTHETIC_STRIPE_CONFIG, ...patch} as typeof SYNTHETIC_STRIPE_CONFIG));
  const adapter = createOfflineStripeTestAdapter(SYNTHETIC_STRIPE_CONFIG);
  for (const patch of [{livemode: true}, {account: 'acct_synthetic_other'}]) {
    const signed = await signedFixture(JSON.stringify({id: 'evt_synthetic', type: 'checkout.session.completed', ...patch}));
    await assert.rejects(adapter.verify(signed.rawBody, signed.signature), /mismatch/);
  }
});
test('wrong authoritative amount, currency, quote, product version, order or session rejected', async t => {
  const {db, repo} = await setup(); t.after(() => db.close()); const intent = await checkout(repo), before = await repo.snapshot();
  for (const patch of [{amount: 2581}, {quoteId: 'synthetic-wrong'}, {quoteFingerprint: 'wrong'}, {productFingerprint: 'wrong'}, {orderId: 'unknown'}, {sessionId: 'cs_test_synthetic_unknown'}, {paymentId: 'pi_synthetic_other'}, {account: 'acct_synthetic_other'}]) {
    await assert.rejects(async () => repo.reconcile(await authenticatedFixture({...intent, ...patch}), NOW));
  }
  await assert.rejects(authenticatedFixture(intent, 'checkout.session.completed', 'evt_synthetic_currency', {currency: 'eur'}));
  assert.deepEqual(await repo.snapshot(), before);
});
test('pending then signed success atomically accepts and commits; duplicate events/payment do not double count', async t => {
  const {db, repo} = await setup(); t.after(() => db.close()); const intent = await checkout(repo);
  assert.equal(await repo.reconcile(await authenticatedFixture(intent, 'checkout.session.completed', 'evt_pending', {payment_status: 'unpaid'}), NOW), 'pending-payment');
  assert.equal((await repo.operations(syntheticCosting())).pendingPaymentOrders, 1);
  const success = await authenticatedFixture(intent); assert.equal(await repo.reconcile(success, NOW), 'accepted');
  const version = (await repo.get('synthetic-order')).version;
  assert.equal(await repo.reconcile(success, NOW), 'accepted');
  assert.equal(await repo.reconcile(await authenticatedFixture(intent, 'checkout.session.async_payment_succeeded', 'evt_second'), NOW), 'duplicate-payment');
  assert.equal((await repo.get('synthetic-order')).version, version);
  assert.equal((await repo.operations(syntheticCosting())).grossReceiptsCents, 2580n);
});
test('same provider event with changed contents conflicts; unpaid async success cannot authorize', async t => {
  const {db, repo} = await setup(); t.after(() => db.close()); const intent = await paid(repo);
  await assert.rejects(repo.reconcile(await authenticatedFixture(intent, 'checkout.session.expired'), NOW), /Idempotency/);
  await assert.rejects(authenticatedFixture(intent, 'checkout.session.async_payment_succeeded', 'evt_unpaid', {payment_status: 'unpaid'}), /Unsupported/);
});
for (const type of ['checkout.session.expired', 'checkout.session.async_payment_failed']) test(`${type}: release before payment; later success is refund recovery, never accepted`, async t => {
  const {db, repo} = await setup(); t.after(() => db.close()); const intent = await checkout(repo);
  await repo.reconcile(await authenticatedFixture(intent, type, 'evt_close', {payment_status: 'unpaid'}), NOW);
  assert.equal((await repo.snapshot()).capacity.resources[0].available, 6);
  assert.equal(await repo.reconcile(await authenticatedFixture(intent), NOW), 'refund-required');
  assert.equal((await repo.get('synthetic-order')).status, 'canceled');
  assert.equal((await repo.operations(syntheticCosting())).latePaymentRefundsRequired, 1);
});
test('late success after hold expiry releases capacity and tracks confirmed late refund', async t => {
  const {db, repo} = await setup(); t.after(() => db.close()); const intent = await checkout(repo);
  assert.equal(await repo.reconcile(await authenticatedFixture(intent), LATER), 'refund-required');
  assert.equal((await repo.get('synthetic-order')).status, 'canceled');
  await repo.reconcile(await authenticatedFixture(intent, 'refund.updated', 'evt_refund'), LATER);
  const summary = await repo.operations(syntheticCosting());
  assert.equal(summary.latePaymentRefundsRequired, 0); assert.equal(summary.latePaymentRefundedCents, 2580n);
  assert.equal(summary.totalSyntheticReceiptsCents, 2580n); assert.equal(summary.totalSyntheticRefundedCents, 2580n);
  assert.equal(summary.latePaymentRefundProvisionCents, 0n);
  assert.equal(summary.realRevenueCents, null); assert.equal(summary.grossReceiptsCents, 0n);
});
test('cancel before payment prevents acceptance and supports late-payment refund recovery', async t => {
  const {db, repo} = await setup(); t.after(() => db.close()); const intent = await checkout(repo); await command(repo, 'cancel');
  assert.equal(await repo.reconcile(await authenticatedFixture(intent), NOW), 'refund-required');
  assert.equal((await repo.get('synthetic-order')).status, 'canceled');
});
test('failure/expiry/pending after accepted success never reverse paid state', async t => {
  const {db, repo} = await setup(); t.after(() => db.close()); const intent = await paid(repo);
  for (const type of ['checkout.session.expired','checkout.session.async_payment_failed','checkout.session.completed']) {
    assert.equal(await repo.reconcile(await authenticatedFixture(intent, type, `evt_${type}`, {payment_status: 'unpaid'}), NOW), 'ignored-after-payment');
  }
  assert.equal((await repo.get('synthetic-order')).status, 'accepted');
});
test('out-of-order full refund is persisted, recovered after reopen and applied once after success', async t => {
  const {db, repo, authority} = await setup(); t.after(() => db.close()); const intent = await checkout(repo);
  const refund = await authenticatedFixture(intent, 'refund.updated', 'evt_early_refund');
  assert.equal(await repo.reconcile(refund, NOW), 'pending-payment');
  const restarted = await LocalTableOrderRepository.open(db, authority);
  assert.equal((await restarted.operations(syntheticCosting())).deferredRefunds, 1);
  await restarted.reconcile(await authenticatedFixture(intent), NOW);
  assert.equal((await restarted.get('synthetic-order')).status, 'refunded');
  assert.equal(await restarted.reconcile(refund, NOW), 'refunded');
  const report = await restarted.operations(syntheticCosting());
  assert.equal(report.refundedCents, 2580n); assert.equal(report.netOperatingRevenueCents, 0n); assert.equal(report.deferredRefunds, 0);
});
test('cancel after payment, refund requested and signed refund preserve immutable quote', async t => {
  const {db, repo} = await setup(); t.after(() => db.close()); const intent = await paid(repo), quote = (await repo.get('synthetic-order')).quote;
  await command(repo, 'cancel'); assert.equal((await repo.get('synthetic-order')).status, 'refund-pending');
  await repo.reconcile(await authenticatedFixture(intent, 'refund.updated', 'evt_refund'), NOW);
  await repo.reconcile(await authenticatedFixture(intent, 'refund.updated', 'evt_refund_other'), NOW);
  assert.equal((await repo.get('synthetic-order')).status, 'refunded');
  assert.deepEqual((await repo.get('synthetic-order')).quote, quote);
  assert.equal((await repo.operations(syntheticCosting())).refundedCents, 2580n);
  await assert.rejects(command(repo, 'prepare'), /Invalid transition/);
});
test('prepared cancellation/refund retains consumed capacity and waste costs', async t => {
  const {db, repo} = await setup(); t.after(() => db.close()); const intent = await paid(repo);
  await command(repo, 'prepare'); await command(repo, 'cancel'); await repo.reconcile(await authenticatedFixture(intent, 'refund.updated', 'evt_refund'), NOW);
  const report = await repo.operations(syntheticCosting());
  assert.equal((await repo.snapshot()).capacity.resources[0].available, 4);
  assert.equal(report.variableCostsCents, 800n); assert.equal(report.operatingProfitCents, -1300n);
});
test('fulfilled refund preserves fulfillment history and operations totals across retries', async t => {
  const {db, repo} = await setup(); t.after(() => db.close()); const intent = await paid(repo);
  await command(repo, 'prepare'); await command(repo, 'ready'); await command(repo, 'fulfill', HANDOFF);
  assert.equal((await repo.operations(syntheticCosting())).operatingProfitCents, 1200n);
  await command(repo, 'request-refund', HANDOFF);
  const evidence = await authenticatedFixture(intent, 'refund.updated', 'evt_refund');
  await repo.reconcile(evidence, HANDOFF); const before = await repo.operations(syntheticCosting());
  await repo.reconcile(evidence, HANDOFF); assert.deepEqual(await repo.operations(syntheticCosting()), before);
  assert.equal(before.fulfilledUnits, 2n); assert.equal(before.unitsSold, 0n); assert.equal(before.realDataAvailable, false);
});
test('payment persistence failure is retryable without partial acceptance or lost event', async t => {
  const {db, repo} = await setup(); t.after(() => db.close()); const intent = await checkout(repo), evidence = await authenticatedFixture(intent), before = await repo.snapshot();
  await db.prepare("CREATE TRIGGER synthetic_fail BEFORE UPDATE ON table_synthetic_order_store BEGIN SELECT RAISE(ABORT,'interrupted'); END").all();
  await assert.rejects(repo.reconcile(evidence, NOW), /interrupted/); assert.deepEqual(await repo.snapshot(), before);
  await db.prepare('DROP TRIGGER synthetic_fail').all(); assert.equal(await repo.reconcile(evidence, NOW), 'accepted');
  assert.equal((await repo.snapshot()).inbox.length, 1);
});
test('actual product and launch revocation cannot bypass readiness through persistence', async t => {
  const {db, repo} = await setup(); t.after(() => db.close()); const intent = await checkout(repo);
  const authority = structuredClone(syntheticAuthority()); (authority.launchReviews as unknown[]).length = 0;
  await repo.updateAuthorities('revoke', authority);
  assert.equal(await repo.reconcile(await authenticatedFixture(intent), NOW), 'refund-required');
  assert.equal((await repo.get('synthetic-order')).status, 'canceled');
  assert.equal((await repo.operations(syntheticCosting())).latePaymentRefundsRequired, 1);
  const actual = {...structuredClone(syntheticAuthority()), catalog: TABLE_CATALOG};
  const other = new LocalTestD1(':memory:'); t.after(() => other.close());
  const real = await LocalTableOrderRepository.open(other, actual);
  await real.create('create', 'actual-order', [{productId: TABLE_CATALOG[0].product.id, version: 1, quantity: 1}], 'synthetic-window', 'synthetic-handoff', NOW);
  await real.execute('actual-order', 'quote', 1, {type: 'quote'}, NOW);
  await assert.rejects(real.checkout('actual-order', 'checkout', 2, NOW));
});
test('corrupt projection and mismatched authority are rejected on restart', async t => {
  const {db, repo} = await setup(); t.after(() => db.close()); await draft(repo);
  await assert.rejects(LocalTableOrderRepository.open(db, syntheticAuthority(3)), /authority mismatch/);
  await db.prepare("UPDATE table_synthetic_order_store SET payload_json=json_set(payload_json,'$.orders[0].version',999)").all();
  await assert.rejects(repo.get('synthetic-order'), /projection\/history mismatch/);
});
test('delivery refund waits durably for handoff and recovers without releasing prepared food', async t => {
  const db = new LocalTestD1(':memory:'); t.after(() => db.close());
  const original = syntheticAuthority();
  const authority = {...original, windows: [{...original.windows[0], method: 'personal-delivery' as const}]};
  const repo = await LocalTableOrderRepository.open(db, authority), id = 'synthetic-order';
  const delivery = {id: 'synthetic-delivery', orderId: id, locationReference: 'synthetic-handoff', addressEvidenceReference: 'synthetic-address', distanceMeters: 100, distanceEvidenceReference: 'synthetic-distance', approval: null};
  await repo.create('create', id, lines, 'synthetic-window', 'synthetic-handoff', NOW, delivery);
  await repo.execute(id, 'quote', 1, {type: 'quote'}, NOW);
  const intent = await repo.checkout(id, 'checkout', 2, NOW); await repo.reconcile(await authenticatedFixture(intent), NOW);
  await command(repo, 'prepare'); await command(repo, 'ready'); await command(repo, 'dispatch', HANDOFF);
  assert.equal(await repo.reconcile(await authenticatedFixture(intent, 'refund.updated', 'evt_delivery_refund'), HANDOFF), 'pending-fulfillment');
  const restarted = await LocalTableOrderRepository.open(db, authority);
  assert.equal((await restarted.operations(syntheticCosting())).refundsAwaitingFulfillment, 1);
  const duringDelivery = await restarted.operations(syntheticCosting());
  assert.equal(duringDelivery.refundedCents, 2580n); assert.equal(duringDelivery.netOperatingRevenueCents, 0n);
  assert.equal(duringDelivery.taxLiabilityCents, 0n); assert.equal(duringDelivery.unitsSold, 0n);
  assert.equal(duringDelivery.paidOrders, 0); assert.equal(duringDelivery.authenticatedTestPaidOrders, 0);
  await command(restarted, 'fulfill', HANDOFF); await restarted.retryPending('recover', HANDOFF);
  assert.equal((await restarted.get(id)).status, 'refunded');
  assert.equal((await restarted.snapshot()).capacity.resources[0].available, 4);
  assert.equal((await restarted.operations(syntheticCosting())).refundsAwaitingFulfillment, 0);
  assert.equal((await restarted.operations(syntheticCosting())).operatingProfitCents, duringDelivery.operatingProfitCents);
});
test('local D1-compatible batch rolls back every statement on SQL failure', async t => {
  const {db} = await setup(); t.after(() => db.close());
  await assert.rejects(db.batch([
    db.prepare('UPDATE table_synthetic_order_store SET revision=revision+1 WHERE id=1'),
    db.prepare('UPDATE table_synthetic_order_store SET revision=-1 WHERE id=1')
  ]));
  const result = await db.prepare('SELECT revision FROM table_synthetic_order_store').all();
  assert.equal((result.results[0] as {revision: number}).revision, 0);
});
test('partial refunds, unconfirmed refunds and backdated receipts cannot alter money', async t => {
  const {db, repo} = await setup(); t.after(() => db.close()); const intent = await paid(repo), before = await repo.snapshot();
  await assert.rejects(repo.reconcile(await authenticatedFixture({...intent, amount: 100}, 'refund.updated', 'evt_partial'), NOW));
  await assert.rejects(authenticatedFixture(intent, 'refund.updated', 'evt_pending_refund', {status: 'pending'}));
  await assert.rejects(repo.reconcile(await authenticatedFixture(intent, 'checkout.session.completed', 'evt_backdated'), '2026-10-21T13:59:00.000Z'), /Receipt time/);
  assert.deepEqual(await repo.snapshot(), before);
});
test('no public imports, network requests, live schema edits or private-cost output', async () => {
  async function files(path: string): Promise<string[]> {
    const entries = await readdir(path, {withFileTypes: true});
    return (await Promise.all(entries.map(e => e.isDirectory() ? files(join(path,e.name)) : [join(path,e.name)]))).flat();
  }
  for (const file of [...await files('src/pages'), ...await files('src/components'), ...await files('src/lib/commerce')].filter(p => !p.endsWith('.test.ts'))) {
    assert.doesNotMatch(await readFile(file, 'utf8'), /table-local-order-repository|table-test-payment|local-test-d1|signed-payment-fixtures/);
  }
  const adapter = await readFile('src/lib/food/table-test-payment.ts', 'utf8');
  assert.doesNotMatch(adapter, /new Stripe\(|fetch\(|checkout\.sessions\.create|sk_live_[a-zA-Z0-9]{20}/);
  const config = createOfflineStripeTestAdapter(SYNTHETIC_STRIPE_CONFIG); assert.equal(config.networkEnabled, false);
});
