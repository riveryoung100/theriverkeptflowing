/** FOOD-031: event-driven private experiments over existing food engines. */
import {strictObject,validateTableEntry} from '../../src/lib/food/table-catalog';
import {freezeModel,instant,modelRef} from '../../src/lib/food/table-scheduling';
import {context,hash,bounded,quantity,whole,validateSource,validatePackageLink,packageRoles,type StoredSource,type SourceRecord} from './food-commercial-evidence';
import {applyPrivateFoodEvidence} from './food-evidence-intake';
import {inspectRecipeOperations,recipeFingerprint,type RecipeOperations,type PurchaseEvidence} from './food-operations';
import {initialPrivateSkuGovernance,applyPrivateSkuProposal,fingerprintPrivateSkuGovernance} from './food-sku-governance';
import {batchPurchasing,purchasingTemplate} from './food-batch-purchasing';
import {packageFields} from './food-pilot-planning';

export const sauceCandidates={A:'Cilantro-lime base, no kale',B:'Cilantro-lime with blanched kale',C:'Cilantro-lime with lightly steamed kale'} as const;
export type Candidate=keyof typeof sauceCandidates;
export const qualityFields=['flavor','bitterness','limeBrightness','kaleDetectability','color','texture','freezerSeparation','microwaveSeparation','riceMoisture','overallPreference'] as const;
type Action='init'|'weigh'|'receipt'|'yield'|'package'|'observe'|'finance';
export interface TrialEvent {batchId:string;candidate:Candidate;baseFingerprint:string;action:Action;payload:unknown;}
type Workbench={recipe:RecipeOperations;catalog:ReturnType<typeof validateTableEntry>;batch:null;targetServings:null;ingredientInventory:[];window:null;deliveryPolicy:null;deliveryRequest:null;now:null;quantity:number};
export interface TrialState {batchId:string;candidate:Candidate;workbench:Workbench;originIngredients:(number|null)[];
 sources:StoredSource[];weighings:Record<string,unknown>[];portions:number[];leftoversGrams:number|null;packageComponents:Record<string,unknown>[];observations:Record<string,unknown>[];finance:unknown|null;revision:number;}
