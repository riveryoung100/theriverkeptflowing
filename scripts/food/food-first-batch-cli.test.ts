import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TABLE_CATALOG} from '../../src/lib/food/table-catalog';
import {initialRecipeOperations} from './operating-system';
import {makeEvent,extendHistory} from './food-first-batch-cli';
import {projectFirstBatch,trialReport,sauceComparison} from './food-first-batch';
const base=()=>({recipe:initialRecipeOperations(),catalog:TABLE_CATALOG[0],batch:null,targetServings:null,ingredientInventory:[],window:null,deliveryPolicy:null,deliveryRequest:null,now:null,quantity:1});
const identity={batchId:'trial:sw-harvest-a',candidate:'A' as const};
const date='2026-10-23T12:00:00.000Z';
test('init validates using original canonical trial engine; launch stays blocked',()=>{
 const b=base(),events=extendHistory(b,[],'init',{purpose:'Owner experimental kitchen test'},identity,date,'owner:initial');const s=projectFirstBatch(b,events),report=trialReport(s);
 assert.equal(s.revision,1);assert.equal(report.launchStatus,'BLOCKED');assert.equal(report.finance.status,'INCOMPLETE');assert.equal(report.feta,'EXCLUDED');assert.equal(report.portions.length,0);
});
test('history tamper and action mismatch are rejected',()=>{
 const b=base(),events=extendHistory(b,[],'init',{purpose:'Owner experimental kitchen test'},identity,date,'owner:initial');
 assert.throws(()=>projectFirstBatch(b,[{...events[0],fingerprint:'0'.repeat(64)}]));
 assert.throws(()=>extendHistory(b,events,'init',{purpose:'Duplicate'},identity,date,'owner:second'));
});
test('invalid recipe fingerprint is rejected',()=>{
 const b=base();assert.throws(()=>makeEvent(b,[],'init',{purpose:'Test'},{batchId:'invalid?',candidate:'A'},date,'owner:initial'));
});
test('experimental sauce comparison does not grant canonical adoption',()=>{
 const b=base(),a=projectFirstBatch(b,extendHistory(b,[],'init',{purpose:'Owner experimental kitchen test'},identity,date,'owner:initial'));
 const result=sauceComparison([a]);assert.ok(result.every(r=>r.selectedForCanonicalAdoption===false&&r.safetyApproval===false));
});
