import test from 'node:test';
import assert from 'node:assert/strict';
import {initialRecipeOperations} from './operating-system';
import {TABLE_CATALOG} from '../../src/lib/food/table-catalog';
import {applyPrivateFoodEvidence,draftIntakeCommand} from './food-evidence-intake';
import {inspectRecipeOperations} from './food-operations';
import {inspectPrivateFoodWorkbench} from './food-operations-workbench';

const base=()=>({recipe:initialRecipeOperations(),catalog:TABLE_CATALOG[0],batch:null,targetServings:null,ingredientInventory:[],window:null,deliveryPolicy:null,deliveryRequest:null,now:null,quantity:1});
function act(b:ReturnType<typeof base>,kind:Parameters<typeof draftIntakeCommand>[1],details:Record<string,unknown>){
 const result=applyPrivateFoodEvidence(b,{...draftIntakeCommand(b,kind),...details});
 return result.record as ReturnType<typeof base>;
}
function measured(){let b=base();for(let i=0;i<b.recipe.recipe.ingredients!.length;i++){
 b=act(b,'ingredient-measurement',{ingredientIndex:i,grams:100,sourceReference:`synthetic-scale-${i}`});
 }
 return act(b,'measured-yield',{yieldGrams:600,portionGrams:200,servings:3,method:['Synthetic private batch method'],captureSource:'food-prototype-capture:synthetic-test',storage:'frozen'});
}
test('initial template is strictly unverified and contains no fabricated measurements',()=>{
 const command=draftIntakeCommand(base(),'ingredient-measurement');assert.ok('grams' in command && 'sourceReference' in command);assert.equal(command.grams,null);assert.equal(command.sourceReference,'');
 assert.equal(inspectPrivateFoodWorkbench(base()).publicCheckoutEnabled,false);
});
test('a real mass note updates a new draft but cannot infer yield or ingredient provenance',()=>{
 const initial=base(),next=act(initial,'ingredient-measurement',{ingredientIndex:0,grams:230,sourceReference:'synthetic-scale-record'});
 assert.equal(initial.recipe.measurements.length,0);assert.equal(next.recipe.measurements[0].grams,230);
 assert.equal(inspectRecipeOperations(next.recipe).measured,false);assert.equal(next.recipe.formulation,null);
 assert.equal(inspectPrivateFoodWorkbench(next).publicCheckoutEnabled,false);
});
test('stale draft fingerprint and wrong recipe binding prevent updates',()=>{
 const old=base(),newer=act(old,'ingredient-measurement',{ingredientIndex:0,grams:200,sourceReference:'synthetic-scale'});
 const stale={...draftIntakeCommand(old,'ingredient-measurement'),ingredientIndex:1,grams:200,sourceReference:'synthetic-other'};
 assert.throws(()=>applyPrivateFoodEvidence(newer,stale),/Stale/);
 assert.throws(()=>applyPrivateFoodEvidence(old,{...stale,recipeId:'food-recipe:wrong'}),/Stale/);
});
test('duplicate mass input cannot silently replace measured source',()=>{
 const x=act(base(),'ingredient-measurement',{ingredientIndex:0,grams:200,sourceReference:'synthetic-one'});
 assert.throws(()=>act(x,'ingredient-measurement',{ingredientIndex:0,grams:350,sourceReference:'synthetic-two'}),/overwritten/);
});
test('ingredient source must tie to the exact measured source and requires explicit recall status',()=>{
 const x=act(base(),'ingredient-measurement',{ingredientIndex:0,grams:100,sourceReference:'synthetic-weight'});
 const source={ingredientIndex:0,ingredientId:'synthetic-ingredient-0',revision:1,preparationState:'raw',supplierReference:'synthetic-supplier',measurementReference:'synthetic-weight',recalled:false,crossContact:'UNKNOWN',crossContactReference:null};
 assert.throws(()=>act(x,'ingredient-source',{...source,measurementReference:'synthetic-other'}),/bind/);
 const updated=act(x,'ingredient-source',source);assert.equal(updated.recipe.ingredientSources[0].crossContact,'UNKNOWN');
 assert.equal(inspectPrivateFoodWorkbench(updated).launchStatus,'BLOCKED');
 assert.throws(()=>act(x,'ingredient-source',{...source,crossContact:'REVIEWED'}),/reference/);
});
test('measured yield requires every ingredient, real method, source capture and compatible portions',()=>{
 const incomplete=base();assert.throws(()=>act(incomplete,'measured-yield',{yieldGrams:1000,portionGrams:200,servings:5,method:['Measured method'],captureSource:'food-prototype-capture:synthetic-test',storage:'frozen'}),/All ingredient masses/);
 let b=base();for(let i=0;i<b.recipe.recipe.ingredients!.length;i++)b=act(b,'ingredient-measurement',{ingredientIndex:i,grams:100,sourceReference:`synthetic-scale-${i}`});
 assert.throws(()=>act(b,'measured-yield',{yieldGrams:600,portionGrams:200,servings:4,method:['Measured method'],captureSource:'food-prototype-capture:synthetic-test',storage:'frozen'}),/Servings/);
 const complete=act(b,'measured-yield',{yieldGrams:600,portionGrams:200,servings:3,method:['Measured method'],captureSource:'food-prototype-capture:synthetic-test',storage:'frozen'});
 assert.equal(complete.recipe.state,'MEASURED');assert.equal(complete.recipe.formulation?.yieldGrams,600);
 assert.equal(inspectPrivateFoodWorkbench(complete).launchStatus,'BLOCKED');
});
test('measured formulation is never edited in place, even with owner mass evidence',()=>{
 const b=measured();assert.throws(()=>act(b,'ingredient-measurement',{ingredientIndex:0,grams:200,sourceReference:'synthetic-changed'}),/in place/);
 assert.throws(()=>act(b,'measured-yield',{yieldGrams:600,portionGrams:200,servings:3,method:['Another method'],captureSource:'food-prototype-capture:synthetic-test',storage:'frozen'}),/already measured/);
});
test('verified receipt must match exact supplier and measured ingredient; expenses remain unknown',()=>{
 let b=measured();const source={ingredientIndex:0,ingredientId:'synthetic-ingredient',revision:1,preparationState:'raw',supplierReference:'synthetic-supplier',measurementReference:'synthetic-scale-0',recalled:false,crossContact:'UNKNOWN',crossContactReference:null};
 b=act(b,'ingredient-source',source);
 const p={id:'synthetic-purchase-1',revision:1,supplierReference:'synthetic-supplier',purchasedOn:'2026-10-22',receiptReference:'synthetic-receipt-1',quantity:1,unit:'kg',packs:1,usableGrams:950,totalMinor:800,taxAndFeesMinor:0,currency:'USD',verification:'VERIFIED'};
 assert.throws(()=>act(b,'verified-purchase',{ingredientIndex:0,purchase:{...p,supplierReference:'synthetic-other'}}),/supplier/);
 assert.throws(()=>act(b,'verified-purchase',{ingredientIndex:0,purchase:{...p,taxAndFeesMinor:null}}),/Complete receipt/);
 const bought=act(b,'verified-purchase',{ingredientIndex:0,purchase:p});
 assert.equal(bought.recipe.ingredientCosts.length,1);assert.equal(inspectRecipeOperations(bought.recipe).finance.variableCostMinor,null);
 assert.throws(()=>act(bought,'verified-purchase',{ingredientIndex:0,purchase:p}),/reprice/);
});
test('recorded nonnegative operating expense is explicit; unknown cost never defaults to zero',()=>{
 const x=act(base(),'operating-expense',{expense:'packaging',minorUnits:0,sourceReference:'synthetic-no-packaging-record',knowledge:'ESTIMATED'});
 assert.equal(x.recipe.expenses.packaging.minorUnits,0);assert.equal(x.recipe.expenses.packaging.state,'ESTIMATED');
 assert.equal(x.recipe.expenses.delivery.state,'UNKNOWN');
 assert.throws(()=>act(x,'operating-expense',{expense:'packaging',minorUnits:1,sourceReference:'synthetic-new',knowledge:'KNOWN'}),/overwritten/);
 assert.throws(()=>act(base(),'operating-expense',{expense:'delivery',minorUnits:-2,sourceReference:'synthetic-new',knowledge:'KNOWN'}),/nonnegative/);
});
test('unexpected properties, forged approval and unsupported evidence commands are rejected',()=>{
 const x=base();assert.throws(()=>applyPrivateFoodEvidence(x,{...draftIntakeCommand(x,'ingredient-measurement'),grams:100,sourceReference:'synthetic',bypass:true}),/unsupported/);
 assert.throws(()=>act({...x,recipe:{...x.recipe,state:'APPROVED'}},'ingredient-measurement',{grams:100,sourceReference:'synthetic'}),/Reviewed or approved/);
 assert.throws(()=>applyPrivateFoodEvidence(x,{kind:'approve-checkout',recipeId:x.recipe.recipe.id,recipeVersion:1,expectedFingerprint:'x'}),/Unsupported/);
});
