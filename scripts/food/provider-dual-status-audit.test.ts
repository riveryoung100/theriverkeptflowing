import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {LocalMiniflareD1} from './local-miniflare-d1';
import {LocalTableOrderRepository} from '../../src/lib/food/table-local-order-repository';
import {createTableCheckoutService} from '../../src/lib/food/table-checkout-service';
import {createOfflineStripeTestAdapter} from '../../src/lib/food/table-test-payment';
import {syntheticAuthority,SYNTHETIC_NOW as NOW,SYNTHETIC_HANDOFF as HANDOFF} from './order-simulation';
import {syntheticLongHoldAuthority} from './long-hold-fixture';
import {SYNTHETIC_STRIPE_CONFIG,signedFixture,realisticSyntheticWebhook} from './signed-payment-fixtures';
import {createLocalProviderSessionLedger,createLocalProviderEventBoundary} from './provider-session-ledger';
import {createLocalProviderExceptionQueue} from './provider-exception-queue';
import {createLocalProviderStatusAudit} from './provider-status-audit';
import {createOfflineProviderStatusReader,makeSyntheticProviderSession} from './provider-status-contract.mjs';
import {createLocalDualStatusAudit} from './provider-dual-status-audit';
import {makeOfflineDualStatusPair,createOfflineDualStatusReader} from './provider-dual-status-contract.mjs';
const at=(minutes:number)=>new Date(Date.parse(NOW)+minutes*60_000).toISOString();
async function setup(id='synthetic-012-order',eventId='evt_012_late',early=false) {
  const db=await LocalMiniflareD1.create();
  try {
    const repo=await LocalTableOrderRepository.open(db,syntheticLongHoldAuthority(syntheticAuthority(),NOW));
    const adapter=createOfflineStripeTestAdapter(SYNTHETIC_STRIPE_CONFIG);
    const app=createTableCheckoutService(repo,adapter);
    await app.select({id,key:'new',productId:'food-product:synthetic-bowl',version:1,
      quantity:1,windowId:'synthetic-window',locationReference:'synthetic-handoff',now:NOW,delivery:null});
    await app.quote(id,'quote',1,NOW);
    const intent=await app.reserve(id,'reserve',2,NOW);
    const sessionLedger=await createLocalProviderSessionLedger(db);
    await sessionLedger.register(intent,NOW,at(30));
    const signed=await signedFixture(realisticSyntheticWebhook(intent,'checkout.session.completed',eventId));
    const boundary=createLocalProviderEventBoundary(sessionLedger,adapter,app);
    assert.equal(await boundary.receive(signed.rawBody,signed.signature,at(early?29:31)),early?'accepted':'manual-review-required');
    const queue=await createLocalProviderExceptionQueue(db);await queue.sync();
    const statusAudit=await createLocalProviderStatusAudit(db);
    const reader=createOfflineProviderStatusReader({[intent.sessionId]:makeSyntheticProviderSession(intent,at(30))});
    if(!early)await statusAudit.evaluate(eventId,'check_012_first',intent,reader,at(32));
    const dual=await createLocalDualStatusAudit(db);
    const pair=makeOfflineDualStatusPair(intent,at(30));
    const dualReader=createOfflineDualStatusReader({[intent.sessionId]:pair});
    return {db,repo,app,intent,eventId,queue,dual,dualReader,pair,id,boundary,adapter,sessionLedger,statusAudit,reader};
  }catch(error){await db.close();throw error;}
}
test('second provider object matches synthetically, never accepts order or closes case',async t=>{
  const s=await setup();t.after(()=>s.db.close());
  const result=await s.dual.evaluate(s.eventId,'dual_012_paid',s.intent,s.dualReader,at(33));
  assert.equal(result.verdict,'SYNTHETIC_DUAL_PAID_MATCH_REVIEW');
  assert.equal(result.paymentAuthorized,false);assert.equal(result.realStripeRetrieved,false);
  assert.equal((await s.repo.get(s.id)).status,'awaiting-payment');
  assert.equal((await s.queue.summary()).open,1);
  assert.equal((await s.dual.summary()).matchedPaidReview,1);
});
test('audit survives local workerd restart and exact idempotent retry',async t=>{
  const s=await setup();t.after(()=>s.db.close());
  const before=await s.dual.evaluate(s.eventId,'dual_012_restart',s.intent,s.dualReader,at(33));
  await s.db.restart();const reopened=await createLocalDualStatusAudit(s.db);
  assert.deepEqual(await reopened.inspect('dual_012_restart'),before);
  assert.deepEqual(await reopened.evaluate(s.eventId,'dual_012_restart',s.intent,s.dualReader,at(33)),before);
  assert.equal((await reopened.summary()).checks,1);
});
test('wrong PaymentIntent never produces paid match and cannot rewrite prior check',async t=>{
  const s=await setup();t.after(()=>s.db.close());
  const done=await s.dual.evaluate(s.eventId,'dual_012_conflict',s.intent,s.dualReader,at(33));
  const altered=structuredClone(s.pair);altered.paymentIntent.amount_received=0;
  const conflictingReader=createOfflineDualStatusReader({[s.intent.sessionId]:altered});
  await assert.rejects(s.dual.evaluate(s.eventId,'dual_012_conflict',s.intent,conflictingReader,at(33)),/conflict/);
  assert.deepEqual(await s.dual.inspect('dual_012_conflict'),done);
  const mismatch=await s.dual.evaluate(s.eventId,'dual_012_mismatch',s.intent,conflictingReader,at(34));
  assert.equal(mismatch.verdict,'DUAL_STATUS_CONFLICT');
});
test('missing pair remains review-only and database faults cause no partial audit',async t=>{
  const s=await setup();t.after(()=>s.db.close());
  const empty=createOfflineDualStatusReader({});
  assert.equal((await s.dual.evaluate(s.eventId,'dual_012_missing',s.intent,empty,at(33))).verdict,'PAIR_NOT_FOUND');
  await s.db.prepare("CREATE TRIGGER dual_interrupt BEFORE INSERT ON table_synthetic_dual_status_audit_012 BEGIN SELECT RAISE(ABORT,'synthetic dual interruption'); END").all();
  await assert.rejects(s.dual.evaluate(s.eventId,'dual_012_fault',s.intent,s.dualReader,at(33)),/interruption/);
  assert.equal((await s.dual.summary()).checks,1);
  await s.db.prepare('DROP TRIGGER dual_interrupt').all();
  assert.equal((await s.dual.evaluate(s.eventId,'dual_012_fault',s.intent,s.dualReader,at(33))).verdict,'SYNTHETIC_DUAL_PAID_MATCH_REVIEW');
});
test('concurrent same-key checks create one audit row',async t=>{
  const s=await setup();t.after(()=>s.db.close());
  const records=await Promise.all([1,2,3].map(()=>s.dual.evaluate(s.eventId,'dual_012_race',s.intent,s.dualReader,at(33))));
  assert.deepEqual(records[0],records[1]);assert.deepEqual(records[1],records[2]);
  assert.equal((await s.dual.summary()).checks,1);
});
test('wrong reader and mismatched session blocked before any write',async t=>{
  const s=await setup();t.after(()=>s.db.close());
  await assert.rejects(s.dual.evaluate(s.eventId,'dual_012_net',s.intent,{...s.dualReader,networkEnabled:true},at(33)),/network prohibited/);
  await assert.rejects(s.dual.evaluate(s.eventId,'dual_012_bad',{...s.intent,amount:1},s.dualReader,at(33)),/do not match/);
  await assert.rejects(s.dual.evaluate('evt_absent','dual_012_absent',s.intent,s.dualReader,at(33)),/prior provider audit/);
  assert.equal((await s.dual.summary()).checks,0);
});
test('private result redacts identifiers and cannot provide production payment proof',async t=>{
  const s=await setup();t.after(()=>s.db.close());
  const result=await s.dual.evaluate(s.eventId,'dual_012_redacted',s.intent,s.dualReader,at(33));
  assert.doesNotMatch(JSON.stringify(result),/synthetic-012-order|evt_012_late|cs_test|pi_synthetic|account|secret/);
  assert.equal((await s.queue.summary()).open,1);
});
test('no public route imports synthetic dual reader or audit',async()=>{
  for(const path of ['../../src/pages/api/commerce/create-checkout.ts','../../src/pages/api/commerce/stripe-webhook.ts']) {
    const content=await readFile(new URL(path,import.meta.url),'utf8');
    assert.doesNotMatch(content,/provider-dual-status-contract|provider-dual-status-audit/);
  }
  for(const path of ['./provider-dual-status-contract.mjs','./provider-dual-status-audit.ts']) {
    const source=await readFile(new URL(path,import.meta.url),'utf8');
    assert.doesNotMatch(source,/\bfetch\s*\(|new\s+Stripe\s*\(|\.sessions\.retrieve\s*\(|\.paymentIntents\.retrieve\s*\(/);
  }
});

test('stale audit revision cannot append; exact lost-ack retry remains idempotent',async t=>{
 const s=await setup();t.after(()=>s.db.close());
 const rev=await s.dual.revision();
 const first=await s.dual.evaluate(s.eventId,'dual_016_first',s.intent,s.dualReader,at(33),rev);
 assert.equal(first.revision,rev+1);
 await assert.rejects(s.dual.evaluate(s.eventId,'dual_016_stale',s.intent,s.dualReader,at(34),rev),/conflict/);
 await s.db.restart();const reopened=await createLocalDualStatusAudit(s.db);
 assert.deepEqual(await reopened.evaluate(s.eventId,'dual_016_first',s.intent,s.dualReader,at(33),rev),first);
 assert.equal((await reopened.summary()).checks,1);
 assert.equal((await s.queue.summary()).open,1);
 assert.equal((await s.repo.get(s.id)).status,'awaiting-payment');
});

test('competing distinct audit keys at one revision permit only one append',async t=>{
 const s=await setup();t.after(()=>s.db.close());const rev=await s.dual.revision();
 const results=await Promise.allSettled(['dual_016_a','dual_016_b'].map(key=>s.dual.evaluate(s.eventId,key,s.intent,s.dualReader,at(33),rev)));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(results.filter(r=>r.status==='rejected').length,1);
 assert.equal(await s.dual.revision(),rev+1);
 assert.equal((await s.queue.summary()).open,1);
});

test('integrated provider ledger journey fulfills synthetically and later audit cannot alter completion or receipts',async t=>{
 const s=await setup('synthetic-017-journey','evt_017_early',true);t.after(()=>s.db.close());
 await s.app.progress(s.id,'prepare',(await s.repo.get(s.id)).version,'prepare',at(29));
 await s.app.progress(s.id,'ready',(await s.repo.get(s.id)).version,'ready',at(29),'synthetic-handling');
 await s.app.progress(s.id,'fulfill',(await s.repo.get(s.id)).version,'fulfill',HANDOFF,'synthetic-handoff');
 const late=await signedFixture(realisticSyntheticWebhook(s.intent,'checkout.session.completed','evt_017_delayed_duplicate'));
 assert.equal(await s.boundary.receive(late.rawBody,late.signature,HANDOFF),'manual-review-required');
 await s.queue.sync();
 await s.statusAudit.evaluate('evt_017_delayed_duplicate','check_017_late',s.intent,s.reader,HANDOFF);
 const audit=await s.dual.evaluate('evt_017_delayed_duplicate','dual_017_late',s.intent,s.dualReader,HANDOFF);
 assert.equal(audit.paymentAuthorized,false);assert.equal((await s.repo.get(s.id)).status,'fulfilled');
 assert.equal((await s.queue.summary()).open,1);
 const confirmation=await s.app.confirmation(s.id);assert.equal(confirmation.stage,'fulfilled');assert.equal(confirmation.realPaymentVerified,false);
 const finance=await s.app.operations();assert.equal(finance.totalSyntheticReceiptsCents,1380n);assert.equal(finance.operatingProfitCents,null);
 assert.equal((await s.repo.snapshot()).capacity.resources.find(r=>r.kind==='batch')?.committed,1);
});

test('offline observation before late webhook cannot authorize acceptance or remove refund review after expiry',async t=>{
 const s=await setup();t.after(()=>s.db.close());
 const before=await s.repo.snapshot();
 const read=await s.dualReader.retrievePair(s.intent.sessionId);assert.ok(read);
 await s.app.recover('recover_017',at(41));
 const late=await signedFixture(realisticSyntheticWebhook(s.intent,'checkout.session.completed','evt_017_after_read'));
 assert.equal(await s.boundary.receive(late.rawBody,late.signature,at(42)),'manual-review-required');
 await s.queue.sync();
 assert.equal((await s.repo.snapshot()).capacity.resources.find(r=>r.kind==='batch')?.committed,0);
 assert.notEqual((await s.repo.get(s.id)).status,'accepted');assert.equal((await s.queue.summary()).open,2);
 assert.equal((await s.app.operations()).totalSyntheticReceiptsCents,0n);
 assert.equal(before.orders.length,1);
});
