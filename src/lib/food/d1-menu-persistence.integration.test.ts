import { D1FoodMenuRepository } from "./d1-menu-persistence";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { foodDraftIdentityOrderKey, type FoodD1Database, type FoodD1Statement, type FoodD1Result } from "./d1-draft-persistence";
import { InMemoryFoodDraftRepository } from "./draft-persistence";
import { InMemoryFoodMenuRepository, serializeFoodDishPresentation, serializeFoodServingOffer, serializeFoodMenuPublication, type FoodMenuRepositoryResult, type FoodMenuReadOutcome, type FoodMenuAppendOutcome, type FoodMenuRepository } from "./menu-persistence";
import { createFoodProductId, createFoodRecipeId } from "./draft-domain";
import { createFoodDishId, createFoodServingOfferId, type FoodDishPresentation, type FoodServingOffer } from "./dish-offer-domain";
import { createFoodMenuPublicationId, type FoodMenuPublication } from "./menu-publication-domain";
type Query = { sql: string; values: (string | number | null)[] };
class Bridge implements FoodD1Database {
    readonly queries: Query[][] = [];
    constructor(private readonly mf: Miniflare) {}
    async execute(queries: Query[]): Promise<readonly FoodD1Result[]> {
        this.queries.push(queries);
        const response = await this.mf.dispatchFetch("http://food.test/", { method: "POST", body: JSON.stringify(queries) });
        const value = await response.json(); if (!response.ok) throw new Error((value as { error: string }).error); return value as FoodD1Result[];
    }
    prepare(sql: string): FoodD1Statement {
        let values: (string | number | null)[] = [];
        const statement = { bind: (...next: (string | number | null)[]) => { values = next; return statement; }, all: async () => (await this.execute([{ sql, values }]))[0], query: () => ({ sql, values }) }; return statement;
    }
    batch(statements: FoodD1Statement[]): Promise<readonly FoodD1Result[]> { return this.execute(statements.map(s => (s as FoodD1Statement & { query(): Query }).query())); }
}
function value<T>(r: FoodMenuRepositoryResult<T>): T { assert.ok(r.ok, JSON.stringify(r)); if (!r.ok) throw new Error(); return r.value; }
function snapshot<T>(r: FoodMenuReadOutcome<T> | FoodMenuAppendOutcome<T>): NonNullable<T> { if (!("snapshot" in r) || r.snapshot === undefined || r.snapshot === null) throw new Error(); return r.snapshot as NonNullable<T>; }
async function fixture(name = "rice") {
    const drafts = new InMemoryFoodDraftRepository(); const recipe = { id: createFoodRecipeId(name), version: 1, evidence: [] }; const product = { id: createFoodProductId(name), version: 1, recipe: { id: recipe.id, version: 1 }, evidence: [] }; await drafts.createInitialRecipe(recipe); await drafts.createInitialProduct(product);
    const presentation: FoodDishPresentation = { dishId: createFoodDishId(name), version: 1, product: { id: product.id, version: 1 }, recipe: { id: recipe.id, version: 1 }, name };
    const offer: FoodServingOffer = { offerId: createFoodServingOfferId(name), version: 1, presentation: { dishId: presentation.dishId, version: 1 }, format: { kind: "family" }, servingEstimate: { state: "unknown" } };
    const publication: FoodMenuPublication = { publicationId: createFoodMenuPublicationId(name), version: 1, state: "published", title: "Menu", sections: [{ key: "one", title: "One", entries: [{ presentation: offer.presentation, selection: { shortDescription: false, longDescription: false, mediaReferences: [] }, offers: [{ offer: { offerId: offer.offerId, version: 1 }, intent: "informational", selection: { packagingDescription: false, storageSummary: false, reheatingSummary: false, availability: true } }] }] }] };
    return { drafts, recipe, product, presentation, offer, publication };
}
async function harness(run: (db: Bridge, mf: Miniflare) => Promise<void>) {
    const mf = new Miniflare(convertV4MiniflareOptions({ modules: true, compatibilityDate: "2026-07-24", cf: false, d1Persist: false, d1Databases: { FOOD_TEST: "food-002g-isolated-test" }, script: `export default { async fetch(request,env) { try { const q=await request.json(); return Response.json(await env.FOOD_TEST.batch(q.map(x=>env.FOOD_TEST.prepare(x.sql).bind(...x.values)))); } catch(e) { return Response.json({error:e.message},{status:400}); } } }` }));
    try {
        const db = new Bridge(mf); const migration = await readFile(new URL("../../../migrations/food/0002_food_menu_snapshots.sql", import.meta.url), "utf8");
        const statements: string[] = []; let current = ""; let trigger = false;
        for (const line of migration.split(/\r?\n/)) { if (!current && (!line.trim() || line.trim().startsWith("--"))) continue; if (line.startsWith("CREATE TRIGGER")) trigger = true; current += line + "\n"; if ((trigger ? /END;\s*$/.test(line) : /;\s*$/.test(line))) { statements.push(current.trim()); current = ""; trigger = false; } }
        assert.equal(current.trim(), ""); await db.execute(statements.map(sql => ({ sql, values: [] }))); await run(db, mf);
    } finally { await mf.dispose(); }
}
async function sql(db: Bridge, statement: string, values: Query["values"] = []) { return db.execute([{ sql: statement, values }]); }
async function rawSeed(db: Bridge) {
    const f = await fixture();
    await sql(db, "INSERT INTO food_dish_presentation_snapshots VALUES (?,?,?,?,?,?,?,?,?)", [f.presentation.dishId, 1, foodDraftIdentityOrderKey(f.presentation.dishId), 1, value(serializeFoodDishPresentation(f.presentation, f.product, f.recipe)), f.product.id, 1, f.recipe.id, 1]);
    await sql(db, "INSERT INTO food_serving_offer_snapshots VALUES (?,?,?,?,?,?,?)", [f.offer.offerId, 1, foodDraftIdentityOrderKey(f.offer.offerId), 1, value(serializeFoodServingOffer(f.offer, f.presentation, f.product, f.recipe)), f.presentation.dishId, 1]); return f;
}
test("verification gates: real JSON membership, RETURNING witness, metadata and atomic rollback", async () => harness(async db => {
    const f = await rawSeed(db); const payload = value(serializeFoodMenuPublication(f.publication, [{ presentation: f.presentation, product: f.product, recipe: f.recipe }], [f.offer]));
    const insert = "INSERT INTO food_menu_publication_snapshots VALUES (?,?,?,?,?) ON CONFLICT(publication_id,version) DO NOTHING RETURNING publication_id,version,payload_json";
    const args = [f.publication.publicationId, 1, foodDraftIdentityOrderKey(f.publication.publicationId), 1, payload];
    const created = await db.execute([{ sql: insert, values: args }, { sql: "SELECT publication_id,version,payload_json FROM food_menu_publication_snapshots WHERE publication_id=? AND version=1", values: [f.publication.publicationId] }]);
    assert.deepEqual(created[0].results, created[1].results); assert.equal(created[0].results.length, 1); assert.equal(created[0].meta?.changes, 3);
    assert.equal((await sql(db, "SELECT * FROM food_menu_publication_presentation_memberships"))[0].results.length, 1); assert.equal((await sql(db, "SELECT * FROM food_menu_publication_offer_memberships"))[0].results.length, 1);
    const retry = await db.execute([{ sql: insert, values: args }, { sql: "SELECT publication_id FROM food_menu_publication_snapshots WHERE publication_id=?", values: [f.publication.publicationId] }]); assert.deepEqual(retry[0].results, []); assert.equal(retry[0].meta?.changes, 0); assert.equal(retry[1].results.length, 1);
    const invalidPayload = JSON.parse(payload); invalidPayload.snapshot.sections[0].entries[0].offers[0].offer.offerId = "food-serving-offer:missing";
    await assert.rejects(sql(db, insert, ["food-menu-publication:rollback", 1, "key", 1, JSON.stringify(invalidPayload)]), /FOREIGN KEY/);
    for (const table of ["food_menu_publication_snapshots", "food_menu_publication_presentation_memberships", "food_menu_publication_offer_memberships"]) assert.deepEqual((await sql(db, `SELECT * FROM ${table} WHERE publication_id=?`, ["food-menu-publication:rollback"]))[0].results, []);
}));

