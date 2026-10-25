import {readFile,lstat,realpath,open,link,unlink} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {resolve,relative,sep,dirname,extname} from 'node:path';
import {productDecisionReview,kitchenChecklist,weeklyTemplate,weeklyProfit} from './food-commercial-planning';
import {inspectPrivateFoodWorkbench} from './food-operations-workbench';
import {demandCapacity,comparePackaging,packageFields} from './food-pilot-planning';
import {inspectRecipeOperations} from './food-operations';

/** Read only, bounded private sources; junctions and symlinks cannot redirect intake. */
export async function readCommercialSource(name:string){
 const root=resolve('.river-dev/state'),target=resolve(name),rel=relative(root,target);
 if(!rel||rel.includes(':')||rel==='..'||rel.startsWith('..'+sep)||rel.startsWith(sep)||extname(target)!=='.json')throw new TypeError('Private state JSON required');
 let cursor=target;
 while(cursor!==resolve('.')){
  const st=await lstat(cursor);if(st.isSymbolicLink())throw new TypeError('Linked private paths rejected');
  const parent=dirname(cursor);if(parent===cursor)throw new TypeError('Outside workspace');cursor=parent;
 }
 const rr=await realpath(root),rp=await realpath(target),realRel=relative(rr,rp);
 if(realRel==='..'||realRel.startsWith('..'+sep)||realRel.startsWith(sep))throw new TypeError('Private source escape');
 const st=await lstat(target);if(!st.isFile()||st.size>256*1024)throw new TypeError('Bounded private source required');
 const raw=await readFile(target,'utf8');if(Buffer.byteLength(raw)>256*1024)throw new TypeError('Oversized private source');
 return JSON.parse(raw.replace(/^\uFEFF/,''));
}
/** Existing parents only; atomic hard-link publication gives no-clobber and no partial JSON. */
export async function writeCommercialSource(name:string,value:unknown){
 const target=resolve(name),root=resolve('.river-dev/state'),rel=relative(root,target);
 if(!rel||rel.includes(':')||rel==='..'||rel.startsWith('..'+sep)||rel.startsWith(sep)||extname(target)!=='.json')throw new TypeError('Private JSON output required');
 await checkPrivateDirectory(dirname(target));
 const temp=resolve(dirname(target),`.food-write-${randomUUID()}.tmp`),raw=JSON.stringify(value,null,2)+'\n';
 if(Buffer.byteLength(raw)>256*1024)throw new TypeError('Private output too large');
 const file=await open(temp,'wx',0o600);
 try{await file.writeFile(raw,'utf8');await file.sync();}finally{await file.close();}
 try{await checkPrivateDirectory(dirname(target));await link(temp,target);}finally{await unlink(temp);}
}
export async function checkPrivateDirectory(name=resolve('.river-dev/state')){
 const root=resolve('.river-dev/state'),target=resolve(name),rel=relative(root,target);
 if(rel==='..'||rel.startsWith('..'+sep)||rel.startsWith(sep))throw new TypeError('Private directory required');
 let cursor=target;while(cursor!==resolve('.')){
  const st=await lstat(cursor);if(!st.isDirectory()||st.isSymbolicLink())throw new TypeError('Private junction/symlink directory rejected');
  const parent=dirname(cursor);if(parent===cursor)throw new TypeError('Private directory escape');cursor=parent;
 }
}
export async function runCommercialCommand(command:string,args:string[]){
 if(command==='business-checklist'){
  const {runCommercialWorkflow}=await import('./food-commercial-workflow');return runCommercialWorkflow('operator-report',args);
 }
 const json=args.includes('--json'),rest=args.filter(v=>v!=='--json');
 const [file,model,...flags]=rest;if(!file)throw new TypeError('Private workbench required');
 if(['demand-capacity','packaging-comparison'].includes(command)){
  if(rest.length!==1)throw new TypeError('One private planning file required');
  const input=await readCommercialSource(file),report=command==='demand-capacity'?demandCapacity(input):comparePackaging(input);
  console.log(JSON.stringify(report,null,2));return 0;
 }
 const wb=await readCommercialSource(file);inspectPrivateFoodWorkbench(wb);const recipe=(wb as {recipe:unknown}).recipe;
 let report:unknown;
 if(command==='packaging-template'||command==='demand-template'){
  if(rest.length!==1)throw new TypeError('One workbench required');
  const recipeFingerprint=inspectRecipeOperations(recipe).fingerprint;
  report=command==='demand-template'?{recipeFingerprint,capacityBowls:null,observations:[]}:
   {recipeFingerprint,candidates:['main-meal','dry-pepita-packet'].map((component,i)=>({reference:`candidate:${i+1}`,component,...Object.fromEntries(packageFields.map(k=>[k,null]))}))};
 }else if(command==='weekly-template'){
  if(rest.length!==1)throw new TypeError('One workbench required');report=weeklyTemplate(recipe);
 }else if(command==='weekly-profit'){
  if(!model||!(flags.length===0||flags.length===2&&flags[0]==='--goal'))throw new TypeError('Workbench, weekly model and optional --goal dollars required');
  report=weeklyProfit(recipe,await readCommercialSource(model),flags.length?Number(flags[1])*100:20000);
 }else{
  if(rest.length!==1)throw new TypeError('One workbench required');
  const decision=productDecisionReview(wb),kitchen=kitchenChecklist(wb);
  if(command==='product-review')report=decision;
  else if(command==='kitchen-checklist')report=kitchen;
  else throw new TypeError('Unsupported commercial report command');
 }
 if(json||command.endsWith('-template'))console.log(JSON.stringify(report,null,2));
 else if(command==='kitchen-checklist'){
  const r=report as ReturnType<typeof kitchenChecklist>;
  console.log('PRIVATE KITCHEN CHECKLIST — launch BLOCKED');
  for(const i of r.ingredients)console.log(`${i.index}. ${i.name}: ${i.measuredGrams===null?'GRAMS MISSING':i.measuredGrams+' g'}\n   ${i.actions.join('\n   ')}`);
  console.log(r.steps.join('\n'));console.log(`Yield: ${r.batchYieldGrams??'UNKNOWN'} g; portions: ${r.portions??'UNKNOWN'}; grams/portion: ${r.gramsPerPortion??'UNKNOWN'}`);
 }else if(command==='weekly-profit'){
  const r=report as ReturnType<typeof weeklyProfit>;
  console.log(`PRIVATE WEEKLY SCENARIOS: ${r.status}; target $${r.goalMinor/100}; owner labor included: ${r.ownerLaborIncluded}`);
  console.log(`Ingredient cost cents/bowl: ${r.ingredientCostPerBowlMinor??'UNKNOWN'}; batch cash required: UNKNOWN`);
  console.log('Expense cents/bowl: '+Object.entries(r.costBreakdown).map(([k,v])=>`${k}=${v.minorUnits??'UNKNOWN'} (${v.state})`).join('; '));
  for(const s of r.scenarios)console.log(`${s.bowls} bowls: sales cents ${s.revenueMinor??'UNKNOWN'}; operating profit cents ${s.operatingProfitBeforeTaxMinor??'UNKNOWN'}; batches ${s.requiredBatches??'UNKNOWN'}`);
  console.log(`Goal bowls: ${r.goalBowls??'UNKNOWN / NOT REACHABLE'}; missing: ${r.unknown.join(', ')||'none'}; launch BLOCKED`);
 }else if(command==='product-review'){
  const r=report as ReturnType<typeof productDecisionReview>;
  console.log(`PRIVATE FORMULATION: ${r.status}\nCurrent: ${r.currentCanonicalIngredients.join('; ')}\nProposed: ${r.proposedIngredients.join('; ')}\nExcluded: ${r.explicitlyExcluded.join('; ')}\nUnresolved: ${r.unresolvedIngredients.join('; ')}\n${r.sauce}\n${r.pepitas}`);
  for(const [k,v] of Object.entries(r.dependencies))console.log(`${k}: ${v}`);
  console.log('Downstream evidence stale for proposal; canonical history and measurements preserved. Launch BLOCKED.');
 }
 return 0;
}
