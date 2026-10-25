import test,{before} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {runReadinessEngineeringChecks,collectOperationalReadiness,operationalReadinessSummary} from './private-readiness-evidence.mjs';
import {syntheticCosting} from './order-simulation';
import {requirements} from './launch-readiness.mjs';
let proof:object;
before(async()=>{proof=await runReadinessEngineeringChecks(['engine']);});

test('current executed test receipt gives scoped engineering PASS, never provider or production PASS',async()=>{
 const r=await collectOperationalReadiness({engineeringReceipt:proof});
 assert.equal(r.gates.find(g=>g.id==='order-state-machine')?.status,'PASS');
 assert.equal(r.engineeringExecution?.tests,42);
 assert.ok(r.gates.filter(g=>g.group==='provider').every(g=>g.status==='UNVERIFIED'));
 assert.equal(r.status,'BLOCKED');assert.equal(r.publicCheckoutEnabled,false);assert.equal(r.summary.launchAuthorization,'NOT GRANTED');
 assert.ok(r.gates.every(g=>g.id&&g.title&&g.evidenceType&&Array.isArray(g.missingRequirements)&&typeof g.ownerApprovalNeeded==='boolean'));
 assert.equal(r.actualRevenueMinor,null);assert.equal(r.operatingProfitMinor,null);
});

test('fabricated, serialized and stale test evidence cannot satisfy engineering gates',async()=>{
 for(const value of [{outcome:'PASS',verifiedAt:new Date().toISOString()},JSON.parse(JSON.stringify(proof))]) {
  assert.equal((await collectOperationalReadiness({engineeringReceipt:value})).engineeringPasses.length,0);
 }
 const later=new Date(Date.now()+2*86400000).toISOString();
 const r=await collectOperationalReadiness({engineeringReceipt:proof,now:later});
 assert.equal(r.engineeringPasses.length,0);assert.equal(r.engineeringExecution?.reason,'STALE_TEST_EXECUTION');
 await assert.rejects(runReadinessEngineeringChecks(['unknown']),/Known unique/);
});

test('actual canonical menu blockers and recipe-lab gaps are ingested without invented approvals',async()=>{
 const r=await collectOperationalReadiness({recipeFile:'scripts/food/recipe-lab.template.json'});
 assert.equal(r.gates.find(g=>g.id==='price-approval')?.status,'BLOCKED');
 assert.equal(r.gates.find(g=>g.id==='allergen-review')?.status,'BLOCKED');
 assert.equal(r.recipeObservations.length,1);assert.ok(r.recipeObservations[0].gaps.length>0);
 assert.equal(r.gates.find(g=>g.id==='freezer-reheat-quality')?.status,'UNVERIFIED');
 assert.match(operationalReadinessSummary(r),/PUBLIC CHECKOUT: DISABLED/);
 assert.ok(r.requiredOwnerActions.some(a=>a.gate==='texas-food-regulatory-review'));
});

test('validated manual approval assertions and entered costing remain separate from verified launch evidence',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'food-readiness-evidence-'));
 try {
 const launch=join(directory,'launch.json'),cost=join(directory,'cost.json');
 const approval={status:'PASS',evidenceReference:'MANUAL_ASSERTION_DO_NOT_PROMOTE'};
 const record={schemaVersion:1,productId:'food-product:southwest-harvest-bowl',productVersion:1,
  ...Object.fromEntries(Object.entries(requirements).map(([group,keys])=>[group,Object.fromEntries(keys.map(key=>[key,approval]))])),
  launchAuthorization:{...approval,authorizedBy:'asserted-owner',authorizedOn:'2026-10-22',productId:'food-product:southwest-harvest-bowl',productVersion:1}};
 await writeFile(launch,JSON.stringify(record));await writeFile(cost,JSON.stringify(syntheticCosting()));
 const r=await collectOperationalReadiness({launchFile:launch,costFile:cost});
 assert.equal(r.summary.launchAuthorization,'NOT GRANTED');assert.equal(r.summary.financialReadiness,'BLOCKED');
 assert.equal(r.costing?.classification,'ENTERED_ESTIMATE_NOT_RECEIPT_VERIFIED');
 assert.equal(r.gates.find(g=>g.id==='receipt-based-ingredients')?.status,'UNVERIFIED');
 assert.doesNotMatch(JSON.stringify(r),/MANUAL_ASSERTION_DO_NOT_PROMOTE/);
 await writeFile(cost,'{"status":"PASS"}');const invalid=await collectOperationalReadiness({costFile:cost});
 assert.equal(invalid.gates.find(g=>g.id==='receipt-based-ingredients')?.status,'BLOCKED');assert.equal(invalid.costing,null);
 }finally{await rm(directory,{recursive:true});}
});
