import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,symlink,rm} from 'node:fs/promises';
import {resolve,join,relative,sep} from 'node:path';
import {LocalMiniflareD1} from './local-miniflare-d1';
import {initialRecipeOperations} from './operating-system';
import {TABLE_CATALOG} from '../../src/lib/food/table-catalog';
import {context,hash,openCommercialEvidence,adoptFormulation,adoptedPrivateWorkbench,validateSource,currentSources,latestSources,packageRoles,validatePackageLink,type SourceRecord,type StoredSource} from './food-commercial-evidence';
import {openFoodOperations,type BatchOperations} from './food-production-operations';
import {recipeFingerprint,purchaseCostProfile,type RecipeOperations,type PurchaseEvidence} from './food-operations';
import {initialPrivateSkuGovernance,applyPrivateSkuProposal,fingerprintPrivateSkuGovernance} from './food-sku-governance';
import {packageFields} from './food-pilot-planning';
import {purchaseRequirement,purchasingTemplate,batchPurchasing} from './food-batch-purchasing';
import {authoritativeReport} from './food-commercial-report';
import {readCommercialSource,writeCommercialSource} from './food-commercial-command';
import {parseOptions,runCommercialWorkflow} from './food-commercial-workflow';
import {applyPrivateFoodEvidence} from './food-evidence-intake';

// All amounts, receipts, observations and authorizations below are synthetic tests only.
const at='2026-10-23T12:00:00Z';
function workbench(measured=false){
 const r=initialRecipeOperations();
 if(measured){
  r.formulation={id:r.recipe.id,version:r.recipe.version,composition:r.recipe.ingredients!.map((_,ingredientIndex)=>({kind:'ingredient',ingredientIndex,grams:100})),method:['Synthetic only'],yieldGrams:700};
  r.servings=7;r.portionGrams=100;r.state='MEASURED';r.storage='frozen';
  r.measurements=r.recipe.ingredients!.map((_,ingredientIndex)=>({ingredientIndex,grams:100,quantity:100,unit:'g',sourceReference:`synthetic:scale-${ingredientIndex}`}));
  r.ingredientSources=r.recipe.ingredients!.map((_,ingredientIndex)=>({ingredientIndex,ingredientId:`synthetic:ingredient-${ingredientIndex}`,revision:1,preparationState:'raw',supplierReference:'synthetic:supplier',measurementReference:`synthetic:scale-${ingredientIndex}`,recalled:false,crossContact:'UNKNOWN',crossContactReference:null}));
  r.ingredientCosts=r.recipe.ingredients!.map((_,ingredientIndex)=>purchaseCostProfile(receipt(ingredientIndex),{kind:'recipe',id:r.recipe.id,version:1,ingredientIndex},r.recipe).profile!);
 }
 return {recipe:r,catalog:TABLE_CATALOG[0],batch:null as BatchOperations|null,targetServings:null,ingredientInventory:[],window:null,deliveryPolicy:null,deliveryRequest:null,now:null,quantity:1};
}
function receipt(i=0):PurchaseEvidence{return {id:`synthetic:purchase-${i}`,revision:1,supplierReference:'synthetic:supplier',purchasedOn:'2026-10-23',receiptReference:`synthetic:receipt-${i}`,quantity:1000,unit:'g',packs:1,usableGrams:900,totalMinor:900,taxAndFeesMinor:0,currency:'USD',verification:'VERIFIED'};}
function source(wb:unknown,subject:string,data:unknown):SourceRecord{return {binding:context(wb).binding,subject,observedAt:at,sourceReference:'synthetic:source',data};}
function proposal(wb=workbench(),unresolved=false){return source(wb,'synthetic:proposal',{ingredients:wb.recipe.recipe.ingredients!.filter(i=>!/mushroom|greens|feta/i.test(i.name)),mushrooms:unresolved?'UNRESOLVED':'EXCLUDE',greens:'EXCLUDE',feta:'EXCLUDED',sauce:'INTERNAL_FREEZE_REHEAT_PENDING_VALIDATION',pepitas:'SEALED_DRY_REMOVE_BEFORE_HEATING'});}
function measurement(wb=workbench(true),i=0){return source(wb,`synthetic:measurement-${i}`,{ingredientId:`synthetic:ingredient-${i}`,ingredientIndex:i,purchasedProduct:`synthetic:product-${i}`,supplierReference:'synthetic:supplier',quantity:100,unit:'g',preparation:'raw',rawGrams:100,drainedGrams:null,wasteGrams:0,cookedYieldGrams:null,packedYieldGrams:null,portions:null,measurementReference:`synthetic:scale-${i}`,purchase:receipt(i)});}
function stored(kind:StoredSource['kind'],record:SourceRecord,revision=1):StoredSource{return {sequence:revision,kind,subject:record.subject,revision,fingerprint:hash(record),record};}
let db:LocalMiniflareD1;
before(async()=>{db=await LocalMiniflareD1.create();});after(async()=>{await db.close();});

