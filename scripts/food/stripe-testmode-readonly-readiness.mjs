/** FOOD-013: PRIVATE, NO NETWORK readiness report. No raw key or ID output. */
import {createOfflineReadOnlyProbe,createOfflineReadOnlyFixtureTransport} from './stripe-testmode-readonly-contract.mjs';
const plan={sessionId:'cs_test_abcdefgh1234567890',paymentIntentId:'pi_abcdefgh1234567890',amountMinor:1380,currency:'usd',orderReference:'test-food-order-013',quoteFingerprint:'approved-fixture-q013',expectedExpiresAt:'2026-10-21T14:30:00.000Z',holdExpiresAt:'2026-10-21T14:40:00.000Z'};
const session={object:'checkout.session',id:plan.sessionId,livemode:false,mode:'payment',status:'open',payment_status:'unpaid',payment_intent:plan.paymentIntentId,client_reference_id:plan.orderReference,metadata:{quoteFingerprint:plan.quoteFingerprint},amount_total:plan.amountMinor,currency:'usd',expires_at:Date.parse(plan.expectedExpiresAt)/1000};
const pi={object:'payment_intent',id:plan.paymentIntentId,livemode:false,status:'requires_payment_method',amount:plan.amountMinor,amount_received:0,currency:'usd',metadata:{quoteFingerprint:plan.quoteFingerprint}};
const report=await createOfflineReadOnlyProbe(createOfflineReadOnlyFixtureTransport(session,pi)).inspect(plan);
const key=process.env.FOOD_STRIPE_TEST_READONLY_KEY || '';
console.log('FOOD-COMMERCE-013 - PRIVATE OFFLINE READINESS');
console.log(JSON.stringify({provenance:'OFFLINE_ONLY',offlineVerdict:report.classification,referenceConfigurationPresent:Boolean(process.env.FOOD_STRIPE_TEST_SESSION_ID),testSecretKeyShapeValid:/^sk_test_[A-Za-z0-9_]+$/.test(key),testSecretKeyConfigured:Boolean(key),sessionLookupPerformed:false,paymentIntentLookupPerformed:false,networkEnabled:false,realStripeRetrieved:false,paymentAuthorized:false,orderAuthorized:false,liveCheckoutEnabled:false},null,2));
console.log('FINAL PASS - OFFLINE READINESS ONLY / REAL STRIPE RETRIEVAL REQUIRES SEPARATE AUTHORIZATION');
