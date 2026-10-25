/** FOOD-013: Pure, non-authorizing validation for future real Stripe TEST-MODE reads.
 * The only transport in this phase is explicitly OFFLINE. NO Stripe SDK/client/network.
 */
import {canonicalUtc} from './provider-status-contract.mjs';
export const FOOD_013_MODE = 'OFFLINE_READONLY_TESTMODE_PREPARATION';
const sessionRe=/^cs_test_(?!synthetic_)[A-Za-z0-9]{16,160}$/;
const intentRe=/^pi_[A-Za-z0-9]{12,160}$/;
const referenceRe=/^[A-Za-z0-9][A-Za-z0-9:_-]{3,127}$/;
const plain=(v)=>v!==null && typeof v==='object' && (Object.getPrototypeOf(v)===Object.prototype || Object.getPrototypeOf(v)===null);
const secs=(v)=>canonicalUtc(v)/1000;
const fail=(code)=>Object.freeze({classification:code,source:FOOD_013_MODE,requiresReview:true,realStripeRetrieved:false,paymentAuthorized:false,orderAuthorized:false,liveCheckoutEnabled:false});

export function validateReadOnlyPlan(input) {
  if (!plain(input) || Object.keys(input).sort().join(',')!==['amountMinor','currency','expectedExpiresAt','holdExpiresAt','orderReference','paymentIntentId','quoteFingerprint','sessionId'].sort().join(',')) throw new TypeError('Exact explicit read-only plan fields required');
  if (!sessionRe.test(input.sessionId)) throw new TypeError('Actual test-mode Checkout Session ID shape required; synthetic or live IDs prohibited');
  if (!intentRe.test(input.paymentIntentId)) throw new TypeError('PaymentIntent ID shape required');
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0 || input.amountMinor > 100_000_000) throw new TypeError('Positive authoritative amount required');
  if (input.currency!=='usd') throw new TypeError('Explicit USD required for this first test boundary');
  if (!referenceRe.test(input.orderReference)||!referenceRe.test(input.quoteFingerprint)) throw new TypeError('Non-sensitive authoritative references required');
  const expiry=secs(input.expectedExpiresAt), hold=secs(input.holdExpiresAt);
  if (!Number.isInteger(expiry)||!Number.isInteger(hold)||hold-expiry<300) throw new TypeError('Required 5-minute reservation safety margin missing');
  return Object.freeze(structuredClone(input));
}

/** Normalizes test-mode Session + PaymentIntent only. Even a match is NOT proof for accepting an order. */
export function assessReadOnlyProviderObjects(plan, session, paymentIntent) {
  const p=validateReadOnlyPlan(plan);
  if (!plain(session) || session.object!=='checkout.session' || session.id!==p.sessionId || session.livemode!==false || session.mode!=='payment') return fail('SESSION_ID_OR_MODE_MISMATCH');
  if (!plain(paymentIntent) || paymentIntent.object!=='payment_intent' || paymentIntent.id!==p.paymentIntentId || paymentIntent.livemode!==false) return fail('PAYMENTINTENT_ID_OR_MODE_MISMATCH');
  if (session.payment_intent!==p.paymentIntentId) return fail('SESSION_PAYMENTINTENT_LINK_MISMATCH');
  if (session.client_reference_id!==p.orderReference || session.metadata?.quoteFingerprint!==p.quoteFingerprint || paymentIntent.metadata?.quoteFingerprint!==p.quoteFingerprint) return fail('ORDER_QUOTE_CORRELATION_MISMATCH');
  if (session.amount_total!==p.amountMinor || paymentIntent.amount!==p.amountMinor || session.currency!==p.currency || paymentIntent.currency!==p.currency) return fail('AMOUNT_CURRENCY_MISMATCH');
  if (session.expires_at!==secs(p.expectedExpiresAt)) return fail('PROVIDER_EXPIRY_MISMATCH');
  if (session.status==='complete' && session.payment_status==='paid' && paymentIntent.status==='succeeded' && paymentIntent.amount_received===p.amountMinor) return fail('MATCHED_TEST_STATUS_REVIEW_ONLY');
  if (session.payment_status==='unpaid' || session.status==='open' || paymentIntent.status==='processing') return fail('UNPAID_OR_PROCESSING_REVIEW');
  return fail('UNRECOGNIZED_PAYMENT_STATE');
}

/** Only accepts a reader that is intentionally offline. No customer data or raw provider objects returned. */
export function createOfflineReadOnlyProbe(transport) {
  if (!transport || transport.mode!=='OFFLINE_FIXTURES_ONLY' || transport.networkEnabled!==false || typeof transport.retrieveSession!=='function' || typeof transport.retrievePaymentIntent!=='function') throw new TypeError('Offline fixture transport required; network-capable transports prohibited');
  return Object.freeze({mode:FOOD_013_MODE,networkEnabled:false,paymentAuthorized:false,
    async inspect(plan) {
      const request=validateReadOnlyPlan(plan);
      const session=await transport.retrieveSession(request.sessionId);
      if (!plain(session) || session.id!==request.sessionId || session.livemode!==false) return fail('SESSION_ID_OR_MODE_MISMATCH');
      if (session.payment_intent!==request.paymentIntentId) return fail('SESSION_PAYMENTINTENT_LINK_MISMATCH');
      const paymentIntent=await transport.retrievePaymentIntent(request.paymentIntentId);
      return assessReadOnlyProviderObjects(request,session,paymentIntent);
    }
  });
}

export function createOfflineReadOnlyFixtureTransport(session,paymentIntent) {
  const s=structuredClone(session),p=structuredClone(paymentIntent);
  return Object.freeze({mode:'OFFLINE_FIXTURES_ONLY',networkEnabled:false,
    async retrieveSession(id) {return id===s?.id ? structuredClone(s) : null;},
    async retrievePaymentIntent(id) {return id===p?.id ? structuredClone(p) : null;}
  });
}
