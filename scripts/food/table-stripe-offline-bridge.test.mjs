import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {assessOfflineStripeExpiry, prepareOfflineStripeCheckout, mockOfflineStripeSession, stripeTestConfigurationReadiness} from './table-stripe-offline-bridge.mjs';

const base = Object.freeze({
  provenance:'synthetic-stripe-test', account:'acct_synthetic_table',
  orderId:'synthetic-bridge', quoteId:'synthetic-bridge-q1',
  quoteFingerprint:'fingerprint123', productFingerprint:'product123',
  sessionId:'cs_test_synthetic_bridgeq1', paymentId:'pi_synthetic_bridgeq1',
  amount:2580, currency:'usd', expiresAt:'2026-10-21T14:45:00.000Z'
});
const config = Object.freeze({mode:'offline-synthetic-only', createdAt:'2026-10-21T14:00:00.000Z',
  successUrl:'http://127.0.0.1:4335/the-table/', cancelUrl:'http://127.0.0.1:4335/the-table/'});

test('45-minute held checkout is ready for OFFLINE CONTRACT verification only',()=>{
  const result=prepareOfflineStripeCheckout(base,config);
  assert.equal(result.status,'OFFLINE_CONTRACT_READY');
  assert.equal(result.params.mode,'payment'); assert.equal(result.params.expires_at,1792593900);
  assert.equal(result.params.client_reference_id,base.orderId);
  assert.equal(result.params.line_items[0].price_data.unit_amount,2580);
  assert.equal(result.canAuthorizePayment,false);assert.equal(result.networkEnabled,false);
});
test('short five-minute reservation is BLOCKED before session preparation',()=>{
  const result=prepareOfflineStripeCheckout({...base,expiresAt:'2026-10-21T14:05:00.000Z'},config);
  assert.equal(result.status,'BLOCKED'); assert.equal(result.params,null);
  assert.deepEqual(result.viability.blockers,['CHECKOUT_EXPIRY_UNDER_STRIPE_30_MINUTE_MINIMUM']);
  assert.throws(()=>mockOfflineStripeSession(result));
});
test('expiry over 24 hours is blocked',()=>{
  const result=assessOfflineStripeExpiry({...base,expiresAt:'2026-10-22T15:00:00.000Z'},config.createdAt);
  assert.equal(result.status,'BLOCKED');assert.match(result.blockers.join(','),/24_HOUR/);
});
test('exactly 30 minutes is a valid duration',()=>assert.equal(assessOfflineStripeExpiry({...base,expiresAt:'2026-10-21T14:30:00.000Z'},config.createdAt).status,'OFFLINE_CONTRACT_READY'));
test('expired and negative duration fail closed',()=>assert.equal(assessOfflineStripeExpiry({...base,expiresAt:'2026-10-21T13:59:00.000Z'},config.createdAt).status,'BLOCKED'));
test('offline session is unpaid, no hosted URL, no payment proof',()=>{
  const session=mockOfflineStripeSession(prepareOfflineStripeCheckout(base,config));
  assert.equal(session.url,null);assert.equal(session.payment_status,'unpaid');assert.equal(session.realPaymentVerified,false);
  assert.equal(session.amount_total,base.amount);assert.equal(session.id,base.sessionId);
});
for(const [label,patch] of [
  ['live-provenance',{provenance:'stripe-live'}],['live-account',{account:'acct_live_table'}],
  ['real-id',{orderId:'real-customer'}],['session-id',{sessionId:'cs_live_123'}],
  ['payment-id',{paymentId:'pi_live_123'}],['currency',{currency:'eur'}],
  ['negative',{amount:-1}],['float',{amount:1.5}],['zero',{amount:0}],
  ['overflow',{amount:Number.MAX_SAFE_INTEGER+1}],['extra-field',{customerEmail:'private@example.com'}]
])test(`reject checkout: ${label}`,()=>assert.throws(()=>prepareOfflineStripeCheckout({...base,...patch},config)));
for(const [label,patch] of [
  ['live-mode',{mode:'live'}],['bad-host',{successUrl:'https://evil.example/checkout'}],
  ['outbound',{successUrl:'http://127.0.0.1:9000/path'}],['wrong-created-date',{createdAt:'2026-10-21'}],
  ['extra-config',{secretKey:'should-not-enter-this-contract'}]
]) test(`reject config: ${label}`,()=>assert.throws(()=>prepareOfflineStripeCheckout(base,{...config,...patch})));
test('no secrets logged by config readiness',()=>{
  const state=stripeTestConfigurationReadiness({FOOD_STRIPE_TEST_SECRET_KEY:'sk_test_12345',FOOD_STRIPE_TEST_WEBHOOK_SECRET:'whsec_12345'});
  assert.equal(state.keyTestShape,true);assert.equal(state.publicCheckoutEnabled,false);
  assert.doesNotMatch(JSON.stringify(state),/sk_test_|whsec_/);
});
test('production key pattern cannot pass test shape',()=>{
  const state=stripeTestConfigurationReadiness({FOOD_STRIPE_TEST_SECRET_KEY:'sk_live_12345',FOOD_STRIPE_TEST_WEBHOOK_SECRET:''});
  assert.equal(state.keyTestShape,false);assert.equal(state.webhookSecretShape,false);
});
test('no network or Stripe client call in bridge source',async()=>{
  const source=await readFile(new URL('./table-stripe-offline-bridge.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(source,/\bfetch\s*\(|\bnew\s+Stripe\s*\(|\bcheckout\.sessions\.create\s*\(/);
});
