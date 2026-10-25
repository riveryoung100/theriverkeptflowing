import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import {assessSyntheticCheckoutHoldPolicy, classifyUnverifiedSyntheticPaymentTiming} from './table-stripe-hold-policy.mjs';

const createdAt='2026-10-21T14:00:00.000Z';
const iso=(minutes)=>new Date(Date.parse(createdAt)+minutes*60000).toISOString();
const checkout = Object.freeze({
 provenance:'synthetic-stripe-test',account:'acct_synthetic_table',
 orderId:'synthetic-policy',quoteId:'synthetic-policy-q1',
 quoteFingerprint:'fingerprint123',productFingerprint:'product123',
 sessionId:'cs_test_synthetic_policyq1',paymentId:'pi_synthetic_policyq1',
 amount:2580,currency:'usd',expiresAt:iso(30)
});
const config={mode:'offline-synthetic-only',createdAt,
 successUrl:'http://127.0.0.1:4335/the-table/',cancelUrl:'http://127.0.0.1:4335/the-table/'};
const policy={provenance:'SYNTHETIC',createdAt,quoteExpiresAt:iso(40),
 holdExpiresAt:iso(40),offerCutoffAt:iso(40),fulfillmentStartsAt:iso(60),
 sessionExpiresAt:iso(30),safetyGraceSeconds:300,requestedUnits:2,availableUnits:3};
const check=(patch={},sessionPatch={})=>assessSyntheticCheckoutHoldPolicy({...checkout,...sessionPatch},config,{...policy,...patch});

test('30-minute session and existing 40-minute hold with five-minute grace pass OFFLINE ONLY',()=>{
 const r=check();assert.equal(r.status,'OFFLINE_POLICY_COMPATIBLE');assert.equal(r.providerContractStatus,'OFFLINE_CONTRACT_READY');
 assert.equal(r.networkEnabled,false);assert.equal(r.commercialAuthorized,false);assert.equal(r.realPaymentVerified,false);
});
test('5-minute real hold is BLOCKED rather than silently extended',()=>assert.deepEqual(check({holdExpiresAt:iso(5)}).blockers,['HOLD_TOO_SHORT_FOR_SESSION_AND_GRACE']));
test('5-minute quote blocks even with a long held reservation',()=>assert.ok(check({quoteExpiresAt:iso(5)}).blockers.includes('QUOTE_TOO_SHORT_FOR_SESSION_AND_GRACE')));
test('short offer cutoff blocks session',()=>assert.ok(check({offerCutoffAt:iso(15)}).blockers.includes('SALES_CUTOFF_BEFORE_SESSION_AND_GRACE')));
test('handoff must not start during checkout buffer',()=>assert.ok(check({fulfillmentStartsAt:iso(35)}).blockers.includes('FULFILLMENT_TOO_CLOSE_TO_SESSION')));
test('insufficient servings block without changing capacity',()=>assert.ok(check({availableUnits:1}).blockers.includes('INSUFFICIENT_CAPACITY')));
test('exact boundary at expiry+grace is allowed for hold and cutoff',()=>assert.equal(check({holdExpiresAt:iso(35),offerCutoffAt:iso(35),quoteExpiresAt:iso(35)}).status,'OFFLINE_POLICY_COMPATIBLE'));
test('zero grace is allowed but is not business approval',()=>{const r=check({safetyGraceSeconds:0,holdExpiresAt:iso(30)});assert.equal(r.status,'OFFLINE_POLICY_COMPATIBLE');assert.equal(r.commercialAuthorized,false)});
test('29 minute session blocked by Stripe and policy',()=>{const r=check({sessionExpiresAt:iso(29)},{expiresAt:iso(29)});assert.ok(r.blockers.includes('SESSION_UNDER_STRIPE_MINIMUM'));});
test('more than 24 hours session blocked',()=>{const r=check({sessionExpiresAt:iso(24*60+1),quoteExpiresAt:iso(25*60),holdExpiresAt:iso(25*60),offerCutoffAt:iso(25*60),fulfillmentStartsAt:iso(26*60)},{expiresAt:iso(24*60+1)});assert.ok(r.blockers.includes('SESSION_OVER_STRIPE_MAXIMUM'));});
test('wrong session expiry binding is rejected',()=>assert.throws(()=>assessSyntheticCheckoutHoldPolicy(checkout,config,{...policy,sessionExpiresAt:iso(40)}),/disagree/));
test('wrong createdAt binding is rejected',()=>assert.throws(()=>assessSyntheticCheckoutHoldPolicy(checkout,config,{...policy,createdAt:iso(1)}),/disagree/));
test('unknown policy fields blocked before use',()=>assert.throws(()=>check({override:true}),/Exact/));
test('missing policy fields blocked before use',()=>{const p={...policy};delete p.availableUnits;assert.throws(()=>assessSyntheticCheckoutHoldPolicy(checkout,config,p),/Exact/);});
test('invalid quantities blocked',()=>{for(const units of [0,-1,0.5,Infinity,'2']) assert.throws(()=>check({requestedUnits:units}),/Invalid/);});
test('availableUnits can be zero, but remains blocked',()=>assert.ok(check({availableUnits:0}).blockers.includes('INSUFFICIENT_CAPACITY')));
test('negative and oversized grace rejected',()=>{for(const safetyGraceSeconds of [-1,3601,2.5]) assert.throws(()=>check({safetyGraceSeconds}),/Invalid/);});
test('invalid date or timezone and rollover rejected',()=>{for(const dt of ['tomorrow','2026-10-21T14:40:00Z','2026-10-21T14:40:00-05:00','2026-02-30T14:40:00.000Z']) assert.throws(()=>check({holdExpiresAt:dt}),/Invalid/);});
test('already expired authority must block',()=>assert.ok(check({holdExpiresAt:iso(-1)}).blockers.includes('AUTHORITY_ALREADY_EXPIRED')));
test('late unsigned payment is only review, never accepted',()=>{const result=classifyUnverifiedSyntheticPaymentTiming(policy,iso(31));assert.equal(result.canAcceptPayment,false);assert.equal(result.authenticated,false);assert.match(result.decision,/REVIEW/);});
test('early unsigned payment still requires signed event verification',()=>{const r=classifyUnverifiedSyntheticPaymentTiming(policy,iso(1));assert.equal(r.decision,'REQUIRES_EXISTING_SIGNATURE_AND_ORDER_RECONCILIATION');assert.equal(r.canAcceptPayment,false);});
test('event at cutoff boundary is never self-authorized',()=>{const r=classifyUnverifiedSyntheticPaymentTiming(policy,iso(40));assert.equal(r.canAcceptPayment,false);});
test('readiness check never makes actual Stripe requests or creates session',async()=>{const text=await readFile(new URL('./table-stripe-hold-policy.mjs',import.meta.url),'utf8');assert.doesNotMatch(text,/new Stripe\s*\(|\bfetch\s*\(|\.sessions\.create\s*\(/);});
test('actual storefront checkout modules cannot import this private tool',async(t)=>{const paths=['../../src/pages/api/commerce/create-checkout.ts','../../src/pages/api/commerce/stripe-webhook.ts'];for(const path of paths){try{await access(new URL(path,import.meta.url));}catch{t.skip('Repository API routes not mounted in standalone authoring sandbox');return;}}for(const path of paths){const text=await readFile(new URL(path,import.meta.url),'utf8');assert.doesNotMatch(text,/table-stripe-hold-policy|table-stripe-offline-bridge/);}});
