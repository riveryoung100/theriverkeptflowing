/** Software fixtures, not provider-originated events or real credentials. */
import Stripe from 'stripe';
import { createOfflineStripeTestAdapter, type TestCheckout } from '../../src/lib/food/table-test-payment';
export const SYNTHETIC_STRIPE_CONFIG = Object.freeze({mode: 'test' as const, fixturesOnly: true as const,
  secretKey: 'sk_test_SYNTHETIC_OFFLINE_ONLY', webhookSecret: 'whsec_SYNTHETIC_OFFLINE_ONLY', account: 'acct_synthetic_table'});
export function syntheticWebhook(checkout: TestCheckout, type = 'checkout.session.completed', id = 'evt_synthetic_success', patch: Record<string, unknown> = {}) {
  const fields = Object.fromEntries(Object.entries(checkout).filter(([key]) => key !== 'account' && key !== 'provenance'));
  return JSON.stringify({id, object: 'event', livemode: false, account: checkout.account, type,
    data: {object: {id: checkout.sessionId, payment_intent: checkout.paymentId, amount_total: checkout.amount,
      amount: checkout.amount, currency: checkout.currency, payment_status: 'paid', status: 'succeeded',
      metadata: {...Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, String(value)])), fixture: 'SYNTHETIC'}, ...patch}}});
}
export async function signedFixture(rawBody: string, timestamp?: number) {
  return {rawBody, signature: await Stripe.webhooks.generateTestHeaderStringAsync({payload: rawBody, secret: SYNTHETIC_STRIPE_CONFIG.webhookSecret, ...(timestamp === undefined ? {} : {timestamp})})};
}
export async function authenticatedFixture(checkout: TestCheckout, type = 'checkout.session.completed', id = 'evt_synthetic_success', patch: Record<string, unknown> = {}) {
  const {rawBody, signature} = await signedFixture(syntheticWebhook(checkout, type, id, patch));
  return createOfflineStripeTestAdapter(SYNTHETIC_STRIPE_CONFIG).verify(rawBody, signature);
}
/** Stripe-shaped objects for 005; legacy fixtures above retain stable receipt identities. */
export function realisticSyntheticWebhook(checkout: TestCheckout, type = 'checkout.session.completed', id = 'evt_synthetic_success', patch: Record<string, unknown> = {}) {
  const legacy = JSON.parse(syntheticWebhook(checkout, type, id)) as {data: {object: Record<string, unknown>}; created?: number};
  const refund = type.startsWith('refund.'), pending = patch.payment_status === 'unpaid';
  legacy.created = Math.floor(Date.parse('2026-10-21T14:00:00.000Z') / 1000);
  const source = legacy.data.object;
  legacy.data.object = refund ? {id: `re_synthetic_${checkout.quoteId}`, object: 'refund', amount: checkout.amount, currency: checkout.currency,
    payment_intent: checkout.paymentId, status: type === 'refund.created' ? 'pending' : type === 'refund.failed' ? 'failed' : 'succeeded', metadata: source.metadata, ...patch}
    : {id: checkout.sessionId, object: 'checkout.session', amount_total: checkout.amount, currency: checkout.currency,
      payment_intent: (pending && type === 'checkout.session.completed') || type === 'checkout.session.expired' ? null : checkout.paymentId,
      payment_status: pending || type === 'checkout.session.expired' ? 'unpaid' : 'paid',
      status: type === 'checkout.session.expired' ? 'expired' : 'complete', expires_at: Math.floor(Date.parse(checkout.expiresAt) / 1000), metadata: source.metadata, ...patch};
  return JSON.stringify(legacy);
}
