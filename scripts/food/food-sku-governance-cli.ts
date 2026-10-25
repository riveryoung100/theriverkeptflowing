/** Write-once private SKU proposal/review files; explicitly not an approval system. */
import {readFile,writeFile,mkdir,realpath,lstat} from 'node:fs/promises';
import {resolve,relative,dirname,sep,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {TABLE_CATALOG} from '../../src/lib/food/table-catalog';
import {initialPrivateSkuGovernance,inspectPrivateSkuGovernance,applyPrivateSkuProposal,appendPrivateSkuReview,draftPrivateSkuProposal,draftPrivateSkuReview} from './food-sku-governance';
const catalog=TABLE_CATALOG[0];
function file(input:string){
 if(typeof input!=='string'||!input)throw new TypeError('File path required');
 const root=resolve(process.cwd(),'.river-dev','state'),p=resolve(process.cwd(),input),r=relative(root,p);
 if(!r||r==='..'||r.startsWith('..'+sep)||r.startsWith(sep)||extname(r).toLowerCase()!=='.json')throw new TypeError('Private .river-dev/state/*.json file required');
 return {root,path:p};
}
async function safePath(name:string,write=false){
 const p=file(name);if(write)await mkdir(dirname(p.path),{recursive:true});
 const a=await realpath(p.root),b=await realpath(dirname(p.path));const rel=relative(a,b);
 if(rel==='..'||rel.startsWith('..'+sep)||rel.startsWith(sep))throw new TypeError('Symlink escapes private evidence directory');
 if(!write){const s=await lstat(p.path);if(s.isSymbolicLink()||!s.isFile())throw new TypeError('Expected regular private evidence file');}
 return p.path;
}
async function readJSON(name:string){const p=await safePath(name);const data=await readFile(p,'utf8');if(Buffer.byteLength(data)>256*1024)throw new TypeError('Excessive private JSON evidence');return JSON.parse(data.replace(/^\uFEFF/,''));}
async function save(name:string,data:unknown){const p=await safePath(name,true);await writeFile(p,JSON.stringify(data,null,2)+'\n',{flag:'wx'});}
export async function runPrivateSkuGovernanceCLI(args:string[]){
 const [command,...rest]=args;
 if(!command||command==='--help'){
  console.log('FOOD-019–024S OWNER REVIEW ONLY (SKU/package proposal; checkout blocked)');
  console.log('  init <new-history.json>');
  console.log('  proposal-template <new-proposal.json>');
  console.log('  propose <history.json> <filled-proposal.json> <new-history.json> <expected-sha256>');
  console.log('  review-template <history.json> <kind> <new-review.json>');
  console.log('  review <history.json> <filled-review.json> <new-history.json> <expected-sha256>');
  console.log('  inspect <history.json> [private-workbench.json]');
  console.log('All JSON paths are private under .river-dev/state. Files are never overwritten.');return 0;
 }
 if(command==='init'){
  if(rest.length!==1)throw new TypeError('Expected new private history file');await save(rest[0],initialPrivateSkuGovernance(catalog));
  console.log('FINAL PASS: PRIVATE SKU REVIEW DRAFT CREATED; NO SKU, STOCK OR PRICE AUTHORIZED');return 0;
 }
 if(command==='proposal-template'){
  if(rest.length!==1)throw new TypeError('Expected new proposal template');await save(rest[0],draftPrivateSkuProposal(catalog));
  console.log('FINAL PASS: BLANK PRIVATE SKU PROPOSAL TEMPLATE; OWNER MUST FILL REAL VALUES');return 0;
 }
 if(command==='propose'){
  if(rest.length!==4)throw new TypeError('Expected history, filled proposal, new history, prior fingerprint');
  const [old,proposal,newFile,digest]=rest;if(file(newFile).path===file(old).path||file(newFile).path===file(proposal).path)throw new TypeError('New history must use a new path');
  const next=applyPrivateSkuProposal(await readJSON(old),catalog,await readJSON(proposal),digest);
  await save(newFile,next);console.log(JSON.stringify({result:'PASS',nextFingerprint:inspectPrivateSkuGovernance(next,catalog).fingerprint,
   catalogSkuAuthorized:false,publicCheckoutEnabled:false,notice:'Owner-proposed only; no catalog mutation or commercial authority'},null,2));return 0;
 }
 if(command==='review-template'){
  if(rest.length!==3)throw new TypeError('Expected history, kind, new review file');
  const [history,kind,newFile]=rest;await save(newFile,draftPrivateSkuReview(await readJSON(history),catalog,kind as unknown as import("./food-sku-governance").ReviewKind));
  console.log('FINAL PASS: UNVERIFIED PRIVATE REVIEW TEMPLATE CREATED');return 0;
 }
 if(command==='review'){
  if(rest.length!==4)throw new TypeError('Expected history, filled review, new history, prior fingerprint');
  const [old,review,newFile,digest]=rest;if(file(newFile).path===file(old).path||file(newFile).path===file(review).path)throw new TypeError('New history must use a new path');
  const next=appendPrivateSkuReview(await readJSON(old),catalog,await readJSON(review),digest);
  await save(newFile,next);console.log(JSON.stringify({result:'PASS',nextFingerprint:inspectPrivateSkuGovernance(next,catalog).fingerprint,
   independentApproval:false,publicCheckoutEnabled:false},null,2));return 0;
 }
 if(command==='inspect'){
  if(rest.length<1||rest.length>2)throw new TypeError('Expected private history and optional private workbench');
  const packet=await readJSON(rest[0]),wb=rest[1]?await readJSON(rest[1]):null;
  const operations=wb&&typeof wb==='object'&&!Array.isArray(wb)&&'catalog' in wb&&'recipe' in wb?(wb as {recipe:unknown}).recipe:wb;
  console.log(JSON.stringify(inspectPrivateSkuGovernance(packet,catalog,operations),null,2));return 0;
 }
 throw new TypeError('Unsupported private SKU operation');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){runPrivateSkuGovernanceCLI(process.argv.slice(2)).then(n=>process.exitCode=n).catch(e=>{console.error('FOOD-019–024S FINAL STOP: '+(e instanceof Error?e.message:'Unrecognized failure'));process.exitCode=1;});}
