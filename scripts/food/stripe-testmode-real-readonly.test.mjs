import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import {inspectExistingStripeTestSession as inspect,validateStripeTestSessionId as sessionId,
  validateStripeTestCredential as testKey,readOnlyFailureCode,createStripeTestReadClient} from './stripe-testmode-real-readonly-core.mjs';

const sid='cs_test_abcdeFGHIJ123456789';
const pi='pi_abcdefgh123456789012';
const session=()=>({id:sid,object:'checkout.session',livemode:false,mode:'payment',payment_intent:pi,
  status:'complete',payment_status:'paid',amount_total:1300,currency:'usd',created:1792607000,expires_at:1792609000,
  customer_details:{email:'private@example.com'},client_secret:'private_secret'});
const payment=()=>({id:pi,object:'payment_intent',livemode:false,status:'succeeded',created:1792607000,amount:1300,amount_received:1300,currency:'usd',
  client_secret:'pi_hidden_secret',billing_details:{email:'private@example.com'}});
function setup(s=session(),p=payment()) {
  const calls=[];
  const client={checkout:{sessions:{retrieve:async id=>{calls.push(['GET_SESSION',id]);return structuredClone(s);},
    create:()=>{throw Error('MUTATION forbidden');}}},paymentIntents:{retrieve:async id=>{calls.push(['GET_PI',id]);return structuredClone(p);},
    confirm:()=>{throw Error('MUTATION forbidden');}}};
  return {client,calls};
}

test('paid test Session and PaymentIntent: review-only, no customer data in output',async()=>{
  const {client,calls}=setup();const r=await inspect(sid,client);
  assert.equal(r.classification,'PAID_PROVIDER_PAIR_OBSERVED_REVIEW_ONLY');
  assert.equal(r.providerPairConsistent,true);
  assert.deepEqual(calls,[['GET_SESSION',sid],['GET_PI',pi]]);
  assert.equal(r.paymentAuthorized,false);assert.equal(r.orderAuthorized,false);assert.equal(r.localFoodOrderCorrelated,false);
  assert.doesNotMatch(JSON.stringify(r), /private@example|client_secret|billing_details|cs_test_|pi_abcdef/);
});
test('open/unpaid test Session is review only',async()=>{
  const s=session(),p=payment();s.status='open';s.payment_status='unpaid';p.status='requires_payment_method';p.amount_received=0;
  assert.equal((await inspect(sid,setup(s,p).client)).classification,'UNPAID_PROVIDER_PAIR_OBSERVED_REVIEW_ONLY');
});
for(const [name,patch] of Object.entries({live:{livemode:true},id:{id:'cs_test_WRONG09876543210'},object:{object:'charge'},mode:{mode:'subscription'}})) {
 test(`wrong session ${name} blocks second retrieval`,async()=>{const {client,calls}=setup({...session(),...patch});const r=await inspect(sid,client);
  assert.equal(r.classification,'INVALID_TEST_SESSION_RESPONSE');assert.equal(calls.length,1);});
}
for(const [name,patch] of Object.entries({live:{livemode:true},id:{id:'pi_wrong123456789012'},object:{object:'charge'}})){
 test(`wrong payment intent ${name} never counts as verified`,async()=>{const r=await inspect(sid,setup(session(),{...payment(),...patch}).client);
  assert.equal(r.classification,'INVALID_TEST_PAYMENTINTENT_RESPONSE');});
}
test('missing PI does not retrieve one or mark paid',async()=>{const s=session();s.payment_intent=null;
  const {client,calls}=setup(s);const r=await inspect(sid,client);assert.equal(r.classification,'SESSION_ONLY_NO_PAYMENT_INTENT');assert.equal(calls.length,1);});
test('wrong PI type never triggers second retrieval',async()=>{const s=session();s.payment_intent={id:pi};
  const {client,calls}=setup(s);assert.equal((await inspect(sid,client)).classification,'SESSION_ONLY_NO_PAYMENT_INTENT');assert.equal(calls.length,1);});
