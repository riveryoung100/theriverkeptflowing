/** FOOD-019–024T: Read-only review of independent private food source histories.
 *  Never approves a SKU, publishes a price, releases stock or enables checkout.
 */
import {createHash} from 'node:crypto';
import {validateTableEntry,strictObject} from '../../src/lib/food/table-catalog';
import {freezeModel} from '../../src/lib/food/table-scheduling';
import {inspectPrivateSkuGovernance} from './food-sku-governance';
import {inspectPrivateInventoryPriceEvidence} from './food-inventory-price-evidence';
import {inspectPrivateFoodWorkbench} from './food-operations-workbench';
import {inspectRecipeOperations} from './food-operations';

export interface OwnerPacketInput {catalog:unknown;skuGovernance:unknown;workbench:unknown|null;inventoryEvidence:unknown|null;}
type GateStatus='OWNER_INPUT_REQUIRED'|'OWNER_REVIEW_RECORDED'|'RECORDED_NOT_APPROVED'|'UNVERIFIED'|'BLOCKED';
type Gate={id:string;status:GateStatus;detail:string;nextAction:string;};
const allReviewKinds=['portion','package-material','food-label','regulatory','sales-tax','storage','fulfillment','owner-price'] as const;
const digest=(o:unknown)=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const identity=(a:{id:string;version:number},b:{id:string;version:number})=>a.id===b.id&&a.version===b.version;
export function inspectPrivateOwnerReviewPacket(input:unknown){
 const p=strictObject(input,['catalog','skuGovernance','workbench','inventoryEvidence']);
 const c=validateTableEntry(p.catalog);
 const wb=p.workbench===null?null:inspectPrivateFoodWorkbench(p.workbench);
 const rawRecipe=wb?(p.workbench as {recipe:unknown}).recipe:null;
 const ops=rawRecipe===null?null:inspectRecipeOperations(rawRecipe);
 const sku=inspectPrivateSkuGovernance(p.skuGovernance,c,rawRecipe);
 const inventory=p.inventoryEvidence===null?null:inspectPrivateInventoryPriceEvidence(p.inventoryEvidence,c);
 const rawG=p.skuGovernance as {proposal:unknown;reviews:readonly {kind:string;reference:string;outcome:string;sku:{id:string;version:number}}[]};
 const gProposal=rawG.proposal as {sku:{id:string;version:number};packageDefinition:{netQuantity?:{basis:string;grams:number}}}|null;
 if(inventory){
  if(!identity(inventory.product,c.product)||!identity(inventory.recipe,c.recipe))throw new TypeError('Private inventory evidence must match exact product and recipe revision');
  if(gProposal&&inventory.sku&&(!identity(inventory.sku,gProposal.sku)))throw new TypeError('Inventory evidence bound to a different SKU proposal revision');
 }
 const recordedReviews=sku.reviews.map(x=>x.kind);
 const missingReviews=allReviewKinds.filter(kind=>!recordedReviews.includes(kind));
 const gates:Gate[]=[];
 const gate=(id:string,status:GateStatus,detail:string,nextAction:string)=>gates.push({id,status,detail,nextAction});
 if(!ops)gate('measured-recipe','OWNER_INPUT_REQUIRED','No private recipe workbench supplied','Create a private workbench and record weighed ingredients and yield');
 else if(!ops.measured)gate('measured-recipe','OWNER_INPUT_REQUIRED','Recipe and portion still lack complete measured yield','Record all ingredient masses and a real prototype capture with measured yield');
 else gate('measured-recipe','RECORDED_NOT_APPROVED','Recipe mass/yield records exist; measurement does not prove safe food','Obtain independent ingredient, food safety and recipe approval evidence');
 if(!gProposal)gate('sku-package','OWNER_INPUT_REQUIRED','No versioned owner SKU/package proposal exists','Use the SKU governance CLI to draft package ID, SKU and measured net weight');
 else gate('sku-package','RECORDED_NOT_APPROVED','SKU/package proposal is not an authorized catalog SKU','Review proposed packaging, net grams, traceability, and canonical catalog requirements');
 if(gProposal&&ops?.recipe.portionGrams!==null&&ops?.recipe.portionGrams!==undefined&&gProposal.packageDefinition.netQuantity&&Math.abs(gProposal.packageDefinition.netQuantity.grams-ops.recipe.portionGrams)>1e-6){
  gate('net-quantity-consistency','BLOCKED','Proposed package net grams conflict with measured recipe portion grams','Revise the SKU/package proposal based on actual scale evidence');
 }else if(!gProposal?.packageDefinition.netQuantity||!ops?.recipe.portionGrams){
  gate('net-quantity-consistency','UNVERIFIED','Independent net-quantity comparison is not possible yet','Measure portion weight and explicitly record matching net package grams');
 }else gate('net-quantity-consistency','RECORDED_NOT_APPROVED','Proposed net grams match owner-recorded portion grams only','Independently review final package and net weight labeling');
 if(!inventory)gate('inventory-history','OWNER_INPUT_REQUIRED','No inventory/price/compliance assertion history supplied','Create private evidence history; physical counts require canonical SKU first');
 else gate('inventory-history','RECORDED_NOT_APPROVED',`${inventory.evidenceEntries} private source assertion(s) recorded; none releases sellable stock`,'Reconcile any observed physical count to approved SKU and durable inventory authority');
 if(!c.sku)gate('canonical-sku','BLOCKED','Public catalog contains no authorized exact SKU','Complete independent product/SKU approval in existing canonical governance');
 else gate('canonical-sku','UNVERIFIED','Canonical SKU exists; separate commercial gates remain','Verify current SKU revision, batch release, and regulatory eligibility');
 if(!c.approvedPrice)gate('approved-price','BLOCKED','Catalog has no approved selling price','Document receipt-backed costs and obtain canonical commercial price approval');
 else gate('approved-price','UNVERIFIED','Catalog price exists; launch gates are still independent','Recheck price version, taxes, and relevant cost evidence');
 if(!ops||!ops.finance||ops.finance.variableCostMinor===null)gate('complete-cost','OWNER_INPUT_REQUIRED','Cost projection cannot be completed from known source evidence','Record verified supplier purchases and remaining actual operating costs');
 else gate('complete-cost','RECORDED_NOT_APPROVED','Private recipe-cost arithmetic is available, not approved business margin','Review receipts, waste assumptions, and owner pricing decision');
 if(missingReviews.length)gate('owner-review-history','OWNER_INPUT_REQUIRED',`Missing private review evidence: ${missingReviews.join(', ')}`,'Record each applicable review on current proposed SKU revision');
 else gate('owner-review-history','OWNER_REVIEW_RECORDED','All eight categories have owner source assertions, not independent certifications','Obtain the separate authoritative decisions required for sale');
 gate('regulatory-and-safety','BLOCKED','No independent food safety, legal, tax, label, storage or fulfillment approval is inferred from owner notes','Verify Texas requirements and actual operating procedures before selling');
 gate('owner-launch','BLOCKED','The owner has not authorized public checkout','Keep checkout disabled until all independent launch gates pass and owner explicitly authorizes launch');
 const actions=gates.filter(g=>g.status!=='OWNER_REVIEW_RECORDED').map(g=>({gate:g.id,action:g.nextAction,status:g.status}));
 return freezeModel({kind:'PRIVATE_OWNER_PRODUCT_REVIEW_PACKET',schemaVersion:1,scope:'OWNER_SOURCE_EVIDENCE_ONLY',
  product:{id:c.product.id,version:c.product.version},recipe:{id:c.recipe.id,version:c.recipe.version},
  skuProposal:gProposal?{id:gProposal.sku.id,version:gProposal.sku.version}:null,
  canonicalSku:c.sku?{id:c.sku.id,version:c.sku.version}:null,
  sourceFingerprints:{sku:sku.fingerprint,recipe:ops?.fingerprint??null,inventory:inventory?.fingerprint??null},
  counts:{recipeIngredients:c.recipe.ingredients?.length??0,measuredIngredientLines:ops?.recipe.measurements.length??0,
   proposedSkuRevisions:sku.earlierProposalCount+(gProposal?1:0),ownerReviewRecords:sku.reviews.length,
   independentApprovals:0,physicalCountObservations:inventory?.countObservations.length??0,
   ownerPriceAssertions:inventory?.priceAssertions.length??0},
  observations:{measuredPortionGrams:ops?.recipe.portionGrams??null,proposedPackageNetGrams:gProposal?.packageDefinition.netQuantity?.grams??null,
   recipeIngredientCostMinor:ops?.finance.ingredientCostMinor??null,unknownExpenseClasses:ops?.finance.unknownExpenses??['packaging','delivery','labor','processing','other'],
   ownerReviewKinds:recordedReviews,missingOwnerReviewKinds:missingReviews},
  gates,priorityActions:actions,reviewPacketFingerprint:digest({product:c.product,recipe:c.recipe,sku:sku.fingerprint,recipeDigest:ops?.fingerprint??null,inventory:inventory?.fingerprint??null}),
  sellableUnits:null,approvedPriceMinor:null,realSalesMinor:null,independentApproval:false,publicCheckoutEnabled:false,
  productionD1Accessed:false,launchStatus:'BLOCKED',next:'Record real recipe measures and package evidence before seeking independent approvals'});
}
