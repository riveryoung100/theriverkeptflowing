/** Private operational adapters over canonical FOOD formulations, costing and nutrition. */
import {validateFoodRecipeDraft,type FoodRecipeDraft} from '../../src/lib/food/draft-domain';
import {validateFoodRecipeVersion,validateFoodComponentVersion,type FoodRecipeVersion,type FoodComponentVersion} from '../../src/lib/food/recipe-component-domain';
import {deriveFoodRecipeCost,deriveFoodComponentCost,projectFoodYieldToPortions,projectFoodTargetPortionCost,createFoodPricingScenario,validateFoodIngredientCostProfile,type FoodIngredientCostProfile,type FoodMoney} from '../../src/lib/food/cost-pricing-domain';
import {deriveFoodRecipeNutrition,deriveFoodComponentNutrition,type FoodIngredientNutritionProfile,FOOD_CORE_NUTRIENTS} from '../../src/lib/food/nutrition-domain';
import {validateTableEntry,strictObject} from '../../src/lib/food/table-catalog';
import {freezeModel,modelRef,instant} from '../../src/lib/food/table-scheduling';
import {modelFingerprint} from '../../src/lib/food/table-capacity-model';
import {validateFoodPackageLabelAgainstSources} from '../../src/lib/food/package-label-reference-domain';

