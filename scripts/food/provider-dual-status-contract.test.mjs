import test from 'node:test';
import assert from 'node:assert/strict';
import {makeOfflineDualStatusPair,createOfflineDualStatusReader,assessOfflineDualStatusPair} from './provider-dual-status-contract.mjs';

const intent=Object.freeze({provenance:'synthetic-stripe-test',account:'acct_synthetic_table',
  orderId:'synthetic-012',quoteId:'quote_012',quoteFingerprint:'qfinger',productFingerprint:'pfinger',
  sessionId:'cs_test_synthetic_012',paymentId:'pi_synthetic_012',amount:1380,currency:'usd',
  expiresAt:'2026-10-21T14:40:00.000Z'});
const providerExpiry='2026-10-21T14:30:00.000Z';
const fixture=()=>makeOfflineDualStatusPair(intent,providerExpiry);
const assess=x=>assessOfflineDualStatusPair(x,intent,providerExpiry);
test('identical synthetic Session and PaymentIntent is review-only',()=>{
  const r=assess(fixture());
  assert.equal(r.kind,'SYNTHETIC_DUAL_PAID_MATCH_REVIEW');
  assert.equal(r.paymentAuthorized,false);
  assert.equal(r.orderAuthorized,false);
  assert.equal(r.realStripeRetrieved,false);
  assert.equal(r.reviewRequired,true);
});
for(const [name,patch] of Object.entries({
  wrongAccount:x=>x.accountContext='acct_synthetic_wrong',
  liveSession:x=>x.session.livemode=true,
  liveIntent:x=>x.paymentIntent.livemode=true,
  wrongSession:x=>x.session.id='cs_test_synthetic_other',
  wrongPaymentId:x=>x.paymentIntent.id='pi_synthetic_other',
  changedSessionPayment:x=>x.session.payment_intent='pi_synthetic_other',
  changedAmount:x=>x.session.amount_total=1,
  changedPIAmount:x=>x.paymentIntent.amount=1,
  wrongCurrency:x=>x.paymentIntent.currency='eur',
  wrongExpiry:x=>x.session.expires_at-=60,
  wrongOrder:x=>x.session.client_reference_id='synthetic_other',
  wrongQuote:x=>x.session.metadata.quoteFingerprint='wrong',
  wrongProduct:x=>x.paymentIntent.metadata.productFingerprint='wrong',
  missingFixture:x=>delete x.paymentIntent.metadata.fixture,
  noPaymentReceipt:x=>x.paymentIntent.amount_received=0,
  incompletePI:x=>x.paymentIntent.status='processing',
  unpaidSessionPaidPI:x=>x.session.payment_status='unpaid',
  expiredButPaid:x=>x.session.status='expired'
})) {
  test(`${name} is never marked matched-paid`,()=>{
    const x=fixture();patch(x);const r=assess(x);
    assert.equal(r.kind,'DUAL_STATUS_CONFLICT');assert.equal(r.paymentAuthorized,false);
  });
}
test('unpaid Session and pending PaymentIntent stays review-only',()=>{
  const x=fixture();x.session.status='open';x.session.payment_status='unpaid';
  x.paymentIntent.status='requires_payment_method';x.paymentIntent.amount_received=0;
  assert.equal(assess(x).kind,'UNPAID_OR_UNSETTLED_REVIEW');
});
test('absent offline pair cannot become payment evidence',()=>{
  assert.equal(assess(null).kind,'PAIR_NOT_FOUND');
});
test('reader clones fixtures, cannot leak mutable state between calls',async()=>{
  const reader=createOfflineDualStatusReader({[intent.sessionId]:fixture()});
  const first=await reader.retrievePair(intent.sessionId);first.session.amount_total=1;
  assert.equal((await reader.retrievePair(intent.sessionId)).session.amount_total,1380);
  assert.equal(reader.networkEnabled,false);assert.equal(reader.mode,'OFFLINE_DUAL_STATUS');
});
test('reader rejects real sessions and malformed fixture map',async()=>{
  const reader=createOfflineDualStatusReader({});
  await assert.rejects(reader.retrievePair('cs_live_real'),/Synthetic Session/);
  assert.throws(()=>createOfflineDualStatusReader({'cs_live_real':fixture()}));
});
test('invalid override and invalid checkout are rejected',()=>{
  assert.throws(()=>makeOfflineDualStatusPair(intent,providerExpiry,{surprise:1}));
  assert.throws(()=>makeOfflineDualStatusPair({...intent,provenance:'REAL'},providerExpiry));
  assert.throws(()=>makeOfflineDualStatusPair(intent,'not-a-date'));
});
test('offline pair never prints secret or raw payment records in verdict',()=>{
  assert.doesNotMatch(JSON.stringify(assess(fixture())),/cs_test|pi_synthetic|synthetic-012|account|secret|metadata/);
});
