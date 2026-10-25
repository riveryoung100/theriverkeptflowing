import test from 'node:test';
import assert from 'node:assert/strict';
import {commerceFixture,at,NOW} from './private-commerce-fixture';
import {SYNTHETIC_HANDOFF as HANDOFF} from './order-simulation';
import {createLocalDualStatusAudit} from './provider-dual-status-audit';
import {LocalTableOrderRepository} from '../../src/lib/food/table-local-order-repository';
import {createTableCheckoutService} from '../../src/lib/food/table-checkout-service';

test('A/B/O: full provider-ledger journey, duplicate before/after observation and fulfillment preserve one receipt',async t=>{
 const s=await commerceFixture();t.after(()=>s.db.close());
 assert.equal(await s.receive('checkout.session.completed','evt_journey',29),'accepted');
 await s.audit.observe('journey_observation',await s.observation(),at(29),0);
 assert.equal(await s.receive('checkout.session.completed','evt_journey',29),'accepted');
 await s.app.progress(s.id,'prepare',(await s.repo.get(s.id)).version,'prepare',at(29));
 await s.app.progress(s.id,'ready',(await s.repo.get(s.id)).version,'ready',at(29),'synthetic-handling');
 await s.app.progress(s.id,'fulfill',(await s.repo.get(s.id)).version,'fulfill',HANDOFF,'synthetic-handoff');
 assert.equal(await s.receive('checkout.session.completed','evt_journey',31),'accepted');
 const confirmation=await s.app.confirmation(s.id);assert.equal(confirmation.stage,'fulfilled');assert.equal(confirmation.realPaymentVerified,false);
 const finance=await s.app.operations();assert.equal(finance.totalSyntheticReceiptsCents,1380n);assert.equal(finance.operatingProfitCents,null);
 assert.equal((await s.repo.snapshot()).capacity.resources.find(r=>r.kind==='batch')?.committed,1);
});

test('C: signed failed payment releases capacity; a later success becomes refund recovery',async t=>{
 const s=await commerceFixture();t.after(()=>s.db.close());
 await s.receive('checkout.session.async_payment_failed','evt_failed',10);
 await s.receive('checkout.session.completed','evt_after_failure',11);
 assert.equal((await s.repo.get(s.id)).status,'canceled');
 assert.equal((await s.app.operations()).latePaymentRefundsRequired,1);
 assert.equal((await s.app.operations()).latePaymentRefundProvisionCents,1380n);
 assert.equal((await s.repo.snapshot()).capacity.resources.find(r=>r.kind==='batch')?.committed,0);
 await s.audit.observe('failed_then_read',await s.observation(),at(12),0);
 assert.equal((await s.repo.get(s.id)).status,'canceled');
 assert.equal((await s.app.operations()).latePaymentRefundsRequired,1);
});

for(const minutes of [31,41])test(`${minutes===31?'E':'D/F'}: early event.created with late arrival never proves payment transition timing`,async t=>{
 const s=await commerceFixture();t.after(()=>s.db.close());
 await s.app.recover('cleanup',at(minutes));
 assert.equal(await s.receive('checkout.session.completed','evt_chronology',minutes),'manual-review-required');
 await s.queue.sync();
 const row=await s.audit.observe('chronology_observation',await s.observation(),at(minutes+1),0,'evt_chronology');
 const chronology=await s.ledger.chronology('evt_chronology');
 assert.equal(chronology.webhookEventCreatedAt,NOW);assert.equal(chronology.paymentTransitionAt,null);
 assert.equal(chronology.timing,'TIMING_UNDETERMINED');assert.equal(row?.correlation.timing,'TIMING_UNDETERMINED');
 assert.notEqual((await s.repo.get(s.id)).status,'accepted');assert.equal((await s.queue.summary()).open,1);
});

for(const [label,patch] of [['G',{amount_total:1}],['H',{currency:'eur'}],['I',{id:'cs_test_synthetic_wrong'}],['J',{payment_intent:'pi_synthetic_wrong'}]] as const) {
 test(`${label}: signed mismatched identity/amount cannot accept original quote`,async t=>{
 const s=await commerceFixture();t.after(()=>s.db.close());const before=await s.repo.snapshot();
 await assert.rejects(s.receive('checkout.session.completed','evt_mismatch',12,patch));
 assert.deepEqual(await s.repo.snapshot(),before);assert.equal((await s.app.operations()).totalSyntheticReceiptsCents,0n);
 });
}

test('K/L: canceled order, refund pending/failed/completed retain obligation and consumed prepared inventory',async t=>{
 const s=await commerceFixture();t.after(()=>s.db.close());await s.receive('checkout.session.completed','evt_paid',10);
 await s.app.progress(s.id,'prepare',(await s.repo.get(s.id)).version,'prepare',at(11));
 await s.app.progress(s.id,'cancel',(await s.repo.get(s.id)).version,'cancel',at(12));
 for(const [type,event,minute] of [['refund.created','evt_refund_pending',13],['refund.failed','evt_refund_failed',14]] as const) {
  await s.receive(type,event,minute);assert.equal((await s.repo.get(s.id)).status,'refund-pending');
  await s.audit.observe(`observation_${event}`,await s.observation(),at(minute),await s.audit.revision());
  assert.equal((await s.repo.get(s.id)).status,'refund-pending');
 }
 await s.receive('refund.updated','evt_refund_done',15,{status:'succeeded'});
 await s.receive('refund.updated','evt_refund_done',15,{status:'succeeded'});
 const ops=await s.app.operations();assert.equal(ops.refundedCents,1380n);assert.equal(ops.netOperatingRevenueCents,0n);
 assert.equal((await s.repo.get(s.id)).status,'refunded');
 assert.equal((await s.repo.snapshot()).capacity.resources.find(r=>r.kind==='batch')?.committed,1);
 await assert.rejects(s.app.progress(s.id,'fulfill-refunded',(await s.repo.get(s.id)).version,'fulfill',HANDOFF,'synthetic-handoff'));
});

