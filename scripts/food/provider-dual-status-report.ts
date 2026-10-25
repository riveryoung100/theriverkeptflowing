/** FOOD-012 operator-facing OFFLINE-ONLY diagnostic; no provider or DB connections. */
import {makeOfflineDualStatusPair,assessOfflineDualStatusPair,createOfflineDualStatusReader} from './provider-dual-status-contract.mjs';
const intent={provenance:'synthetic-stripe-test',account:'acct_synthetic_table',
  orderId:'synthetic-012-report',quoteId:'synthetic-012-quote',quoteFingerprint:'sample-q',productFingerprint:'sample-p',
  sessionId:'cs_test_synthetic_012report',paymentId:'pi_synthetic_012report',amount:1380,currency:'usd',
  expiresAt:'2026-10-21T14:40:00.000Z'};
const expiresAt='2026-10-21T14:30:00.000Z';
const fixture=makeOfflineDualStatusPair(intent,expiresAt);
const reader=createOfflineDualStatusReader({[intent.sessionId]:fixture});
const verdict=assessOfflineDualStatusPair(await reader.retrievePair(intent.sessionId),intent,expiresAt);
console.log('FOOD-COMMERCE-012 — PRIVATE OFFLINE PAIR REPORT');
console.log(JSON.stringify({environment:'LOCAL_OFFLINE_SYNTHETIC',verdict:verdict.kind,
  reviewRequired:true,paymentAuthorized:false,orderAuthorized:false,realStripeStatusRetrieved:false,
  checkoutEnabled:false,providerNetworkRequests:0,productionD1Access:false},null,2));
console.log('FINAL PASS — OFFLINE REHEARSAL ONLY; NOT PAYMENT EVIDENCE');
