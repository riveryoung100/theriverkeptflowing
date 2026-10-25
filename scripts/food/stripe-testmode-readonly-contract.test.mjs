import test from 'node:test';
import assert from 'node:assert/strict';
import {validateReadOnlyPlan,assessReadOnlyProviderObjects,createOfflineReadOnlyProbe,createOfflineReadOnlyFixtureTransport} from './stripe-testmode-readonly-contract.mjs';
const plan=()=>({sessionId:'cs_test_abcdefgh1234567890',paymentIntentId:'pi_abcdefgh1234567890',amountMinor:1380,currency:'usd',orderReference:'test-food-order-013',quoteFingerprint:'approved-fixture-q013',expectedExpiresAt:'2026-10-21T14:30:00.000Z',holdExpiresAt:'2026-10-21T14:40:00.000Z'});
const session=()=>({object:'checkout.session',id:plan().sessionId,livemode:false,mode:'payment',status:'complete',payment_status:'paid',payment_intent:plan().paymentIntentId,client_reference_id:plan().orderReference,metadata:{quoteFingerprint:plan().quoteFingerprint},amount_total:1380,currency:'usd',expires_at:Date.parse(plan().expectedExpiresAt)/1000});
const payment=()=>({object:'payment_intent',id:plan().paymentIntentId,livemode:false,status:'succeeded',amount:1380,amount_received:1380,currency:'usd',metadata:{quoteFingerprint:plan().quoteFingerprint}});
const check=(s=session(),p=payment(),req=plan())=>assessReadOnlyProviderObjects(req,s,p);
const offline=()=>createOfflineReadOnlyProbe(createOfflineReadOnlyFixtureTransport(session(),payment()));
test('all matching offline shapes remain review-only and cannot authorize food orders', async()=>{
 const r=check();assert.equal(r.classification,'MATCHED_TEST_STATUS_REVIEW_ONLY');for(const key of ['realStripeRetrieved','paymentAuthorized','orderAuthorized','liveCheckoutEnabled']) assert.equal(r[key],false);
 assert.equal((await offline().inspect(plan())).classification,r.classification);
});
for(const [name,mutate] of Object.entries({
  liveSession:s=>s.livemode=true, wrongSession:s=>s.id='cs_test_wrong123456789012', wrongSessionObject:s=>s.object='payment_intent', mode:s=>s.mode='subscription',
})) test(`reject session ${name}`,()=>{const s=session();mutate(s);assert.equal(check(s).classification,'SESSION_ID_OR_MODE_MISMATCH');});
for(const [name,mutate] of Object.entries({
  livePI:p=>p.livemode=true, wrongPI:p=>p.id='pi_wrong123456789012', wrongPIObject:p=>p.object='checkout.session',
})) test(`reject intent ${name}`,()=>{const p=payment();mutate(p);assert.equal(check(session(),p).classification,'PAYMENTINTENT_ID_OR_MODE_MISMATCH');});
for(const [name,mutate] of Object.entries({sessionAmount:s=>s.amount_total=1,currency:s=>s.currency='eur',piAmount:(_s,p)=>p.amount=1,piCurrency:(_s,p)=>p.currency='eur'})) test(`reject mismatched ${name}`,()=>{const s=session(),p=payment();mutate(s,p);assert.equal(check(s,p).classification,'AMOUNT_CURRENCY_MISMATCH');});
for(const [name,mutate] of Object.entries({ref:s=>s.client_reference_id='other',quote:s=>s.metadata.quoteFingerprint='other',piQuote:(_s,p)=>p.metadata.quoteFingerprint='other'})) test(`reject correlation ${name}`,()=>{const s=session(),p=payment();mutate(s,p);assert.equal(check(s,p).classification,'ORDER_QUOTE_CORRELATION_MISMATCH');});
test('reject Session/PaymentIntent reference mismatch',()=>{const s=session();s.payment_intent='pi_other123456789012';assert.equal(check(s).classification,'SESSION_PAYMENTINTENT_LINK_MISMATCH');});
test('reject Stripe Session expiration mismatch',()=>{const s=session();s.expires_at+=1;assert.equal(check(s).classification,'PROVIDER_EXPIRY_MISMATCH');});
for(const [name,s,p] of [['open',{status:'open'},{}],['unpaid',{payment_status:'unpaid'},{}],['processing',{}, {status:'processing'}]]) test(`classify ${name} as unsettled`,()=>{assert.equal(check({...session(),...s},{...payment(),...p}).classification,'UNPAID_OR_PROCESSING_REVIEW');});
test('unexpected PaymentIntent status never appears matched',()=>{const p=payment();p.status='requires_action';assert.equal(check(session(),p).classification,'UNRECOGNIZED_PAYMENT_STATE');});
for(const [name,change] of Object.entries({liveSessionId:{sessionId:'cs_live_abc123456789012345'},syntheticSessionId:{sessionId:'cs_test_synthetic_example00001'},shortSessionId:{sessionId:'cs_test_a'},liveKeyLeak:{sessionId:'sk_test_abc123456789012345'},zeroPrice:{amountMinor:0},wrongCurrency:{currency:'eur'},shortHold:{holdExpiresAt:'2026-10-21T14:32:00.000Z'},badTime:{expectedExpiresAt:'not-a-time'},missingOrder:{orderReference:''},unknown:{foo:'x'},wrongPI:{paymentIntentId:'pi_a'}}))test(`bad plan ${name} fails closed`,()=>{assert.throws(()=>validateReadOnlyPlan({...plan(),...change}));});
test('read-only reader refuses network enabled or nonoffline adapter',()=>{
 assert.throws(()=>createOfflineReadOnlyProbe({...createOfflineReadOnlyFixtureTransport(session(),payment()),networkEnabled:true}),/network-capable/);
 assert.throws(()=>createOfflineReadOnlyProbe({mode:'STRIPE_TEST',networkEnabled:false,retrieveSession:async()=>session(),retrievePaymentIntent:async()=>payment()}),/network-capable/);
});
test('offline probe does not read intent if Session is wrong',async()=>{
 let readIntent=false;const t={mode:'OFFLINE_FIXTURES_ONLY',networkEnabled:false,retrieveSession:async()=>({...session(),livemode:true}),retrievePaymentIntent:async()=>{readIntent=true;return payment();}};
 assert.equal((await createOfflineReadOnlyProbe(t).inspect(plan())).classification,'SESSION_ID_OR_MODE_MISMATCH');assert.equal(readIntent,false);
});
test('offline probe rejects missing Session without reading PaymentIntent',async()=>{
 let readIntent=false;const t={mode:'OFFLINE_FIXTURES_ONLY',networkEnabled:false,retrieveSession:async()=>null,retrievePaymentIntent:async()=>{readIntent=true;return payment();}};
 assert.equal((await createOfflineReadOnlyProbe(t).inspect(plan())).classification,'SESSION_ID_OR_MODE_MISMATCH');assert.equal(readIntent,false);
});
test('fixture reader returns copies and does not return raw provider details in verdict',async()=>{
 const t=createOfflineReadOnlyFixtureTransport(session(),payment());const s=await t.retrieveSession(plan().sessionId);s.amount_total=1;
 assert.equal((await t.retrieveSession(plan().sessionId)).amount_total,1380);
 assert.doesNotMatch(JSON.stringify(await createOfflineReadOnlyProbe(t).inspect(plan())),/client_secret|billing_details|email|cs_test|pi_/);
});
