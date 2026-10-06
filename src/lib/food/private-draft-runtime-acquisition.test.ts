import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { createPrivateFoodDraftRuntimeFromEnvironment, createPrivateFoodDraftRuntimeCapabilitiesFromEnvironment } from "./private-draft-runtime-acquisition";
import { parsePrincipalId } from "../identity/identifiers";
import type { SessionPrincipalResolver } from "../identity/session/principal-resolver";
import { foodDraftIdentityOrderKey, type FoodD1Database, type FoodD1Result, type FoodD1Statement } from "./d1-draft-persistence";
import { serializeFoodRecipeDraft } from "./draft-persistence";

const admin = parsePrincipalId("principal:acquisition-test");
const failure = { ok: false, error: { code: "configuration-unavailable", message: "Food draft runtime configuration is unavailable." } };
test("capability acquisition shares validation and returns only same-instance frozen capabilities", async () => {
    const { input, state } = fixture(); const acquired = createPrivateFoodDraftRuntimeCapabilitiesFromEnvironment(input); assert(acquired.ok);
    assert.equal(acquired.value.service, acquired.value.gate); assert(Object.isFrozen(acquired.value)); assert.deepEqual(Object.keys(acquired.value), ["service", "gate"]);
    assert.deepEqual(Object.keys(acquired.value.service), []); assert.deepEqual([state.resolutions, state.prepares, state.batches, state.reads], [0, 0, 0, 0]);
    for (const bad of invalidInputs()) assert.deepEqual(createPrivateFoodDraftRuntimeCapabilitiesFromEnvironment(bad as never), failure);
    const gated = await acquired.value.gate.runAuthorized(() => 17); assert.deepEqual(gated, { ok: true, value: 17 }); assert.equal(state.prepares, 0);
    state.unavailable = true; const denied = await acquired.value.service.getRecipe(recipe().id, 1); assert(!denied.ok && denied.error.code === "access-unavailable"); assert.equal(state.resolutions, 2);
});

