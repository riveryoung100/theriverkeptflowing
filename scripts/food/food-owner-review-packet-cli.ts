/** FOOD-019–024T: local private inspection and write-once review packet export. */
import {readFile,writeFile,mkdir,realpath,lstat} from 'node:fs/promises';
import {resolve,relative,dirname,sep,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {TABLE_CATALOG} from '../../src/lib/food/table-catalog';
import {inspectPrivateOwnerReviewPacket} from './food-owner-review-packet';
const maxBytes=256*1024;
function locate(name:string){
 if(typeof name!=='string'||!name)throw new TypeError('Private file path required');
 const root=resolve(process.cwd(),'.river-dev','state'),target=resolve(process.cwd(),name),rel=relative(root,target);
 if(!rel||rel==='..'||rel.startsWith('..'+sep)||rel.startsWith(sep)||extname(rel).toLowerCase()!=='.json')throw new TypeError('Only .river-dev/state/*.json is permitted');
 return {root,target};
}
async function pathChecked(name:string,write=false){
 const p=locate(name);
 if(write)await mkdir(dirname(p.target),{recursive:true});
 const rootStat=await lstat(p.root),parentStat=await lstat(dirname(p.root));
 if(rootStat.isSymbolicLink()||parentStat.isSymbolicLink()||!rootStat.isDirectory())throw new TypeError('Private evidence root may not be a symlink');
 const rr=await realpath(p.root),dr=await realpath(dirname(p.target)),rel=relative(rr,dr);
 if(rel==='..'||rel.startsWith('..'+sep)||rel.startsWith(sep))throw new TypeError('Private symlink path escapes state folder');
 if(!write){const st=await lstat(p.target);if(!st.isFile()||st.isSymbolicLink()||st.size>maxBytes)throw new TypeError('Expected bounded regular private evidence file');}
 return p.target;
}
async function load(name:string){return JSON.parse((await readFile(await pathChecked(name),'utf8')).replace(/^\uFEFF/,''));}
export async function runOwnerPacketCLI(args:string[]){
 const [command,...rest]=args;
 if(!command||command==='--help'){
  console.log('FOOD-019–024T: PRIVATE OWNER REVIEW (never a sale approval)');
  console.log('  inspect <sku-history.json> [workbench.json|-] [inventory-evidence.json|-]');
  console.log('  write <sku-history.json> <workbench.json|-> <inventory-evidence.json|-> <new-packet.json>');
  console.log('All files must be under .river-dev/state; no existing packet is overwritten.');return 0;
 }
 if(!['inspect','write'].includes(command))throw new TypeError('Unsupported owner packet operation');
 if(command==='inspect'&&(rest.length<1||rest.length>3))throw new TypeError('Expected SKU history and optional private sources');
 if(command==='write'&&rest.length!==4)throw new TypeError('Expected SKU history, workbench or dash, inventory or dash, and new output');
 const [skuName,wbName='-',invName='-',outputName]=rest;
 if(skuName==='-')throw new TypeError('Actual private SKU history file required');
 const fileList=[skuName,...[wbName,invName].filter(n=>n!=='-')];
 if(outputName&&fileList.some(f=>locate(f).target===locate(outputName).target))throw new TypeError('Review output must be different from source files');
 const value=inspectPrivateOwnerReviewPacket({catalog:TABLE_CATALOG[0],skuGovernance:await load(skuName),
  workbench:wbName==='-'?null:await load(wbName),inventoryEvidence:invName==='-'?null:await load(invName)});
 if(command==='write'){
  const target=await pathChecked(outputName,true);
  await writeFile(target,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(`PASS: Private review packet written. Fingerprint: ${value.reviewPacketFingerprint}`);
  console.log('PUBLIC CHECKOUT: DISABLED; OWNER APPROVAL: NOT GRANTED; REAL PRICING: NOT AUTHORIZED');
 }else console.log(JSON.stringify(value,null,2));
 return 0;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){runOwnerPacketCLI(process.argv.slice(2)).then(n=>process.exitCode=n).catch(e=>{
 console.error('FOOD-019–024T FINAL STOP: '+(e instanceof Error?e.message:'Unknown private evidence error'));process.exitCode=1;
});}
