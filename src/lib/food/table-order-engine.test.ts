import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createTableOrderSimulation, type SimulationAuthority } from './table-order-engine';
import { createTableCapacityModel } from './table-capacity-model';
import { validateWindow, windowBlockers, localParts, deliveryEligibility, instant, type TableDeliveryRequest, type TableWindow } from './table-scheduling';
import { summarizeTableSimulation } from './table-order-operations';
import { TABLE_CATALOG } from './table-catalog';
import { validateFoodElectronicPaymentConfirmationVersion } from './electronic-payment-confirmation-domain';
import { syntheticAuthority, syntheticCosting, simulatedCustomerOrder, simulatedProductionFulfillment, SYNTHETIC_NOW as NOW, SYNTHETIC_HANDOFF as HANDOFF } from '../../../scripts/food/order-simulation';

// ALL amounts, schedules, approvals, locations and observations below are SYNTHETIC.
type Mutable<T> = T extends string | number | boolean | bigint | symbol | null | undefined ? T : {-readonly [K in keyof T]: Mutable<T[K]>};
const config = () => structuredClone(syntheticAuthority()) as Mutable<SimulationAuthority>;
const lines = (quantity = 2) => [{productId: 'food-product:synthetic-bowl', version: 1, quantity}];
function flow(input: SimulationAuthority = syntheticAuthority(), id = 'synthetic-order', quantity = 2, delivery: TableDeliveryRequest | null = null) {
  const engine = createTableOrderSimulation(input);
  engine.create(id, lines(quantity), 'synthetic-window', 'synthetic-handoff', NOW, delivery);
  let serial = 0;
  const run = (command: unknown, at = NOW, key = `synthetic-command-${++serial}`) => engine.execute(id, key, engine.get(id).version, command, at);
  return {engine, run, id};
}
function awaiting() { const f = flow(); f.run({type: 'quote'}); f.run({type: 'begin-checkout'}); return f; }
function accepted() { const f = awaiting(); const proof = f.engine.fakePayment(f.id, 'synthetic-pay', NOW); f.run({type: 'simulate-payment', proof}); f.run({type: 'accept'}); return f; }

