/**
 * FOOD-COMMERCE-007 — private synthetic Stripe-vs-reservation policy probe.
 * No IO, no Stripe SDK client, no mutation, no checkout authorization.
 * A compatibility result is NOT a commercial or payment approval.
 */
import {prepareOfflineStripeCheckout} from './table-stripe-offline-bridge.mjs';

const MIN_CHECKOUT_SECONDS = 1800;
const MAX_CHECKOUT_SECONDS = 86400;
const MAX_GRACE_SECONDS = 3600;

function instant(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    throw new TypeError(`Invalid ${label}: exact UTC millisecond timestamp required`);
  }
  const result = Date.parse(value);
  if (!Number.isSafeInteger(result) || new Date(result).toISOString() !== value) {
    throw new TypeError(`Invalid ${label}`);
  }
  return result;
}
function positiveUnits(value, label, allowZero) {
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) throw new TypeError(`Invalid ${label}`);
  return value;
}
function exactShape(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join('|') !== keys.slice().sort().join('|')) {
    throw new TypeError(`Exact ${label} fields required`);
  }
}
function snapshot(value) {return Object.freeze(value);}

/**
 * Tests whether the CURRENT quote and hold already last long enough for the
 * PROPOSED offline Checkout Session expiry, with a post-expiry safety margin.
 * Never extends holds/quotes/offer windows, and NEVER enables a real checkout.
 */
export function assessSyntheticCheckoutHoldPolicy(checkout, config, policy) {
  exactShape(policy, [
    'provenance','createdAt','quoteExpiresAt','holdExpiresAt','offerCutoffAt',
    'fulfillmentStartsAt','sessionExpiresAt','safetyGraceSeconds',
    'requestedUnits','availableUnits'
  ], 'synthetic hold policy');
  if (policy.provenance !== 'SYNTHETIC' || typeof policy.createdAt !== 'string') throw new TypeError('Private synthetic policy required');
  if (!Number.isSafeInteger(policy.safetyGraceSeconds) || policy.safetyGraceSeconds < 0 || policy.safetyGraceSeconds > MAX_GRACE_SECONDS) {
    throw new TypeError('Invalid bounded safety grace');
  }
  positiveUnits(policy.requestedUnits, 'requested units', false);
  positiveUnits(policy.availableUnits, 'available units', true);
  exactShape(config, ['mode','createdAt','successUrl','cancelUrl'], 'offline config');
  if (config.mode !== 'offline-synthetic-only' || config.createdAt !== policy.createdAt || checkout.expiresAt !== policy.sessionExpiresAt) {
    throw new TypeError('Provider proposal and policy timestamps disagree');
  }
  // This bridge rejects test-mode duration outside the supported 30m–24h window.
  const provider = prepareOfflineStripeCheckout(checkout, config);
  const created = instant(policy.createdAt, 'creation');
  const quote = instant(policy.quoteExpiresAt, 'quote expiry');
  const hold = instant(policy.holdExpiresAt, 'capacity hold expiry');
  const cutoff = instant(policy.offerCutoffAt, 'sales cutoff');
  const handoff = instant(policy.fulfillmentStartsAt, 'fulfillment start');
  const session = instant(policy.sessionExpiresAt, 'proposed session expiry');
  const duration = Math.floor((session - created) / 1000);
  const graceMs = policy.safetyGraceSeconds * 1000;
  const issues = [];
  if (duration < MIN_CHECKOUT_SECONDS) issues.push('SESSION_UNDER_STRIPE_MINIMUM');
  if (duration > MAX_CHECKOUT_SECONDS) issues.push('SESSION_OVER_STRIPE_MAXIMUM');
  if (session <= created) issues.push('SESSION_ALREADY_EXPIRED');
  if (quote < session + graceMs) issues.push('QUOTE_TOO_SHORT_FOR_SESSION_AND_GRACE');
  if (hold < session + graceMs) issues.push('HOLD_TOO_SHORT_FOR_SESSION_AND_GRACE');
  if (cutoff < session + graceMs) issues.push('SALES_CUTOFF_BEFORE_SESSION_AND_GRACE');
  if (handoff <= session + graceMs) issues.push('FULFILLMENT_TOO_CLOSE_TO_SESSION');
  if (quote < created || hold < created || cutoff < created || handoff <= created) issues.push('AUTHORITY_ALREADY_EXPIRED');
  if (policy.availableUnits < policy.requestedUnits) issues.push('INSUFFICIENT_CAPACITY');
  if (provider.status !== 'OFFLINE_CONTRACT_READY') issues.push(...provider.viability.blockers);
  const blockers = snapshot([...new Set(issues)]);
  return snapshot({
    provenance: 'SYNTHETIC', stage: 'OFFLINE_POLICY_CHECK',
    status: blockers.length ? 'BLOCKED' : 'OFFLINE_POLICY_COMPATIBLE',
    blockers, safetyGraceSeconds: policy.safetyGraceSeconds,
    networkEnabled: false, commercialAuthorized: false,
    providerSessionCreated: false, realPaymentVerified: false,
    actualStripeTestModeE2E: false,
    proposedSessionDurationSeconds: duration,
    // Diagnostic only. Never return a payable Session from this policy check.
    providerContractStatus: provider.status
  });
}

/**
 * Triage a LATE synthetic event without treating its body as authenticated.
 * The existing signed-event reconciliation service remains the only verifier.
 */
export function classifyUnverifiedSyntheticPaymentTiming(policy, eventObservedAt) {
  if (!policy || policy.provenance !== 'SYNTHETIC') throw new TypeError('Synthetic policy required');
  const observed = instant(eventObservedAt, 'event observed');
  const session = instant(policy.sessionExpiresAt, 'session expiry');
  const hold = instant(policy.holdExpiresAt, 'hold expiry');
  const quote = instant(policy.quoteExpiresAt, 'quote expiry');
  const cutoff = instant(policy.offerCutoffAt, 'sales cutoff');
  return snapshot({
    provenance: 'SYNTHETIC_UNVERIFIED_EVENT',
    decision: observed >= Math.min(session, hold, quote, cutoff)
      ? 'HOLD_FOR_SIGNED_RECONCILIATION_OR_REFUND_REVIEW'
      : 'REQUIRES_EXISTING_SIGNATURE_AND_ORDER_RECONCILIATION',
    canAcceptPayment: false, authenticated: false, committedCapacity: false
  });
}
