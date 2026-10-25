import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TABLE_MENU_DEPARTMENTS,TABLE_FIRST_DEPARTMENT,currentTableDepartment,SOUTHWEST_PRELAUNCH_DESIGN} from './table-menu-plan';
import {TABLE_CATALOG,TABLE_PRODUCTS} from './table-catalog';
test('six immutable planning departments grant no product, price or SKU authority',()=>{
 assert.deepEqual(TABLE_MENU_DEPARTMENTS.map(d=>d.id),['hot-food-bowls','cold-bowls','hot-soups','signature-gnocchi','juice-water','freezer-packs']);
 assert.equal(new Set(TABLE_MENU_DEPARTMENTS.map(d=>d.id)).size,6);
 assert.ok(TABLE_MENU_DEPARTMENTS.every(d=>Object.isFrozen(d)&&Object.isFrozen(d.concepts)));
 assert.equal(TABLE_MENU_DEPARTMENTS.filter(d=>d.stage==='ACTIVE_EXPERIMENT').length,1);
 assert.equal(TABLE_PRODUCTS.length,1);assert.equal(TABLE_CATALOG[0].sku,null);assert.equal(TABLE_CATALOG[0].approvedPrice,null);
});
test('only existing Southwest concept maps to the active public department',()=>{
 assert.equal(currentTableDepartment('southwest-harvest-bowl'),TABLE_FIRST_DEPARTMENT);
 for(const slug of ['gnocchi','acai-bowl','bulk-gnocchi','../checkout'])assert.equal(currentTableDepartment(slug),null);
});
test('soup and bulk gnocchi remain in their distinct future planning departments',()=>{
 const soup=TABLE_MENU_DEPARTMENTS.find(d=>d.id==='hot-soups')!,bulk=TABLE_MENU_DEPARTMENTS.find(d=>d.id==='freezer-packs')!;
 assert.match(soup.concepts.join(' '),/Mi-Mi.*Chickenless Gnocchi Soup/);assert.match(bulk.concepts.join(' '),/Bulk frozen signature gnocchi/);
 assert.ok(!TABLE_MENU_DEPARTMENTS.find(d=>d.id==='signature-gnocchi')!.concepts.some(c=>/Soup/.test(c)));
 assert.doesNotMatch(JSON.stringify(TABLE_MENU_DEPARTMENTS),/tortellini|ravioli/i);
});
test('public owner-intent copy does not rewrite immutable canonical recipe history',()=>{
 assert.match(SOUTHWEST_PRELAUNCH_DESIGN.description,/sauce.*inside/);
 assert.match(SOUTHWEST_PRELAUNCH_DESIGN.finishingComponents[1].description,/removed before microwave/);
 assert.match(SOUTHWEST_PRELAUNCH_DESIGN.pending,/Feta is excluded/);assert.match(SOUTHWEST_PRELAUNCH_DESIGN.pending,/not a final approved recipe/);
 assert.ok(TABLE_CATALOG[0].recipe.ingredients!.some(i=>/Mushrooms and greens/.test(i.name)));
 assert.equal(TABLE_CATALOG[0].recipe.version,1);assert.equal(TABLE_CATALOG[0].recipe.evidence.length,0);
});
