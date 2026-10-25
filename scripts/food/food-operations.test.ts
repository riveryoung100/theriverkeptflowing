import test from 'node:test';
import assert from 'node:assert/strict';
import {massInGrams,purchaseCostProfile,inspectRecipeOperations,scaleRecipePlan,recipeFingerprint,privateMealPlan,portionNutrition,type RecipeOperations,type PurchaseEvidence} from './food-operations';
import {initialRecipeOperations,operatingReport} from './operating-system';
import {syntheticAuthority} from './order-simulation';
import {planProduction,validateBatchOperations,productionReadiness,openFoodOperations,inspectOperationalFulfillment,type BatchOperations} from './food-production-operations';
import {LocalMiniflareD1} from './local-miniflare-d1';
import {validateFoodRecipeDraft} from '../../src/lib/food/draft-domain';
import {collectOperationalReadiness} from './private-readiness-evidence.mjs';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

// Invented numbers only for explicitly synthetic tests; no business inputs created.
function fixture(yieldGrams=1000):RecipeOperations {
 const base=initialRecipeOperations(),recipe=validateFoodRecipeDraft({id:'food-recipe:synthetic-measured',version:1,ingredients:[{kind:'simple' as const,name:'Synthetic ingredient'}],evidence:[]});
 const ref={kind:'recipe' as const,id:recipe.id as RecipeOperations['recipe']['id'],version:1,ingredientIndex:0};
 const known=(value:number)=>({state:'known' as const,value});
 return {...base,recipe,formulation:{id:recipe.id,version:1,
  composition:[{kind:'ingredient',ingredientIndex:0,grams:1000}],method:['Synthetic measured process'],yieldGrams},
  portionGrams:200,servings:yieldGrams/200,storage:'frozen',state:'MEASURED',
  ingredientSources:[{ingredientIndex:0,ingredientId:'synthetic-ingredient',revision:1,preparationState:'measured',supplierReference:'synthetic-supplier',measurementReference:'synthetic-scale',recalled:false,crossContact:'REVIEWED',crossContactReference:'synthetic-cross-contact'}],
  ingredientCosts:[{ingredient:ref,source:{sourceReference:'synthetic-receipt',version:1},purchase:{currency:'USD',minorUnits:1000},purchasedGrams:1000}],
  nutrientProfiles:[{ingredient:ref,basisGrams:100,source:{sourceReference:'synthetic-nutrients',version:1},nutrients:{energyKcal:known(100),proteinGrams:known(5),carbohydrateGrams:known(10),fatGrams:known(2)},completeness:'complete',
   allergens:{review:{state:'reviewed',declarations:[]},disclosureComplete:true,evidence:{source:{sourceReference:'synthetic-allergens',version:1},reviewDate:'2026-10-22',reviewer:'synthetic-reviewer'}}}],nutritionConfidence:'ESTIMATED'};
}
const purchase=():PurchaseEvidence=>({id:'synthetic-purchase',revision:1,supplierReference:'synthetic-supplier',purchasedOn:'2026-10-22',receiptReference:'synthetic-receipt',quantity:1,unit:'kg',packs:2,usableGrams:1800,totalMinor:900,taxAndFeesMinor:0,currency:'USD',verification:'VERIFIED'});
function batch(r=fixture()):BatchOperations{return {id:'synthetic-batch',version:1,recipe:{id:r.recipe.id,version:r.recipe.version,fingerprint:recipeFingerprint(r)},state:'PLANNED',plannedAt:'2026-10-22T14:00:00.000Z',scheduledAt:'2026-10-22T15:00:00.000Z',targetServings:5,expectedYieldGrams:1000,actual:null,safety:[],review:null,productionEvidence:null};}

