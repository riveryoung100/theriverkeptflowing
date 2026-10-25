/** Private offline orchestration over existing food truth. Never a live order/payment adapter. */
import { assessLaunchReadiness } from '../../../scripts/food/launch-readiness.mjs';
import { validateTableCatalog, strictObject, type TableCatalogEntry } from './table-catalog';
import { calculateTableOrderPreview, foodFulfillmentMethod, type AmountKnowledge, type TaxKnowledge } from './table-order-preview';
import { createInitialFoodMerchandiseQuoteVersion, validateFoodPurchaseQuantity } from './cart-quote-domain';
import { createInitialFoodFulfillmentIntentVersion, createInitialFoodReservationRequestVersion } from './fulfillment-capacity-reservation-domain';
import { createInitialFoodPhysicalOrderVersion } from './physical-order-domain';
import { createInitialFoodPayableAssessmentVersion, createFoodPayableAssessmentId } from './payable-assessment-domain';
import { createTableCapacityModel, modelFingerprint, type ModelCapacityResource } from './table-capacity-model';
import { freezeModel, instant, modelRef, validateWindow, windowBlockers, fulfillmentForModel, deliveryEligibility, validateDeliveryRequest, localParts, type TableWindow, type TableDeliveryPolicy, type TableDeliveryRequest } from './table-scheduling';
import { validateFoodReviewDate } from './draft-domain';

