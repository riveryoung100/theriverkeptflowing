/** FOOD-012: OFFLINE-ONLY Checkout Session + PaymentIntent status cross-check.
 * Shapes model Stripe fields. This is NOT provider retrieval or payment authority.
 */
import {canonicalUtc} from './provider-status-contract.mjs';

export const DUAL_STATUS_FIXTURE_MODE = 'OFFLINE_DUAL_STATUS';
const isPlain = value => value !== null && typeof value === 'object' &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const syntheticId = /^cs_test_synthetic_[A-Za-z0-9_-]+$/;

function requireIntent(intent) {
  if (!intent || intent.provenance !== 'synthetic-stripe-test' || !syntheticId.test(intent.sessionId) ||
      !/^pi_synthetic_[A-Za-z0-9_-]+$/.test(intent.paymentId) ||
      intent.currency !== 'usd' || !Number.isSafeInteger(intent.amount) || intent.amount <= 0 ||
      typeof intent.account !== 'string' || !/^acct_synthetic_[A-Za-z0-9_-]+$/.test(intent.account))
    throw new TypeError('SYNTHETIC checkout intent required');
  canonicalUtc(intent.expiresAt);
}

export function makeOfflineDualStatusPair(intent, providerExpiresAt, overrides = {}) {
  requireIntent(intent);
  if (!isPlain(overrides) || Object.keys(overrides).some(k => !['session','paymentIntent','accountContext'].includes(k)))
    throw new TypeError('Fixture override fields restricted');
  const millis=canonicalUtc(providerExpiresAt);
  if (!Number.isSafeInteger(millis / 1000)) throw new TypeError('Provider expiry must be second aligned');
  const metadata={fixture:'SYNTHETIC',orderId:intent.orderId,quoteId:intent.quoteId,
    quoteFingerprint:intent.quoteFingerprint,productFingerprint:intent.productFingerprint};
  const session={object:'checkout.session',id:intent.sessionId,livemode:false,
    status:'complete',payment_status:'paid',amount_total:intent.amount,currency:intent.currency,
    payment_intent:intent.paymentId,expires_at:millis/1000,client_reference_id:intent.orderId,
    metadata, ...overrides.session};
  const paymentIntent={object:'payment_intent',id:intent.paymentId,livemode:false,
    status:'succeeded',amount:intent.amount,amount_received:intent.amount,currency:intent.currency,
    metadata, ...overrides.paymentIntent};
  return structuredClone({fixtureProvenance:DUAL_STATUS_FIXTURE_MODE,
    accountContext:overrides.accountContext ?? intent.account,session,paymentIntent});
}

export function createOfflineDualStatusReader(records) {
  if (!isPlain(records)) throw new TypeError('Plain synthetic fixture map required');
  const data=new Map();
  for(const [id,pair] of Object.entries(records)) {
    if (!syntheticId.test(id) || !isPlain(pair)) throw new TypeError('Synthetic Session key/pair required');
    data.set(id,structuredClone(pair));
  }
  return Object.freeze({mode:DUAL_STATUS_FIXTURE_MODE,networkEnabled:false,
    async retrievePair(sessionId) {
      if (!syntheticId.test(sessionId)) throw new TypeError('Synthetic Session ID required');
      return data.has(sessionId) ? structuredClone(data.get(sessionId)) : null;
    }});
}

/** Always returns a review verdict, never proof of a real Stripe payment. */
export function assessOfflineDualStatusPair(pair, intent, providerExpiresAt) {
  requireIntent(intent);
  const seconds=canonicalUtc(providerExpiresAt)/1000;
  const result=kind=>Object.freeze({kind,provenance:DUAL_STATUS_FIXTURE_MODE,
    paymentAuthorized:false,orderAuthorized:false,reviewRequired:true,realStripeRetrieved:false});
  if (pair===null) return result('PAIR_NOT_FOUND');
  if (!isPlain(pair) || pair.fixtureProvenance!==DUAL_STATUS_FIXTURE_MODE || pair.accountContext!==intent.account)
    return result('DUAL_STATUS_CONFLICT');
  const s=pair.session,p=pair.paymentIntent;
  const meta=m=>isPlain(m) && m.fixture==='SYNTHETIC' && m.orderId===intent.orderId &&
    m.quoteId===intent.quoteId && m.quoteFingerprint===intent.quoteFingerprint &&
    m.productFingerprint===intent.productFingerprint;
  if (!isPlain(s) || s.object!=='checkout.session' || s.id!==intent.sessionId || s.livemode!==false ||
      s.amount_total!==intent.amount || s.currency!==intent.currency || s.payment_intent!==intent.paymentId ||
      s.expires_at!==seconds || s.client_reference_id!==intent.orderId || !meta(s.metadata))
    return result('DUAL_STATUS_CONFLICT');
  if (!isPlain(p) || p.object!=='payment_intent' || p.id!==intent.paymentId || p.livemode!==false ||
      p.amount!==intent.amount || p.currency!==intent.currency || !meta(p.metadata))
    return result('DUAL_STATUS_CONFLICT');
  if (s.status==='complete' && s.payment_status==='paid') {
    if (p.status==='succeeded' && p.amount_received===intent.amount)
      return result('SYNTHETIC_DUAL_PAID_MATCH_REVIEW');
    return result('DUAL_STATUS_CONFLICT');
  }
  if (['open','complete','expired'].includes(s.status) &&
      ['unpaid','no_payment_required'].includes(s.payment_status) &&
      ['requires_payment_method','requires_confirmation','requires_action','processing','canceled'].includes(p.status) &&
      p.amount_received===0)
    return result('UNPAID_OR_UNSETTLED_REVIEW');
  return result('DUAL_STATUS_CONFLICT');
}
