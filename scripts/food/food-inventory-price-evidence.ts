/** FOOD-019-024R: private, immutable source assertions; no stock or price authority. */
import {createHash} from 'node:crypto';
import {validateTableEntry,strictObject} from '../../src/lib/food/table-catalog';
import {validateFoodSkuVersion} from '../../src/lib/food/package-sku-domain';
import {validateFoodExactSkuPhysicalCountObservation} from '../../src/lib/food/exact-sku-physical-count-observation-domain';
import {validateFoodApprovedCommercialPriceVersion} from '../../src/lib/food/approved-commercial-price-domain';
import {freezeModel} from '../../src/lib/food/table-scheduling';

export type EvidenceKind='physical-count'|'owner-price-assertion'|'regulatory-review'|'tax-review'|'food-safety-review'|'label-review'|'fulfillment-review';
export interface PrivateEvidenceFile {
 schemaVersion:1;
 product:{id:string;version:number};
 recipe:{id:string;version:number};
 sku:{id:string;version:number}|null;
 assertions:readonly {kind:EvidenceKind;reference:string;observation:unknown}[];
}
const kinds:readonly EvidenceKind[]=['physical-count','owner-price-assertion','regulatory-review','tax-review','food-safety-review','label-review','fulfillment-review'];
const reviewKinds=new Set<EvidenceKind>(kinds.slice(2));
function ref(v:unknown):string {if(typeof v!=='string'||!v||v.trim()!==v||v.length>256||!/^[a-zA-Z0-9][a-zA-Z0-9._:/-]*$/.test(v))throw new TypeError('Bounded evidence reference required');return v;}
function exactRef(input:unknown){const r=strictObject(input,['id','version']);if(!Number.isSafeInteger(r.version)||Number(r.version)<1)throw new TypeError('Positive record revision required');return {id:ref(r.id),version:r.version as number};}
const canonical=(v:unknown):string=>JSON.stringify(v);
const fingerprint=(v:unknown)=>createHash('sha256').update(canonical(v)).digest('hex');
const mismatch=(a:{id:string;version:number},b:{id:string;version:number})=>a.id!==b.id||a.version!==b.version;
function validation(input:unknown,catalogInput:unknown){
 const catalog=validateTableEntry(catalogInput);
 const value=strictObject(input,['schemaVersion','product','recipe','sku','assertions']);
 if(value.schemaVersion!==1)throw new TypeError('Exact evidence file version required');
 const product=exactRef(value.product),recipe=exactRef(value.recipe);
 if(mismatch(product,catalog.product)||mismatch(recipe,catalog.recipe))throw new TypeError('Evidence not bound to canonical product and recipe');
 let sku:ReturnType<typeof validateFoodSkuVersion>|null=null;
 if(value.sku!==null){if(!catalog.sku)throw new TypeError('Concept menu has no canonical SKU; count and price evidence cannot be attached');
  sku=validateFoodSkuVersion(catalog.sku);const supplied=exactRef(value.sku);if(mismatch(supplied,sku))throw new TypeError('Exact canonical SKU mismatch');
 } else if(catalog.sku)throw new TypeError('Canonical SKU reference required for this product');
 if(!Array.isArray(value.assertions)||value.assertions.length>128)throw new TypeError('Bounded evidence history required');
 const identifiers=new Set<string>(), assertions:PrivateEvidenceFile['assertions'][number][]=[];
 for(const item of value.assertions){const a=strictObject(item,['kind','reference','observation']);
  if(!kinds.includes(a.kind as EvidenceKind))throw new TypeError('Unsupported evidence kind');
  const kind=a.kind as EvidenceKind,reference=ref(a.reference);if(identifiers.has(reference))throw new TypeError('Duplicate evidence reference');identifiers.add(reference);
  let observation:unknown;
  if(kind==='physical-count'){
   if(!sku)throw new TypeError('Physical count needs an established canonical SKU');
   const count=validateFoodExactSkuPhysicalCountObservation(a.observation);
   if(mismatch(count.sku,sku))throw new TypeError('Count belongs to a different exact SKU');
   observation=count;
  } else if(kind==='owner-price-assertion'){
   if(!sku)throw new TypeError('Price assertion needs an established canonical SKU');
   observation=validateFoodApprovedCommercialPriceVersion(a.observation,sku);
  } else if(reviewKinds.has(kind)){
   const r=strictObject(a.observation,['outcome','at','attribution','sourceReference','scope']);
   if(!['pending','inconclusive','owner-reported-eligible','owner-reported-ineligible'].includes(String(r.outcome)))throw new TypeError('Review conclusion requires an explicit bounded status');
   if(typeof r.at!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(r.at)||!Number.isFinite(Date.parse(r.at))||new Date(r.at).toISOString().slice(0,19)+'Z'!==r.at)throw new TypeError('Canonical UTC review timestamp required');
   if(r.scope!==product.id)throw new TypeError('Review must bind exact product');
   observation={outcome:r.outcome,at:r.at,attribution:ref(r.attribution),sourceReference:ref(r.sourceReference),scope:r.scope};
  } else throw new TypeError('Unknown evidence kind');
  assertions.push({kind,reference,observation});
 }
 return freezeModel({schemaVersion:1 as const,product,recipe,sku:sku?{id:sku.id,version:sku.version}:null,assertions});
}
export function initialPrivateInventoryPriceEvidence(catalogInput:unknown):PrivateEvidenceFile {
 const c=validateTableEntry(catalogInput);
 return freezeModel({schemaVersion:1,product:{id:c.product.id,version:c.product.version},recipe:{id:c.recipe.id,version:c.recipe.version},sku:c.sku?{id:c.sku.id,version:c.sku.version}:null,assertions:[]});
}
export function validatePrivateInventoryPriceEvidence(input:unknown,catalogInput:unknown){return validation(input,catalogInput);}
export function appendPrivateInventoryPriceEvidence(input:unknown,catalogInput:unknown,addition:unknown,expectedFingerprint:string){
 const original=validation(input,catalogInput);
 if(typeof expectedFingerprint!=='string'||expectedFingerprint!==fingerprint(original))throw new TypeError('Stale evidence file fingerprint; refresh before appending');
 const next=strictObject(addition,['kind','reference','observation']);
 return validation({...original,assertions:[...original.assertions,next]},catalogInput);
}
export function inspectPrivateInventoryPriceEvidence(input:unknown,catalogInput:unknown){
 const c=validateTableEntry(catalogInput),value=validation(input,catalogInput);
 const counts=value.assertions.filter(x=>x.kind==='physical-count');
 const prices=value.assertions.filter(x=>x.kind==='owner-price-assertion');
 const reviews=value.assertions.filter(x=>reviewKinds.has(x.kind));
 const blockers:string[]=[];
 if(!c.sku)blockers.push('Canonical exact SKU and approved packaging not established');
 if(!counts.length)blockers.push('No exact-SKU physical count observation recorded');
 if(!prices.length)blockers.push('No price approval assertion supplied');
 if(!c.approvedPrice)blockers.push('Canonical catalog selling price not approved');
 for(const k of [...reviewKinds])if(!reviews.some(x=>x.kind===k))blockers.push(`Missing ${k} source review`);
 blockers.push('Independent inventory freshness and recorded-balance reconciliation unavailable');
 blockers.push('Food regulatory, tax and safety permissions require independent verification');
 blockers.push('Public ordering and owner launch authorization remain disabled');
 return freezeModel({kind:'PRIVATE_INVENTORY_PRICE_EVIDENCE',fingerprint:fingerprint(value),product:value.product,recipe:value.recipe,sku:value.sku,
  evidenceEntries:value.assertions.length,countObservations:counts.map(x=>({reference:x.reference,countedPackages:(x.observation as {countedPackageCount:number}).countedPackageCount,
   status:'OWNER_RECORDED_PHYSICAL_COUNT_NOT_AUTHENTICATED'})),priceAssertions:prices.map(x=>({reference:x.reference,minorUnits:(x.observation as {money:{minorUnits:number}}).money.minorUnits,
   status:'OWNER_ASSERTED_NOT_INDEPENDENT_PRICE_APPROVAL'})),reviewSummaries:reviews.map(x=>({kind:x.kind,reference:x.reference,
   outcome:(x.observation as {outcome:string}).outcome,status:'SOURCE_ASSERTION_ONLY'})),blockers,
  currentSellableInventory:null,authorizedPriceMinor:null,liveInventoryAuthority:false,independentApproval:false,
  launchStatus:'BLOCKED',publicCheckoutEnabled:false,productionD1Accessed:false});
}