test("all 23 methods match reference adapter, exact histories, retries and availability streams", async () => harness(async (db, mf) => {
    const f = await fixture(); const a = new D1FoodMenuRepository(db,f.drafts); const b = new D1FoodMenuRepository(new Bridge(mf),f.drafts); const memory = new InMemoryFoodMenuRepository(f.drafts);
    const run = async (method: keyof FoodMenuRepository, args: unknown[]) => {
        const expected = await (memory[method] as (...args: unknown[])=>Promise<unknown>)(...args); const actual = await (a[method] as (...args: unknown[])=>Promise<unknown>)(...args); assert.deepEqual(actual,expected,method); return actual;
    };
    const observation = { offer: { offerId:f.offer.offerId,version:1 }, revision:1, state:"available" } as const;
    const families = [
        {kind:"Presentation",plural:"Presentations",id:f.presentation.dishId,base:f.presentation,changed:{...f.presentation,name:"Changed"}},
        {kind:"Offer",plural:"Offers",id:f.offer.offerId,base:f.offer,changed:{...f.offer,format:{kind:"individual"}}},
        {kind:"Publication",plural:"Publications",id:f.publication.publicationId,base:f.publication,changed:{...f.publication,title:"Changed"}}
    ];
    for (const entry of families) {
        await run(`createInitial${entry.kind}` as keyof FoodMenuRepository,[entry.base]); await run(`createInitial${entry.kind}` as keyof FoodMenuRepository,[entry.base]); await run(`createInitial${entry.kind}` as keyof FoodMenuRepository,[entry.changed]);
        await run(`append${entry.kind}Revision` as keyof FoodMenuRepository,[{...entry.base,version:2},1]); await run(`append${entry.kind}Revision` as keyof FoodMenuRepository,[{...entry.base,version:3},2]);
        await run(`append${entry.kind}Revision` as keyof FoodMenuRepository,[{...entry.base,version:2},1]); await run(`get${entry.kind}` as keyof FoodMenuRepository,[entry.id,1]); await run(`getLatest${entry.kind}` as keyof FoodMenuRepository,[entry.id]);
        await run(`list${entry.kind}Versions` as keyof FoodMenuRepository,[entry.id,{limit:1}]); await run(`list${entry.kind}Versions` as keyof FoodMenuRepository,[entry.id,{limit:2,afterVersion:1}]); await run(`listLatest${entry.plural}` as keyof FoodMenuRepository,[]);
        await run(`createInitial${entry.kind}` as keyof FoodMenuRepository,[{...entry.base,version:2}]); await run(`append${entry.kind}Revision` as keyof FoodMenuRepository,[{...entry.base,version:5},3]); await run(`append${entry.kind}Revision` as keyof FoodMenuRepository,[{...entry.base,version:4},2]);
    }
    await run("createInitialAvailability",[observation]); await run("createInitialAvailability",[observation]); await run("appendAvailabilityRevision",[{...observation,revision:2,state:"retired"},1]);
    await run("getAvailability",[f.offer.offerId,1,1]); await run("getCurrentAvailability",[f.offer.offerId,1]); await run("listAvailabilityRevisions",[f.offer.offerId,1,{limit:1}]);
    await run("getCurrentAvailability",[f.offer.offerId,2]); await run("createInitialAvailability",[{...observation,offer:{offerId:f.offer.offerId,version:2},state:"sold-out"}]); await run("getCurrentAvailability",[f.offer.offerId,2]); await run("getAvailability",[f.offer.offerId,1,2]);
    await run("appendAvailabilityRevision",[{...observation,revision:2,state:"retired"},1]); await run("appendAvailabilityRevision",[{...observation,revision:2,state:"sold-out"},1]);
    assert.deepEqual(await b.getPublication(f.publication.publicationId,1),await a.getPublication(f.publication.publicationId,1));
    const p = snapshot(value(await a.getPublication(f.publication.publicationId,1))); assert.equal(p.sections[0].entries[0].presentation.version,1); assert.equal(p.sections[0].entries[0].offers[0].offer.version,1); assert.ok(Object.isFrozen(p.sections));
}));

