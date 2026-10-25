/** Anonymous aggregate interest and package candidate inspection, never ordering. */
import {strictObject} from '../../src/lib/food/table-catalog';
import {modelRef,freezeModel} from '../../src/lib/food/table-scheduling';
const count=(n:unknown)=>{if(typeof n!=='number'||!Number.isSafeInteger(n)||n<0)throw new TypeError('Nonnegative whole count required');return n;};
export function demandCapacity(input:unknown){
 const p=strictObject(input,['recipeFingerprint','capacityBowls','observations']);
 if(typeof p.recipeFingerprint!=='string'||!/^[a-f0-9]{64}$/.test(p.recipeFingerprint))throw new TypeError('Exact recipe fingerprint required');
 const capacity=p.capacityBowls===null?null:count(p.capacityBowls);
 if(!Array.isArray(p.observations)||p.observations.length>128)throw new TypeError('Bounded anonymized aggregate observations required');
 const seen=new Set<string>();
 const totals={'INTERESTED':0,'RECONFIRMED INTEREST':0,'NOT INTERESTED':0,'UNKNOWN':0};
 for(const raw of p.observations){
  // One current mutually exclusive cohort per source; no names, contacts or addresses accepted.
  const r=strictObject(raw,['reference','status','people','bowls','area','timing','channel','sourceReference']);
  const ref=modelRef(r.reference);if(seen.has(ref))throw new TypeError('Duplicate cohort reference');seen.add(ref);
  if(!Object.hasOwn(totals,String(r.status)))throw new TypeError('Explicit interest status required');
  const people=count(r.people),bowls=count(r.bowls);
  if(!people&&bowls||r.status==='NOT INTERESTED'&&bowls)throw new TypeError('Contradictory interest counts');
  for(const k of ['area','timing','channel','sourceReference'])modelRef(r[k]);
  totals[r.status as keyof typeof totals]+=bowls;
 }
 const interested=totals.INTERESTED+totals['RECONFIRMED INTEREST'];
 if(!Number.isSafeInteger(interested))throw new TypeError('Demand overflow');
 return freezeModel({recipeFingerprint:p.recipeFingerprint,totals,capacityBowls:capacity,interestedBowls:interested,
  planningShortfall:capacity===null?null:Math.max(0,interested-capacity),
  capacityProvenance:'OWNER_PLANNING_INPUT_NOT_RELEASED_STOCK',actualSales:null,reservationsCreated:0,
  notice:'Use disjoint anonymized cohorts; replace a prior cohort when interest is reaffirmed. Interest is not an order or payment authorization.',
  publicCheckoutEnabled:false,customerContactEnabled:false});
}

export const packageFields=['supplierReference','capacityMl','usableFillMl','netFoodGrams','packagingGrams','unitPriceMinor',
 'freezerEvidence','microwaveEvidence','sealEvidence','labelPlacement','foodContactEvidence','supplierRevision','crossContactEvidence','assemblyMethod'] as const;
export function comparePackaging(input:unknown){
 const p=strictObject(input,['recipeFingerprint','candidates']);
 if(typeof p.recipeFingerprint!=='string'||!/^[a-f0-9]{64}$/.test(p.recipeFingerprint))throw new TypeError('Exact recipe fingerprint required');
 if(!Array.isArray(p.candidates)||!p.candidates.length||p.candidates.length>32)throw new TypeError('Bounded package candidates required');
 const seen=new Set<string>();
 const candidates=p.candidates.map(raw=>{
  const r=strictObject(raw,['reference','component',...packageFields]);const reference=modelRef(r.reference);
  if(seen.has(reference))throw new TypeError('Duplicate packaging candidate');seen.add(reference);
  if(!['main-meal','dry-pepita-packet'].includes(String(r.component)))throw new TypeError('Only main meal and dry pepita packet components');
  for(const key of packageFields){
   if(r[key]===null)continue;
   if(['capacityMl','usableFillMl','netFoodGrams','packagingGrams','unitPriceMinor'].includes(key)){
    if(typeof r[key]!=='number'||!Number.isFinite(r[key])||Number(r[key])<0||(key!=='unitPriceMinor'&&Number(r[key])===0)||Number(r[key])>Number.MAX_SAFE_INTEGER)throw new TypeError('Invalid package quantity');
    if(key==='unitPriceMinor'&&!Number.isSafeInteger(r[key]))throw new TypeError('Whole cents required');
   }else modelRef(r[key]);
  }
  if(r.capacityMl!==null&&r.usableFillMl!==null&&Number(r.usableFillMl)>Number(r.capacityMl))throw new TypeError('Usable fill exceeds capacity');
  return {...r,missing:packageFields.filter(k=>r[k]===null&&!(r.component==='dry-pepita-packet'&&k==='microwaveEvidence')),
   suitability:'UNVERIFIED_NOT_APPROVED',removeBeforeHeating:r.component==='dry-pepita-packet'};
 });
 return freezeModel({recipeFingerprint:p.recipeFingerprint,candidates,approved:false,
  notice:'Source references are not compliance certification. Verify actual food-contact documents, freeze/reheat conditions, seal and attachment method. No compostability claim.',publicCheckoutEnabled:false});
}
