/** One private CLI for measured inputs; no network, checkout or customer data. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {TABLE_CATALOG,strictObject} from '../../src/lib/food/table-catalog';
import {inspectRecipeOperations,validateRecipeOperations,privateMealPlan,draftOperationalLabel,sourceBackedEligibility,purchaseCostProfile,type RecipeOperations} from './food-operations';
import {planProduction,openFoodOperations,productionReadiness,inspectOperationalFulfillment} from './food-production-operations';
import {LocalMiniflareD1} from './local-miniflare-d1';
const unknown=()=>({state:'UNKNOWN' as const,minorUnits:null,sourceReference:null});
export function initialRecipeOperations():RecipeOperations {
 const recipe=TABLE_CATALOG[0].recipe;
 return {schemaVersion:1,recipe,formulation:null,components:[],portionGrams:null,servings:null,variationGrams:null,storage:'unknown',measurements:[],ingredientSources:[],
  ingredientCosts:[],componentCosts:[],nutrientProfiles:[],componentNutrition:[],nutritionConfidence:'UNKNOWN',state:'DRAFT',review:null,
  expenses:{packaging:unknown(),delivery:unknown(),labor:unknown(),processing:unknown(),other:unknown(),fixed:unknown()},candidatePrice:null};
}
export function operatingReport(input:unknown) {
 const info=inspectRecipeOperations(input),entry=TABLE_CATALOG.find(e=>e.recipe.id===info.recipe.recipe.id&&e.recipe.version===info.recipe.recipe.version);
 const eligibility=entry?sourceBackedEligibility(input,entry):null;
 const label=entry?draftOperationalLabel(input,entry):null;
 const priorities=[...info.missing,...(info.portionCost?.cost.state!=='known'?['record receipt-backed ingredient costs']:[]),
  ...info.finance.unknownExpenses.map(k=>`record ${k} expense evidence`),...(eligibility?.missing??['bind current menu offering']),
  ...(label?.missing??[]),'independent legal/food-safety approvals','explicit owner launch authorization'];
 return {scope:'PRIVATE_SOURCE_RECORDS_NOT_COMMERCIAL_CERTIFICATION',product:entry?.product.id??null,
  inputStatus:info.measured?'MEASURED_RECORDS':'NO VERIFIED PRODUCT INPUTS',recipe:info,eligibility,label,
  priorities:[...new Set(priorities)],traditionalMenu:{recipeFingerprint:info.fingerprint,healthInformationRequired:false},
  optionalNutrition:{recipeFingerprint:info.fingerprint,nutritionConfidence:info.recipe.nutritionConfidence},
  actualInventoryUnits:null,actualRevenueMinor:null,publicCheckoutEnabled:false,ownerLaunchAuthorization:'NOT GRANTED'};
}
export async function main(args:string[]) {
 if(args[0]==='first-batch'){
  const {runFirstBatchCLI}=await import('./food-first-batch-cli');return runFirstBatchCLI(args.slice(1));
 }
 const {workflowCommands,runCommercialWorkflow}=await import('./food-commercial-workflow');
 if(workflowCommands.includes(args[0]))return runCommercialWorkflow(args[0],args.slice(1));
 if(!args[0]||args[0]==='--help')console.log('Private completion commands: '+workflowCommands.join(' | ')+'. See scripts/food/README.md for actual-input flags.');
 if(['business-checklist','weekly-profit','weekly-template','product-review','kitchen-checklist','demand-capacity','packaging-comparison','demand-template','packaging-template'].includes(args[0])){
  const {runCommercialCommand}=await import('./food-commercial-command');return runCommercialCommand(args[0],args.slice(1));
 }
 const [command,file,extra]=args;
 if(!command||command==='--help'){console.log('Private food operations: init <new.json> | inspect <recipe.json> | plan <recipe.json> <servings> | nutrition <recipe.json> <grams> | label <recipe.json> | purchase <source-context.json> | batch <recipe-batch.json> | fulfillment <request.json> | save <recipe.json> <command-key> | save-batch <batch.json> <command-key> | history | init-workbench <new.json> | workbench <workbench.json>');console.log('Private planning: business-checklist | product-review | kitchen-checklist | weekly-template <workbench.json>; weekly-profit <workbench.json> <weekly-model.json> [--goal dollars]; demand-capacity <demand.json>; packaging-comparison <candidates.json>. Add --json for machine output. All planning input paths must be under .river-dev/state.');return 0;}
 if(command==='init-workbench'){
  if(!file||extra)throw new TypeError('One new private workbench file required');
  await mkdir(dirname(resolve(file)),{recursive:true});
  await writeFile(file,JSON.stringify({recipe:initialRecipeOperations(),catalog:TABLE_CATALOG[0],batch:null,targetServings:null,
   ingredientInventory:[],window:null,deliveryPolicy:null,deliveryRequest:null,now:null,quantity:1},null,2),{flag:'wx'});return 0;
 }
 if(command==='init'){if(!file||extra)throw new TypeError('One new input file required');await writeFile(file,JSON.stringify(initialRecipeOperations(),null,2),{flag:'wx'});return 0;}
 const serialize=(v:unknown)=>console.log(JSON.stringify(v,null,2));
 if(['history','save','save-batch'].includes(command)) {
  const db=await LocalMiniflareD1.openPrivateOperations();try{const store=await openFoodOperations(db);
   if(command==='history')serialize({scope:'LOCAL_TEST_DURABILITY',records:await store.list(),publicCheckoutEnabled:false});
   else {if(!file||!extra)throw new TypeError('Input file and stable command key required');serialize(await store.append(extra,command==='save'?'recipe':'batch',JSON.parse(await readFile(file,'utf8')),await store.head()));}
  }finally{await db.close();}return 0;
 }
 if(!file)throw new TypeError('Private source file required');const input=JSON.parse(await readFile(file,'utf8'));
 if(command==='workbench'){
  const {inspectPrivateFoodWorkbench}=await import('./food-operations-workbench');serialize(inspectPrivateFoodWorkbench(input));return 0;
 }
 if(command==='purchase'){strictObject(input,['purchase','ingredient','context']);serialize(purchaseCostProfile(input.purchase,input.ingredient,input.context));return 0;}
 if(command==='batch'){strictObject(input,['batch','recipe']);serialize(productionReadiness(input.batch,input.recipe));return 0;}
 if(command==='fulfillment'){strictObject(input,['window','policy','request','now','quantity']);serialize(inspectOperationalFulfillment(input.window,input.policy,input.request,input.now,input.quantity));return 0;}
 validateRecipeOperations(input);
 if(command==='inspect')serialize(operatingReport(input));
 else if(command==='plan')serialize(planProduction(input,Number(extra),[]));
 else if(command==='nutrition')serialize(privateMealPlan(input,[{grams:Number(extra),count:1}]));
 else if(command==='label'){const r=operatingReport(input);serialize(r.label??{state:'AWAITING_REVIEW',missing:['Exact menu source binding']});}
 else throw new TypeError('Unknown command; use --help');return 0;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main(process.argv.slice(2)).then(code=>{process.exitCode=code;}).catch(error=>{console.error('Private food operation rejected: '+(error instanceof Error?error.message:'validate exact input sources and command'));process.exitCode=1;});