test("independent competing writers produce one created row with canonical retry precedence", async () => harness(async (db,mf) => {
    const f=await fixture(); const a=new D1FoodMenuRepository(db,f.drafts); const b=new D1FoodMenuRepository(new Bridge(mf),f.drafts);
    const initial=await Promise.all([a.createInitialPresentation(f.presentation),b.createInitialPresentation(f.presentation)]); assert.deepEqual(initial.map(r=>value(r).outcome).sort(),["already-present","created"]);
    await a.createInitialOffer(f.offer); await a.createInitialPublication(f.publication); await a.createInitialAvailability({offer:{offerId:f.offer.offerId,version:1},revision:1,state:"available"});
    for (const [kind,base,changed] of [["Presentation",f.presentation,{...f.presentation,name:"Other"}],["Offer",f.offer,{...f.offer,format:{kind:"individual"}}],["Publication",f.publication,{...f.publication,title:"Other"}]] as const) {
        const method=`append${kind}Revision` as keyof FoodMenuRepository;
        const competing=await Promise.all([(a[method] as (...args:unknown[])=>Promise<FoodMenuRepositoryResult<FoodMenuAppendOutcome<unknown>>> )({...base,version:2},1),(b[method] as (...args:unknown[])=>Promise<FoodMenuRepositoryResult<FoodMenuAppendOutcome<unknown>>> )({...changed,version:2},1)]);
        assert.deepEqual(competing.map(r=>value(r).outcome).sort(),["conflict","created"]);
        const winner=snapshot(value(competing.find(r=>r.ok && r.value.outcome==="created")!)) as Record<string,unknown>;
        value(await (a[method] as (...args:unknown[])=>Promise<FoodMenuRepositoryResult<unknown>>)({...winner,version:3},2));
        assert.equal(value(await (b[method] as (...args:unknown[])=>Promise<FoodMenuRepositoryResult<FoodMenuAppendOutcome<unknown>>>)(winner,1)).outcome,"already-present");
    }
    const competing=await Promise.all([a.appendAvailabilityRevision({offer:{offerId:f.offer.offerId,version:1},revision:2,state:"retired"},1),b.appendAvailabilityRevision({offer:{offerId:f.offer.offerId,version:1},revision:2,state:"sold-out"},1)]); assert.deepEqual(competing.map(r=>value(r).outcome).sort(),["conflict","created"]);
}));

