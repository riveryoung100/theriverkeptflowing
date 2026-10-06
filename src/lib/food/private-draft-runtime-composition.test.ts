import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { createPrivateFoodDraftRuntimeComposition, createPrivateFoodDraftRuntimeCapabilitiesComposition, type FoodPrivateDraftRuntimeCompositionInput } from "./private-draft-runtime-composition";
import { runInNewContext } from "node:vm";
import { createPrivateFoodDraftWorkspaceController } from "./private-draft-workspace";
import { createPrivateFoodDraftMutationRequestBoundary } from "./private-draft-mutation-request";
import { SingleAdminFoodDraftService } from "./private-draft-service";
import { parsePrincipalId } from "../identity/identifiers";
import type { SessionPrincipalResolver } from "../identity/session/principal-resolver";
import { foodDraftIdentityOrderKey, type FoodD1Database, type FoodD1Result, type FoodD1Statement } from "./d1-draft-persistence";
import { serializeFoodRecipeDraft } from "./draft-persistence";
const admin = parsePrincipalId("principal:composition-test");
const configurationFailure = { ok: false, error: { code: "configuration-unavailable", message: "Food draft runtime configuration is unavailable." } };
const recipe = (version = 1) => ({ id: "food-recipe:composition", version, evidence: [] });
test("capabilities share one concrete service, are frozen, and manually assemble I/J without construction I/O", async () => {
    const { state, input } = fixture(); const composed = createPrivateFoodDraftRuntimeCapabilitiesComposition(input); assert(composed.ok);
    const { service, gate } = composed.value; assert.equal(service, gate); assert(service instanceof SingleAdminFoodDraftService);
    assert(Object.isFrozen(composed)); assert(Object.isFrozen(composed.value)); assert.deepEqual(Object.keys(composed.value), ["service", "gate"]); assert.deepEqual(Object.keys(service), []);
    const controller = createPrivateFoodDraftWorkspaceController(service);
    const transport = createPrivateFoodDraftMutationRequestBoundary({ gate, controller, expectedOrigin: "https://food.test" });
    assert.deepEqual([state.resolutions, state.prepares, state.batches, state.reads], [0, 0, 0, 0]);
    let bodyReads = 0;
    const envelope = { method: "POST", origin: "https://food.test", contentType: "application/x-www-form-urlencoded", readBody: async function* () {
        bodyReads++; yield new TextEncoder().encode(`operation=createInitialRecipe&snapshot=${encodeURIComponent(JSON.stringify(recipe()))}`);
    } };
    state.principal = "principal:other";
    const denied = await transport.submit(envelope); assert(!denied.ok && denied.error.code === "forbidden"); assert.equal(bodyReads, 0); assert.equal(state.prepares, 0);
    state.principal = admin;
    const created = await transport.submit(envelope); assert(created.ok && created.value.outcome === "created"); assert.equal(state.resolutions, 3); assert.equal(bodyReads, 1);
    const revoked = await gate.runAuthorized(async () => { state.principal = "principal:revoked"; return service.createInitialRecipe(recipe()); });
    assert(revoked.ok && !revoked.value.ok && revoked.value.error.code === "forbidden"); assert.equal(state.resolutions, 5); assert.equal(state.batches, 1);
});

