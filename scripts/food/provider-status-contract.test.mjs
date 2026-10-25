import test from 'node:test';
import assert from 'node:assert/strict';
import {assessOfflineProviderStatus,createOfflineProviderStatusReader,makeSyntheticProviderSession} from './provider-status-contract.mjs';
const intent={provenance:'synthetic-stripe-test',account:'acct_synthetic_table',orderId:'synthetic-011',quoteId:'synthetic-q1',quoteFingerprint:'abc123',productFingerprint:'def456',sessionId:'cs_test_synthetic_011',paymentId:'pi_synthetic_011',amount:1380,currency:'usd',expiresAt:'2026-10-21T14:40:00.000Z'};
const expiry='2026-10-21T14:30:00.000Z';
const valid=()=>makeSyntheticProviderSession(intent,expiry);
test('correct synthetic snapshot is REVIEW only, never payment proof',()=>{const r=assessOfflineProviderStatus(valid(),intent,expiry);assert.equal(r.kind,'SYNTHETIC_PAID_MATCH_REVIEW');assert.equal(r.paymentAuthorized,false);assert.equal(r.realStripeStatusRetrieved,false)});
test('missing snapshot is review-only',()=>assert.equal(assessOfflineProviderStatus(null,intent,expiry).kind,'NO_OFFLINE_SNAPSHOT'));
test('unpaid or expired statuses do not produce paid verdict',()=>{for(const status of ['open','complete','expired'])for(const pay of ['unpaid','no_payment_required']){const v=valid();v.session.status=status;v.session.payment_status=pay;assert.equal(assessOfflineProviderStatus(v,intent,expiry).kind,'NOT_PAID_OR_UNSETTLED')}});
for(const [name,mutate] of Object.entries({wrongAccount:v=>v.accountContext='acct_synthetic_elsewhere',live:v=>v.session.livemode=true,wrongId:v=>v.session.id='cs_test_synthetic_wrong',wrongAmount:v=>v.session.amount_total=1,wrongCurrency:v=>v.session.currency='eur',wrongPayment:v=>v.session.payment_intent='pi_synthetic_wrong',wrongExpiry:v=>v.session.expires_at-=60,wrongOrder:v=>v.session.client_reference_id='synthetic_other',wrongQuote:v=>v.session.metadata.quoteId='synthetic_other',wrongQuoteFingerprint:v=>v.session.metadata.quoteFingerprint='altered',wrongProductFingerprint:v=>v.session.metadata.productFingerprint='altered',missingFixtureMarker:v=>delete v.session.metadata.fixture,unsupportedStatus:v=>v.session.status='impossible',fakeObject:v=>v.session.object='payment_intent',noPayment:v=>v.session.payment_status='unknown'})){
  test('rejects mismatched '+name,()=>{const v=valid();mutate(v);assert.equal(assessOfflineProviderStatus(v,intent,expiry).kind,'SNAPSHOT_CONFLICT')});
}
test('fixture reader never calls network and defensively clones input',async()=>{const input=valid();const r=createOfflineProviderStatusReader({[intent.sessionId]:input});input.session.amount_total=1;const a=await r.read(intent.sessionId);assert.equal(a.session.amount_total,1380);a.session.amount_total=2;assert.equal((await r.read(intent.sessionId)).session.amount_total,1380);assert.equal(r.networkEnabled,false);assert.equal(r.mode,'OFFLINE_FIXTURE')});
test('offline reader unknown session returns null',async()=>assert.equal(await createOfflineProviderStatusReader({}).read(intent.sessionId),null));
test('invalid reader fixture id rejected',()=>assert.throws(()=>createOfflineProviderStatusReader({'cs_live_fake':valid()})));
test('invalid provider expiry rejected',()=>assert.throws(()=>assessOfflineProviderStatus(valid(),intent,'not-a-time')));
test('non-synthetic checkout rejected',()=>assert.throws(()=>assessOfflineProviderStatus(valid(),{...intent,provenance:'real'},expiry)));