test("all immutable triggers, composite constraints, bounds, stable association and failed-batch rollback",async()=>harness(async db=>{
    const f=await rawSeed(db);const a=new D1FoodMenuRepository(db,f.drafts); value(await a.createInitialPublication(f.publication));value(await a.createInitialAvailability({offer:{offerId:f.offer.offerId,version:1},revision:1,state:"retired"}));
    const tables=["food_dish_presentation_snapshots","food_serving_offer_snapshots","food_menu_publication_snapshots","food_offer_availability_observations","food_menu_publication_presentation_memberships","food_menu_publication_offer_memberships"];
    for(const table of tables){ await assert.rejects(sql(db,`UPDATE ${table} SET ${table.includes("membership")?"publication_version":"serialization_format_version"}=1`),/immutable/);await assert.rejects(sql(db,`DELETE FROM ${table}`),/immutable/);const fk=(await sql(db,`PRAGMA foreign_key_list(${table})`))[0].results as {on_delete:string;on_update:string}[];for(const key of fk){assert.equal(key.on_delete,"NO ACTION");assert.equal(key.on_update,"NO ACTION");}}
    await assert.rejects(sql(db,"INSERT INTO food_serving_offer_snapshots VALUES (?,?,?,?,?,?,?)",["food-serving-offer:orphan",1,"key",1,"{}",f.presentation.dishId,2]),/FOREIGN KEY/);
    await assert.rejects(sql(db,"INSERT INTO food_offer_availability_observations VALUES (?,?,?,?,?)",[f.offer.offerId,2,1,1,"{}"]),/FOREIGN KEY/);
    for(const version of [0,-1,1.5,Number.MAX_SAFE_INTEGER+1])await assert.rejects(sql(db,"INSERT INTO food_dish_presentation_snapshots VALUES (?,?,?,?,?,?,?,?,?)",["food-dish:bounds",version,"key",1,"{}",f.product.id,1,f.recipe.id,1]),/CHECK/);
    const other={...f.presentation,dishId:createFoodDishId("other")};value(await a.createInitialPresentation(other));await assert.rejects(sql(db,"INSERT INTO food_serving_offer_snapshots VALUES (?,?,?,?,?,?,?)",[f.offer.offerId,2,"key",1,"{}",other.dishId,1]),/immutable/);
    assert.deepEqual(await a.appendOfferRevision({...f.offer,version:2,presentation:{dishId:other.dishId,version:1}},1),{ok:false,error:{code:"invalid-input",message:"Food menu repository input could not be validated."}});
    const args=["food-menu-publication:batch-rollback",1,"key",1,value(serializeFoodMenuPublication(f.publication,[{presentation:f.presentation,product:f.product,recipe:f.recipe}],[f.offer]))];
    await assert.rejects(db.execute([{sql:"INSERT INTO food_menu_publication_snapshots VALUES (?,?,?,?,?) RETURNING *",values:args},{sql:"DELETE FROM food_serving_offer_snapshots WHERE offer_id=?",values:[f.offer.offerId]}]),/immutable/);
    for(const table of tables.filter(t=>t.includes("publication")))assert.deepEqual((await sql(db,`SELECT * FROM ${table} WHERE publication_id=?`,["food-menu-publication:batch-rollback"]))[0].results,[]);
    assert.deepEqual((await sql(db,"PRAGMA foreign_key_check"))[0].results,[]);
}));

