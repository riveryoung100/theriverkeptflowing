/**
 * FOOD-COMMERCE-006R: PRIVATE, OFFLINE, SYNTHETIC-only Stripe Checkout contract.
 * No Stripe client, network transport, or production payment authority exists here.
 * This deliberately does NOT adapt synthetic receipts into real payment evidence.
 */
const MIN_SECONDS = 30 * 60;
const MAX_SECONDS = 24 * 60 * 60;

function ref(value, label, pattern) {
  if (typeof value !== 'string' || !pattern.test(value) || value.length > 250) {
    throw new TypeError(`Invalid synthetic ${label}`);
  }
  return value;
}

function timestamp(value, label) {
  if (typeof value !== 'string' || !/Z$/.test(value)) throw new TypeError(`Invalid UTC ${label}`);
  const n = Date.parse(value);
  if (!Number.isSafeInteger(n) || new Date(n).toISOString() !== value) {
    throw new TypeError(`Invalid UTC ${label}`);
  }
  return n;
}

function assertCheckout(checkout) {
  if (checkout === null || typeof checkout !== 'object' || Array.isArray(checkout)) throw new TypeError('Synthetic checkout required');
  const expected = ['account','amount','currency','expiresAt','orderId','paymentId','productFingerprint','provenance','quoteFingerprint','quoteId','sessionId'];
  if (Object.keys(checkout).sort().join('|') !== expected.sort().join('|')) throw new TypeError('Unexpected checkout fields');
  if (checkout.provenance !== 'synthetic-stripe-test' || checkout.currency !== 'usd') throw new TypeError('Synthetic USD contract required');
  ref(checkout.account, 'account', /^acct_synthetic_[a-zA-Z0-9_-]+$/);
  ref(checkout.orderId, 'order', /^synthetic-[a-z0-9-]+$/);
  ref(checkout.quoteId, 'quote', /^[a-zA-Z0-9_-]+$/);
  ref(checkout.sessionId, 'session', /^cs_test_synthetic_[a-zA-Z0-9_-]+$/);
  ref(checkout.paymentId, 'payment', /^pi_synthetic_[a-zA-Z0-9_-]+$/);
  ref(checkout.quoteFingerprint, 'quote fingerprint', /^[a-zA-Z0-9._:-]+$/);
  ref(checkout.productFingerprint, 'product fingerprint', /^[a-zA-Z0-9._:-]+$/);
  if (!Number.isSafeInteger(checkout.amount) || checkout.amount <= 0) throw new TypeError('Approved positive integer cents required');
  timestamp(checkout.expiresAt, 'expiry');
  return checkout;
}

export function assessOfflineStripeExpiry(checkout, createdAt) {
  assertCheckout(checkout);
  const createdMs = timestamp(createdAt, 'session creation');
  const expiryMs = timestamp(checkout.expiresAt, 'expiry');
  const durationSeconds = Math.floor((expiryMs - createdMs) / 1000);
  const blockers = [];
  if (durationSeconds < MIN_SECONDS) blockers.push('CHECKOUT_EXPIRY_UNDER_STRIPE_30_MINUTE_MINIMUM');
  if (durationSeconds > MAX_SECONDS) blockers.push('CHECKOUT_EXPIRY_OVER_STRIPE_24_HOUR_MAXIMUM');
  return Object.freeze({
    provenance: 'OFFLINE_SYNTHETIC',
    actualStripeTestModeE2E: false,
    durationSeconds,
    status: blockers.length ? 'BLOCKED' : 'OFFLINE_CONTRACT_READY',
    blockers: Object.freeze(blockers)
  });
}

function requireLocalUrl(url, label) {
  if (typeof url !== 'string' || url.length > 400) throw new TypeError(`Invalid ${label}`);
  let parsed;
  try {parsed = new URL(url);} catch {throw new TypeError(`Invalid ${label}`);}
  if (parsed.protocol !== 'http:' || parsed.hostname !== '127.0.0.1' || parsed.username || parsed.password || parsed.hash || parsed.port !== '4335') {
    throw new TypeError(`${label} must be an isolated local-preview URL`);
  }
  return url;
}

