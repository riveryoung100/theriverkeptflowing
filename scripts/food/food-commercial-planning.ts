/** Private planning over canonical operations. No approval, stock or payment authority. */
import {inspectRecipeOperations} from './food-operations';
import {inspectPrivateFoodWorkbench} from './food-operations-workbench';
import {strictObject,validateTableEntry} from '../../src/lib/food/table-catalog';
import {freezeModel,modelRef} from '../../src/lib/food/table-scheduling';

export function productDecisionReview(workbench:unknown){
 const wb=inspectPrivateFoodWorkbench(workbench);
 const {recipe:raw,catalog}=workbench as {recipe:unknown;catalog:unknown};
 const r=inspectRecipeOperations(raw),c=validateTableEntry(catalog);
 if(c.slug!=='southwest-harvest-bowl')throw new TypeError('Southwest Harvest Bowl source required');
 const current=(r.recipe.recipe.ingredients??[]).map(i=>i.name);
 const removed=current.filter(n=>/feta/i.test(n));
 const unresolved=current.filter(n=>/mushroom|greens/i.test(n));
 const intended=current.filter(n=>!removed.includes(n)&&!unresolved.includes(n));
 const dependencies={allergens:'Feta intentionally excluded; supplier subingredients and cross-contact remain unverified. No milk-free or allergen-free claim.',
  cost:'Reweigh final formulation and bind each receipt to the exact supplier revision.',
  packaging:'Main frozen meal with internal sauce; one sealed dry removable pepita packet per bowl. Remove before reheating. Attachment suitability unverified.',
  nutrition:'Recalculate against final measured recipe and sourced nutrient profiles; no automatic USDA substitution.',
  shelfLife:'Validate freezing, storage duration, seal integrity and microwave heating of the complete bowl with internal sauce.'};
 return freezeModel({product:c.product.id,recipe:{id:c.recipe.id,version:c.recipe.version},sourceFingerprint:r.fingerprint,
  status:'PROPOSED_NOT_APPROVED',sourceReference:'owner-mission:food-commerce-025-030',currentCanonicalIngredients:current,
  proposedIngredients:intended,addedIngredients:[],removedIngredients:removed,explicitlyExcluded:['Feta cheese'],unresolvedIngredients:unresolved,
  sauce:'Cilantro-lime sauce inside main bowl, above rice and below vegetables; freeze/reheat validation pending',
  pepitas:'One separately sealed dry removable packet per bowl',dependencies,
  downstreamEvidenceStatus:'STALE_FOR_PROPOSED_FORMULATION',invalidatedForProposal:['label','cost','nutrition','packaging','review'],
  canonicalHistoryChanged:false,measurementsChanged:false,canonicalWorkbench:wb.recipe,publicCheckoutEnabled:false});
}

export function kitchenChecklist(workbench:unknown){
 inspectPrivateFoodWorkbench(workbench);
 const r=inspectRecipeOperations((workbench as {recipe:unknown}).recipe);
 const ingredients=(r.recipe.recipe.ingredients??[]).map((line,i)=>({index:i,name:line.name,
  measuredGrams:r.recipe.measurements.find(m=>m.ingredientIndex===i)?.grams??null,
  supplierReference:r.recipe.ingredientSources.find(s=>s.ingredientIndex===i)?.supplierReference??null,
  actions:[...(!r.recipe.measurements.some(m=>m.ingredientIndex===i&&m.grams!==null)?['Weigh raw ingredient in grams; record scale/source reference.']:[]),
   ...(!r.recipe.ingredientSources.some(s=>s.ingredientIndex===i&&s.supplierReference)?['Record supplier, exact purchased product, revision and full subingredient/allergen panel.']:[]),
   ...(!r.recipe.ingredientCosts.some(p=>p.ingredient.kind==='recipe'&&p.ingredient.ingredientIndex===i)?['Record receipt date/reference, package mass, packs, price, tax/fees and net usable grams.']:[])]}));
 return freezeModel({ingredients,batchYieldGrams:r.recipe.formulation?.yieldGrams??null,portions:r.recipe.servings,
  gramsPerPortion:r.recipe.portionGrams,steps:['Resolve mushrooms and greens before final batch; exclude feta.',
   'For beans record undrained package mass and drained usable mass separately; preserve raw weights separately from cooked yield.',
   'Record actual cooked batch yield, usable yield after losses, intended portions and actual packed portion weights.',
   'Keep estimates labeled as estimates. Never enter guessed grams or prices as measurements.'],missing:r.missing,
  publicCheckoutEnabled:false});
}

export const expenseKeys=['tray','lid','label','pepitaPacket','attachment','packagingWaste','yieldLoss','processing','delivery','other'] as const;
type Amount={minorUnits:number|null;state:'KNOWN'|'ESTIMATED'|'UNKNOWN';sourceReference:string|null};
export interface WeeklyInputs {recipeFingerprint:string;price:Amount;expenses:Record<typeof expenseKeys[number],Amount>;fixedWeekly:Amount;
 laborPerBowl:Amount;ownerHoursWeekly:number|null;capacityBowls:number|null;demandBowls:number|null;}
