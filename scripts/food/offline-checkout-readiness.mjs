/** Private local-only readiness command. Never prints credentials. */
import {assessOfflineStripeExpiry, stripeTestConfigurationReadiness} from './table-stripe-offline-bridge.mjs';
const config=stripeTestConfigurationReadiness();
const now='2026-10-21T14:00:00.000Z';
const checkout={provenance:'synthetic-stripe-test',account:'acct_synthetic_table',
  orderId:'synthetic-readiness',quoteId:'synthetic-readiness-q1',quoteFingerprint:'abc123',productFingerprint:'abc456',
  sessionId:'cs_test_synthetic_readinessq1',paymentId:'pi_synthetic_readinessq1',
  amount:1500,currency:'usd',expiresAt:'2026-10-21T14:05:00.000Z'};
const shortHold=assessOfflineStripeExpiry(checkout,now);
console.log('FOOD-COMMERCE-006R / PRIVATE READINESS');
console.log(JSON.stringify({
  provenance:'LOCAL_OFFLINE_ONLY',
  testConfigurationShape:config,
  exampleFiveMinuteHold:shortHold,
  publicCheckoutEnabled:false,
  realStripeTestModeE2E:'UNVERIFIED',
  productionD1:'UNTOUCHED'
},null,2));
console.log('FINAL PASS — READINESS DIAGNOSTIC ONLY; NO PAYMENT AUTHORIZATION');
