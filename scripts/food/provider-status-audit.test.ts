import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {LocalMiniflareD1} from './local-miniflare-d1';
import {LocalTableOrderRepository} from '../../src/lib/food/table-local-order-repository';
import {createTableCheckoutService} from '../../src/lib/food/table-checkout-service';
import {createOfflineStripeTestAdapter} from '../../src/lib/food/table-test-payment';
import {syntheticAuthority,SYNTHETIC_NOW as NOW} from './order-simulation';
import {syntheticLongHoldAuthority} from './long-hold-fixture';
import {SYNTHETIC_STRIPE_CONFIG,signedFixture,realisticSyntheticWebhook} from './signed-payment-fixtures';
import {createLocalProviderSessionLedger,createLocalProviderEventBoundary} from './provider-session-ledger';
import {createLocalProviderExceptionQueue} from './provider-exception-queue';
import {createLocalProviderStatusAudit} from './provider-status-audit';
import {createOfflineProviderStatusReader,makeSyntheticProviderSession} from './provider-status-contract.mjs';
const at=(mins:number)=>new Date(Date.parse(NOW)+mins*60_000).toISOString();
async function setup(id='synthetic-011-check',eventId='evt_011_late') {
  const db=await LocalMiniflareD1.create();
  try {
    const repo=await LocalTableOrderRepository.open(db,syntheticLongHoldAuthority(syntheticAuthority(),NOW));
    const adapter=createOfflineStripeTestAdapter(SYNTHETIC_STRIPE_CONFIG);
    const app=createTableCheckoutService(repo,adapter);
    await app.select({id,key:'new',productId:'food-product:synthetic-bowl',version:1,quantity:1,windowId:'synthetic-window',locationReference:'synthetic-handoff',now:NOW,delivery:null});
    await app.quote(id,'quote',1,NOW);
    const intent=await app.reserve(id,'reserve',2,NOW);
    const sessionLedger=await createLocalProviderSessionLedger(db);
    await sessionLedger.register(intent,NOW,at(30));
    const signed=await signedFixture(realisticSyntheticWebhook(intent,'checkout.session.completed',eventId));
    const outcome=await createLocalProviderEventBoundary(sessionLedger,adapter,app).receive(signed.rawBody,signed.signature,at(31));
    assert.equal(outcome,'manual-review-required');
    const queue=await createLocalProviderExceptionQueue(db);
    await queue.sync();
    const audit=await createLocalProviderStatusAudit(db);
    const fixture=makeSyntheticProviderSession(intent,at(30));
    const reader=createOfflineProviderStatusReader({[intent.sessionId]:fixture});
    return {db,repo,intent,eventId,queue,audit,reader,fixture,id};
  }catch(e){await db.close();throw e;}
}
test('local D1 stores a reviewed synthetic paid-match check without accepting order',async t=>{
  const s=await setup();t.after(()=>s.db.close());
  const result=await s.audit.evaluate(s.eventId,'check_011_paid',s.intent,s.reader,at(32));
  assert.equal(result.verdict,'SYNTHETIC_PAID_MATCH_REVIEW');assert.equal(result.paymentAuthorized,false);
  assert.equal(result.realStripeStatusRetrieved,false);
  assert.equal((await s.repo.get(s.id)).status,'awaiting-payment');
  assert.equal((await s.queue.summary()).open,1);
  assert.equal((await s.audit.summary()).syntheticPaidMatches,1);
});
test('durable offline status check survives workerd restart and safe identical retry',async t=>{
  const s=await setup();t.after(()=>s.db.close());
  const original=await s.audit.evaluate(s.eventId,'check_011_restart',s.intent,s.reader,at(32));
  await s.db.restart();const reopened=await createLocalProviderStatusAudit(s.db);
  assert.deepEqual(await reopened.inspect('check_011_restart'),original);
  assert.deepEqual(await reopened.evaluate(s.eventId,'check_011_restart',s.intent,s.reader,at(32)),original);
  assert.equal((await reopened.summary()).checks,1);
});
test('conflicting retry and absent fixture never authorize or overwrite prior audit',async t=>{
  const s=await setup();t.after(()=>s.db.close());
  await s.audit.evaluate(s.eventId,'check_011_conflict',s.intent,s.reader,at(32));
  const empty=createOfflineProviderStatusReader({});
  await assert.rejects(s.audit.evaluate(s.eventId,'check_011_conflict',s.intent,empty,at(32)),/conflict/);
  const missing=await s.audit.evaluate(s.eventId,'check_011_missing',s.intent,empty,at(33));
  assert.equal(missing.verdict,'NO_OFFLINE_SNAPSHOT');assert.equal((await s.audit.summary()).checks,2);
});
test('invalid account, amount, and expiry are redacted conflicts; review stays open',async t=>{
  const s=await setup();t.after(()=>s.db.close());
  for (const [field,make] of [
    ['amount',(v: typeof s.fixture)=>{v.session.amount_total=1;}],
    ['account',(v: typeof s.fixture)=>{v.accountContext='acct_synthetic_wrong';}],
    ['expiry',(v: typeof s.fixture)=>{v.session.expires_at-=60;}]
  ] as const) {
    const fixture=structuredClone(s.fixture);make(fixture);
    const reader=createOfflineProviderStatusReader({[s.intent.sessionId]:fixture});
    const result=await s.audit.evaluate(s.eventId,'check_011_'+field,s.intent,reader,at(34));
    assert.equal(result.verdict,'SNAPSHOT_CONFLICT');assert.equal(result.paymentAuthorized,false);
  }
  assert.equal((await s.audit.summary()).conflicts,3);assert.equal((await s.repo.get(s.id)).status,'awaiting-payment');
});
test('wrong checkout identity or non-offline reader is rejected before audit writes',async t=>{
  const s=await setup();t.after(()=>s.db.close());
  await assert.rejects(s.audit.evaluate(s.eventId,'check_011_wrong',{...s.intent,amount:s.intent.amount+1},s.reader,at(32)),/do not match/);
  await assert.rejects(s.audit.evaluate(s.eventId,'check_011_network',s.intent,{...s.reader,networkEnabled:true},at(32)),/network prohibited/);
  await assert.rejects(s.audit.evaluate('evt_missing','check_011_absent',s.intent,s.reader,at(32)),/quarantined/);
  assert.equal((await s.audit.summary()).checks,0);
});
test('SQL interruption cannot partially persist an audit and retry works',async t=>{
  const s=await setup();t.after(()=>s.db.close());
  await s.db.prepare("CREATE TRIGGER synthetic_audit_interrupt BEFORE INSERT ON table_synthetic_provider_status_audit_011 BEGIN SELECT RAISE(ABORT,'synthetic interruption'); END").all();
  await assert.rejects(s.audit.evaluate(s.eventId,'check_011_fault',s.intent,s.reader,at(32)),/interruption/);
  assert.equal((await s.audit.summary()).checks,0);
  await s.db.prepare('DROP TRIGGER synthetic_audit_interrupt').all();
  assert.equal((await s.audit.evaluate(s.eventId,'check_011_fault',s.intent,s.reader,at(32))).verdict,'SYNTHETIC_PAID_MATCH_REVIEW');
});
test('concurrent identical audit retries produce one durable record',async t=>{
  const s=await setup();t.after(()=>s.db.close());
  const entries=await Promise.all([1,2,3].map(()=>s.audit.evaluate(s.eventId,'check_011_race',s.intent,s.reader,at(32))));
  assert.deepEqual(entries[0],entries[1]);assert.deepEqual(entries[1],entries[2]);
  assert.equal((await s.audit.summary()).checks,1);
});
test('audit results redact provider identifiers and cannot resolve a payment exception',async t=>{
  const s=await setup();t.after(()=>s.db.close());
  const record=await s.audit.evaluate(s.eventId,'check_011_redacted',s.intent,s.reader,at(32));
  assert.doesNotMatch(JSON.stringify(record),/evt_011|synthetic-011-check|cs_test|pi_synthetic|secret|rawBody/);
  assert.equal((await s.queue.summary()).open,1);
});
test('public routes cannot import private status audit or fixtures',async()=>{
  for(const path of ['../../src/pages/api/commerce/create-checkout.ts','../../src/pages/api/commerce/stripe-webhook.ts']){
    const content=await readFile(new URL(path,import.meta.url),'utf8');
    assert.doesNotMatch(content,/provider-status-audit|provider-status-contract|provider-status-report/);
  }
  const source=await readFile(new URL('./provider-status-audit.ts',import.meta.url),'utf8');
  assert.doesNotMatch(source,/\bfetch\s*\(|new\s+Stripe\s*\(|\.sessions\.retrieve\s*\(/);
});
