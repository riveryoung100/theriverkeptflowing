import test from 'node:test';
import assert from 'node:assert/strict';
import {commerceFixture,at,NOW} from './private-commerce-fixture';
import {createLocalDualStatusAudit} from './provider-dual-status-audit';
import {inspectExistingStripeTestSession,requireProviderObservation} from './stripe-testmode-real-readonly-core.mjs';
import {LocalMiniflareD1} from './local-miniflare-d1';
import type {LocalTableDatabase} from './local-test-d1';

test('strict durable synthetic correlation requires quote, original hold, case and account',async t=>{
 const s=await commerceFixture();t.after(()=>s.db.close());
 await s.receive('checkout.session.completed','evt_correlate',31);await s.queue.sync();
 const receipt=await s.observation();
 const result=await s.audit.observe('observe_match',receipt,at(32),0,'evt_correlate');
 assert.equal(result?.correlation.kind,'CORRELATED_SYNTHETIC_REVIEW_ONLY');
 assert.equal(result?.correlation.quoteId,s.intent.quoteId);assert.ok(result?.correlation.reservationId);
 assert.equal(result?.observation.source,'SYNTHETIC_FIXTURE');assert.equal(result?.paymentAuthorized,false);
 assert.equal((await s.repo.get(s.id)).status,'awaiting-payment');assert.equal((await s.queue.summary()).open,1);
 await assert.rejects(s.audit.observe('observe_forged',{...receipt,source:'REAL_STRIPE_TEST_MODE_READ'},at(32),1),/Trusted observation/);
 await assert.rejects(s.audit.observe('observe_missing',receipt,at(32),1,'evt_missing'),/Missing/);
});

test('parallel duplicates, uncertain acknowledgment and workerd restart preserve one immutable observation',async t=>{
 const s=await commerceFixture();t.after(()=>s.db.close());const receipt=await s.observation();
 const rows=await Promise.all([1,2,3].map(()=>s.audit.observe('observe_duplicate',receipt,at(1),0)));
 assert.equal(rows[0]?.correlation.kind,'CORRELATED_SYNTHETIC_REVIEW_ONLY');
 assert.equal(rows[0]?.correlation.caseId,null);assert.equal(rows[0]?.correlation.quoteId,s.intent.quoteId);
 assert.deepEqual(rows[0],rows[2]);await s.db.restart();const reopened=await createLocalDualStatusAudit(s.db);
 assert.deepEqual(await reopened.observe('observe_duplicate',receipt,at(1),0),rows[0]);
 assert.equal(await reopened.revision(),1);
 await assert.rejects(reopened.observe('observe_duplicate',await s.observation({session:{status:'open',payment_status:'unpaid'}}),at(1),1),/identity conflict/);
 assert.equal((await reopened.observations()).length,1);
 await assert.rejects(reopened.observe('different_key_same_observation',receipt,at(1),1),/UNIQUE/);
});

test('missing/stale review source cannot create a false quote association; timestamped history remains independent',async t=>{
 const s=await commerceFixture();t.after(()=>s.db.close());await s.receive('checkout.session.completed','evt_stale_source',31);await s.queue.sync();
 await s.db.prepare("UPDATE table_synthetic_provider_sessions_009 SET intent_sha256='stale' WHERE session_id=?").bind(s.intent.sessionId).all();
 const row=await s.audit.observe('stale_source',await s.observation(),at(32),0,'evt_stale_source');
 assert.equal(row?.correlation.kind,'UNCORRELATED_TEST_OBSERVATION');assert.equal(row?.correlation.caseId,null);
 await s.db.prepare("DELETE FROM table_synthetic_payment_review_010 WHERE event_id='evt_stale_source'").all();
 await assert.rejects(s.audit.observe('deleted_review',await s.observation(),at(33),1,'evt_stale_source'),/Missing/);
 assert.equal((await s.audit.observations()).length,1);
});

