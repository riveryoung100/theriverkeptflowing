/** Application orchestration for PRIVATE, OFFLINE, SYNTHETIC orders only. */
import { assessLaunchReadiness } from '../../../scripts/food/launch-readiness.mjs';
import { validateFoodPurchaseQuantity } from './cart-quote-domain';
import { strictObject, type TableCatalogEntry } from './table-catalog';
import { tableCommercialBlockers } from './table-order-preview';
import { freezeModel, instant, modelRef, type TableDeliveryRequest } from './table-scheduling';
import type { LocalTableOrderRepository } from './table-local-order-repository';
import type { createOfflineStripeTestAdapter } from './table-test-payment';
import { syntheticOrderConfirmation } from './table-checkout-confirmation';
import { modelFingerprint } from './table-capacity-model';

export const TABLE_COMMERCIAL_GATES = freezeModel({
  product: ['final recipe', 'ingredient and allergen disclosures', 'measured portions', 'quality testing', 'storage and reheating instructions'],
  operations: ['packaging and labels', 'applicable Texas requirements', 'food-handler requirements', 'cooling and freezing procedures', 'refrigeration and production capacity', 'pickup schedule and delivery rules'],
  finance: ['receipt-based costs', 'approved price', 'tax treatment', 'processing and fulfillment fees'],
  technology: ['payment authenticity', 'duplicate webhooks', 'durable orders', 'target-D1 concurrency', 'confirmation access', 'refunds and cancellation', 'production logging', 'security review'],
  authorization: ['explicit owner sales authorization', 'separate production deployment authorization']
});
export interface SyntheticSelection {
  id: string; key: string; productId: string; version: number; quantity: number;
  windowId: string; locationReference: string; now: string; delivery: TableDeliveryRequest | null;
}
export function createTableCheckoutService(repository: LocalTableOrderRepository, payment: ReturnType<typeof createOfflineStripeTestAdapter>) {
  if (payment.mode !== 'test' || payment.networkEnabled !== false) throw new TypeError('Explicit offline payment adapter required');
  async function eligibility(productId: string, version: number) {
    const source = await repository.authoritySnapshot(), product = source.catalog.find(p => p.product.id === productId);
    if (!product || product.product.version !== version) throw new TypeError('Unknown product or exact version mismatch');
    const review = source.launchReviews.map(assessLaunchReadiness).find(r => r.productId === productId && r.productVersion === version);
    const blockers = [...tableCommercialBlockers(product)];
    if (!product.approvedPrice || product.approvedPrice.money.minorUnits <= 0) blockers.push('Positive approved price required');
    if (review?.status !== 'PASS' || review.authorizationStatus !== 'PASS') blockers.push('Exact launch review and authorization evidence required');
    return {product, domainEligible: blockers.length === 0,
      simulatedTestEligible: source.mode === 'simulation-only' && source.fixtureLabel === 'SYNTHETIC' && productId.startsWith('food-product:synthetic-') && blockers.length === 0,
      commercialAuthorized: false as const, realPaymentVerified: false as const, fulfillmentAuthorized: false as const,
      blockers, requiredCommercialReviews: TABLE_COMMERCIAL_GATES};
  }
  function assertEligible(value: Awaited<ReturnType<typeof eligibility>>): TableCatalogEntry {
    if (!value.simulatedTestEligible) throw new TypeError(`Private synthetic selection blocked: ${value.blockers.join('; ') || 'Synthetic fixture identity required'}`);
    return value.product;
  }
  return Object.freeze({mode: 'private-offline-synthetic' as const, commercialAuthorized: false as const,
    eligibility,
    async select(input: SyntheticSelection) {
      strictObject(input, ['id','key','productId','version','quantity','windowId','locationReference','now','delivery']);
      if (!input.id.startsWith('synthetic-')) throw new TypeError('Synthetic order reference required');
      modelRef(input.key); instant(input.now); validateFoodPurchaseQuantity(input.version);
      const quantity = validateFoodPurchaseQuantity(input.quantity), product = assertEligible(await eligibility(input.productId, input.version));
      if (quantity > product.maxPerOrder! || quantity > product.remainingCapacity!) throw new TypeError('Product order limit or capacity exceeded');
      return repository.create(input.key, input.id, [{productId: input.productId, version: input.version, quantity}], input.windowId, input.locationReference, input.now, input.delivery);
    },
    async quote(id: string, key: string, version: number, now: string) {
      const order = await repository.get(id);
      for (const line of order.cart) assertEligible(await eligibility(line.productId, line.version));
      return repository.execute(id, key, version, {type: 'quote'}, now);
    },
    reserve: (id: string, key: string, version: number, now: string) => repository.checkout(id, key, version, now),
    async receiveWebhook(rawBody: string, signature: string, receivedAt: string) {
      let evidence;
      try {evidence = await payment.verify(rawBody, signature);} catch (error) {repository.recordDiagnostic('payment-evidence-rejected', 'webhook'); throw error;}
      return repository.reconcile(evidence, receivedAt);
    },
    async progress(id: string, key: string, version: number, stage: 'prepare' | 'ready' | 'dispatch' | 'fulfill' | 'cancel' | 'request-refund', now: string, evidenceReference?: string) {
      if (!['prepare','ready','dispatch','fulfill','cancel','request-refund'].includes(stage)) throw new TypeError('Unsupported owner transition');
      let guard: {authorityFingerprint: string} | undefined;
      if (stage === 'dispatch' || stage === 'fulfill') {
        const context = await repository.confirmationContext(id), source = await repository.authoritySnapshot();
        const currentWindow = source.windows.find(w => w.id === context.order.windowId);
        if (!context.window || !currentWindow || modelFingerprint(currentWindow) !== modelFingerprint(context.window)) throw new TypeError('Fulfillment schedule changed; owner reconciliation required');
        if (stage === 'fulfill' && (instant(now) < instant(context.window.startsAt) || instant(now) >= instant(context.window.endsAt))) throw new TypeError('Outside original confirmed handoff window');
        if (stage === 'dispatch' && context.order.quote?.authorityFingerprint !== modelFingerprint(source)) throw new TypeError('Delivery authority changed; owner reconciliation required');
        guard = {authorityFingerprint: modelFingerprint(source)};
      }
      return repository.execute(id, key, version, {type: stage, ...(evidenceReference ? {evidenceReference} : {})}, now, guard);
    },
    confirmation: async (id: string) => syntheticOrderConfirmation(await repository.confirmationContext(id)),
    operations: (costing?: unknown) => repository.operations(costing),
    async recover(key: string, now: string) {
      await repository.cleanup(`${key}/expiry`, now); await repository.retryPending(`${key}/pending`, now);
      const snapshot = await repository.snapshot();
      return freezeModel({provenance: 'SYNTHETIC', pending: snapshot.inbox.filter(i => (['pending-fulfillment','refund-required','refund-requested','refund-failed'].includes(i.outcome) || (i.evidence.kind.startsWith('refund') && i.outcome === 'pending-payment')) && snapshot.checkouts.some(c => c.intent.sessionId === i.evidence.checkout.sessionId && !c.refunded)).map(i => ({orderReference: `SIMULATION/${i.evidence.checkout.orderId}`, reason: i.outcome})), report: await repository.operations()});
    }
  });
}
