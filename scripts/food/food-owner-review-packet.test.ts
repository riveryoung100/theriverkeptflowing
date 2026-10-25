import test from 'node:test';
import assert from 'node:assert/strict';
import {TABLE_CATALOG} from '../../src/lib/food/table-catalog';
import {initialRecipeOperations} from './operating-system';
import {initialPrivateSkuGovernance,applyPrivateSkuProposal,fingerprintPrivateSkuGovernance,appendPrivateSkuReview} from './food-sku-governance';
import {initialPrivateInventoryPriceEvidence,appendPrivateInventoryPriceEvidence,inspectPrivateInventoryPriceEvidence} from './food-inventory-price-evidence';
import {inspectPrivateOwnerReviewPacket} from './food-owner-review-packet';
const c=TABLE_CATALOG[0];
const draft=()=>({recipe:initialRecipeOperations(),catalog:c,batch:null,targetServings:null,ingredientInventory:[],window:null,deliveryPolicy:null,deliveryRequest:null,now:null,quantity:1});
const g=()=>initialPrivateSkuGovernance(c);
const packet=(skuGovernance:unknown=g(),workbench:unknown=null,inventoryEvidence:unknown=null,catalog:unknown=c)=>inspectPrivateOwnerReviewPacket({catalog,skuGovernance,workbench,inventoryEvidence});
const prop=(netGrams?:number)=>({sku:{id:'food-sku:review-draft',version:1,servingOffer:{offerId:c.offer.offerId,version:c.offer.version},package:{id:'food-package-definition:review-draft',version:1}},
 packageDefinition:{id:'food-package-definition:review-draft',version:1,descriptor:'Owner review sample',...(netGrams?{netQuantity:{basis:'grams',grams:netGrams}}:{})},source:{recordedAt:'2026-10-22T18:00:00Z',recordedBy:'owner-source',packagingEvidence:'package-sample',portionEvidence:null}});
const proposed=(grams?:number)=>applyPrivateSkuProposal(g(),c,prop(grams),fingerprintPrivateSkuGovernance(g(),c));
const inv=()=>initialPrivateInventoryPriceEvidence(c);
const review=(kind:string,reference:string)=>({kind,reference,outcome:'owner-reported-reviewed',reviewer:'owner-source',at:'2026-10-22T19:00:00Z',sourceReference:'owner-notes',sku:{id:'food-sku:review-draft',version:1}});
test('actual concept cannot be converted into sellable SKU by owner review packet',()=>{
 const r=packet();assert.equal(r.launchStatus,'BLOCKED');assert.equal(r.publicCheckoutEnabled,false);assert.equal(r.canonicalSku,null);assert.equal(r.approvedPriceMinor,null);assert.equal(r.sellableUnits,null);
 assert.ok(r.gates.some(x=>x.id==='canonical-sku'&&x.status==='BLOCKED'));
});
test('unmeasured first recipe remains explicit source gap',()=>{
 const r=packet(g(),draft());assert.equal(r.counts.measuredIngredientLines,0);
 assert.equal(r.gates.find(x=>x.id==='measured-recipe')?.status,'OWNER_INPUT_REQUIRED');assert.equal(r.observations.measuredPortionGrams,null);
});
test('owner SKU draft does not mutate canonical catalog or release inventory',()=>{
 const p=packet(proposed(300));assert.equal(p.skuProposal?.id,'food-sku:review-draft');assert.equal(c.sku,null);assert.equal(p.sellableUnits,null);
 assert.equal(p.gates.find(x=>x.id==='sku-package')?.status,'RECORDED_NOT_APPROVED');
});
test('proposed package grams without measured recipe stays unverified',()=>{
 const p=packet(proposed(300),draft());assert.equal(p.observations.proposedPackageNetGrams,300);
 assert.equal(p.gates.find(x=>x.id==='net-quantity-consistency')?.status,'UNVERIFIED');
});
test('current original catalog permits private regulatory notes but not physical count or price authorization',()=>{
 const a=inv(),assertion={kind:'regulatory-review',reference:'reg-review',observation:{outcome:'pending',at:'2026-10-22T20:00:00Z',attribution:'owner',sourceReference:'owner-note',scope:c.product.id}};
 const b=appendPrivateInventoryPriceEvidence(a,c,assertion,inspectPrivateInventoryPriceEvidence(a,c).fingerprint);
 const p=packet(proposed(),null,b);assert.equal(p.counts.physicalCountObservations,0);assert.equal(p.counts.ownerPriceAssertions,0);
 assert.equal(p.observations.unknownExpenseClasses.length,5);assert.equal(p.approvedPriceMinor,null);
});
test('owner review records do not count as independent approvals',()=>{
 let s=proposed();for(const kind of ['portion','package-material','food-label','regulatory','sales-tax','storage','fulfillment','owner-price'])s=appendPrivateSkuReview(s,c,review(kind,`reference-${kind}`),fingerprintPrivateSkuGovernance(s,c));
 const p=packet(s);assert.equal(p.counts.ownerReviewRecords,8);assert.equal(p.counts.independentApprovals,0);
 assert.equal(p.gates.find(x=>x.id==='owner-review-history')?.status,'OWNER_REVIEW_RECORDED');assert.equal(p.independentApproval,false);
});
test('stale SKU proposal or bad catalog product identity is refused by canonical validation',()=>{
 assert.throws(()=>packet(g(),null,null,{...c,product:{...c.product,id:'food-product:other'}}),/binding|stale|mismatch/i);
});
test('forged SKU or claimed public checkout authority rejected by source validators',()=>{
 assert.throws(()=>packet({...g(),publicCheckoutEnabled:true}),/fields|Unexpected|unsupported/i);
 assert.throws(()=>packet(proposed(),{...draft(),publicCheckoutEnabled:true}),/fields|Unexpected|unsupported/i);
});
test('invented inventory SKU is refused while actual catalog contains no SKU',()=>{
 assert.throws(()=>packet(g(),null,{...inv(),sku:{id:'food-sku:other',version:1}}),/SKU/);
});
test('priority actions are grounded in concrete unmet gates without approval shortcuts',()=>{
 const p=packet(g(),draft());assert.ok(p.priorityActions.some(x=>x.gate==='measured-recipe'));
 assert.ok(p.priorityActions.some(x=>x.gate==='owner-launch'));assert.equal(p.productionD1Accessed,false);
});
test('crosswalk source fingerprints remain stable on identical records and change with new proposal',()=>{
 const a=packet(),b=packet();assert.equal(a.reviewPacketFingerprint,b.reviewPacketFingerprint);
 assert.notEqual(packet(proposed()).reviewPacketFingerprint,a.reviewPacketFingerprint);
});
test('strict input does not silently accept write/launch fields',()=>{
 assert.throws(()=>inspectPrivateOwnerReviewPacket({catalog:c,skuGovernance:g(),workbench:null,inventoryEvidence:null,approve:true}));
});
