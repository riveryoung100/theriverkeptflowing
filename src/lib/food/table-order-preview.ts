/** Non-transactional presentation math. Existing cart/price domain remains authoritative. */
import { createInitialFoodMerchandiseQuoteVersion, validateFoodPurchaseQuantity } from './cart-quote-domain';
import { validateFoodMoney, type FoodMoney } from './cost-pricing-domain';
import { canonicalText, strictObject, validateTableEntry, type TableCatalogEntry } from './table-catalog';
import type { FoodFulfillmentMethod } from './fulfillment-capacity-reservation-domain';

export type AmountKnowledge = Readonly<{state: 'unknown'}> | Readonly<{state: 'verified'; money: FoodMoney; evidenceReference: string}>;
export type TaxKnowledge = Readonly<{state: 'unknown'}> | Readonly<{state: 'verified'; classification: 'taxable' | 'exempt' | 'mixed'; money: FoodMoney; evidenceReference: string}>;
export interface TableFulfillmentSelection {
  readonly kind: 'pickup' | 'local-delivery' | 'out-of-area';
  readonly verified: boolean;
  readonly locationReference: string | null;
  readonly windowReference: string | null;
  readonly addressVerified: boolean;
  readonly manualApprovalReference: string | null;
  readonly capacity: number | null;
  readonly fee: AmountKnowledge;
}
export const TABLE_FULFILLMENT_OPTIONS = Object.freeze([
  {kind: 'pickup', label: 'Local pickup', description: 'Locations and collection windows will be confirmed before ordering opens.'},
  {kind: 'local-delivery', label: 'Local delivery', description: 'Service area, delivery windows, and fees are being verified.'},
  {kind: 'out-of-area', label: 'Outside the delivery area', description: 'A future request would need manual approval before checkout. Requests are not open.'}
] as const);
export function formatTableMoney(input: FoodMoney | null): string {
  if (input === null) return 'Not yet confirmed';
  const money = validateFoodMoney(input);
  if (money.currency !== 'USD') throw new TypeError('Expected USD cents');
  const cents = BigInt(money.minorUnits);
  return `$${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}
function amount(input: unknown): FoodMoney | null {
  const r = strictObject(input, ['state', 'money', 'evidenceReference']);
  if (r.state === 'unknown') { strictObject(input, ['state']); return null; }
  if (r.state !== 'verified') throw new TypeError('Explicit amount verification required');
  canonicalText(r.evidenceReference);
  const money = validateFoodMoney(r.money);
  if (money.currency !== 'USD') throw new TypeError('Expected USD amount');
  return money;
}
function capacity(input: unknown): number | null {
  if (input === null) return null;
  if (typeof input !== 'number' || !Number.isSafeInteger(input) || input < 0) throw new TypeError('Invalid capacity');
  return input;
}
export function validateTableFulfillment(input: unknown): TableFulfillmentSelection {
  const r = strictObject(input, ['kind', 'verified', 'locationReference', 'windowReference', 'addressVerified', 'manualApprovalReference', 'capacity', 'fee']);
  if (r.kind !== 'pickup' && r.kind !== 'local-delivery' && r.kind !== 'out-of-area') throw new TypeError('Unknown fulfillment');
  if (typeof r.verified !== 'boolean' || typeof r.addressVerified !== 'boolean') throw new TypeError('Explicit fulfillment verification required');
  const ref = (v: unknown) => v === null ? null : canonicalText(v);
  const feeMoney = amount(r.fee);
  return Object.freeze({ kind: r.kind, verified: r.verified, addressVerified: r.addressVerified, locationReference: ref(r.locationReference), windowReference: ref(r.windowReference), manualApprovalReference: ref(r.manualApprovalReference), capacity: capacity(r.capacity), fee: feeMoney === null ? {state: 'unknown' as const} : {state: 'verified' as const, money: feeMoney, evidenceReference: canonicalText((r.fee as Record<string, unknown>).evidenceReference)} });
}
export function foodFulfillmentMethod(kind: TableFulfillmentSelection['kind']): FoodFulfillmentMethod {
  if (kind === 'pickup') return 'meetup';
  if (kind === 'local-delivery' || kind === 'out-of-area') return 'personal-delivery';
  throw new TypeError('Unknown fulfillment kind');
}
export function tableCommercialBlockers(input: unknown): readonly string[] {
  const p = validateTableEntry(input), gaps: string[] = [];
  if (p.state !== 'AVAILABLE' || p.availability !== 'available') gaps.push('Product is not available');
  if (p.display !== 'approved' || p.ingredientsStatus !== 'verified' || p.recipe.allergenReview?.state !== 'reviewed') gaps.push('Product disclosures are not approved');
  if (p.ordering !== 'eligible-for-review') gaps.push('Product is not accepting orders');
  if (!p.sku || !p.approvedPrice) gaps.push('Approved SKU price is missing');
  if (p.maxPerOrder === null || p.remainingCapacity === null) gaps.push('Order limits or capacity are unverified');
  if (!p.packageDefinition?.netQuantity || p.offer.servingEstimate.state !== 'specified' || p.offer.storageSummary?.state !== 'specified' || p.offer.reheatingSummary?.state !== 'specified') gaps.push('Serving and handling information is unverified');
  return Object.freeze(gaps);
}
export function calculateTableOrderPreview(input: unknown) {
  const r = strictObject(input, ['lines', 'maxOrderQuantity', 'fulfillment', 'tax']);
  if (!Array.isArray(r.lines) || !r.lines.length) throw new TypeError('Select at least one item');
  const maxOrderQuantity = validateFoodPurchaseQuantity(r.maxOrderQuantity);
  const seen = new Set<string>(), blockers: string[] = [];
  const sources: TableCatalogEntry[] = [];
  let count = 0n;
  const lines = r.lines.map(raw => {
    const line = strictObject(raw, ['product', 'quantity']);
    const product = validateTableEntry(line.product), quantity = validateFoodPurchaseQuantity(line.quantity);
    if (seen.has(product.product.id)) throw new TypeError('Duplicate product line');
    seen.add(product.product.id); sources.push(product); count += BigInt(quantity);
    if (count > BigInt(maxOrderQuantity)) throw new TypeError('Maximum order quantity exceeded');
    if (product.maxPerOrder !== null && quantity > product.maxPerOrder) throw new TypeError('Product per-order limit exceeded');
    if (product.remainingCapacity !== null && quantity > product.remainingCapacity) throw new TypeError('Product capacity exceeded');
    blockers.push(...tableCommercialBlockers(product).map(b => `${product.presentation.name}: ${b}`));
    return {productId: product.product.id, name: product.presentation.name, quantity, unitPrice: product.approvedPrice?.money ?? null};
  });
  const fulfillment = validateTableFulfillment(r.fulfillment);
  if (!fulfillment.verified || !fulfillment.locationReference || !fulfillment.windowReference || fulfillment.capacity === null) blockers.push('Fulfillment location, schedule or capacity is unverified');
  if (fulfillment.capacity !== null && count > BigInt(fulfillment.capacity)) throw new TypeError('Fulfillment capacity exceeded');
  for (const p of sources) if ((fulfillment.kind === 'pickup' ? p.fulfillment.pickup : p.fulfillment.localDelivery) !== true) blockers.push(`${p.presentation.name}: fulfillment eligibility is unverified or unavailable`);
  if (fulfillment.kind !== 'pickup' && !fulfillment.addressVerified) blockers.push('Delivery address validation is required');
  if (fulfillment.kind === 'out-of-area' && !fulfillment.manualApprovalReference) blockers.push('Manual delivery approval is required');
  const taxInput = strictObject(r.tax, ['state', 'classification', 'money', 'evidenceReference']);
  let taxClassification: 'unknown' | 'taxable' | 'exempt' | 'mixed' = 'unknown';
  let tax: FoodMoney | null = null;
  if (taxInput.state === 'unknown') strictObject(r.tax, ['state']);
  else {
    if (taxInput.classification !== 'taxable' && taxInput.classification !== 'exempt' && taxInput.classification !== 'mixed') throw new TypeError('Explicit reviewed tax classification required');
    taxClassification = taxInput.classification;
    tax = amount({state: taxInput.state, money: taxInput.money, evidenceReference: taxInput.evidenceReference});
    if (taxClassification === 'exempt' && tax?.minorUnits !== 0) throw new TypeError('Exempt classification cannot carry tax');
  }
  const fee = amount(fulfillment.fee);
  if (fee === null) blockers.push('Fulfillment charge is unknown');
  if (tax === null) blockers.push('Tax classification and amount are unverified');
  let subtotal: FoodMoney | null = null;
  let lineSubtotals: (FoodMoney | null)[] = lines.map(() => null);
  if (sources.every(p => p.sku && p.approvedPrice)) {
    // Reuse exact SKU/approved-price validation and safe multiplication/addition.
    const quote = createInitialFoodMerchandiseQuoteVersion({id: 'food-merchandise-quote:table-preview', version: 1},
      {id: 'food-cart:table-preview', version: 1, lines: lines.map((l, i) => ({sku: {id: sources[i].sku!.id, version: sources[i].sku!.version}, quantity: l.quantity}))},
      sources.map(p => p.sku), sources.map(p => p.approvedPrice));
    subtotal = quote.merchandiseSubtotal; lineSubtotals = quote.lines.map(l => l.merchandiseSubtotal);
  }
  let total: FoodMoney | null = null;
  if (subtotal && fee && tax) {
    const cents = BigInt(subtotal.minorUnits) + BigInt(fee.minorUnits) + BigInt(tax.minorUnits);
    if (cents > BigInt(Number.MAX_SAFE_INTEGER)) throw new TypeError('Total exceeds safe integer cents');
    total = {currency: 'USD', minorUnits: Number(cents)};
  }
  return Object.freeze({state: blockers.length ? 'blocked' as const : 'estimate-only' as const,
    lines: Object.freeze(lines.map((l, i) => Object.freeze({...l, subtotal: lineSubtotals[i]}))),
    subtotal, fulfillmentFee: fee, tax, taxClassification, total, blockers: Object.freeze(blockers),
    paymentAuthorized: false as const, orderSubmissionEnabled: false as const });
}
export type TableOrderPreview = ReturnType<typeof calculateTableOrderPreview>;
export const UNVERIFIED_TABLE_FULFILLMENT: TableFulfillmentSelection = Object.freeze({kind: 'pickup', verified: false, locationReference: null, windowReference: null, addressVerified: false, manualApprovalReference: null, capacity: null, fee: {state: 'unknown' as const}});
