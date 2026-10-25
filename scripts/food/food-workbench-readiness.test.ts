import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {TABLE_CATALOG} from '../../src/lib/food/table-catalog';
import {initialRecipeOperations} from './operating-system';
import {collectOperationalReadiness} from './private-readiness-evidence.mjs';
const draft=()=>({recipe:initialRecipeOperations(),catalog:TABLE_CATALOG[0],batch:null,targetServings:null,
 ingredientInventory:[],window:null,deliveryPolicy:null,deliveryRequest:null,now:null,quantity:1});
test('readiness evidence ingestion understands private workbench but cannot grant launch',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'table-workbench-ingestion-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const path=join(dir,'private-workbench.json');await writeFile(path,JSON.stringify(draft()));
 const r=await collectOperationalReadiness({workbenchFile:path});
 assert.equal(r.publicCheckoutEnabled,false);assert.equal(r.status,'BLOCKED');
 assert.equal(r.foodWorkbench?.kind,'PRIVATE_FOOD_OPERATIONS_WORKBENCH');
 assert.ok(r.gates.some(g=>g.id==='workbench-0'&&g.status==='UNVERIFIED'));
 assert.ok(r.gates.some(g=>g.id==='owner-launch-authorization'&&g.status==='BLOCKED'));
});
test('invalid and fabricated evidence is blocked rather than promoted',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'table-workbench-invalid-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const path=join(dir,'private-workbench.json');await writeFile(path,JSON.stringify({...draft(),publicCheckoutEnabled:true}));
 const r=await collectOperationalReadiness({workbenchFile:path});
 assert.equal(r.foodWorkbench?.kind,'PRIVATE_WORKBENCH_INVALID');assert.equal(r.status,'BLOCKED');
 assert.ok(r.gates.some(g=>g.id==='workbench-0'&&g.status==='BLOCKED'));
});
