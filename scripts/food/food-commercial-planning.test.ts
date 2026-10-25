import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialRecipeOperations} from './operating-system';
import {TABLE_CATALOG} from '../../src/lib/food/table-catalog';
import {productDecisionReview,kitchenChecklist,weeklyProfit,weeklyTemplate} from './food-commercial-planning';
import {demandCapacity,comparePackaging,packageFields} from './food-pilot-planning';
import {readCommercialSource} from './food-commercial-command';
import {validateFoodRecipeDraft} from '../../src/lib/food/draft-domain';
import type {RecipeOperations} from './food-operations';
const recipe=()=>initialRecipeOperations();
const wb=()=>({recipe:recipe(),catalog:TABLE_CATALOG[0],batch:null,targetServings:null,ingredientInventory:[],window:null,deliveryPolicy:null,deliveryRequest:null,now:null,quantity:1});
test('owner proposal preserves all captured source data and history',()=>{
 const source=wb(),before=JSON.stringify(source),p=productDecisionReview(source);
 assert.equal(JSON.stringify(source),before);assert.equal(p.status,'PROPOSED_NOT_APPROVED');
 assert.deepEqual(p.explicitlyExcluded,['Feta cheese']);assert.match(p.sauce,/above rice/);
 assert.equal(p.downstreamEvidenceStatus,'STALE_FOR_PROPOSED_FORMULATION');assert.equal(p.publicCheckoutEnabled,false);
});
test('kitchen checklist reports exact canonical ingredient lines without invented grams',()=>{
 const k=kitchenChecklist(wb());assert.equal(k.ingredients.length,recipe().recipe.ingredients!.length);
 assert.ok(k.ingredients.every(i=>i.measuredGrams===null));assert.equal(k.gramsPerPortion,null);
});
test('unknown expenses never produce profit or zero costs',()=>{
 const r=recipe(),p=weeklyProfit(r,weeklyTemplate(r));assert.equal(p.status,'INSUFFICIENT DATA');
 assert.equal(p.goalBowls,null);assert.ok(p.scenarios.every(s=>s.variableCostsMinor===null&&s.operatingProfitBeforeTaxMinor===null));
 assert.deepEqual(p.scenarios.map(s=>s.bowls),[25,30,40,50,60,75]);
});
test('rejects stale economics and invalid goals',()=>{
 const r=recipe(),p=weeklyTemplate(r);assert.throws(()=>weeklyProfit(r,{...p,recipeFingerprint:'stale'}));
 for(const n of [-1,NaN,Infinity,0.5])assert.throws(()=>weeklyProfit(r,p,n));
});
test('rejects negative, fractional cents and false known costs',()=>{
 const r=recipe(),p=weeklyTemplate(r);
 for(const n of [-1,0.5,Infinity])assert.throws(()=>weeklyProfit(r,{...p,price:{minorUnits:n,state:'KNOWN',sourceReference:'receipt:test'}}));
 assert.throws(()=>weeklyProfit(r,{...p,price:{minorUnits:null,state:'KNOWN',sourceReference:'receipt:test'}}));
});
test('demand separates interest and capacity; creates no orders',()=>{
 const p=demandCapacity({recipeFingerprint:'a'.repeat(64),capacityBowls:25,observations:[{reference:'cohort:1',status:'INTERESTED',people:10,bowls:30,area:'area:north',timing:'timing:weekend',channel:'channel:local',sourceReference:'survey:1'}]});
 assert.equal(p.planningShortfall,5);assert.equal(p.actualSales,null);assert.equal(p.reservationsCreated,0);
});
test('demand rejects personal information fields and duplicate cohorts',()=>{
 const row={reference:'cohort:1',status:'UNKNOWN',people:1,bowls:0,area:'area:north',timing:'timing:unknown',channel:'channel:local',sourceReference:'survey:1'};
 assert.throws(()=>demandCapacity({recipeFingerprint:'a'.repeat(64),capacityBowls:null,observations:[{...row,email:'private@example.test'}]}));
 assert.throws(()=>demandCapacity({recipeFingerprint:'a'.repeat(64),capacityBowls:null,observations:[row,row]}));
});
test('package comparison preserves unknown prices and never approves supplier claims',()=>{
 const row={reference:'tray:1',component:'main-meal',...Object.fromEntries(packageFields.map(k=>[k,null]))};
 const p=comparePackaging({recipeFingerprint:'a'.repeat(64),candidates:[row]});
 assert.equal(p.approved,false);assert.ok(p.candidates[0].missing.includes('foodContactEvidence'));
 assert.throws(()=>comparePackaging({recipeFingerprint:'a'.repeat(64),candidates:[{...row,capacityMl:500,usableFillMl:600}]}));
 assert.throws(()=>comparePackaging({recipeFingerprint:'a'.repeat(64),candidates:[{...row,capacityMl:0}]}));
});
test('private source reader rejects traversal and public paths',async()=>{
 for(const name of ['package.json','.river-dev/state/../../package.json','public/operator.json'])await assert.rejects(readCommercialSource(name));
});

test('golden synthetic weekly case uses canonical ingredient cost, labor, overhead and full batches',()=>{
 const draft=validateFoodRecipeDraft({id:'food-recipe:synthetic-profit',version:1,ingredients:[{kind:'simple',name:'Synthetic test ingredient'}],evidence:[]});
 const r:RecipeOperations={...recipe(),recipe:draft,formulation:{id:draft.id,version:1,composition:[{kind:'ingredient',ingredientIndex:0,grams:1000}],method:['Synthetic test only'],yieldGrams:1000},portionGrams:200,servings:5,state:'MEASURED',
  ingredientCosts:[{ingredient:{kind:'recipe',id:draft.id,version:1,ingredientIndex:0},source:{sourceReference:'synthetic:receipt',version:1},purchase:{currency:'USD',minorUnits:1000},purchasedGrams:1000}]};
 const p=weeklyTemplate(r),known=(n:number)=>({minorUnits:n,state:'KNOWN' as const,sourceReference:'synthetic:test'});
 p.price=known(1000);p.fixedWeekly=known(10000);p.laborPerBowl=known(100);
 for(const k of Object.keys(p.expenses) as (keyof typeof p.expenses)[])p.expenses[k]=known(10);
 const result=weeklyProfit(r,p),s=result.scenarios.find(s=>s.bowls===50)!;
 assert.equal(result.variablePerBowlMinor,400);assert.equal(result.goalBowls,50);assert.equal(result.breakEvenBowls,17);
 assert.equal(s.revenueMinor,50000);assert.equal(s.operatingProfitBeforeTaxMinor,20000);assert.equal(s.requiredBatches,10);
 assert.equal(s.ingredientPurchasing![0].grams,10000);assert.equal(result.status,'ESTIMATED');assert.equal(result.realRevenueMinor,null);
 const noOverhead=weeklyProfit(r,{...p,fixedWeekly:{minorUnits:null,state:'UNKNOWN',sourceReference:null}});
 assert.equal(noOverhead.variablePerBowlMinor,400);assert.equal(noOverhead.contributionPerBowlMinor,600);
 assert.equal(noOverhead.goalBowls,null);assert.equal(noOverhead.scenarios[0].operatingProfitBeforeTaxMinor,null);
 p.price=known(300);const loss=weeklyProfit(r,p);assert.equal(loss.goalBowls,null);assert.equal(loss.breakEvenBowls,null);
 assert.ok(loss.scenarios.every(s=>s.operatingProfitBeforeTaxMinor!<0));
 p.price=known(Number.MAX_SAFE_INTEGER);assert.throws(()=>weeklyProfit(r,p),/overflow/);
});
