import test from 'node:test';
import assert from 'node:assert/strict';
import {TABLE_CATALOG} from '../../src/lib/food/table-catalog';
import {initialPrivateSkuGovernance,applyPrivateSkuProposal,appendPrivateSkuReview,inspectPrivateSkuGovernance,fingerprintPrivateSkuGovernance,validatePrivateSkuGovernance,draftPrivateSkuProposal,draftPrivateSkuReview} from './food-sku-governance';
const catalog=TABLE_CATALOG[0];
const start=()=>initialPrivateSkuGovernance(catalog);
const inspect=(v:unknown,ops:unknown=null)=>inspectPrivateSkuGovernance(v,catalog,ops);
const digest=(v:unknown)=>fingerprintPrivateSkuGovernance(v,catalog);
const prop=(version=1)=>({sku:{id:'food-sku:owner-draft',version,servingOffer:{offerId:catalog.offer.offerId,version:catalog.offer.version},package:{id:'food-package-definition:owner-draft',version}},
 packageDefinition:{id:'food-package-definition:owner-draft',version,descriptor:'Draft bowl container'},
 source:{recordedAt:'2026-10-22T17:00:00Z',recordedBy:'owner-local',packagingEvidence:'owner-package-sample',portionEvidence:null}});
const propose=(v:unknown,p:unknown=prop())=>applyPrivateSkuProposal(v,catalog,p,digest(v));
const review=(v:ReturnType<typeof propose>,kind='food-label',reference='review-one')=>{assert.ok(v.proposal);return ({kind,reference,outcome:'owner-reported-reviewed',reviewer:'owner-local',at:'2026-10-22T17:30:00Z',sourceReference:'review-note-local',sku:{id:v.proposal.sku.id,version:v.proposal.sku.version}});};
test('original Southwest Harvest Bowl has no canonical SKU, package or selling price',()=>{
 assert.equal(catalog.sku,null);assert.equal(catalog.packageDefinition,null);assert.equal(catalog.approvedPrice,null);
 const r=inspect(start());assert.equal(r.launchStatus,'BLOCKED');assert.equal(r.catalogSkuEstablished,false);assert.equal(r.sellableUnits,null);assert.equal(r.publicCheckoutEnabled,false);
});
test('draft proposal is explicit blanks and cannot be silently accepted as evidence',()=>{
 const p=draftPrivateSkuProposal(catalog);assert.equal(p.sku.id,'');assert.equal(p.packageDefinition.netQuantity.grams,null);
 assert.throws(()=>propose(start(),p));
});
test('first proposed SKU must begin at revision one and bind exact serving offer',()=>{
 const v=propose(start());const report=inspect(v);assert.equal(report.phase,'OWNER_REVIEW_DRAFT_ONLY');assert.ok(report.proposal);assert.equal(report.proposal.sku.version,1);
 assert.equal(report.canonicalSkuMatchesProposal,false);assert.equal(report.approvedPriceMinor,null);
 assert.throws(()=>propose(start(),prop(2)),/revision 1/);
 assert.throws(()=>propose(start(),{...prop(),sku:{...prop().sku,servingOffer:{offerId:'food-serving-offer:wrong',version:1}}}),/offer/);
});
test('package and SKU identities, versions must agree',()=>{
 assert.throws(()=>propose(start(),{...prop(),packageDefinition:{...prop().packageDefinition,id:'food-package-definition:other'}}),/package/);
 assert.throws(()=>propose(start(),{...prop(),sku:{...prop().sku,package:{id:'food-package-definition:owner-draft',version:2}}}),/package/);
});
test('candidate SKU cannot change established public catalog identity',()=>{
 const v=propose(start());assert.equal(catalog.sku,null);assert.equal(catalog.approvedPrice,null);assert.equal(inspect(v).launchStatus,'BLOCKED');
 assert.ok(inspect(v).blockers.some(x=>x.includes('canonical catalog')));
});
test('proposal revisions are consecutive and retain complete history, invalidating prior reviews',()=>{
 const a=propose(start());const r=appendPrivateSkuReview(a,catalog,review(a),digest(a));
 const b=propose(r,prop(2));assert.equal(b.priorProposals.length,1);assert.equal(b.reviews.length,0);assert.equal(b.proposal!.sku.version,2);
 assert.equal(inspect(b).earlierProposalCount,1);assert.equal(r.reviews.length,1);
 assert.throws(()=>propose(r,prop(3)),/Consecutive/);
 assert.throws(()=>propose(r,{...prop(2),sku:{...prop(2).sku,id:'food-sku:other'}}),/identities/);
});
test('tampering with archived history is rejected',()=>{
 const b=propose(propose(start()),prop(2));const forged={...b,priorProposals:[{...b.priorProposals[0],sku:{...b.priorProposals[0].sku,version:9}}]};
 assert.throws(()=>validatePrivateSkuGovernance(forged,catalog),/consecutive/);
});
test('stale governance fingerprint cannot append/revise and cannot overwrite',()=>{
 const a=start(),hash=digest(a),b=propose(a);
 assert.throws(()=>applyPrivateSkuProposal(b,catalog,prop(2),hash),/Stale/);
 assert.throws(()=>appendPrivateSkuReview(b,catalog,review(b),hash),/Stale/);
});
test('reviews are strictly bound to active SKU revision and only owner-asserted',()=>{
 const a=propose(start());const r=appendPrivateSkuReview(a,catalog,review(a),digest(a));const report=inspect(r);
 assert.equal(report.reviews[0].authority,'SOURCE_ASSERTION_ONLY');assert.equal(report.independentApprovals,false);
 assert.throws(()=>appendPrivateSkuReview(a,catalog,{...review(a),outcome:'approved'},digest(a)),/outcomes/);
 assert.throws(()=>appendPrivateSkuReview(a,catalog,{...review(a),sku:{id:'food-sku:wrong',version:1}},digest(a)),/SKU/);
 assert.throws(()=>appendPrivateSkuReview(r,catalog,review(r),digest(r)),/Duplicate/);
});
test('proposal forbids unverified net weight claiming to match a separate measured portion',()=>{
 const a=propose(start(),{...prop(),packageDefinition:{...prop().packageDefinition,netQuantity:{basis:'grams',grams:350}}});
 const report=inspect(a);assert.ok(report.proposal?.packageDefinition.netQuantity);assert.equal(report.proposal.packageDefinition.netQuantity.grams,350);
 assert.ok(report.blockers.some(x=>x.includes('Measured recipe operations evidence')));assert.equal(report.independentApprovals,false);
});
test('record validation rejects extra authority fields and incorrect product binding',()=>{
 assert.throws(()=>validatePrivateSkuGovernance({...start(),checkoutEnabled:true},catalog));
 assert.throws(()=>validatePrivateSkuGovernance({...start(),binding:{...start().binding,product:{id:'food-product:other',version:1}}},catalog),/stale/);
 assert.throws(()=>propose(start(),{...prop(),canSell:true}));
});
test('proposal timestamp and source references must be traceable and normalized',()=>{
 assert.throws(()=>propose(start(),{...prop(),source:{...prop().source,recordedAt:'yesterday'}}),/UTC/);
 assert.throws(()=>propose(start(),{...prop(),source:{...prop().source,packagingEvidence:'invalid value'}}),/source reference/);
});
test('draft review is pending and scoped to current proposed SKU',()=>{
 assert.throws(()=>draftPrivateSkuReview(start(),catalog,'food-label'),/proposal/);
 const a=propose(start());const t=draftPrivateSkuReview(a,catalog,'food-label');assert.equal(t.outcome,'pending');assert.equal(t.sku.id,a.proposal!.sku.id);
});
test('even eight owner-reported reviews do not certify a SKU or food legality',()=>{
 let v=propose(start());for(const kind of ['portion','package-material','food-label','regulatory','sales-tax','storage','fulfillment','owner-price']){
  v=appendPrivateSkuReview(v,catalog,review(v,kind,`note-${kind}`),digest(v));
 }assert.equal(v.reviews.length,8);assert.equal(inspect(v).launchStatus,'BLOCKED');assert.equal(inspect(v).sellableUnits,null);
 assert.ok(inspect(v).blockers.some(x=>x.includes('independently verified')));
});
