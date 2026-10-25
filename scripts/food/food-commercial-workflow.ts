/** Owner CLI over existing engines and the private local evidence journal. */
import {context,hash,whole,validateSource,openCommercialEvidence,latestSources,adoptFormulation,adoptedPrivateWorkbench,packageRoles,type Kind,type SourceRecord} from './food-commercial-evidence';
import {readCommercialSource,writeCommercialSource,checkPrivateDirectory} from './food-commercial-command';
import {LocalMiniflareD1} from './local-miniflare-d1';
import {openFoodOperations} from './food-production-operations';
import {createLocalDualStatusAudit} from './provider-dual-status-audit';
import {applyPrivateFoodEvidence} from './food-evidence-intake';
import {massInGrams,purchaseCostProfile,recipeFingerprint,type RecipeOperations,type PurchaseEvidence} from './food-operations';
import {purchasingTemplate,batchPurchasing} from './food-batch-purchasing';
import {authoritativeReport} from './food-commercial-report';
import {packageFields} from './food-pilot-planning';

export const workflowCommands=['source-history','proposal-record','owner-approval-record','adopt-proposal','checkpoint','measurement-capture','yield-capture','receipt-capture','source-record','demand-record','package-link-template','purchasing-template','batch-cash','operator-report','measure-next'];
export function parseOptions(args:string[]){
 const map=new Map<string,string>();for(let i=0;i<args.length;i++){
  const key=args[i];if(!/^--[a-z-]+$/.test(key)||map.has(key))throw new TypeError('Unique named flags required');
  if(['--json','--authorize-private-revision','--recall-reviewed-clear','--owner-verified-receipt'].includes(key))map.set(key,'true');
  else {const value=args[++i];if(value===undefined||value.startsWith('--'))throw new TypeError('Flag value required');map.set(key,value);}
 }return map;
}
export async function runCommercialWorkflow(command:string,args:string[]){
 const [file,...flags]=args;if(!file)throw new TypeError('Private workbench path required');
 const opts=parseOptions(flags),get=(name:string)=>{const v=opts.get('--'+name);if(v===undefined)throw new TypeError('Required flag: '+name);return v;},
  numeric=(name:string)=>Number(get(name)),optionalNumber=(name:string)=>opts.has('--'+name)?numeric(name):null;
 const allowed:Record<string,string[]>={
  'source-history':[],checkpoint:['key','head'],'measure-next':[],
  'proposal-record':['subject','at','source','key','expected','mushrooms','greens'],
  'owner-approval-record':['subject','at','source','key','expected','proposal','reviewer','authorize-private-revision'],
  'adopt-proposal':['proposal','approval','key','head','output'],
  'measurement-capture':['subject','at','source','key','expected','output','index','ingredient','product','supplier','quantity','unit','preparation','raw-grams','drained-grams','waste-grams','cooked-yield-grams','packed-yield-grams','portions','purchase','recall-reviewed-clear'],
  'yield-capture':['subject','at','source','key','expected','output','cooked-yield-grams','waste-grams','packed-yield-grams','portion-grams','portions','method','capture','storage'],
  'receipt-capture':['output','index','id','revision','supplier','product','date','receipt','quantity','unit','packs','usable-grams','paid-cents','tax-fee-cents','owner-verified-receipt'],
  'source-record':['kind','input','key','expected'],
  'demand-record':['subject','at','source','key','expected','status','people','bowls','area','timing','channel'],
  'package-link-template':['governance'], 'purchasing-template':[], 'batch-cash':['input','goal'],
  'operator-report':['sku','inventory','purchasing']};
 if(!allowed[command]||[...opts.keys()].some(k=>k!=='--json'&&!allowed[command].includes(k.slice(2))))throw new TypeError('Unsupported command or flag');
 const workbench=await readCommercialSource(file),ctx=context(workbench);
 if(command==='measure-next'){
  const next=ctx.r.recipe.ingredients?.findIndex((_,i)=>!ctx.r.measurements.some(m=>m.ingredientIndex===i&&m.grams!==null))??-1;
  console.log(next<0?'All ingredient masses recorded. Measure actual cooked yield, waste, packed yield and portions; record source evidence before review.':
   `NEXT: Weigh ingredient ${next}: ${ctx.r.recipe.ingredients![next].name}. Record actual amount/unit, raw or drained state, exact ingredient ID, supplier/product identity and source time. No target grams are invented.`);return 0;
 }
 if(command==='purchasing-template'){console.log(JSON.stringify(purchasingTemplate(workbench),null,2));return 0;}
 if(command==='receipt-capture'){
  const index=whole(numeric('index'),true);if(!ctx.r.recipe.ingredients?.[index])throw new TypeError('Existing canonical ingredient index required');
  const purchase:PurchaseEvidence={id:get('id'),revision:numeric('revision'),supplierReference:get('supplier'),purchasedOn:get('date'),receiptReference:get('receipt'),
   quantity:numeric('quantity'),unit:get('unit') as 'g',packs:numeric('packs'),usableGrams:optionalNumber('usable-grams'),totalMinor:optionalNumber('paid-cents'),taxAndFeesMinor:optionalNumber('tax-fee-cents'),currency:'USD',verification:opts.has('--owner-verified-receipt')?'VERIFIED':'RECORDED'};
  purchaseCostProfile(purchase,{kind:'recipe',id:ctx.r.recipe.id,version:ctx.r.recipe.version,ingredientIndex:index},ctx.r.recipe);
  const {modelRef}=await import('../../src/lib/food/table-scheduling');modelRef(get('product'));
  await writeCommercialSource(get('output'),{binding:ctx.binding,ingredientIndex:index,purchasedProduct:get('product'),purchase});
  console.log('Private receipt captured; owner verification is not independent price approval.');return 0;
 }
 if(command==='package-link-template'){
  const governance=await readCommercialSource(get('governance'));
  const result={binding:ctx.binding,subject:'package:main-and-pepitas',observedAt:null,sourceReference:null,data:{governance,recipeFingerprint:recipeFingerprint(ctx.r),
   storageConfiguration:'FROZEN_MAIN_SEPARATE_DRY_PACKET',heatingConfiguration:'REMOVE_PACKET_HEAT_MAIN_WITH_INTERNAL_SAUCE',components:packageRoles.map(role=>({role,
    candidate:{reference:`candidate:${role}`,component:role==='pepitaPacket'?'dry-pepita-packet':'main-meal',...Object.fromEntries(packageFields.map(k=>[k,null]))},
    quantityPerMeal:1,purchasePackUnits:null,purchasePackPriceMinor:null,purchaseReference:null,availableUnits:null,inventoryReference:null,wasteUnitsPerBatch:null,evidenceBasis:'SUPPLIER_CLAIM'}))}};
  console.log(JSON.stringify(result,null,2));return 0;
 }
 await checkPrivateDirectory();
 const db=await LocalMiniflareD1.openPrivateOperations();
 try{
  const journal=await openCommercialEvidence(db),store=await openFoodOperations(db);
  const records=await journal.list(ctx.c.product.id);
  let result:unknown;
  const base=(data:unknown):SourceRecord=>({binding:ctx.binding,subject:get('subject'),observedAt:get('at'),sourceReference:get('source'),data});
  if(command==='source-history')result={records,operationsHead:await store.head(),launchStatus:'BLOCKED',publicCheckoutEnabled:false};
  else if(command==='checkpoint')result=await store.append(get('key'),'recipe',ctx.r,numeric('head'));
  else if(command==='proposal-record'){
   const mushrooms=get('mushrooms'),greens=get('greens');
   const ingredients=(ctx.r.recipe.ingredients??[]).filter(i=>!/feta|mushroom|greens/i.test(i.name));
   if(mushrooms==='INCLUDE')ingredients.push({kind:'simple',name:'Mushrooms'});
   if(greens==='INCLUDE')ingredients.push({kind:'simple',name:'Greens'});
   result=await journal.append(get('key'),'formulation',base({ingredients,mushrooms,greens,feta:'EXCLUDED',sauce:'INTERNAL_FREEZE_REHEAT_PENDING_VALIDATION',pepitas:'SEALED_DRY_REMOVE_BEFORE_HEATING'}),numeric('expected'),workbench);
  }else if(command==='owner-approval-record'){
   if(!opts.has('--authorize-private-revision'))throw new TypeError('Explicit owner authorization flag required; never inferred');
   result=await journal.append(get('key'),'owner-approval',base({proposalFingerprint:get('proposal'),reviewer:get('reviewer'),authorization:'OWNER_REPORTED_AUTHORIZED',scope:'PRIVATE_RECIPE_REVISION_ONLY'}),numeric('expected'),workbench);
  }else if(command==='adopt-proposal'){
   const proposal=records.find(r=>r.kind==='formulation'&&r.fingerprint===get('proposal'));if(!proposal)throw new TypeError('Stored proposal required');
   const approval=opts.has('--approval')?records.find(r=>r.kind==='owner-approval'&&r.fingerprint===get('approval'))??null:null;
   result=await adoptFormulation(db,workbench,proposal,approval,get('key'),numeric('head'));
   const adopted=result as Awaited<ReturnType<typeof adoptFormulation>>;
   if(adopted.status==='ADOPTED_PRIVATE_DRAFT'&&adopted.recipe)await writeCommercialSource(get('output'),adoptedPrivateWorkbench(workbench,adopted.recipe));
  }else if(command==='measurement-capture'){
   const index=whole(numeric('index'),true),grams=massInGrams(numeric('quantity'),get('unit') as 'g');
   let wb=workbench as {recipe:RecipeOperations}&Record<string,unknown>;
   const intake=(kind:string,data:Record<string,unknown>)=>{wb=applyPrivateFoodEvidence(wb,{kind,recipeId:ctx.r.recipe.id,recipeVersion:ctx.r.recipe.version,expectedFingerprint:recipeFingerprint(wb.recipe),...data}).record as typeof wb;};
   if(!wb.recipe.measurements.some(m=>m.ingredientIndex===index))intake('ingredient-measurement',{ingredientIndex:index,grams,sourceReference:get('source')});
   else if(wb.recipe.measurements.find(m=>m.ingredientIndex===index)?.grams!==grams)throw new TypeError('Historic mass cannot be overwritten');
   if(!wb.recipe.ingredientSources.some(s=>s.ingredientIndex===index)){
    if(!opts.has('--recall-reviewed-clear'))throw new TypeError('Actual recall review required to register ingredient source');
    intake('ingredient-source',{ingredientIndex:index,ingredientId:get('ingredient'),revision:1,preparationState:get('preparation'),supplierReference:get('supplier'),
     measurementReference:wb.recipe.measurements.find(m=>m.ingredientIndex===index)!.sourceReference,recalled:false,crossContact:'UNKNOWN',crossContactReference:null});
   }
   const purchaseInput=opts.has('--purchase')?await readCommercialSource(get('purchase')):null;
   if(purchaseInput&&'purchase' in purchaseInput&&(hash(purchaseInput.binding)!==hash(ctx.binding)||purchaseInput.ingredientIndex!==index||purchaseInput.purchasedProduct!==get('product')))throw new TypeError('Receipt ingredient/product/recipe binding mismatch');
   const purchase=purchaseInput&&'purchase' in purchaseInput?purchaseInput.purchase:purchaseInput;
   const record=base({ingredientId:get('ingredient'),ingredientIndex:index,purchasedProduct:get('product'),supplierReference:get('supplier'),quantity:numeric('quantity'),unit:get('unit'),preparation:get('preparation'),
    rawGrams:optionalNumber('raw-grams'),drainedGrams:optionalNumber('drained-grams'),wasteGrams:optionalNumber('waste-grams'),cookedYieldGrams:optionalNumber('cooked-yield-grams'),packedYieldGrams:optionalNumber('packed-yield-grams'),portions:optionalNumber('portions'),measurementReference:get('source'),purchase});
   // Existing purchase intake remains authoritative; record actual paid evidence only after usable yield exists.
   if(purchase&&(purchase as {verification:unknown}).verification==='VERIFIED'&&wb.recipe.formulation&&!wb.recipe.ingredientCosts.some(c=>c.ingredient.kind==='recipe'&&c.ingredient.ingredientIndex===index))intake('verified-purchase',{ingredientIndex:index,purchase});
   result=await journal.append(get('key'),'measurement',record,numeric('expected'),wb);
   await writeCommercialSource(get('output'),wb);
  }else if(command==='yield-capture'){
   const record=base({cookedYieldGrams:numeric('cooked-yield-grams'),wasteGrams:numeric('waste-grams'),packedYieldGrams:numeric('packed-yield-grams'),portionGrams:numeric('portion-grams'),portions:numeric('portions'),
    method:[get('method')],captureSource:get('capture'),storage:get('storage')});
   validateSource('batch-yield',record,workbench);
   const d=record.data as Record<string,unknown>;
   let projected=applyPrivateFoodEvidence(workbench,{kind:'measured-yield',recipeId:ctx.r.recipe.id,recipeVersion:ctx.r.recipe.version,expectedFingerprint:recipeFingerprint(ctx.r),
    yieldGrams:d.packedYieldGrams,portionGrams:d.portionGrams,servings:d.portions,method:d.method,captureSource:d.captureSource,storage:d.storage}).record;
   for(const entry of latestSources(records).filter(s=>s.kind==='measurement'&&hash(s.record.binding)===hash(ctx.binding))){
    const m=entry.record.data as {ingredientIndex:number;purchase:{verification:string}|null};
    if(m.purchase?.verification==='VERIFIED'){
     const measured=projected.recipe as RecipeOperations;
     projected=applyPrivateFoodEvidence(projected,{kind:'verified-purchase',recipeId:ctx.r.recipe.id,recipeVersion:ctx.r.recipe.version,expectedFingerprint:recipeFingerprint(measured),ingredientIndex:m.ingredientIndex,purchase:m.purchase}).record;
    }
   }
   result=await journal.append(get('key'),'batch-yield',record,numeric('expected'),workbench);await writeCommercialSource(get('output'),projected);
  }else if(command==='demand-record')result=await journal.append(get('key'),'demand',base({status:get('status'),people:numeric('people'),bowls:numeric('bowls'),area:get('area'),timing:get('timing'),channel:get('channel')}),numeric('expected'),workbench);
  else if(command==='source-record'){
   const kind=get('kind') as Kind;if(!['formulation','measurement','packaging','demand'].includes(kind))throw new TypeError('Use the dedicated capture or owner authorization command');
   result=await journal.append(get('key'),kind,await readCommercialSource(get('input')),numeric('expected'),workbench);
  }else if(command==='batch-cash')result=batchPurchasing(workbench,await readCommercialSource(get('input')),records,opts.has('--goal')?numeric('goal')*100:20000);
  else if(command==='operator-report'){
   const load=async(name:string)=>opts.has('--'+name)?readCommercialSource(get(name)):null;
   const [skuGovernance,inventoryEvidence,purchasing]=await Promise.all([load('sku'),load('inventory'),load('purchasing')]);
   const auditDb=await LocalMiniflareD1.openPrivateAudit();let providerAudit;
   try{const audit=await createLocalDualStatusAudit(auditDb);providerAudit={revision:await audit.revision(),observationCount:(await audit.observations()).length};}finally{await auditDb.close();}
   result=authoritativeReport(workbench,records,{skuGovernance,inventoryEvidence,purchasing,operations:await store.list(),providerAudit});
  }
  if(command==='operator-report'&&!opts.has('--json')){
   const report=result as ReturnType<typeof authoritativeReport>;console.log(`${report.product} — PRIVATE OPERATOR REPORT`);
   for(const row of report.rows)console.log(`${row.area}: ${row.status} | ${row.source}`);
   console.log('NEXT FIVE ACTIONS\n'+report.nextFiveActions.map((a,i)=>`${i+1}. ${a}`).join('\n')+'\nLAUNCH: BLOCKED; PUBLIC CHECKOUT: DISABLED');
  }else console.log(JSON.stringify(result,null,2));return 0;
 }finally{await db.close();}
}
