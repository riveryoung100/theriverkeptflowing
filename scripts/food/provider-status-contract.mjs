/** FOOD-011: synthetic/offline Stripe Checkout Session *shape* evaluation. No Stripe API access. */
import {createHash} from 'node:crypto';

export const OFFLINE_PROVIDER_MODE = 'OFFLINE_FIXTURE';
export function sha256(value) {return createHash('sha256').update(value).digest('hex');}
function canonicalUtc(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)) throw new TypeError('Canonical UTC required');
  const t=Date.parse(value);
  if (!Number.isFinite(t) || new Date(t).toISOString()!==value) throw new TypeError('Valid canonical UTC required');
  return t;
}
export function makeSyntheticProviderSession(intent, providerExpiresAt, overrides={}) {
  if (!intent || intent.provenance!=='synthetic-stripe-test' || !String(intent.sessionId).startsWith('cs_test_synthetic_')) throw new TypeError('Synthetic checkout required');
  if (!overrides || Object.getPrototypeOf(overrides)!==Object.prototype) throw new TypeError('Explicit plain fixture overrides required');
  const seconds=canonicalUtc(providerExpiresAt)/1000;
  if (!Number.isSafeInteger(seconds)) throw new TypeError('Provider expiry must be second aligned');
  return {
    fixtureProvenance:'OFFLINE_FIXTURE', accountContext:intent.account,
    session:{object:'checkout.session',id:intent.sessionId,livemode:false,
      status:'complete',payment_status:'paid',amount_total:intent.amount,currency:intent.currency,
      payment_intent:intent.paymentId,expires_at:seconds,client_reference_id:intent.orderId,
      metadata:{fixture:'SYNTHETIC',quoteId:intent.quoteId,quoteFingerprint:intent.quoteFingerprint,productFingerprint:intent.productFingerprint}},
    ...overrides
  };
}
export function createOfflineProviderStatusReader(records) {
  if (!records || Object.getPrototypeOf(records)!==Object.prototype) throw new TypeError('Plain offline fixture map required');
  const fixtures=new Map();
  for (const [key,val] of Object.entries(records)) {
    if (!/^cs_test_synthetic_[a-zA-Z0-9_-]+$/.test(key) || val===undefined) throw new TypeError('Synthetic session fixture key required');
    fixtures.set(key,structuredClone(val));
  }
  return Object.freeze({mode:OFFLINE_PROVIDER_MODE,networkEnabled:false,
    async read(sessionId) {
      if (!/^cs_test_synthetic_[a-zA-Z0-9_-]+$/.test(sessionId)) throw new TypeError('Synthetic session ID required');
      return fixtures.has(sessionId) ? structuredClone(fixtures.get(sessionId)) : null;
    }
  });
}
/** A snapshot is not proof of a payment. Every verdict remains review-only. */
export function assessOfflineProviderStatus(snapshot, intent, providerExpiresAt) {
  if (!intent || intent.provenance!=='synthetic-stripe-test' || !/^cs_test_synthetic_[a-zA-Z0-9_-]+$/.test(intent.sessionId)) throw new TypeError('Synthetic checkout required');
  const expectedExpiry=canonicalUtc(providerExpiresAt)/1000;
  const output=(kind)=>Object.freeze({kind,requiresManualReview:true,paymentAuthorized:false,realStripeStatusRetrieved:false,source:'OFFLINE_FIXTURE'});
  if (snapshot===null) return output('NO_OFFLINE_SNAPSHOT');
  if (!snapshot || typeof snapshot!=='object' || snapshot.fixtureProvenance!=='OFFLINE_FIXTURE' || snapshot.accountContext!==intent.account) return output('SNAPSHOT_CONFLICT');
  const s=snapshot.session;
  if (!s || s.object!=='checkout.session' || s.id!==intent.sessionId || s.livemode!==false ||
      s.amount_total!==intent.amount || s.currency!==intent.currency || s.payment_intent!==intent.paymentId ||
      s.expires_at!==expectedExpiry || s.client_reference_id!==intent.orderId ||
      s.metadata?.fixture!=='SYNTHETIC' || s.metadata?.quoteId!==intent.quoteId ||
      s.metadata?.quoteFingerprint!==intent.quoteFingerprint || s.metadata?.productFingerprint!==intent.productFingerprint) return output('SNAPSHOT_CONFLICT');
  if (s.status==='complete' && s.payment_status==='paid') return output('SYNTHETIC_PAID_MATCH_REVIEW');
  if ((s.status==='open' || s.status==='expired' || s.status==='complete') &&
      (s.payment_status==='unpaid' || s.payment_status==='no_payment_required')) return output('NOT_PAID_OR_UNSETTLED');
  return output('SNAPSHOT_CONFLICT');
}
export {canonicalUtc};