test('synthetic complete pickup lifecycle and actual domain source snapshots', () => {
  const {engine} = simulatedProductionFulfillment(), o = engine.get('synthetic-order');
  assert.equal(o.status, 'fulfilled'); assert.equal(o.mode, 'simulation-only'); assert.equal(o.realPaymentVerified, false);
  assert.equal(o.quote!.physicalOrder.state, 'requested'); assert.equal(o.quote!.assessment.amountDue.minorUnits, 2580);
  assert.equal(o.quote!.request.capacityRequirements[0].quantity, 2);
  assert.deepEqual(o.events.map(e => e.status), ['quote-ready','awaiting-payment','simulation-payment-recorded','accepted','preparing','ready-for-pickup','fulfilled']);
});
test('actual unapproved Table catalog remains nonpayable and cannot hold capacity', () => {
  const c = config(); c.catalog = structuredClone(TABLE_CATALOG) as Mutable<typeof c.catalog>;
  c.offers[0].productId = TABLE_CATALOG[0].product.id;
  const f = flow(c); f.run({type: 'set-cart', lines: [{productId: TABLE_CATALOG[0].product.id, version: 1, quantity: 1}]});
  const o = f.run({type: 'quote'}); assert.equal(o.status, 'quote-awaiting-pricing'); assert.ok(o.blockers.some(b => b.includes('price'))); assert.throws(() => f.run({type: 'begin-checkout'})); assert.equal(f.engine.capacity().holds.length, 0);
});
test('unsigned, cloned and Stripe-like events never authorize payment', () => {
  const f = awaiting(), proof = f.engine.fakePayment(f.id, 'synthetic-pay', NOW);
  for (const p of [{kind: 'stripe', paid: true}, {...proof}, {...proof, cents: 1}, null]) assert.throws(() => f.run({type: 'simulate-payment', proof: p}));
  assert.throws(() => f.run({type: 'payment-verified'})); assert.equal(f.engine.get(f.id).status, 'awaiting-payment'); assert.equal(f.engine.liveAdapter.paymentAuthorized, false);
  assert.throws(() => validateFoodElectronicPaymentConfirmationVersion(proof));
});
test('invalid transitions cannot accept unpaid orders, dispatch pickup, or fulfill drafts', () => {
  const f = flow(); for (const type of ['accept','prepare','ready','dispatch','fulfill','refund']) assert.throws(() => f.run({type, evidenceReference: 'synthetic-evidence'}));
  const a = accepted(); a.run({type: 'prepare'}); assert.throws(() => a.run({type: 'ready'})); a.run({type: 'ready', evidenceReference: 'synthetic-cold-chain'}); assert.throws(() => a.run({type: 'dispatch', evidenceReference: 'synthetic-log'})); assert.throws(() => a.run({type: 'fulfill', evidenceReference: 'synthetic-log'}));
});
test('duplicate command does not advance state; conflicting reuse and stale writes fail', () => {
  const f = flow(), before = f.engine.get(f.id); const first = f.engine.execute(f.id, 'synthetic-key', before.version, {type: 'quote'}, NOW);
  assert.equal(f.engine.execute(f.id, 'synthetic-key', before.version, {type: 'quote'}, NOW), first);
  assert.throws(() => f.engine.execute(f.id, 'synthetic-key', first.version, {type: 'cancel'}, NOW));
  assert.throws(() => f.engine.execute(f.id, 'synthetic-other', before.version, {type: 'begin-checkout'}, NOW));
});
test('stable identity and frozen snapshots; cart and price cannot change after boundary', () => {
  const f = awaiting(), o = f.engine.get(f.id); assert.ok(Object.isFrozen(o.quote!.products[0].approvedPrice!.money));
  assert.throws(() => { (o.quote!.products[0].approvedPrice!.money as {minorUnits: number}).minorUnits = 1; });
  assert.throws(() => f.run({type: 'set-cart', lines: lines(1)})); assert.throws(() => f.engine.create(f.id, lines(), 'synthetic-window', 'synthetic-handoff', NOW)); assert.equal(f.engine.get(f.id).id, o.id);
});
test('requoting after cart edits increments quote sequence and invalidates old snapshot', () => {
  const f = flow(); const q1 = f.run({type: 'quote'}).quote!; f.run({type: 'set-cart', lines: lines(1)}); const q2 = f.run({type: 'quote'}).quote!;
  assert.equal(q2.version, 2); assert.notEqual(q1.id, q2.id); assert.equal(q1.calculation.lines[0].quantity, 2); assert.equal(q2.calculation.lines[0].quantity, 1);
});
test('payment replay does not duplicate receipts, even after fulfillment or refund', () => {
  const f = awaiting(), proof = f.engine.fakePayment(f.id, 'synthetic-pay', NOW); f.run({type: 'simulate-payment', proof}); const o = f.engine.get(f.id);
  assert.equal(f.run({type: 'simulate-payment', proof}), o); f.run({type: 'accept'}); f.run({type: 'cancel'}); const refund = f.engine.fakeRefund(f.id, 'synthetic-refund'); f.run({type: 'refund', proof: refund});
  assert.equal(f.run({type: 'simulate-payment', proof}).status, 'refunded'); assert.equal(summarizeTableSimulation(f.engine, syntheticCosting()).grossReceiptsCents, 2580n);
});
test('unpaid cancellation releases capacity; canceled cannot be fulfilled', () => {
  const f = awaiting(); assert.equal(f.engine.capacity().resources[0].reserved, 2); f.run({type: 'cancel'}); assert.equal(f.engine.capacity().resources[0].available, 6);
  assert.throws(() => f.run({type: 'fulfill', evidenceReference: 'synthetic'})); assert.throws(() => f.engine.fakePayment(f.id, 'synthetic-pay', NOW));
});
test('paid cancellation enters refund pending, full refund is terminal and duplicate safe', () => {
  const f = accepted(); f.run({type: 'cancel'}); assert.equal(f.engine.get(f.id).status, 'refund-pending'); assert.equal(f.engine.capacity().resources[0].available, 6);
  const p = f.engine.fakeRefund(f.id, 'synthetic-refund'); assert.throws(() => f.run({type: 'refund', proof: {...p}}));
  f.run({type: 'refund', proof: p}); const last = f.engine.get(f.id); assert.equal(f.run({type: 'refund', proof: p}), last);
  for (const type of ['accept','prepare','ready','fulfill','begin-checkout']) assert.throws(() => f.run({type}));
});
test('prepared cancellation retains consumed capacity and reports waste costs', () => {
  const f = accepted(); f.run({type: 'prepare'}); f.run({type: 'cancel'}); assert.equal(f.engine.capacity().resources[0].available, 4);
  const r = summarizeTableSimulation(f.engine, syntheticCosting()); assert.equal(r.pendingRefundCents, 2580n); assert.equal(r.netOperatingRevenueCents, 0n); assert.equal(r.variableCostsCents, 800n); assert.equal(r.operatingProfitCents, -1300n);
});
test('fulfilled refund preserves historical fulfillment without active paid revenue', () => {
  const {engine, run} = simulatedProductionFulfillment(); run('request-refund', {type: 'request-refund', evidenceReference: 'synthetic-policy'}, HANDOFF);
  const p = engine.fakeRefund('synthetic-order', 'synthetic-refund'); run('refund', {type: 'refund', proof: p}, HANDOFF);
  const r = summarizeTableSimulation(engine, syntheticCosting()); assert.equal(r.fulfilledOrders, 1); assert.equal(r.fulfilledUnits, 2n); assert.equal(r.unitsSold, 0n); assert.equal(r.refundedCents, 2580n);
});
test('hold expiration cancels unpaid checkout, late proof cannot revive it', () => {
  const f = awaiting(), proof = f.engine.fakePayment(f.id, 'synthetic-pay', NOW); const later = '2026-10-21T14:05:00.000Z';
  assert.throws(() => f.run({type: 'simulate-payment', proof}, later)); f.engine.cleanup('synthetic-expire', later); assert.equal(f.engine.get(f.id).status, 'canceled'); assert.equal(f.engine.capacity().resources[0].available, 6);
  const v = f.engine.get(f.id).version; f.engine.cleanup('synthetic-expire', later); assert.equal(f.engine.get(f.id).version, v);
});
test('paid but unaccepted expired hold needs refund, never automatic acceptance', () => {
  const f = awaiting(); f.run({type: 'simulate-payment', proof: f.engine.fakePayment(f.id, 'synthetic-pay', NOW)}); f.engine.cleanup('synthetic-expire', '2026-10-21T14:05:00.000Z');
  assert.equal(f.engine.get(f.id).status, 'refund-pending'); assert.throws(() => f.run({type: 'accept'}, '2026-10-21T14:05:00.000Z'));
});
test('failure before reservation mutation rolls back order, slot and batch', () => {
  const f = flow(); f.run({type: 'quote'}); const before = f.engine.get(f.id); f.engine.failNextReservation(); assert.throws(() => f.run({type: 'begin-checkout'}));
  assert.equal(f.engine.get(f.id), before); assert.equal(f.engine.capacity().holds.length, 0); f.run({type: 'begin-checkout'}); assert.equal(f.engine.capacity().resources[0].available, 4);
});
test('unknown product/version and malformed or excessive quantities never become payable', () => {
  for (const quantity of [0, -1, 1.5, NaN, Infinity]) assert.throws(() => flow(syntheticAuthority(), 'synthetic-order', quantity));
  for (const patch of [{productId: 'food-product:unknown'}, {version: 2}]) { const f = flow(); f.run({type: 'set-cart', lines: [{...lines()[0], ...patch}]}); assert.equal(f.run({type: 'quote'}).status, 'quote-awaiting-pricing'); }
  assert.throws(() => flow(syntheticAuthority(), 'synthetic-order', 7).run({type: 'quote'}));
  assert.throws(() => flow(syntheticAuthority(), 'synthetic-order', 5).run({type: 'quote'}));
});
test('missing/zero approved prices and unknown taxes/fees remain nonpayable', () => {
  for (const mutate of [(c: Mutable<SimulationAuthority>) => {c.catalog[0].approvedPrice = null;}, (c: Mutable<SimulationAuthority>) => {c.catalog[0].approvedPrice!.money.minorUnits = 0;}, (c: Mutable<SimulationAuthority>) => {c.tax = {state: 'unknown'};}, (c: Mutable<SimulationAuthority>) => {c.pickupFee = {state: 'unknown'};}]) {
    const c = config(); mutate(c); const f = flow(c); assert.equal(f.run({type: 'quote'}).status, 'quote-awaiting-pricing'); assert.throws(() => f.run({type: 'begin-checkout'}));
  }
});
test('money overflow, negative fees and client totals fail safely', () => {
  const c = config(); c.catalog[0].approvedPrice!.money.minorUnits = Number.MAX_SAFE_INTEGER; assert.throws(() => flow(c).run({type: 'quote'}));
  const d = config(); d.pickupFee = {state: 'verified', money: {currency: 'USD', minorUnits: -1}, evidenceReference: 'synthetic'}; assert.throws(() => flow(d).run({type: 'quote'}));
  const f = flow(); assert.throws(() => f.run({type: 'quote', totalCents: 1})); assert.throws(() => f.run({type: 'set-cart', lines: [{...lines()[0], total: 1}]}));
});
test('expired quote/price and actual sales/cutoff windows block payment', () => {
  const f = flow(); f.run({type: 'quote'}); assert.throws(() => f.run({type: 'begin-checkout'}, '2026-10-21T14:10:00.000Z'));
  const c = config(); c.offers[0].priceExpiresAt = NOW; assert.equal(flow(c).run({type: 'quote'}).status, 'quote-awaiting-pricing');
  const d = config(); d.offers[0].salesOpenAt = '2026-10-21T15:00:00.000Z'; assert.equal(flow(d).run({type: 'quote'}).status, 'quote-awaiting-pricing');
  const e = config(); e.offers[0].cutoffAt = NOW; assert.equal(flow(e).run({type: 'quote'}).status, 'quote-awaiting-pricing');
});
test('price/fee authority changes invalidate checkout while frozen old quote remains intact', () => {
  const f = awaiting(), old = f.engine.get(f.id).quote!; const c = config(); c.pickupFee = {state: 'verified', money: {currency: 'USD', minorUnits: 200}, evidenceReference: 'synthetic-revised-fee'}; f.engine.updateAuthorities(c);
  assert.throws(() => f.engine.fakePayment(f.id, 'synthetic-pay', NOW)); assert.equal(old.assessment.amountDue.minorUnits, 2580);
});
test('full launch evidence and explicit exact-version authorization stay mandatory', () => {
  const c = config(); c.launchReviews = []; const f = flow(c); assert.ok(f.run({type: 'quote'}).blockers.some(b => b.includes('launch')));
  const d = config(); const review = d.launchReviews[0] as Record<string, unknown>; review.launchAuthorization = null; assert.equal(flow(d).run({type: 'quote'}).status, 'quote-awaiting-pricing');
  const a = accepted(); a.engine.updateAuthorities(c); assert.throws(() => a.run({type: 'prepare'}));
});
test('production date, approved handoff and cold-chain evidence cannot be skipped', () => {
  const c = config(); c.offers[0].productionDate = '2026-10-22'; assert.equal(flow(c).run({type: 'quote'}).status, 'fulfillment-unavailable');
  const f = flow(); const e = f.engine; e.create('synthetic-other', lines(), 'synthetic-window', 'synthetic-wrong-location', NOW); assert.equal(e.execute('synthetic-other', 'quote', 1, {type: 'quote'}, NOW).status, 'fulfillment-unavailable');
});
test('private operations math agrees with entered synthetic costing and never claims real sales', () => {
  const {engine} = simulatedProductionFulfillment(); const r = summarizeTableSimulation(engine, syntheticCosting());
  assert.equal(r.grossReceiptsCents, 2580n); assert.equal(r.netOperatingRevenueCents, 2500n); assert.equal(r.taxLiabilityCents, 80n); assert.equal(r.variableCostsCents, 800n); assert.equal(r.fixedExpensesCents, 500n); assert.equal(r.operatingProfitCents, 1200n); assert.equal(r.realRevenueCents, null); assert.equal(r.realDataAvailable, false); assert.deepEqual(r, summarizeTableSimulation(engine, syntheticCosting()));
});
test('accepted operations queue shows only simulated meals awaiting preparation', () => {
  const {engine} = simulatedCustomerOrder(); const r = summarizeTableSimulation(engine, syntheticCosting()); assert.equal(r.mealsToPrepare, 2n); assert.equal(r.paidOrders, 1); assert.equal(r.preparedUnits, 0n); assert.equal(r.variableCostsCents, 0n);
});
test('two integrated orders exhaust last capacity and a third cannot reserve', () => {
  const f = flow(syntheticAuthority(), 'synthetic-first', 4); f.run({type: 'quote'}); f.run({type: 'begin-checkout'});
  f.engine.create('synthetic-second', lines(2), 'synthetic-window', 'synthetic-handoff', NOW); f.engine.execute('synthetic-second', 'quote', 1, {type: 'quote'}, NOW); f.engine.execute('synthetic-second', 'checkout', 2, {type: 'begin-checkout'}, NOW);
  assert.equal(f.engine.capacity().resources[0].available, 0);
  f.engine.create('synthetic-third', lines(1), 'synthetic-window', 'synthetic-handoff', NOW); f.engine.execute('synthetic-third', 'quote', 1, {type: 'quote'}, NOW); assert.throws(() => f.engine.execute('synthetic-third', 'checkout', 2, {type: 'begin-checkout'}, NOW));
  assert.equal(f.engine.get('synthetic-third').status, 'quote-ready');
});
test('per-customer batch ceiling is checked again at reservation, not bypassed by split orders', () => {
  const c = config(); c.maxCustomerQuantity = 3; const e = createTableOrderSimulation(c);
  for (const id of ['synthetic-first', 'synthetic-second']) { e.create(id, lines(2), 'synthetic-window', 'synthetic-handoff', NOW, null, 'synthetic-same-customer'); e.execute(id, 'quote', 1, {type: 'quote'}, NOW); }
  e.execute('synthetic-first', 'checkout', 2, {type: 'begin-checkout'}, NOW);
  assert.throws(() => e.execute('synthetic-second', 'checkout', 2, {type: 'begin-checkout'}, NOW));
  e.execute('synthetic-first', 'cancel', 3, {type: 'cancel'}, NOW);
  e.execute('synthetic-second', 'checkout', 2, {type: 'begin-checkout'}, NOW); assert.equal(e.capacity().resources[0].reserved, 2);
});
test('insufficient slot capacity cannot partially claim a batch', () => {
  const m = createTableCapacityModel([{id: 'synthetic-batch', kind: 'batch', capacity: 3}, {id: 'synthetic-window', kind: 'window', capacity: 0}], () => true);
  assert.throws(() => m.reserve('synthetic-reserve', 0, hold('synthetic-hold', 1), NOW)); assert.equal(m.snapshot().resources[0].available, 3); assert.equal(m.snapshot().revision, 0);
});
test('provider event identity cannot be reused across separate orders', () => {
  const f = awaiting(); const p = f.engine.fakePayment(f.id, 'synthetic-shared-event', NOW); f.run({type: 'simulate-payment', proof: p});
  f.engine.create('synthetic-second', lines(1), 'synthetic-window', 'synthetic-handoff', NOW); f.engine.execute('synthetic-second', 'quote', 1, {type: 'quote'}, NOW); f.engine.execute('synthetic-second', 'checkout', 2, {type: 'begin-checkout'}, NOW);
  const q = f.engine.fakePayment('synthetic-second', 'synthetic-shared-event', NOW); assert.throws(() => f.engine.execute('synthetic-second', 'payment', 3, {type: 'simulate-payment', proof: q}, NOW));
  assert.equal(f.engine.get('synthetic-second').paymentEventId, null);
});
test('backdated commands and cleanup cannot alter committed history', () => {
  const f = awaiting(); const before = f.engine.get(f.id); assert.throws(() => f.run({type: 'cancel'}, '2026-10-21T13:59:59.000Z')); assert.throws(() => f.engine.cleanup('synthetic-expire', '2026-10-21T13:59:59.000Z')); assert.equal(f.engine.get(f.id), before);
});
test('production mode and ordinary public/Stripe proof commands are unavailable', () => {
  assert.throws(() => createTableOrderSimulation({...syntheticAuthority(), mode: 'production' as 'simulation-only'}));
  const f = flow(); assert.throws(() => f.run({type: 'stripe.checkout.session.completed', proof: {paid: true}}));
});