for(const [yieldGrams,count] of [[1000,5],[1400,7]])test(`${yieldGrams} measured grams produce ${count} exact 200g portions`,()=>{
 const r=fixture(yieldGrams),info=inspectRecipeOperations(r);assert.equal(info.yieldProjection?.fullPortionCount,count);assert.deepEqual(info.yieldProjection?.remainderGrams,{numerator:'0',denominator:'1'});
});
test('unknown yield and incomplete real catalog stay explicitly blocked',()=>{
 const r=initialRecipeOperations();assert.equal(inspectRecipeOperations(r).measured,false);assert.throws(()=>scaleRecipePlan(r,2));
 const report=operatingReport(r);assert.equal(report.inputStatus,'NO VERIFIED PRODUCT INPUTS');assert.equal(report.publicCheckoutEnabled,false);assert.ok(report.priorities.length>0);assert.equal(report.label?.nutritionFacts,null);
});
test('partial ingredient measurements persist before yield is known without guessed density',()=>{
 const r=initialRecipeOperations();r.measurements=[{ingredientIndex:0,grams:null,quantity:1,unit:'cup',sourceReference:'synthetic-cup-note'}];
 assert.equal(inspectRecipeOperations(r).measured,false);assert.equal(inspectRecipeOperations(r).recipe.measurements[0].grams,null);
 const measured=fixture();measured.measurements=[{ingredientIndex:0,grams:999,quantity:999,unit:'g',sourceReference:'synthetic-scale'}];
 assert.throws(()=>inspectRecipeOperations(measured),/disagree/);
});
for(const value of [0,-1,NaN,Infinity])test(`invalid measured amount ${value} is rejected`,()=>{assert.throws(()=>scaleRecipePlan(fixture(),value));assert.throws(()=>portionNutrition(fixture(),value));});
test('scaling preserves exact proportions but never inherits approval or invents actual yield',()=>{
 const scaled=scaleRecipePlan(fixture(),1.4);assert.equal(scaled.formulation.composition[0].grams,1400);assert.equal(scaled.formulation.yieldGrams,1400);assert.equal(scaled.approvalInherited,false);assert.equal(scaled.measuredActualYieldGrams,null);
});
test('mass conversion handles multipacks/kg/oz/lb and rejects guessed density',()=>{
 assert.equal(massInGrams(1,'kg',2),2000);assert.equal(massInGrams(16,'oz'),massInGrams(1,'lb'));
 assert.throws(()=>massInGrams(1,'cup' as 'g'));assert.throws(()=>massInGrams(Infinity,'g'));assert.throws(()=>massInGrams(1,'g',0));
});
test('receipt costs retain measured usable quantity and explicit fees; unknown is not zero',()=>{
 const r=fixture(),ref=r.ingredientCosts[0].ingredient,p=purchase();const c=purchaseCostProfile(p,ref,r.recipe);
 assert.equal(c.state,'KNOWN');assert.equal(c.profile?.purchasedGrams,1800);assert.equal(c.profile?.purchase.minorUnits,900);
 assert.equal(purchaseCostProfile({...p,taxAndFeesMinor:null},ref,r.recipe).state,'UNKNOWN');
 assert.throws(()=>purchaseCostProfile({...p,usableGrams:2100},ref,r.recipe));assert.throws(()=>purchaseCostProfile({...p,currency:'EUR' as 'USD'},ref,r.recipe));
});
test('portion ingredient costs use the canonical rational engine and keep essential expenses unknown',()=>{
 const r=fixture(),before=inspectRecipeOperations(r);assert.equal(before.finance.ingredientCostMinor,200);assert.equal(before.finance.operatingProfitMinor,null);
 r.candidatePrice={currency:'USD',minorUnits:1000};for(const key of ['packaging','delivery','labor','processing','other','fixed'] as const)r.expenses[key]={state:'KNOWN',minorUnits:10,sourceReference:'synthetic-expense'};
 const info=inspectRecipeOperations(r);assert.equal(info.finance.variableCostMinor,250);assert.equal(info.finance.contributionMinor,750);assert.equal(info.finance.operatingProfitMinor,3740);
 assert.equal(info.hypotheticalPricing?.planningOnly,true);assert.equal(info.publicCheckoutEnabled,false);
});
test('source/recipe revision changes invalidate approval and preserve old derived snapshots',()=>{
 const r=fixture();r.state='APPROVED';r.review={fingerprint:recipeFingerprint(r),sourceReference:'synthetic-review',reviewer:'synthetic-owner',at:'2026-10-22T15:00:00.000Z'};
 const old=inspectRecipeOperations(r);assert.equal(old.approved,true);const snapshot=structuredClone(old);
 r.ingredientSources=[{...r.ingredientSources[0],revision:2}];assert.equal(inspectRecipeOperations(r).approved,false);assert.deepEqual(old,snapshot);
 const next={...fixture(),recipe:{...r.recipe,version:2},formulation:{...r.formulation!,version:2}};
 assert.throws(()=>inspectRecipeOperations(next),/context|mismatch/i);
});
test('unknown allergens, recall and source substitution cannot certify a recipe or label',()=>{
 const r=fixture();r.nutrientProfiles=[];assert.equal(inspectRecipeOperations(r).allergenStatus,'UNKNOWN');
 assert.ok(inspectRecipeOperations({...r,ingredientSources:[{...r.ingredientSources[0],recalled:true}]}).missing.some(s=>s.includes('recalled')));
 const real=operatingReport(initialRecipeOperations());assert.equal(real.label?.approvedForPrint,false);assert.equal(real.label?.allergens,null);
});
test('nutrition and optional planning reuse one recipe/portion arithmetic without health inputs',()=>{
 const r=fixture();assert.equal(portionNutrition(r,200).nutrients.energyKcal,200);assert.equal(portionNutrition(r,100).nutrients.proteinGrams,5);
 const plan=privateMealPlan(r,[{grams:200,count:3}]);assert.equal(plan.totals.energyKcal,600);assert.equal(plan.healthInformationRequired,false);
 r.nutrientProfiles=[];assert.equal(privateMealPlan(r,[{grams:200,count:2}]).totals.energyKcal,null);assert.equal(portionNutrition(r,200).labelAuthorized,false);
});
test('batch plan derives required ingredients/shortfalls without creating inventory',()=>{
 const plan=planProduction(fixture(),7,[{ingredientIndex:0,grams:1000,sourceReference:'synthetic-count'}]);assert.equal(plan.requirements[0].grams,1400);assert.equal(plan.requirements[0].shortfallGrams,400);assert.equal(plan.actualProductionRecorded,false);
 assert.equal(planProduction(fixture(),5,[]).requirements[0].shortfallGrams,null);
 assert.equal(productionReadiness(batch(),fixture()).availableUnits,null);
});
test('actual batch output, chronology and review are explicit; no default safe temperatures',()=>{
 const r=fixture(),b=batch(r);assert.throws(()=>validateBatchOperations({...b,state:'MEASURED'},r));
 const actual={startedAt:'2026-10-22T15:00:00.000Z',finishedAt:'2026-10-22T16:00:00.000Z',yieldGrams:1000,portions:5,laborMinutes:60,storage:'frozen' as const,storageStartedAt:'2026-10-22T16:00:00.000Z',discardAt:null,packagingReference:'synthetic-packaging-v1',measurementReference:'synthetic-yield'};
 const measured={...b,state:'MEASURED',actual};assert.equal(productionReadiness(measured,r).foodSafetyCertified,false);
 assert.throws(()=>validateBatchOperations({...measured,actual:{...actual,portions:6}},r));
 assert.throws(()=>validateBatchOperations({...measured,state:'REVIEWED'},r));
});
test('fulfillment adapter uses existing pickup/delivery policy and never enables purchases',()=>{
 const authority=syntheticAuthority();assert.equal(inspectOperationalFulfillment(null,null,null,'2026-10-21T14:00:00.000Z',1).status,'UNCONFIGURED');
 const pickup=inspectOperationalFulfillment(authority.windows[0],null,null,'2026-10-21T14:00:00.000Z',1);assert.equal(pickup.status,'PICKUP_REVIEW_READY');assert.equal(pickup.publicCheckoutEnabled,false);
 assert.equal(inspectOperationalFulfillment({...authority.windows[0],closed:true},null,null,'2026-10-21T14:00:00.000Z',1).status,'UNAVAILABLE');
});
test('actual local D1 recipe/batch history, CAS races, immutable versions and restart',async t=>{
 const db=await LocalMiniflareD1.create();t.after(()=>db.close());let store=await openFoodOperations(db);const r=fixture();
 const saved=await store.append('recipe_one','recipe',r,0);assert.equal(saved.sequence,1);
 assert.equal((await store.append('recipe_one','recipe',r,0)).replay,true);
 await assert.rejects(store.append('recipe_one','recipe',{...r,portionGrams:100},1),/identity/);
 const races=await Promise.allSettled(['batch_a','batch_b'].map((id)=>store.append(id,'batch',{...batch(r),id},1)));
 assert.equal(races.filter(v=>v.status==='fulfilled').length,1);await db.restart();store=await openFoodOperations(db);
 assert.equal((await store.list()).length,2);assert.equal((await store.get('recipe',r.recipe.id,1)).portionGrams,200);
 const next={...r,recipe:{...r.recipe,version:2},formulation:{...r.formulation!,version:2},ingredientCosts:[],nutrientProfiles:[]};
 await store.append('recipe_two','recipe',next,2);assert.equal((await store.get('recipe',r.recipe.id,1)).portionGrams,200);
});
test('local D1 interruption cannot acknowledge an uncommitted recipe',async t=>{
 const db=await LocalMiniflareD1.create();t.after(()=>db.close());const store=await openFoodOperations(db);
 await db.prepare("CREATE TRIGGER ops_fail BEFORE INSERT ON table_food_operations_local BEGIN SELECT RAISE(ABORT,'synthetic operations fault'); END").all();
 await assert.rejects(store.append('recipe_fault','recipe',fixture(),0),/fault/);assert.equal(await store.head(),0);
 await db.prepare('DROP TRIGGER ops_fail').all();await store.append('recipe_fault','recipe',fixture(),0);assert.equal(await store.head(),1);
});
test('new measured source ingestion extends the existing private launch report without approving sales',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'food-operations-report-'));t.after(()=>rm(directory,{recursive:true}));const file=join(directory,'measured.json');
 await writeFile(file,JSON.stringify(initialRecipeOperations()));const r=await collectOperationalReadiness({businessFile:file});
 assert.equal(r.foodOperations?.inputStatus,'NO VERIFIED PRODUCT INPUTS');assert.ok(r.gates.some(g=>g.id==='operations-0'));assert.equal(r.publicCheckoutEnabled,false);
});