test("deduplicated publication memberships and metadata for repeated section references",async()=>harness(async db=>{
    const f=await rawSeed(db);const a=new D1FoodMenuRepository(db,f.drafts);const repeated={...f.publication,sections:[f.publication.sections[0],{...f.publication.sections[0],key:"two"}]};const r=await a.createInitialPublication(repeated);assert.ok(r.ok&&r.value.outcome==="created");
    assert.equal((await sql(db,"SELECT * FROM food_menu_publication_presentation_memberships"))[0].results.length,1);assert.equal((await sql(db,"SELECT * FROM food_menu_publication_offer_memberships"))[0].results.length,1);
    const read=snapshot(value(await a.getPublication(repeated.publicationId,1)));assert.deepEqual(read.sections.map(s=>s.key),["one","two"]);
}));

test("real corrupt metadata and extra/missing/mismatched memberships fail closed without repair",async()=>harness(async db=>{
    const f=await rawSeed(db);const a=new D1FoodMenuRepository(db,f.drafts);
    for(const defect of ["json","identity","ordering","reference","format","noncanonical"]){const p={...f.presentation,dishId:createFoodDishId(defect)};let payload=value(serializeFoodDishPresentation(p,f.product,f.recipe));if(defect==="json")payload="{";if(defect==="identity")payload=value(serializeFoodDishPresentation(f.presentation,f.product,f.recipe));if(defect==="format")payload=payload.replace('"formatVersion":1','"formatVersion":2');if(defect==="noncanonical")payload=JSON.stringify(JSON.parse(payload),null,2);
        await sql(db,"INSERT INTO food_dish_presentation_snapshots VALUES (?,?,?,?,?,?,?,?,?)",[p.dishId,1,defect==="ordering"?"bad":foodDraftIdentityOrderKey(p.dishId),1,payload,f.product.id,defect==="reference"?2:1,f.recipe.id,1]);assert.deepEqual(await a.getPresentation(p.dishId,1),storageResult);assert.deepEqual(await a.createInitialPresentation(p),storageResult);}
    value(await a.createInitialPublication(f.publication));const other={...f.presentation,dishId:createFoodDishId("extra")};value(await a.createInitialPresentation(other));
    await sql(db,"INSERT INTO food_menu_publication_presentation_memberships VALUES (?,?,?,?)",[f.publication.publicationId,1,other.dishId,1]);assert.deepEqual(await a.getPublication(f.publication.publicationId,1),storageResult);
    // Deliberately damaged isolated fixture: remove only the deriving trigger to simulate an incomplete historical database.
    await sql(db,"DROP TRIGGER food_menu_publication_members");const missing={...f.publication,publicationId:createFoodMenuPublicationId("missing-members")};const payload=value(serializeFoodMenuPublication(missing,[{presentation:f.presentation,product:f.product,recipe:f.recipe}],[f.offer]));await sql(db,"INSERT INTO food_menu_publication_snapshots VALUES (?,?,?,?,?)",[missing.publicationId,1,foodDraftIdentityOrderKey(missing.publicationId),1,payload]);assert.deepEqual(await a.getPublication(missing.publicationId,1),storageResult);
    const mismatched={...missing,publicationId:createFoodMenuPublicationId("mismatched-members")};await sql(db,"INSERT INTO food_menu_publication_snapshots VALUES (?,?,?,?,?)",[mismatched.publicationId,1,foodDraftIdentityOrderKey(mismatched.publicationId),1,value(serializeFoodMenuPublication(mismatched,[{presentation:f.presentation,product:f.product,recipe:f.recipe}],[f.offer]))]);await sql(db,"INSERT INTO food_menu_publication_presentation_memberships VALUES (?,?,?,?)",[mismatched.publicationId,1,other.dishId,1]);assert.deepEqual(await a.getPublication(mismatched.publicationId,1),storageResult);
}));
const storageResult={ok:false,error:{code:"storage",message:"Food menu repository storage is unavailable."}};

