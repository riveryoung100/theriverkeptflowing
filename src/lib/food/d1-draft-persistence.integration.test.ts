import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { D1FoodDraftRepository, foodDraftIdentityOrderKey, type FoodD1Database, type FoodD1Statement, type FoodD1Result } from "./d1-draft-persistence";
import { InMemoryFoodDraftRepository, serializeFoodRecipeDraft, FoodDraftStorageError, FoodDraftValidationError } from "./draft-persistence";
import { assessFoodDraftEvidenceCompleteness } from "./draft-domain";
const recipe = (name = "meal", version = 1) => ({ id: `food-recipe:${name}`, version, ingredients: [{ kind: "purchased-component", name: "Seasoning", composition: "undisclosed" }], allergenReview: { state: "unknown", declarations: [] }, process: { classification: "unknown" }, evidence: [] });
const product = (name = "meal", version = 1, recipeVersion = 1) => ({ id: `food-product:${name}`, version, recipe: { id: "food-recipe:meal", version: recipeVersion }, temperatureControl: "unknown", cottageReview: { state: "pending" }, salesTaxReview: { state: "unknown" }, evidence: [] });
type Query = { sql: string; values: (string | number | null)[] };
class Bridge implements FoodD1Database {
    readonly queries: Query[][] = [];
    constructor(private readonly mf: Miniflare) {}
    async execute(queries: Query[]): Promise<readonly FoodD1Result[]> {
        this.queries.push(queries);
        const response = await this.mf.dispatchFetch("http://food.test/", { method: "POST", body: JSON.stringify(queries) });
        const value = await response.json();
        if (!response.ok) throw new Error((value as { error: string }).error);
        return value as FoodD1Result[];
    }
    prepare(sql: string): FoodD1Statement {
        let values: (string | number | null)[] = [];
        const statement = { bind: (...next: (string | number | null)[]) => { values = next; return statement; }, all: async () => (await this.execute([{ sql, values }]))[0], query: () => ({ sql, values }) };
        return statement;
    }
    batch(statements: FoodD1Statement[]): Promise<readonly FoodD1Result[]> { return this.execute(statements.map(s => (s as FoodD1Statement & { query(): Query }).query())); }
}
async function harness(run: (a: D1FoodDraftRepository, b: D1FoodDraftRepository, db: Bridge) => Promise<void>): Promise<void> {
    const mf = new Miniflare(convertV4MiniflareOptions({ modules: true, compatibilityDate: "2026-07-24", cf: false, d1Persist: false, d1Databases: { FOOD_TEST: "food-001c-isolated-test" }, script: `export default { async fetch(request, env) { try { const queries = await request.json(); return Response.json(await env.FOOD_TEST.batch(queries.map(q => env.FOOD_TEST.prepare(q.sql).bind(...q.values)))); } catch(e) { return Response.json({error:e.message}, {status:400}); } } }` }));
    try {
        const db = new Bridge(mf);
        const migration = await readFile(new URL("../../../migrations/food/0001_food_draft_snapshots.sql", import.meta.url), "utf8");
        // Keep each trigger body intact; every migration statement ends at a line-ending semicolon.
        const statements = migration.split(/;\r?\n/).map(s => s.trim()).filter(Boolean);
        await db.execute(statements.map(sql => ({ sql, values: [] })));
        await run(new D1FoodDraftRepository(db), new D1FoodDraftRepository(new Bridge(mf)), db);
    } finally { await mf.dispose(); }
}
const sql = (db: Bridge, statement: string, values: Query["values"] = []) => db.execute([{ sql: statement, values }]);