const resources = () => [{id: 'synthetic-batch', kind: 'batch' as const, capacity: 3}, {id: 'synthetic-window', kind: 'window' as const, capacity: 3}];
const hold = (id: string, quantity: number) => ({id, orderId: `synthetic-order-${id}`, quoteId: `synthetic-quote-${id}`, lines: [{resourceId: 'synthetic-batch', quantity}, {resourceId: 'synthetic-window', quantity}], expiresAt: '2026-10-21T14:05:00.000Z'});
test('capacity model: multiple orders, last serving, sold out, no oversell', () => {
  const m = createTableCapacityModel(resources(), () => true); m.reserve('a', 0, hold('a', 2), NOW); m.reserve('b', 1, hold('b', 1), NOW); assert.equal(m.snapshot().resources[0].soldOut, true);
  assert.throws(() => m.reserve('c', 2, hold('c', 1), NOW)); assert.equal(m.snapshot().resources[0].available, 0);
});
test('capacity model: deterministic competing snapshots use revision conflict', () => {
  const m = createTableCapacityModel(resources(), () => true); const rev = m.snapshot().revision;
  m.reserve('a', rev, hold('a', 2), NOW); assert.throws(() => m.reserve('b', rev, hold('b', 2), NOW), /Stale/); assert.throws(() => m.reserve('b', m.snapshot().revision, hold('b', 2), NOW), /exhausted/);
});
test('capacity model: duplicate reserve, conflict, release, expiry and resize safeguards', () => {
  const m = createTableCapacityModel(resources(), () => true); const h = hold('a', 2); m.reserve('a', 0, h, NOW); m.reserve('a', 0, h, NOW); assert.equal(m.snapshot().revision, 1);
  assert.throws(() => m.reserve('a', 1, hold('a', 1), NOW)); assert.throws(() => m.reserve('other', 1, h, NOW)); assert.throws(() => m.resize('small', 1, 'synthetic-batch', 1));
  m.change('release', 1, h.id, 'release', NOW); assert.equal(m.snapshot().resources[0].available, 3); m.change('release', 1, h.id, 'release', NOW);
  m.reserve('b', 2, hold('b', 3), NOW); m.expire('expiry', 3, '2026-10-21T14:05:00.000Z'); assert.equal(m.snapshot().resources[0].available, 3); assert.throws(() => m.change('commit-expired', 4, 'b', 'commit', '2026-10-21T14:05:00.000Z'));
});
test('capacity model: unverified quote and injected failure leave all resources untouched', () => {
  const unverified = createTableCapacityModel(resources(), () => false); assert.throws(() => unverified.reserve('a', 0, hold('a', 1), NOW));
  const m = createTableCapacityModel(resources(), () => true); assert.throws(() => m.reserve('a', 0, hold('a', 1), NOW, true)); assert.equal(m.snapshot().revision, 0); assert.equal(m.snapshot().holds.length, 0);
});