test("UTF-16 latest ordering and bounded cursor pagination match JavaScript for all entity families",async()=>harness(async db=>{
    const f=await fixture();const a=new D1FoodMenuRepository(db,f.drafts);const names=["z","A","aa","\u00e9","\u4e2d","\ud83d\ude00","\ue000","\ud800\udc00",...Array.from({length:101},(_,i)=>`n${String(i).padStart(3,"0")}`)];
    for(const name of [...names].reverse())value(await a.createInitialPresentation({...f.presentation,dishId:createFoodDishId(name)}));
    assert.equal(value(await a.listLatestPresentations()).items.length,20);assert.equal(value(await a.listLatestPresentations({limit:100})).items.length,100);
    const identities:string[]=[];let afterId:string|undefined;
    do{const page=value(await a.listLatestPresentations({limit:7,afterId:afterId as never}));identities.push(...page.items.map(s=>s.dishId));afterId=page.nextCursor;}while(afterId);
    assert.deepEqual(identities,names.map(n=>`food-dish:${n}`).sort());
    for(const name of names.slice(0,8)){const offer={...f.offer,offerId:createFoodServingOfferId(name),presentation:{dishId:createFoodDishId(name),version:1}};value(await a.createInitialOffer(offer));value(await a.createInitialPublication({...f.publication,publicationId:createFoodMenuPublicationId(name),sections:[]}));}
    assert.deepEqual(value(await a.listLatestOffers()).items.map(s=>s.offerId),names.slice(0,8).map(n=>`food-serving-offer:${n}`).sort());assert.deepEqual(value(await a.listLatestPublications()).items.map(s=>s.publicationId),names.slice(0,8).map(n=>`food-menu-publication:${n}`).sort());
    for(const limit of [0,-1,1.5,101,"20",null])assert.equal((await a.listLatestPresentations({limit} as never)).ok,false);
    const raw=(await sql(db,"SELECT dish_id FROM food_dish_presentation_snapshots WHERE dish_id IN (?,?) ORDER BY dish_id COLLATE BINARY",["food-dish:\ud83d\ude00","food-dish:\ue000"]))[0].results.map(r=>(r as {dish_id:string}).dish_id);assert.notDeepEqual(raw,["food-dish:\ud83d\ude00","food-dish:\ue000"]);
}));

test("realistically large publication expands memberships; backend capacity never changes domain limits",async()=>harness(async db=>{
    const f=await fixture();const a=new D1FoodMenuRepository(db,f.drafts);const entries:FoodMenuPublication["sections"][number]["entries"][number][]=[];
    for(let i=0;i<20;i++){const presentation={...f.presentation,dishId:createFoodDishId(`dish-${i}`),name:`Dish ${i}`};value(await a.createInitialPresentation(presentation));const selections:FoodMenuPublication["sections"][number]["entries"][number]["offers"][number][]=[];
        for(let j=0;j<10;j++){const offer={...f.offer,offerId:createFoodServingOfferId(`offer-${i}-${j}`),presentation:{dishId:presentation.dishId,version:1}};value(await a.createInitialOffer(offer));selections.push({...f.publication.sections[0].entries[0].offers[0],offer:{offerId:offer.offerId,version:1}});}
        entries.push({...f.publication.sections[0].entries[0],presentation:{dishId:presentation.dishId,version:1},offers:selections});}
    const publication={...f.publication,sections:Array.from({length:20},(_,i)=>({key:`s${i}`,title:`Section ${i}`,entries}))};const r=await a.createInitialPublication(publication);assert.ok(r.ok&&r.value.outcome==="created");assert.equal((await sql(db,"SELECT * FROM food_menu_publication_presentation_memberships"))[0].results.length,20);assert.equal((await sql(db,"SELECT * FROM food_menu_publication_offer_memberships"))[0].results.length,200);assert.deepEqual(snapshot(value(await a.getPublication(publication.publicationId,1))),publication);
}));

