/** FOOD-014. Review-only retrieval of EXISTING Stripe TEST-mode records.
 * No mutation method is called. Never expose unfiltered provider objects.
 */
import { createHash } from 'node:crypto';
import Stripe from 'stripe';

const providerClients = new WeakSet();
const observationReceipts = new WeakMap();
/** Only this constructor can label observations as actual SDK reads. Import does no I/O. */
export function createStripeTestReadClient(key, sessionId) {
  const expectedSession = validateStripeTestSessionId(sessionId);
  const client = new Stripe(validateStripeTestCredential(key), {maxNetworkRetries: 1, timeout: 10000, telemetry: false});
  let associatedPaymentId = null;
  const reader = Object.freeze({
    checkout: Object.freeze({sessions: Object.freeze({retrieve: async id => {
      if (id !== expectedSession) throw new TypeError('Unexpected Session retrieval');
      associatedPaymentId = null;
      const session = await client.checkout.sessions.retrieve(id);
      if (session?.id === expectedSession && session.livemode === false && typeof session.payment_intent === 'string'
          && paymentIntentPattern.test(session.payment_intent)) associatedPaymentId = session.payment_intent;
      return session;
    }})}),
    paymentIntents: Object.freeze({retrieve: id => {
      if (!associatedPaymentId || id !== associatedPaymentId) throw new TypeError('Associated PaymentIntent retrieval only');
      return client.paymentIntents.retrieve(id);
    }})
  });
  providerClients.add(reader);
  return reader;
}

const sessionPattern = /^cs_test_(?!synthetic_)[A-Za-z0-9]{16,160}$/;
const paymentIntentPattern = /^pi_[A-Za-z0-9]{12,160}$/;
const sessionStates = new Set(['open','complete','expired']);
const paymentStates = new Set(['paid','unpaid','no_payment_required']);
const intentStates = new Set(['requires_payment_method','requires_confirmation','requires_action','processing','requires_capture','canceled','succeeded']);
const digest = v => createHash('sha256').update(v).digest('hex').slice(0,16);
const stringChoice = (v, allowed) => allowed.has(v) ? v : 'other';
const strictInteger = n => Number.isSafeInteger(n) && n >= 0;

export function validateStripeTestSessionId(id) {
  if (typeof id !== 'string' || !sessionPattern.test(id)) throw new TypeError('Existing non-synthetic cs_test_ Session ID required');
  return id;
}

export function validateStripeTestCredential(key) {
  // A dedicated rk_test_ key with only read permissions is preferable.
  if (typeof key !== 'string' || !/^(?:rk_test|sk_test)_[A-Za-z0-9_]{16,255}$/.test(key)) {
    throw new TypeError('Only a Stripe TEST secret or TEST restricted key is supported');
  }
  return key;
}

export function readOnlyFailureCode(error) {
  const status = error && typeof error === 'object' ? error.statusCode : null;
  if (status === 401) return 'AUTHENTICATION_REJECTED';
  if (status === 403) return 'READ_PERMISSION_DENIED';
  if (status === 404) return 'TEST_SESSION_NOT_FOUND_OR_WRONG_ACCOUNT';
  if (status === 429) return 'RATE_LIMITED';
  if (Number.isInteger(status) && status >= 500) return 'STRIPE_SERVICE_UNAVAILABLE';
  if (Number.isInteger(status) && status >= 400) return 'STRIPE_REQUEST_REJECTED';
  return 'READ_FAILED_OR_NETWORK_UNAVAILABLE';
}

const base = Object.freeze({
  provenance: 'ACTUAL_STRIPE_TEST_MODE_READ_ONLY',
  source: 'FOOD_COMMERCE_014',
  reviewOnly: true,
  realStripeTestModeE2E: false,
  localFoodOrderCorrelated: false,
  paymentAuthorized: false,
  orderAuthorized: false,
  publicCheckoutEnabled: false,
  productionD1Accessed: false,
  providerWritesRequested: false
});

