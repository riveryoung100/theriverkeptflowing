import test from 'node:test';
import assert from 'node:assert/strict';
import { TABLE_CATALOG, TABLE_PRODUCTS, TABLE_CATEGORIES, TABLE_STATES, validateTableEntry, validateTableCatalog, publicTableProduct, type TableCatalogEntry } from './table-catalog';
import { calculateTableOrderPreview, tableCommercialBlockers, formatTableMoney, foodFulfillmentMethod, UNVERIFIED_TABLE_FULFILLMENT, type TableFulfillmentSelection } from './table-order-preview';

type Mutable<T> = T extends string | number | boolean | bigint | symbol | null | undefined ? T : {-readonly [K in keyof T]: Mutable<T[K]>};
const base = () => structuredClone(TABLE_CATALOG[0]) as Mutable<TableCatalogEntry>;
// SYNTHETIC FIXTURES ONLY: no business price, capacity, safety or launch approval.
function approved() {
  const p = base();
  p.recipe.evidence = ['ingredient-composition-disclosure-status', 'allergen-review'].map(requirement => ({requirement: requirement as 'ingredient-composition-disclosure-status' | 'allergen-review', sourceReference: 'synthetic-private-evidence', subject: {type: 'recipe' as const, id: p.recipe.id, version: 1}, reviewDate: '2026-10-21', reviewer: 'synthetic-reviewer'}));
  p.recipe.allergenReview = {state: 'reviewed', declarations: []};
  p.ingredientsStatus = 'verified'; p.display = 'approved'; p.state = 'AVAILABLE'; p.availability = 'available'; p.ordering = 'eligible-for-review';
  p.maxPerOrder = 10; p.remainingCapacity = 20; p.fulfillment = {pickup: true, localDelivery: true};
  p.offer.servingEstimate = {state: 'specified', minimum: 1, maximum: 1}; p.offer.storageSummary = {state: 'specified', text: 'Synthetic storage'}; p.offer.reheatingSummary = {state: 'specified', text: 'Synthetic reheating'};
  p.sku = {id: 'food-sku:synthetic' as NonNullable<TableCatalogEntry['sku']>['id'], version: 1, servingOffer: {offerId: p.offer.offerId, version: 1}, package: {id: 'food-package-definition:synthetic' as NonNullable<TableCatalogEntry['sku']>['package']['id'], version: 1}};
  p.packageDefinition = {id: p.sku.package.id, version: 1, netQuantity: {basis: 'grams', grams: 500}};
  p.approvedPrice = {id: 'food-approved-commercial-price:synthetic' as NonNullable<TableCatalogEntry['approvedPrice']>['id'], version: 1, sku: {id: p.sku.id, version: 1}, money: {currency: 'USD', minorUnits: 1001}, approval: {attribution: 'synthetic', sourceReference: 'synthetic-private-price', approvedOn: '2026-10-21'}};
  return p;
}
const verified = (cents: number) => ({state: 'verified' as const, money: {currency: 'USD', minorUnits: cents}, evidenceReference: 'synthetic-reference'});
const fulfillment = (): TableFulfillmentSelection => ({kind: 'pickup', verified: true, locationReference: 'synthetic-location', windowReference: 'synthetic-window', addressVerified: false, manualApprovalReference: null, capacity: 20, fee: verified(125)});
const request = (p: unknown = approved(), quantity: unknown = 2) => ({lines: [{product: p, quantity}], maxOrderQuantity: 10, fulfillment: fulfillment(), tax: {...verified(83), classification: 'taxable'}});