test('distinct concurrent snapshots use CAS; history records status changes and rejects stale revisions',async t=>{
 const s=await commerceFixture();t.after(()=>s.db.close());const a=await s.observation(),b=await s.observation({session:{status:'open',payment_status:'unpaid'}});
 const results=await Promise.allSettled([s.audit.observe('observe_paid',a,at(1),0),s.audit.observe('observe_open',b,at(2),0)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 await assert.rejects(s.audit.observe('observe_stale',a,at(3),0),/revision/);
 await s.audit.observe('observe_history',b,at(3),1);assert.equal((await s.audit.observations()).length,2);
 assert.equal(await s.audit.revision(),2);
});

test('interrupted observation write yields no acknowledgment and retries after removing fault',async t=>{
 const s=await commerceFixture();t.after(()=>s.db.close());const receipt=await s.observation();
 await s.db.prepare("CREATE TRIGGER observe_fault BEFORE INSERT ON table_synthetic_dual_status_audit_012 BEGIN SELECT RAISE(ABORT,'interrupted observation'); END").all();
 await assert.rejects(s.audit.observe('observe_fault',receipt,at(1),0),/interrupted/);
 assert.equal(await s.audit.observation('observe_fault'),null);
 await s.db.prepare('DROP TRIGGER observe_fault').all();assert.ok(await s.audit.observe('observe_fault',receipt,at(1),0));
});

test('actual-shaped injected reader stays fixture and uncorrelated, even when metadata imitates local order',async t=>{
 const s=await commerceFixture();t.after(()=>s.db.close());
 const id='cs_test_abcdefghijklmnop1234',pi='pi_abcdefghijklmnop1234';
 const receipt=await inspectExistingStripeTestSession(id,{checkout:{sessions:{retrieve:async()=>({id,object:'checkout.session',livemode:false,mode:'payment',
   status:'complete',payment_status:'paid',amount_total:s.intent.amount,currency:'usd',created:1792591200,expires_at:1792593000,payment_intent:pi,
   customer_details:{email:'DO_NOT_STORE@example.com'},metadata:{orderId:s.id,quoteId:s.intent.quoteId}})}},paymentIntents:{retrieve:async()=>({id:pi,object:'payment_intent',livemode:false,
     created:1792591200,status:'succeeded',amount:s.intent.amount,amount_received:s.intent.amount,currency:'usd'})}});
 const result=await s.audit.observe('observe_actual_shape',receipt,at(2),0);
 assert.equal(result?.correlation.kind,'UNCORRELATED_TEST_OBSERVATION');assert.equal(result?.correlation.caseId,null);
 assert.equal(result?.observation.source,'SYNTHETIC_FIXTURE');assert.doesNotMatch(JSON.stringify(result),/DO_NOT_STORE|customer_details|client_secret/);
 assert.throws(()=>requireProviderObservation(JSON.parse(JSON.stringify(receipt))),/Trusted observation/);
});

for(const field of ['amount','currency','payment_intent','metadata','client_reference_id'])test(`wrong provider ${field} cannot correlate`,async t=>{
 const s=await commerceFixture();t.after(()=>s.db.close());await s.receive('checkout.session.completed','evt_wrong',31);await s.queue.sync();
 const values:Record<string,unknown>={amount:1,currency:'eur',payment_intent:'pi_synthetic_wrong',metadata:{orderId:'other'},client_reference_id:'synthetic-other'};
 const patch=field==='amount'?{amount_total:1}:{[field]:values[field]};
 const row=await s.audit.observe(`observe_wrong_${field}`,await s.observation({session:patch}),at(32),0,'evt_wrong');
 assert.equal(row?.correlation.kind,'PROVIDER_STATE_CONFLICT');assert.equal(row?.correlation.caseId,null);
});

test('legacy local audit schema migration preserves rowids and records',async t=>{
 const db=await LocalMiniflareD1.create();t.after(()=>db.close());
 await db.prepare(`CREATE TABLE table_synthetic_dual_status_audit_012(check_key TEXT PRIMARY KEY,event_id TEXT NOT NULL,session_id TEXT NOT NULL,checked_at TEXT NOT NULL,pair_hash TEXT NOT NULL,verdict TEXT NOT NULL)`).all();
 await db.prepare("INSERT INTO table_synthetic_dual_status_audit_012 VALUES ('legacy_check','evt_legacy','cs_test_synthetic_legacy',?,'digest','PAIR_NOT_FOUND')").bind(NOW).all();
 const audit=await createLocalDualStatusAudit(db);assert.equal(await audit.revision(),1);assert.equal((await audit.inspect('legacy_check'))?.verdict,'PAIR_NOT_FOUND');
 await db.restart();assert.equal(await (await createLocalDualStatusAudit(db)).revision(),1);
});

test('atomic association rejects concurrent case deletion; committed write with lost acknowledgment replays after restart',async t=>{
 const s=await commerceFixture();t.after(()=>s.db.close());await s.receive('checkout.session.completed','evt_atomic_case',31);await s.queue.sync();
 let fault:'delete'|'lost-ack'|null='delete';
 const db:LocalTableDatabase={mode:'local-synthetic-only',batch:statements=>s.db.batch(statements),prepare(sql){
  const statement=s.db.prepare(sql);const wrapped={bind:(...values:(string|number|null)[])=>{statement.bind(...values);return wrapped;},all:async()=>{
   const action=sql.startsWith('INSERT INTO table_synthetic_dual_status_audit_012')?fault:null;
   if(action)fault=null;
   if(action==='delete')await s.db.prepare("DELETE FROM table_synthetic_payment_review_010 WHERE event_id='evt_atomic_case'").all();
   const result=await statement.all();if(action==='lost-ack')throw Error('lost audit acknowledgment');return result;
  }};return wrapped;
 }};
 const audit=await createLocalDualStatusAudit(db),receipt=await s.observation();
 await assert.rejects(audit.observe('atomic_case',receipt,at(32),0,'evt_atomic_case'),/revision or review conflict/);
 assert.equal(await s.audit.revision(),0);await s.queue.sync();fault='lost-ack';
 await assert.rejects(audit.observe('atomic_case',receipt,at(32),0,'evt_atomic_case'),/lost audit acknowledgment/);
 await s.db.restart();const reopened=await createLocalDualStatusAudit(s.db);
 const row=await reopened.observe('atomic_case',receipt,at(32),0,'evt_atomic_case');
 assert.equal(row?.revision,1);assert.equal((await reopened.observations()).length,1);
 assert.equal((await s.queue.summary()).open,1);assert.equal((await s.repo.get(s.id)).status,'awaiting-payment');
});