test('M: commit followed by lost acknowledgment, restart and observation replay never double-book',async t=>{
 const s=await commerceFixture();t.after(()=>s.db.close());
 await s.db.prepare("CREATE TRIGGER journey_interrupt BEFORE UPDATE ON table_synthetic_order_store BEGIN SELECT RAISE(ABORT,'journey interrupted'); END").all();
 await assert.rejects(s.receive('checkout.session.completed','evt_restart',10),/interrupted/);
 assert.equal((await s.ledger.summary()).pending,1);
 await s.db.prepare('DROP TRIGGER journey_interrupt').all();
 await s.receive('checkout.session.completed','evt_restart',10); // discard successful acknowledgment
 await s.db.restart();
 const repo=await LocalTableOrderRepository.open(s.db,await s.repo.authoritySnapshot());
 const app=createTableCheckoutService(repo,s.adapter);
 const f=await s.signed('checkout.session.completed','evt_restart');
 await app.receiveWebhook(f.rawBody,f.signature,at(11));
 const audit=await createLocalDualStatusAudit(s.db);await audit.observe('after_restart',await s.observation(),at(11),0);
 assert.equal((await app.operations()).totalSyntheticReceiptsCents,1380n);
 assert.equal((await repo.snapshot()).capacity.resources.find(r=>r.kind==='batch')?.committed,1);
});

test('N: last serving is not reacquired by late payment after cleanup and competing reservation',async t=>{
 const s=await commerceFixture('synthetic-first',1);t.after(()=>s.db.close());
 await s.app.recover('cleanup',at(41));
 for(const id of ['synthetic-contender-a','synthetic-contender-b']) {
  await s.app.select({id,key:'select',productId:'food-product:synthetic-bowl',version:1,quantity:1,
   windowId:'synthetic-window',locationReference:'synthetic-handoff',now:at(41),delivery:null});
  await s.app.quote(id,'quote',1,at(41));
 }
 const reservations=await Promise.allSettled(['synthetic-contender-a','synthetic-contender-b'].map(id=>s.app.reserve(id,'reserve',2,at(41))));
 assert.equal(reservations.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(reservations.filter(r=>r.status==='rejected').length,1);
 // Original quote is immutable and expired; a late observation cannot reserve it again.
 await s.audit.observe('after_release',await s.observation(),at(41),0);
 assert.equal(await s.receive('checkout.session.completed','evt_late_released',42),'manual-review-required');
 assert.equal((await s.repo.snapshot()).capacity.resources.find(r=>r.kind==='batch')?.committed,0);
 assert.equal((await s.repo.snapshot()).capacity.resources.find(r=>r.kind==='batch')?.available,0);
});

test('P/Q/R/S: fixture provenance cannot escalate; conflicting audit writers retain one snapshot',async t=>{
 const s=await commerceFixture();t.after(()=>s.db.close());
 const a=await s.observation(),b=await s.observation({session:{status:'open',payment_status:'unpaid'}});
 await assert.rejects(s.audit.observe('forged_actual',{...a,source:'REAL_STRIPE_TEST_MODE_READ'},at(1),0),/Trusted/);
 const rows=await Promise.allSettled([s.audit.observe('race_paid',a,at(1),0),s.audit.observe('race_open',b,at(2),0)]);
 assert.equal(rows.filter(r=>r.status==='fulfilled').length,1);
 await assert.rejects(s.audit.observe('stale_observe',a,at(3),0),/revision/);
 assert.equal((await s.repo.get(s.id)).status,'awaiting-payment');
});

test('T and inverse order: expired quote cannot checkout; provider read never substitutes for a signed event',async t=>{
 const s=await commerceFixture();t.after(()=>s.db.close());
 await s.audit.observe('read_first',await s.observation(),at(1),0);
 const f=await s.signed('checkout.session.completed','evt_invalid_signature');
 await assert.rejects(s.boundary.receive(f.rawBody+' ',f.signature,at(2)));
 assert.equal((await s.repo.get(s.id)).status,'awaiting-payment');
 await s.app.recover('expire',at(41));
 await assert.rejects(s.app.reserve(s.id,'retry_expired',(await s.repo.get(s.id)).version,at(42)));
 assert.notEqual((await s.repo.get(s.id)).status,'accepted');
});

test('signed chronology cannot be paired with another raw body, and repeated cleanup stays idempotent',async t=>{
 const s=await commerceFixture();t.after(()=>s.db.close());const f=await s.signed();const evidence=await s.adapter.verify(f.rawBody,f.signature);
 await assert.rejects(s.ledger.inspectEvent(evidence,f.rawBody+' ',at(31)),/body mismatch/);
 assert.equal((await s.ledger.summary()).manualReview,0);
 await s.app.recover('cleanup_once',at(41));await s.db.restart();await s.app.recover('cleanup_twice',at(42));
 assert.equal((await s.repo.snapshot()).capacity.resources.find(r=>r.kind==='batch')?.committed,0);
});