async function inspectPair(sessionId, client, expected, capture) {
  const id = validateStripeTestSessionId(sessionId);
  if (!client || typeof client.checkout?.sessions?.retrieve !== 'function' || typeof client.paymentIntents?.retrieve !== 'function') {
    throw new TypeError('Reader requires Stripe Checkout Session and PaymentIntent retrieval');
  }
  if (expected !== null && (!expected || typeof expected !== 'object' || Array.isArray(expected)
      || Object.keys(expected).sort().join(',') !== 'amount,currency,orderId,paymentId,productFingerprint,providerExpiresAt,quoteFingerprint,quoteId'
      || !Number.isSafeInteger(expected.amount) || expected.amount <= 0 || expected.currency !== 'usd'
      || !paymentIntentPattern.test(expected.paymentId)
      || !['orderId','quoteId','quoteFingerprint','productFingerprint'].every(k => typeof expected[k] === 'string' && /^[A-Za-z0-9:_./-]{1,200}$/.test(expected[k]))
      || !Number.isSafeInteger(expected.providerExpiresAt))) throw new TypeError('Exact local expectation required');
  const common = { ...base, provenance: providerClients.has(client) ? base.provenance : 'OFFLINE_ADAPTER_FIXTURE',
    trustLevel: providerClients.has(client) ? 4 : 2, accountContext: 'UNVERIFIED',
    bindingStatus: 'INSUFFICIENT_EVIDENCE', sessionReferenceHash: digest(id) };
  // No customer/billing/payment method fields are copied out of SDK objects.
  const session = await client.checkout.sessions.retrieve(id);
  capture.session = session;
  if (!session || session.object !== 'checkout.session' || session.id !== id || session.livemode !== false || session.mode !== 'payment'
      || !sessionStates.has(session.status) || !paymentStates.has(session.payment_status)
      || !strictInteger(session.created) || !strictInteger(session.expires_at) || session.expires_at <= session.created
      || session.expires_at >= 253402300800) {
    return Object.freeze({ ...common, classification: 'INVALID_TEST_SESSION_RESPONSE', sessionRetrieved: false, paymentIntentRetrieved: false });
  }
  const sessionSummary = {
    sessionRetrieved: true,
    checkoutStatus: stringChoice(session.status, sessionStates),
    paymentStatus: stringChoice(session.payment_status, paymentStates),
    amountMinor: strictInteger(session.amount_total) ? session.amount_total : null,
    currency: session.currency === 'usd' ? 'usd' : 'other',
    providerExpiresAtUtc: strictInteger(session.expires_at) && session.expires_at < 253402300800 ? new Date(session.expires_at * 1000).toISOString() : null
  };
  const paymentId = session.payment_intent;
  if (typeof paymentId !== 'string' || !paymentIntentPattern.test(paymentId)) {
    return Object.freeze({ ...common, ...sessionSummary, classification: 'SESSION_ONLY_NO_PAYMENT_INTENT', paymentIntentRetrieved: false, providerPairConsistent: false });
  }
  let paymentIntent;
  try { paymentIntent = await client.paymentIntents.retrieve(paymentId); }
  catch (error) {
    return Object.freeze({ ...common, ...sessionSummary, paymentIntentRetrieved: false, providerPairConsistent: false,
      classification: error?.statusCode === 404 ? 'TEST_PAYMENT_INTENT_NOT_FOUND_OR_WRONG_ACCOUNT' : readOnlyFailureCode(error) });
  }
  capture.paymentIntent = paymentIntent;
  const intentSummary = { paymentIntentRetrieved: true, paymentIntentReferenceHash: digest(paymentId),
    intentStatus: stringChoice(paymentIntent?.status, intentStates),
    amountReceivedMinor: strictInteger(paymentIntent?.amount_received) ? paymentIntent.amount_received : null };
  if (!paymentIntent || paymentIntent.object !== 'payment_intent' || paymentIntent.id !== paymentId || paymentIntent.livemode !== false
      || !intentStates.has(paymentIntent.status) || !strictInteger(paymentIntent.created) || !strictInteger(paymentIntent.amount_received)) {
    return Object.freeze({ ...common, ...sessionSummary, ...intentSummary, paymentIntentRetrieved: false, classification: 'INVALID_TEST_PAYMENTINTENT_RESPONSE', providerPairConsistent: false });
  }
  if (!strictInteger(session.amount_total) || session.amount_total <= 0 || session.currency !== 'usd' || !strictInteger(paymentIntent.amount)
      || paymentIntent.amount !== session.amount_total || paymentIntent.currency !== session.currency) {
    return Object.freeze({ ...common, ...sessionSummary, ...intentSummary, classification: 'PROVIDER_AMOUNT_OR_CURRENCY_MISMATCH', providerPairConsistent: false });
  }
  if (expected) {
    let bindingStatus = 'MATCHED_TEST_QUOTE_BINDING';
    if (session.amount_total !== expected.amount) bindingStatus = 'AMOUNT_MISMATCH';
    else if (session.currency !== expected.currency) bindingStatus = 'CURRENCY_MISMATCH';
    else if (paymentId !== expected.paymentId) bindingStatus = 'PAYMENT_INTENT_MISMATCH';
    else if (session.expires_at !== expected.providerExpiresAt) bindingStatus = 'EXPIRATION_CONFLICT';
    else {
      for (const object of [session, paymentIntent]) {
        for (const key of ['orderId','quoteId','quoteFingerprint','productFingerprint']) {
          if (typeof object.metadata?.[key] !== 'string') {
            if (bindingStatus !== 'ORDER_BINDING_MISMATCH') bindingStatus = 'INSUFFICIENT_EVIDENCE';
          } else if (object.metadata[key] !== expected[key]) bindingStatus = 'ORDER_BINDING_MISMATCH';
        }
      }
      if (session.client_reference_id != null && session.client_reference_id !== expected.orderId) bindingStatus = 'ORDER_BINDING_MISMATCH';
    }
    common.bindingStatus = bindingStatus;
    // Even a match is review-only and cannot prove independent account ownership.
    if (bindingStatus !== 'MATCHED_TEST_QUOTE_BINDING') return Object.freeze({ ...common, ...sessionSummary, ...intentSummary,
      classification: bindingStatus, providerPairConsistent: false });
  }
  if (session.status === 'complete' && session.payment_status === 'paid' && paymentIntent.status === 'succeeded'
      && paymentIntent.amount_received === session.amount_total) {
    return Object.freeze({ ...common, ...sessionSummary, ...intentSummary, classification: 'PAID_PROVIDER_PAIR_OBSERVED_REVIEW_ONLY', providerPairConsistent: true });
  }
  if (session.status === 'open' && session.payment_status === 'unpaid' && paymentIntent.status !== 'succeeded') {
    return Object.freeze({ ...common, ...sessionSummary, ...intentSummary, classification: 'UNPAID_PROVIDER_PAIR_OBSERVED_REVIEW_ONLY', providerPairConsistent: true });
  }
  return Object.freeze({ ...common, ...sessionSummary, ...intentSummary, classification: 'PROVIDER_PAYMENT_STATUS_NEEDS_REVIEW', providerPairConsistent: false });
}

