/** Private revisioned source evidence. Local D1 only; never commercial authorization. */
import {strictObject,validateTableEntry} from '../../src/lib/food/table-catalog';
import {reviseFoodRecipeDraft,reviseFoodProductDraft,validateFoodReviewDate} from '../../src/lib/food/draft-domain';
import {reviseFoodDishPresentation,reviseFoodServingOffer} from '../../src/lib/food/dish-offer-domain';
import {modelFingerprint} from '../../src/lib/food/table-capacity-model';
import {freezeModel,modelRef,instant} from '../../src/lib/food/table-scheduling';
import {inspectPrivateFoodWorkbench} from './food-operations-workbench';
import {validateRecipeOperations,recipeFingerprint,massInGrams,purchaseCostProfile,type RecipeOperations,type PurchaseEvidence} from './food-operations';
import {applyPrivateFoodEvidence} from './food-evidence-intake';
import {openFoodOperations} from './food-production-operations';
import {validatePrivateSkuGovernance} from './food-sku-governance';
import {demandCapacity,comparePackaging} from './food-pilot-planning';
import type {LocalTableDatabase} from './local-test-d1';
import {validateTrialEvent,validateFirstBatchAppend} from './food-first-batch';

export const hash=modelFingerprint;
export function context(workbench:unknown){
 inspectPrivateFoodWorkbench(workbench);
 const w=workbench as {recipe:RecipeOperations;catalog:unknown},r=validateRecipeOperations(w.recipe),c=validateTableEntry(w.catalog);
 return {r,c,binding:{product:{id:c.product.id,version:c.product.version},recipe:{id:r.recipe.id,version:r.recipe.version},
  definitionFingerprint:hash(r.recipe),offer:{offerId:c.offer.offerId,version:c.offer.version}}};
}
export type Binding=ReturnType<typeof context>['binding'];
export const bounded=(v:unknown)=>{if(!Array.isArray(v)||v.length>128)throw new TypeError('Bounded source list required');return v;};
export function quantity(v:unknown,zero=false){if(typeof v!=='number'||!Number.isFinite(v)||v>Number.MAX_SAFE_INTEGER||(zero?v<0:v<=0))throw new TypeError('Invalid measured quantity');return v;}
export function whole(v:unknown,zero=false){const n=quantity(v,zero);if(!Number.isSafeInteger(n))throw new TypeError('Whole quantity required');return n;}
function bound(v:unknown,expected:Binding){if(hash(v)!==hash(expected))throw new TypeError('Stale or cross-product source binding');}
export type Kind='formulation'|'owner-approval'|'measurement'|'batch-yield'|'packaging'|'demand'|'first-batch';
export interface SourceRecord {binding:Binding;subject:string;observedAt:string;sourceReference:string;data:unknown;}
export interface StoredSource {sequence:number;kind:Kind;subject:string;revision:number;fingerprint:string;record:SourceRecord;}
export function validateSource(kind:Kind,input:unknown,workbench:unknown):SourceRecord{
 const p=strictObject(input,['binding','subject','observedAt','sourceReference','data']),ctx=context(workbench);
 bound(p.binding,ctx.binding);modelRef(p.subject);modelRef(p.sourceReference);instant(p.observedAt as string);
 const d=p.data;
 if(kind==='formulation'){
  const f=strictObject(d,['ingredients','mushrooms','greens','feta','sauce','pepitas']);
  const next=reviseFoodRecipeDraft(ctx.r.recipe,{id:ctx.r.recipe.id,version:ctx.r.recipe.version+1,ingredients:f.ingredients,evidence:[],allergenReview:{state:'pending',declarations:[]}});
  if(!['INCLUDE','EXCLUDE','UNRESOLVED'].includes(String(f.mushrooms))||!['INCLUDE','EXCLUDE','UNRESOLVED'].includes(String(f.greens)))throw new TypeError('Explicit mushroom/greens selections required');
  if(f.feta!=='EXCLUDED'||f.sauce!=='INTERNAL_FREEZE_REHEAT_PENDING_VALIDATION'||f.pepitas!=='SEALED_DRY_REMOVE_BEFORE_HEATING')throw new TypeError('Owner formulation decisions conflict');
  const names=JSON.stringify(next.ingredients).toLowerCase();if(/feta/.test(names))throw new TypeError('Feta excluded');
  for(const [key,pattern] of [['mushrooms',/mushroom/],['greens',/greens/]] as const){
   if(f[key]==='EXCLUDE'&&pattern.test(names)||f[key]==='INCLUDE'&&!pattern.test(names))throw new TypeError('Ingredient selection conflicts with formulation');
  }
  if(!/sauce/.test(names)||!/pepita/.test(names))throw new TypeError('Internal sauce and dry pepitas must remain represented');
 }else if(kind==='owner-approval'){
  const a=strictObject(d,['proposalFingerprint','reviewer','authorization','scope']);
  if(typeof a.proposalFingerprint!=='string'||!/^[a-f0-9]{64}$/.test(a.proposalFingerprint))throw new TypeError('Exact proposal fingerprint required');
  modelRef(a.reviewer);if(a.authorization!=='OWNER_REPORTED_AUTHORIZED'||a.scope!=='PRIVATE_RECIPE_REVISION_ONLY')throw new TypeError('Explicit private owner authorization required');
 }else if(kind==='measurement'){
  validateMeasurement(d,ctx.r);
  const purchase=(d as {purchase:PurchaseEvidence|null}).purchase;
  if(purchase&&purchase.purchasedOn>String(p.observedAt).slice(0,10))throw new TypeError('Receipt cannot postdate its recorded observation');
 }
 else if(kind==='batch-yield'){
  const y=strictObject(d,['cookedYieldGrams','wasteGrams','packedYieldGrams','portionGrams','portions','method','captureSource','storage']);
  quantity(y.cookedYieldGrams);quantity(y.wasteGrams,true);quantity(y.packedYieldGrams);quantity(y.portionGrams);whole(y.portions);
  if(Number(y.cookedYieldGrams)-Number(y.wasteGrams)<Number(y.packedYieldGrams))throw new TypeError('Packed yield exceeds usable cooked yield');
  if(Math.floor(Number(y.packedYieldGrams)/Number(y.portionGrams))!==y.portions)throw new TypeError('Portions must match usable packed yield');
  const checked=applyPrivateFoodEvidence(workbench,{kind:'measured-yield',recipeId:ctx.r.recipe.id,recipeVersion:ctx.r.recipe.version,expectedFingerprint:recipeFingerprint(ctx.r),
   yieldGrams:y.packedYieldGrams,portionGrams:y.portionGrams,servings:y.portions,method:y.method,captureSource:y.captureSource,storage:y.storage});
  if(!checked)throw new TypeError('Canonical yield capture rejected');
 }
 else if(kind==='packaging')validatePackageLink(d,workbench);
 else if(kind==='demand'){
  const q=strictObject(d,['status','people','bowls','area','timing','channel']);
  demandCapacity({recipeFingerprint:recipeFingerprint(ctx.r),capacityBowls:null,observations:[{...q,reference:p.subject,sourceReference:p.sourceReference}]});
 }else if(kind==='first-batch'){
  const trial=validateTrialEvent(d,workbench);if(trial.batchId!==p.subject)throw new TypeError('Exact trial batch subject required');
 }else throw new TypeError('Unsupported private evidence kind');
 return freezeModel(structuredClone(p) as unknown as SourceRecord);
}