test('one actual conceptual product; no invented price, nutrition or empty category', () => {
  assert.equal(TABLE_PRODUCTS.length, 1); assert.deepEqual(TABLE_CATEGORIES, ['Bowls']); assert.equal(TABLE_PRODUCTS[0].price, null); assert.equal(TABLE_PRODUCTS[0].nutrition, null); assert.equal(TABLE_PRODUCTS[0].allergens, null); assert.equal(TABLE_PRODUCTS[0].serving.state, 'unknown'); assert.equal(TABLE_STATES.length, 8);
});
test('duplicate slug and product IDs rejected; malformed products and traversal rejected', () => {
  assert.throws(() => validateTableCatalog([base(), base()]));
  for (const patch of [{slug: '../checkout'}, {slug: 'index'}, {state: 'OPEN'}, {availability: 'available'}, {maxPerOrder: -1}, {remainingCapacity: 1.5}, {fulfillment: {pickup: true}}, {ownerCosts: 123}]) assert.throws(() => validateTableEntry({...base(), ...patch}));
  assert.throws(() => validateTableEntry(null));
});
test('missing ingredient verification and allergen review cannot become approved display', () => {
  assert.throws(() => validateTableEntry({...base(), display: 'approved'}));
  const p = approved(); p.recipe.ingredients = []; assert.throws(() => validateTableEntry(p));
  const q = approved(); q.recipe.evidence = []; assert.throws(() => validateTableEntry(q));
});
test('hidden products never project; public projection strips evidence and price approval metadata', () => {
  assert.equal(publicTableProduct({...base(), state: 'DRAFT', display: 'hidden'}), null);
  const p = approved(); const serialized = JSON.stringify(publicTableProduct(p));
  assert.ok(!serialized.includes('synthetic-private')); assert.ok(!serialized.includes('evidenceReference')); assert.ok(!serialized.includes('approval')); assert.ok(!serialized.includes('weeklyProfit')); assert.ok(!serialized.includes('recipeId'));
  assert.equal(publicTableProduct(p)?.price?.minorUnits, 1001);
});
test('owned photo changes only catalog reference; remote/malformed images rejected', () => {
  const image = {kind: 'owned-photo', src: '/images/table/real-bowl.webp', alt: 'Synthetic owned-photo metadata', caption: 'Synthetic caption', width: 800, height: 800};
  assert.equal(publicTableProduct({...base(), image})?.image.kind, 'owned-photo');
  for (const src of ['https://example.com/bowl.jpg', '//example.com/a.jpg', '/images/../a.jpg', '/images/a.svg']) assert.throws(() => validateTableEntry({...base(), image: {...image, src}}));
  assert.throws(() => validateTableEntry({...base(), image: {...image, width: null}}));
});
test('nutrition cannot display draft/unsubstantiated data', () => {
  assert.throws(() => validateTableEntry({...base(), nutrition: {serving: 'draft', facts: [{label: 'Energy', value: 'synthetic'}]}}));
  const p = approved(); p.nutrition = {serving: 'Synthetic serving', evidenceReference: 'private-nutrition', facts: [{label: 'Synthetic fact', value: 'Synthetic value'}]};
  assert.ok(!JSON.stringify(publicTableProduct(p)).includes('private-nutrition'));
});
test('actual unapproved product is blocked and missing prices never become zero', () => {
  const r = calculateTableOrderPreview(request(base())); assert.equal(r.state, 'blocked'); assert.equal(r.subtotal, null); assert.equal(r.total, null); assert.equal(r.paymentAuthorized, false); assert.ok(tableCommercialBlockers(base()).length);
});
test('exact integer cents and deterministic line/subtotal/fee/tax math reuse existing quote', () => {
  const r = calculateTableOrderPreview(request()); assert.equal(r.lines[0].subtotal?.minorUnits, 2002); assert.equal(r.subtotal?.minorUnits, 2002); assert.equal(r.total?.minorUnits, 2210); assert.deepEqual(r, calculateTableOrderPreview(request())); assert.equal(r.state, 'estimate-only'); assert.equal(r.paymentAuthorized, false); assert.equal(r.orderSubmissionEnabled, false);
});
test('invalid quantities, maximum order and product/capacity limits enforced', () => {
  for (const q of [0, -1, 1.1, '2', NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => calculateTableOrderPreview(request(approved(), q)));
  assert.throws(() => calculateTableOrderPreview({...request(), maxOrderQuantity: 1}));
  assert.throws(() => calculateTableOrderPreview(request({...approved(), maxPerOrder: 1})));
  assert.throws(() => calculateTableOrderPreview(request({...approved(), remainingCapacity: 1})));
  assert.throws(() => calculateTableOrderPreview({...request(), fulfillment: {...fulfillment(), capacity: 1}}));
});
test('availability gating, duplicate lines, missing approved price and exact SKU matching', () => {
  for (const [state, availability] of [['PAUSED', 'temporarily-paused'], ['SOLD_OUT', 'sold-out']] as const) assert.equal(calculateTableOrderPreview(request({...approved(), state, availability})).state, 'blocked');
  assert.equal(calculateTableOrderPreview(request({...approved(), approvedPrice: null})).subtotal, null);
  const p = approved(); p.approvedPrice!.sku.version = 2; assert.throws(() => validateTableEntry(p));
  const r = request(); assert.throws(() => calculateTableOrderPreview({...r, lines: [...r.lines, ...r.lines]}));
});
test('unknown tax is not tax exempt; unknown fee is not free', () => {
  const a = calculateTableOrderPreview({...request(), tax: {state: 'unknown'}}); assert.equal(a.tax, null); assert.equal(a.total, null); assert.ok(a.blockers.some(b => b.includes('Tax')));
  const b = calculateTableOrderPreview({...request(), fulfillment: {...fulfillment(), fee: {state: 'unknown'}}}); assert.equal(b.fulfillmentFee, null); assert.equal(b.total, null);
  assert.equal(calculateTableOrderPreview({...request(), tax: {...verified(0), classification: 'exempt'}}).tax?.minorUnits, 0);
  assert.throws(() => calculateTableOrderPreview({...request(), tax: verified(0)}));
  assert.throws(() => calculateTableOrderPreview({...request(), tax: {...verified(83), classification: 'exempt'}}));
});
test('fulfillment eligibility, addresses and manual approval are independent checks', () => {
  const r = request();
  assert.equal(calculateTableOrderPreview({...r, fulfillment: UNVERIFIED_TABLE_FULFILLMENT}).state, 'blocked');
  assert.equal(calculateTableOrderPreview({...r, fulfillment: {...fulfillment(), kind: 'local-delivery'}}).state, 'blocked');
  assert.equal(calculateTableOrderPreview({...r, fulfillment: {...fulfillment(), kind: 'out-of-area', addressVerified: true}}).state, 'blocked');
  assert.equal(calculateTableOrderPreview({...r, fulfillment: {...fulfillment(), kind: 'out-of-area', addressVerified: true, manualApprovalReference: 'synthetic-approval'}}).state, 'estimate-only');
  assert.equal(calculateTableOrderPreview(request({...approved(), fulfillment: {pickup: false, localDelivery: true}})).state, 'blocked');
  assert.equal(foodFulfillmentMethod('pickup'), 'meetup'); assert.equal(foodFulfillmentMethod('local-delivery'), 'personal-delivery');
});
test('negative/ fractional currency rejected; formatting never rounds entered cents', () => {
  for (const value of [-1, 1.5, Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => formatTableMoney({currency: 'USD', minorUnits: value}));
  assert.equal(formatTableMoney({currency: 'USD', minorUnits: 101}), '$1.01'); assert.equal(formatTableMoney({currency: 'USD', minorUnits: 0}), '$0.00'); assert.equal(formatTableMoney(null), 'Not yet confirmed');
  assert.throws(() => calculateTableOrderPreview({...request(), tax: verified(-1)}));
});
test('line multiplication, multi-line sum and final total overflow rejected', () => {
  const p = approved(); p.approvedPrice!.money.minorUnits = Number.MAX_SAFE_INTEGER;
  assert.throws(() => calculateTableOrderPreview(request(p, 2)));
  assert.throws(() => calculateTableOrderPreview(request(p, 1)));
  const q = approved(); q.product.id = 'food-product:synthetic-second' as typeof q.product.id; q.presentation.product.id = q.product.id; q.slug = 'synthetic-second'; q.sku!.id = 'food-sku:synthetic-second' as NonNullable<typeof q.sku>['id']; q.approvedPrice!.id = 'food-approved-commercial-price:synthetic-second' as NonNullable<typeof q.approvedPrice>['id']; q.approvedPrice!.sku.id = q.sku!.id; q.approvedPrice!.money.minorUnits = Number.MAX_SAFE_INTEGER;
  assert.throws(() => calculateTableOrderPreview({...request(), lines: [{product: p, quantity: 1}, {product: q, quantity: 1}]}));
});