test('formulation identity, required decisions and no feta are validated',()=>{
 const wb=workbench(),p=proposal(wb);assert.doesNotThrow(()=>validateSource('formulation',p,wb));
 assert.throws(()=>validateSource('formulation',{...p,binding:{...p.binding,recipe:{...p.binding.recipe,version:2}}},wb));
 assert.throws(()=>validateSource('formulation',{...p,data:{...p.data as object,feta:'INCLUDED'}},wb));
});
test('unapproved proposal remains safely blocked and cannot publish',async()=>{
 const wb=workbench(),journal=await openCommercialEvidence(db),p=await journal.append('synthetic:proposal-key','formulation',proposal(wb),0,wb);
 const result=await adoptFormulation(db,wb,p,null,'synthetic:blocked-adoption',0);
 assert.equal(result.status,'BLOCKED');assert.equal(result.publicCheckoutEnabled,false);assert.equal(TABLE_CATALOG[0].sku,null);
});
test('separate explicit owner assertion authorizes only private cleared draft; repeats survive restart',async()=>{
 const wb=workbench(),journal=await openCommercialEvidence(db),p=(await journal.list(context(wb).c.product.id)).find(s=>s.kind==='formulation')!;
 const approval=await journal.append('synthetic:approval-key','owner-approval',source(wb,'synthetic:approval',{proposalFingerprint:p.fingerprint,reviewer:'synthetic:owner',authorization:'OWNER_REPORTED_AUTHORIZED',scope:'PRIVATE_RECIPE_REVISION_ONLY'}),0,wb);
 const ops=await openFoodOperations(db);await ops.append('synthetic:parent','recipe',wb.recipe,await ops.head());
 const head=await ops.head(),adopted=await adoptFormulation(db,wb,p,approval,'synthetic:adopt',head);
 assert.equal(adopted.status,'ADOPTED_PRIVATE_DRAFT');assert.equal(adopted.recipe!.state,'DRAFT');assert.deepEqual(adopted.recipe!.measurements,[]);
 const next=adoptedPrivateWorkbench(wb,adopted.recipe!);assert.equal(next.catalog.display,'hidden');assert.equal(next.catalog.approvedPrice,null);assert.equal(next.catalog.recipe.version,2);
 await db.restart();const replay=await adoptFormulation(db,wb,p,approval,'synthetic:adopt',head);assert.equal(replay.result!.replay,true);
 await assert.rejects(adoptFormulation(db,wb,p,approval,'synthetic:competing-adopt',head));
});
test('unresolved selections block adoption even with owner assertion',async()=>{
 const wb=workbench(),j=await openCommercialEvidence(db),p=await j.append('synthetic:unresolved','formulation',{...proposal(wb,true),subject:'synthetic:unresolved'},0,wb);
 const a=await j.append('synthetic:unresolved-approval','owner-approval',source(wb,'synthetic:unresolved-approval',{proposalFingerprint:p.fingerprint,reviewer:'synthetic:owner',authorization:'OWNER_REPORTED_AUTHORIZED',scope:'PRIVATE_RECIPE_REVISION_ONLY'}),0,wb);
 assert.equal((await adoptFormulation(db,wb,p,a,'synthetic:unresolved-adopt',2)).status,'BLOCKED');
});
test('concurrent authorized adoptions select exactly one recipe head',async()=>{
 const local=await LocalMiniflareD1.create();try{
  const wb=workbench(),j=await openCommercialEvidence(local),ops=await openFoodOperations(local);
  await ops.append('synthetic:race-parent','recipe',wb.recipe,0);
  const p=await j.append('synthetic:race-proposal','formulation',proposal(wb),0,wb);
  const a=await j.append('synthetic:race-approval','owner-approval',source(wb,'synthetic:race-approval',{proposalFingerprint:p.fingerprint,reviewer:'synthetic:owner',authorization:'OWNER_REPORTED_AUTHORIZED',scope:'PRIVATE_RECIPE_REVISION_ONLY'}),0,wb);
  const attempts=await Promise.allSettled([adoptFormulation(local,wb,p,a,'synthetic:race-a',1),adoptFormulation(local,wb,p,a,'synthetic:race-b',1)]);
  assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1);assert.equal((await ops.list()).length,2);
 }finally{await local.close();}
});
test('journal concurrent CAS, exact retries, changed-payload rejection and restart',async()=>{
 const wb=workbench(),j=await openCommercialEvidence(db),record=source(wb,'synthetic:cohort',{status:'INTERESTED',people:2,bowls:5,area:'area:north',timing:'timing:weekend',channel:'channel:local'});
 const attempts=await Promise.allSettled([j.append('synthetic:demand-a','demand',record,0,wb),j.append('synthetic:demand-b','demand',record,0,wb)]);
 assert.equal(attempts.filter(a=>a.status==='fulfilled').length,1);
 const key=attempts[0].status==='fulfilled'?'synthetic:demand-a':'synthetic:demand-b';
 assert.equal((await j.append(key,'demand',record,0,wb)).replay,true);
 await assert.rejects(j.append(key,'demand',{...record,data:{...record.data as object,bowls:6}},0,wb));
 await db.restart();assert.equal((await (await openCommercialEvidence(db)).append(key,'demand',record,0,wb)).replay,true);
});
test('demand replacement counts only latest cohort; history retained and cross-product fails',async()=>{
 const wb=workbench(),j=await openCommercialEvidence(db),records=await j.list(context(wb).c.product.id),old=records.find(r=>r.kind==='demand')!;
 await j.append('synthetic:demand-reconfirm','demand',{...old.record,data:{...old.record.data as object,status:'RECONFIRMED INTEREST',bowls:4}},1,wb);
 const all=await j.list(context(wb).c.product.id);assert.equal(all.filter(s=>s.kind==='demand').length,2);assert.equal(latestSources(all).filter(s=>s.kind==='demand').length,1);
 await assert.rejects(j.append('synthetic:wrong-product','demand',{...old.record,binding:{...old.record.binding,product:{id:'food-product:other',version:1}}},2,wb));
 assert.equal(currentSources(all,adoptedPrivateWorkbench(wb,(await (await openFoodOperations(db)).get('recipe',wb.recipe.recipe.id,2)))).every(s=>s.stale),true);
});
test('actual supplemental weights reuse purchase validator and reject invalid identity, units and yields',async()=>{
 const wb=workbench(true),m=measurement(wb);assert.doesNotThrow(()=>validateSource('measurement',m,wb));
 for(const patch of [{ingredientId:'unknown'},{quantity:-1},{unit:'cup'},{rawGrams:90},{drainedGrams:101},{packedYieldGrams:300,cookedYieldGrams:200}])assert.throws(()=>validateSource('measurement',{...m,data:{...m.data as object,...patch}},wb));
 assert.throws(()=>validateSource('measurement',{...m,data:{...m.data as object,purchase:{...receipt(),verification:'APPROVED'}}},wb));
 const j=await openCommercialEvidence(db);await j.append('synthetic:receipt-revision','measurement',m,0,wb);
 await assert.rejects(j.append('synthetic:receipt-conflict','measurement',{...m,subject:'synthetic:receipt-conflict',data:{...m.data as object,purchase:{...receipt(),totalMinor:999}}},0,wb),/receipt revision/);
 const raced=await Promise.allSettled([900,999].map((totalMinor,i)=>j.append(`synthetic:receipt-race-${i}`,'measurement',
  {...m,subject:`synthetic:receipt-race-${i}`,data:{...m.data as object,purchase:{...receipt(),id:'synthetic:race-receipt',totalMinor}}},0,wb)));
 assert.equal(raced.filter(x=>x.status==='fulfilled').length,1);
});
test('cooked, waste and packed yield project through canonical intake without carrying stale nutrition/cost',()=>{
 const wb=workbench(true);wb.recipe={...wb.recipe,formulation:null,ingredientCosts:[],state:'DRAFT',portionGrams:null,servings:null};
 const d={cookedYieldGrams:800,wasteGrams:50,packedYieldGrams:750,portionGrams:100,portions:7,method:['Synthetic weighed yield'],captureSource:'food-prototype-capture:synthetic-yield',storage:'frozen'};
 const record=source(wb,'synthetic:yield',d);assert.doesNotThrow(()=>validateSource('batch-yield',record,wb));
 assert.throws(()=>validateSource('batch-yield',{...record,data:{...d,wasteGrams:100}},wb));
 const next=applyPrivateFoodEvidence(wb,{kind:'measured-yield',recipeId:wb.recipe.recipe.id,recipeVersion:1,expectedFingerprint:recipeFingerprint(wb.recipe),yieldGrams:750,portionGrams:100,servings:7,method:d.method,captureSource:d.captureSource,storage:'frozen'});
 assert.equal((next.record.recipe as RecipeOperations).formulation!.yieldGrams,750);assert.equal(wb.recipe.formulation,null);
});