export interface SimulationCartLine { readonly productId: string; readonly version: number; readonly quantity: number }
export interface SimulationOffer {
  readonly productId: string; readonly productVersion: number; readonly salesOpenAt: string; readonly salesCloseAt: string;
  readonly priceExpiresAt: string; readonly batchId: string; readonly productionDate: string; readonly cutoffAt: string;
}
export interface SimulationAuthority {
  readonly mode: 'simulation-only'; readonly fixtureLabel: 'SYNTHETIC'; readonly catalog: readonly TableCatalogEntry[];
  readonly offers: readonly SimulationOffer[]; readonly windows: readonly TableWindow[];
  readonly resources: readonly ModelCapacityResource[]; readonly launchReviews: readonly unknown[];
  readonly maxOrderQuantity: number; readonly maxCustomerQuantity: number; readonly quoteLifetimeSeconds: number; readonly holdLifetimeSeconds: number;
  readonly pickupFee: AmountKnowledge; readonly deliveryPolicy: TableDeliveryPolicy | null; readonly tax: TaxKnowledge;
}
export type SimulationOrderStatus = 'draft-cart' | 'quote-awaiting-pricing' | 'quote-ready' | 'fulfillment-unavailable' | 'awaiting-payment' | 'simulation-payment-recorded' | 'accepted' | 'preparing' | 'ready-for-pickup' | 'out-for-delivery' | 'fulfilled' | 'canceled' | 'refund-pending' | 'refunded';
// Reserved live vocabulary: deliberately unreachable through this engine.
export type LivePaymentBoundary = 'unconfigured' | 'payment-verified';
interface SimulationQuote {
  readonly id: string; readonly version: number; readonly issuedAt: string; readonly expiresAt: string; readonly authorityFingerprint: string;
  readonly products: readonly TableCatalogEntry[]; readonly offers: readonly SimulationOffer[];
  readonly calculation: ReturnType<typeof calculateTableOrderPreview>;
  readonly merchandise: ReturnType<typeof createInitialFoodMerchandiseQuoteVersion>;
  readonly fulfillment: ReturnType<typeof createInitialFoodFulfillmentIntentVersion>;
  readonly request: ReturnType<typeof createInitialFoodReservationRequestVersion>;
  readonly physicalOrder: ReturnType<typeof createInitialFoodPhysicalOrderVersion>;
  readonly assessment: ReturnType<typeof createInitialFoodPayableAssessmentVersion>;
}
export interface SimulationOrder {
  readonly mode: 'simulation-only'; readonly realPaymentVerified: false; readonly id: string; readonly version: number;
  readonly createdAt: string; readonly quoteSequence: number;
  readonly customerReference: string;
  readonly status: SimulationOrderStatus; readonly cart: readonly SimulationCartLine[];
  readonly windowId: string; readonly locationReference: string; readonly delivery: TableDeliveryRequest | null;
  readonly quote: SimulationQuote | null; readonly blockers: readonly string[];
  readonly holdId: string | null; readonly paymentEventId: string | null; readonly refundEventId: string | null;
  readonly events: readonly {readonly commandId: string; readonly status: SimulationOrderStatus; readonly at: string; readonly evidenceReference?: string}[];
}
interface FakePayment { readonly kind: 'simulation-only-payment'; readonly eventId: string; readonly orderId: string; readonly quoteId: string; readonly cents: number; readonly currency: 'USD' }
interface FakeRefund { readonly kind: 'simulation-only-refund'; readonly eventId: string; readonly orderId: string; readonly paymentEventId: string; readonly cents: number }
function cart(input: unknown): readonly SimulationCartLine[] {
  if (!Array.isArray(input) || !input.length) throw new TypeError('Nonempty cart required');
  const seen = new Set<string>();
  return freezeModel(input.map(raw => { const r = strictObject(raw, ['productId', 'version', 'quantity']); const productId = modelRef(r.productId); if (seen.has(productId)) throw new TypeError('Duplicate product'); seen.add(productId); return {productId, version: validateFoodPurchaseQuantity(r.version), quantity: validateFoodPurchaseQuantity(r.quantity)}; }));
}
function authority(input: SimulationAuthority): SimulationAuthority {
  if (input.mode !== 'simulation-only' || input.fixtureLabel !== 'SYNTHETIC') throw new TypeError('Only explicitly synthetic simulation authority is supported');
  validateFoodPurchaseQuantity(input.maxOrderQuantity); validateFoodPurchaseQuantity(input.maxCustomerQuantity); validateFoodPurchaseQuantity(input.quoteLifetimeSeconds); validateFoodPurchaseQuantity(input.holdLifetimeSeconds);
  const catalog = validateTableCatalog(input.catalog), windows = input.windows.map(validateWindow);
  if (new Set(windows.map(w => w.id)).size !== windows.length || new Set(input.offers.map(o => o.productId)).size !== input.offers.length) throw new TypeError('Duplicate authority record');
  for (const w of windows) if (!input.resources.some(r => r.id === w.id && r.kind === 'window' && r.capacity === w.capacity)) throw new TypeError('Window capacity source mismatch');
  for (const o of input.offers) { modelRef(o.batchId); modelRef(o.productId); validateFoodPurchaseQuantity(o.productVersion); validateFoodReviewDate(o.productionDate); if (instant(o.salesOpenAt) >= instant(o.salesCloseAt)) throw new TypeError('Invalid sales window'); instant(o.priceExpiresAt); instant(o.cutoffAt); }
  for (const o of input.offers) if (!input.resources.some(r => r.id === o.batchId && r.kind === 'batch')) throw new TypeError('Missing planned batch capacity source');
  input.launchReviews.forEach(assessLaunchReadiness);
  return freezeModel({...structuredClone(input), catalog, windows});
}
export function createTableOrderSimulation(input: SimulationAuthority) {
  let sources = authority(input), failReservation = false;
  const orders = new Map<string, SimulationOrder>(), commands = new Map<string, string>();
  const fakePayments = new WeakSet<object>(), fakeRefunds = new WeakSet<object>(), paymentEvents = new Map<string, string>(), refundEvents = new Map<string, string>();
  function get(id: string) { const o = orders.get(id); if (!o) throw new TypeError('Unknown simulation order'); return o; }
  function authorityFingerprint() { return modelFingerprint(sources); }
  function assertLaunch(o: SimulationOrder) {
    for (const line of o.cart) if (!sources.launchReviews.map(assessLaunchReadiness).some(r => r.productId === line.productId && r.productVersion === line.version && r.status === 'PASS' && r.authorizationStatus === 'PASS')) throw new TypeError('Launch evidence revoked or unavailable');
  }
  function assertCurrent(o: SimulationOrder, now: string) {
    if (!o.quote || o.quote.authorityFingerprint !== authorityFingerprint() || instant(now) >= instant(o.quote.expiresAt)) throw new TypeError('Quote expired or authority changed; requote before payment');
    // Re-evaluate actual sales, scheduling, launch and fulfillment, not just an old hash.
    const fresh = quoteFor(o, now);
    if (!fresh.quote || fresh.blockers.length || fresh.quote.assessment.amountDue.minorUnits !== o.quote.assessment.amountDue.minorUnits) throw new TypeError('Quote no longer eligible');
  }
  const capacity = createTableCapacityModel(sources.resources, (orderId, quoteId, now) => {
    const o = get(orderId); if (o.status !== 'quote-ready' || o.quote?.id !== quoteId) return false;
    try { assertCurrent(o, now); return true; } catch { return false; }
  });
  function quoteFor(o: SimulationOrder, now: string): {quote: SimulationQuote | null; blockers: string[]; status: SimulationOrderStatus} {
    const at = instant(now), blockers: string[] = [], products: TableCatalogEntry[] = [], offers: SimulationOffer[] = [];
    let count = 0n;
    for (const l of o.cart) {
      const p = sources.catalog.find(p => p.product.id === l.productId), offer = sources.offers.find(f => f.productId === l.productId);
      if (!p || p.product.version !== l.version || !offer || offer.productVersion !== l.version) { blockers.push('Unknown product or approved version mismatch'); continue; }
      products.push(p); offers.push(offer); count += BigInt(l.quantity);
      const review = sources.launchReviews.map(assessLaunchReadiness).find(r => r.productId === l.productId && r.productVersion === l.version);
      if (!review || review.status !== 'PASS' || review.authorizationStatus !== 'PASS') blockers.push('Explicit launch and full readiness evidence required');
      if (!p.approvedPrice || p.approvedPrice.money.minorUnits <= 0) blockers.push('Positive approved price required');
      if (at < instant(offer.salesOpenAt) || at >= instant(offer.salesCloseAt) || at >= instant(offer.cutoffAt)) blockers.push('Sales window/cutoff unavailable');
      if (at >= instant(offer.priceExpiresAt)) blockers.push('Approved price expired');
    }
    if (count > BigInt(sources.maxOrderQuantity)) throw new TypeError('Excessive order quantity');
    const batches = new Set(offers.map(f => f.batchId));
    const otherCustomerUnits = [...orders.values()].filter(other => other.id !== o.id && other.customerReference === o.customerReference && ['awaiting-payment', 'simulation-payment-recorded', 'accepted', 'preparing', 'ready-for-pickup', 'out-for-delivery', 'fulfilled'].includes(other.status))
      .reduce((total, other) => total + other.cart.reduce((n, line, i) => n + (other.quote && batches.has(other.quote.offers[i].batchId) ? BigInt(line.quantity) : 0n), 0n), 0n);
    if (count + otherCustomerUnits > BigInt(sources.maxCustomerQuantity)) blockers.push('Customer batch purchase limit exceeded');
    const w = sources.windows.find(w => w.id === o.windowId);
    if (!w) return {quote: null, blockers: [...blockers, 'Unknown fulfillment window'], status: 'fulfillment-unavailable'};
    if (count === 0n) return {quote: null, blockers, status: 'quote-awaiting-pricing'};
    if (count > BigInt(Number.MAX_SAFE_INTEGER)) throw new TypeError('Quantity overflow');
    const quantity = Number(count), fulfillmentGaps = [...windowBlockers(w, now, quantity)];
    if (o.locationReference !== w.locationReference) fulfillmentGaps.push('Handoff location is not approved for this window');
    for (const offer of offers) if (offer.productionDate > w.localDate) fulfillmentGaps.push('Production occurs after fulfillment day');
    let fulfillment;
    if (w.method === 'personal-delivery') {
      if (!sources.deliveryPolicy || !o.delivery || o.delivery.orderId !== o.id || o.delivery.locationReference !== o.locationReference) fulfillmentGaps.push('Delivery policy/request unavailable or mismatched');
      if (sources.deliveryPolicy && o.delivery) fulfillmentGaps.push(...deliveryEligibility(sources.deliveryPolicy, o.delivery, w, now, quantity).blockers);
      fulfillment = fulfillmentForModel(w, o.locationReference, sources.deliveryPolicy?.fee ?? {state: 'unknown'}, sources.deliveryPolicy && o.delivery ? {policy: sources.deliveryPolicy, request: o.delivery} : undefined, now, quantity);
    } else {
      if (o.delivery) fulfillmentGaps.push('Delivery request cannot select pickup');
      fulfillment = fulfillmentForModel(w, o.locationReference, sources.pickupFee);
    }
    if (fulfillmentGaps.length) return {quote: null, blockers: [...blockers, ...fulfillmentGaps], status: 'fulfillment-unavailable'};
    if (blockers.length) return {quote: null, blockers, status: 'quote-awaiting-pricing'};
    const calculation = calculateTableOrderPreview({lines: products.map((p, i) => ({product: p, quantity: o.cart[i].quantity})), maxOrderQuantity: sources.maxOrderQuantity, fulfillment, tax: sources.tax});
    if (calculation.state !== 'estimate-only' || !calculation.total) return {quote: null, blockers: [...calculation.blockers], status: 'quote-awaiting-pricing'};
    const version = o.quoteSequence + 1;
    if (!Number.isSafeInteger(version)) throw new TypeError('Quote version overflow');
    const tag = `${o.id}-q${version}`;
    const merchandise = createInitialFoodMerchandiseQuoteVersion({id: `food-merchandise-quote:${tag}`, version: 1}, {id: `food-cart:${tag}`, version: 1, lines: products.map((p, i) => ({sku: {id: p.sku!.id, version: p.sku!.version}, quantity: o.cart[i].quantity}))}, products.map(p => p.sku), products.map(p => p.approvedPrice));
    const intent = createInitialFoodFulfillmentIntentVersion({id: `food-fulfillment-intent:${tag}`, version: 1}, merchandise, {method: foodFulfillmentMethod(fulfillment.kind), locationReference: o.locationReference, windowReference: w.id});
    const request = createInitialFoodReservationRequestVersion({id: `food-reservation-request:${tag}`, version: 1}, merchandise, intent);
    const physicalOrder = createInitialFoodPhysicalOrderVersion({id: `food-physical-order:${tag}`, version: 1}, merchandise, intent, request);
    const assessment = createInitialFoodPayableAssessmentVersion({id: createFoodPayableAssessmentId(tag), version: 1}, physicalOrder,
      [{direction: 'charge', reference: 'fulfillment', money: calculation.fulfillmentFee, sourceReference: 'synthetic-fulfillment-authority'}, {direction: 'charge', reference: 'tax', money: calculation.tax, sourceReference: 'synthetic-tax-authority'}],
      {attribution: 'SIMULATION-ONLY', sourceReference: 'synthetic-authority', assessedOn: now.slice(0, 10)});
    if (assessment.amountDue.minorUnits !== calculation.total.minorUnits) throw new TypeError('Assessment/preview mismatch');
    const expiry = Math.min(at + sources.quoteLifetimeSeconds * 1000, instant(w.cutoffAt), instant(w.startsAt), ...(o.delivery?.approval ? [instant(o.delivery.approval.expiresAt)] : []), ...offers.flatMap(f => [instant(f.salesCloseAt), instant(f.priceExpiresAt), instant(f.cutoffAt)]));
    if (!Number.isSafeInteger(expiry) || expiry <= at) throw new TypeError('Invalid quote expiration');
    return {blockers: [], status: 'quote-ready', quote: freezeModel({id: tag, version, issuedAt: now, expiresAt: new Date(expiry).toISOString(), authorityFingerprint: authorityFingerprint(), products, offers, calculation, merchandise, fulfillment: intent, request, physicalOrder, assessment})};
  }
  const assertState = (o: SimulationOrder, allowed: readonly SimulationOrderStatus[]) => { if (!allowed.includes(o.status)) throw new TypeError(`Invalid transition from ${o.status}`); };
  return Object.freeze({
    mode: 'simulation-only' as const, liveAdapter: Object.freeze({configured: false, paymentAuthorized: false}),
    create(id: string, lines: unknown, windowId: string, locationReference: string, now: string, delivery: TableDeliveryRequest | null = null, customerReference = `synthetic-customer-${id}`) {
      modelRef(id); if (!/^[a-z0-9-]{1,60}$/.test(id)) throw new TypeError('Synthetic order ID must be bounded local identity');
      modelRef(windowId); modelRef(locationReference); modelRef(customerReference); instant(now);
      if (orders.has(id)) throw new TypeError('Order identity already exists');
      const o: SimulationOrder = freezeModel({mode: 'simulation-only', realPaymentVerified: false, id, version: 1, createdAt: now, quoteSequence: 0, customerReference, status: 'draft-cart', cart: cart(lines), windowId, locationReference, delivery: delivery === null ? null : validateDeliveryRequest(delivery), quote: null, blockers: [], holdId: null, paymentEventId: null, refundEventId: null, events: []}); orders.set(id, o); return o;
    }, get, list: () => Object.freeze([...orders.values()]), capacity: capacity.snapshot,
    updateAuthorities(next: SimulationAuthority) { const value = authority(next); if (modelFingerprint(value.resources) !== modelFingerprint(sources.resources)) throw new TypeError('Resize capacity through the model, not authority replacement'); sources = value; },
    resizeCapacity: capacity.resize,
    failNextReservation() { failReservation = true; },
    fakePayment(orderId: string, eventId: string, now: string) {
      const o = get(orderId); assertState(o, ['awaiting-payment']); assertCurrent(o, now); modelRef(eventId);
      const proof: FakePayment = freezeModel({kind: 'simulation-only-payment', eventId, orderId, quoteId: o.quote!.id, cents: o.quote!.assessment.amountDue.minorUnits, currency: 'USD'}); fakePayments.add(proof); return proof;
    },
    fakeRefund(orderId: string, eventId: string) {
      const o = get(orderId); assertState(o, ['refund-pending']); modelRef(eventId);
      const proof: FakeRefund = freezeModel({kind: 'simulation-only-refund', eventId, orderId, paymentEventId: o.paymentEventId!, cents: o.quote!.assessment.amountDue.minorUnits}); fakeRefunds.add(proof); return proof;
    },
    execute(orderId: string, commandId: string, expectedVersion: number, command: unknown, now: string) {
      const o = get(orderId); modelRef(commandId); instant(now); validateFoodPurchaseQuantity(expectedVersion);
      const raw = strictObject(command, ['type', 'lines', 'proof', 'evidenceReference', 'windowId', 'locationReference', 'delivery']);
      const key = `${orderId}/${commandId}`, hash = modelFingerprint(command), prior = commands.get(key);
      if (prior !== undefined) { if (prior !== hash) throw new TypeError('Order idempotency conflict'); return get(orderId); }
      if (o.version !== expectedVersion) throw new TypeError('Stale order version');
      if (instant(now) < instant(o.createdAt)) throw new TypeError('Event precedes order creation');
      if (o.events.length && instant(now) < instant(o.events[o.events.length - 1].at)) throw new TypeError('Event time cannot move backwards');
      let next = {...o}, capacityEffect: (() => unknown) | null = null, evidenceReference: string | undefined;
      switch (raw.type) {
        case 'set-cart': strictObject(command, ['type', 'lines']); assertState(o, ['draft-cart', 'quote-awaiting-pricing', 'fulfillment-unavailable', 'quote-ready']); next = {...next, cart: cart(raw.lines), quote: null, blockers: [], status: 'draft-cart'}; break;
        case 'select-fulfillment': strictObject(command, ['type', 'windowId', 'locationReference', 'delivery']); assertState(o, ['draft-cart', 'quote-awaiting-pricing', 'fulfillment-unavailable', 'quote-ready']); next = {...next, windowId: modelRef(raw.windowId), locationReference: modelRef(raw.locationReference), delivery: raw.delivery === null ? null : validateDeliveryRequest(raw.delivery as TableDeliveryRequest), quote: null, blockers: [], status: 'draft-cart'}; break;
        case 'quote': strictObject(command, ['type']); assertState(o, ['draft-cart', 'quote-awaiting-pricing', 'fulfillment-unavailable', 'quote-ready']); next = {...next, ...quoteFor(o, now)}; if (next.quote) next.quoteSequence = next.quote.version; break;
        case 'begin-checkout': {
          strictObject(command, ['type']); assertState(o, ['quote-ready']); assertCurrent(o, now);
          const id = `hold-${o.id}-${o.quote!.version}`, expiresAt = new Date(Math.min(instant(o.quote!.expiresAt), instant(now) + sources.holdLifetimeSeconds * 1000)).toISOString();
          const resourceLines = new Map<string, number>();
          o.cart.forEach((l, i) => { const resource = o.quote!.offers[i].batchId; const sum = BigInt(resourceLines.get(resource) ?? 0) + BigInt(l.quantity); if (sum > BigInt(Number.MAX_SAFE_INTEGER)) throw new TypeError('Capacity quantity overflow'); resourceLines.set(resource, Number(sum)); });
          resourceLines.set(o.windowId, o.cart.reduce((n, l) => n + l.quantity, 0));
          const fail = failReservation; failReservation = false;
          capacityEffect = () => capacity.reserve(key, capacity.snapshot().revision, {id, orderId, quoteId: o.quote!.id, lines: [...resourceLines].map(([resourceId, quantity]) => ({resourceId, quantity})), expiresAt}, now, fail);
          next = {...next, holdId: id, status: 'awaiting-payment'}; break;
        }
        case 'simulate-payment': {
          strictObject(command, ['type', 'proof']);
          const p = raw.proof as FakePayment;
          if (!p || !fakePayments.has(p) || p.kind !== 'simulation-only-payment' || p.orderId !== o.id || p.quoteId !== o.quote?.id || p.currency !== 'USD' || p.cents !== o.quote?.assessment.amountDue.minorUnits) throw new TypeError('No trusted simulation proof; live payment verification is unconfigured');
          const used = paymentEvents.get(p.eventId);
          if (used) { if (used !== o.id) throw new TypeError('Payment event already belongs to another order'); commands.set(key, hash); return o; }
          assertState(o, ['awaiting-payment']); assertCurrent(o, now);
          const h = capacity.snapshot().holds.find(h => h.id === o.holdId);
          if (!h || h.status !== 'held' || instant(now) >= instant(h.expiresAt)) throw new TypeError('Payment simulation requires active hold');
          next = {...next, paymentEventId: p.eventId, status: 'simulation-payment-recorded'}; break;
        }
        case 'accept': strictObject(command, ['type']); assertState(o, ['simulation-payment-recorded']); assertCurrent(o, now); capacityEffect = () => capacity.change(key, capacity.snapshot().revision, o.holdId!, 'commit', now); next.status = 'accepted'; break;
        case 'prepare': strictObject(command, ['type']); assertState(o, ['accepted']); assertLaunch(o); if (o.quote!.offers.some(f => localParts(now, sources.windows.find(w => w.id === o.windowId)!.timezone).date < f.productionDate)) throw new TypeError('Production date not reached'); next.status = 'preparing'; break;
        case 'ready': strictObject(command, ['type', 'evidenceReference']); assertState(o, ['preparing']); assertLaunch(o); evidenceReference = modelRef(raw.evidenceReference); next.status = 'ready-for-pickup'; break;
        case 'dispatch': strictObject(command, ['type', 'evidenceReference']); assertState(o, ['ready-for-pickup']); assertLaunch(o); if (o.quote!.fulfillment.method !== 'personal-delivery' || !o.paymentEventId) throw new TypeError('Paid delivery order required'); evidenceReference = modelRef(raw.evidenceReference); next.status = 'out-for-delivery'; break;
        case 'fulfill': { strictObject(command, ['type', 'evidenceReference']); assertState(o, o.quote?.fulfillment.method === 'personal-delivery' ? ['out-for-delivery'] : ['ready-for-pickup']); assertLaunch(o); const w = sources.windows.find(w => w.id === o.windowId); if (!w || instant(now) < instant(w.startsAt) || instant(now) >= instant(w.endsAt)) throw new TypeError('Outside authorized handoff window'); evidenceReference = modelRef(raw.evidenceReference); next.status = 'fulfilled'; break; }
        case 'cancel': strictObject(command, ['type']); assertState(o, ['draft-cart', 'quote-awaiting-pricing', 'quote-ready', 'fulfillment-unavailable', 'awaiting-payment', 'simulation-payment-recorded', 'accepted', 'preparing', 'ready-for-pickup']); next.status = o.paymentEventId ? 'refund-pending' : 'canceled'; if (o.holdId && !o.events.some(e => e.status === 'preparing')) capacityEffect = () => capacity.change(key, capacity.snapshot().revision, o.holdId!, 'release', now); break;
        case 'request-refund': strictObject(command, ['type', 'evidenceReference']); assertState(o, ['fulfilled']); evidenceReference = modelRef(raw.evidenceReference); next.status = 'refund-pending'; break;
        case 'refund': {
          strictObject(command, ['type', 'proof']); const p = raw.proof as FakeRefund;
          if (!p || !fakeRefunds.has(p) || p.kind !== 'simulation-only-refund' || p.orderId !== o.id || p.paymentEventId !== o.paymentEventId || p.cents !== o.quote?.assessment.amountDue.minorUnits) throw new TypeError('Simulation refund proof required');
          const used = refundEvents.get(p.eventId); if (used) { if (used !== o.id) throw new TypeError('Refund event conflict'); commands.set(key, hash); return o; }
          assertState(o, ['refund-pending']); next = {...next, refundEventId: p.eventId, status: 'refunded'}; break;
        }
        default: throw new TypeError('Unknown order command; no live payment command exists');
      }
      if (o.version === Number.MAX_SAFE_INTEGER) throw new TypeError('Order version overflow');
      const result = freezeModel({...next, version: o.version + 1, events: [...o.events, {commandId, status: next.status, at: now, ...(evidenceReference ? {evidenceReference} : {})}]});
      capacityEffect?.(); // Failure leaves the order and idempotency record untouched.
      orders.set(orderId, result); commands.set(key, hash);
      if (raw.type === 'simulate-payment') paymentEvents.set((raw.proof as FakePayment).eventId, o.id);
      if (raw.type === 'refund') refundEvents.set((raw.proof as FakeRefund).eventId, o.id);
      return result;
    },
    cleanup(commandId: string, now: string) {
      if ([...orders.values()].some(o => instant(now) < instant(o.events.at(-1)?.at ?? o.createdAt))) throw new TypeError('Cleanup cannot move time backwards');
      capacity.expire(`cleanup/${commandId}`, capacity.snapshot().revision, now);
      for (const [id, o] of orders) if (['awaiting-payment', 'simulation-payment-recorded'].includes(o.status) && capacity.snapshot().holds.some(h => h.id === o.holdId && h.status === 'expired')) {
        orders.set(id, freezeModel({...o, version: o.version + 1, status: o.paymentEventId ? 'refund-pending' : 'canceled', events: [...o.events, {commandId, at: now, status: o.paymentEventId ? 'refund-pending' as const : 'canceled' as const}]}));
      }
      return Object.freeze([...orders.values()]);
    }
  });
}
