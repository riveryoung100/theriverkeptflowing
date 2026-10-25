/** Whole supplier pack cash is separate from canonical consumed recipe cost. */
import {context,hash,bounded,quantity,whole,validatePackageLink,type StoredSource,currentSources} from './food-commercial-evidence';
import {strictObject} from '../../src/lib/food/table-catalog';
import {freezeModel,modelRef,instant} from '../../src/lib/food/table-scheduling';
import {inspectRecipeOperations,purchaseCostProfile,type PurchaseEvidence} from './food-operations';
import {productionReadiness} from './food-production-operations';
import {weeklyProfit,expenseKeys,weeklyTemplate} from './food-commercial-planning';

// Decimal measured masses must not buy an extra pack because of binary division.
function fraction(n:number):[bigint,bigint]{
 const [base,exponent='0']=String(n).toLowerCase().split('e'),parts=base.split('.'),digits=(parts[0]+(parts[1]??''));
 const power=Number(exponent)-(parts[1]?.length??0);
 return power>=0?[BigInt(digits)*10n**BigInt(power),1n]:[BigInt(digits),10n**BigInt(-power)];
}
function exactMultiply(n:number,count:number){
 const [a,b]=fraction(n);if(!Number.isFinite(Number(b)))throw new TypeError('Measured mass precision outside supported range');
 return Number(a*BigInt(count))/Number(b);
}
export function purchaseRequirement(required:number,available:number|null,packSize:number|null,packPrice:number|null){
 quantity(required,true);if(available!==null)quantity(available,true);if(packSize!==null)quantity(packSize);if(packPrice!==null)whole(packPrice,true);
 const shortfall=required===0?0:available===null?null:Math.max(0,required-available);
 let packs:number|null=shortfall===null?null:shortfall===0?0:null;
 if(shortfall!==null&&shortfall>0&&packSize!==null&&available!==null){
  const [rn,rd]=fraction(required),[an,ad]=fraction(available),[pn,pd]=fraction(packSize);
  const numerator=(rn*ad-an*rd)*pd,denominator=rd*ad*pn;
  packs=Number((numerator+denominator-1n)/denominator);
 }
 const cash=packs===0?0:packs===null||packPrice===null?null:packs*packPrice;
 if([packs,cash].some(n=>n!==null&&(!Number.isSafeInteger(n)||n>Number.MAX_SAFE_INTEGER)))throw new TypeError('Purchasing overflow');
 return {required,available,shortfall,packs,cashMinor:cash,leftover:available===null||packs===null||packSize===null?null:available+packs*packSize-required};
}
export function purchasingTemplate(workbench:unknown){
 const {r,binding}=context(workbench);
 return {binding,recipeFingerprint:hash(r),packageFingerprint:null,priceRevision:null,weekly:weeklyTemplate(r),batch:null,ingredientStock:[],
  laborTreatment:'UNKNOWN',processingBasisPoints:null,processingFixedMinorPerBowl:null,processingReference:null,
  weeklyBatchCapacity:null,availableCashMinor:null,volumes:[25,30,40,50,60,75]};
}
export function batchPurchasing(workbench:unknown,input:unknown,sources:readonly StoredSource[],goalMinor=20000){
 const {r,c,binding}=context(workbench),info=inspectRecipeOperations(r);
 const p=strictObject(input,['binding','recipeFingerprint','packageFingerprint','priceRevision','weekly','batch','ingredientStock','laborTreatment','processingBasisPoints','processingFixedMinorPerBowl','processingReference','weeklyBatchCapacity','availableCashMinor','volumes']);
 if(hash(p.binding)!==hash(binding)||p.recipeFingerprint!==hash(r))throw new TypeError('Product, recipe or cost revision mismatch');
 const current=currentSources(sources,workbench).filter(s=>!s.stale),packSource=current.filter(s=>s.kind==='packaging').at(-1);
 const pack=packSource?validatePackageLink(packSource.record.data,workbench):null;
 if(p.packageFingerprint!==(pack?.packageFingerprint??null))throw new TypeError('SKU/package revision mismatch');
 const price=c.approvedPrice;
 if(hash(p.priceRevision)!==hash(price?{id:price.id,version:price.version}:null))throw new TypeError('Approved price revision mismatch');
 if(price&&pack&&(pack.governance.proposal!.sku.id!==c.sku?.id||pack.governance.proposal!.sku.version!==c.sku?.version))throw new TypeError('Approved price belongs to a different SKU/package revision');
 const weekly=structuredClone(p.weekly) as ReturnType<typeof weeklyTemplate>;
 // Validate original weekly record before deriving receipt-backed fields.
 weeklyProfit(r,weekly,goalMinor);
 if(price){weekly.price={state:'KNOWN',minorUnits:price.money.minorUnits,sourceReference:price.approval.sourceReference};}
 if(!['INCLUDE','EXCLUDE_EXPLICITLY','UNKNOWN'].includes(String(p.laborTreatment)))throw new TypeError('Explicit labor treatment required');
 if(p.laborTreatment==='EXCLUDE_EXPLICITLY')weekly.laborPerBowl={state:'ESTIMATED',minorUnits:0,sourceReference:'owner-explicit:exclude-labor'};
 if(p.weeklyBatchCapacity!==null)whole(p.weeklyBatchCapacity,true);
 if(p.availableCashMinor!==null)whole(p.availableCashMinor,true);
 const stocks=new Map<number,Record<string,unknown>>();
 for(const raw of bounded(p.ingredientStock)){
  const s=strictObject(raw,['ingredientIndex','ingredientId','availableGrams','sourceReference','observedAt']);
  const i=whole(s.ingredientIndex,true),exact=r.ingredientSources.find(x=>x.ingredientIndex===i);
  if(!exact||exact.ingredientId!==s.ingredientId||stocks.has(i))throw new TypeError('Exact unique ingredient inventory required');
  quantity(s.availableGrams,true);modelRef(s.sourceReference);
  instant(s.observedAt as string);stocks.set(i,s);
 }
 let batchPortions:number|null=null;
 if(p.batch!==null){const b=productionReadiness(p.batch,r);batchPortions=b.batch.actual?.portions??null;}
 else {
  const yieldSource=current.filter(s=>s.kind==='batch-yield').at(-1);
  if(yieldSource)batchPortions=(yieldSource.record.data as {portions:number}).portions;
 }
 const receipts=new Map<number,PurchaseEvidence>();
 for(const source of current.filter(s=>s.kind==='measurement')){
  const m=source.record.data as {ingredientIndex:number;purchase:PurchaseEvidence|null};
  receipts.delete(m.ingredientIndex);
  if(m.purchase){const purchase=m.purchase;
   const cost=purchaseCostProfile(purchase,{kind:'recipe',id:r.recipe.id,version:r.recipe.version,ingredientIndex:m.ingredientIndex},r.recipe);
   const canonical=r.ingredientCosts.find(v=>v.ingredient.kind==='recipe'&&v.ingredient.ingredientIndex===m.ingredientIndex);
   if(cost.state==='KNOWN'&&canonical&&hash(canonical)===hash(cost.profile))receipts.set(m.ingredientIndex,purchase);
  }
 }
 const packageCostKeys={tray:'tray',lid:'lid',seal:'attachment',label:'label',pepitaPacket:'pepitaPacket',attachment:'attachment'} as const;
 if(pack){
  const totals=new Map<string,number|null>();
  for(const comp of pack.components){
   const k=packageCostKeys[comp.role as keyof typeof packageCostKeys];
   const unit=comp.quantityPerMeal===0?0:comp.purchasePackUnits===null||comp.purchasePackPriceMinor===null?null:Number(comp.purchasePackPriceMinor)/Number(comp.purchasePackUnits)*Number(comp.quantityPerMeal);
   const previous=totals.get(k);totals.set(k,previous===null||unit===null?null:(previous??0)+unit);
  }
  // Weekly costs require cents; preserve fractional pack unit costs conservatively by ceiling once per bowl.
  for(const [k,n] of totals)weekly.expenses[k as typeof expenseKeys[number]]=n===null?{state:'UNKNOWN',minorUnits:null,sourceReference:null}:
   {state:'ESTIMATED',minorUnits:Math.ceil(n),sourceReference:packSource!.record.sourceReference};
  const wasteCost=batchPortions===null||pack.components.some(x=>x.wasteUnitsPerBatch===null||x.wasteUnitsPerBatch!==0&&(x.purchasePackUnits===null||x.purchasePackPriceMinor===null))?null:
   pack.components.reduce((a,x)=>x.wasteUnitsPerBatch===0?a:a+Number(x.wasteUnitsPerBatch)*Number(x.purchasePackPriceMinor)/Number(x.purchasePackUnits),0)/batchPortions;
  weekly.expenses.packagingWaste=wasteCost===null?{state:'UNKNOWN',minorUnits:null,sourceReference:null}:{state:'ESTIMATED',minorUnits:Math.ceil(wasteCost),sourceReference:packSource!.record.sourceReference};
 }
 if(p.processingBasisPoints!==null||p.processingFixedMinorPerBowl!==null){
  whole(p.processingBasisPoints,true);whole(p.processingFixedMinorPerBowl,true);modelRef(p.processingReference);
  if(Number(p.processingBasisPoints)>10000)throw new TypeError('Invalid processing percentage');
  weekly.expenses.processing=weekly.price.minorUnits===null?{state:'UNKNOWN',minorUnits:null,sourceReference:null}:
   {state:'ESTIMATED',minorUnits:Math.ceil(weekly.price.minorUnits*Number(p.processingBasisPoints)/10000)+Number(p.processingFixedMinorPerBowl),sourceReference:String(p.processingReference)};
 }
 const base=weeklyProfit(r,weekly,goalMinor);
 const batchCost=info.cost?.total.state==='known'?Number(info.cost.total.minorUnits.numerator)/Number(info.cost.total.minorUnits.denominator):null;
 const actualIngredientPerBowl=batchCost===null||batchPortions===null?null:batchCost/batchPortions;
 const actualVariable=base.variablePerBowlMinor===null||actualIngredientPerBowl===null||info.finance.ingredientCostMinor===null?null:
  base.variablePerBowlMinor-info.finance.ingredientCostMinor+actualIngredientPerBowl;
 const actualContribution=weekly.price.minorUnits===null||actualVariable===null?null:weekly.price.minorUnits-actualVariable;
 const targetVolume=(goal:number)=>{
  if(actualContribution===null||actualContribution<=0||weekly.fixedWeekly.minorUnits===null)return null;
  const volume=Math.ceil((weekly.fixedWeekly.minorUnits+goal)/actualContribution);whole(volume,true);return volume;
 };
 const volumes=bounded(p.volumes).map(n=>whole(n,true));if(!volumes.length||new Set(volumes).size!==volumes.length)throw new TypeError('Unique scenario volumes required');
 const scenario=(bowls:number)=>{
  const batches=batchPortions===null?null:Math.ceil(bowls/batchPortions);
  const ingredients=r.formulation&&batches!==null?r.formulation.composition.map(line=>{
   if(line.kind!=='ingredient')return {component:line.component,requirement:null};
   const receipt=receipts.get(line.ingredientIndex),stock=stocks.get(line.ingredientIndex);
   // usableGrams and total price describe the whole purchased lot (packs may be >1).
   const total=receipt&&receipt.totalMinor!==null&&receipt.taxAndFeesMinor!==null?receipt.totalMinor+receipt.taxAndFeesMinor:null;
   const divisible=receipt&&total!==null&&total%receipt.packs===0;
   const usablePerPack=receipt?.usableGrams===null||!receipt?null:receipt.usableGrams/(divisible?receipt.packs:1);
   const pricePerPack=total===null||!receipt?null:total/(divisible?receipt.packs:1);
   const requirement=purchaseRequirement(exactMultiply(line.grams,batches),stock?Number(stock.availableGrams):null,usablePerPack,pricePerPack);
   return {ingredientIndex:line.ingredientIndex,ingredientId:r.ingredientSources.find(s=>s.ingredientIndex===line.ingredientIndex)?.ingredientId??null,requirement};
  }):null;
  const producedBowls=batchPortions===null||batches===null?null:batchPortions*batches;
  const packages=pack&&batches!==null&&producedBowls!==null?pack.components.map(x=>({role:x.role,requirement:purchaseRequirement(producedBowls*Number(x.quantityPerMeal)+(x.wasteUnitsPerBatch===null?0:Number(x.wasteUnitsPerBatch)*batches),
   x.availableUnits===null?null:Number(x.availableUnits),x.purchasePackUnits===null?null:Number(x.purchasePackUnits),x.purchasePackPriceMinor===null?null:Number(x.purchasePackPriceMinor)),wasteKnown:x.wasteUnitsPerBatch!==null})):null;
  const costs=[...(ingredients?.map(x=>x.requirement?.cashMinor??null)??[null]),...(packages?.map(x=>x.wasteKnown?x.requirement.cashMinor:null)??[null])];
  const purchaseCash=costs.some(n=>n===null)?null:costs.reduce<number>((a,n)=>a+n!,0);
  const revenue=weekly.price.minorUnits===null?null:weekly.price.minorUnits*bowls;
  const variable=actualVariable===null?null:actualVariable*bowls;
  const contribution=revenue===null||variable===null?null:revenue-variable;
  const profit=contribution===null||weekly.fixedWeekly.minorUnits===null?null:contribution-weekly.fixedWeekly.minorUnits;
  const consumedIngredient=actualIngredientPerBowl===null?null:actualIngredientPerBowl*bowls;
  // Cash after purchasing also deducts variable noninventory expenses and fixed overhead, without double counting consumed supplies.
  const inventoryUnitCost=pack&&batchPortions!==null?pack.components.reduce((a,x)=>x.quantityPerMeal===0&&x.wasteUnitsPerBatch===0?a:x.purchasePackPriceMinor===null||x.purchasePackUnits===null||x.wasteUnitsPerBatch===null?NaN:
   a+Number(x.purchasePackPriceMinor)/Number(x.purchasePackUnits)*(Number(x.quantityPerMeal)+Number(x.wasteUnitsPerBatch)/batchPortions),0):null;
  const nonInventory=variable===null||consumedIngredient===null||inventoryUnitCost===null||!Number.isFinite(inventoryUnitCost)?null:variable-consumedIngredient-inventoryUnitCost*bowls;
  const remainingCash=revenue===null||purchaseCash===null||nonInventory===null||weekly.fixedWeekly.minorUnits===null?null:revenue-purchaseCash-nonInventory-weekly.fixedWeekly.minorUnits;
  const missing=[...(batches===null?['actual batch portions']:[]),...(ingredients===null?['measured recipe']:[]),...(purchaseCash===null?['receipt, inventory, package pack sizes/prices or waste']:[]),...(p.laborTreatment==='UNKNOWN'?['explicit labor treatment']:[]),...base.unknown];
  const capacity=p.weeklyBatchCapacity===null||batches===null?null:batches<=Number(p.weeklyBatchCapacity);
  for(const n of [revenue,variable,contribution,profit,purchaseCash,remainingCash])if(n!==null&&(!Number.isFinite(n)||Math.abs(n)>Number.MAX_SAFE_INTEGER))throw new TypeError('Weekly cash overflow');
  return {bowls,batches,producedBowls,surplusBowls:producedBowls===null?null:producedBowls-bowls,ingredients,packages,recipeConsumedCostMinor:consumedIngredient,purchasingCashMinor:purchaseCash,revenueMinor:revenue,variableMinor:variable,contributionMinor:contribution,
   fixedOverheadMinor:weekly.fixedWeekly.minorUnits,fixedAllocationMinor:bowls&&weekly.fixedWeekly.minorUnits!==null?weekly.fixedWeekly.minorUnits/bowls:null,
   operatingProfitMinor:missing.length?null:profit,remainingCashMinor:missing.length?null:remainingCash,capacityFeasible:capacity,
   purchasingFeasible:purchaseCash===null||p.availableCashMinor===null?null:purchaseCash<=Number(p.availableCashMinor),status:missing.length?'INSUFFICIENT EVIDENCE':'ESTIMATED',missing};
 };
 const goalBowls=targetVolume(goalMinor);
 return freezeModel({binding,sourceFingerprints:{recipe:hash(r),package:pack?.packageFingerprint??null,price:p.priceRevision},scenarios:volumes.map(scenario),
  oneBatchPurchasePlan:batchPortions===null?null:scenario(batchPortions),
  targetProfit:goalBowls===null?null:scenario(goalBowls),breakEvenBowls:targetVolume(0),laborTreatment:p.laborTreatment,
  canonicalApprovedPrice:price!==null,scenarioPriceOnly:price===null,sourceAssertionsAreIndependentVerification:false,publicCheckoutEnabled:false,launchStatus:'BLOCKED'});
}
