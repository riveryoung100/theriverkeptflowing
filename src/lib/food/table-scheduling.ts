/** Pure scheduling/eligibility for offline modeling. No location lookup or booking. */
import { validateFoodReviewDate } from './draft-domain';
import { validateFoodPurchaseQuantity } from './cart-quote-domain';
import { validateFoodMoney } from './cost-pricing-domain';
import type { FoodFulfillmentMethod } from './fulfillment-capacity-reservation-domain';
import type { AmountKnowledge, TableFulfillmentSelection } from './table-order-preview';
import { strictObject } from './table-catalog';

export function instant(input: string): number {
  if (typeof input !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(input) || !Number.isFinite(Date.parse(input))) throw new TypeError('Explicit UTC instant required');
  const ms = Date.parse(input);
  if (new Date(ms).toISOString().slice(0, 19) !== input.slice(0, 19)) throw new TypeError('Invalid calendar instant');
  return ms;
}
export function freezeModel<T>(v: T): T { if (v && typeof v === 'object') { Object.values(v).forEach(freezeModel); Object.freeze(v); } return v; }
export function modelRef(v: unknown): string {
  if (typeof v !== 'string' || !/^[a-zA-Z0-9:_./-]{1,200}$/.test(v)) throw new TypeError('Opaque reference required; no customer contact/address data');
  return v;
}
export function nonnegative(v: unknown): number { if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < 0) throw new TypeError('Nonnegative safe integer required'); return v; }
export interface TableWindow {
  readonly id: string; readonly method: FoodFulfillmentMethod; readonly timezone: string; readonly locationReference: string;
  readonly localDate: string; readonly localStart: string; readonly localEnd: string;
  readonly startsAt: string; readonly endsAt: string; readonly cutoffAt: string;
  readonly minLeadMinutes: number; readonly capacity: number; readonly closed: boolean;
  readonly unavailableDates: readonly string[]; readonly verified: boolean; readonly evidenceReference: string | null;
}
export function localParts(at: string, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(new Date(instant(at)));
  const get = (key: string) => parts.find(p => p.type === key)!.value;
  return {date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}`};
}
export function validateWindow(input: TableWindow): TableWindow {
  strictObject(input, ['id', 'method', 'timezone', 'locationReference', 'localDate', 'localStart', 'localEnd', 'startsAt', 'endsAt', 'cutoffAt', 'minLeadMinutes', 'capacity', 'closed', 'unavailableDates', 'verified', 'evidenceReference']);
  modelRef(input.id); modelRef(input.locationReference); validateFoodReviewDate(input.localDate);
  if (input.method !== 'meetup' && input.method !== 'personal-delivery') throw new TypeError('Unsupported fulfillment method');
  if (typeof input.timezone !== 'string' || typeof input.closed !== 'boolean' || typeof input.verified !== 'boolean') throw new TypeError('Invalid window metadata');
  const start = instant(input.startsAt), end = instant(input.endsAt), cutoff = instant(input.cutoffAt);
  const localStart = localParts(input.startsAt, input.timezone), localEnd = localParts(input.endsAt, input.timezone);
  if (localStart.date !== input.localDate || localStart.time !== input.localStart || localEnd.time !== input.localEnd || end <= start || end - start > 86400000 || cutoff > start) throw new TypeError('Window UTC/local values or ordering disagree');
  nonnegative(input.capacity); nonnegative(input.minLeadMinutes);
  if (!Array.isArray(input.unavailableDates)) throw new TypeError('Unavailable dates required');
  input.unavailableDates.forEach(validateFoodReviewDate);
  if (input.evidenceReference !== null) modelRef(input.evidenceReference);
  return freezeModel(structuredClone(input));
}
export function windowBlockers(input: TableWindow, now: string, quantity: number): readonly string[] {
  const w = validateWindow(input), at = instant(now); validateFoodPurchaseQuantity(quantity);
  const reasons: string[] = [];
  if (!w.verified || !w.evidenceReference) reasons.push('Schedule is unverified');
  if (w.closed || w.unavailableDates.includes(w.localDate)) reasons.push('Window is closed');
  if (at >= instant(w.cutoffAt) || at >= instant(w.startsAt)) reasons.push('Order cutoff has passed');
  if (BigInt(at) + BigInt(w.minLeadMinutes) * 60000n > BigInt(instant(w.startsAt))) reasons.push('Insufficient lead time');
  if (quantity > w.capacity) reasons.push('Window capacity exceeded');
  return Object.freeze(reasons);
}
export interface DeliveryApproval {
  readonly requestId: string; readonly orderId: string; readonly locationReference: string; readonly windowId: string;
  readonly policyVersion: number; readonly distanceMeters: number; readonly feeCents: number; readonly expiresAt: string; readonly evidenceReference: string;
}
export interface TableDeliveryPolicy {
  readonly version: number; readonly verified: boolean; readonly zoneReference: string | null;
  readonly maximumDistanceMeters: number | null; readonly fee: AmountKnowledge;
}
export interface TableDeliveryRequest {
  readonly id: string; readonly orderId: string; readonly locationReference: string;
  readonly addressEvidenceReference: string | null; readonly distanceMeters: number | null;
  readonly distanceEvidenceReference: string | null; readonly approval: DeliveryApproval | null;
}
export function validateDeliveryRequest(request: TableDeliveryRequest): TableDeliveryRequest {
  strictObject(request, ['id', 'orderId', 'locationReference', 'addressEvidenceReference', 'distanceMeters', 'distanceEvidenceReference', 'approval']);
  for (const value of [request.id, request.orderId, request.locationReference]) modelRef(value);
  for (const value of [request.addressEvidenceReference, request.distanceEvidenceReference]) if (value !== null) modelRef(value);
  if (request.distanceMeters !== null) nonnegative(request.distanceMeters);
  if (request.approval !== null) {
    const a = request.approval;
    strictObject(a, ['requestId', 'orderId', 'locationReference', 'windowId', 'policyVersion', 'distanceMeters', 'feeCents', 'expiresAt', 'evidenceReference']);
    for (const value of [a.requestId, a.orderId, a.locationReference, a.windowId, a.evidenceReference]) modelRef(value);
    validateFoodPurchaseQuantity(a.policyVersion); nonnegative(a.distanceMeters); nonnegative(a.feeCents); instant(a.expiresAt);
  }
  return freezeModel(structuredClone(request));
}
export function deliveryEligibility(policy: TableDeliveryPolicy, request: TableDeliveryRequest, window: TableWindow, now: string, quantity: number) {
  validateDeliveryRequest(request);
  strictObject(policy, ['version', 'verified', 'zoneReference', 'maximumDistanceMeters', 'fee']);
  strictObject(request, ['id', 'orderId', 'locationReference', 'addressEvidenceReference', 'distanceMeters', 'distanceEvidenceReference', 'approval']);
  validateFoodPurchaseQuantity(policy.version); modelRef(request.id); modelRef(request.orderId); modelRef(request.locationReference);
  if (typeof policy.verified !== 'boolean') throw new TypeError('Invalid zone verification');
  const gaps = [...windowBlockers(window, now, quantity)];
  if (request.locationReference !== window.locationReference) gaps.push('Unapproved handoff location');
  if (window.method !== 'personal-delivery') gaps.push('Delivery window required');
  if (!policy.verified || !policy.zoneReference || policy.maximumDistanceMeters === null) gaps.push('Delivery zone is unverified');
  if (policy.zoneReference !== null) modelRef(policy.zoneReference);
  if (policy.maximumDistanceMeters !== null) nonnegative(policy.maximumDistanceMeters);
  if (request.distanceMeters !== null) nonnegative(request.distanceMeters);
  for (const ref of [request.addressEvidenceReference, request.distanceEvidenceReference]) if (ref !== null) modelRef(ref);
  if (!request.addressEvidenceReference || !request.distanceEvidenceReference || request.distanceMeters === null) gaps.push('Address/distance verification is missing');
  let feeCents: number | null = null;
  strictObject(policy.fee, policy.fee.state === 'unknown' ? ['state'] : ['state', 'money', 'evidenceReference']);
  if (policy.fee.state === 'verified') {
    modelRef(policy.fee.evidenceReference); const fee = validateFoodMoney(policy.fee.money);
    if (fee.currency !== 'USD') throw new TypeError('USD fee required'); feeCents = fee.minorUnits;
  } else if (policy.fee.state === 'unknown') gaps.push('Delivery fee is unverified');
  else throw new TypeError('Unknown delivery fee state');
  const outside = request.distanceMeters !== null && policy.maximumDistanceMeters !== null && request.distanceMeters > policy.maximumDistanceMeters;
  if (outside) {
    const a = request.approval;
    if (!a) gaps.push('Manual delivery approval required');
    else {
      strictObject(a, ['requestId', 'orderId', 'locationReference', 'windowId', 'policyVersion', 'distanceMeters', 'feeCents', 'expiresAt', 'evidenceReference']);
      modelRef(a.evidenceReference); instant(a.expiresAt);
      if (a.requestId !== request.id || a.orderId !== request.orderId || a.locationReference !== request.locationReference || a.windowId !== window.id || a.policyVersion !== policy.version || a.distanceMeters !== request.distanceMeters || a.feeCents !== feeCents || instant(now) >= instant(a.expiresAt)) gaps.push('Manual approval is stale or mismatched');
    }
  }
  return freezeModel({state: gaps.length ? outside && !request.approval ? 'awaiting-manual-approval' as const : 'unavailable' as const : 'eligible-for-simulation' as const, blockers: gaps, outside, paymentAuthorized: false as const});
}
export function fulfillmentForModel(window: TableWindow, location: string, fee: AmountKnowledge, delivery?: {policy: TableDeliveryPolicy; request: TableDeliveryRequest}, now?: string, quantity?: number): TableFulfillmentSelection {
  modelRef(location);
  const eligible = delivery && now && quantity ? deliveryEligibility(delivery.policy, delivery.request, window, now, quantity) : null;
  return {kind: window.method === 'meetup' ? 'pickup' : eligible?.outside ? 'out-of-area' : 'local-delivery', verified: window.verified && !!window.evidenceReference && (!delivery || eligible?.state === 'eligible-for-simulation'), locationReference: location, windowReference: window.id, addressVerified: !!delivery?.request.addressEvidenceReference, manualApprovalReference: delivery?.request.approval?.evidenceReference ?? null, capacity: window.capacity, fee};
}
