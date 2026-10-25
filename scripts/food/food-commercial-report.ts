/** One source crosswalk; statuses describe evidence, never grant launch authorization. */
import {context,currentSources,hash,validatePackageLink,type StoredSource} from './food-commercial-evidence';
import {inspectRecipeOperations} from './food-operations';
import {inspectPrivateFoodWorkbench} from './food-operations-workbench';
import {inspectPrivateSkuGovernance} from './food-sku-governance';
import {inspectPrivateInventoryPriceEvidence} from './food-inventory-price-evidence';
import {inspectPrivateOwnerReviewPacket} from './food-owner-review-packet';
import {batchPurchasing} from './food-batch-purchasing';
import {demandCapacity} from './food-pilot-planning';
import {recipeFingerprint} from './food-operations';
import {assessLaunchReadiness} from './launch-readiness.mjs';

type Status='PASS'|'BLOCKED'|'MISSING'|'STALE'|'PROPOSED'|'UNVERIFIED'|'NOT APPLICABLE';
export interface ReportSources {skuGovernance:unknown|null;inventoryEvidence:unknown|null;purchasing:unknown|null;
 operations:readonly {kind:string;id:string;version:number;fingerprint:string;value:unknown}[];providerAudit:{revision:number;observationCount:number}|null;}
export function authoritativeReport(workbench:unknown,records:readonly StoredSource[],sources:ReportSources){
 const {r,c,binding}=context(workbench),ops=inspectRecipeOperations(r),wb=inspectPrivateFoodWorkbench(workbench);
 const rows:{area:string;status:Status;source:string;binding:typeof binding;fingerprint:string|null;stale:boolean;missing:string[];nextAction:string;detail:unknown}[]=[];
 const add=(area:string,status:Status,source:string,detail:unknown,missing:readonly string[],nextAction:string,fingerprint:string|null=null)=>
  rows.push({area,status,source,binding,fingerprint:fingerprint??(detail===null?null:hash(detail)),stale:status==='STALE',missing:[...missing],nextAction,detail});
 const history=currentSources(records,workbench),fresh=history.filter(s=>!s.stale),proposal=fresh.filter(s=>s.kind==='formulation').at(-1);
 const storedRecipe=sources.operations.filter(s=>s.kind==='recipe'&&s.id===r.recipe.id).sort((a,b)=>b.version-a.version)[0];
 const storedValue=storedRecipe?.value as typeof r|undefined;
 // An adopted blank draft may legitimately acquire new source facts; it is not a different recipe definition.
 const obsolete=!!storedRecipe&&(storedRecipe.version>r.recipe.version||storedRecipe.version===r.recipe.version&&
  (hash(storedValue?.recipe)!==hash(r.recipe)||storedValue?.formulation!==null&&hash(storedValue?.formulation)!==hash(r.formulation)));
 add('RECIPE FORMULATION',obsolete?'STALE':proposal?'PROPOSED':ops.approved?'PASS':'UNVERIFIED','canonical draft + local operations head + proposal journal',
  {state:r.state,version:r.recipe.version,proposal:proposal?.fingerprint??null},obsolete?['newer or different canonical local recipe snapshot']:proposal?['proposal not adopted']:ops.missing,
  proposal?'Resolve selections and obtain explicit owner private-revision authorization':'Use current recipe revision and verify formulation',ops.fingerprint);
 const dependent=(area:string,status:Status,source:string,detail:unknown,missing:readonly string[],next:string,fp:string|null=null)=>add(area,obsolete?'STALE':status,source,detail,obsolete?['refresh evidence for current recipe']:missing,next,fp);
 dependent('MEASURED INGREDIENTS',r.measurements.length===r.recipe.ingredients?.length&&r.measurements.every(m=>m.grams!==null)?'PASS':'MISSING','RecipeOperations.measurements',r.measurements.length,ops.missing,'Weigh each raw ingredient and record supplier identity');
 const yieldSource=fresh.filter(s=>s.kind==='batch-yield').at(-1);
 dependent('BATCH YIELD',wb.actualProduction?.measuredUnits||yieldSource?'PASS':'MISSING','BatchOperations.actual / canonical supplemental batch yield',yieldSource?.record.data??wb.actualProduction,
  wb.actualProduction?.measuredUnits||yieldSource?[]:['actual cooked/packed yield and portions must be recorded'],'Capture cooked yield, waste and packed portions');
 const receipts=fresh.filter(s=>s.kind==='measurement'&&(s.record.data as {purchase:unknown}).purchase!==null);
 dependent('PURCHASE RECEIPTS',receipts.length?'UNVERIFIED':'MISSING','supplemental measurement journal + purchaseCostProfile',receipts.length,receipts.length?['owner verification is not independent authentication']:['actual receipts'],'Record package identity, paid cents, date and usable mass');
 dependent('INGREDIENT COSTS',ops.finance.ingredientCostMinor===null?'MISSING':'UNVERIFIED','canonical rational recipe costing',ops.finance.ingredientCostMinor,ops.finance.ingredientCostMinor===null?['complete exact ingredient purchase profiles']:['receipt verification'],'Integrate exact current receipt profiles');
 const packageSource=fresh.filter(s=>s.kind==='packaging').at(-1);
 let pkg:ReturnType<typeof validatePackageLink>|null=null;
 if(packageSource)pkg=validatePackageLink(packageSource.record.data,workbench);
 const packageRevisionConflict=!!(pkg&&c.sku&&(pkg.governance.proposal!.sku.id!==c.sku.id||pkg.governance.proposal!.sku.version!==c.sku.version));
 const stalePackage=history.some(s=>s.kind==='packaging'&&s.stale);
 dependent('PACKAGING COSTS',pkg?'UNVERIFIED':stalePackage?'STALE':'MISSING','SKU-linked component purchase evidence',pkg?.components.map(x=>({role:x.role,price:x.purchasePackPriceMinor}))??null,['documented supplier pack costs'],'Record tray, lid, seal, label, dry packet and attachment receipts',pkg?.packageFingerprint??null);
 dependent('PACKAGING APPROVAL',pkg?'PROPOSED':'MISSING','SKU/package governance + component documentation',pkg?.governance.proposal??null,['independent frozen food-contact/heating and seal review'],'Review actual manufacturer documents and complete-package tests',pkg?.packageFingerprint??null);
 let sku:ReturnType<typeof inspectPrivateSkuGovernance>|null=null,inventory:ReturnType<typeof inspectPrivateInventoryPriceEvidence>|null=null,packet:ReturnType<typeof inspectPrivateOwnerReviewPacket>|null=null;
 if(sources.skuGovernance!==null){
  try{sku=inspectPrivateSkuGovernance(sources.skuGovernance,c,r);}catch{dependent('PROPOSED SKU','STALE','private SKU governance',null,['exact product/recipe/offer revision mismatch'],'Create a current SKU proposal');}
 }
 if(sku)dependent('PROPOSED SKU','PROPOSED','private SKU governance',sku,sku.blockers,'Complete private package review',sku.fingerprint);
 else if(!rows.some(s=>s.area==='PROPOSED SKU'))dependent('PROPOSED SKU','MISSING','private SKU governance',null,['SKU proposal history'],'Supply the existing private SKU history file');
 dependent('CANONICAL SKU',c.sku?'UNVERIFIED':'MISSING','validated canonical catalog.sku',c.sku,c.sku?['stock release and independent approval']:['authorized SKU'],'Obtain separate canonical SKU authorization');
 dependent('PRICE APPROVAL',packageRevisionConflict?'STALE':c.approvedPrice?'UNVERIFIED':'MISSING','approved commercial price domain',c.approvedPrice,c.approvedPrice?['current SKU/package, costs and owner authorization']:['canonical approved price'],'Review sourced unit economics before authorizing price');
 if(sources.inventoryEvidence!==null){try{inventory=inspectPrivateInventoryPriceEvidence(sources.inventoryEvidence,c);}catch{dependent('ACTUAL INVENTORY','STALE','private inventory/price history',null,['exact SKU/recipe mismatch'],'Reconcile current canonical stock evidence');}}
 if(!rows.some(s=>s.area==='ACTUAL INVENTORY'))dependent('ACTUAL INVENTORY',packageRevisionConflict?'STALE':inventory?'UNVERIFIED':'MISSING','physical count assertions / canonical inventory authority',inventory,['fresh recorded-balance reconciliation and release authority'],'Record counts against exact canonical SKU and reconcile');
 dependent('PRODUCTION CAPACITY',wb.actualProduction?'UNVERIFIED':'MISSING','productionReadiness / BatchOperations',wb.actualProduction,['documented physical batch limits and release'],'Measure batch output and freezing/storage capacity');
 dependent('NUTRITION INFORMATION',ops.nutrition?'UNVERIFIED':'MISSING','canonical nutrition aggregation',wb.nutrition,['complete supplier nutrient profiles and final formulation'],'Source final ingredient nutrient profiles');
 dependent('ALLERGEN EVIDENCE',ops.allergenStatus==='SOURCE_REVIEW_RECORDED'?'UNVERIFIED':'MISSING','ingredient disclosure + cross-contact sources',ops.allergenStatus,['supplier subingredients, cross-contact and label review'],'Review supplier and handling evidence; no allergen-free claim');
 dependent('PRODUCT LABELS',packageRevisionConflict?'STALE':'BLOCKED','draftOperationalLabel / exact SKU',wb.label,wb.label.missing,'Review fresh label on final formulation and package');
 dependent('FREEZING/REHEATING VALIDATION','UNVERIFIED','SKU storage/package owner reviews; no certification inferred',pkg?.components??null,['actual complete-meal freezing and microwave validation'],'Validate internal sauce and remove dry packet before heating');
 dependent('FOOD HANDLING','UNVERIFIED','batch safety and procedures',wb.actualProduction,['independent handling/cooling/storage/transport review'],'Document actual process and independent food safety review');
 dependent('REGULATORY ELIGIBILITY',c.product.cottageReview?.state==='reviewed'?'UNVERIFIED':'MISSING','canonical product cottage review evidence',c.product.cottageReview??null,['independent eligibility and operating permission'],'Obtain applicable independent regulatory review');
 dependent('TAX TREATMENT',c.product.salesTaxReview?.state==='reviewed'?'UNVERIFIED':'MISSING','canonical product sales-tax review',c.product.salesTaxReview??null,['independent applicable tax review'],'Document product and business tax treatment');
 dependent('FULFILLMENT',wb.fulfillment.status==='UNCONFIGURED'?'MISSING':'UNVERIFIED','canonical scheduling / fulfillment policy',wb.fulfillment,wb.fulfillment.missing,'Validate pickup/delivery plan, handling and approval');
 const demand=fresh.filter(s=>s.kind==='demand');
 const summary=demandCapacity({recipeFingerprint:recipeFingerprint(r),capacityBowls:null,observations:demand.map(s=>({...s.record.data as object,reference:s.subject,sourceReference:s.record.sourceReference}))});
 dependent('PILOT DEMAND',demand.length?'UNVERIFIED':history.some(s=>s.kind==='demand')?'STALE':'MISSING','latest anonymous demand cohort revisions',summary,demand.length?['interest is not orders; disjoint cohort source attestation']:['anonymous observed interest'],'Record or reconfirm anonymous disjoint cohorts');
 let finance:ReturnType<typeof batchPurchasing>|null=null;
 if(sources.purchasing!==null){try{finance=batchPurchasing(workbench,sources.purchasing,records);}catch{dependent('UNIT ECONOMICS','STALE','batch purchasing / exact cost, SKU and price bindings',null,['source revision mismatch or invalid purchasing input'],'Refresh purchasing model from current sources');}}
 if(!rows.some(s=>s.area==='UNIT ECONOMICS'))dependent('UNIT ECONOMICS',finance?'UNVERIFIED':'MISSING','canonical consumed cost + whole supplier package cash',finance,finance?.scenarios.flatMap(s=>s.missing)??['current purchasing model'],'Record actual yields, receipts, inventory, package sizes and overhead');
 dependent('$200/WEEK PROFIT FEASIBILITY',finance?.targetProfit?.status==='ESTIMATED'?'UNVERIFIED':'BLOCKED','batchPurchasing target-profit scenario',finance?.targetProfit??null,['actual demand, production and purchasing feasibility; no sales proven'],'Compare sourced target volume against measured capacity and interest');
 if(sources.skuGovernance!==null){try{packet=inspectPrivateOwnerReviewPacket({catalog:c,skuGovernance:sources.skuGovernance,workbench,inventoryEvidence:sources.inventoryEvidence});}catch{/* stale components already represented above */}}
 dependent('OWNER REVIEW PACKET',packet?'UNVERIFIED':'MISSING','inspectPrivateOwnerReviewPacket',packet?.reviewPacketFingerprint??null,packet?.gates.filter(g=>g.status!=='OWNER_REVIEW_RECORDED').map(g=>g.id)??['current exact-bound owner review packet'],'Review independent gates on the final revision');
 add('PAYMENT VERIFICATION','UNVERIFIED','retained local provider audit (no provider request)',sources.providerAudit,['local observations do not prove real ordering or production payment readiness'],'Keep checkout disabled; independently verify authorized test workflow');
 const launch=assessLaunchReadiness({schemaVersion:1,productId:c.product.id,productVersion:c.product.version,launchAuthorization:null});
 add('PUBLIC LAUNCH GATES','BLOCKED','canonical launch-readiness engine + explicit owner authorization',launch,['all required independent approvals and separate owner launch authorization'],'Keep public checkout disabled');
 const actionPriority=['RECIPE FORMULATION','MEASURED INGREDIENTS','PURCHASE RECEIPTS','PACKAGING APPROVAL','REGULATORY ELIGIBILITY'];
 const ordered=[...actionPriority.flatMap(area=>rows.filter(r=>r.area===area)),...rows.filter(r=>!actionPriority.includes(r.area))];
 const actions=[...new Set(ordered.filter(x=>!['PASS','NOT APPLICABLE'].includes(x.status)).map(x=>x.nextAction))].slice(0,5);
 return freezeReport({product:c.presentation.name,binding,rows,nextFiveActions:actions,launchStatus:'BLOCKED',publicCheckoutEnabled:false,
  privateDemandRecordsExposedPublicly:false,realSalesMinor:null});
}
import {freezeModel as freezeReport} from '../../src/lib/food/table-scheduling';