export type Knowledge={state:'UNKNOWN';minorUnits:null;sourceReference:null}|{state:'KNOWN'|'ESTIMATED';minorUnits:number;sourceReference:string};
export type RecipeState='DRAFT'|'MEASURED'|'REVIEWED'|'APPROVED'|'REJECTED'|'RETIRED';
export interface RecipeOperations {
 schemaVersion:1;recipe:FoodRecipeDraft;formulation:FoodRecipeVersion|null;components:readonly FoodComponentVersion[];
 portionGrams:number|null;servings:number|null;variationGrams:number|null;storage:'unknown'|'ambient'|'refrigerated'|'frozen';
 measurements:readonly {ingredientIndex:number;grams:number|null;quantity:number|null;unit:string|null;sourceReference:string}[];
 ingredientSources:readonly {ingredientIndex:number;ingredientId:string;revision:number;preparationState:string;
   supplierReference:string|null;measurementReference:string|null;recalled:boolean;crossContact:'UNKNOWN'|'REVIEWED';crossContactReference:string|null}[];
 ingredientCosts:readonly FoodIngredientCostProfile[];componentCosts:readonly unknown[];
 nutrientProfiles:readonly FoodIngredientNutritionProfile[];componentNutrition:readonly unknown[];
 nutritionConfidence:'UNKNOWN'|'ESTIMATED'|'SOURCE_RECORDED';
 state:RecipeState;review:{fingerprint:string;sourceReference:string;reviewer:string;at:string}|null;
 expenses:{packaging:Knowledge;delivery:Knowledge;labor:Knowledge;processing:Knowledge;other:Knowledge;fixed:Knowledge};
 candidatePrice:FoodMoney|null;
}
export const positive=(v:unknown):number=>{if(typeof v!=='number'||!Number.isFinite(v)||v<=0)throw new TypeError('Positive finite measured quantity required');return v;};
const integer=(v:unknown)=>{const n=positive(v);if(!Number.isSafeInteger(n))throw new TypeError('Positive safe integer required');return n;};
const optionalRef=(v:unknown)=>v===null?null:modelRef(v);
const array=(v:unknown):unknown[]=>{if(!Array.isArray(v)||v.length>128)throw new TypeError('Bounded record array required');return v;};
export function massInGrams(quantity:number,unit:'g'|'kg'|'oz'|'lb',packs=1):number {
 positive(quantity);integer(packs);
 const factor={g:1,kg:1000,oz:28.349523125,lb:453.59237}[unit];if(!factor)throw new TypeError('Mass units only; density conversions require measured grams');
 const value=quantity*factor*packs;positive(value);if(value>Number.MAX_SAFE_INTEGER)throw new TypeError('Mass overflow');return value;
}
export interface PurchaseEvidence {
 id:string;revision:number;supplierReference:string;purchasedOn:string;receiptReference:string;
 quantity:number;unit:'g'|'kg'|'oz'|'lb';packs:number;usableGrams:number|null;
 totalMinor:number|null;taxAndFeesMinor:number|null;currency:'USD';verification:'RECORDED'|'VERIFIED';
}
/** Tax/fees must be explicitly included, including legitimate zero; unknown is not free. */
export function purchaseCostProfile(p:PurchaseEvidence,ingredient:FoodIngredientCostProfile['ingredient'],context:unknown) {
 strictObject(p,['id','revision','supplierReference','purchasedOn','receiptReference','quantity','unit','packs','usableGrams','totalMinor','taxAndFeesMinor','currency','verification']);
 modelRef(p.id);integer(p.revision);modelRef(p.supplierReference);modelRef(p.receiptReference);
 if(!/^\d{4}-\d\d-\d\d$/.test(p.purchasedOn)||new Date(p.purchasedOn).toISOString().slice(0,10)!==p.purchasedOn)throw new TypeError('Real purchase date required');
 if(p.currency!=='USD'||!['RECORDED','VERIFIED'].includes(p.verification))throw new TypeError('Explicit USD purchase verification required');
 const gross=massInGrams(p.quantity,p.unit,p.packs);
 if(p.usableGrams!==null&&(positive(p.usableGrams)>gross))throw new TypeError('Usable mass exceeds purchased mass');
 for(const n of [p.totalMinor,p.taxAndFeesMinor])if(n!==null&&(!Number.isSafeInteger(n)||n<0))throw new TypeError('Invalid purchase money');
 if(p.totalMinor===null||p.taxAndFeesMinor===null||p.usableGrams===null)return {state:'UNKNOWN' as const,profile:null,purchase:freezeModel(structuredClone(p))};
 const total=p.totalMinor+p.taxAndFeesMinor;if(!Number.isSafeInteger(total))throw new TypeError('Money overflow');
 const profile=validateFoodIngredientCostProfile({ingredient,source:{sourceReference:p.receiptReference,version:p.revision},purchase:{currency:'USD',minorUnits:total},purchasedGrams:p.usableGrams},context);
 return freezeModel({state:p.verification==='VERIFIED'?'KNOWN' as const:'ESTIMATED' as const,profile,purchase:structuredClone(p)});
}
function knowledge(input:unknown):Knowledge {
 const r=strictObject(input,['state','minorUnits','sourceReference']);
 if(r.state==='UNKNOWN'&&r.minorUnits===null&&r.sourceReference===null)return {state:'UNKNOWN',minorUnits:null,sourceReference:null};
 if(!['KNOWN','ESTIMATED'].includes(String(r.state))||!Number.isSafeInteger(r.minorUnits)||Number(r.minorUnits)<0)throw new TypeError('Explicit cost knowledge required');
 return {state:r.state as 'KNOWN'|'ESTIMATED',minorUnits:r.minorUnits as number,sourceReference:modelRef(r.sourceReference)};
}
export function recipeFingerprint(r:RecipeOperations) {
 return modelFingerprint({recipe:r.recipe,formulation:r.formulation,components:r.components,portionGrams:r.portionGrams,servings:r.servings,
  variationGrams:r.variationGrams,storage:r.storage,ingredientSources:r.ingredientSources,measurements:r.measurements,nutrientProfiles:r.nutrientProfiles,componentNutrition:r.componentNutrition});
}
export function validateRecipeOperations(input:unknown):Readonly<RecipeOperations> {
 const r=strictObject(input,['schemaVersion','recipe','formulation','components','portionGrams','servings','variationGrams','storage','measurements','ingredientSources','ingredientCosts','componentCosts','nutrientProfiles','componentNutrition','nutritionConfidence','state','review','expenses','candidatePrice']);
 if(r.schemaVersion!==1)throw new TypeError('Operations schema 1 required');
 const recipe=validateFoodRecipeDraft(r.recipe),components=array(r.components).map(validateFoodComponentVersion);
 const formulation=r.formulation===null?null:validateFoodRecipeVersion(r.formulation,recipe,components);
 const portionGrams=r.portionGrams===null?null:positive(r.portionGrams),servings=r.servings===null?null:integer(r.servings);
 const variationGrams=r.variationGrams===null?null:positive(r.variationGrams);
 const measuredIndexes=new Set<number>();
 const measurements=array(r.measurements).map(v=>{const m=strictObject(v,['ingredientIndex','grams','quantity','unit','sourceReference']);
  if(!Number.isSafeInteger(m.ingredientIndex)||Number(m.ingredientIndex)<0||!recipe.ingredients?.[Number(m.ingredientIndex)]||measuredIndexes.has(Number(m.ingredientIndex)))throw new TypeError('Unique measured ingredient required');
  measuredIndexes.add(Number(m.ingredientIndex));if(m.grams!==null)positive(m.grams);if(m.quantity!==null)positive(m.quantity);
  if(m.unit!==null)modelRef(m.unit);modelRef(m.sourceReference);
  const line=formulation?.composition.find(l=>l.kind==='ingredient'&&l.ingredientIndex===m.ingredientIndex);
  if(line&&line.grams!==m.grams)throw new TypeError('Measured mass and canonical formulation disagree');
  return m as unknown as RecipeOperations['measurements'][number];});
 if(!['DRAFT','MEASURED','REVIEWED','APPROVED','REJECTED','RETIRED'].includes(String(r.state))||!['unknown','ambient','refrigerated','frozen'].includes(String(r.storage)))throw new TypeError('Known recipe/storage status required');
 const seen=new Set<number>();const ingredientSources=array(r.ingredientSources).map(value=>{
  const s=strictObject(value,['ingredientIndex','ingredientId','revision','preparationState','supplierReference','measurementReference','recalled','crossContact','crossContactReference']);
  if(!Number.isSafeInteger(s.ingredientIndex)||Number(s.ingredientIndex)<0||!recipe.ingredients?.[Number(s.ingredientIndex)]||seen.has(Number(s.ingredientIndex)))throw new TypeError('Unique exact ingredient identity required');
  seen.add(Number(s.ingredientIndex));
  if(typeof s.recalled!=='boolean'||!['UNKNOWN','REVIEWED'].includes(String(s.crossContact)))throw new TypeError('Explicit recall/cross-contact status required');
  const crossContactReference=optionalRef(s.crossContactReference);if(s.crossContact==='REVIEWED'&&!crossContactReference)throw new TypeError('Cross-contact review source required');
  return {ingredientIndex:Number(s.ingredientIndex),ingredientId:modelRef(s.ingredientId),revision:integer(s.revision),preparationState:modelRef(s.preparationState),
   supplierReference:optionalRef(s.supplierReference),measurementReference:optionalRef(s.measurementReference),recalled:s.recalled,crossContact:s.crossContact as 'UNKNOWN'|'REVIEWED',crossContactReference};
 });
 const expensesInput=strictObject(r.expenses,['packaging','delivery','labor','processing','other','fixed']);
 const expenses=Object.fromEntries(Object.keys(expensesInput).map(key=>[key,knowledge(expensesInput[key])])) as RecipeOperations['expenses'];
 if(Object.keys(expenses).length!==6)throw new TypeError('All expense states required');
 let review:RecipeOperations['review']=null;
 if(r.review!==null){const e=strictObject(r.review,['fingerprint','sourceReference','reviewer','at']);instant(e.at as string);
  if(typeof e.fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(e.fingerprint))throw new TypeError('Recipe review fingerprint required');
  review={fingerprint:e.fingerprint,sourceReference:modelRef(e.sourceReference),reviewer:modelRef(e.reviewer),at:e.at as string};}
 if(!['UNKNOWN','ESTIMATED','SOURCE_RECORDED'].includes(String(r.nutritionConfidence)))throw new TypeError('Explicit nutrition confidence required');
 const result={schemaVersion:1 as const,recipe,formulation,components,portionGrams,servings,variationGrams,storage:r.storage as RecipeOperations['storage'],measurements,ingredientSources,
  ingredientCosts:array(r.ingredientCosts) as unknown as FoodIngredientCostProfile[],componentCosts:array(r.componentCosts),
  nutrientProfiles:array(r.nutrientProfiles) as unknown as FoodIngredientNutritionProfile[],componentNutrition:array(r.componentNutrition),
  nutritionConfidence:r.nutritionConfidence as RecipeOperations['nutritionConfidence'],state:r.state as RecipeState,review,expenses,
  candidatePrice:r.candidatePrice as FoodMoney|null};
 if(result.candidatePrice!==null&&(!Number.isSafeInteger(result.candidatePrice.minorUnits)||result.candidatePrice.minorUnits<0||result.candidatePrice.currency!=='USD'))throw new TypeError('USD hypothetical price required');
 if(formulation){deriveFoodRecipeCost(formulation,recipe,components,result.ingredientCosts,result.componentCosts,'USD');
  if(result.nutrientProfiles.length||result.componentNutrition.length)deriveFoodRecipeNutrition(formulation,recipe,components,result.nutrientProfiles,result.componentNutrition);}
 else if(result.ingredientCosts.length||result.componentCosts.length||result.nutrientProfiles.length||result.componentNutrition.length)throw new TypeError('Measured formulation required for derived evidence');
 return freezeModel(structuredClone(result));
}
export function inspectRecipeOperations(input:unknown) {
 const r=validateRecipeOperations(input),fingerprint=recipeFingerprint(r),missing:string[]=[];
 if(!r.formulation)missing.push('measured ingredient masses and batch yield');
 if(r.formulation&&r.recipe.ingredients?.some((_,i)=>!r.formulation!.composition.some(l=>l.kind==='ingredient'&&l.ingredientIndex===i)))missing.push('complete ingredient-to-formulation mass mapping');
 if(!r.portionGrams)missing.push('measured portion grams');
 if(r.recipe.ingredients?.some((_,i)=>!r.ingredientSources.find(s=>s.ingredientIndex===i&&s.measurementReference&&s.supplierReference)))missing.push('exact ingredient measurement and supplier sources');
 if(r.ingredientSources.some(s=>s.recalled))missing.push('recalled ingredient requires review');
 if(!r.ingredientSources.length||r.ingredientSources.some(s=>s.crossContact==='UNKNOWN'))missing.push('cross-contact review');
 const portion=r.formulation&&r.portionGrams?{recipe:{id:r.recipe.id,version:r.recipe.version},targetGrams:r.portionGrams}:null;
 const yieldProjection=portion?projectFoodYieldToPortions(portion,r.formulation,r.recipe,r.components):null;
 if(r.servings!==null&&yieldProjection&&r.servings!==yieldProjection.fullPortionCount)missing.push('serving count differs from measured yield');
 const cost=r.formulation?deriveFoodRecipeCost(r.formulation,r.recipe,r.components,r.ingredientCosts,r.componentCosts,'USD'):null;
 const portionCost=portion&&cost?projectFoodTargetPortionCost(portion,cost):null;
 const nutrition=r.formulation&&(r.nutrientProfiles.length||r.componentNutrition.length)?deriveFoodRecipeNutrition(r.formulation,r.recipe,r.components,r.nutrientProfiles,r.componentNutrition):null;
 if(!nutrition?.allergens.complete)missing.push('ingredient allergen evidence');
 const measured=!!r.formulation&&!!portion&&!!yieldProjection;
 const approvalCurrent=r.review?.fingerprint===fingerprint;
 if(['REVIEWED','APPROVED'].includes(r.state)&&!approvalCurrent)missing.push('review invalidated by recipe/source revision');
 const approved=r.state==='APPROVED'&&approvalCurrent&&missing.length===0;
 const ingredientPortion=portionCost?.cost.state==='known'?Number(portionCost.cost.minorUnits.numerator)/Number(portionCost.cost.minorUnits.denominator):null;
 const variableKeys=['packaging','delivery','labor','processing','other'] as const;
 const unknownExpenses=variableKeys.filter(k=>r.expenses[k].state==='UNKNOWN');
 const variable=ingredientPortion===null||unknownExpenses.length?null:ingredientPortion+variableKeys.reduce((sum,k)=>sum+Number(r.expenses[k].minorUnits),0);
 const contribution=variable!==null&&r.candidatePrice?r.candidatePrice.minorUnits-variable:null;
 if([ingredientPortion,variable,contribution].some(n=>n!==null&&!Number.isFinite(n)))throw new TypeError('Cost projection overflow');
 return freezeModel({recipe:r,fingerprint,measured,approved,missing,yieldProjection,cost,portionCost,nutrition,
  allergens:nutrition?.allergens??null,allergenStatus:nutrition?.allergens.complete?'SOURCE_REVIEW_RECORDED':'UNKNOWN',
  hypotheticalPricing:portion&&cost&&r.candidatePrice?createFoodPricingScenario(portion,cost,r.candidatePrice):null,
  finance:{classification:'PRIVATE_PLANNING_ONLY',rounding:'UNROUNDED_ESTIMATE_CANONICAL_RATIONAL_COST_RETAINED',ingredientCostMinor:ingredientPortion,variableCostMinor:variable,unknownExpenses,
   contributionMinor:contribution,contributionMarginPercent:contribution!==null&&r.candidatePrice?.minorUnits?contribution/r.candidatePrice.minorUnits*100:null,
   operatingProfitMinor:contribution!==null&&r.servings!==null&&r.expenses.fixed.state!=='UNKNOWN'?contribution*r.servings-r.expenses.fixed.minorUnits:null,
   costKnowledge:r.ingredientCosts.length===0?'UNKNOWN':unknownExpenses.length?'INCOMPLETE':'SOURCE_RECORDED',realRevenueMinor:null},
  publicCheckoutEnabled:false,legalSalePermission:false});
}
export function scaleRecipePlan(input:unknown,factor:number) {
 const r=validateRecipeOperations(input);positive(factor);if(!r.formulation)throw new TypeError('Unknown yield cannot be scaled authoritatively');
 return freezeModel({kind:'PLANNED_SCALE',sourceFingerprint:recipeFingerprint(r),recipe:{id:r.recipe.id,version:r.recipe.version},factor,
  formulation:{...r.formulation,composition:r.formulation.composition.map(line=>({...line,grams:positive(line.grams*factor)})),yieldGrams:positive(r.formulation.yieldGrams*factor)},
  measuredActualYieldGrams:null,approvalInherited:false});
}
export function portionNutrition(input:unknown,grams:number) {
 positive(grams);const info=inspectRecipeOperations(input);
 const nutrients=Object.fromEntries(FOOD_CORE_NUTRIENTS.map(key=>{const n=info.nutrition?.nutrients[key];const value=n?.state==='known'?n.value*grams/100:null;
  if(value!==null&&!Number.isFinite(value))throw new TypeError('Nutrient overflow');return [key,value];}));
 return freezeModel({recipe:{id:info.recipe.recipe.id,version:info.recipe.recipe.version},fingerprint:info.fingerprint,grams,nutrients,
  confidence:info.nutrition?info.recipe.nutritionConfidence:'UNKNOWN',labelAuthorized:false});
}
export function privateMealPlan(input:unknown,portions:readonly {grams:number;count:number}[]) {
 if(!Array.isArray(portions)||!portions.length||portions.length>128)throw new TypeError('Bounded optional meal plan required');
 const lines=portions.map(p=>{strictObject(p,['grams','count']);integer(p.count);return {count:p.count,...portionNutrition(input,p.grams)};});
 const totals=Object.fromEntries(FOOD_CORE_NUTRIENTS.map(key=>[key,lines.some(l=>l.nutrients[key]===null)?null:lines.reduce((n,l)=>n+Number(l.nutrients[key])*l.count,0)]));
 if(Object.values(totals).some(v=>v!==null&&!Number.isFinite(v)))throw new TypeError('Plan nutrient overflow');
 return freezeModel({optional:true,scope:'PRIVATE_PLANNING',lines,totals,healthInformationRequired:false,healthAdviceProvided:false});
}
export function draftOperationalLabel(input:unknown,catalogInput:unknown,lotReference:string|null=null) {
 const info=inspectRecipeOperations(input),entry=validateTableEntry(catalogInput);
 if(entry.recipe.id!==info.recipe.recipe.id||entry.recipe.version!==info.recipe.recipe.version||modelFingerprint(entry.recipe)!==modelFingerprint(info.recipe.recipe))throw new TypeError('Exact canonical recipe label binding required');
 if(lotReference!==null)modelRef(lotReference);
 const binding=entry.sku?validateFoodPackageLabelAgainstSources({id:`food-package-label:${entry.slug}`,version:1,sku:{id:entry.sku.id,version:entry.sku.version},package:entry.sku.package,
  servingOffer:{offerId:entry.offer.offerId,version:entry.offer.version},presentation:{dishId:entry.presentation.dishId,version:entry.presentation.version},
  product:{id:entry.product.id,version:entry.product.version},recipe:{id:entry.recipe.id,version:entry.recipe.version},displayTitle:entry.presentation.name},
  {sku:entry.sku,servingOffer:entry.offer,presentation:entry.presentation,product:entry.product,recipe:entry.recipe}):null;
 return freezeModel({state:'AWAITING_REVIEW',approvedForPrint:false,legalComplianceClaim:false,binding,productName:entry.presentation.name,
  recipe:{id:entry.recipe.id,version:entry.recipe.version},fingerprint:info.fingerprint,lotReference,
  ingredients:entry.ingredientsStatus==='verified'?(entry.recipe.ingredients??[]).map(i=>i.name):null,
  allergens:info.allergenStatus==='SOURCE_REVIEW_RECORDED'?info.allergens?.declarations:null,
  netGrams:info.measured?info.recipe.portionGrams:null,storage:entry.offer.storageSummary??null,reheating:entry.offer.reheatingSummary??null,
  nutritionFacts:null,missing:[...info.missing,'independent label and regulatory approval','approved operator/statutory statements']});
}
export function sourceBackedEligibility(input:unknown,catalogInput:unknown) {
 const info=inspectRecipeOperations(input),entry=validateTableEntry(catalogInput);
 if(entry.recipe.id!==info.recipe.recipe.id||entry.recipe.version!==info.recipe.recipe.version||modelFingerprint(entry.recipe)!==modelFingerprint(info.recipe.recipe))throw new TypeError('Exact product recipe required');
 const gates={recipe:info.approved,portion:info.measured,allergens:info.allergenStatus==='SOURCE_REVIEW_RECORDED',
  costs:info.portionCost?.cost.state==='known'&&info.finance.unknownExpenses.length===0,price:entry.approvedPrice!==null,
  tax:entry.product.salesTaxReview?.state==='reviewed'&&entry.product.salesTaxReview.conclusion!=='inconclusive',
  regulatory:entry.product.cottageReview?.state==='reviewed'&&entry.product.cottageReview.conclusion==='eligible',
  fulfillment:entry.fulfillment.pickup===true||entry.fulfillment.localDelivery===true,availability:entry.state==='AVAILABLE'&&Number(entry.remainingCapacity)>0};
 return freezeModel({gates,missing:Object.entries(gates).filter(([,ok])=>!ok).map(([key])=>key),commerciallyEligibleForReview:Object.values(gates).every(Boolean),
  publicCheckoutEnabled:false,launchAuthorized:false});
}
export {deriveFoodComponentCost,deriveFoodComponentNutrition};
