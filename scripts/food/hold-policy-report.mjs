/** Local, illustrative-only policy diagnostic. No input secrets or payments. */
import {assessSyntheticCheckoutHoldPolicy, classifyUnverifiedSyntheticPaymentTiming} from './table-stripe-hold-policy.mjs';
const createdAt='2026-10-21T14:00:00.000Z';
const at=(min)=>new Date(Date.parse(createdAt)+min*60000).toISOString();
const checkout={provenance:'synthetic-stripe-test',account:'acct_synthetic_table',orderId:'synthetic-policy',quoteId:'synthetic-policy-q1',quoteFingerprint:'fingerprint123',productFingerprint:'product123',sessionId:'cs_test_synthetic_policyq1',paymentId:'pi_synthetic_policyq1',amount:2580,currency:'usd',expiresAt:at(30)};
const config={mode:'offline-synthetic-only',createdAt,successUrl:'http://127.0.0.1:4335/the-table/',cancelUrl:'http://127.0.0.1:4335/the-table/'};
const base={provenance:'SYNTHETIC',createdAt,quoteExpiresAt:at(40),holdExpiresAt:at(40),offerCutoffAt:at(40),fulfillmentStartsAt:at(60),sessionExpiresAt:at(30),safetyGraceSeconds:300,requestedUnits:2,availableUnits:3};
console.log('FOOD-COMMERCE-007 / PRIVATE SYNTHETIC POLICY REPORT');
for(const [label,patch] of [['CURRENT_SHORT_HOLD', {quoteExpiresAt:at(5),holdExpiresAt:at(5)}],['PROPOSED_LONGER_AUTHORIZED_WINDOWS_FOR_TESTING_ONLY',{}],['CAPACITY_EXHAUSTED',{availableUnits:1}]]){
 const result=assessSyntheticCheckoutHoldPolicy(checkout,config,{...base,...patch});
 console.log(JSON.stringify({label,...result},null,2));
}
console.log(JSON.stringify({label:'UNVERIFIED_LATE_EVENT',...classifyUnverifiedSyntheticPaymentTiming(base,at(31))},null,2));
console.log('CHECKOUT ACTIVATION: BLOCKED');
console.log('ACTUAL STRIPE TEST-MODE E2E: UNVERIFIED');
console.log('NO SOURCE AUTHORITY OR CAPACITY MODIFIED');
console.log('FINAL PASS — OFFLINE POLICY DIAGNOSTIC ONLY');
