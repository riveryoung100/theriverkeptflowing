/** FOOD-019–024Q: private measured-food evidence intake; this is not food approval. */
import {validateRecipeOperations,inspectRecipeOperations,recipeFingerprint,purchaseCostProfile, type RecipeOperations,type PurchaseEvidence} from './food-operations';
import {inspectPrivateFoodWorkbench} from './food-operations-workbench';
import {strictObject} from '../../src/lib/food/table-catalog';
import {modelRef,freezeModel} from '../../src/lib/food/table-scheduling';

export type PrivateWorkbench = Parameters<typeof inspectPrivateFoodWorkbench>[0];
type EvidenceKind='ingredient-measurement'|'ingredient-source'|'measured-yield'|'verified-purchase'|'operating-expense';
type IntakeResult={kind:'PRIVATE_EVIDENCE_INTAKE_RESULT';record:Record<string,unknown>;beforeFingerprint:string;afterFingerprint:string;changedKind:EvidenceKind;missing:readonly string[];launchStatus:'BLOCKED';publicCheckoutEnabled:false;sourceAttestationIsIndependentVerification:false};
const integer=(n:unknown)=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=1;
const positive=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>0&&n<=Number.MAX_SAFE_INTEGER;
const nonnegative=(n:unknown)=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0;
function text(v:unknown){if(typeof v!=='string'||!v.trim()||v.trim()!==v||v.length>256)throw new TypeError('Canonical nonempty evidence reference required');return modelRef(v);}
function ingredientIndex(recipe:RecipeOperations,n:unknown){if(typeof n!=='number'||!Number.isSafeInteger(n)||n<0||!recipe.recipe.ingredients?.[n])throw new TypeError('Exact existing ingredient index required');return n;}
function exactCommand(input:unknown,fields:readonly string[]){return strictObject(input,['kind','recipeId','recipeVersion','expectedFingerprint',...fields]);}
function rejectReview(r:RecipeOperations){if(!['DRAFT','MEASURED'].includes(r.state)||r.review)throw new TypeError('Reviewed or approved recipes require a new authoritative recipe revision');}
function base(input:unknown){
 const workbench=strictObject(input,['recipe','catalog','batch','targetServings','ingredientInventory','window','deliveryPolicy','deliveryRequest','now','quantity']);
 // Validate the entire original workbench and catalog binding before allowing any mutation.
 inspectPrivateFoodWorkbench(input);
 const r=validateRecipeOperations(workbench.recipe);
 return {workbench,recipe:r};
}
/** Persist only via a new, private, write-once JSON file; never modify the source file. */
export function applyPrivateFoodEvidence(workbenchInput:unknown,commandInput:unknown):IntakeResult {
 const {workbench,recipe:r}=base(workbenchInput);
 if(!commandInput||typeof commandInput!=='object'||Array.isArray(commandInput))throw new TypeError('Explicit intake command required');
 const command=commandInput as Record<string,unknown>;
 const kind=command.kind as EvidenceKind;
 const fields:Record<EvidenceKind,string[]>={
  'ingredient-measurement':['ingredientIndex','grams','sourceReference'],
  'ingredient-source':['ingredientIndex','ingredientId','revision','preparationState','supplierReference','measurementReference','recalled','crossContact','crossContactReference'],
  'measured-yield':['yieldGrams','portionGrams','servings','method','captureSource','storage'],
  'verified-purchase':['ingredientIndex','purchase'],
  'operating-expense':['expense','minorUnits','sourceReference','knowledge'],
 };
 if(!Object.hasOwn(fields,kind))throw new TypeError('Unsupported private evidence kind');
 const c=exactCommand(commandInput,fields[kind]);
 const beforeFingerprint=recipeFingerprint(r);
 if(c.recipeId!==r.recipe.id||c.recipeVersion!==r.recipe.version||c.expectedFingerprint!==beforeFingerprint)throw new TypeError('Stale or mismatched recipe evidence command');
 rejectReview(r);
 const updated=structuredClone(r) as RecipeOperations;
 if(kind==='ingredient-measurement'){
  const i=ingredientIndex(r,c.ingredientIndex);
  if(!positive(c.grams))throw new TypeError('Actual measured grams required');
  if(r.formulation!==null)throw new TypeError('Cannot modify measured formulation in place; create recipe revision');
  if(r.measurements.some(m=>m.ingredientIndex===i))throw new TypeError('Recorded ingredient measurement cannot be overwritten');
  updated.measurements=[...r.measurements,{ingredientIndex:i,grams:c.grams as number,quantity:c.grams as number,unit:'g',sourceReference:text(c.sourceReference)}];
 }
 if(kind==='ingredient-source'){
  const i=ingredientIndex(r,c.ingredientIndex);
  if(r.ingredientSources.some(s=>s.ingredientIndex===i))throw new TypeError('Existing source cannot be overwritten without recipe revision');
  if(!integer(c.revision)||typeof c.recalled!=='boolean')throw new TypeError('Actual source revision and explicit recall review required');
  if(!['UNKNOWN','REVIEWED'].includes(String(c.crossContact)))throw new TypeError('Explicit cross-contact status required');
  if(c.crossContact==='UNKNOWN'&&c.crossContactReference!==null)throw new TypeError('Unreviewed cross contact cannot claim reviewed evidence');
  if(c.crossContact==='REVIEWED'&&c.crossContactReference===null)throw new TypeError('Cross-contact review reference required');
  const m=r.measurements.find(m=>m.ingredientIndex===i);
  if(!m||m.sourceReference!==c.measurementReference)throw new TypeError('Supplier/source must bind to an existing exact measured ingredient reference');
  updated.ingredientSources=[...r.ingredientSources,{ingredientIndex:i,ingredientId:text(c.ingredientId),revision:c.revision as number,
   preparationState:text(c.preparationState),supplierReference:text(c.supplierReference),measurementReference:text(c.measurementReference),
   recalled:c.recalled,crossContact:c.crossContact as 'UNKNOWN'|'REVIEWED',crossContactReference:c.crossContactReference===null?null:text(c.crossContactReference)}];
 }
 if(kind==='measured-yield'){
  if(r.formulation!==null||!r.recipe.ingredients?.length)throw new TypeError('Yield already measured or ingredient source missing');
  if(!positive(c.yieldGrams)||!positive(c.portionGrams)||!integer(c.servings))throw new TypeError('Real measured yield, portion and serving count required');
  if((c.servings as number)*(c.portionGrams as number)>(c.yieldGrams as number)||Math.floor((c.yieldGrams as number)/(c.portionGrams as number))!==c.servings)throw new TypeError('Servings must match measured whole-portion yield');
  if(!Array.isArray(c.method)||!c.method.length||c.method.length>128||c.method.some(v=>typeof v!=='string'||!v.trim()||v.trim()!==v||v.length>2000))throw new TypeError('Actual owner-recorded preparation method required');
  if(!['ambient','refrigerated','frozen'].includes(String(c.storage)))throw new TypeError('Explicit recorded storage classification required');
  if(typeof c.captureSource!=='string'||!/^food-prototype-capture:[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/.test(c.captureSource))throw new TypeError('Exact prototype capture ID required for measured yield');
  if(r.measurements.length!==r.recipe.ingredients.length||r.measurements.some(m=>!positive(m.grams)))throw new TypeError('All ingredient masses must be measured before recording yield');
  updated.formulation={id:r.recipe.id,version:r.recipe.version,
   composition:[...r.measurements].sort((a,b)=>a.ingredientIndex-b.ingredientIndex).map(m=>({kind:'ingredient' as const,ingredientIndex:m.ingredientIndex,grams:m.grams!})),
   yieldGrams:c.yieldGrams as number,method:c.method as string[],captureSources:[c.captureSource as never]};
  updated.portionGrams=c.portionGrams as number;
  updated.servings=c.servings as number;
  updated.storage=c.storage as 'ambient'|'refrigerated'|'frozen';
  updated.state='MEASURED';
 }
 if(kind==='verified-purchase'){
  const i=ingredientIndex(r,c.ingredientIndex);
  const source=r.ingredientSources.find(s=>s.ingredientIndex===i);
  if(!r.formulation||!source?.supplierReference)throw new TypeError('Measured formulation and exact supplier record required before costing');
  if(r.ingredientCosts.some(p=>p.ingredient.kind==='recipe'&&p.ingredient.ingredientIndex===i))throw new TypeError('Recorded purchase cannot silently reprice a recipe; use new recipe revision');
  const p=c.purchase as PurchaseEvidence;
  if(!p||p.verification!=='VERIFIED'||p.supplierReference!==source.supplierReference)throw new TypeError('Exact supplier-matched, owner-verified purchase record required');
  const ref={kind:'recipe' as const,id:r.recipe.id,version:r.recipe.version,ingredientIndex:i};
  const cost=purchaseCostProfile(p,ref,r.recipe);
  if(cost.state!=='KNOWN'||!cost.profile)throw new TypeError('Complete receipt, tax/fee and usable-mass values required');
  updated.ingredientCosts=[...r.ingredientCosts,cost.profile];
 }
 if(kind==='operating-expense'){
  const expense=String(c.expense) as keyof RecipeOperations['expenses'];
  if(!['packaging','delivery','labor','processing','other','fixed'].includes(expense))throw new TypeError('Known operating expense class required');
  if(r.expenses[expense].state!=='UNKNOWN')throw new TypeError('Existing expense must not be overwritten; use a new revision');
  if(!nonnegative(c.minorUnits)||!['KNOWN','ESTIMATED'].includes(String(c.knowledge)))throw new TypeError('Explicit nonnegative USD cents and knowledge status required');
  updated.expenses={...r.expenses,[expense]:{state:c.knowledge as 'KNOWN'|'ESTIMATED',minorUnits:c.minorUnits as number,sourceReference:text(c.sourceReference)}};
 }
 const checked=validateRecipeOperations(updated);
 const result=inspectRecipeOperations(checked);
 return freezeModel({kind:'PRIVATE_EVIDENCE_INTAKE_RESULT',record:{...structuredClone(workbench),recipe:structuredClone(checked)},
  beforeFingerprint,afterFingerprint:recipeFingerprint(checked),changedKind:kind,missing:result.missing,
  launchStatus:'BLOCKED',publicCheckoutEnabled:false,sourceAttestationIsIndependentVerification:false});
}

export function draftIntakeCommand(workbenchInput:unknown,kind:EvidenceKind,ingredient=0){
 const {recipe:r}=base(workbenchInput);
 const source={kind,recipeId:r.recipe.id,recipeVersion:r.recipe.version,expectedFingerprint:recipeFingerprint(r)};
 if(kind==='ingredient-measurement')return {...source,ingredientIndex:ingredient,grams:null,sourceReference:''};
 if(kind==='ingredient-source')return {...source,ingredientIndex:ingredient,ingredientId:'',revision:null,preparationState:'',supplierReference:'',measurementReference:'',recalled:null,crossContact:'UNKNOWN',crossContactReference:null};
 if(kind==='measured-yield')return {...source,yieldGrams:null,portionGrams:null,servings:null,method:[],captureSource:'',storage:'unknown'};
 if(kind==='verified-purchase')return {...source,ingredientIndex:ingredient,purchase:{id:'',revision:null,supplierReference:'',purchasedOn:'',receiptReference:'',quantity:null,unit:'g',packs:1,usableGrams:null,totalMinor:null,taxAndFeesMinor:null,currency:'USD',verification:'RECORDED'}};
 if(kind==='operating-expense')return {...source,expense:'packaging',minorUnits:null,sourceReference:'',knowledge:'ESTIMATED'};
 throw new TypeError('Unsupported evidence command');
}
