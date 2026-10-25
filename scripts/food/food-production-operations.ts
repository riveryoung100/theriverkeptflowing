/** Private batch traceability; production evidence never becomes stock by itself. */
import {validateRecipeOperations,inspectRecipeOperations,recipeFingerprint,scaleRecipePlan,positive,type RecipeOperations} from './food-operations';
import {strictObject} from '../../src/lib/food/table-catalog';
import {freezeModel,instant,modelRef,validateWindow,windowBlockers,deliveryEligibility,type TableWindow,type TableDeliveryPolicy,type TableDeliveryRequest} from '../../src/lib/food/table-scheduling';
import {validateFoodProductionBatchVersion,type FoodProductionBatchVersion} from '../../src/lib/food/production-batch-domain';
import {reconcileFoodExactSkuPhysicalInventory} from '../../src/lib/food/exact-sku-physical-inventory-reconciliation-domain';
import {createTableCapacityModel,modelFingerprint} from '../../src/lib/food/table-capacity-model';
import type {LocalTableDatabase} from './local-test-d1';

export interface BatchOperations {
 id:string;version:number;recipe:{id:string;version:number;fingerprint:string};state:'PLANNED'|'IN_PROGRESS'|'MEASURED'|'REVIEWED'|'REJECTED'|'RETIRED';
 plannedAt:string;scheduledAt:string;targetServings:number;expectedYieldGrams:number;
 actual:{startedAt:string;finishedAt:string;yieldGrams:number;portions:number;laborMinutes:number;storage:'ambient'|'refrigerated'|'frozen';
  storageStartedAt:string;discardAt:string|null;packagingReference:string;measurementReference:string}|null;
 safety:readonly {at:string;temperatureC:number|null;sourceReference:string;procedureReference:string|null;deviationReference:string|null;correctiveActionReference:string|null}[];
 review:{sourceReference:string;reviewer:string;at:string;fingerprint:string}|null;productionEvidence:FoodProductionBatchVersion|null;
}
export function planProduction(recipeInput:unknown,targetServings:number,inventory:readonly {ingredientIndex:number;grams:number|null;sourceReference:string|null}[]) {
 const r=validateRecipeOperations(recipeInput);if(!Number.isSafeInteger(targetServings)||targetServings<1)throw new TypeError('Positive target servings required');
 if(!r.formulation||!r.portionGrams)throw new TypeError('Measured recipe/yield/portion required to plan');
 const scale=scaleRecipePlan(r,targetServings*r.portionGrams/r.formulation.yieldGrams);
 if(!Array.isArray(inventory)||inventory.length>128)throw new TypeError('Bounded measured ingredient inventory required');
 const seen=new Set<number>();for(const i of inventory){strictObject(i,['ingredientIndex','grams','sourceReference']);
  if(!Number.isSafeInteger(i.ingredientIndex)||i.ingredientIndex<0||!r.recipe.ingredients?.[i.ingredientIndex]||seen.has(i.ingredientIndex))throw new TypeError('Unique inventory ingredient required');seen.add(i.ingredientIndex);
  if(i.grams!==null&&(!Number.isFinite(i.grams)||i.grams<0||!i.sourceReference))throw new TypeError('Recorded inventory needs source and nonnegative mass');if(i.sourceReference)modelRef(i.sourceReference);}
 const requirements=scale.formulation.composition.map(line=>{
  const stocked=line.kind==='ingredient'?inventory.find(i=>i.ingredientIndex===line.ingredientIndex):null;
  return {...line,availableGrams:stocked?.grams??null,shortfallGrams:stocked?.grams===null||stocked?.grams===undefined?null:Math.max(0,line.grams-stocked.grams)};
 });
 return freezeModel({recipe:scale.recipe,fingerprint:scale.sourceFingerprint,targetServings,expectedYieldGrams:scale.formulation.yieldGrams,
  requirements,planOnly:true,actualProductionRecorded:false,inventoryReserved:false,saleAuthorized:false});
}
export function validateBatchOperations(input:unknown,recipeInput:unknown):Readonly<BatchOperations> {
 const r=validateRecipeOperations(recipeInput),b=strictObject(input,['id','version','recipe','state','plannedAt','scheduledAt','targetServings','expectedYieldGrams','actual','safety','review','productionEvidence']);
 modelRef(b.id);if(!Number.isSafeInteger(b.version)||Number(b.version)<1)throw new TypeError('Batch version required');
 const ref=strictObject(b.recipe,['id','version','fingerprint']);
 if(ref.id!==r.recipe.id||ref.version!==r.recipe.version||ref.fingerprint!==recipeFingerprint(r))throw new TypeError('Batch must pin exact original recipe fingerprint');
 if(!['PLANNED','IN_PROGRESS','MEASURED','REVIEWED','REJECTED','RETIRED'].includes(String(b.state)))throw new TypeError('Production state required');
 instant(b.plannedAt as string);instant(b.scheduledAt as string);
 const plan=planProduction(r,b.targetServings as number,[]);if(b.expectedYieldGrams!==plan.expectedYieldGrams)throw new TypeError('Expected yield must derive from plan');
 let actual:BatchOperations['actual']=null;
 if(b.actual!==null){const a=strictObject(b.actual,['startedAt','finishedAt','yieldGrams','portions','laborMinutes','storage','storageStartedAt','discardAt','packagingReference','measurementReference']);
  if(instant(a.finishedAt as string)<instant(a.startedAt as string)||instant(a.storageStartedAt as string)<instant(a.finishedAt as string))throw new TypeError('Invalid actual production chronology');
  positive(a.yieldGrams);if(!Number.isSafeInteger(a.portions)||Number(a.portions)<1||Number(a.portions)*r.portionGrams!>Number(a.yieldGrams))throw new TypeError('Actual portions exceed measured yield');
  if(typeof a.laborMinutes!=='number'||!Number.isFinite(a.laborMinutes)||a.laborMinutes<0||!['ambient','refrigerated','frozen'].includes(String(a.storage)))throw new TypeError('Actual time/storage required');
  if(a.discardAt!==null&&instant(a.discardAt as string)<=instant(a.storageStartedAt as string))throw new TypeError('Discard time must follow storage start');
  modelRef(a.packagingReference);modelRef(a.measurementReference);actual=a as unknown as BatchOperations['actual'];}
 if(['MEASURED','REVIEWED'].includes(String(b.state))&&!actual)throw new TypeError('Actual measured batch required');
 if(b.state==='PLANNED'&&actual)throw new TypeError('A plan cannot claim actual production');
 if(!Array.isArray(b.safety)||b.safety.length>256)throw new TypeError('Bounded recorded safety evidence required');
 const safety=b.safety.map(v=>{const s=strictObject(v,['at','temperatureC','sourceReference','procedureReference','deviationReference','correctiveActionReference']);instant(s.at as string);modelRef(s.sourceReference);
  if(s.temperatureC!==null&&(typeof s.temperatureC!=='number'||!Number.isFinite(s.temperatureC)))throw new TypeError('Recorded finite temperature or null required');
  for(const k of ['procedureReference','deviationReference','correctiveActionReference'])if(s[k]!==null)modelRef(s[k]);return s as unknown as BatchOperations['safety'][number];});
 let review:BatchOperations['review']=null;if(b.review!==null){const v=strictObject(b.review,['sourceReference','reviewer','at','fingerprint']);modelRef(v.sourceReference);modelRef(v.reviewer);instant(v.at as string);
  if(v.fingerprint!==modelFingerprint({actual,safety}))throw new TypeError('Batch review invalidated by operational evidence change');review=v as unknown as BatchOperations['review'];}
 if(b.state==='REVIEWED'&&(!review||!safety.length))throw new TypeError('Explicit owner batch review and evidence required');
 const productionEvidence=b.productionEvidence===null?null:validateFoodProductionBatchVersion(b.productionEvidence);
 if(productionEvidence&&(!actual||productionEvidence.producedPackageCount!==actual.portions||productionEvidence.preparedOn!==actual.startedAt.slice(0,10)))throw new TypeError('Canonical production evidence must match measured output');
 return freezeModel(structuredClone({...b,recipe:ref,actual,safety,review,productionEvidence}) as unknown as BatchOperations);
}
export function productionReadiness(batchInput:unknown,recipeInput:unknown) {
 const recipe=inspectRecipeOperations(recipeInput),batch=validateBatchOperations(batchInput,recipe.recipe);
 const blocked=recipe.recipe.state==='RETIRED'||recipe.recipe.ingredientSources.some(s=>s.recalled);
 const missing=[...recipe.missing,...(!batch.actual?['actual batch measurements']:[]),...(!batch.safety.length?['temperature/procedure evidence']:[]),
  ...(!batch.review?['owner batch review']:[]),'independent safety requirements/thresholds','physical count and inventory reconciliation','commercial release approval'];
 const capacity=createTableCapacityModel([{id:batch.id,kind:'batch',capacity:batch.actual?.portions??0}],()=>false).snapshot();
 return freezeModel({batch,blockedByRetirementOrRecall:blocked,status:'NEEDS_REVIEW',missing,capacityPreview:capacity,
  plannedUnits:batch.targetServings,measuredUnits:batch.actual?.portions??null,availableUnits:null,reservable:false,foodSafetyCertified:false});
}
export function reconcileBatchInventory(batchInput:unknown,recipeInput:unknown,recordedBalance:unknown,countObservation:unknown) {
 const readiness=productionReadiness(batchInput,recipeInput);if(!readiness.batch.productionEvidence)throw new TypeError('Canonical completed production evidence required');
 const result=reconcileFoodExactSkuPhysicalInventory(recordedBalance,countObservation);
 if(JSON.stringify(result.sku)!==JSON.stringify(readiness.batch.productionEvidence.sku))throw new TypeError('Exact batch SKU required');
 return freezeModel({reconciliation:result,readiness,availableToPromise:null,releaseAuthorized:false});
}
/** Reuses the same scheduling policy used by quotes; returns no new order authority. */
export function inspectOperationalFulfillment(windowInput:TableWindow|null,policy:TableDeliveryPolicy|null,request:TableDeliveryRequest|null,now:string,quantity:number) {
 instant(now);if(windowInput===null)return {status:'UNCONFIGURED',blockers:['Approved fulfillment window required'],publicCheckoutEnabled:false};
 const window=validateWindow(windowInput);
 if(window.method==='meetup')return freezeModel({status:windowBlockers(window,now,quantity).length?'UNAVAILABLE':'PICKUP_REVIEW_READY',blockers:windowBlockers(window,now,quantity),publicCheckoutEnabled:false});
 if(!policy||!request)return {status:'AREA_NOT_CONFIGURED',blockers:['Explicit delivery area, fee and request evidence required'],publicCheckoutEnabled:false};
 const result=deliveryEligibility(policy,request,window,now,quantity);return freezeModel({status:result.state,blockers:result.blockers,outside:result.outside,publicCheckoutEnabled:false});
}
type Stored={sequence:number;command_key:string;kind:'recipe'|'batch';id:string;version:number;fingerprint:string;payload_json:string};
export async function openFoodOperations(db:LocalTableDatabase) {
 if(db.mode!=='local-synthetic-only')throw new TypeError('Isolated local development D1 required');
 const query=async<T>(sql:string,values:(string|number|null)[]=[])=>{const r=await db.prepare(sql).bind(...values).all();if(!r.success)throw new TypeError('Local operations database failure');return r.results as T[];};
 await query(`CREATE TABLE IF NOT EXISTS table_food_operations_local(sequence INTEGER PRIMARY KEY AUTOINCREMENT,command_key TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK(kind IN ('recipe','batch')),id TEXT NOT NULL,version INTEGER NOT NULL CHECK(version>0),fingerprint TEXT NOT NULL,payload_json TEXT NOT NULL,UNIQUE(kind,id,version))`);
 const get=async(kind:string,id:string,version:number)=>{const row=(await query<Stored>('SELECT * FROM table_food_operations_local WHERE kind=? AND id=? AND version=?',[kind,id,version]))[0];return row?JSON.parse(row.payload_json):null;};
 const head=async()=>Number((await query<{head:number}>('SELECT COALESCE(MAX(sequence),0) AS head FROM table_food_operations_local'))[0]?.head??0);
 return Object.freeze({head,get,
  async append(key:string,kind:'recipe'|'batch',value:unknown,expectedHead:number) {
   modelRef(key);if(!['recipe','batch'].includes(kind)||!Number.isSafeInteger(expectedHead)||expectedHead<0)throw new TypeError('Operations kind/head required');
   let payload:Readonly<RecipeOperations>|Readonly<BatchOperations>,id:string,version:number;
   if(kind==='recipe'){payload=validateRecipeOperations(value);id=payload.recipe.id;version=payload.recipe.version;}
   else {const b=value as BatchOperations;const recipe=await get('recipe',b.recipe?.id,b.recipe?.version);if(!recipe)throw new TypeError('Persist exact recipe before batch');payload=validateBatchOperations(value,recipe);id=payload.id;version=payload.version;}
   const fingerprint=modelFingerprint(payload),json=JSON.stringify(payload);
   const oldKey=(await query<Stored>('SELECT * FROM table_food_operations_local WHERE command_key=?',[key]))[0];
   if(oldKey){if(oldKey.kind!==kind||oldKey.id!==id||oldKey.version!==version||oldKey.fingerprint!==fingerprint)throw new TypeError('Operations command identity conflict');return freezeModel({sequence:oldKey.sequence,id,version,fingerprint,replay:true});}
   const prior=version>1?await get(kind,id,version-1):null;
   if(version>1&&!prior)throw new TypeError('Consecutive historical revision required');
   if(kind==='batch'&&prior){const allowed:Record<BatchOperations['state'],readonly string[]>={PLANNED:['IN_PROGRESS','REJECTED','RETIRED'],IN_PROGRESS:['MEASURED','REJECTED'],MEASURED:['REVIEWED','REJECTED'],REVIEWED:['RETIRED'],REJECTED:['RETIRED'],RETIRED:[]};
    if(!allowed[prior.state as BatchOperations['state']].includes((payload as BatchOperations).state)||JSON.stringify(prior.recipe)!==JSON.stringify((payload as BatchOperations).recipe))throw new TypeError('Invalid immutable batch transition');}
   if(kind==='batch'&&version===1&&(payload as BatchOperations).state!=='PLANNED')throw new TypeError('New batch must start planned');
   await query(`INSERT INTO table_food_operations_local(command_key,kind,id,version,fingerprint,payload_json)
    SELECT ?,?,?,?,?,? WHERE (SELECT COALESCE(MAX(sequence),0) FROM table_food_operations_local)=?
    AND (SELECT COALESCE(MAX(version),0) FROM table_food_operations_local WHERE kind=? AND id=?)=?`,[key,kind,id,version,fingerprint,json,expectedHead,kind,id,version-1]);
   const saved=(await query<Stored>('SELECT * FROM table_food_operations_local WHERE command_key=?',[key]))[0];
   if(!saved||saved.fingerprint!==fingerprint)throw new TypeError('Operations revision conflict');
   return freezeModel({sequence:saved.sequence,id,version,fingerprint,replay:false});
  },
  async list(){return (await query<Stored>('SELECT * FROM table_food_operations_local ORDER BY sequence')).map(row=>({kind:row.kind,id:row.id,version:row.version,fingerprint:row.fingerprint,value:JSON.parse(row.payload_json)}));}
 });
}
