import test from 'node:test';
import assert from 'node:assert/strict';
import {simulatedProductionFulfillment,syntheticAuthority,SYNTHETIC_HANDOFF,simulatedCustomerOrder} from './order-simulation';
import {assessSyntheticHandoff} from './food-fulfillment-evidence';
import {createTableOrderSimulation} from '../../src/lib/food/table-order-engine';
import {SYNTHETIC_NOW} from './order-simulation';

const evidence=(id='synthetic-order',reference='synthetic-handoff-log')=>({orderId:id,windowId:'synthetic-window',method:'pickup' as const,at:SYNTHETIC_HANDOFF,evidenceReference:reference});
test('existing synthetic paid fulfilled event is cross-checked, never independently certified',()=>{
 const flow=simulatedProductionFulfillment(),order=flow.engine.get('synthetic-order');
 const report=assessSyntheticHandoff(order,syntheticAuthority().windows[0],evidence());
 assert.equal(report.matchedExistingSyntheticEvent,true);assert.equal(report.physicalHandoffIndependentlyVerified,false);
 assert.equal(report.realCustomerFulfillment,false);assert.equal(report.publicCheckoutEnabled,false);
});
test('acceptance without fulfillment does not qualify as an actual handoff',()=>{
 const flow=simulatedCustomerOrder();assert.throws(()=>assessSyntheticHandoff(flow.engine.get('synthetic-order'),syntheticAuthority().windows[0],evidence()),/Completed/);
});
test('recorded handoff must bind order ID, exact event evidence and handoff time',()=>{
 const flow=simulatedProductionFulfillment(),order=flow.engine.get('synthetic-order'),window=syntheticAuthority().windows[0];
 assert.throws(()=>assessSyntheticHandoff(order,window,evidence('another-order')),/identity/);
 assert.throws(()=>assessSyntheticHandoff(order,window,evidence('synthetic-order','invented-proof')),/Evidence/);
 assert.throws(()=>assessSyntheticHandoff(order,window,{...evidence(),at:SYNTHETIC_NOW}),/Evidence/);
});
test('wrong method/window or unverified location cannot become a handoff',()=>{
 const flow=simulatedProductionFulfillment(),order=flow.engine.get('synthetic-order'),window=syntheticAuthority().windows[0];
 assert.throws(()=>assessSyntheticHandoff(order,window,{...evidence(),method:'delivery'}),/method/);
 assert.throws(()=>assessSyntheticHandoff(order,{...window,id:'wrong-window'},evidence()),/identity/);
 assert.throws(()=>assessSyntheticHandoff(order,{...window,verified:false},evidence()),/Verified/);
});
test('canceled/refunded or unverified synthetic state cannot present completion',()=>{
 const engine=createTableOrderSimulation(syntheticAuthority());
 engine.create('synthetic-order',[{productId:'food-product:synthetic-bowl',version:1,quantity:1}],'synthetic-window','synthetic-handoff',SYNTHETIC_NOW);
 const prior=engine.get('synthetic-order');assert.throws(()=>assessSyntheticHandoff(prior,syntheticAuthority().windows[0],evidence()),/Completed/);
});
test('identity and evidence parsing reject extra keys and user contact detail',()=>{
 const flow=simulatedProductionFulfillment(),order=flow.engine.get('synthetic-order'),window=syntheticAuthority().windows[0];
 assert.throws(()=>assessSyntheticHandoff(order,window,{...evidence(),customerEmail:'sensitive@example.com'}),/invalid|fields/i);
 assert.throws(()=>assessSyntheticHandoff(order,window,{...evidence(),evidenceReference:'personal address 123'}),/Opaque/);
});
