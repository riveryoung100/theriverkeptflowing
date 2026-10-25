/** Offline signed-fixture boundary. Never imported by production endpoints. */
import Stripe from 'stripe';
import { requireStripeSandboxSecretKey } from '../commerce/stripe-sandbox-secret-key';
import { freezeModel, modelRef, instant } from './table-scheduling';
import { modelFingerprint } from './table-capacity-model';
import { strictObject } from './table-catalog';
import type { SimulationOrder } from './table-order-engine';

export interface TestCheckout {
  readonly provenance: 'synthetic-stripe-test'; readonly account: string; readonly orderId: string; readonly quoteId: string;
  readonly quoteFingerprint: string; readonly productFingerprint: string;
  readonly sessionId: string; readonly paymentId: string; readonly amount: number; readonly currency: 'usd'; readonly expiresAt: string;
}
export interface TestPaymentEvidence {
  readonly provenance: 'synthetic-stripe-test'; readonly account: string; readonly eventId: string;
  readonly kind: 'pending' | 'success' | 'failure' | 'expired' | 'refund' | 'refund-pending' | 'refund-failed'; readonly checkout: TestCheckout;
  readonly refundId?: string;
}
const recognized = new WeakSet<object>();
const verifiedBodies=new WeakMap<object,string>();
export function requireTestPaymentEvidence(value: TestPaymentEvidence,rawBody?:string): void {
  if (!value || !recognized.has(value)) throw new TypeError('Authenticated test-fixture evidence required; browser/engine proofs are not accepted');
  if(rawBody!==undefined&&verifiedBodies.get(value)!==modelFingerprint(rawBody))throw new TypeError('Signed evidence body mismatch');
}
export function mockTestCheckout(order: SimulationOrder, expiresAt: string): TestCheckout {
  if (order.mode !== 'simulation-only' || order.status !== 'awaiting-payment' || !order.quote) throw new TypeError('Held synthetic quote required');
  instant(expiresAt);
  return freezeModel({provenance: 'synthetic-stripe-test', account: 'acct_synthetic_table', orderId: order.id, quoteId: order.quote.id,
    quoteFingerprint: modelFingerprint(order.quote), productFingerprint: modelFingerprint(order.cart),
    sessionId: `cs_test_synthetic_${order.quote.id}`, paymentId: `pi_synthetic_${order.quote.id}`,
    amount: order.quote.assessment.amountDue.minorUnits, currency: 'usd', expiresAt});
}
export function createOfflineStripeTestAdapter(input: {mode: 'test'; fixturesOnly: true; secretKey: string; webhookSecret: string; account: string}) {
  strictObject(input, ['mode', 'fixturesOnly', 'secretKey', 'webhookSecret', 'account']);
  if (input.mode !== 'test' || input.fixturesOnly !== true) throw new TypeError('Explicit offline test configuration required');
  requireStripeSandboxSecretKey(input.secretKey);
  if (typeof input.webhookSecret !== 'string' || !input.webhookSecret.startsWith('whsec_') || input.webhookSecret.length <= 6) throw new TypeError('Webhook secret required');
  if (!/^acct_synthetic_[a-zA-Z0-9_-]+$/.test(input.account)) throw new TypeError('Synthetic account required');
  // No Stripe client/session API is constructed. Only the installed SDK verifier runs.
  const account = input.account, secret = input.webhookSecret;
  return Object.freeze({mode: 'test' as const, networkEnabled: false as const,
    async verify(rawBody: string, signature: string): Promise<TestPaymentEvidence> {
      const event = await Stripe.webhooks.constructEventAsync(rawBody, signature, secret);
      if (event.livemode !== false || event.account !== account) throw new TypeError('Test mode/account mismatch');
      modelRef(event.id);
      const object = event.data.object as unknown as Record<string, unknown>;
      const metadata = object.metadata as Record<string, unknown> | undefined;
      if (!metadata || metadata.fixture !== 'SYNTHETIC') throw new TypeError('Explicit synthetic metadata required');
      const ref = (key: string) => modelRef(metadata[key]);
      const refundKind = object.status === 'succeeded' ? 'refund' : object.object === 'refund' && ['pending','requires_action'].includes(String(object.status)) ? 'refund-pending' : object.object === 'refund' && ['failed','canceled'].includes(String(object.status)) ? 'refund-failed' : undefined;
      const kinds: Record<string, TestPaymentEvidence['kind'] | undefined> = {
        'checkout.session.completed': object.payment_status === 'paid' ? 'success' : 'pending',
        'checkout.session.async_payment_succeeded': 'success', 'checkout.session.async_payment_failed': 'failure',
        'checkout.session.expired': 'expired', 'refund.created': refundKind, 'refund.updated': refundKind,
        'refund.failed': refundKind === 'refund-failed' ? refundKind : undefined};
      const kind = Object.hasOwn(kinds, event.type) ? kinds[event.type] : undefined;
      if (!kind || (kind === 'success' && object.payment_status !== 'paid')) throw new TypeError('Unsupported payment state/event');
      const refundEvent = kind.startsWith('refund');
      const amount = refundEvent ? object.amount : object.amount_total;
      if (typeof amount !== 'number' || !Number.isSafeInteger(amount) || amount <= 0 || object.currency !== 'usd') throw new TypeError('Positive USD cents required');
      const sessionId = refundEvent ? ref('sessionId') : modelRef(object.id);
      const paymentId = object.payment_intent === null && (kind === 'pending' || kind === 'expired') ? ref('paymentId') : modelRef(object.payment_intent);
      if (!sessionId.startsWith('cs_test_synthetic_') || !paymentId.startsWith('pi_synthetic_')) throw new TypeError('Synthetic provider identifiers required');
      const expiresAt = ref('expiresAt'); instant(expiresAt);
      const checkout: TestCheckout = {provenance: 'synthetic-stripe-test', account, orderId: ref('orderId'), quoteId: ref('quoteId'),
        quoteFingerprint: ref('quoteFingerprint'), productFingerprint: ref('productFingerprint'), sessionId, paymentId, amount, currency: 'usd', expiresAt};
      const refundId = refundEvent && object.object === 'refund' ? modelRef(object.id) : undefined;
      if (refundId && !refundId.startsWith('re_synthetic_')) throw new TypeError('Synthetic refund identity required');
      const evidence = freezeModel({provenance: 'synthetic-stripe-test' as const, account, eventId: event.id, kind, checkout, ...(refundId ? {refundId} : {})});
      recognized.add(evidence);verifiedBodies.set(evidence,modelFingerprint(rawBody)); return evidence;
    }
  });
}
