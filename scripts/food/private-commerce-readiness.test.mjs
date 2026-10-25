import test from 'node:test';
import assert from 'node:assert/strict';
import {assessPrivateCommerceReadiness} from './launch-readiness.mjs';
import {spawnSync} from 'node:child_process';
const input={schemaVersion:1,productId:'food-product:synthetic-bowl',productVersion:1};
test('local test evidence cannot satisfy actual provider or production launch gates',()=>{
 const r=assessPrivateCommerceReadiness(input,{localD1Concurrency:{status:'PASS',evidenceReference:'local-test-run'}});
 assert.equal(r.engineering.find(x=>x.key==='localD1Concurrency').status,'PASS');
 assert.equal(r.engineering.find(x=>x.key==='productionD1Validation').status,'UNVERIFIED');
 assert.equal(r.status,'BLOCKED');assert.equal(r.publicCheckoutEnabled,false);
 assert.ok(r.finance.every(x=>x.status==='UNVERIFIED'&&x.amount===null));
 assert.equal(r.launch.authorizationStatus,'UNVERIFIED');
});
test('unrecorded local checks remain unverified; caller cannot promote network evidence',()=>{
 assert.ok(assessPrivateCommerceReadiness(input).engineering.every(x=>x.status!=='PASS'));
 assert.throws(()=>assessPrivateCommerceReadiness(input,{actualStripeTestRetrieval:{status:'PASS',evidenceReference:'synthetic'}}));
 assert.equal(assessPrivateCommerceReadiness(input,{domainStateMachine:{status:'PASS'}}).engineering[0].status,'UNVERIFIED');
});
test('legacy and consolidated private commands report blocked gates and unknown costs without import deadlock',()=>{
 const r=spawnSync(process.execPath,['scripts/food/launch-readiness.mjs','private-check','scripts/food/launch-readiness.template.json'],{encoding:'utf8'});
 assert.equal(r.status,2);const report=JSON.parse(r.stdout);
 assert.equal(report.status,'BLOCKED');assert.equal(report.publicCheckoutEnabled,false);
 assert.ok(report.finance.every(x=>x.amount===null));assert.equal(report.engineering.find(x=>x.key==='testModeEndToEnd').status,'UNVERIFIED');
 const current=spawnSync(process.execPath,['--import','tsx','scripts/food/launch-readiness.mjs','operations','--json'],{encoding:'utf8',timeout:30000});
 assert.equal(current.status,2,current.stderr);const operational=JSON.parse(current.stdout);
 assert.equal(operational.status,'BLOCKED');assert.equal(operational.summary.paymentProvider,'DEFERRED');
 assert.equal(operational.providerHistory.scope,'LOCAL_TEST_DURABILITY');
 assert.equal(operational.summary.launchAuthorization,'NOT GRANTED');
});