test("actual migration, bounds, composite foreign keys, immutable triggers and batch rollback", async () => harness(async (a, _b, db) => {
    await a.createInitialRecipe(recipe()); await a.createInitialProduct(product());
    for (const table of ["food_recipe_draft_snapshots", "food_product_draft_snapshots"]) {
        await assert.rejects(sql(db, `UPDATE ${table} SET payload_json = '{}'`), /immutable/);
        await assert.rejects(sql(db, `DELETE FROM ${table}`), /immutable/);
    }
    await assert.rejects(sql(db, "INSERT INTO food_product_draft_snapshots VALUES (?, ?, ?, ?, ?, ?, ?)", ["food-product:orphan", 1, "key", "food-recipe:meal", 2, 1, "{}"]), /FOREIGN KEY/);
    for (const v of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) await assert.rejects(sql(db, "INSERT INTO food_recipe_draft_snapshots VALUES (?, ?, ?, ?, ?)", ["food-recipe:bound", v, "key", 1, "{}"]), /CHECK/);
    await sql(db, "INSERT INTO food_recipe_draft_snapshots VALUES (?, ?, ?, ?, ?)", ["food-recipe:max", Number.MAX_SAFE_INTEGER, foodDraftIdentityOrderKey("food-recipe:max"), 1, serializeFoodRecipeDraft(recipe("max", Number.MAX_SAFE_INTEGER))]);
    assert.equal((await a.getRecipe("food-recipe:max", Number.MAX_SAFE_INTEGER)).outcome, "found");
    await assert.rejects(db.execute([{ sql: "INSERT INTO food_recipe_draft_snapshots VALUES (?,1,?,1,?)", values: ["food-recipe:rollback", foodDraftIdentityOrderKey("food-recipe:rollback"), serializeFoodRecipeDraft(recipe("rollback"))] }, { sql: "DELETE FROM food_recipe_draft_snapshots WHERE recipe_id = ?", values: ["food-recipe:meal"] }]), /immutable/);
    assert.equal((await a.getRecipe("food-recipe:rollback", 1)).outcome, "not-found");
    const retry = await a.createInitialRecipe(recipe()); assert.equal(retry.outcome, "already-present");
    const batches = db.queries.filter(q => q[0].sql.startsWith("INSERT INTO") && q.length === 2); assert(batches.length >= 3);
    const duplicate = await db.execute([batches[0][0], { sql: "SELECT version FROM food_recipe_draft_snapshots WHERE recipe_id = ?", values: ["food-recipe:meal"] }]);
    assert.equal(duplicate[0].meta?.changes, 0); assert.deepEqual(duplicate[1].results, [{ version: 1 }]);
    assert.deepEqual((await sql(db, "PRAGMA foreign_key_check"))[0].results, []);
    // workerd's SQL authorizer does not permit integrity_check; FK checking is available.
    await assert.rejects(sql(db, "PRAGMA integrity_check"), /not authorized/);
    const fresh = [...batches[0][0].values]; fresh[0] = "food-recipe:metadata"; fresh[2] = foodDraftIdentityOrderKey("food-recipe:metadata"); fresh[4] = serializeFoodRecipeDraft(recipe("metadata")); fresh[6] = "food-recipe:metadata";
    const visible = await db.execute([{ sql: batches[0][0].sql, values: fresh }, { sql: "SELECT version FROM food_recipe_draft_snapshots WHERE recipe_id = ?", values: ["food-recipe:metadata"] }]);
    assert.equal(visible[0].meta?.changes, 1); assert.deepEqual(visible[1].results, [{ version: 1 }]);
}));
test("independent competing writers, exact outcomes and historical retries", async () => harness(async (a, b, db) => {
    const initial = await Promise.all([a.createInitialRecipe(recipe()), b.createInitialRecipe(recipe())]); assert.deepEqual(initial.map(r => r.outcome).sort(), ["already-present", "created"]);
    const different = { ...recipe("meal", 2), ingredients: [] };
    const competing = await Promise.all([a.appendRecipeRevision(recipe("meal", 2), 1), b.appendRecipeRevision(different, 1)]);
    assert.deepEqual(competing.map(r => r.outcome).sort(), ["conflict", "created"]);
    const got = await a.getRecipe("food-recipe:meal", 2); if (got.outcome !== "found") assert.fail();
    assert.equal((await b.appendRecipeRevision(got.snapshot, 1)).outcome, "already-present");
    await a.appendRecipeRevision(recipe("meal", 3), 2); assert.equal((await b.appendRecipeRevision(got.snapshot, 1)).outcome, "already-present");
    assert.equal((await a.appendRecipeRevision(recipe("missing", 2), 1)).outcome, "conflict");
    assert.equal((await a.appendRecipeRevision(recipe("meal", 5), 3)).outcome, "conflict");
    assert.equal((await a.appendRecipeRevision(recipe("meal", Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER)).outcome, "conflict");
    assert.equal((await a.createInitialRecipe(recipe("bad", 2))).outcome, "conflict");
    await assert.rejects(a.appendRecipeRevision(recipe("meal", 4), 0), FoodDraftValidationError);
    // Exercise the SQL gate directly: a valid payload cannot bypass stale latest or missing predecessor.
    const captured = db.queries.find(q => q[0].sql.includes("ON CONFLICT") && q[0].values[1] === 2)!;
    const stale = [...captured[0].values]; stale[1] = 4; stale[4] = serializeFoodRecipeDraft(recipe("meal", 4)); stale[5] = 1; stale[7] = 4; stale[8] = 1;
    assert.equal((await db.execute([{ sql: captured[0].sql, values: stale }]))[0].meta?.changes, 0);
    for (const [name, next, expected] of [["missing", 2, 1], ["meal", 5, 3]] as const) {
        const values = [...captured[0].values]; values[0] = `food-recipe:${name}`; values[1] = next; values[2] = foodDraftIdentityOrderKey(values[0] as string); values[4] = serializeFoodRecipeDraft(recipe(name, next)); values[5] = expected; values[6] = values[0]; values[7] = next; values[8] = expected;
        assert.equal((await db.execute([{ sql: captured[0].sql, values }]))[0].meta?.changes, 0);
    }
    const identical = await Promise.all([a.appendRecipeRevision(recipe("meal", 4), 3), b.appendRecipeRevision(recipe("meal", 4), 3)]);
    assert.deepEqual(identical.map(r => r.outcome).sort(), ["already-present", "created"]);
    await a.createInitialProduct(product());
    const products = await Promise.all([a.appendProductRevision(product("meal", 2, 2), 1), b.appendProductRevision({ ...product("meal", 2, 2), temperatureControl: "frozen" }, 1)]);
    assert.deepEqual(products.map(r => r.outcome).sort(), ["conflict", "created"]);
    assert.deepEqual((await a.listProductVersions("food-product:meal")).items.map(s => s.version), [1, 2]);
    const historical = await a.getProduct("food-product:meal", 2); if (historical.outcome !== "found") assert.fail();
    await a.appendProductRevision(product("meal", 3, 2), 2);
    assert.equal((await b.appendProductRevision(historical.snapshot, 1)).outcome, "already-present");
}));
test("exact historical references, frozen detached reads and completeness preservation", async () => harness(async (a, b) => {
    await assert.rejects(a.createInitialProduct(product()), FoodDraftValidationError);
    const source = recipe(); const created = await a.createInitialRecipe(source); source.ingredients[0].name = "changed";
    await a.createInitialProduct(product()); await a.appendRecipeRevision(recipe("meal", 2), 1);
    const old = await a.getProduct("food-product:meal", 1); if (old.outcome !== "found") assert.fail(); assert.equal(old.snapshot.recipe.version, 1);
    const first = await a.getRecipe("food-recipe:meal", 1); const second = await b.getRecipe("food-recipe:meal", 1); if (first.outcome !== "found" || second.outcome !== "found") assert.fail();
    assert.notEqual(first.snapshot, second.snapshot); assert.equal(first.snapshot.ingredients?.[0].name, "Seasoning"); assert(Object.isFrozen(first.snapshot.ingredients?.[0])); assert(Object.isFrozen(old.snapshot.recipe)); assert(Object.isFrozen(created));
    const assessment = assessFoodDraftEvidenceCompleteness(old.snapshot, first.snapshot); assert.equal(assessment.requiredEvidencePresent, true); assert(assessment.unresolvedReviews.length > 0);
    await a.appendProductRevision(product("meal", 2, 2), 1); await a.appendProductRevision(product("meal", 3, 2), 2);
    assert.equal((await b.appendProductRevision(product("meal", 2, 2), 1)).outcome, "already-present");
    assert.equal((await b.appendProductRevision({ ...product("meal", 2, 2), temperatureControl: "frozen" }, 1)).outcome, "conflict");
    assert.deepEqual((await a.listProductVersions("food-product:meal")).items.map(s => s.recipe.version), [1, 2, 2]);
    const ev = (requirement: string) => ({ requirement, subject: { type: "product", id: "food-product:meal", version: 4 }, sourceReference: "source:review", reviewDate: "2026-10-05", issuer: "issuer:review" });
    const adverse = { ...product("meal", 4, 2), cottageReview: { state: "reviewed", conclusion: "ineligible" }, salesTaxReview: { state: "reviewed", conclusion: "inconclusive" }, evidence: [ev("cottage-eligibility-review"), ev("sales-tax-review")] };
    assert.equal((await a.appendProductRevision(adverse, 3)).outcome, "created");
    const read = await a.getProduct("food-product:meal", 4); if (read.outcome !== "found") assert.fail(); assert.deepEqual(read.snapshot, adverse);
    await assert.rejects(a.appendProductRevision({ ...adverse, version: 5 }, 4), FoodDraftValidationError);
}));
test("bounded deterministic listings and UTF-16 parity including surrogate pairs", async () => harness(async (a, _b, db) => {
    const memory = new InMemoryFoodDraftRepository();
    const names = ["z", "a", "A", "aa", "a😀", "é", "中", "😀", "\ue000", "𐀀", ...Array.from({ length: 105 }, (_, i) => `n${String(i).padStart(3, "0")}`)];
    for (const name of [...names].reverse()) { await a.createInitialRecipe(recipe(name)); await memory.createInitialRecipe(recipe(name)); }
    await a.appendRecipeRevision(recipe("a", 2), 1); await memory.appendRecipeRevision(recipe("a", 2), 1);
    assert.equal((await a.listLatestRecipes()).items.length, 20); assert.equal((await a.listLatestRecipes({ limit: 100 })).items.length, 100);
    const actual: string[] = []; let afterId: string | undefined;
    do { const p = await a.listLatestRecipes({ limit: 7, afterId }); actual.push(...p.items.map(s => s.id)); assert(Object.isFrozen(p.items)); afterId = p.nextCursor; } while (afterId);
    assert.deepEqual(actual, names.map(n => `food-recipe:${n}`).sort());
    assert.deepEqual(await a.listLatestRecipes({ limit: 100 }), await memory.listLatestRecipes({ limit: 100 }));
    assert.deepEqual((await a.listRecipeVersions("food-recipe:a", { limit: 1 })).items.map(s => s.version), [1]);
    assert.deepEqual((await a.listRecipeVersions("food-recipe:a", { afterVersion: 1 })).items.map(s => s.version), [2]);
    assert.deepEqual(await a.listRecipeVersions("food-recipe:none"), { items: [] });
    assert(db.queries.some(q => q[0].sql.includes("LIMIT ?") && q[0].values.at(-1) === 101));
    await a.createInitialRecipe(recipe());
    for (const name of ["z", "😀", "\ue000", "A"]) await a.createInitialProduct(product(name));
    const products = await a.listLatestProducts({ limit: 2 }); assert.deepEqual(products.items.map(s => s.id), ["food-product:A", "food-product:z"]);
    assert.deepEqual((await a.listLatestProducts({ afterId: products.nextCursor })).items.map(s => s.id), ["food-product:😀", "food-product:\ue000"]);
    const binary = await sql(db, "SELECT recipe_id FROM food_recipe_draft_snapshots WHERE recipe_id IN (?,?) ORDER BY recipe_id COLLATE BINARY", ["food-recipe:😀", "food-recipe:\ue000"]);
    assert.notDeepEqual(binary[0].results.map(r => (r as { recipe_id: string }).recipe_id), ["food-recipe:😀", "food-recipe:\ue000"]);
}));
test("corrupt and disagreeing real rows fail closed without historical repair", async () => harness(async (a, _b, db) => {
    const defects = ["json", "ordering", "identity", "format", "noncanonical", "evidence"];
    for (const name of defects) {
        const r = recipe(name); let payload = serializeFoodRecipeDraft(r);
        if (name === "json") payload = "{";
        if (name === "identity") payload = serializeFoodRecipeDraft(recipe("other"));
        if (name === "format") payload = payload.replace('"formatVersion":1', '"formatVersion":2');
        if (name === "noncanonical") payload = JSON.stringify(JSON.parse(payload), null, 2);
        if (name === "evidence") { const parsed = JSON.parse(payload); parsed.snapshot.evidence = [{ requirement: "allergen-review", subject: { type: "recipe", id: r.id, version: 2 }, sourceReference: "source", reviewDate: "2026-10-05", issuer: "issuer" }]; payload = JSON.stringify(parsed); }
        await sql(db, "INSERT INTO food_recipe_draft_snapshots VALUES (?,1,?,1,?)", [r.id, name === "ordering" ? "bad" : foodDraftIdentityOrderKey(r.id), payload]);
        await assert.rejects(a.getRecipe(r.id, 1), FoodDraftStorageError);
        await assert.rejects(a.createInitialRecipe(r), FoodDraftStorageError);
    }
    await a.createInitialRecipe(recipe());
    await sql(db, "INSERT INTO food_product_draft_snapshots VALUES (?,1,?,?,1,1,?)", ["food-product:broken", foodDraftIdentityOrderKey("food-product:broken"), "food-recipe:meal", JSON.stringify({ formatVersion: 1, recordType: "product", recordId: "food-product:broken", recordVersion: 1, snapshot: product("broken", 1, 2) })]);
    await assert.rejects(a.getProduct("food-product:broken", 1), FoodDraftStorageError);
}));