test("capability acquisition validates before companion delegation with exact dependencies and only food keys", async () => {
    const source = await readFile(new URL("./private-draft-runtime-acquisition.ts", import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const calls: unknown[] = []; const downstream = { ok: true, value: { service: {}, gate: {} } }; const exports: Record<string, (input: unknown) => unknown> = {};
    runInNewContext(compiled, { exports, require(name: string) {
        if (name === "../identity/identifiers") return { parsePrincipalId };
        if (name === "./private-draft-runtime-composition") return { createPrivateFoodDraftRuntimeCapabilitiesComposition(value: unknown) { calls.push(value); return downstream; }, createPrivateFoodDraftRuntimeComposition() { assert.fail("wrong delegation"); } };
        assert.fail(name);
    } });
    const factory = exports.createPrivateFoodDraftRuntimeCapabilitiesFromEnvironment;
    for (const bad of invalidInputs()) assert.equal(JSON.stringify(factory(bad)), JSON.stringify(failure)); assert.equal(calls.length, 0);
    const { input } = fixture(); const reads: PropertyKey[] = [];
    const environment = new Proxy(input.environment, { get(target, key, receiver) { reads.push(key); return Reflect.get(target, key, receiver); } });
    assert.equal(factory({ ...input, environment }), downstream);
    assert.deepEqual(reads, ["RIVER_FOOD_DB", "RIVER_FOOD_ADMIN_PRINCIPAL_ID"]);
    const forwarded = calls[0] as { database: unknown; callerResolver: unknown; administratorPrincipalId: unknown };
    assert.equal(forwarded.database, input.environment.RIVER_FOOD_DB); assert.equal(forwarded.callerResolver, input.callerResolver); assert.equal(forwarded.administratorPrincipalId, admin);
});
const recipe = (version = 1) => ({ id: "food-recipe:acquisition", version, evidence: [] });
const row = (version = 1) => ({ recipe_id: recipe().id, version, identity_order_key: foodDraftIdentityOrderKey(recipe().id), serialization_format_version: 1, payload_json: serializeFoodRecipeDraft(recipe(version)) });
const result = (results: unknown[] = [], changes = 0): FoodD1Result => ({ success: true, results, meta: { changes } });

function fixture() {
    const state = { resolutions: 0, prepares: 0, batches: 0, reads: 0, principal: admin, unavailable: false, statements: [] as { sql: string; values: (string | number | null)[] }[], readResult: result(), batchResult: [result([], 1), result([row()])] as readonly FoodD1Result[] };
    const database: FoodD1Database = {
        prepare(sql) {
            assert.equal(this, database); state.prepares++;
            const recorded = { sql, values: [] as (string | number | null)[] }; state.statements.push(recorded);
            const statement: FoodD1Statement = { bind(...values) { recorded.values = values; return statement; }, async all() { state.reads++; return state.readResult; } };
            return statement;
        },
        async batch() { assert.equal(this, database); state.batches++; return state.batchResult; },
    };
    const callerResolver: SessionPrincipalResolver = { async resolve() {
        assert.equal(this, callerResolver); state.resolutions++;
        if (state.unavailable) throw new Error("private resolver details");
        return { ok: true, value: { principalId: state.principal } };
    } };
    return { state, input: { environment: { RIVER_FOOD_DB: database, RIVER_FOOD_ADMIN_PRINCIPAL_ID: admin }, callerResolver } };
}

function invalidInputs(): unknown[] {
    const { input } = fixture();
    const cases: unknown[] = [undefined, null, [], false, 1, "input", () => {}, {}];
    const malformed = [undefined, null, [], {}, false, 1, "object", () => {}];
    for (const bad of malformed) {
        cases.push({ ...input, environment: bad }, { ...input, callerResolver: bad }, { ...input, environment: { ...input.environment, RIVER_FOOD_DB: bad } });
    }
    for (const bad of [undefined, null, [], {}, 1, false, "", "acquisition-test", "principal:", "principal:a:b", "food-product:test", " principal:acquisition-test", "principal:acquisition-test ", "principal: acquisition-test", "principal:acquisition-test\n"]) cases.push({ ...input, environment: { ...input.environment, RIVER_FOOD_ADMIN_PRINCIPAL_ID: bad } });
    for (const method of ["prepare", "batch"] as const) for (const bad of malformed.filter(value => typeof value !== "function")) cases.push({ ...input, environment: { ...input.environment, RIVER_FOOD_DB: { ...input.environment.RIVER_FOOD_DB, [method]: bad } } });
    for (const bad of malformed.filter(value => typeof value !== "function")) cases.push({ ...input, callerResolver: { resolve: bad } });
    const boom = () => { throw new Error("private SQL configuration administrator stack"); };
    for (const key of ["environment", "callerResolver"]) cases.push(Object.defineProperty({ ...input }, key, { get: boom }));
    for (const key of ["RIVER_FOOD_DB", "RIVER_FOOD_ADMIN_PRINCIPAL_ID"]) cases.push({ ...input, environment: Object.defineProperty({ ...input.environment }, key, { get: boom }) });
    for (const method of ["prepare", "batch"]) cases.push({ ...input, environment: { ...input.environment, RIVER_FOOD_DB: Object.defineProperty({ ...input.environment.RIVER_FOOD_DB }, method, { get: boom }) } });
    cases.push({ ...input, callerResolver: Object.defineProperty({}, "resolve", { get: boom }) });
    cases.push({ ...input, environment: { RIVER_COMMERCE_DB: input.environment.RIVER_FOOD_DB, ADMIN_PRINCIPAL_ID: admin } });
    cases.push({ ...input, environment: { ...input.environment, RIVER_FOOD_DB: undefined, RIVER_CRM_DB: input.environment.RIVER_FOOD_DB } });
    cases.push({ ...input, environment: { ...input.environment, RIVER_FOOD_ADMIN_PRINCIPAL_ID: undefined, administratorPrincipalId: admin } });
    return cases;
}

test("valid acquisition is synchronous, I/O-free and exposes only the service", () => {
    const { state, input } = fixture(); const acquired = createPrivateFoodDraftRuntimeFromEnvironment(input);
    assert(acquired.ok); assert(!(acquired instanceof Promise));
    assert.deepEqual(Object.keys(acquired), ["ok", "value"]); assert.deepEqual(Object.keys(acquired.value), []);
    for (const key of ["environment", "database", "administratorPrincipalId", "callerResolver", "repository"]) { assert(!(key in acquired)); assert(!(key in acquired.value)); }
    assert.deepEqual([state.resolutions, state.prepares, state.batches, state.reads], [0, 0, 0, 0]);
});

test("malformed inputs and throwing getters return exactly the sanitized failure", () => {
    for (const input of invalidInputs()) assert.deepEqual(createPrivateFoodDraftRuntimeFromEnvironment(input as never), failure);
});

test("instrumented composition proves exact extraction, no alternate reads and no delegation on invalid inputs", async () => {
    const source = await readFile(new URL("./private-draft-runtime-acquisition.ts", import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const calls: unknown[] = []; let downstream: unknown = { ok: true, value: {} };
    const exports: Record<string, (input: unknown) => unknown> = {};
    runInNewContext(compiled, { exports, require(name: string) {
        if (name === "../identity/identifiers") return { parsePrincipalId };
        assert.equal(name, "./private-draft-runtime-composition");
        return { createPrivateFoodDraftRuntimeComposition(input: unknown) { calls.push(input); return downstream; } };
    } });
    const factory = exports.createPrivateFoodDraftRuntimeFromEnvironment!;
    for (const invalid of invalidInputs()) {
        const actual = factory(invalid);
        assert.equal(JSON.stringify(actual), JSON.stringify(failure));
    }
    assert.equal(calls.length, 0);
    const { input, state } = fixture(); const reads: string[] = [];
    const environment = new Proxy(input.environment, { get(target, property, receiver) {
        assert.equal(typeof property, "string"); reads.push(property as string);
        assert(["RIVER_FOOD_DB", "RIVER_FOOD_ADMIN_PRINCIPAL_ID"].includes(property as string));
        return Reflect.get(target, property, receiver);
    } });
    assert.equal(factory({ ...input, environment }), downstream);
    assert.deepEqual(reads, ["RIVER_FOOD_DB", "RIVER_FOOD_ADMIN_PRINCIPAL_ID"]);
    const forwarded = calls[0] as Record<string, unknown>;
    assert.deepEqual(Object.keys(forwarded), ["database", "callerResolver", "administratorPrincipalId"]);
    assert.equal(forwarded.database, input.environment.RIVER_FOOD_DB); assert.equal(forwarded.callerResolver, input.callerResolver); assert.equal(forwarded.administratorPrincipalId, admin);
    downstream = failure; assert.equal(factory(input), failure);
    assert.deepEqual([state.resolutions, state.prepares, state.batches, state.reads], [0, 0, 0, 0]);
});

test("fresh authorization denies all ten operations without database access", async () => {
    const { input, state } = fixture(); const acquired = createPrivateFoodDraftRuntimeFromEnvironment(input); assert(acquired.ok); const service = acquired.value;
    const initial = await service.getRecipe(recipe().id, 1); assert(initial.ok); assert.equal(initial.value.outcome, "not-found");
    state.prepares = 0; state.reads = 0; state.principal = parsePrincipalId("principal:other");
    const operations = [() => service.createInitialRecipe(recipe()), () => service.appendRecipeRevision(recipe(2), 1), () => service.createInitialProduct({}), () => service.appendProductRevision({}, 1), () => service.getRecipe("invalid", 1), () => service.getProduct("invalid", 1), () => service.listRecipeVersions("invalid"), () => service.listProductVersions("invalid"), () => service.listLatestRecipes(), () => service.listLatestProducts()];
    for (const operation of operations) assert.deepEqual(await operation(), { ok: false, error: { code: "forbidden", message: "Food draft access is forbidden." } });
    state.unavailable = true; assert.deepEqual(await service.listLatestRecipes(), { ok: false, error: { code: "access-unavailable", message: "Food draft access is unavailable." } });
    assert.equal(state.resolutions, 12); assert.deepEqual([state.prepares, state.batches, state.reads], [0, 0, 0]);
});

test("authorized calls preserve canonical content, versions, predecessors, cursors and outcomes", async () => {
    const { input, state } = fixture(); const acquired = createPrivateFoodDraftRuntimeFromEnvironment(input); assert(acquired.ok); const service = acquired.value;
    const created = await service.createInitialRecipe(recipe()); assert(created.ok); assert.equal(created.value.outcome, "created"); assert(Object.isFrozen(created.value.snapshot));
    assert(state.statements[0].values.includes(serializeFoodRecipeDraft(recipe())));
    state.batchResult = [result([], 0), result([row()])];
    const retry = await service.createInitialRecipe(recipe()); assert(retry.ok); assert.equal(retry.value.outcome, "already-present");
    const conflict = await service.createInitialRecipe({ ...recipe(), ingredients: [] }); assert(conflict.ok); assert.equal(conflict.value.outcome, "conflict");
    state.readResult = result([row()]); const found = await service.getRecipe(recipe().id, 1); assert(found.ok); assert.equal(found.value.outcome, "found"); assert.deepEqual(state.statements.at(-1)?.values, [recipe().id, 1]);
    state.batchResult = [result([], 1), result([row(2)])]; const revised = await service.appendRecipeRevision(recipe(2), 1); assert(revised.ok); assert.equal(revised.value.outcome, "created");
    assert.deepEqual(state.statements.at(-2)?.values, [recipe().id, 2, foodDraftIdentityOrderKey(recipe().id), 1, serializeFoodRecipeDraft(recipe(2)), 1, recipe().id, 2, 1]);
    state.readResult = result(); const missing = await service.getRecipe(recipe().id, 9); assert(missing.ok); assert.equal(missing.value.outcome, "not-found");
    await service.listRecipeVersions(recipe().id, { limit: 7, afterVersion: 2 }); assert.deepEqual(state.statements.at(-1)?.values, [recipe().id, 2, 8]);
    await service.listLatestRecipes({ limit: 9, afterId: recipe().id }); assert.deepEqual(state.statements.at(-1)?.values, [foodDraftIdentityOrderKey(recipe().id), 10]);
});

test("source imports only required contracts and composition without runtime activation", async () => {
    const source = await readFile(new URL("./private-draft-runtime-acquisition.ts", import.meta.url), "utf8");
    const ast = ts.createSourceFile("acquisition.ts", source, ts.ScriptTarget.Latest, true);
    const imports = ast.statements.filter(ts.isImportDeclaration);
    assert.deepEqual(imports.map(i => (i.moduleSpecifier as ts.StringLiteral).text), ["../identity/identifiers", "../identity/session/principal-resolver", "./d1-draft-persistence", "./private-draft-runtime-composition"]);
    assert(imports[1].importClause?.isTypeOnly); assert(imports[2].importClause?.isTypeOnly);
    assert.doesNotMatch(source, /cloudflare:|globalThis|process\.|import\.meta|wrangler|river-os|Astro|SessionStore|DefaultSessionPrincipalResolver|PrincipalRepository|migration|commerce|stripe|fulfillment|accounting|community|deploy|insurance|sesh|Date\b|fetch\(|InMemory/);
});
