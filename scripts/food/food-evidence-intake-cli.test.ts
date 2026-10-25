import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {TABLE_CATALOG} from '../../src/lib/food/table-catalog';
import {initialRecipeOperations} from './operating-system';
import {runFoodEvidenceCLI} from './food-evidence-intake-cli';

const draft=()=>({recipe:initialRecipeOperations(),catalog:TABLE_CATALOG[0],batch:null,targetServings:null,ingredientInventory:[],window:null,deliveryPolicy:null,deliveryRequest:null,now:null,quantity:1});
test('private CLI produces write-once templates and new versions, never modifies the original',async t=>{
 const previous=process.cwd(),root=await mkdtemp(join(tmpdir(),'food-intake-'));process.chdir(root);
 t.after(async()=>{process.chdir(previous);await rm(root,{recursive:true,force:true});});
 const directory=join(root,'.river-dev','state');await mkdir(directory,{recursive:true});
 const input='.river-dev/state/draft.json',template='.river-dev/state/template.json',next='.river-dev/state/next.json';
 await writeFile(input,JSON.stringify(draft()));
 assert.equal(await runFoodEvidenceCLI(['template',input,'ingredient-measurement',template,'0']),0);
 const command=JSON.parse(await readFile(template,'utf8'));
 assert.equal(command.grams,null);
 assert.equal(command.expectedFingerprint.length,64);
 await writeFile(template,JSON.stringify({...command,grams:150,sourceReference:'synthetic-scale'}));
 assert.equal(await runFoodEvidenceCLI(['apply',input,template,next]),0);
 const updated=JSON.parse(await readFile(next,'utf8'));
 assert.equal(updated.recipe.measurements[0].grams,150);
 assert.equal(JSON.parse(await readFile(input,'utf8')).recipe.measurements.length,0);
 await assert.rejects(runFoodEvidenceCLI(['apply',input,template,next]),/EEXIST/);
 await assert.rejects(runFoodEvidenceCLI(['template',input,'ingredient-measurement','public/unsafe.json','0']),/\.river-dev\/state/);
});