for(const [name,sp,pp] of [['session amount',{amount_total:1},{}],['PI amount',{}, {amount:1}],['currency',{currency:'eur'},{}],['PI currency',{}, {currency:'eur'}]]) {
  test(`provider mismatch: ${name}`,async()=>{assert.equal((await inspect(sid,setup({...session(),...sp},{...payment(),...pp}).client)).classification,'PROVIDER_AMOUNT_OR_CURRENCY_MISMATCH');});
}
test('conflicting payment statuses are review only',async()=>{const s=session();s.payment_status='unpaid';
 assert.equal((await inspect(sid,setup(s).client)).classification,'PROVIDER_PAYMENT_STATUS_NEEDS_REVIEW');});
test('no writes and no local order authorization in core',async()=>{const src=await readFile(new URL('./stripe-testmode-real-readonly-core.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(src,/\.create\s*\(|\.confirm\s*\(|\.capture\s*\(|\.refund\s*\(|\bfetch\s*\(/);});
test('CLI only uses Stripe retrieve operations, without public API imports',async()=>{
 const src=await readFile(new URL('./stripe-testmode-real-readonly-cli.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(src,/\.create\s*\(|\.confirm\s*\(|\.capture\s*\(|\.refund\s*\(|\bfetch\s*\(/);
 for(const path of ['../../src/pages/api/commerce/create-checkout.ts','../../src/pages/api/commerce/stripe-webhook.ts']){
  const url=new URL(path,import.meta.url); try {await access(url);} catch {continue;}
  const api=await readFile(url,'utf8'); assert.doesNotMatch(api,/stripe-testmode-real-readonly-/);
 }
});
test('reject live, synthetic, short and arbitrary Session IDs',()=>{
 for(const id of ['cs_live_abcdefghijklmnopqr','cs_test_synthetic_example123456789','cs_test_123','sk_test_abcdefghijklmnopqr','pi_abcdefgh123456789012'])assert.throws(()=>sessionId(id));
 assert.equal(sessionId(sid),sid);
});
test('key validator only permits test secrets and restricted test secrets',()=>{
 assert.equal(testKey('rk_test_abcdefghijklmnopqr'),'rk_test_abcdefghijklmnopqr');
 assert.equal(testKey('sk_test_abcdefghijklmnopqr'),'sk_test_abcdefghijklmnopqr');
 for(const id of ['sk_live_abcdefghijklmnopqr','rk_live_abcdefghijklmnopqr','pk_test_abcdefghijklmnopqr','whsec_abcdefghijklmnopqr','','blah'])assert.throws(()=>testKey(id));
});
test('errors classified without leaking Stripe messages',()=>{
 assert.equal(readOnlyFailureCode({statusCode:401,message:'secret'}),'AUTHENTICATION_REJECTED');
 assert.equal(readOnlyFailureCode({statusCode:403}),'READ_PERMISSION_DENIED');
 assert.equal(readOnlyFailureCode({statusCode:404}),'TEST_SESSION_NOT_FOUND_OR_WRONG_ACCOUNT');
 assert.equal(readOnlyFailureCode({statusCode:429}),'RATE_LIMITED');
 assert.equal(readOnlyFailureCode(new Error('sensitive')),'READ_FAILED_OR_NETWORK_UNAVAILABLE');
});

const expectation=()=>({amount:1300,currency:'usd',orderId:'local-order',quoteId:'quote-1',quoteFingerprint:'quote-sha',
 productFingerprint:'product-sha',paymentId:pi,providerExpiresAt:1792609000});
test('SDK reader exposes frozen retrieval capabilities pinned to the Session and its associated PI',async()=>{
 const reader=createStripeTestReadClient('rk_test_OFFLINE_CONSTRUCTION_ONLY_123456',sid);
 assert.deepEqual(Object.keys(reader.checkout.sessions),['retrieve']);
 assert.deepEqual(Object.keys(reader.paymentIntents),['retrieve']);assert.ok(Object.isFrozen(reader));
 assert.throws(()=>createStripeTestReadClient('sk_live_DO_NOT_USE_123456789',sid));
 await assert.rejects(reader.checkout.sessions.retrieve('cs_test_otherabcdefghijklmnop'),/Unexpected Session/);
 assert.throws(()=>reader.paymentIntents.retrieve(pi),/Associated PaymentIntent/);
});
function bound() {
 const e=expectation(),s=session(),p=payment();
 s.metadata=p.metadata=Object.fromEntries(['orderId','quoteId','quoteFingerprint','productFingerprint'].map(k=>[k,e[k]]));
 return {e,s,p};
}
test('injected provider cannot claim actual SDK provenance or order authority',async()=>{
 const {e,s,p}=bound();const result=await inspect(sid,setup(s,p).client,e);
 assert.equal(result.bindingStatus,'MATCHED_TEST_QUOTE_BINDING');assert.equal(result.trustLevel,2);
 assert.equal(result.provenance,'OFFLINE_ADAPTER_FIXTURE');assert.equal(result.orderAuthorized,false);
});
test('no expectations explicitly means insufficient order evidence',async()=>{
 assert.equal((await inspect(sid,setup().client)).bindingStatus,'INSUFFICIENT_EVIDENCE');
});
for(const key of ['orderId','quoteId','quoteFingerprint','productFingerprint']) {
 for(const missing of [true,false]) test(`${missing?'missing':'wrong'} binding metadata ${key}`,async()=>{
 const {e,s,p}=bound();p.metadata={...p.metadata};if(missing)delete p.metadata[key];else p.metadata[key]='wrong';
 const result=await inspect(sid,setup(s,p).client,e);
 assert.equal(result.bindingStatus,missing?'INSUFFICIENT_EVIDENCE':'ORDER_BINDING_MISMATCH');
 assert.equal(result.providerPairConsistent,false);assert.equal(result.paymentAuthorized,false);
 });
}
for(const [key,value,want] of [['amount',1400,'AMOUNT_MISMATCH'],['paymentId','pi_other123456789012','PAYMENT_INTENT_MISMATCH'],
 ['providerExpiresAt',1792609100,'EXPIRATION_CONFLICT']]) test(`expectation mismatch ${key}`,async()=>{
 const {e,s,p}=bound();e[key]=value;assert.equal((await inspect(sid,setup(s,p).client,e)).classification,want);
});
for(const patch of [{created:undefined},{created:-1},{expires_at:0},{expires_at:Infinity},{status:'unknown'},{payment_status:'unknown'}]) {
 test(`malformed Session rejects before PI read ${JSON.stringify(patch)}`,async()=>{
 const {client,calls}=setup({...session(),...patch});const result=await inspect(sid,client);
 assert.equal(result.classification,'INVALID_TEST_SESSION_RESPONSE');assert.equal(result.sessionRetrieved,false);assert.equal(calls.length,1);
 });
}
for(const patch of [{created:undefined},{status:'unknown'},{amount_received:-1}]) test(`malformed PI ${JSON.stringify(patch)}`,async()=>{
 assert.equal((await inspect(sid,setup(session(),{...payment(),...patch}).client)).classification,'INVALID_TEST_PAYMENTINTENT_RESPONSE');
});
for(const [status,want] of [[401,'AUTHENTICATION_REJECTED'],[403,'READ_PERMISSION_DENIED'],[404,'TEST_SESSION_NOT_FOUND_OR_WRONG_ACCOUNT'],[429,'RATE_LIMITED'],[503,'STRIPE_SERVICE_UNAVAILABLE'],[null,'READ_FAILED_OR_NETWORK_UNAVAILABLE']]) {
 test(`read failure ${status} never leaks provider message`,async()=>{
 const {client}=setup();client.checkout.sessions.retrieve=async()=>{throw {statusCode:status,message:'DO_NOT_PRINT'};};
 try {await inspect(sid,client);assert.fail('Expected rejection');}catch(e){assert.equal(readOnlyFailureCode(e),want);}
 const second=setup().client;second.paymentIntents.retrieve=async()=>{throw {statusCode:status,message:'DO_NOT_PRINT'};};
 const report=await inspect(sid,second);
 assert.equal(report.classification,status===404?'TEST_PAYMENT_INTENT_NOT_FOUND_OR_WRONG_ACCOUNT':want);
 assert.equal(report.sessionRetrieved,true);assert.equal(report.paymentIntentRetrieved,false);
 assert.doesNotMatch(JSON.stringify(report),/DO_NOT_PRINT/);
 });
}