function note(v:unknown,max=2000):string{if(typeof v!=='string'||!v.trim()||v.length>max||v!==v.trim())throw new TypeError('Bounded observation text required');return v;}
export function validateTrialEvent(input:unknown,base:unknown):TrialEvent{
 const p=strictObject(input,['batchId','candidate','baseFingerprint','action','payload']);modelRef(p.batchId);
 if(!Object.hasOwn(sauceCandidates,String(p.candidate))||!['init','weigh','receipt','yield','package','observe','finance'].includes(String(p.action)))throw new TypeError('Explicit trial action and experimental candidate required');
 if(p.baseFingerprint!==hash(base))throw new TypeError('STALE: original workbench or recipe revision changed');
 context(base);return p as unknown as TrialEvent;
}
/** A private calculation context, not a canonical recipe revision or adoption. */
function experimentalWorkbench(base:unknown,candidate:Candidate){
 const {r,c}=context(base);
 const originIngredients:(number|null)[]=[],ingredients=(r.recipe.ingredients??[]).flatMap((line,i)=>{
  if(/feta|mushroom|greens|kale/i.test(line.name))return [];
  originIngredients.push(i);return [line];
 });
 if(candidate!=='A'){ingredients.push({kind:'simple',name:'Kale in cilantro-lime sauce — EXPERIMENTAL'});originIngredients.push(null);}
 const recipe={...structuredClone(r.recipe),ingredients,evidence:[],allergenReview:{state:'pending' as const,declarations:[]}};
 const unknown=()=>({state:'UNKNOWN' as const,minorUnits:null,sourceReference:null});
 const operations:RecipeOperations={...structuredClone(r),recipe,formulation:null,components:[],measurements:[],ingredientSources:[],ingredientCosts:[],componentCosts:[],nutrientProfiles:[],componentNutrition:[],
  portionGrams:null,servings:null,variationGrams:null,storage:'unknown',nutritionConfidence:'UNKNOWN',state:'DRAFT',review:null,candidatePrice:null,
  expenses:{packaging:unknown(),delivery:unknown(),labor:unknown(),processing:unknown(),other:unknown(),fixed:unknown()}};
 const catalog=validateTableEntry({...structuredClone(c),recipe,product:{id:c.product.id,version:c.product.version,recipe:{id:recipe.id,version:recipe.version},evidence:[]},
  state:'DRAFT',display:'hidden',ordering:'not-accepting',availability:'unavailable',ingredientsStatus:'proposed',nutrition:null,sku:null,packageDefinition:null,approvedPrice:null,
  remainingCapacity:null,maxPerOrder:null,fulfillment:{pickup:null,localDelivery:null}});
 return {workbench:{recipe:operations,catalog,batch:null,targetServings:null,ingredientInventory:[],window:null,deliveryPolicy:null,deliveryRequest:null,now:null,quantity:1} as Workbench,originIngredients};
}
function intake(state:TrialState,kind:string,fields:Record<string,unknown>){
 const r=state.workbench.recipe;
 state.workbench=applyPrivateFoodEvidence(state.workbench,{kind,recipeId:r.recipe.id,recipeVersion:r.recipe.version,expectedFingerprint:recipeFingerprint(r),...fields}).record as unknown as Workbench;
}
function trialSource(state:TrialState,event:StoredSource,kind:StoredSource['kind'],data:unknown,subject:string):StoredSource{
 const record:SourceRecord={binding:context(state.workbench).binding,subject,observedAt:event.record.observedAt,sourceReference:event.record.sourceReference,data};
 return {sequence:event.sequence,revision:event.revision,kind,subject,fingerprint:hash(record),record};
}
function addCost(state:TrialState,index:number,purchase:PurchaseEvidence){
 if(!state.workbench.recipe.formulation||purchase.verification!=='VERIFIED')return;
 if(state.workbench.recipe.ingredientCosts.some(p=>p.ingredient.kind==='recipe'&&p.ingredient.ingredientIndex===index))throw new TypeError('Cost already captured; create a new experiment instead of overwriting');
 intake(state,'verified-purchase',{ingredientIndex:index,purchase});
}
function linkedPackage(state:TrialState,event:StoredSource){
 if(!state.workbench.recipe.portionGrams||packageRoles.some(role=>!state.packageComponents.some(x=>x.role===role)))return;
 const c=state.workbench.catalog,g=initialPrivateSkuGovernance(c),id=state.batchId.replace(/[^A-Za-z0-9_-]/g,'-');
 const governance=applyPrivateSkuProposal(g,c,{sku:{id:`food-sku:trial-${id}`,version:1,servingOffer:{offerId:c.offer.offerId,version:c.offer.version},package:{id:`food-package-definition:trial-${id}`,version:1}},
  packageDefinition:{id:`food-package-definition:trial-${id}`,version:1,netQuantity:{basis:'grams',grams:state.workbench.recipe.portionGrams}},
  source:{recordedAt:event.record.observedAt,recordedBy:'private-trial-operator',packagingEvidence:event.record.sourceReference,portionEvidence:'private-trial:actual-packed-weights'}},fingerprintPrivateSkuGovernance(g,c));
 const data={governance,recipeFingerprint:recipeFingerprint(state.workbench.recipe),components:state.packageComponents,storageConfiguration:'FROZEN_MAIN_SEPARATE_DRY_PACKET',heatingConfiguration:'REMOVE_PACKET_HEAT_MAIN_WITH_INTERNAL_SAUCE'};
 validatePackageLink(data,state.workbench);state.sources=state.sources.filter(s=>s.kind!=='packaging');state.sources.push(trialSource(state,event,'packaging',data,'trial-package:'+state.batchId));
}
export function validateThermalObservation(input:unknown,state:TrialState){
 const p=strictObject(input,['id','portionId','trayReference','frozenStartedAt','storageReadings','reheatingMethod','microwaveWatts','heatingIntervalsSeconds','restSeconds','finalReadings','thermometerReference','calibrationReference','packetRemoved','quality','unevenHeating','containerBehavior','sealIntegrity','sauceTexture','sauceSeparation','riceTexture','sweetPotatoTexture','beanTexture','vegetableTexture','pepitaPacketCondition','acceptance','notes']);
 modelRef(p.id);modelRef(p.portionId);modelRef(p.trayReference);instant(p.frozenStartedAt as string);
 if(!state.portions.length||!state.portions.some((_,i)=>p.portionId===`${state.batchId}:portion-${i+1}`))throw new TypeError('Exact actually packed portion required');
 const tray=state.packageComponents.find(x=>x.role==='tray')?.candidate as {supplierReference:unknown}|undefined;
 if(!tray||tray.supplierReference!==p.trayReference)throw new TypeError('Exact recorded tray reference required');
 if(p.microwaveWatts!==null)whole(p.microwaveWatts);
 bounded(p.heatingIntervalsSeconds).forEach(v=>whole(v));quantity(p.restSeconds,true);
 for(const raw of [...bounded(p.storageReadings),...bounded(p.finalReadings)]){
  const t=strictObject(raw,['at','value','unit','knowledge','location','sourceReference']);instant(t.at as string);modelRef(t.location);modelRef(t.sourceReference);
  if(!['C','F'].includes(String(t.unit))||!['MEASURED','ESTIMATED'].includes(String(t.knowledge))||typeof t.value!=='number'||!Number.isFinite(t.value)||Number(t.value)<(t.unit==='C'?-273.15:-459.67)||Number(t.value)>1000)throw new TypeError('Finite explicit temperature observation required');
  if(instant(t.at as string)<instant(p.frozenStartedAt as string))throw new TypeError('Temperature precedes frozen storage start');
  if(t.knowledge==='MEASURED'){modelRef(p.thermometerReference);modelRef(p.calibrationReference);}
 }
 if(p.thermometerReference!==null)modelRef(p.thermometerReference);if(p.calibrationReference!==null)modelRef(p.calibrationReference);
 if(p.packetRemoved!==true&&p.packetRemoved!==false&&p.packetRemoved!==null)throw new TypeError('Explicit packet removal observation required');
 note(p.reheatingMethod,256);
 const scores=strictObject(p.quality,qualityFields);
 for(const k of qualityFields)if(scores[k]!==null&&(typeof scores[k]!=='number'||Number(scores[k])<1||Number(scores[k])>5||!Number.isInteger(scores[k])))throw new TypeError('Quality ratings are 1–5 or unknown');
 for(const k of ['unevenHeating','containerBehavior','sealIntegrity','sauceTexture','sauceSeparation','riceTexture','sweetPotatoTexture','beanTexture','vegetableTexture','pepitaPacketCondition','acceptance','notes'])if(p[k]!==null)note(p[k]);
 return structuredClone(p);
}
export function projectFirstBatch(base:unknown,events:readonly StoredSource[]):TrialState{
 let state:TrialState|undefined;
 for(const event of events){
  if(event.kind!=='first-batch'||hash(event.record)!==event.fingerprint)throw new TypeError('Corrupt trial event');
  const e=validateTrialEvent(event.record.data,base);
  if(event.subject!==e.batchId||event.record.subject!==e.batchId||event.revision!==(state?.revision??0)+1)throw new TypeError('Trial sequence or identity mismatch');
  if(!state){if(e.action!=='init')throw new TypeError('Initialize experimental batch first');
   const init=strictObject(e.payload,['purpose']);note(init.purpose);const exp=experimentalWorkbench(base,e.candidate);
   state={batchId:e.batchId,candidate:e.candidate,...exp,sources:[],weighings:[],portions:[],leftoversGrams:null,packageComponents:[],observations:[],finance:null,revision:0};
  }else{
   if(e.action==='init'||e.batchId!==state.batchId||e.candidate!==state.candidate)throw new TypeError('Immutable experiment identity');
   if(e.action==='weigh'){
    const p=strictObject(e.payload,['ingredientIndex','ingredientId','sourceRevision','supplierReference','purchasedProduct','usedGrams','rawGrams','drainedGrams','discardGrams','preparedGrams','preparation','recallReviewedClear']);
    const index=whole(p.ingredientIndex,true);if(!state.workbench.recipe.recipe.ingredients?.[index])throw new TypeError('Unknown experimental ingredient index');
    if(p.recallReviewedClear!==true)throw new TypeError('Actual ingredient recall review must be recorded');
    whole(p.sourceRevision);modelRef(p.ingredientId);quantity(p.usedGrams);
    for(const k of ['rawGrams','drainedGrams','discardGrams','preparedGrams'])if(p[k]!==null)quantity(p[k],k==='discardGrams');
    if(p.preparedGrams!==null&&Number(p.usedGrams)>Number(p.preparedGrams)||p.drainedGrams!==null&&p.preparation==='drained'&&Number(p.usedGrams)>Number(p.drainedGrams))throw new TypeError('Used quantity exceeds prepared/drained supply');
    intake(state,'ingredient-measurement',{ingredientIndex:index,grams:p.usedGrams,sourceReference:event.record.sourceReference});
    intake(state,'ingredient-source',{ingredientIndex:index,ingredientId:p.ingredientId,revision:p.sourceRevision,preparationState:p.preparation,supplierReference:p.supplierReference,measurementReference:event.record.sourceReference,recalled:false,crossContact:'UNKNOWN',crossContactReference:null});
    const d={ingredientIndex:index,ingredientId:p.ingredientId,purchasedProduct:p.purchasedProduct,supplierReference:p.supplierReference,quantity:p.usedGrams,unit:'g',preparation:'prepared',rawGrams:p.rawGrams,drainedGrams:p.drainedGrams,wasteGrams:p.discardGrams,cookedYieldGrams:p.preparedGrams,packedYieldGrams:null,portions:null,measurementReference:event.record.sourceReference,purchase:null};
    const s=trialSource(state,event,'measurement',d,`${state.batchId}:ingredient-${index}`);validateSource('measurement',s.record,state.workbench);state.sources.push(s);
    state.weighings.push({...p,observedAt:event.record.observedAt,sourceReference:event.record.sourceReference,knowledge:'MEASURED'});
   }else if(e.action==='receipt'){
    const p=strictObject(e.payload,['ingredientIndex','purchasedProduct','purchase']);const index=whole(p.ingredientIndex,true);
    const prior=state.sources.find(s=>s.kind==='measurement'&&(s.record.data as {ingredientIndex:number}).ingredientIndex===index);
    if(!prior)throw new TypeError('Weigh/register actual ingredient before associating receipt');
    const old=prior.record.data as Record<string,unknown>;if(old.purchase!==null||old.purchasedProduct!==p.purchasedProduct)throw new TypeError('Receipt already recorded or purchased product mismatch');
    const d={...old,purchase:p.purchase};const s=trialSource(state,event,'measurement',d,prior.subject);
    validateSource('measurement',s.record,state.workbench);state.sources=state.sources.filter(x=>x!==prior);state.sources.push(s);addCost(state,index,p.purchase as PurchaseEvidence);
   }else if(e.action==='yield'){
    const p=strictObject(e.payload,['cookedGrams','packedGrams','portionWeights','leftoversGrams','wasteGrams','method','captureSource']);
    const weights=bounded(p.portionWeights).map(v=>quantity(v));if(!weights.length)throw new TypeError('Actual packed portion weights required');
    const packed=weights.reduce((a,b)=>a+b,0);quantity(p.cookedGrams);quantity(p.packedGrams);quantity(p.leftoversGrams,true);quantity(p.wasteGrams,true);
    if(Math.abs(packed-Number(p.packedGrams))>1e-6||Math.abs(packed+Number(p.leftoversGrams)+Number(p.wasteGrams)-Number(p.cookedGrams))>1e-6)throw new TypeError('Packed portions, leftovers and waste must reconcile to cooked yield');
    const d={cookedYieldGrams:p.cookedGrams,wasteGrams:Number(p.wasteGrams)+Number(p.leftoversGrams),packedYieldGrams:packed,portionGrams:packed/weights.length,portions:weights.length,method:[note(p.method)],captureSource:p.captureSource,storage:'frozen'};
    validateSource('batch-yield',trialSource(state,event,'batch-yield',d,'trial-yield:'+state.batchId).record,state.workbench);
    intake(state,'measured-yield',{yieldGrams:packed,portionGrams:d.portionGrams,servings:d.portions,method:d.method,captureSource:d.captureSource,storage:'frozen'});
    state.portions=weights;state.leftoversGrams=Number(p.leftoversGrams);
    for(const s of state.sources.filter(x=>x.kind==='measurement')){const m=s.record.data as {ingredientIndex:number;purchase:PurchaseEvidence|null};if(m.purchase)addCost(state,m.ingredientIndex,m.purchase);}
    state.sources.push(trialSource(state,event,'batch-yield',d,'trial-yield:'+state.batchId));linkedPackage(state,event);
   }else if(e.action==='package'){
    const p=strictObject(e.payload,['component']);const component=p.component as Record<string,unknown>;
    if(!packageRoles.includes(component.role as typeof packageRoles[number])||state.packageComponents.some(c=>c.role===component.role))throw new TypeError('Unique actual packaging role required');
    // Validate through the complete canonical package adapter, with unfilled OTHER roles explicit unknown.
    const trial=structuredClone(state);trial.packageComponents.push(component);
    const r=trial.workbench.recipe;if(!r.portionGrams)throw new TypeError('Record actual portion yield before packaging compatibility');
    const unfilled=packageRoles.filter(role=>!trial.packageComponents.some(c=>c.role===role)).map(role=>({role,candidate:{reference:'unknown:'+role,component:role==='pepitaPacket'?'dry-pepita-packet':'main-meal',...Object.fromEntries(packageFields.map(k=>[k,null]))},quantityPerMeal:1,purchasePackUnits:null,purchasePackPriceMinor:null,purchaseReference:null,availableUnits:null,inventoryReference:null,wasteUnitsPerBatch:null,evidenceBasis:'SUPPLIER_CLAIM'}));
    trial.packageComponents.push(...unfilled);linkedPackage(trial,event);state.packageComponents.push(structuredClone(component));linkedPackage(state,event);
   }else if(e.action==='observe'){
    const observation=validateThermalObservation(e.payload,state);
    if(state.observations.some(o=>o.id===observation.id))throw new TypeError('Duplicate trial observation identity');
    if(instant(event.record.observedAt)<instant(observation.frozenStartedAt as string))throw new TypeError('Observation precedes frozen storage');
    state.observations.push({...observation,observedAt:event.record.observedAt,sourceReference:event.record.sourceReference,recipeFingerprint:recipeFingerprint(state.workbench.recipe),safetyStatus:'UNVERIFIED'});
   }else if(e.action==='finance'){
    batchPurchasing(state.workbench,e.payload,state.sources);state.finance=structuredClone(e.payload);
   }
  }
  state.revision=event.revision;
 }
 if(!state)throw new TypeError('Experimental batch not initialized');return freezeModel(state);
}
export function validateFirstBatchAppend(history:readonly StoredSource[],record:SourceRecord,base:unknown){
 const relevant=history.filter(s=>s.kind==='first-batch'&&s.subject===record.subject);
 projectFirstBatch(base,[...relevant,{sequence:(history.at(-1)?.sequence??0)+1,revision:relevant.length+1,subject:record.subject,kind:'first-batch',record,fingerprint:hash(record)}]);
}
export function trialReport(state:TrialState){
 const info=inspectRecipeOperations(state.workbench.recipe),batch=info.cost?.total.state==='known'?Number(info.cost.total.minorUnits.numerator)/Number(info.cost.total.minorUnits.denominator):null;
 const receiptSources=state.sources.filter(s=>s.kind==='measurement').map(s=>(s.record.data as {purchase:PurchaseEvidence|null}).purchase);
 const allReceipts=receiptSources.length===state.workbench.recipe.recipe.ingredients?.length&&receiptSources.every(p=>p&&p.totalMinor!==null&&p.taxAndFeesMinor!==null);
 const spent=allReceipts?receiptSources.reduce((a,p)=>a+p!.totalMinor!+p!.taxAndFeesMinor!,0):null;
 const packageSource=state.sources.find(s=>s.kind==='packaging');
 const packaging=packageSource?validatePackageLink(packageSource.record.data,state.workbench):null;
 const perPortionPackage=packaging?.components.every(c=>c.quantityPerMeal===0||c.purchasePackUnits!==null&&c.purchasePackPriceMinor!==null)?packaging.components.reduce((a,c)=>c.quantityPerMeal===0?a:a+Number(c.quantityPerMeal)*Number(c.purchasePackPriceMinor)/Number(c.purchasePackUnits),0):null;
 const total=batch===null||perPortionPackage===null||!state.portions.length?null:batch+perPortionPackage*state.portions.length;
 const missing=[...(!state.portions.length?['Record cooked yield, individual packed weights, leftovers and waste']:[]),
  ...state.workbench.recipe.recipe.ingredients!.flatMap((line,i)=>!state.workbench.recipe.measurements.some(m=>m.ingredientIndex===i)?[`Weigh ${i}: ${line.name}`]:[]),
  ...(batch===null?['Associate complete owner-verified supplier receipts']:[]),...(packaging===null?['Record tray, lid, seal, label, dry packet and attachment evidence']:[]),
  ...(!state.observations.length?['Record actual freezing and reheating observations']:[]),'Obtain independent handling, regulatory, allergen and label review'];
 return {batchId:state.batchId,candidate:state.candidate,candidateDescription:sauceCandidates[state.candidate],status:'EXPERIMENTAL_NOT_APPROVED',revision:state.revision,
  canonicalHistoryChanged:false,mushrooms:'EXCLUDED_IN_EXPERIMENT_ONLY_OWNER_LEANING_NOT_FINAL',feta:'EXCLUDED',
  kaleStartingPoint:{plannedCookedDrainedGramsPerBowl:state.candidate==='A'?0:10,knowledge:'EXPERIMENTAL_STARTING_POINT_NOT_MEASUREMENT'},
  sauce:'Inside main bowl, above rice and below vegetables; freezing/reheating unvalidated',pepitas:'One sealed dry packet, remove before microwaving',
  ingredients:state.workbench.recipe.recipe.ingredients!.map((ingredient,index)=>({index,name:ingredient.name,canonicalOriginIndex:state.originIngredients[index],ingredientId:state.workbench.recipe.ingredientSources.find(s=>s.ingredientIndex===index)?.ingredientId??null,
   usedGrams:state.workbench.recipe.measurements.find(m=>m.ingredientIndex===index)?.grams??null,knowledge:state.workbench.recipe.measurements.some(m=>m.ingredientIndex===index)?'MEASURED':'UNKNOWN'})),
  weighingRecord:state.weighings,rawCombinedGrams:state.weighings.length===state.workbench.recipe.recipe.ingredients?.length&&state.weighings.every(w=>w.rawGrams!==null)?state.weighings.reduce((a,w)=>a+Number(w.rawGrams),0):null,
  portions:state.portions.map((grams,i)=>({id:`${state.batchId}:portion-${i+1}`,grams,knowledge:'MEASURED'})),leftoversGrams:state.leftoversGrams,
  finance:{status:total===null?'INCOMPLETE':'RECEIPT_BACKED_OWNER_VERIFIED_NOT_INDEPENDENTLY_AUTHENTICATED',ingredientConsumedMinor:batch,wholeIngredientPackagesSpentMinor:spent,
   packagingConsumedPerPortionMinor:perPortionPackage,totalBatchConsumedMinor:total,costPerFinishedPortionMinor:total===null?null:total/state.portions.length,
   weekly:state.finance===null?null:batchPurchasing(state.workbench,state.finance,state.sources)},
  observationCount:state.observations.length,observations:state.observations,nextFiveActions:missing.slice(0,5),
  foodSafety:'UNVERIFIED',regulatoryEligibility:'UNVERIFIED',authorizedSku:false,publicCheckoutEnabled:false,launchStatus:'BLOCKED'};
}
export function sauceComparison(states:readonly TrialState[]){
 return Object.entries(sauceCandidates).map(([candidate,description])=>({candidate,description,knowledge:'EXPERIMENTAL',
  trials:states.filter(s=>s.candidate===candidate).map(s=>({batchId:s.batchId,recipeFingerprint:recipeFingerprint(s.workbench.recipe),ingredientSources:s.workbench.recipe.ingredientSources,
   measuredIngredients:s.workbench.recipe.measurements,preparation:s.workbench.recipe.formulation?.method??null,results:s.observations.map(o=>o.quality)})),
  selectedForCanonicalAdoption:false,safetyApproval:false}));
}
export function trialFinanceTemplate(state:TrialState){
 const template=purchasingTemplate(state.workbench),pack=state.sources.find(s=>s.kind==='packaging');
 return {...template,packageFingerprint:pack?validatePackageLink(pack.record.data,state.workbench).packageFingerprint:null};
}