test("safe-integer bounds on every version-bearing table and maximum/overflow handling",async()=>harness(async db=>{
    const f=await rawSeed(db);const a=new D1FoodMenuRepository(db,f.drafts);value(await a.createInitialPublication(f.publication));value(await a.createInitialAvailability({offer:{offerId:f.offer.offerId,version:1},revision:1,state:"retired"}));
    const cases:[string,(string|number|null)[],number][]=[
        ["INSERT INTO food_serving_offer_snapshots VALUES (?,?,?,?,?,?,?)",["food-serving-offer:bounds",1,"key",1,"{}",f.presentation.dishId,1],1],
        ["INSERT INTO food_menu_publication_snapshots VALUES (?,?,?,?,?)",["food-menu-publication:bounds",1,"key",1,"{}"],1],
        ["INSERT INTO food_offer_availability_observations VALUES (?,?,?,?,?)",[f.offer.offerId,1,1,1,"{}"],2],
        ["INSERT INTO food_menu_publication_presentation_memberships VALUES (?,?,?,?)",[f.publication.publicationId,1,f.presentation.dishId,1],1],
        ["INSERT INTO food_menu_publication_offer_memberships VALUES (?,?,?,?,?,?)",[f.publication.publicationId,1,f.offer.offerId,1,f.presentation.dishId,1],3]
    ];
    for(const [statement,args,index]of cases)for(const bad of [0,-1,1.5,Number.MAX_SAFE_INTEGER+1]){const values=[...args];values[index]=bad;await assert.rejects(sql(db,statement,values),/CHECK/);}
    const max={...f.presentation,dishId:createFoodDishId("max"),version:Number.MAX_SAFE_INTEGER};await sql(db,"INSERT INTO food_dish_presentation_snapshots VALUES (?,?,?,?,?,?,?,?,?)",[max.dishId,max.version,foodDraftIdentityOrderKey(max.dishId),1,value(serializeFoodDishPresentation(max,f.product,f.recipe)),f.product.id,1,f.recipe.id,1]);assert.equal(value(await a.getPresentation(max.dishId,max.version)).outcome,"found");assert.equal((await a.appendPresentationRevision({...max,version:max.version+1},max.version)).ok,false);
    for(const expected of [0,-1,1.5,"1",null,Number.MAX_SAFE_INTEGER])assert.equal((await a.appendPresentationRevision({...f.presentation,version:2},expected as number)).ok,false);
}));

test("domain-valid oversized identity is a storage limitation rather than invalid-input",async()=>harness(async db=>{
    const f=await fixture();const presentation={...f.presentation,dishId:createFoodDishId("x".repeat(2_000_001))};assert.equal(serializeFoodDishPresentation(presentation,f.product,f.recipe).ok,true);
    const a=new D1FoodMenuRepository(db,f.drafts);assert.deepEqual(await a.createInitialPresentation(presentation),storageResult);
}));

test("captured conditional SQL itself rejects skipped and missing predecessors without relying on adapter checks",async()=>harness(async db=>{
    const f=await fixture();const a=new D1FoodMenuRepository(db,f.drafts);value(await a.createInitialPresentation(f.presentation));value(await a.appendPresentationRevision({...f.presentation,version:2},1));
    const batch=db.queries.find(q=>q[0].sql.includes("INSERT INTO food_dish_presentation_snapshots")&&q[0].values[1]===2)!;assert.ok(batch);
    const skipped=[...batch[0].values];for(const index of [1,10,12,16])skipped[index]=3;const skippedResult=await sql(db,batch[0].sql,skipped);assert.deepEqual(skippedResult[0].results,[]);assert.equal(skippedResult[0].meta?.changes,0);
    const missing=[...batch[0].values];for(const index of [0,9,13,18,20])missing[index]="food-dish:missing";const missingResult=await sql(db,batch[0].sql,missing);assert.deepEqual(missingResult[0].results,[]);assert.equal(missingResult[0].meta?.changes,0);
    assert.equal(value(await a.getPresentation(f.presentation.dishId,3)).outcome,"not-found");assert.equal(value(await a.getPresentation(createFoodDishId("missing"),2)).outcome,"not-found");
}));
