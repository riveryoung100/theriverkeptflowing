import test from 'node:test';
import assert from 'node:assert/strict';
import {TABLE_CATALOG} from '../../src/lib/food/table-catalog';
import {initialPrivateInventoryPriceEvidence,inspectPrivateInventoryPriceEvidence,appendPrivateInventoryPriceEvidence} from './food-inventory-price-evidence';
const concept=TABLE_CATALOG[0];
const skuCatalog=()=>({...concept,sku:{id:'food-sku:private-synthetic',version:1,
 servingOffer:{offerId:concept.offer.offerId,version:concept.offer.version},
 package:{id:'food-package-definition:private-synthetic',version:1}}});
const start=(catalog:unknown)=>initialPrivateInventoryPriceEvidence(catalog);
const report=(v:unknown,c:unknown)=>inspectPrivateInventoryPriceEvidence(v,c);
const add=(v:unknown,c:unknown,kind:string,reference:string,observation:unknown)=>appendPrivateInventoryPriceEvidence(v,c,{kind,reference,observation},report(v,c).fingerprint);
const count=(n=4)=>({kind:'food-exact-sku-physical-count-observation',id:'food-exact-sku-physical-count-observation:synthetic-1',sku:{id:'food-sku:private-synthetic',version:1},countScope:'exact-sku-total',countedPackageCount:n,observedAt:'2026-10-22T15:00:00Z',attribution:'synthetic-owner',sourceReference:'synthetic-count-sheet'});
const price=()=>({id:'food-approved-commercial-price:synthetic-1',version:1,sku:{id:'food-sku:private-synthetic',version:1},money:{currency:'USD',minorUnits:1200},approval:{attribution:'synthetic-owner',sourceReference:'synthetic-decision',approvedOn:'2026-10-22'}});
const review=()=>({outcome:'owner-reported-eligible',at:'2026-10-22T15:00:00Z',attribution:'synthetic-owner',sourceReference:'synthetic-review-note',scope:concept.product.id});
test('concept menu has no SKU, and owner evidence does not create stock, price or public checkout',()=>{
 const result=report(start(concept),concept);assert.equal(result.currentSellableInventory,null);assert.equal(result.authorizedPriceMinor,null);assert.equal(result.publicCheckoutEnabled,false);assert.ok(result.blockers.some(x=>x.includes('SKU')));
 assert.throws(()=>add(start(concept),concept,'physical-count','synthetic-count-1',count()),/SKU/);
 assert.throws(()=>add(start(concept),concept,'owner-price-assertion','synthetic-price-1',price()),/SKU/);
});
test('SKU count is validated through canonical exact-SKU validator but never sellable stock',()=>{
 const c=skuCatalog(),v=add(start(c),c,'physical-count','synthetic-count-ref',count(4));const result=report(v,c);
 assert.equal(result.countObservations[0].countedPackages,4);assert.equal(result.currentSellableInventory,null);assert.equal(result.liveInventoryAuthority,false);
 assert.deepEqual(start(c).assertions,[]);
});
test('zero count is a legitimate physical observation, not available stock',()=>{
 const c=skuCatalog(),v=add(start(c),c,'physical-count','synthetic-zero',count(0));assert.equal(report(v,c).countObservations[0].countedPackages,0);
});
test('canonical SKU binding prevents a count for a different version or identity',()=>{
 const c=skuCatalog();assert.throws(()=>add(start(c),c,'physical-count','synthetic-wrong', {...count(),sku:{id:'food-sku:other',version:1}}),/SKU/);
 assert.throws(()=>add(start(c),c,'physical-count','synthetic-wrong',{...count(),sku:{id:'food-sku:private-synthetic',version:2}}),/SKU/);
});
test('owner price assertion validates canonical USD amount but never authorizes a retail price',()=>{
 const c=skuCatalog(),v=add(start(c),c,'owner-price-assertion','synthetic-price-ref',price());const result=report(v,c);
 assert.equal(result.priceAssertions[0].minorUnits,1200);assert.equal(result.authorizedPriceMinor,null);
 assert.equal(result.publicCheckoutEnabled,false);assert.ok(result.blockers.some(x=>x.includes('catalog selling price')));
});
test('price assertion rejects mismatched SKU, invalid amount and forged extra keys',()=>{
 const c=skuCatalog();assert.throws(()=>add(start(c),c,'owner-price-assertion','synthetic-price',{...price(),sku:{id:'food-sku:other',version:1}}),/SKU/);
 assert.throws(()=>add(start(c),c,'owner-price-assertion','synthetic-price',{...price(),money:{currency:'USD',minorUnits:-5}}));
 assert.throws(()=>add(start(c),c,'owner-price-assertion','synthetic-price',{...price(),bypass:true}));
});
test('reviewed-sounding owner assertion does not grant external legal, tax or safety approval',()=>{
 const c=skuCatalog(),v=add(start(c),c,'regulatory-review','synthetic-regulatory-ref',review());const result=report(v,c);
 assert.equal(result.reviewSummaries[0].status,'SOURCE_ASSERTION_ONLY');assert.equal(result.launchStatus,'BLOCKED');assert.equal(result.independentApproval,false);
});
test('review must be bound to exact product and validated timestamp',()=>{
 const c=skuCatalog();assert.throws(()=>add(start(c),c,'tax-review','synthetic-tax-ref',{...review(),scope:'food-product:wrong'}),/product/);
 assert.throws(()=>add(start(c),c,'tax-review','synthetic-tax-ref',{...review(),at:'not-a-date'}),/timestamp/);
});
test('stale history, duplicate source and conflicting historical edits cannot overwrite entries',()=>{
 const c=skuCatalog(),first=start(c),fingerprint=report(first,c).fingerprint;
 const next=add(first,c,'physical-count','synthetic-count-ref',count());
 assert.throws(()=>appendPrivateInventoryPriceEvidence(next,c,{kind:'regulatory-review',reference:'synthetic-legal',observation:review()},fingerprint),/Stale/);
 assert.throws(()=>add(next,c,'physical-count','synthetic-count-ref',count(5)),/Duplicate/);
 assert.equal(report(next,c).evidenceEntries,1);assert.equal(report(first,c).evidenceEntries,0);
});
test('no fabricated SKU can be attached to original catalog; unsupported evidentiary powers rejected',()=>{
 const c=skuCatalog();assert.throws(()=>report(start(c),concept),/SKU/);
 assert.throws(()=>add(start(c),c,'checkout-authorized','synthetic-approval',review()),/Unsupported/);
 assert.throws(()=>add(start(c),c,'label-review','synthetic-label',{...review(),outcome:'certified'}),/status/);
});
