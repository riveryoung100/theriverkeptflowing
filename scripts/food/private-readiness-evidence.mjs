/** Evidence adapters for the existing launch validator. Never enables checkout. */
import {readFile,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {assessLaunchReadiness} from './launch-readiness.mjs';
import {analyze as analyzeRecipe} from './recipe-lab.mjs';
import {calculate} from './cost.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const hash=v=>createHash('sha256').update(v).digest('hex');
const receipts=new WeakMap();
export const engineeringGroups=Object.freeze({
 engine:['src/lib/food/table-order-engine.test.ts'],
 repository:['src/lib/food/table-local-order-repository.test.ts'],
 concurrency:['src/lib/food/table-d1-reliability.test.ts'],
 signatures:['src/lib/food/table-offline-payment.test.ts'],
 provider:['scripts/food/provider-observation-audit.test.ts','scripts/food/provider-session-ledger.test.ts','scripts/food/provider-exception-queue.test.ts'],
 journey:['scripts/food/commerce-completion-journey.test.ts'],
 security:['scripts/food/stripe-testmode-real-readonly.test.mjs','scripts/food/stripe-testmode-operator.test.mjs']
});
async function sourceFingerprint() {
 const files=[];
 for(const dir of ['scripts/food','src/lib/food','src/lib/commerce','src/lib/fulfillment']) {
  for(const entry of await readdir(resolve(root,dir),{withFileTypes:true}))if(entry.isFile()&&/\.(?:mjs|ts)$/.test(entry.name))files.push(join(dir,entry.name));
 }
 files.sort();return hash((await Promise.all(files.map(async p=>`${p}:${hash(await readFile(resolve(root,p)))}`))).join('\n'));
}
/** Executes only fixed repository suites. JSON reports cannot mint this receipt. */
export async function runReadinessEngineeringChecks(groups=Object.keys(engineeringGroups)) {
 if(!Array.isArray(groups)||!groups.length||new Set(groups).size!==groups.length||groups.some(k=>!Object.hasOwn(engineeringGroups,k)))throw new TypeError('Known unique engineering groups required');
 const before=await sourceFingerprint(),files=groups.flatMap(k=>engineeringGroups[k]);
 const execution=await new Promise((done,reject)=>{
  const environment={...process.env};delete environment.NODE_TEST_CONTEXT;
  const child=spawn(process.execPath,['--import','tsx','--test','--test-reporter=tap',...files],{cwd:root,env:environment,stdio:['ignore','pipe','pipe'],windowsHide:true});
  let stdout='',size=0;const timer=setTimeout(()=>child.kill(),180000);
  child.stdout.on('data',chunk=>{size+=chunk.length;if(size>16000000)child.kill();else stdout+=chunk;});
  child.stderr.on('data',()=>{});child.on('error',e=>{clearTimeout(timer);reject(e);});
  child.on('close',code=>{clearTimeout(timer);done({code,stdout});});
 });
 const count=name=>Number(execution.stdout.match(new RegExp(`^# ${name} (\\d+)\\s*$`,'m'))?.[1]??0);
 const passed=execution.code===0&&count('tests')>0&&count('fail')===0&&count('skipped')===0&&count('pass')===count('tests')&&before===await sourceFingerprint();
 const data=Object.freeze({scope:'LOCAL_SYNTHETIC_TEST_RUN',groups:[...groups],files,tests:count('tests'),passed:count('pass'),failed:count('fail'),skipped:count('skipped'),
  outcome:passed?'PASS':'BLOCKED',verifiedAt:new Date().toISOString(),sourceFingerprint:before,reportFingerprint:hash(execution.stdout)});
 const receipt=Object.freeze({kind:'ENGINEERING_EXECUTION_RECEIPT'});receipts.set(receipt,data);return receipt;
}
async function engineeringEvidence(receipt,now) {
 const data=receipts.get(receipt);
 if(!data)return null;
 const age=Date.parse(now)-Date.parse(data.verifiedAt);
 if(age<0||age>86400000||data.sourceFingerprint!==await sourceFingerprint())return {...data,outcome:'UNVERIFIED',reason:'STALE_TEST_EXECUTION'};
 return data;
}
async function source(file,validate) {
 if(!file)return {reference:null,type:'MISSING',fingerprint:null,value:null,invalid:false};
 try {
  const bytes=await readFile(resolve(root,file)),value=validate(JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,'')));
  return {reference:file,type:'VALIDATED_OWNER_RECORD_NOT_INDEPENDENT_APPROVAL',fingerprint:hash(bytes),value,invalid:false};
 }catch{return {reference:file,type:'INVALID_OR_UNAVAILABLE_SOURCE',fingerprint:null,value:null,invalid:true};}
}
const gate=(id,title,group,status,sourceRecord,missing=[],ownerApprovalNeeded=true)=>({id,title,group,status,
 evidenceSource:sourceRecord?.reference??null,evidenceType:sourceRecord?.type??'MISSING',
 lastVerifiedAt:sourceRecord?.verifiedAt??null,evidenceFingerprint:sourceRecord?.fingerprint??null,
 missingRequirements:missing,blockingReason:status==='PASS'?null:missing.join('; ')||'Authoritative evidence unavailable',ownerApprovalNeeded});

