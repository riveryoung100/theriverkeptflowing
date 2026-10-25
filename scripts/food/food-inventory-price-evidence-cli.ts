/** Private write-once inventory / price / compliance evidence history. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,relative,dirname,sep,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {TABLE_CATALOG} from '../../src/lib/food/table-catalog';
import {initialPrivateInventoryPriceEvidence,inspectPrivateInventoryPriceEvidence,appendPrivateInventoryPriceEvidence} from './food-inventory-price-evidence';
function privateFile(name:string){const root=resolve(process.cwd(),'.river-dev','state'),p=resolve(process.cwd(),name),r=relative(root,p);
 if(!r||r==='..'||r.startsWith('..'+sep)||r.startsWith(sep)||extname(r).toLowerCase()!=='.json')throw new TypeError('Private .river-dev/state/*.json file required');return p;}
async function readJSON(name:string){const p=privateFile(name),txt=await readFile(p,'utf8');if(Buffer.byteLength(txt)>256*1024)throw new TypeError('Private record too large');return JSON.parse(txt.replace(/^\uFEFF/,''));}
export async function runInventoryPriceCLI(args:string[]){
 const [command,...rest]=args;
 if(!command||command==='--help'){
  console.log('FOOD-019–024R PRIVATE ONLY: init <new.json> | inspect <file.json> | append <old.json> <new-item.json> <new-version.json> <expected-sha256>');
  console.log('All files must be in .river-dev/state. Product binding: current first catalog item. Checkout remains disabled.');return 0;
 }
 const catalog=TABLE_CATALOG[0];
 if(command==='init'){
  if(rest.length!==1)throw new TypeError('One new private file required');const dest=privateFile(rest[0]);await mkdir(dirname(dest),{recursive:true});
  await writeFile(dest,JSON.stringify(initialPrivateInventoryPriceEvidence(catalog),null,2)+'\n',{flag:'wx'});
  console.log('FINAL PASS: UNVERIFIED PRIVATE EVIDENCE TEMPLATE CREATED; NO INVENTORY OR PRICE APPROVED');return 0;
 }
 if(command==='inspect'){
  if(rest.length!==1)throw new TypeError('One private file required');const value=inspectPrivateInventoryPriceEvidence(await readJSON(rest[0]),catalog);
  console.log(JSON.stringify(value,null,2));return 0;
 }
 if(command==='append'){
  if(rest.length!==4)throw new TypeError('Old source, new evidence item, new destination and expected fingerprint required');
  const [old,item,newFile,fingerprint]=rest;
  const dest=privateFile(newFile);if(dest===privateFile(old)||dest===privateFile(item))throw new TypeError('Output must be new and distinct');
  const value=appendPrivateInventoryPriceEvidence(await readJSON(old),catalog,await readJSON(item),fingerprint);
  await mkdir(dirname(dest),{recursive:true});await writeFile(dest,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
  const summary=inspectPrivateInventoryPriceEvidence(value,catalog);
  console.log(JSON.stringify({result:'PASS',fingerprint:summary.fingerprint,entries:summary.evidenceEntries,
    blockers:summary.blockers,publicCheckoutEnabled:false,liveInventoryAuthority:false},null,2));return 0;
 }
 throw new TypeError('Unknown private evidence operation');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){runInventoryPriceCLI(process.argv.slice(2)).then(n=>process.exitCode=n).catch(e=>{
 console.error(`FOOD-019–024R FINAL STOP: ${e instanceof Error?e.message:'Unrecognized failure'}`);process.exitCode=1;});}
