/** FOOD-019–024S: SKU/package proposal provenance. Private planning only; no catalog mutation. */
import {createHash} from 'node:crypto';
import {validateTableEntry,strictObject} from '../../src/lib/food/table-catalog';
import {validateFoodSkuVersion,validateFoodPackageDefinitionVersion} from '../../src/lib/food/package-sku-domain';
import {inspectRecipeOperations} from './food-operations';
import {freezeModel} from '../../src/lib/food/table-scheduling';

export type Identity={id:string;version:number};
export type ReviewKind='portion'|'package-material'|'food-label'|'regulatory'|'sales-tax'|'storage'|'fulfillment'|'owner-price';
export type ReviewOutcome='pending'|'needs-work'|'owner-reported-reviewed';
export interface SkuProposal {
 sku:{id:string;version:number;servingOffer:{offerId:string;version:number};package:{id:string;version:number}};
 packageDefinition:{id:string;version:number;descriptor?:string;netQuantity?:{basis:'grams';grams:number}};
 source:{recordedAt:string;recordedBy:string;packagingEvidence:string;portionEvidence:string|null};
}
export interface SkuReview {kind:ReviewKind;reference:string;outcome:ReviewOutcome;reviewer:string;at:string;sourceReference:string;sku:Identity;}
export interface SkuGovernance {
 schemaVersion:1; binding:{product:Identity;recipe:Identity;servingOffer:{offerId:string;version:number}};
 proposal:SkuProposal|null; priorProposals:readonly SkuProposal[]; reviews:readonly SkuReview[];
}
const kinds:readonly ReviewKind[]=['portion','package-material','food-label','regulatory','sales-tax','storage','fulfillment','owner-price'];
const clean=(v:unknown,label='Reference'):string=>{
 if(typeof v!=='string'||!v||v.trim()!==v||v.length>256||!/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(v))throw new TypeError(`${label} must be a bounded source reference`);return v;
};
const time=(v:unknown):string=>{
 if(typeof v!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,19)+'Z'!==v)throw new TypeError('UTC second-resolution evidence time required');return v;
};
const identity=(v:unknown):Identity=>{const r=strictObject(v,['id','version']);if(!Number.isSafeInteger(r.version)||Number(r.version)<1)throw new TypeError('Positive version required');return {id:clean(r.id),version:r.version as number};};
const equal=(a:Identity,b:Identity)=>a.id===b.id&&a.version===b.version;
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function parseProposal(input:unknown,entry:ReturnType<typeof validateTableEntry>):SkuProposal {
 const p=strictObject(input,['sku','packageDefinition','source']);
 const sku=validateFoodSkuVersion(p.sku),pkg=validateFoodPackageDefinitionVersion(p.packageDefinition);
 if(sku.servingOffer.offerId!==entry.offer.offerId||sku.servingOffer.version!==entry.offer.version)throw new TypeError('Proposed SKU must bind the exact current serving offer');
 if(sku.package.id!==pkg.id||sku.package.version!==pkg.version)throw new TypeError('Proposed SKU/package versions disagree');
 const s=strictObject(p.source,['recordedAt','recordedBy','packagingEvidence','portionEvidence']);
 const source={recordedAt:time(s.recordedAt),recordedBy:clean(s.recordedBy),packagingEvidence:clean(s.packagingEvidence),portionEvidence:s.portionEvidence===null?null:clean(s.portionEvidence)};
 return {sku:structuredClone(sku),packageDefinition:structuredClone(pkg),source};
}
function validation(input:unknown,catalogInput:unknown):SkuGovernance {
 const entry=validateTableEntry(catalogInput);
 const p=strictObject(input,['schemaVersion','binding','proposal','priorProposals','reviews']);
 if(p.schemaVersion!==1)throw new TypeError('Exact governance schema required');
 const binding=strictObject(p.binding,['product','recipe','servingOffer']);
 const product=identity(binding.product),recipe=identity(binding.recipe);
 if(!equal(product,entry.product)||!equal(recipe,entry.recipe))throw new TypeError('Governance is stale or not bound to exact catalog product and recipe');
 const offer=strictObject(binding.servingOffer,['offerId','version']);
 if(offer.offerId!==entry.offer.offerId||offer.version!==entry.offer.version)throw new TypeError('Serving-offer revision changed');
 if(!Array.isArray(p.priorProposals)||p.priorProposals.length>32)throw new TypeError('Bounded proposal history required');
 const earlier=p.priorProposals.map(raw=>parseProposal(raw,entry));
 const proposal=p.proposal===null?null:parseProposal(p.proposal,entry);
 if(earlier.length&&!proposal)throw new TypeError('Current proposal required when revision history exists');
 const chain=[...earlier,...(proposal?[proposal]:[])];
 for(let i=1;i<chain.length;i++){
  const old=chain[i-1],next=chain[i];
  if(old.sku.id!==next.sku.id||old.packageDefinition.id!==next.packageDefinition.id||next.sku.version!==old.sku.version+1||next.packageDefinition.version!==old.packageDefinition.version+1)throw new TypeError('SKU/package revisions must be consecutive and identities stable');
 }
 if(!Array.isArray(p.reviews)||p.reviews.length>64)throw new TypeError('Bounded proposed SKU review history required');
 const refs=new Set<string>();const reviews:SkuReview[]=p.reviews.map(raw=>{
  const r=strictObject(raw,['kind','reference','outcome','reviewer','at','sourceReference','sku']);
  if(!kinds.includes(r.kind as ReviewKind)||!['pending','needs-work','owner-reported-reviewed'].includes(String(r.outcome)))throw new TypeError('Only non-authoritative review outcomes are accepted');
  if(!proposal)throw new TypeError('Review requires a proposed SKU');
  const reference=clean(r.reference);if(refs.has(reference))throw new TypeError('Duplicate review reference');refs.add(reference);
  const skuRef=identity(r.sku);
  if(!equal(skuRef,proposal.sku))throw new TypeError('Review must bind current SKU revision');
  return {kind:r.kind as ReviewKind,reference,outcome:r.outcome as ReviewOutcome,reviewer:clean(r.reviewer),at:time(r.at),sourceReference:clean(r.sourceReference),sku:skuRef};
 });
 return freezeModel({schemaVersion:1 as const,binding:{product,recipe,servingOffer:{offerId:entry.offer.offerId,version:entry.offer.version}},proposal,priorProposals:earlier,reviews});
}
export function initialPrivateSkuGovernance(catalogInput:unknown):SkuGovernance {
 const c=validateTableEntry(catalogInput);
 return freezeModel({schemaVersion:1,binding:{product:{id:c.product.id,version:c.product.version},recipe:{id:c.recipe.id,version:c.recipe.version},servingOffer:{offerId:c.offer.offerId,version:c.offer.version}},proposal:null,priorProposals:[],reviews:[]});
}
export const validatePrivateSkuGovernance=(input:unknown,catalog:unknown)=>validation(input,catalog);
export const fingerprintPrivateSkuGovernance=(input:unknown,catalog:unknown)=>hash(validation(input,catalog));
function checked(input:unknown,catalog:unknown,expected:string){const p=validation(input,catalog);if(!/^[a-f0-9]{64}$/.test(expected)||hash(p)!==expected)throw new TypeError('Stale governance fingerprint; inspect latest file');return p;}
export function applyPrivateSkuProposal(input:unknown,catalog:unknown,newProposal:unknown,expected:string){
 const prev=checked(input,catalog,expected),entry=validateTableEntry(catalog),candidate=parseProposal(newProposal,entry);
 if(prev.proposal){
  if(candidate.sku.id!==prev.proposal.sku.id||candidate.packageDefinition.id!==prev.proposal.packageDefinition.id||candidate.sku.version!==prev.proposal.sku.version+1||candidate.packageDefinition.version!==prev.proposal.packageDefinition.version+1)throw new TypeError('Consecutive SKU and package revisions with same identities required');
 } else if(candidate.sku.version!==1||candidate.packageDefinition.version!==1)throw new TypeError('New private SKU proposal starts at revision 1');
 return validation({...prev,proposal:candidate,priorProposals:[...prev.priorProposals,...(prev.proposal?[prev.proposal]:[])],reviews:[]},catalog);
}
export function appendPrivateSkuReview(input:unknown,catalog:unknown,newReview:unknown,expected:string){
 const prev=checked(input,catalog,expected);
 return validation({...prev,reviews:[...prev.reviews,newReview]},catalog);
}
/** This report NEVER changes public catalog or supplies independent regulatory/sale authority. */
export function inspectPrivateSkuGovernance(input:unknown,catalogInput:unknown,recipeOperations:unknown|null=null){
 const p=validation(input,catalogInput),c=validateTableEntry(catalogInput);
 const blockers:string[]=[];
 if(!p.proposal)blockers.push('No owner-supplied exact SKU/package proposal');
 if(!c.sku||!c.packageDefinition)blockers.push('No approved exact SKU/package definition in canonical catalog');
 else if(p.proposal&&(!equal(c.sku,p.proposal.sku)||!equal(c.packageDefinition,p.proposal.packageDefinition)))blockers.push('Canonical catalog does not match proposed SKU/package revision');
 if(!c.approvedPrice)blockers.push('No canonical approved retail price');
 if(!recipeOperations)blockers.push('Measured recipe operations evidence not supplied');
 const r=recipeOperations===null?null:inspectRecipeOperations(recipeOperations);
 if(r){
  if(!equal(r.recipe.recipe,p.binding.recipe))throw new TypeError('Measured recipe evidence bound to wrong recipe revision');
  if(!r.measured||r.recipe.portionGrams===null)blockers.push('Measured portion mass not established');
  if(!r.approved)blockers.push('Recipe approval and current revision review missing');
  if(p.proposal?.packageDefinition.netQuantity&&r.recipe.portionGrams!==null&&Math.abs(p.proposal.packageDefinition.netQuantity.grams-r.recipe.portionGrams)>1e-6)blockers.push('Proposed package net grams conflict with measured portion grams');
 }
 if(p.proposal&&!p.proposal.packageDefinition.netQuantity)blockers.push('Package net quantity not measured/declared');
 if(p.proposal&&!p.proposal.source.portionEvidence)blockers.push('No owner-supplied portion measurement source');
 for(const kind of kinds)if(!p.reviews.some(x=>x.kind===kind))blockers.push(`Missing private ${kind} review evidence`);
 blockers.push('All owner statements are source assertions, not independent approvals');
 blockers.push('Food safety, legal classification, tax, label and fulfillment must be independently verified');
 blockers.push('No production inventory release, customer checkout or owner launch authorization');
 return freezeModel({kind:'PRIVATE_SKU_PACKAGE_GOVERNANCE',fingerprint:hash(p),product:p.binding.product,recipe:p.binding.recipe,servingOffer:p.binding.servingOffer,
  proposal:p.proposal,earlierProposalCount:p.priorProposals.length,reviews:p.reviews.map(x=>({kind:x.kind,reference:x.reference,outcome:x.outcome,authority:'SOURCE_ASSERTION_ONLY'})),
  catalogSkuEstablished:!!c.sku,catalogPackageEstablished:!!c.packageDefinition,canonicalSkuMatchesProposal:!!(p.proposal&&c.sku&&equal(c.sku,p.proposal.sku)),
  measuredPortionGrams:r?.recipe.portionGrams??null,blockers,phase:'OWNER_REVIEW_DRAFT_ONLY',sellableUnits:null,approvedPriceMinor:null,
  independentApprovals:false,publicCheckoutEnabled:false,productionD1Accessed:false,launchStatus:'BLOCKED'});
}
export function draftPrivateSkuProposal(catalogInput:unknown){
 const c=validateTableEntry(catalogInput);
 return {sku:{id:'',version:1,servingOffer:{offerId:c.offer.offerId,version:c.offer.version},package:{id:'',version:1}},
 packageDefinition:{id:'',version:1,descriptor:'',netQuantity:{basis:'grams',grams:null}},
 source:{recordedAt:'',recordedBy:'',packagingEvidence:'',portionEvidence:null}};
}
export function draftPrivateSkuReview(input:unknown,catalog:unknown,kind:ReviewKind){
 const p=validation(input,catalog);if(!p.proposal)throw new TypeError('A SKU proposal must exist before review templates');
 if(!kinds.includes(kind))throw new TypeError('Unknown review kind');
 return {kind,reference:'',outcome:'pending',reviewer:'',at:'',sourceReference:'',sku:{id:p.proposal.sku.id,version:p.proposal.sku.version}};
}
