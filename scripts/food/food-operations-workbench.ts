/** Private operational workbench over existing exact recipe/catalog/production sources. */
import {inspectRecipeOperations,sourceBackedEligibility,draftOperationalLabel,privateMealPlan} from './food-operations';
import {planProduction,productionReadiness,inspectOperationalFulfillment} from './food-production-operations';
import {validateTableEntry,strictObject} from '../../src/lib/food/table-catalog';
import {freezeModel,instant} from '../../src/lib/food/table-scheduling';
import type {TableWindow,TableDeliveryPolicy,TableDeliveryRequest} from '../../src/lib/food/table-scheduling';

/** A combined report is a private decision aid, never an authority to release stock or accept payment. */
export function inspectPrivateFoodWorkbench(input:unknown) {
 const r=strictObject(input,['recipe','catalog','batch','targetServings','ingredientInventory','window','deliveryPolicy','deliveryRequest','now','quantity']);
 const record=inspectRecipeOperations(r.recipe);
 const entry=validateTableEntry(r.catalog);
 // Exact binding is checked inside the existing canonical eligibility/label adapters.
 const eligibility=sourceBackedEligibility(r.recipe,entry);
 const label=draftOperationalLabel(r.recipe,entry);
 if(r.now!==null)instant(r.now as string);
 if(!Number.isSafeInteger(r.quantity)||Number(r.quantity)<1)throw new TypeError('Private quantity must be a positive integer');
 if(r.targetServings!==null&&(!Number.isSafeInteger(r.targetServings)||Number(r.targetServings)<1))throw new TypeError('Target servings must be positive or null');
 if(!Array.isArray(r.ingredientInventory)||r.ingredientInventory.length>128)throw new TypeError('Bounded measured inventory required');
 if(r.deliveryPolicy!==null&&r.window===null)throw new TypeError('A delivery policy requires a fulfillment window');
 if(r.deliveryRequest!==null&&r.window===null)throw new TypeError('A delivery request requires a fulfillment window');
 if(r.window!==null&&r.now===null)throw new TypeError('Window evaluation requires a current UTC observation');
 const planned=r.targetServings===null?null:record.measured?
  planProduction(r.recipe,r.targetServings as number,r.ingredientInventory as Parameters<typeof planProduction>[2]):null;
 const batch=r.batch===null?null:productionReadiness(r.batch,r.recipe);
 const fulfillment=inspectOperationalFulfillment(r.window as TableWindow|null,r.deliveryPolicy as TableDeliveryPolicy|null,
  r.deliveryRequest as TableDeliveryRequest|null,r.now===null?'2026-01-01T00:00:00.000Z':r.now as string,r.quantity as number);
 const missing=[...record.missing,...eligibility.missing.map(s=>`commercial eligibility: ${s}`),
  ...label.missing.map(s=>`label: ${s}`),
  ...(r.targetServings!==null&&!planned?['measured recipe/portion required before batch planning']:[]),
  ...(planned?.requirements.filter(line=>line.kind==='ingredient'&&line.shortfallGrams===null).map(()=> 'inventory quantity evidence needed')??[]),
  ...(planned?.requirements.filter(line=>line.kind==='ingredient'&&line.shortfallGrams!==null&&line.shortfallGrams>0).map(()=> 'ingredient shortfall requires sourcing')??[]),
  ...(batch?batch.missing:['measured and reviewed physical batch required']),
  ...fulfillment.blockers,...['independent legal and food safety review','owner launch authorization','production D1 and live payments not validated']];
 const priority=[...new Set(missing)];
 return freezeModel({kind:'PRIVATE_FOOD_OPERATIONS_WORKBENCH',scope:'LOCAL_SOURCE_EVIDENCE_ONLY',
  recipe:{id:record.recipe.recipe.id,version:record.recipe.recipe.version,fingerprint:record.fingerprint,state:record.recipe.state,
   measured:record.measured,approvalCurrent:record.approved,missing:record.missing},
  costing:{ingredientPortionMinor:record.finance.ingredientCostMinor,variableMinor:record.finance.variableCostMinor,
   contributionMinor:record.finance.contributionMinor,operatingProfitMinor:record.finance.operatingProfitMinor,
   unknownExpenses:record.finance.unknownExpenses,realRevenueMinor:null,candidatePriceMinor:record.recipe.candidatePrice?.minorUnits??null},
  nutrition:{confidence:record.recipe.nutritionConfidence,portionGrams:record.recipe.portionGrams,
   preview:record.recipe.portionGrams?privateMealPlan(r.recipe,[{grams:record.recipe.portionGrams,count:1}]):null,approvedForLabel:false},
  label:{status:label.state,approvedForPrint:false,missing:label.missing},
  proposedProduction:planned,actualProduction:batch?{state:batch.batch.state,measuredUnits:batch.measuredUnits,
   availableUnits:null,releaseAuthorized:false,missing:batch.missing}:null,
  fulfillment:{status:fulfillment.status,missing:fulfillment.blockers,configurationOnly:true},
  product:{id:entry.product.id,version:entry.product.version,commercialReviewEligible:eligibility.commerciallyEligibleForReview,
   missing:eligibility.missing},
  priorities:priority,launchStatus:'BLOCKED',publicCheckoutEnabled:false,inventoryReleased:false,ownerAuthorization:false,
  notice:'Private source evidence only: neither a batch plan nor a passed test is proof of safe food, inventory, legal eligibility, revenue, or live checkout authorization.'});
}