const safeReference = value => typeof value === 'string' && /^[A-Za-z0-9:_./-]{1,200}$/.test(value)
  && !/(?:sk|rk|pk)_(?:live|test)_|whsec_|_secret_/i.test(value) ? value : null;
const metadata = value => Object.fromEntries(['orderId','quoteId','quoteFingerprint','productFingerprint'].map(key=>[key,safeReference(value?.[key])]));
function projection(session, intent, source, account = null) {
  return Object.freeze({provider:'stripe',mode:'test',source,sessionId:session.id,
    paymentIntentId:typeof session.payment_intent==='string'&&/^pi_[A-Za-z0-9_-]{1,180}$/.test(session.payment_intent)?session.payment_intent:null,
    returnedPaymentIntentId:safeReference(intent?.id),intentCurrency:intent?.currency==='usd'?'usd':'other',
    sessionStatus:sessionStates.has(session.status)?session.status:null,
    paymentStatus:paymentStates.has(session.payment_status)?session.payment_status:null,
    intentStatus:intentStates.has(intent?.status)?intent.status:null,
    amount:Number.isSafeInteger(session.amount_total)?session.amount_total:null,
    currency:session.currency==='usd'?'usd':'other',
    intentAmount:Number.isSafeInteger(intent?.amount)?intent.amount:null,
    amountReceived:Number.isSafeInteger(intent?.amount_received)?intent.amount_received:null,
    sessionCreatedAt:strictInteger(session.created)?new Date(session.created*1000).toISOString():null,
    providerExpiresAt:strictInteger(session.expires_at)?new Date(session.expires_at*1000).toISOString():null,
    intentCreatedAt:strictInteger(intent?.created)&&intent.created<253402300800?new Date(intent.created*1000).toISOString():null,
    paymentTransitionAt:null,accountContext:safeReference(account),
    sessionMetadata:metadata(session.metadata),intentMetadata:metadata(intent?.metadata),
    clientReference:safeReference(session.client_reference_id)});
}
/** Receipt identity, not a caller-supplied provenance string, selects actual origin. */
export async function inspectExistingStripeTestSession(sessionId, client, expected = null) {
  const capture={};
  const report=await inspectPair(sessionId,client,expected,capture);
  if(report.sessionRetrieved) observationReceipts.set(report,Object.freeze({...projection(capture.session,
    report.paymentIntentRetrieved?capture.paymentIntent:null,
    providerClients.has(client)?'REAL_STRIPE_TEST_MODE_READ':'SYNTHETIC_FIXTURE'),comparisonResult:report.classification}));
  return report;
}
export function requireProviderObservation(receipt) {
  const saved=observationReceipts.get(receipt);
  if(!saved)throw new TypeError('Trusted observation receipt required; persisted labels are not proof');
  return structuredClone(saved);
}
/** Explicit offline reader. Never mints actual-provider provenance. */
export async function observeSyntheticProviderPair(intent,reader) {
  if(intent?.provenance!=='synthetic-stripe-test'||!/^cs_test_synthetic_[A-Za-z0-9_-]+$/.test(intent.sessionId)
      ||reader?.mode!=='OFFLINE_DUAL_STATUS'||reader.networkEnabled!==false)throw new TypeError('Offline synthetic reader required');
  const pair=await reader.retrievePair(intent.sessionId);
  if(!pair?.session||pair.fixtureProvenance!=='OFFLINE_DUAL_STATUS'||pair.session.livemode!==false||pair.paymentIntent?.livemode!==false
      ||pair.session.object!=='checkout.session'||pair.paymentIntent.object!=='payment_intent')throw new TypeError('Missing synthetic provider pair');
  const receipt=Object.freeze({reviewOnly:true,paymentAuthorized:false,orderAuthorized:false});
  observationReceipts.set(receipt,projection(pair.session,pair.paymentIntent,'SYNTHETIC_FIXTURE',pair.accountContext));
  return receipt;
}