function packageLink(wb=workbench(true)){
 const initial=initialPrivateSkuGovernance(wb.catalog),governance=applyPrivateSkuProposal(initial,wb.catalog,{sku:{id:'food-sku:synthetic-package',version:1,servingOffer:{offerId:wb.catalog.offer.offerId,version:1},package:{id:'food-package-definition:synthetic-package',version:1}},
  packageDefinition:{id:'food-package-definition:synthetic-package',version:1,netQuantity:{basis:'grams',grams:100}},source:{recordedAt:at,recordedBy:'synthetic:owner',packagingEvidence:'synthetic:docs',portionEvidence:'synthetic:scale'}},fingerprintPrivateSkuGovernance(initial,wb.catalog));
 return source(wb,'synthetic:package',{governance,recipeFingerprint:recipeFingerprint(wb.recipe),storageConfiguration:'FROZEN_MAIN_SEPARATE_DRY_PACKET',heatingConfiguration:'REMOVE_PACKET_HEAT_MAIN_WITH_INTERNAL_SAUCE',components:packageRoles.map(role=>({role,
  candidate:{reference:`synthetic:${role}`,component:role==='pepitaPacket'?'dry-pepita-packet':'main-meal',...Object.fromEntries(packageFields.map(k=>[k,null]))},quantityPerMeal:1,purchasePackUnits:10,purchasePackPriceMinor:100,purchaseReference:'synthetic:receipt',availableUnits:0,inventoryReference:'synthetic:count',wasteUnitsPerBatch:0,evidenceBasis:'SUPPLIER_CLAIM'}))});
}
test('package component linkage requires exact recipe, SKU/offer and all roles without safety approval',()=>{
 const wb=workbench(true),p=packageLink(wb),v=validatePackageLink(p.data,wb);assert.equal(v.approved,false);assert.equal(v.components.length,6);
 assert.throws(()=>validatePackageLink({...p.data as object,recipeFingerprint:'wrong'},wb));
 assert.throws(()=>validatePackageLink({...p.data as object,components:v.components.slice(1)},wb));
});
for(const [required,available,pack,price,packs,cash] of [[120,20,100,500,1,500],[121,20,100,500,2,1000],[0,0,100,500,0,0],[100,100,100,500,0,0]])test(`whole-pack requirement ${required}/${available}`,()=>{
 const result=purchaseRequirement(required,available,pack,price);assert.equal(result.packs,packs);assert.equal(result.cashMinor,cash);
});
test('unknown inventory and price never become free supply; negative and overflow rejected',()=>{
 assert.equal(purchaseRequirement(0.07,0,0.01,1).packs,7);
 assert.equal(purchaseRequirement(100,null,100,500).cashMinor,null);assert.equal(purchaseRequirement(100,0,100,null).cashMinor,null);
 assert.throws(()=>purchaseRequirement(-1,0,100,500));assert.throws(()=>purchaseRequirement(Number.MAX_SAFE_INTEGER,0,1,500));
});
function financeFixture(){
 const wb=workbench(true),pack=stored('packaging',packageLink(wb)),sources=[pack,...wb.recipe.recipe.ingredients!.map((_,i)=>stored('measurement',measurement(wb,i)))];
 const p=purchasingTemplate(wb),known=(minorUnits:number)=>({state:'KNOWN' as const,minorUnits,sourceReference:'synthetic:expense'});
 p.packageFingerprint=validatePackageLink(pack.record.data,wb).packageFingerprint as never;
 p.weekly.price=known(1000);p.weekly.fixedWeekly=known(10000);p.weekly.laborPerBowl=known(100);
 for(const k of Object.keys(p.weekly.expenses) as (keyof typeof p.weekly.expenses)[])p.weekly.expenses[k]=known(0);
 p.laborTreatment='INCLUDE';p.weeklyBatchCapacity=10 as never;
 p.ingredientStock=wb.recipe.recipe.ingredients!.map((_,ingredientIndex)=>({ingredientIndex,ingredientId:`synthetic:ingredient-${ingredientIndex}`,availableGrams:0,sourceReference:'synthetic:count',observedAt:at})) as never;
 p.batch={id:'synthetic:batch',version:1,recipe:{id:wb.recipe.recipe.id,version:1,fingerprint:recipeFingerprint(wb.recipe)},state:'MEASURED',plannedAt:at,scheduledAt:at,targetServings:7,expectedYieldGrams:700,
  actual:{startedAt:at,finishedAt:at,yieldGrams:700,portions:7,laborMinutes:60,storage:'frozen',storageStartedAt:at,discardAt:null,packagingReference:'synthetic:package',measurementReference:'synthetic:scale'},safety:[],review:null,productionEvidence:null} as never;
 return {wb,p,sources};
}
test('batch cash golden case distinguishes consumed cost, cash purchase packs and capacity',()=>{
 const {wb,p,sources}=financeFixture();p.volumes=[25,30,40,50,60,75,0];
 const result=batchPurchasing(wb,p,sources),s=result.scenarios[0];assert.equal(s.batches,4);assert.equal(s.purchasingCashMinor,8100);
 assert.equal(s.recipeConsumedCostMinor,2500);assert.equal(s.revenueMinor,25000);assert.equal(s.operatingProfitMinor,8500);
 assert.equal(result.scenarios.at(-1)!.revenueMinor,0);assert.equal(result.scenarios.at(-1)!.operatingProfitMinor,-10000);
 assert.equal(result.scenarios.find(s=>s.bowls===75)!.capacityFeasible,false);assert.equal(result.publicCheckoutEnabled,false);
});
test('batch cash unknown prices/inventory, labor choices and revision mismatches fail closed',()=>{
 const {wb,p,sources}=financeFixture();
 assert.throws(()=>batchPurchasing(wb,{...p,priceRevision:{id:'wrong',version:1}},sources));
 assert.throws(()=>batchPurchasing(wb,{...p,recipeFingerprint:'wrong'},sources));
 const unknown=batchPurchasing(wb,{...p,ingredientStock:[]},sources);assert.equal(unknown.scenarios[0].operatingProfitMinor,null);
 const excluded=batchPurchasing(wb,{...p,laborTreatment:'EXCLUDE_EXPLICITLY'},sources);assert.equal(excluded.laborTreatment,'EXCLUDE_EXPLICITLY');
 const missing=batchPurchasing(wb,{...p,laborTreatment:'UNKNOWN'},sources);assert.equal(missing.scenarios[0].status,'INSUFFICIENT EVIDENCE');
});
test('fractional yield remainder, physical waste, partial inventory and insufficient cash are separate',()=>{
 const {wb,p,sources}=financeFixture();wb.recipe.formulation={...wb.recipe.formulation!,yieldGrams:750};
 p.recipeFingerprint=hash(wb.recipe);p.weekly.recipeFingerprint=recipeFingerprint(wb.recipe);
 const oldPackage=sources[0],updated:SourceRecord={...oldPackage.record,data:{...oldPackage.record.data as object,recipeFingerprint:recipeFingerprint(wb.recipe)}};
 const components=(updated.data as {components:Record<string,unknown>[]}).components.map(x=>({...x,wasteUnitsPerBatch:1,availableUnits:2}));
 updated.data={...updated.data as object,components};sources[0]=stored('packaging',updated);
 p.packageFingerprint=validatePackageLink(updated.data,wb).packageFingerprint as never;
 const batch=p.batch as unknown as BatchOperations;batch.recipe={...batch.recipe,fingerprint:recipeFingerprint(wb.recipe)};batch.actual={...batch.actual!,yieldGrams:750};
 p.availableCashMinor=100 as never;
 const result=batchPurchasing(wb,p,sources),s=result.scenarios[0];assert.equal(s.producedBowls,28);assert.equal(s.surplusBowls,3);
 assert.equal(s.recipeConsumedCostMinor,2500);assert.equal(s.purchasingFeasible,false);assert.ok(s.packages!.every(x=>x.requirement.required===32));
});
test('changed package source invalidates purchasing and operator evidence while original history remains',()=>{
 const {wb,p,sources}=financeFixture();const prior=hash(sources),old=sources[0];
 const revised=stored('packaging',{...old.record,data:{...old.record.data as object,components:validatePackageLink(old.record.data,wb).components.map(x=>({...x,purchasePackPriceMinor:200}))}},2);
 assert.throws(()=>batchPurchasing(wb,p,[...sources,revised]),/revision mismatch/);assert.equal(hash(sources),prior);
});
test('operator joins carry binding, source, stale flag and next action for every gate',()=>{
 const wb=workbench(),report=authoritativeReport(wb,[],{skuGovernance:initialPrivateSkuGovernance(wb.catalog),inventoryEvidence:null,purchasing:null,operations:[],providerAudit:{revision:0,observationCount:0}});
 assert.ok(report.rows.length>=24);assert.ok(report.rows.every(r=>r.source&&r.binding&&typeof r.stale==='boolean'&&r.nextAction));assert.equal(report.nextFiveActions.length,5);assert.equal(report.launchStatus,'BLOCKED');
 const captured=workbench(true),fresh=authoritativeReport(captured,[],{skuGovernance:null,inventoryEvidence:null,purchasing:null,
  operations:[{kind:'recipe',id:wb.recipe.recipe.id,version:1,fingerprint:hash(wb.recipe),value:wb.recipe}],providerAudit:null});
 assert.notEqual(fresh.rows.find(r=>r.area==='MEASURED INGREDIENTS')!.status,'STALE');
});
test('atomic private exports reject overwrite, traversal and Windows junction escapes',async()=>{
 const root=resolve('.river-dev/state'),dir=await mkdtemp(join(root,'food-completion-test-'));
 try{
  const dest=join(dir,'record.json');await writeCommercialSource(dest,{test:'synthetic'});await assert.rejects(writeCommercialSource(dest,{test:'overwrite'}));
  assert.equal((await readCommercialSource(dest)).test,'synthetic');
  await assert.rejects(writeCommercialSource('public/private.json',{}));
  const real=join(dir,'real'),junction=join(dir,'junction');await mkdir(real);await symlink(real,junction,'junction');
  await assert.rejects(writeCommercialSource(join(junction,'escape.json'),{}));await assert.rejects(readCommercialSource(join(junction,'escape.json')));
 }finally{
  const rel=relative(root,dir);assert.ok(rel.startsWith('food-completion-test-')&&!rel.startsWith('..'+sep));await rm(dir,{recursive:true,force:true});
 }
});
test('CLI rejects duplicate flags, hidden approval fields and unsupported parameters',()=>{
 assert.throws(()=>parseOptions(['--key','one','--key','two']));assert.throws(()=>parseOptions(['--source']));
 assert.throws(()=>validateSource('demand',source(workbench(),'synthetic:private',{status:'INTERESTED',people:1,bowls:1,area:'area:local',timing:'timing:any',channel:'channel:local',email:'private@example.test'}),workbench()));
});
test('owner CLI captures actual-input receipt and measurement without hand-edited JSON in isolated private storage',async()=>{
 const original=process.cwd(),root=resolve('.river-dev/state'),dir=await mkdtemp(join(root,'food-completion-test-'));
 const savedLog=console.log;
 try{
  await mkdir(join(dir,'.river-dev/state'),{recursive:true});process.chdir(dir);console.log=()=>{};
  const wb=workbench();await writeCommercialSource('.river-dev/state/input.json',wb);
  await runCommercialWorkflow('receipt-capture',['.river-dev/state/input.json','--output','.river-dev/state/receipt.json','--index','0','--id','synthetic:receipt-capture','--revision','1','--supplier','synthetic:supplier','--product','synthetic:product-0','--date','2026-10-23','--receipt','synthetic:receipt-source','--quantity','1000','--unit','g','--packs','1','--usable-grams','900','--paid-cents','900','--tax-fee-cents','0','--owner-verified-receipt']);
  await runCommercialWorkflow('measurement-capture',['.river-dev/state/input.json','--output','.river-dev/state/measured.json','--subject','synthetic:cli-measurement','--at',at,'--source','synthetic:scale-0','--key','synthetic:cli-command','--expected','0','--index','0','--ingredient','synthetic:ingredient-0','--product','synthetic:product-0','--supplier','synthetic:supplier','--quantity','100','--unit','g','--preparation','raw','--raw-grams','100','--purchase','.river-dev/state/receipt.json','--recall-reviewed-clear']);
  const measured=await readCommercialSource('.river-dev/state/measured.json');assert.equal(measured.recipe.measurements[0].grams,100);assert.equal(measured.recipe.ingredientSources[0].ingredientId,'synthetic:ingredient-0');
  assert.equal(measured.recipe.ingredientCosts.length,0);assert.equal(measured.recipe.formulation,null);
  const persisted=await LocalMiniflareD1.openPrivateOperations();try{assert.equal((await (await openCommercialEvidence(persisted)).list(context(wb).c.product.id)).length,1);}finally{await persisted.close();}
 }finally{
  console.log=savedLog;process.chdir(original);const rel=relative(root,dir);assert.ok(rel.startsWith('food-completion-test-')&&!rel.startsWith('..'+sep));await rm(dir,{recursive:true,force:true});
 }
});