const window = () => syntheticAuthority().windows[0];
test('pickup: valid window, local timezone, invalid date/timezone or location metadata', () => {
  assert.deepEqual(windowBlockers(window(), NOW, 2), []); assert.deepEqual(localParts(NOW, 'America/Chicago'), {date: '2026-10-21', time: '09:00'});
  for (const patch of [{localDate: '2026-02-30'}, {timezone: 'Invalid/Zone'}, {localStart: '12:00'}, {endsAt: NOW}, {capacity: -1}]) assert.throws(() => validateWindow({...window(), ...patch}));
  assert.throws(() => instant('2026-10-21T09:00:00')); assert.throws(() => instant('2026-02-30T14:00:00Z'));
});
test('pickup: closed/unavailable dates, cutoff, lead time and capacity', () => {
  for (const patch of [{closed: true}, {verified: false}, {unavailableDates: ['2026-10-21']}, {minLeadMinutes: 300}, {capacity: 1}]) assert.ok(windowBlockers({...window(), ...patch}, NOW, 2).length);
  assert.ok(windowBlockers(window(), '2026-10-21T16:00:00.000Z', 1).some(g => g.includes('cutoff')));
});
test('pickup: DST repeated hour is disambiguated by UTC; nonexistent local hour rejected', () => {
  const fall: TableWindow = {...window(), localDate: '2026-11-01', localStart: '01:30', localEnd: '01:45', startsAt: '2026-11-01T06:30:00.000Z', endsAt: '2026-11-01T07:45:00.000Z', cutoffAt: '2026-11-01T05:00:00.000Z'};
  assert.equal(validateWindow(fall).startsAt, fall.startsAt);
  assert.throws(() => validateWindow({...window(), localDate: '2026-03-08', localStart: '02:30', startsAt: '2026-03-08T08:30:00.000Z', endsAt: '2026-03-08T09:00:00.000Z', cutoffAt: '2026-03-08T05:00:00.000Z'}));
  assert.deepEqual(localParts('2026-10-22T01:00:00.000Z', 'America/Chicago'), {date: '2026-10-21', time: '20:00'});
});
const deliveryRequest = (distanceMeters = 500): TableDeliveryRequest => ({id: 'synthetic-request', orderId: 'synthetic-order', locationReference: 'synthetic-handoff', addressEvidenceReference: 'synthetic-address-check', distanceMeters, distanceEvidenceReference: 'synthetic-distance-check', approval: null});
const deliveryWindow = (): TableWindow => ({...window(), method: 'personal-delivery'});
test('delivery: verified zone and synthetic handoff, unknown zone/distance/fee unavailable', () => {
  const policy = syntheticAuthority().deliveryPolicy!;
  assert.equal(deliveryEligibility(policy, deliveryRequest(), deliveryWindow(), NOW, 2).state, 'eligible-for-simulation');
  for (const patch of [{verified: false}, {maximumDistanceMeters: null}, {fee: {state: 'unknown' as const}}]) assert.notEqual(deliveryEligibility({...policy, ...patch}, deliveryRequest(), deliveryWindow(), NOW, 2).state, 'eligible-for-simulation');
  assert.notEqual(deliveryEligibility(policy, {...deliveryRequest(), distanceMeters: null}, deliveryWindow(), NOW, 2).state, 'eligible-for-simulation');
  assert.throws(() => deliveryEligibility({...policy, fee: {state: 'verified', money: {currency: 'USD', minorUnits: -1}, evidenceReference: 'synthetic'}}, deliveryRequest(), deliveryWindow(), NOW, 2));
});
test('delivery: outside area needs exact unexpired manual approval, never payment authority', () => {
  const p = syntheticAuthority().deliveryPolicy!, request = deliveryRequest(1500);
  assert.equal(deliveryEligibility(p, request, deliveryWindow(), NOW, 2).state, 'awaiting-manual-approval');
  const approval = {requestId: request.id, orderId: request.orderId, locationReference: request.locationReference, windowId: 'synthetic-window', policyVersion: 1, distanceMeters: 1500, feeCents: 100, expiresAt: '2026-10-21T15:00:00.000Z', evidenceReference: 'synthetic-owner-approval'};
  const r = deliveryEligibility(p, {...request, approval}, deliveryWindow(), NOW, 2); assert.equal(r.state, 'eligible-for-simulation'); assert.equal(r.paymentAuthorized, false);
  for (const patch of [{feeCents: 200}, {orderId: 'synthetic-other'}, {policyVersion: 2}, {expiresAt: NOW}]) assert.equal(deliveryEligibility(p, {...request, approval: {...approval, ...patch}}, deliveryWindow(), NOW, 2).state, 'unavailable');
});
test('delivery: pending manual request can be reviewed and reselected before checkout only', () => {
  const c = config(); c.windows[0].method = 'personal-delivery'; const request = deliveryRequest(1500); const f = flow(c, 'synthetic-order', 2, request);
  assert.equal(f.run({type: 'quote'}).status, 'fulfillment-unavailable'); assert.throws(() => f.run({type: 'begin-checkout'}));
  const approved = {...request, approval: {requestId: request.id, orderId: request.orderId, locationReference: request.locationReference, windowId: 'synthetic-window', policyVersion: 1, distanceMeters: 1500, feeCents: 100, expiresAt: '2026-10-21T14:04:00.000Z', evidenceReference: 'synthetic-owner-approval'}};
  f.run({type: 'select-fulfillment', windowId: 'synthetic-window', locationReference: 'synthetic-handoff', delivery: approved}); const o = f.run({type: 'quote'}); assert.equal(o.status, 'quote-ready'); assert.equal(o.quote!.expiresAt, approved.approval.expiresAt);
  f.run({type: 'begin-checkout'}); assert.throws(() => f.run({type: 'select-fulfillment', windowId: 'synthetic-window', locationReference: 'synthetic-handoff', delivery: null})); assert.equal(f.engine.get(f.id).paymentEventId, null);
});
test('delivery: integrated paid-before-dispatch workflow and closed window rejection', () => {
  const c = config(); c.windows[0].method = 'personal-delivery'; const f = flow(c, 'synthetic-order', 2, deliveryRequest()); f.run({type: 'quote'}); f.run({type: 'begin-checkout'});
  assert.throws(() => f.run({type: 'dispatch', evidenceReference: 'synthetic-log'})); f.run({type: 'simulate-payment', proof: f.engine.fakePayment(f.id, 'synthetic-pay', NOW)}); f.run({type: 'accept'}); f.run({type: 'prepare'}); f.run({type: 'ready', evidenceReference: 'synthetic-cold-chain'}); assert.throws(() => f.run({type: 'fulfill', evidenceReference: 'synthetic-log'}, HANDOFF)); f.run({type: 'dispatch', evidenceReference: 'synthetic-dispatch-log'}, HANDOFF); f.run({type: 'fulfill', evidenceReference: 'synthetic-handoff-log'}, HANDOFF); assert.equal(f.engine.get(f.id).status, 'fulfilled');
  c.windows[0].closed = true; assert.equal(flow(c, 'synthetic-order', 2, deliveryRequest()).run({type: 'quote'}).status, 'fulfillment-unavailable');
});
test('public routes, components and payment handlers do not import simulation engine/harness', async () => {
  const files = ['src/pages/the-table/index.astro', 'src/pages/the-table/[slug].astro', 'src/components/table/OrderSummary.astro', 'src/pages/api/commerce/create-checkout.ts', 'src/lib/commerce/stripe-webhook-runtime.ts'];
  for (const file of files) assert.doesNotMatch(await readFile(file, 'utf8'), /table-order-engine|order-simulation|table-order-operations|fakePayment/);
  const source = await readFile('scripts/food/order-simulation.ts', 'utf8'); assert.match(source, /SYNTHETIC/); assert.doesNotMatch(source, /@\w+\.com|\+1\d{10}|fetch\(|new Stripe|sendMail/);
});
