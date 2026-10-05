import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { D1FoodDraftRepository, foodDraftIdentityOrderKey, type FoodD1Database, type FoodD1Result, type FoodD1Statement } from "./d1-draft-persistence";
import { FoodDraftStorageError, FoodDraftValidationError, serializeFoodRecipeDraft } from "./draft-persistence";
const recipe = { id: "food-recipe:unit", version: 1, evidence: [] };
const row = () => ({ recipe_id: recipe.id, version: 1, identity_order_key: foodDraftIdentityOrderKey(recipe.id), serialization_format_version: 1, payload_json: serializeFoodRecipeDraft(recipe) });
const result = (records: unknown[] = [], changes = 0): FoodD1Result => ({ success: true, meta: { changes }, results: records });
class Fake implements FoodD1Database {
    statements: { sql: string; values: (string | number | null)[] }[] = [];
    read: FoodD1Result = result();
    responses: readonly FoodD1Result[] = [result([], 1), result([row()])];
    failure?: Error;
    prepare(sql: string): FoodD1Statement {
        const entry = { sql, values: [] as (string | number | null)[] }; this.statements.push(entry);
        const statement: FoodD1Statement = { bind: (...values) => { entry.values = values; return statement; }, all: async () => { if (this.failure) throw this.failure; return this.read; } };
        return statement;
    }
    async batch(): Promise<readonly FoodD1Result[]> { if (this.failure) throw this.failure; return this.responses; }
}
test("adapter binds canonical content and uses conditional insert plus exact read", async () => {
    const db = new Fake(); const repo = new D1FoodDraftRepository(db);
    const created = await repo.createInitialRecipe(recipe); assert.equal(created.outcome, "created");
    assert.match(db.statements[0].sql, /NOT EXISTS/); assert.match(db.statements[0].sql, /MAX\(version\)/); assert.match(db.statements[0].sql, /ON CONFLICT\(recipe_id, version\) DO NOTHING/);
    assert(db.statements[0].values.includes(serializeFoodRecipeDraft(recipe))); assert.equal(db.statements.length, 2);
    db.responses = [result([], 0), result([row()])]; assert.equal((await repo.createInitialRecipe(recipe)).outcome, "already-present");
    const other = { ...recipe, ingredients: [] }; db.responses = [result([], 0), result([row()])]; assert.equal((await repo.createInitialRecipe(other)).outcome, "conflict");
    db.responses = [result([], 0), result()]; assert.equal((await repo.createInitialRecipe(recipe)).outcome, "conflict");
    assert(Object.isFrozen(created)); assert(Object.isFrozen(created.snapshot)); assert(Object.isFrozen(created.snapshot.evidence)); assert.notEqual(created.snapshot, recipe);
});
test("batch uncertainty, missing metadata and impossible results fail closed", async () => {
    const db = new Fake(); const repo = new D1FoodDraftRepository(db);
    for (const responses of [[], [result()], [{ success: true, results: [] }, result([row()])], [result([], 2), result([row()])], [result([], 1), result()], [result([], 1), result([{ ...row(), payload_json: serializeFoodRecipeDraft({ ...recipe, ingredients: [] }) }])], [{ success: false, results: [] }, result([row()])], [result([], 0), result([row(), row()])]]) {
        db.responses = responses; await assert.rejects(repo.createInitialRecipe(recipe), FoodDraftStorageError);
    }
    db.failure = new Error("uncertain transport"); await assert.rejects(repo.createInitialRecipe(recipe), /uncertain transport/); await assert.rejects(repo.getRecipe(recipe.id, 1), FoodDraftStorageError);
});
test("malformed metadata, noncanonical serialization and stale evidence reject", async () => {
    const db = new Fake(); const repo = new D1FoodDraftRepository(db);
    for (const bad of [null, {}, { ...row(), version: 2 }, { ...row(), recipe_id: "food-recipe:other" }, { ...row(), identity_order_key: "bad" }, { ...row(), serialization_format_version: 2 }, { ...row(), payload_json: "{" }, { ...row(), payload_json: JSON.stringify(JSON.parse(row().payload_json), null, 2) }, { ...row(), payload_json: row().payload_json.replace('"recordVersion":1', '"recordVersion":2') }]) {
        db.read = result([bad]); await assert.rejects(repo.getRecipe(recipe.id, 1), FoodDraftStorageError);
    }
    await assert.rejects(repo.createInitialRecipe({ ...recipe, evidence: [{ requirement: "allergen-review", subject: { type: "recipe", id: recipe.id, version: 2 }, sourceReference: "source", reviewDate: "2026-10-05", issuer: "issuer" }] }), FoodDraftValidationError);
});
test("listing validation is strict, bounded and checks returned order", async () => {
    const db = new Fake(); const repo = new D1FoodDraftRepository(db);
    for (const limit of [0, -1, 101, 1.5, NaN, Infinity, "20", null]) {
        for (const operation of [() => repo.listLatestRecipes({ limit } as never), () => repo.listLatestProducts({ limit } as never), () => repo.listRecipeVersions(recipe.id, { limit } as never), () => repo.listProductVersions("food-product:unit", { limit } as never)]) await assert.rejects(operation(), FoodDraftValidationError);
    }
    await assert.rejects(repo.listLatestRecipes({ afterId: "food-product:wrong" }), FoodDraftValidationError);
    await assert.rejects(repo.listRecipeVersions(recipe.id, { afterVersion: 0 }), FoodDraftValidationError);
    await assert.rejects(repo.listLatestRecipes({ offset: 0 } as never), FoodDraftValidationError);
    await repo.listLatestRecipes(); assert.deepEqual(db.statements.at(-1)?.values, ["", 21]);
    await repo.listLatestRecipes({ limit: 100 }); assert.equal(db.statements.at(-1)?.values.at(-1), 101);
    db.read = result([row(), row()]); await assert.rejects(repo.listLatestRecipes(), FoodDraftStorageError);
});
test("UTF-16 key and source isolation", async () => {
    assert.equal(foodDraftIdentityOrderKey("A😀\ue000"), "0041d83dde00e000");
    const source = await readFile(new URL("./d1-draft-persistence.ts", import.meta.url), "utf8");
    assert.deepEqual([...source.matchAll(/from "([^"]+)"/g)].map(m => m[1]), ["./draft-domain", "./draft-persistence"]);
    assert.doesNotMatch(source, /process\.env|globalThis|Date\b|fetch\(|RIVER_FOOD_DB|ON CONFLICT[^;]*DO UPDATE|INSERT OR REPLACE/);
});
