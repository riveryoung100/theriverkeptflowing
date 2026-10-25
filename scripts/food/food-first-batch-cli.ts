/** FOOD-031 private, write-once CLI adapter to the existing trial engine. */
import {readFile,writeFile,mkdir,lstat,realpath} from 'node:fs/promises';
import {resolve,relative,dirname,sep,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {context,hash,type StoredSource,type SourceRecord} from './food-commercial-evidence';
import {projectFirstBatch,trialReport,sauceComparison,trialFinanceTemplate,validateTrialEvent,type TrialEvent} from './food-first-batch';

const MAX_BYTES=512*1024;
const stateRoot=()=>resolve(process.cwd(),'.river-dev','state');
function within(p:string,root:string){const r=relative(root,p);return r!==''&&r!=='..'&&!r.startsWith('..'+sep)&&!r.startsWith(sep);}
function privatePath(p:string){
 const full=resolve(process.cwd(),p);if(!within(full,stateRoot())||extname(full).toLowerCase()!=='.json')throw new TypeError('Private .river-dev/state/*.json path required');return full;
}
async function noLinkEscape(full:string,allowMissing:boolean){
 const root=stateRoot();let parent=dirname(full);
 while(true){
  try{const s=await lstat(parent);if(s.isSymbolicLink())throw new TypeError('Linked private parent forbidden');
   const real=await realpath(parent);const realRoot=await realpath(root).catch(()=>root);
   if(!within(real,realRoot)&&real!==realRoot)throw new TypeError('Private path junction escape');break;
  }catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;if(!allowMissing)throw e;}
  const next=dirname(parent);if(next===parent)throw new TypeError('Unsafe private path');parent=next;
 }
 try{const s=await lstat(full);if(s.isSymbolicLink()||!s.isFile())throw new TypeError('Only ordinary private files allowed');
   const real=await realpath(full);const realRoot=await realpath(root).catch(()=>root);
   if(!within(real,realRoot))throw new TypeError('Private file junction escape');
 }catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT'||!allowMissing)throw e;}
}
async function readJSON(p:string):Promise<unknown>{const f=privatePath(p);await noLinkEscape(f,false);const data=await readFile(f);if(data.length>MAX_BYTES)throw new TypeError('Oversized private record');return JSON.parse(data.toString('utf8').replace(/^\uFEFF/,''));}
async function writeNew(p:string,data:unknown){const f=privatePath(p);await noLinkEscape(f,true);await mkdir(dirname(f),{recursive:true});await noLinkEscape(f,true);const body=JSON.stringify(data,null,2)+'\n';if(Buffer.byteLength(body)>MAX_BYTES)throw new TypeError('Oversized private record');await writeFile(f,body,{flag:'wx',mode:0o600});}
function checkHistory(base:unknown,history:unknown):StoredSource[]{
 if(!Array.isArray(history)||history.length>128)throw new TypeError('Bounded trial event history required');
 const records=history as StoredSource[];if(records.length)projectFirstBatch(base,records);
 return records;
}
export function makeEvent(base:unknown,history:readonly StoredSource[],action:TrialEvent['action'],payload:unknown,identity:{batchId:string;candidate:TrialEvent['candidate']},observedAt:string,sourceReference:string):StoredSource{
 const event:TrialEvent={batchId:identity.batchId,candidate:identity.candidate,baseFingerprint:hash(base),action,payload};validateTrialEvent(event,base);
 const record:SourceRecord={binding:context(base).binding,subject:identity.batchId,observedAt,sourceReference,data:event};
 return {sequence:(history.at(-1)?.sequence??0)+1,revision:history.length+1,kind:'first-batch',subject:identity.batchId,fingerprint:hash(record),record};
}
export function extendHistory(base:unknown,history:readonly StoredSource[],action:TrialEvent['action'],payload:unknown,identity:{batchId:string;candidate:TrialEvent['candidate']},observedAt:string,sourceReference:string){
 const next=[...history,makeEvent(base,history,action,payload,identity,observedAt,sourceReference)];projectFirstBatch(base,next);return next;
}
const help=`FOOD-031 private trial CLI (NO COMMERCIAL APPROVAL)
  first-batch init <base-workbench.json> <A|B|C> <batch-id> <new-history.json>
  first-batch template <init|weigh|receipt|yield|package|observe|finance> <new-payload.json>
  first-batch append <base-workbench.json> <history.json> <action> <payload.json> <new-history.json> <expected-revision>
  first-batch report <base-workbench.json> <history.json>
  first-batch finance-template <base-workbench.json> <history.json>
  first-batch compare <base-workbench.json> <history-A.json> [history-B.json] [history-C.json]
All paths must be under .river-dev/state. Every append writes a NEW file; never edits existing records.
Receipt, weight, and thermal evidence must be real owner inputs; no approval or checkout.`;
export async function runFirstBatchCLI(args:string[]){
 const [cmd,...p]=args;if(!cmd||cmd==='--help'||cmd==='help'){console.log(help);return 0;}
 if(cmd==='template'){
  if(p.length!==2)throw new TypeError('template requires action and new private output');
  const templates:Record<string,unknown>={
   init:{purpose:null},
   weigh:{ingredientIndex:null,ingredientId:null,sourceRevision:null,supplierReference:null,purchasedProduct:null,usedGrams:null,rawGrams:null,drainedGrams:null,discardGrams:null,preparedGrams:null,preparation:null,recallReviewedClear:false},
   receipt:{ingredientIndex:null,purchasedProduct:null,purchase:null},
   yield:{cookedGrams:null,packedGrams:null,portionWeights:[],leftoversGrams:null,wasteGrams:null,method:null,captureSource:null},
   package:{component:null},observe:{id:null,portionId:null,trayReference:null,frozenStartedAt:null,storageReadings:[],reheatingMethod:null,microwaveWatts:null,heatingIntervalsSeconds:[],restSeconds:null,finalReadings:[],thermometerReference:null,calibrationReference:null,packetRemoved:null,quality:{flavor:null,bitterness:null,limeBrightness:null,kaleDetectability:null,color:null,texture:null,freezerSeparation:null,microwaveSeparation:null,riceMoisture:null,overallPreference:null},unevenHeating:null,containerBehavior:null,sealIntegrity:null,sauceTexture:null,sauceSeparation:null,riceTexture:null,sweetPotatoTexture:null,beanTexture:null,vegetableTexture:null,pepitaPacketCondition:null,acceptance:null,notes:null},finance:null
  };if(!(p[0] in templates))throw new TypeError('Unknown template kind');
  await writeNew(p[1],{kind:p[0],payload:templates[p[0]],status:'UNVERIFIED_EMPTY_TEMPLATE'});console.log('FINAL PASS: blank private template written. NOT evidence.');return 0;
 }
 if(cmd==='init'){
  if(p.length!==4||!['A','B','C'].includes(p[1]))throw new TypeError('init needs base, A|B|C, batchId, output');
  const base=await readJSON(p[0]),event=makeEvent(base,[],'init',{purpose:'Private first-batch experimental kitchen trial'}, {batchId:p[2],candidate:p[1] as 'A'|'B'|'C'},new Date().toISOString(),'owner:private-trial-init');
  const events=[event];projectFirstBatch(base,events);await writeNew(p[3],events);
  console.log('FINAL PASS: Experimental trial initialized. Launch BLOCKED; no measurements asserted.');return 0;
 }
 if(cmd==='append'){
  if(p.length!==6)throw new TypeError('append needs base, history, action, payload, new history and expected revision');
  const base=await readJSON(p[0]),old=checkHistory(base,await readJSON(p[1]));const expected=Number(p[5]);
  if(!Number.isSafeInteger(expected)||expected!==old.length||!old.length)throw new TypeError('STALE: expected trial revision does not match authoritative history');
  if(p[2]==='init'||!['weigh','receipt','yield','package','observe','finance'].includes(p[2]))throw new TypeError('Unsupported append action');
  const payloadFile=await readJSON(p[3]);if(!payloadFile||typeof payloadFile!=='object'||Array.isArray(payloadFile)||!('kind' in payloadFile)||!('status' in payloadFile)||payloadFile.kind!==p[2]||payloadFile.status!=='OWNER_ENTERED_UNVERIFIED'||!Object.hasOwn(payloadFile,'payload')||!('payload' in payloadFile))throw new TypeError('Set matching kind, status OWNER_ENTERED_UNVERIFIED and enter actual payload');
  const first=old[0].record.data as TrialEvent;const next=extendHistory(base,old,p[2] as TrialEvent['action'],payloadFile.payload,{batchId:first.batchId,candidate:first.candidate},new Date().toISOString(),`owner:trial-revision-${old.length+1}`);
  await writeNew(p[4],next);console.log(`FINAL PASS: Private trial revision ${next.length} validated and written. No approval.`);return 0;
 }
 if(cmd==='report'||cmd==='finance-template'){
  if(p.length!==2)throw new TypeError('report needs base and trial history');const base=await readJSON(p[0]);const state=projectFirstBatch(base,checkHistory(base,await readJSON(p[1])));
  const data=cmd==='report'?trialReport(state):trialFinanceTemplate(state);console.log(JSON.stringify(data,null,2));return 0;
 }
 if(cmd==='compare'){
  if(p.length<2||p.length>4)throw new TypeError('compare needs base and one to three trial histories');const base=await readJSON(p[0]);const states=[];
  for(const file of p.slice(1))states.push(projectFirstBatch(base,checkHistory(base,await readJSON(file))));
  console.log(JSON.stringify(sauceComparison(states),null,2));return 0;
 }
 throw new TypeError('Unknown first-batch command. Use first-batch --help');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)runFirstBatchCLI(process.argv.slice(2)).then(v=>{process.exitCode=v;}).catch(e=>{console.error('FOOD-031 FINAL STOP: '+(e instanceof Error?e.message:String(e)));process.exitCode=1;});