export function validateMeasurement(input:unknown,r:Readonly<RecipeOperations>){
 const p=strictObject(input,['ingredientId','ingredientIndex','purchasedProduct','supplierReference','quantity','unit','preparation','rawGrams','drainedGrams','wasteGrams','cookedYieldGrams','packedYieldGrams','portions','measurementReference','purchase']);
 const i=whole(p.ingredientIndex,true),source=r.ingredientSources.find(s=>s.ingredientIndex===i);
 if(!source||source.ingredientId!==p.ingredientId)throw new TypeError('Register exact canonical ingredient source before supplemental measurement');
 modelRef(p.purchasedProduct);modelRef(p.supplierReference);modelRef(p.measurementReference);
 if(p.supplierReference!==source.supplierReference||!['raw','prepared','drained'].includes(String(p.preparation)))throw new TypeError('Supplier/preparation mismatch');
 const grams=massInGrams(quantity(p.quantity),p.unit as 'g');
 for(const k of ['rawGrams','drainedGrams','wasteGrams','cookedYieldGrams','packedYieldGrams'])if(p[k]!==null)quantity(p[k],k==='wasteGrams');
 if(p.rawGrams!==null&&p.drainedGrams!==null&&Number(p.drainedGrams)>Number(p.rawGrams))throw new TypeError('Drained mass exceeds raw mass');
 if(p.packedYieldGrams!==null&&p.cookedYieldGrams!==null&&Number(p.packedYieldGrams)>Number(p.cookedYieldGrams))throw new TypeError('Packed yield exceeds cooked yield');
 if(p.rawGrams!==null&&p.wasteGrams!==null&&Number(p.wasteGrams)>Number(p.rawGrams))throw new TypeError('Waste exceeds raw mass');
 if(p.preparation==='raw'&&p.rawGrams!==null&&grams!==p.rawGrams||p.preparation==='drained'&&p.drainedGrams!==null&&grams!==p.drainedGrams)throw new TypeError('Unit/state mass mismatch');
 if(p.portions!==null)whole(p.portions);
 if(p.purchase!==null){const cost=purchaseCostProfile(p.purchase as PurchaseEvidence,{kind:'recipe',id:r.recipe.id,version:r.recipe.version,ingredientIndex:i},r.recipe);
  if(cost.purchase.supplierReference!==source.supplierReference)throw new TypeError('Receipt supplier mismatch');
  validateFoodReviewDate(cost.purchase.purchasedOn);
 }
 return {record:structuredClone(p),grams};
}
export const packageRoles=['tray','lid','seal','label','pepitaPacket','attachment'] as const;
export function validatePackageLink(input:unknown,workbench:unknown){
 const {r,c}=context(workbench),p=strictObject(input,['governance','recipeFingerprint','components','storageConfiguration','heatingConfiguration']);
 const governance=validatePrivateSkuGovernance(p.governance,c);
 if(!governance.proposal)throw new TypeError('Exact private SKU/package proposal required');
 if(p.recipeFingerprint!==recipeFingerprint(r))throw new TypeError('Stale formulation/package compatibility');
 if(p.storageConfiguration!=='FROZEN_MAIN_SEPARATE_DRY_PACKET'||p.heatingConfiguration!=='REMOVE_PACKET_HEAT_MAIN_WITH_INTERNAL_SAUCE')throw new TypeError('Package configuration conflicts with owner decisions');
 const seen=new Set<string>();
 const components=bounded(p.components).map(v=>{
  const x=strictObject(v,['role','candidate','quantityPerMeal','purchasePackUnits','purchasePackPriceMinor','purchaseReference','availableUnits','inventoryReference','wasteUnitsPerBatch','evidenceBasis']);
  if(!packageRoles.includes(x.role as typeof packageRoles[number])||seen.has(String(x.role)))throw new TypeError('Unique package role required');seen.add(String(x.role));
  whole(x.quantityPerMeal,['attachment','seal'].includes(String(x.role)));if(x.purchasePackUnits!==null)whole(x.purchasePackUnits);
  if(x.role==='pepitaPacket'&&x.quantityPerMeal!==1)throw new TypeError('Exactly one removable dry pepita packet per meal');
  if(x.purchasePackPriceMinor!==null){whole(x.purchasePackPriceMinor,true);modelRef(x.purchaseReference);}else if(x.purchaseReference!==null)throw new TypeError('Purchase price required with receipt reference');
  if(x.availableUnits!==null){whole(x.availableUnits,true);modelRef(x.inventoryReference);}else if(x.inventoryReference!==null)throw new TypeError('Explicit inventory quantity required');
  if(x.wasteUnitsPerBatch!==null)whole(x.wasteUnitsPerBatch,true);
  if(!['SUPPLIER_CLAIM','DOCUMENTS_RECORDED_NOT_INDEPENDENTLY_VERIFIED'].includes(String(x.evidenceBasis)))throw new TypeError('Evidence basis required');
  const candidate=x.candidate as Record<string,unknown>;
  comparePackaging({recipeFingerprint:p.recipeFingerprint,candidates:[candidate]});
  if(candidate.component!==(x.role==='pepitaPacket'?'dry-pepita-packet':'main-meal'))throw new TypeError('Candidate component/role mismatch');
  return x;
 });
 if(packageRoles.some(k=>!seen.has(k)))throw new TypeError('All six package roles required; unknown facts remain null');
 return {governance,components,packageFingerprint:hash({proposal:governance.proposal,components,recipeFingerprint:p.recipeFingerprint}),approved:false};
}