export function prepareOfflineStripeCheckout(checkout, config) {
  assertCheckout(checkout);
  if (config === null || typeof config !== 'object' || Array.isArray(config) || Object.keys(config).sort().join('|') !== 'cancelUrl|createdAt|mode|successUrl') {
    throw new TypeError('Exact offline configuration required');
  }
  if (config.mode !== 'offline-synthetic-only') throw new TypeError('Offline-only mode required');
  const viability = assessOfflineStripeExpiry(checkout, config.createdAt);
  const successUrl = requireLocalUrl(config.successUrl, 'success URL');
  const cancelUrl = requireLocalUrl(config.cancelUrl, 'cancel URL');
  if (viability.status !== 'OFFLINE_CONTRACT_READY') {
    return Object.freeze({status: 'BLOCKED', viability, params: null, providerSession: null,
      mode: 'offline-synthetic-only', networkEnabled: false, canAuthorizePayment: false});
  }
  const metadata = Object.freeze({
    fixture: 'SYNTHETIC', orderId: checkout.orderId, quoteId: checkout.quoteId,
    quoteFingerprint: checkout.quoteFingerprint, productFingerprint: checkout.productFingerprint,
    sessionId: checkout.sessionId, paymentId: checkout.paymentId, expiresAt: checkout.expiresAt
  });
  const params = Object.freeze({
    mode: 'payment', client_reference_id: checkout.orderId,
    expires_at: Math.floor(timestamp(checkout.expiresAt, 'expiry') / 1000),
    success_url: successUrl, cancel_url: cancelUrl, metadata,
    // Only one synthetic amount-to-pay line: actual product/tax/fee itemization is NOT ready.
    line_items: Object.freeze([Object.freeze({
      price_data: Object.freeze({currency: 'usd', unit_amount: checkout.amount,
        product_data: Object.freeze({name: 'SYNTHETIC — offline checkout total'})}),
      quantity: 1
    })])
  });
  return Object.freeze({status: 'OFFLINE_CONTRACT_READY', mode: 'offline-synthetic-only',
    networkEnabled: false, canAuthorizePayment: false, actualStripeTestModeE2E: false,
    viability, params, providerSession: null,
    authoritativeIntent: Object.freeze({...checkout})});
}

/** Creates a local record ONLY; deliberately does not expose any provider transport. */
export function mockOfflineStripeSession(prepared) {
  if (!prepared || prepared.status !== 'OFFLINE_CONTRACT_READY' || prepared.networkEnabled !== false || prepared.mode !== 'offline-synthetic-only') {
    throw new TypeError('Offline prepared checkout required');
  }
  if (!prepared.params || !prepared.authoritativeIntent) throw new TypeError('Incomplete offline contract');
  const intent = assertCheckout(prepared.authoritativeIntent);
  if (prepared.params.metadata.orderId !== intent.orderId || prepared.params.line_items[0].price_data.unit_amount !== intent.amount) {
    throw new TypeError('Prepared quote mismatch');
  }
  return Object.freeze({
    provenance: 'OFFLINE_SYNTHETIC', livemode: false, networkEnabled: false,
    id: intent.sessionId, object: 'checkout.session', status: 'open', payment_status: 'unpaid',
    amount_total: intent.amount, currency: intent.currency, client_reference_id: intent.orderId,
    payment_intent: null, url: null, // No Stripe-hosted redirect exists.
    expires_at: prepared.params.expires_at, metadata: prepared.params.metadata,
    realPaymentVerified: false, canAuthorizePayment: false
  });
}

/** Check environment readiness without printing or touching any key contents. */
export function stripeTestConfigurationReadiness(environment = process.env) {
  const key = environment.FOOD_STRIPE_TEST_SECRET_KEY;
  const hook = environment.FOOD_STRIPE_TEST_WEBHOOK_SECRET;
  const keyIsTestShape = typeof key === 'string' && /^sk_test_[A-Za-z0-9]+$/.test(key);
  const hookIsTestShape = typeof hook === 'string' && /^whsec_[A-Za-z0-9]+$/.test(hook);
  return Object.freeze({provenance: 'CONFIGURATION_SHAPE_ONLY',
    keyPresent: typeof key === 'string' && key.length > 0, webhookSecretPresent: typeof hook === 'string' && hook.length > 0,
    keyTestShape: keyIsTestShape, webhookSecretShape: hookIsTestShape,
    actualProviderAccountVerified: false, actualStripeTestModeE2E: false,
    publicCheckoutEnabled: false, networkEnabled: false});
}
