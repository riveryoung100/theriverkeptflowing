import test from 'node:test';
import assert from 'node:assert/strict';
import {initialRecipeOperations} from './operating-system';
import {inspectPrivateFoodWorkbench} from './food-operations-workbench';
import {TABLE_CATALOG} from '../../src/lib/food/table-catalog';
import {syntheticAuthority} from './order-simulation';
function input(){return {recipe:initialRecipeOperations(),catalog:TABLE_CATALOG[0],batch:null,targetServings:null,ingredientInventory:[],window:null,deliveryPolicy:null,deliveryRequest:null,now:null,quantity:1};}
test('first real product remains blocked without measured ingredients, costs, safety and owner approval',()=>{
 const report=inspectPrivateFoodWorkbench(input());
 assert.equal(report.kind,'PRIVATE_FOOD_OPERATIONS_WORKBENCH');assert.equal(report.recipe.measured,false);
 assert.equal(report.costing.variableMinor,null);assert.equal(report.costing.realRevenueMinor,null);
 assert.equal(report.label.approvedForPrint,false);assert.equal(report.launchStatus,'BLOCKED');
 assert.equal(report.publicCheckoutEnabled,false);assert.equal(report.inventoryReleased,false);
 assert.ok(report.priorities.length>5);
});
test('missing measurements do not produce inventory or fictional portions',()=>{
 const report=inspectPrivateFoodWorkbench({...input(),targetServings:8});
 assert.equal(report.proposedProduction,null);assert.equal(report.actualProduction,null);
 assert.ok(report.priorities.some(v=>v.includes('measured recipe/portion')));
});
test('unconfigured delivery cannot be presented as approved',()=>{
 const report=inspectPrivateFoodWorkbench(input());assert.equal(report.fulfillment.status,'UNCONFIGURED');
 assert.ok(report.fulfillment.missing.length>0);
});
test('verified fixture pickup window can be reviewed without enabling checkout',()=>{
 const win=syntheticAuthority().windows[0];const report=inspectPrivateFoodWorkbench({...input(),window:win,now:'2026-10-21T14:00:00.000Z'});
 assert.equal(report.fulfillment.status,'PICKUP_REVIEW_READY');assert.equal(report.publicCheckoutEnabled,false);
});
test('catalog source cannot be substituted for a different recipe version',()=>{
 const base=input();assert.throws(()=>inspectPrivateFoodWorkbench({...base,recipe:{...base.recipe,recipe:{...base.recipe.recipe,id:'food-recipe:different'}}}),/recipe|context|binding|mismatch/i);
});
test('invalid operational input or missing delivery policy is blocked',()=>{
 assert.throws(()=>inspectPrivateFoodWorkbench({...input(),quantity:0}),/quantity/);
 assert.throws(()=>inspectPrivateFoodWorkbench({...input(),window:syntheticAuthority().windows[0],now:null}),/UTC/);
 assert.throws(()=>inspectPrivateFoodWorkbench({...input(),undocumentedPass:true}),/invalid|fields/i);
});