test("capability composition constructs exactly one repository/service with exact shared configuration", async () => {
    const source = await readFile(new URL("./private-draft-runtime-composition.ts", import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const { input } = fixture(); const repositories: object[] = [], services: object[] = [], configurations: unknown[] = [];
    class Repository { constructor(database: unknown) { assert.equal(database, input.database); repositories.push(this); } }
    class Service { constructor(configuration: unknown) { configurations.push(configuration); services.push(this); } }
    const exports: Record<string, (input: unknown) => unknown> = {};
    runInNewContext(compiled, { exports, Object, require(name: string) {
        if (name === "../identity/identifiers") return { parsePrincipalId };
        if (name === "./d1-draft-persistence") return { D1FoodDraftRepository: Repository };
        if (name === "./private-draft-service") return { SingleAdminFoodDraftService: Service };
        assert.fail(name);
    } });
    const result = exports.createPrivateFoodDraftRuntimeCapabilitiesComposition(input) as { ok: true; value: { service: object; gate: object } };
    assert.equal(repositories.length, 1); assert.equal(services.length, 1); assert.equal(result.value.service, services[0]); assert.equal(result.value.gate, services[0]);
    const configuration = configurations[0] as { repository: unknown; callerResolver: unknown; administratorPrincipalId: unknown };
    assert.equal(configuration.repository, repositories[0]); assert.equal(configuration.callerResolver, input.callerResolver); assert.equal(configuration.administratorPrincipalId, admin);
    const narrow = exports.createPrivateFoodDraftRuntimeComposition(input) as { ok: true; value: object }; assert.equal(narrow.value, services[1]); assert.equal(services.length, 2); assert.equal(repositories.length, 2);
    for (const bad of [undefined, null, [], {}, { ...input, administratorPrincipalId: " principal:x" }, { ...input, database: { prepare: null, batch() {} } }, Object.defineProperty({ ...input }, "callerResolver", { get() { throw new Error("private"); } })]) {
        assert.deepEqual(createPrivateFoodDraftRuntimeCapabilitiesComposition(bad as never), configurationFailure);
        assert.equal(JSON.stringify(exports.createPrivateFoodDraftRuntimeCapabilitiesComposition(bad)), JSON.stringify(configurationFailure));
    }
    assert.equal(services.length, 2);
});
const row = (version = 1) => ({ recipe_id: recipe().id, version, identity_order_key: foodDraftIdentityOrderKey(recipe().id), serialization_format_version: 1, payload_json: serializeFoodRecipeDraft(recipe(version)) });
const result = (results: unknown[] = [], changes = 0): FoodD1Result => ({ success: true, results, meta: { changes } });
function fixture() {
    const state = { resolutions: 0, prepares: 0, batches: 0, reads: 0, principal: admin as string, unavailable: false, statements: [] as { sql: string; values: (string | number | null)[] }[], readResult: result(), batchResult: [result([], 1), result([row()])] as readonly FoodD1Result[] };
    const database: FoodD1Database = {
        prepare(sql) {
            assert.equal(this, database); state.prepares++;
            const recorded = { sql, values: [] as (string | number | null)[] }; state.statements.push(recorded);
            const statement: FoodD1Statement = { bind(...values) { recorded.values = values; return statement; }, async all() { state.reads++; return state.readResult; } };
            return statement;
        },
        async batch() { assert.equal(this, database); state.batches++; return state.batchResult; },
    };
    const callerResolver: SessionPrincipalResolver = { async resolve() { assert.equal(this, callerResolver); state.resolutions++; if (state.unavailable) throw new Error("secret resolver details"); return { ok: true, value: { principalId: state.principal } } as never; } };
    return { state, input: { database, callerResolver, administratorPrincipalId: admin } };
}
test("synchronous valid construction exposes only the authorized service and invokes nothing", () => {
    const { state, input } = fixture(); const composition = createPrivateFoodDraftRuntimeComposition(input);
    assert(composition.ok); assert(composition.value instanceof SingleAdminFoodDraftService); assert(!(composition instanceof Promise));
    assert.deepEqual(Object.keys(composition), ["ok", "value"]); assert.deepEqual(Object.keys(composition.value), []);
    for (const key of ["database", "repository", "callerResolver", "administratorPrincipalId"]) { assert(!(key in composition)); assert(!(key in composition.value)); }
    assert.deepEqual([state.prepares, state.batches, state.reads, state.resolutions], [0, 0, 0, 0]);
});
test("every absent, null, array and non-callable dependency fails closed", () => {
    const { input } = fixture();
    for (const outer of [undefined, null, [], false, 1, "input", () => {}, {}]) assert.deepEqual(createPrivateFoodDraftRuntimeComposition(outer as never), configurationFailure);
    for (const key of ["database", "callerResolver"] as const) {
        for (const bad of [undefined, null, [], {}, false, 1, "dependency", () => {}]) assert.deepEqual(createPrivateFoodDraftRuntimeComposition({ ...input, [key]: bad } as never), configurationFailure);
    }
    for (const [dependency, method] of [["database", "prepare"], ["database", "batch"], ["callerResolver", "resolve"]] as const) {
        for (const bad of [undefined, null, false, 1, "function", {}, []]) assert.deepEqual(createPrivateFoodDraftRuntimeComposition({ ...input, [dependency]: { ...input[dependency], [method]: bad } } as never), configurationFailure);
    }
});
test("administrator IDs are canonical and never normalized or inferred", () => {
    const { input } = fixture();
    for (const administratorPrincipalId of [undefined, null, [], 1, "", "composition-test", "principal:", " principal:composition-test", "principal:composition-test ", "principal:a:b", "food-product:composition"]) assert.deepEqual(createPrivateFoodDraftRuntimeComposition({ ...input, administratorPrincipalId } as never), configurationFailure);
});
test("throwing getters return only the fixed sanitized failure", () => {
    const { state, input } = fixture();
    const boom = () => { throw new Error("SQL/D1 secret administrator config stack"); };
    for (const key of ["database", "callerResolver", "administratorPrincipalId"]) {
        const malformed = { ...input }; Object.defineProperty(malformed, key, { get: boom }); assert.deepEqual(createPrivateFoodDraftRuntimeComposition(malformed), configurationFailure);
    }
    for (const [dependency, method] of [["database", "prepare"], ["database", "batch"], ["callerResolver", "resolve"]] as const) {
        const malformed = { ...input[dependency] }; Object.defineProperty(malformed, method, { get: boom });
        assert.deepEqual(createPrivateFoodDraftRuntimeComposition({ ...input, [dependency]: malformed } as FoodPrivateDraftRuntimeCompositionInput), configurationFailure);
    }
    assert.deepEqual([state.prepares, state.batches, state.reads, state.resolutions], [0, 0, 0, 0]);
});
test("fresh authorization after composition denies every operation without database access", async () => {
    const { state, input } = fixture(); const composition = createPrivateFoodDraftRuntimeComposition(input); assert(composition.ok); const service = composition.value;
    assert((await service.getRecipe(recipe().id, 1)).ok); assert.equal(state.resolutions, 1);
    state.prepares = 0; state.reads = 0; state.principal = "principal:other";
    const operations = [() => service.createInitialRecipe(recipe()), () => service.appendRecipeRevision(recipe(2), 1), () => service.createInitialProduct({}), () => service.appendProductRevision({}, 1), () => service.getRecipe("invalid", 1), () => service.getProduct("invalid", 1), () => service.listRecipeVersions("invalid"), () => service.listProductVersions("invalid"), () => service.listLatestRecipes(), () => service.listLatestProducts()];
    for (const operation of operations) assert.deepEqual(await operation(), { ok: false, error: { code: "forbidden", message: "Food draft access is forbidden." } });
    state.unavailable = true; assert.deepEqual(await service.listLatestRecipes(), { ok: false, error: { code: "access-unavailable", message: "Food draft access is unavailable." } });
    assert.equal(state.resolutions, 12); assert.deepEqual([state.prepares, state.batches, state.reads], [0, 0, 0]);
});
test("authorized operations reach the injected D1 adapter with exact IDs, versions, predecessor and outcomes", async () => {
    const { state, input } = fixture(); const composition = createPrivateFoodDraftRuntimeComposition(input); assert(composition.ok); const service = composition.value;
    const created = await service.createInitialRecipe(recipe()); assert(created.ok); assert.equal(created.value.outcome, "created");
    assert.equal(state.batches, 1); assert(state.statements[0].values.includes(serializeFoodRecipeDraft(recipe())));
    state.batchResult = [result([], 0), result([row()])];
    const retry = await service.createInitialRecipe(recipe()); assert(retry.ok); assert.equal(retry.value.outcome, "already-present");
    const conflict = await service.createInitialRecipe({ ...recipe(), ingredients: [] }); assert(conflict.ok); assert.equal(conflict.value.outcome, "conflict");
    state.readResult = result([row()]); const found = await service.getRecipe(recipe().id, 1); assert(found.ok); assert.equal(found.value.outcome, "found"); assert.deepEqual(state.statements.at(-1)?.values, [recipe().id, 1]);
    state.batchResult = [result([], 1), result([row(2)])]; const revision = await service.appendRecipeRevision(recipe(2), 1); assert(revision.ok); assert.equal(revision.value.outcome, "created");
    const insert = state.statements.at(-2)!; assert.deepEqual(insert.values, [recipe().id, 2, foodDraftIdentityOrderKey(recipe().id), 1, serializeFoodRecipeDraft(recipe(2)), 1, recipe().id, 2, 1]);
    state.readResult = result(); const missing = await service.getRecipe(recipe().id, 9); assert(missing.ok); assert.equal(missing.value.outcome, "not-found");
    await service.listRecipeVersions(recipe().id, { limit: 7, afterVersion: 2 }); assert.deepEqual(state.statements.at(-1)?.values, [recipe().id, 2, 8]);
    await service.listLatestRecipes({ limit: 9, afterId: recipe().id }); assert.deepEqual(state.statements.at(-1)?.values, [foodDraftIdentityOrderKey(recipe().id), 10]);
    state.readResult = result([row()]); state.batchResult = [result([], 1), result([{ product_id: "food-product:composition", version: 1, identity_order_key: foodDraftIdentityOrderKey("food-product:composition"), recipe_id: recipe().id, recipe_version: 1, serialization_format_version: 1, payload_json: JSON.stringify({ formatVersion: 1, recordType: "product", recordId: "food-product:composition", recordVersion: 1, snapshot: { evidence: [], id: "food-product:composition", recipe: { id: recipe().id, version: 1 }, version: 1 } }) }])];
    const product = await service.createInitialProduct({ id: "food-product:composition", version: 1, recipe: { id: recipe().id, version: 1 }, evidence: [] }); assert(product.ok); assert.equal(product.value.outcome, "created");
    assert(state.statements.some(s => s.sql.startsWith("INSERT INTO food_product") && s.values[5] === recipe().id && s.values[6] === 1));
});
test("source uses only composition authorities without environment/session/activation access", async () => {
    const source = await readFile(new URL("./private-draft-runtime-composition.ts", import.meta.url), "utf8"); const ast = ts.createSourceFile("composition.ts", source, ts.ScriptTarget.Latest, true);
    const imports = ast.statements.filter(ts.isImportDeclaration); assert.deepEqual(imports.map(i => (i.moduleSpecifier as ts.StringLiteral).text), ["../identity/identifiers", "../identity/session/principal-resolver", "./d1-draft-persistence", "./private-draft-service"]); assert(imports[1].importClause?.isTypeOnly);
    assert.doesNotMatch(source, /cloudflare:|globalThis|process\.|import\.meta|wrangler|RIVER_FOOD_DB|river-os|Astro|SessionStore|migration|commerce|stripe|fulfillment|accounting|community|deploy|insurance|sesh|Date\b|fetch\(|InMemory/);
});
