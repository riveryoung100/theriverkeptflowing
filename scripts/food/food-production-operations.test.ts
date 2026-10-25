import test from 'node:test';
import assert from 'node:assert/strict';
import {LocalMiniflareD1} from './local-miniflare-d1';
import {initialRecipeOperations} from './operating-system';
import {recipeFingerprint,type RecipeOperations} from './food-operations';
import {validateFoodRecipeDraft,parseFoodRecipeId} from '../../src/lib/food/draft-domain';
import {modelFingerprint} from '../../src/lib/food/table-capacity-model';
import {planProduction,productionReadiness,openFoodOperations,type BatchOperations} from './food-production-operations';

function recipe():RecipeOperations {
 const r=initialRecipeOperations();
 return {...r,recipe:validateFoodRecipeDraft({id:'food-recipe:isolated-production',version:1,
  ingredients:[{kind:'simple',name:'Synthetic private input'}],evidence:[]}),
  formulation:{id:parseFoodRecipeId('food-recipe:isolated-production'),version:1,composition:[{kind:'ingredient',ingredientIndex:0,grams:1000}],
   method:['SYNTHETIC ONLY'],yieldGrams:1000},portionGrams:200,servings:5,state:'MEASURED'};
}
const at=(hour:number)=>`2026-10-22T${String(hour).padStart(2,'0')}:00:00.000Z`;
function initialBatch(r:RecipeOperations):BatchOperations {
 return {id:'synthetic-batch-operations',version:1,recipe:{id:r.recipe.id,version:r.recipe.version,fingerprint:recipeFingerprint(r)},
  state:'PLANNED',plannedAt:at(10),scheduledAt:at(11),targetServings:5,expectedYieldGrams:1000,actual:null,safety:[],review:null,productionEvidence:null};
}
function actual() {return {startedAt:at(11),finishedAt:at(12),yieldGrams:1000,portions:5,laborMinutes:60,
 storage:'refrigerated' as const,storageStartedAt:at(12),discardAt:null,packagingReference:'synthetic-packaging-evidence',measurementReference:'synthetic-scale-evidence'};}

test('production planning cannot invent physical inventory from theoretical yield',()=>{
 const p=planProduction(recipe(),5,[]);
 assert.equal(p.expectedYieldGrams,1000);assert.equal(p.requirements[0].shortfallGrams,null);
 assert.equal(p.inventoryReserved,false);assert.equal(p.saleAuthorized,false);
});
test('recorded inventory shortfall is calculated but never released for sale',()=>{
 const p=planProduction(recipe(),5,[{ingredientIndex:0,grams:750,sourceReference:'synthetic-stock-count'}]);
 assert.equal(p.requirements[0].shortfallGrams,250);assert.equal(p.saleAuthorized,false);
});
test('batch plans cannot pass as reviewed or safe without measured evidence',()=>{
 const r=recipe(),b=initialBatch(r);
 const ready=productionReadiness(b,r);assert.equal(ready.availableUnits,null);assert.equal(ready.reservable,false);
 assert.equal(ready.foodSafetyCertified,false);
 assert.throws(()=>productionReadiness({...b,state:'REVIEWED'},r),/measured|Actual/);
});
test('immutable local workerd history supports production transitions and restart',async t=>{
 const db=await LocalMiniflareD1.create();t.after(()=>db.close());const r=recipe();let store=await openFoodOperations(db);
 await store.append('recipe-first','recipe',r,0);
 let b=initialBatch(r);await store.append('batch-plan','batch',b,1);
 b={...b,version:2,state:'IN_PROGRESS'};await store.append('batch-start','batch',b,2);
 b={...b,version:3,state:'MEASURED',actual:actual()};await store.append('batch-measured','batch',b,3);
 const safety=[{at:at(12),temperatureC:null,sourceReference:'synthetic-thermometer-note',procedureReference:null,deviationReference:null,correctiveActionReference:null}];
 b={...b,version:4,state:'REVIEWED',safety,
  review:{sourceReference:'synthetic-owner-review',reviewer:'synthetic-reviewer',at:at(13),fingerprint:modelFingerprint({actual:b.actual,safety})}};
 await store.append('batch-review','batch',b,4);
 await db.restart();store=await openFoodOperations(db);
 const history=await store.list();assert.equal(history.length,5);
 assert.equal((await store.get('batch',b.id,1)).state,'PLANNED');
 assert.equal((await store.get('batch',b.id,4)).state,'REVIEWED');
 assert.equal((await store.append('batch-review','batch',b,0)).replay,true);
 assert.equal(productionReadiness(b,r).availableUnits,null);
});
test('stale head and conflicting writes cannot silently mutate immutable batch history',async t=>{
 const db=await LocalMiniflareD1.create();t.after(()=>db.close());const r=recipe(),store=await openFoodOperations(db);const b=initialBatch(r);
 await store.append('recipe-save','recipe',r,0);
 const results=await Promise.allSettled([store.append('same-batch-a','batch',b,1),store.append('same-batch-b','batch',b,1)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal((await store.list()).length,2);
 await assert.rejects(store.append('stale-revision','batch',{...b,version:3,state:'MEASURED',actual:actual()},2),/Consecutive|revision|previous/i);
 await assert.rejects(store.append('same-batch-a','batch',{...b,targetServings:4},2),/conflict|yield/i);
});
test('failed DB append cannot falsely acknowledge a measured batch',async t=>{
 const db=await LocalMiniflareD1.create();t.after(()=>db.close());const r=recipe(),store=await openFoodOperations(db);
 await store.append('source-recipe','recipe',r,0);
 await db.prepare("CREATE TRIGGER synthetic_batch_interrupt BEFORE INSERT ON table_food_operations_local WHEN NEW.kind='batch' BEGIN SELECT RAISE(ABORT,'synthetic interruption'); END").all();
 await assert.rejects(store.append('blocked-batch','batch',initialBatch(r),1),/interruption/);
 assert.equal(await store.get('batch','synthetic-batch-operations',1),null);
 await db.prepare('DROP TRIGGER synthetic_batch_interrupt').all();
 assert.equal((await store.append('blocked-batch','batch',initialBatch(r),1)).replay,false);
});
