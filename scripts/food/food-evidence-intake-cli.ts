/** Private file-to-file evidence workflow. Never modifies an approved source or opens checkout. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,relative,dirname,sep,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {applyPrivateFoodEvidence,draftIntakeCommand} from './food-evidence-intake';

function privateFile(filename:string):string {
 const root=resolve(process.cwd(),'.river-dev','state');
 const target=resolve(process.cwd(),filename),rel=relative(root,target);
 if(!rel||rel.startsWith('..'+sep)||rel==='..'||rel.startsWith(sep)||extname(rel).toLowerCase()!=='.json')throw new TypeError('Evidence files must reside beneath .river-dev/state/ and end in .json');
 return target;
}
async function readJSON(path:string,maxBytes=256*1024):Promise<unknown>{const text=await readFile(privateFile(path),'utf8');if(Buffer.byteLength(text)>maxBytes)throw new TypeError('Evidence input too large');return JSON.parse(text.replace(/^\uFEFF/,''));}
export async function runFoodEvidenceCLI(args:string[]){
 const [action,...params]=args;
 if(action==='--help'||!action){
  console.log('FOOD-019–024Q private evidence intake (no checkout)');
  console.log('  template <input-workbench.json> <kind> <new-command.json> [ingredientIndex]');
  console.log('  apply <input-workbench.json> <command.json> <new-workbench.json>');
  console.log('Kinds: ingredient-measurement, ingredient-source, measured-yield, verified-purchase, operating-expense');
  console.log('All files must reside within .river-dev/state. Original files are never overwritten.');return 0;
 }
 if(action==='template'){
  if(params.length!==3&&params.length!==4)throw new TypeError('Template takes input file, kind, output file and optional ingredient index');
  const [input,kind,output,rawIngredient]=params;
  const ingredient=rawIngredient===undefined?0:Number(rawIngredient);
  if(!Number.isSafeInteger(ingredient)||ingredient<0)throw new TypeError('Exact ingredient index required');
  const command=draftIntakeCommand(await readJSON(input),kind as Parameters<typeof draftIntakeCommand>[1],ingredient);
  const dest=privateFile(output);await mkdir(dirname(dest),{recursive:true});
  await writeFile(dest,JSON.stringify(command,null,2)+'\n',{flag:'wx'});
  console.log('FINAL PASS: PRIVATE COMMAND TEMPLATE CREATED. Values are unverified blanks, not evidence.');return 0;
 }
 if(action==='apply'){
  if(params.length!==3)throw new TypeError('Apply takes input workbench, command and new output workbench');
  const [input,command,output]=params;
  if(privateFile(input)===privateFile(output)||privateFile(command)===privateFile(output))throw new TypeError('Output must be a new, distinct private file');
  const result=applyPrivateFoodEvidence(await readJSON(input),await readJSON(command,64*1024));
  const dest=privateFile(output);await mkdir(dirname(dest),{recursive:true});
  await writeFile(dest,JSON.stringify(result.record,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({result:'PASS',evidenceKind:result.changedKind,priorFingerprint:result.beforeFingerprint,
   nextFingerprint:result.afterFingerprint,remainingRecipeGaps:result.missing,publicCheckoutEnabled:false,
   launchStatus:'BLOCKED',sourceAttestationIsIndependentVerification:false},null,2));return 0;
 }
 throw new TypeError('Unknown private intake command');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 runFoodEvidenceCLI(process.argv.slice(2)).then(v=>{process.exitCode=v;}).catch(error=>{
  console.error(`FOOD-019–024Q FINAL STOP: ${error instanceof Error?error.message:'Unrecognized failure'}`);process.exitCode=1;
 });
}
