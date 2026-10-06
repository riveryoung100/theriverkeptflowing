import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { D1FoodMenuRepository } from "./d1-menu-persistence";
import { foodDraftIdentityOrderKey, type FoodD1Database, type FoodD1Statement, type FoodD1Result } from "./d1-draft-persistence";
import { InMemoryFoodDraftRepository } from "./draft-persistence";
import { serializeFoodDishPresentation, type FoodMenuReadDependencies } from "./menu-persistence";
import { createFoodDishId } from "./dish-offer-domain";
import { createFoodProductId, createFoodRecipeId } from "./draft-domain";
const storage = { ok:false,error:{code:"storage",message:"Food menu repository storage is unavailable."} };
const invalid = { ok:false,error:{code:"invalid-input",message:"Food menu repository input could not be validated."} };
const result = (results: readonly unknown[], changes=0): FoodD1Result => ({success:true,results,meta:{changes}});
async function fixture() {
    const drafts=new InMemoryFoodDraftRepository(); const recipe={id:createFoodRecipeId("meal"),version:1,evidence:[]}; const product={id:createFoodProductId("meal"),version:1,recipe:{id:recipe.id,version:1},evidence:[]}; await drafts.createInitialRecipe(recipe); await drafts.createInitialProduct(product);
    const presentation={dishId:createFoodDishId("meal"),version:1,product:{id:product.id,version:1},recipe:{id:recipe.id,version:1},name:"Meal"}; const serialized=serializeFoodDishPresentation(presentation,product,recipe); if (!serialized.ok) throw new Error();
    const row={dish_id:presentation.dishId,version:1,identity_order_key:foodDraftIdentityOrderKey(presentation.dishId),serialization_format_version:1,payload_json:serialized.value,product_id:product.id,product_version:1,recipe_id:recipe.id,recipe_version:1};
    const queries: {sql:string;values:(string|number|null)[]}[]=[]; let batch: unknown=[result([row],1),result([row])]; let read: unknown=result([]); let rejected: unknown;
    const database: FoodD1Database={prepare(sql) { let values:(string|number|null)[]=[]; const statement:FoodD1Statement={bind(...args){values=args;return statement;},async all(){queries.push({sql,values});if(rejected)throw rejected;return read as FoodD1Result;}}; return statement; },async batch(statements){if(rejected)throw rejected; for(const statement of statements) void statement; return batch as readonly FoodD1Result[];} };
    let dependencyCalls=0; const deps:FoodMenuReadDependencies={async getProduct(...args){dependencyCalls++;return drafts.getProduct(...args);},async getRecipe(...args){dependencyCalls++;return drafts.getRecipe(...args);}};
    return {database,deps,row,presentation,queries,count:()=>dependencyCalls,setBatch(v:unknown){batch=v;},setRead(v:unknown){read=v;},reject(v:unknown){rejected=v;}};
}
test("construction structurally validates injected dependencies with zero calls",async()=>{
    const f=await fixture();new D1FoodMenuRepository(f.database,f.deps);assert.equal(f.queries.length,0);assert.equal(f.count(),0);
    for(const db of [undefined,null,[],{}, {...f.database,prepare:1},{...f.database,batch:null},{get prepare(){throw new Error("secret");}}]) assert.throws(()=>new D1FoodMenuRepository(db as unknown as FoodD1Database,f.deps),{name:"TypeError",message:"Food menu repository dependencies are unavailable."});
    for(const deps of [undefined,null,[],{}, {...f.deps,getRecipe:1},{get getProduct(){throw new Error("secret");}}]) assert.throws(()=>new D1FoodMenuRepository(f.database,deps as unknown as FoodMenuReadDependencies),{name:"TypeError",message:"Food menu repository dependencies are unavailable."});
});
test("RETURNING witness and exact inspection preserve created, retry, conflict and invalid sequencing",async()=>{
    const f=await fixture();const repo=new D1FoodMenuRepository(f.database,f.deps); const r=await repo.createInitialPresentation(f.presentation);assert.ok(r.ok && r.value.outcome==="created");
    f.setBatch([result([]),result([f.row])]);assert.ok((await repo.createInitialPresentation(f.presentation)).ok); const retry=await repo.createInitialPresentation(f.presentation);assert.ok(retry.ok&&retry.value.outcome==="already-present");
    const conflict=await repo.createInitialPresentation({...f.presentation,name:"Different"});assert.deepEqual(conflict,{ok:true,value:{outcome:"conflict",reason:"different-content"}});
    f.setBatch([result([]),result([])]);assert.deepEqual(await repo.createInitialPresentation(f.presentation),invalid);
});
test("uncertain metadata and malformed witnesses never invent created",async()=>{
    const f=await fixture();const repo=new D1FoodMenuRepository(f.database,f.deps);
    for(const response of [null,[],[result([])], [{success:true,results:[f.row]},result([f.row])],[result([f.row],0),result([f.row])],[result([],1),result([f.row])],[result([f.row],2),result([f.row])],[result([f.row],1),result([])],[result([f.row,f.row],1),result([f.row])],[result([f.row],1),result([f.row],1)],[{success:false,results:[],meta:{changes:0}},result([])],[result([f.row],1),result([{...f.row,identity_order_key:"bad"}])]]) {f.setBatch(response);assert.deepEqual(await repo.createInitialPresentation(f.presentation),storage);}
    f.reject(new TypeError("private SQL transport evidence"));assert.deepEqual(await repo.createInitialPresentation(f.presentation),storage);
});
test("corrupt row families, missing dependencies and read transport fail closed",async()=>{
    const f=await fixture();const repo=new D1FoodMenuRepository(f.database,f.deps);
    for(const row of [{...f.row,payload_json:"{"},{...f.row,identity_order_key:"bad"},{...f.row,product_version:2},{...f.row,recipe_version:2},{...f.row,serialization_format_version:2},{...f.row,payload_json:JSON.stringify(JSON.parse(f.row.payload_json),null,2)}]) {f.setRead(result([row]));assert.deepEqual(await repo.getPresentation(f.presentation.dishId,1),storage);}
    f.setRead(result([f.row]));const missing=new D1FoodMenuRepository(f.database,{getProduct:async()=>({outcome:"not-found"}),getRecipe:f.deps.getRecipe});assert.deepEqual(await missing.getPresentation(f.presentation.dishId,1),storage);
    f.setRead({success:true,results:null});assert.deepEqual(await repo.getPresentation(f.presentation.dishId,1),storage);f.reject(new Error("secret"));assert.deepEqual(await repo.listLatestPresentations(),storage);
});
test("invalid limits fail without coercion or database I/O",async()=>{
    const f=await fixture();const repo=new D1FoodMenuRepository(f.database,f.deps);
    for(const limit of [0,-1,1.5,101,"20",null,NaN,Infinity]) assert.deepEqual(await repo.listLatestPresentations({limit} as never),invalid);assert.equal(f.queries.length,0);
});
test("SQL binds exact canonical content and isolates sources",async()=>{
    const f=await fixture();const captured:{sql:string;values:unknown[]}[]=[];
    const database:FoodD1Database={prepare(sql){let args:unknown[]=[];const s={bind(...v:unknown[]){args=v;return s;},async all(){return result([]);},capture(){return{sql,values:args};}};return s;},async batch(statements){captured.push(...statements.map(s=>(s as FoodD1Statement&{capture():{sql:string;values:unknown[]}}).capture()));return[result([f.row],1),result([f.row])];}};
    const repo=new D1FoodMenuRepository(database,f.deps);const source={...f.presentation};const promise=repo.createInitialPresentation(source);source.name="Mutated after invocation";const r=await promise;assert.ok(r.ok&&r.value.outcome==="created"); assert.equal(captured.length,2); assert.ok(captured[0].sql.includes("RETURNING *"));assert.ok(captured[0].sql.includes("MAX(version)"));assert.ok(captured[0].values.includes(f.row.payload_json));assert.ok(!captured[0].values.includes(source));
    const text=readFileSync(new URL("./d1-menu-persistence.ts",import.meta.url),"utf8");for(const banned of ["cloudflare:workers","wrangler","process.env","getD1Database","INSERT OR REPLACE","SingleAdminFood","Date.now","Math.random"])assert.equal(text.includes(banned),false,banned);
});

test("malformed list rows are storage failures, never validation errors or empty success",async()=>{
    const f=await fixture();const repo=new D1FoodMenuRepository(f.database,f.deps);
    for(const row of [null,[],{}, {dish_id:"bad",version:1}, {...f.row,version:0}, {...f.row,identity_order_key:"wrong"}]){f.setRead(result([row]));assert.deepEqual(await repo.listLatestPresentations(),storage);assert.deepEqual(await repo.listPresentationVersions(f.presentation.dishId),storage);}
});