function amount(v:unknown):Amount {
 const p=strictObject(v,['minorUnits','state','sourceReference']);
 if(p.state==='UNKNOWN'&&p.minorUnits===null&&p.sourceReference===null)return p as unknown as Amount;
 if(!['KNOWN','ESTIMATED'].includes(String(p.state))||typeof p.minorUnits!=='number'||!Number.isSafeInteger(p.minorUnits)||p.minorUnits<0)throw new TypeError('Explicit nonnegative cents and evidence state required');
 modelRef(p.sourceReference);return p as unknown as Amount;
}
export function weeklyTemplate(recipe:unknown):WeeklyInputs {
 const unknown=():Amount=>({minorUnits:null,state:'UNKNOWN',sourceReference:null});
 return {recipeFingerprint:inspectRecipeOperations(recipe).fingerprint,price:unknown(),expenses:Object.fromEntries(expenseKeys.map(k=>[k,unknown()])) as WeeklyInputs['expenses'],
  fixedWeekly:unknown(),laborPerBowl:unknown(),ownerHoursWeekly:null,capacityBowls:null,demandBowls:null};
}
export function weeklyProfit(recipe:unknown,input:unknown,goalMinor=20000){
 const r=inspectRecipeOperations(recipe),p=strictObject(input,['recipeFingerprint','price','expenses','fixedWeekly','laborPerBowl','ownerHoursWeekly','capacityBowls','demandBowls']);
 if(p.recipeFingerprint!==r.fingerprint)throw new TypeError('Stale recipe economics');
 if(!Number.isSafeInteger(goalMinor)||goalMinor<0)throw new TypeError('Nonnegative goal cents required');
 const price=amount(p.price),fixed=amount(p.fixedWeekly),labor=amount(p.laborPerBowl);
 const e=strictObject(p.expenses,expenseKeys),expenses=expenseKeys.map(k=>amount(e[k]));
 for(const key of ['ownerHoursWeekly','capacityBowls','demandBowls'])if(p[key]!==null&&(typeof p[key]!=='number'||!Number.isFinite(p[key])||Number(p[key])<0||(key!=='ownerHoursWeekly'&&!Number.isSafeInteger(p[key]))))throw new TypeError('Invalid weekly quantity');
 const unknown=[...(r.finance.ingredientCostMinor===null?['receipt-backed ingredient cost']:[]),...expenseKeys.filter((_,i)=>expenses[i].state==='UNKNOWN'),
  ...(price.state==='UNKNOWN'?['scenario price']:[]),...(fixed.state==='UNKNOWN'?['fixed weekly overhead']:[]),...(labor.state==='UNKNOWN'?['owner labor valuation']:[])];
 const complete=unknown.length===0;
 // Canonical cost profiles preserve provenance but do not independently establish actual purchase verification.
 const status=complete?'ESTIMATED':'INSUFFICIENT DATA';
 const variable=r.finance.ingredientCostMinor!==null&&expenses.every(v=>v.state!=='UNKNOWN')&&labor.state!=='UNKNOWN'?
  r.finance.ingredientCostMinor+expenses.reduce((n,v)=>n+v.minorUnits!,0)+labor.minorUnits!:null;
 const contribution=variable===null||price.minorUnits===null?null:price.minorUnits-variable;
 const volume=(goal:number)=>{
  if(contribution===null||contribution<=0||fixed.minorUnits===null)return null;
  const n=Math.ceil((fixed.minorUnits!+goal)/contribution);
  if(!Number.isSafeInteger(n)||n<0)throw new TypeError('Required volume overflow');return n;
 };
 const scenarios=[25,30,40,50,60,75].map(bowls=>{
  const revenue=price.minorUnits===null?null:bowls*price.minorUnits;
  const costs=variable===null?null:bowls*variable,profit=complete?revenue!-costs!-fixed.minorUnits!:null;
  const batches=r.recipe.servings?Math.ceil(bowls/r.recipe.servings):null;
  return {bowls,revenueMinor:revenue,variableCostsMinor:costs,contributionMinor:contribution===null?null:contribution*bowls,
   fixedOverheadMinor:fixed.minorUnits,fixedAllocationPerBowlMinor:fixed.minorUnits===null?null:fixed.minorUnits/bowls,
   operatingProfitBeforeTaxMinor:profit,marginPercent:profit===null||!revenue?null:profit/revenue*100,requiredBatches:batches,
   ingredientPurchasing:r.recipe.formulation&&batches!==null?r.recipe.formulation.composition.map(l=>({...l,grams:l.grams*batches})):null,
   packageUnits:{trays:bowls,lids:bowls,labels:bowls,pepitaPackets:bowls},
   exceedsCapacity:p.capacityBowls===null?null:bowls>Number(p.capacityBowls),exceedsInterest:p.demandBowls===null?null:bowls>Number(p.demandBowls)};
 });
 const numeric=[variable,contribution,...scenarios.flatMap(s=>[s.revenueMinor,s.variableCostsMinor,s.operatingProfitBeforeTaxMinor,...(s.ingredientPurchasing?.map(l=>l.grams)??[])])];
 if(numeric.some(n=>n!==null&&(!Number.isFinite(n)||Math.abs(n)>Number.MAX_SAFE_INTEGER)))throw new TypeError('Financial overflow');
 return freezeModel({status,unknown,goalMinor,ingredientCostPerBowlMinor:r.finance.ingredientCostMinor,canonicalBatchCost:r.cost,
  costBreakdown:Object.fromEntries(expenseKeys.map((k,i)=>[k,expenses[i]])),fixedWeekly:fixed,laborPerBowl:labor,
  variablePerBowlMinor:variable,contributionPerBowlMinor:contribution,breakEvenBowls:volume(0),goalBowls:volume(goalMinor),
  ownerLaborIncluded:labor.state!=='UNKNOWN',ownerHoursWeekly:p.ownerHoursWeekly,scenarios,approvedProductPrice:false,
  batchCashRequirementMinor:null,
  notice:'Scenario only. Supplied evidence assertions are not independently verified; interest is not a purchase commitment. Purchasing excludes unknown package sizes and waste quantities.',
  realRevenueMinor:null,publicCheckoutEnabled:false,launchStatus:'BLOCKED'});
}