/** Same D1 harness as existing operations; immutable local table, per-subject CAS and command replay. */
export async function openCommercialEvidence(db:LocalTableDatabase){
 if(db.mode!=='local-synthetic-only')throw new TypeError('Local operations D1 required');
 const query=async<T>(sql:string,values:(string|number|null)[]=[])=>{
  const result=await db.prepare(sql).bind(...values).all();if(!result.success)throw new TypeError('Private evidence storage failure');return result.results as T[];
 };
 await query(`CREATE TABLE IF NOT EXISTS table_food_commercial_evidence(sequence INTEGER PRIMARY KEY AUTOINCREMENT,command_key TEXT NOT NULL UNIQUE,
  product TEXT NOT NULL,kind TEXT NOT NULL,subject TEXT NOT NULL,revision INTEGER NOT NULL CHECK(revision>0),fingerprint TEXT NOT NULL,payload_json TEXT NOT NULL CHECK(length(payload_json)<=65536),UNIQUE(product,kind,subject,revision))`);
 for(const action of ['UPDATE','DELETE'])await query(`CREATE TRIGGER IF NOT EXISTS table_food_commercial_evidence_no_${action} BEFORE ${action} ON table_food_commercial_evidence BEGIN SELECT RAISE(ABORT,'immutable private evidence'); END`);
 await query(`CREATE TRIGGER IF NOT EXISTS table_food_commercial_receipt_revision_guard BEFORE INSERT ON table_food_commercial_evidence
  WHEN NEW.kind='measurement' AND json_extract(NEW.payload_json,'$.data.purchase.id') IS NOT NULL
  BEGIN
   SELECT CASE WHEN EXISTS(SELECT 1 FROM table_food_commercial_evidence old WHERE old.product=NEW.product AND old.kind='measurement'
    AND json_extract(old.payload_json,'$.data.purchase.id')=json_extract(NEW.payload_json,'$.data.purchase.id')
    AND json_extract(old.payload_json,'$.data.purchase.revision')=json_extract(NEW.payload_json,'$.data.purchase.revision')
    AND json_extract(old.payload_json,'$.data.purchase')<>json_extract(NEW.payload_json,'$.data.purchase'))
    THEN RAISE(ABORT,'conflicting receipt revision') END;
   SELECT CASE WHEN json_extract(NEW.payload_json,'$.data.purchase.revision')>1+(SELECT COALESCE(MAX(json_extract(old.payload_json,'$.data.purchase.revision')),0)
    FROM table_food_commercial_evidence old WHERE old.product=NEW.product AND old.kind='measurement'
    AND json_extract(old.payload_json,'$.data.purchase.id')=json_extract(NEW.payload_json,'$.data.purchase.id'))
    THEN RAISE(ABORT,'receipt revision gap') END;
  END`);
 type Row={sequence:number;kind:Kind;subject:string;revision:number;fingerprint:string;payload_json:string};
 const decode=(row:Row):StoredSource=>{
  const record=JSON.parse(row.payload_json);
  if(hash(record)!==row.fingerprint||record.subject!==row.subject||!['formulation','owner-approval','measurement','batch-yield','packaging','demand','first-batch'].includes(row.kind))throw new TypeError('Corrupt private evidence row');
  whole(row.revision);whole(row.sequence);return {sequence:row.sequence,kind:row.kind,subject:row.subject,revision:row.revision,fingerprint:row.fingerprint,record};
 };
 const list=async(product:string)=>{
  modelRef(product);const rows=await query<Row>('SELECT * FROM table_food_commercial_evidence WHERE product=? ORDER BY sequence LIMIT 1025',[product]);
  if(rows.length>1024)throw new TypeError('Evidence history requires bounded archival review');return rows.map(decode);
 };
 return {list,async append(key:string,kind:Kind,record:unknown,expectedRevision:number,workbench:unknown){
  modelRef(key);whole(expectedRevision,true);if(expectedRevision===Number.MAX_SAFE_INTEGER)throw new TypeError('Revision overflow');
  const p=validateSource(kind,record,workbench),fingerprint=hash(p);
  const json=JSON.stringify(p,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b,'en'))):v);
  if(Buffer.byteLength(json)>65536)throw new TypeError('Evidence record too large');
  const old=async()=>{const rows=await query<Row>('SELECT * FROM table_food_commercial_evidence WHERE command_key=?',[key]);
   if(!rows[0])return null;if(rows[0].kind!==kind||rows[0].fingerprint!==fingerprint)throw new TypeError('Command replay content conflict');return {...decode(rows[0]),replay:true};};
  const prior=await old();if(prior)return prior;
  const history=await list(p.binding.product.id),subjectHistory=history.filter(s=>s.kind===kind&&s.subject===p.subject),latest=subjectHistory.at(-1);
  if(kind==='first-batch')validateFirstBatchAppend(history,p,workbench);
  if(kind==='measurement'){
   const receipt=(p.data as {purchase:PurchaseEvidence|null}).purchase;
   if(receipt){
    const previous=history.filter(s=>s.kind==='measurement').map(s=>(s.record.data as {purchase:PurchaseEvidence|null}).purchase).filter((v):v is PurchaseEvidence=>v!==null&&v.id===receipt.id);
    if(previous.some(v=>v.revision===receipt.revision&&hash(v)!==hash(receipt)))throw new TypeError('Conflicting duplicate receipt revision');
    const revision=previous.reduce((n,v)=>Math.max(n,v.revision),0);
    if(receipt.revision>revision+1)throw new TypeError('Consecutive receipt revisions required');
   }
  }
  if(history.length>=1024)throw new TypeError('Private evidence history limit reached');
  if(subjectHistory.some(s=>s.fingerprint===fingerprint))throw new TypeError('Duplicate evidence content; replay original command');
  if(latest&&instant(p.observedAt)<instant(latest.record.observedAt))throw new TypeError('Observation revision cannot move backwards in time');
  try{await query(`INSERT INTO table_food_commercial_evidence(command_key,product,kind,subject,revision,fingerprint,payload_json)
   SELECT ?,?,?,?,?,?,? WHERE (SELECT COALESCE(MAX(revision),0) FROM table_food_commercial_evidence WHERE product=? AND kind=? AND subject=?)=?
   AND (SELECT COUNT(*) FROM table_food_commercial_evidence WHERE product=?)<1024`,
   [key,p.binding.product.id,kind,p.subject,expectedRevision+1,fingerprint,json,p.binding.product.id,kind,p.subject,expectedRevision,p.binding.product.id]);
  }catch(error){const replay=await old();if(replay)return replay;throw error;}
  const saved=await old();if(!saved)throw new TypeError('Evidence revision conflict');return {...saved,replay:false};
 }};
}
export function latestSources(records:readonly StoredSource[]){
 const map=new Map<string,StoredSource>();for(const r of records)map.set(`${r.kind}:${r.subject}`,r);return [...map.values()].sort((a,b)=>a.sequence-b.sequence);
}
export function currentSources(records:readonly StoredSource[],workbench:unknown){
 const {binding,r}=context(workbench);
 return latestSources(records).map(s=>{
  let stale=hash(s.record.binding)!==hash(binding);
  if(!stale)try{
   if(s.kind==='measurement')validateMeasurement(s.record.data,r);
   if(s.kind==='packaging')validatePackageLink(s.record.data,workbench);
   if(s.kind==='batch-yield'&&r.formulation){const y=s.record.data as {packedYieldGrams:number;portions:number;portionGrams:number};
    if(y.packedYieldGrams!==r.formulation.yieldGrams||y.portions!==r.servings||y.portionGrams!==r.portionGrams)stale=true;}
  }catch{stale=true;}
  return {...s,stale};
 });
}
export function projectMeasurement(workbench:unknown,source:StoredSource){
 if(source.kind!=='measurement')throw new TypeError('Measurement source required');
 const checked=validateSource('measurement',source.record,workbench),{r}=context(workbench),m=validateMeasurement(checked.data,r);
 const d=m.record,command={kind:'ingredient-measurement',recipeId:r.recipe.id,recipeVersion:r.recipe.version,expectedFingerprint:recipeFingerprint(r),
  ingredientIndex:d.ingredientIndex,grams:m.grams,sourceReference:d.measurementReference};
 return applyPrivateFoodEvidence(workbench,command).record;
}
export function adoptedPrivateWorkbench(workbench:unknown,next:Readonly<RecipeOperations>){
 const {r,c}=context(workbench);
 const product=reviseFoodProductDraft(c.product,r.recipe,{id:c.product.id,version:c.product.version+1,recipe:{id:next.recipe.id,version:next.recipe.version},evidence:[],temperatureControl:'frozen'},next.recipe);
 const presentation=reviseFoodDishPresentation(c.presentation,{dishId:c.presentation.dishId,version:c.presentation.version+1,product:{id:product.id,version:product.version},
  recipe:{id:next.recipe.id,version:next.recipe.version},name:c.presentation.name,shortDescription:'Private frozen bowl formulation awaiting measurement and review.'},c.product,r.recipe,product,next.recipe);
 const offer=reviseFoodServingOffer(c.offer,{offerId:c.offer.offerId,version:c.offer.version+1,presentation:{dishId:presentation.dishId,version:presentation.version},format:c.offer.format,
  servingEstimate:{state:'unknown'},storageSummary:{state:'unknown'},reheatingSummary:{state:'unknown'}},c.presentation,presentation,c.product,r.recipe,product,next.recipe);
 const catalog=validateTableEntry({...c,recipe:next.recipe,product,presentation,offer,state:'DRAFT',display:'hidden',ordering:'not-accepting',availability:'unavailable',
  ingredientsStatus:'proposed',sku:null,packageDefinition:null,approvedPrice:null,remainingCapacity:null,maxPerOrder:null,nutrition:null,fulfillment:{pickup:null,localDelivery:null},
  finishingComponents:[{name:'Internal cilantro-lime sauce',description:'Inside main bowl; freezing and heating unvalidated.',optional:false},{name:'Dry pepita packet',description:'Remove sealed dry packet before heating.',optional:false}]});
 const result={...(workbench as object),recipe:next,catalog,batch:null,targetServings:null,ingredientInventory:[],window:null,deliveryPolicy:null,deliveryRequest:null,now:null};
 inspectPrivateFoodWorkbench(result);return result;
}
export async function adoptFormulation(db:LocalTableDatabase,workbench:unknown,proposal:StoredSource,approval:StoredSource|null,key:string,expectedOperationsHead:number){
 const {r}=context(workbench);if(proposal.kind!=='formulation')throw new TypeError('Formulation proposal required');
 const p=validateSource('formulation',proposal.record,workbench),data=p.data as {ingredients:unknown;mushrooms:string;greens:string};
 if(hash(p)!==proposal.fingerprint)throw new TypeError('Proposal content fingerprint mismatch');
 const journal=await openCommercialEvidence(db),saved=await journal.list(p.binding.product.id);
 const current=latestSources(saved).find(s=>s.kind==='formulation'&&s.subject===p.subject);
 if(current?.fingerprint!==proposal.fingerprint)throw new TypeError('Persisted current proposal required');
 if(!approval)return {status:'BLOCKED',missing:['explicit owner authorization'],publicCheckoutEnabled:false};
 if(approval.kind!=='owner-approval'||!saved.some(s=>s.kind==='owner-approval'&&s.fingerprint===approval.fingerprint))throw new TypeError('Persisted owner approval required');
 const a=validateSource('owner-approval',approval.record,workbench).data as {proposalFingerprint:string};
 if(hash(approval.record)!==approval.fingerprint)throw new TypeError('Approval content fingerprint mismatch');
 if(a.proposalFingerprint!==proposal.fingerprint)throw new TypeError('Stale owner authorization');
 if(data.mushrooms==='UNRESOLVED'||data.greens==='UNRESOLVED')return {status:'BLOCKED',missing:['resolve mushrooms and greens'],publicCheckoutEnabled:false};
 const draft=reviseFoodRecipeDraft(r.recipe,{id:r.recipe.id,version:r.recipe.version+1,ingredients:data.ingredients,evidence:[],allergenReview:{state:'pending',declarations:[]}});
 const unknown=()=>({state:'UNKNOWN' as const,minorUnits:null,sourceReference:null});
 const next=validateRecipeOperations({...r,recipe:draft,formulation:null,components:[],measurements:[],ingredientSources:[],ingredientCosts:[],componentCosts:[],nutrientProfiles:[],componentNutrition:[],
  portionGrams:null,servings:null,variationGrams:null,storage:'unknown',nutritionConfidence:'UNKNOWN',state:'DRAFT',review:null,candidatePrice:null,
  expenses:Object.fromEntries(Object.keys(r.expenses).map(k=>[k,unknown()]))});
 const store=await openFoodOperations(db);
 const result=await store.append(key,'recipe',next,expectedOperationsHead);
 return {status:'ADOPTED_PRIVATE_DRAFT',recipe:next,result,invalidated:['measurements','cost','nutrition','ingredients','allergens','packaging','production','price','owner-review'],catalogPublished:false,publicCheckoutEnabled:false};
}