/** @param {{engineeringReceipt?:object|null,now?:string,launchFile?:string,recipeFile?:string|null,costFile?:string|null,businessFile?:string|null,workbenchFile?:string|null,productId?:string,providerAudit?:{observations:()=>Promise<any[]>}|null}} [options] */
export async function collectOperationalReadiness({engineeringReceipt=null,now=new Date().toISOString(),
 launchFile='scripts/food/launch-readiness.template.json',recipeFile=null,costFile=null,businessFile=null,workbenchFile=null,
 productId='food-product:southwest-harvest-bowl',providerAudit=null}={}) {
 if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(now)||!Number.isFinite(Date.parse(now)))throw new TypeError('Canonical review time required');
 const {TABLE_CATALOG,validateTableEntry}=await import('../../src/lib/food/table-catalog.ts');
 const entry=TABLE_CATALOG.find(p=>p.product.id===productId);if(!entry)throw new TypeError('Known canonical product required');validateTableEntry(entry);
 const engineering=await engineeringEvidence(engineeringReceipt,now);
 const launch=await source(launchFile,assessLaunchReadiness),recipe=await source(recipeFile,analyzeRecipe);
 const cost=await source(costFile,input=>({inputs:input,estimate:calculate(input)}));
 const catalogSource={reference:'src/lib/food/table-catalog.ts',type:'CANONICAL_VALIDATED_PRODUCT_RECORD',fingerprint:hash(await readFile(resolve(root,'src/lib/food/table-catalog.ts')))};
 const gates=[];
 const mapping={engine:['order-state-machine','quote-integrity','reservation-expiration'],repository:['durable-local-repository','event-deduplication','refund-handling'],
  concurrency:['local-capacity-concurrency'],signatures:['signed-synthetic-webhooks'],provider:['provider-observations','provider-session-expiry','late-event-quarantine','exception-review'],
  journey:['integrated-synthetic-journey','operator-recovery'],security:['private-reader-security','powershell-parser']};
 for(const [key,ids] of Object.entries(mapping))for(const id of ids) {
  const present=engineering?.groups.includes(key),status=present?engineering.outcome:'UNVERIFIED';
  gates.push(gate(id,id.replaceAll('-',' '),'engineering',status,present?{reference:engineering.files.join(', '),type:engineering.scope,verifiedAt:engineering.verifiedAt,fingerprint:engineering.reportFingerprint}:null,
   status==='PASS'?[]:[engineering?.reason??`Run current ${key} regression group`],false));
 }
 // Persisted provenance labels are historical assertions, not a fresh trusted read.
 const saved=providerAudit?await providerAudit.observations():[];
 for(const id of ['actual-test-retrieval','real-test-session-correlation','actual-test-checkout-e2e','production-payment-verification','production-d1','production-migration'])
  gates.push(gate(id,id.replaceAll('-',' '),'provider','UNVERIFIED',saved.length?{reference:'local provider audit',type:'HISTORICAL_TEST_AUDIT_NOT_INDEPENDENT_PROOF'}:null,
   ['Independent provider/production verification required'],false));
 const catalogCheck=(id,title,condition,missing,group='food')=>gates.push(gate(id,title,group,condition?'PASS':'BLOCKED',catalogSource,condition?[]:[missing]));
 catalogCheck('measured-recipe','Measured recipe and portion weights',entry.display==='approved'&&entry.packageDefinition?.netQuantity?.grams>0,'Approved measured recipe, portions and net weight');
 catalogCheck('ingredient-disclosure','Verified ingredient composition',entry.ingredientsStatus==='verified','Ingredient sourcing and composition evidence');
 catalogCheck('allergen-review','Verified allergens',entry.display==='approved'&&entry.recipe.allergenReview?.state==='reviewed','Reviewed allergens for exact recipe version');
 catalogCheck('nutrition','Nutrition facts',entry.display==='approved'&&entry.nutrition!==null,'Substantiated nutrition for measured serving');
 catalogCheck('price-approval','Approved exact SKU price',entry.approvedPrice!==null,'Approved selling price for exact SKU','finance');
 catalogCheck('inventory','Actual inventory',entry.state==='AVAILABLE'&&entry.remainingCapacity>0,'Authoritative available inventory and production capacity','commercial');
 catalogCheck('fulfillment-configuration','Pickup/delivery configuration',entry.display==='approved'&&entry.fulfillment.pickup===true,'Approved pickup location/window and delivery rules','fulfillment');
 for(const [group,ids,src] of [
  ['food',['freezer-reheat-quality','cooling','refrigeration','storage-temperatures','shelf-life','transport-temperatures','packaging','labels','food-handler','owner-kitchen-authorization'],recipe],
  ['legal',['texas-food-regulatory-review','licenses-registrations','sales-tax-classification'],launch],
  ['finance',['receipt-based-ingredients','verified-quantities','actual-packaging-cost','delivery-cost','labor-cost','processing-fees','fixed-expenses','operating-margin','weekly-profit-target'],cost],
  ['fulfillment',['customer-pickup','customer-delivery','delivery-radius','out-of-radius-approval','cancellation-policy','refund-policy','customer-support'],launch]]) {
  for(const id of ids)gates.push(gate(id,id.replaceAll('-',' '),group,src.invalid?'BLOCKED':'UNVERIFIED',src,
   [src.invalid?'Source record invalid or unavailable':'Independent exact-product approval/evidence required']));
 }
 // Legacy owner checkboxes are evidence assertions. They cannot grant this operator's launch authority.
 gates.push(gate('owner-launch-authorization','Explicit owner launch authorization','authorization','BLOCKED',launch,['Independent owner launch authorization not granted']));
 gates.push(gate('public-checkout','Public customer checkout','authorization','BLOCKED',catalogSource,['Customer ordering remains disabled']));
 const all=group=>gates.filter(g=>g.group===group).every(g=>g.status==='PASS');
 const eng=gates.filter(g=>g.group==='engineering');
 let foodWorkbench=null;
 if(workbenchFile) {
  try {
   const {inspectPrivateFoodWorkbench}=await import('./food-operations-workbench.ts');
   foodWorkbench=inspectPrivateFoodWorkbench(JSON.parse(await readFile(resolve(root,workbenchFile),'utf8')));
  } catch {foodWorkbench={kind:'PRIVATE_WORKBENCH_INVALID',priorities:['Repair invalid or unavailable workbench source'],launchStatus:'BLOCKED',publicCheckoutEnabled:false};}
  for(const [index,action] of foodWorkbench.priorities.entries())
   gates.push({...gate(`workbench-${index}`,action,'food',foodWorkbench.kind==='PRIVATE_WORKBENCH_INVALID'?'BLOCKED':'UNVERIFIED',
    {reference:workbenchFile,type:'PRIVATE_OWNER_RECORD_NOT_INDEPENDENT_APPROVAL'},[action]),actionRequired:action});
 }
 let foodOperations=null;
 if(businessFile) {
  const {operatingReport}=await import('./operating-system.ts');
  try {foodOperations=operatingReport(JSON.parse(await readFile(resolve(root,businessFile),'utf8')));}
  catch {foodOperations={inputStatus:'INVALID_SOURCE_RECORD',priorities:['Validate measured recipe/source input'],publicCheckoutEnabled:false};}
  for(const [i,action] of foodOperations.priorities.entries())gates.push({...gate(`operations-${i}`,action,'food',foodOperations.inputStatus==='INVALID_SOURCE_RECORD'?'BLOCKED':'UNVERIFIED',
   {reference:businessFile,type:foodOperations.inputStatus==='INVALID_SOURCE_RECORD'?'INVALID_SOURCE_RECORD':'VALIDATED_OPERATIONAL_RECORD_NOT_APPROVAL'},[action]),evidenceRevision:foodOperations.recipe?.recipe.recipe.version??null,actionRequired:action});
 }
 return {kind:'PRIVATE_OPERATIONAL_READINESS',productId:entry.product.id,productVersion:entry.product.version,generatedAt:now,status:'BLOCKED',publicCheckoutEnabled:false,foodOperations,foodWorkbench,
  summary:{engineering:eng.every(g=>g.status==='PASS')?'PASS':eng.some(g=>g.status==='PASS')?'PARTIAL':'BLOCKED',paymentProvider:'DEFERRED',
   foodCompliance:all('food')&&all('legal')?'PASS':'BLOCKED',menuApproval:entry.display==='approved'?'PASS':'BLOCKED',financialReadiness:all('finance')?'PASS':'BLOCKED',
   fulfillment:all('fulfillment')?'PASS':'BLOCKED',publicCheckout:'DISABLED',launchAuthorization:'NOT GRANTED'},
  gates,blockedGates:gates.filter(g=>g.status==='BLOCKED').map(g=>g.id),unverifiedGates:gates.filter(g=>g.status==='UNVERIFIED').map(g=>g.id),
  engineeringPasses:eng.filter(g=>g.status==='PASS').map(g=>g.id),requiredOwnerActions:gates.filter(g=>g.ownerApprovalNeeded&&g.status!=='PASS').map(g=>({gate:g.id,missing:g.missingRequirements})),
  sources:[launch,recipe,cost].map(record=>Object.fromEntries(Object.entries(record).filter(([key])=>key!=='value'))),recipeObservations:recipe.value?.map(r=>({gaps:r.gaps,failures:r.failures,safetyStatus:r.safetyStatus}))??[],
  costing:cost.value?{classification:'ENTERED_ESTIMATE_NOT_RECEIPT_VERIFIED',variableCostMinor:String(cost.value.estimate.variableCostCents),contributionMinor:String(cost.value.estimate.contributionCents)}:null,
  providerHistory:{scope:'LOCAL_TEST_DURABILITY',observations:saved.length,
   actualTestReadAssertions:saved.filter(v=>v?.observation?.source==='REAL_STRIPE_TEST_MODE_READ').length,
   fixtures:saved.filter(v=>v?.observation?.source==='SYNTHETIC_FIXTURE').length,independentlyVerified:false},
  actualRevenueMinor:null,operatingProfitMinor:null,weeklyPlanningTargetMinor:20000,engineeringExecution:engineering??null,
  notice:'Local engineering proof does not certify food, legal compliance, sales, live payments, production D1, or owner authorization.'};
}
export function operationalReadinessSummary(r) {
 return [`PRIVATE READINESS: ${r.status}`,`ENGINEERING: ${r.summary.engineering}`,`PAYMENT PROVIDER: ${r.summary.paymentProvider}`,
  `FOOD COMPLIANCE: ${r.summary.foodCompliance}`,`MENU APPROVAL: ${r.summary.menuApproval}`,`FINANCIAL READINESS: ${r.summary.financialReadiness}`,
  `FULFILLMENT: ${r.summary.fulfillment}`,'PUBLIC CHECKOUT: DISABLED','LAUNCH AUTHORIZATION: NOT GRANTED',
  `BLOCKED: ${r.blockedGates.join(', ')}`,`UNVERIFIED: ${r.unverifiedGates.join(', ')}`,`ENGINEERING PASSES: ${r.engineeringPasses.join(', ')||'NONE'}`,
  ...r.requiredOwnerActions.map(a=>`OWNER ACTION ${a.gate}: ${a.missing.join('; ')}`)].join('\n');
}
