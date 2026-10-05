import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { SingleAdminFoodDraftService, type FoodDraftServiceErrorCode } from "./private-draft-service";
import { parsePrincipalId } from "../identity/identifiers";
import type { SessionPrincipalResolver } from "../identity/session/principal-resolver";
import { InMemoryFoodDraftRepository, FoodDraftValidationError, FoodDraftStorageError, type FoodDraftRepository } from "./draft-persistence";
import { assessFoodDraftEvidenceCompleteness } from "./draft-domain";
const administrator = parsePrincipalId("principal:test-admin");
const authorized = { ok: true, value: { principalId: administrator } };
const recipe = (version = 1) => ({ id: "food-recipe:meal", version, ingredients: [{ kind: "purchased-component", name: "Seasoning", composition: "undisclosed" }], allergenReview: { state: "unknown", declarations: [] }, process: { classification: "unknown" }, evidence: [] });
const product = () => ({ id: "food-product:meal", version: 1, recipe: { id: "food-recipe:meal", version: 1 }, temperatureControl: "unknown", cottageReview: { state: "pending" }, salesTaxReview: { state: "unknown" }, evidence: [] });
const methods: (keyof FoodDraftRepository)[] = ["createInitialRecipe", "appendRecipeRevision", "createInitialProduct", "appendProductRevision", "getRecipe", "getProduct", "listRecipeVersions", "listProductVersions", "listLatestRecipes", "listLatestProducts"];
const messages = { unauthenticated: "Authentication is required.", forbidden: "Food draft access is forbidden.", "access-unavailable": "Food draft access is unavailable.", "invalid-input": "Invalid food draft operation input.", storage: "Food draft storage is unavailable." };
function expected(code: FoodDraftServiceErrorCode) { return { ok: false, error: { code, message: messages[code] } }; }
function setup(...resolutions: [unknown?]) {
    const resolution = resolutions.length ? resolutions[0] : authorized;
    const state = { resolution, resolverCalls: 0, calls: [] as { method: string; args: unknown[] }[], outcome: Object.freeze({ outcome: "not-found" }) as unknown, thrown: undefined as unknown, reject: false };
    const resolver: SessionPrincipalResolver = { resolve: async () => { state.resolverCalls++; if (state.reject) throw state.thrown; return state.resolution as never; } };
    const repository = Object.fromEntries(methods.map(method => [method, async (...args: unknown[]) => { state.calls.push({ method, args }); if (state.thrown !== undefined) throw state.thrown; return state.outcome; }])) as unknown as FoodDraftRepository;
    const service = new SingleAdminFoodDraftService({ repository, callerResolver: resolver, administratorPrincipalId: administrator });
    return { state, service, resolver, repository };
}
async function invoke(service: SingleAdminFoodDraftService, method: keyof FoodDraftRepository, args: unknown[]) {
    return (service[method] as (...values: unknown[]) => Promise<unknown>).apply(service, args);
}
test("all ten operations deny unauthenticated, forbidden and malformed callers before touching payload or repository", async () => {
    const cases: [unknown, FoodDraftServiceErrorCode][] = [
        [{ ok: false, error: { code: "unauthenticated", message: "private detail" } }, "unauthenticated"],
        [{ ok: true, value: { principalId: "principal:other" } }, "forbidden"],
        [{ ok: false, error: { code: "unavailable", message: "SQL private detail" } }, "access-unavailable"],
        ...[null, undefined, [], {}, { ok: "true", value: { principalId: administrator } }, { ok: true }, { ok: true, value: {} }, { ok: true, value: { principalId: " principal:test-admin" } }, { ok: true, value: { principalId: "principal:test-admin " } }, { ok: true, value: { principalId: "principal:a:b" } }, { ok: true, value: { principalId: "food-product:meal" } }, { ok: true, value: { principalId: 1 } }, { ok: true, value: { principalId: administrator, admin: true } }, { ok: false, error: {} }].map(value => [value, "access-unavailable"] as [unknown, FoodDraftServiceErrorCode]),
    ];
    const payload = new Proxy({}, { get() { throw new Error("Payload accessed before authorization"); }, ownKeys() { throw new Error("Payload validated before authorization"); } });
    for (const [resolution, code] of cases) {
        const { service, state } = setup(resolution);
        for (const method of methods) assert.deepEqual(await invoke(service, method, [payload, payload]), expected(code));
        assert.equal(state.resolverCalls, 10); assert.deepEqual(state.calls, []);
    }
});
test("resolver exceptions fail closed; access is resolved fresh after prior success", async () => {
    const { service, state } = setup();
    assert.deepEqual(await service.getRecipe("food-recipe:meal", 1), { ok: true, value: state.outcome });
    state.resolution = { ok: true, value: { principalId: "principal:revoked" } };
    assert.deepEqual(await service.getRecipe("food-recipe:meal", 1), expected("forbidden"));
    state.reject = true; state.thrown = new Error("D1 SQL secret evidence stack");
    for (const method of methods) assert.deepEqual(await invoke(service, method, []), expected("access-unavailable"));
    assert.equal(state.calls.length, 1); assert.equal(state.resolverCalls, 12);
});
test("payload principal/admin/role spoofing cannot grant access", async () => {
    const { service, state } = setup({ ok: true, value: { principalId: "principal:other" } });
    const spoofed = { ...recipe(), principalId: administrator, admin: true, role: "administrator", ownerId: administrator };
    assert.deepEqual(await service.createInitialRecipe(spoofed), expected("forbidden")); assert.deepEqual(state.calls, []);
    const real = new SingleAdminFoodDraftService({ repository: new InMemoryFoodDraftRepository(), callerResolver: { resolve: async () => authorized as never }, administratorPrincipalId: administrator });
    assert.deepEqual(await real.createInitialRecipe(spoofed), expected("invalid-input"));
});
test("all operations forward exact arguments and omission, preserve repository results and method receiver", async () => {
    const { service, state } = setup(); const r = recipe(2); const p = product(); const history = { limit: 7, afterVersion: 3 }; const latest = { limit: 9, afterId: "food-recipe:z" };
    const cases: [keyof FoodDraftRepository, unknown[]][] = [
        ["createInitialRecipe", [r]], ["appendRecipeRevision", [r, 1]], ["createInitialProduct", [p]], ["appendProductRevision", [p, 8]],
        ["getRecipe", [r.id, 2]], ["getProduct", [p.id, 1]], ["listRecipeVersions", [r.id, history]], ["listProductVersions", [p.id, history]], ["listLatestRecipes", [latest]], ["listLatestProducts", [latest]],
        ["listRecipeVersions", [r.id]], ["listProductVersions", [p.id]], ["listLatestRecipes", []], ["listLatestProducts", []], ["listLatestRecipes", [undefined]],
    ];
    for (const [method, args] of cases) {
        const result = await invoke(service, method, args); assert.deepEqual(result, { ok: true, value: state.outcome });
        const call = state.calls.at(-1)!; assert.equal(call.method, method); assert.equal(call.args.length, args.length); args.forEach((v, i) => assert.equal(call.args[i], v));
    }
    assert.equal(state.resolverCalls, cases.length);
    for (const outcome of [{ outcome: "created", snapshot: r }, { outcome: "already-present", snapshot: r }, { outcome: "conflict", reason: "Same key" }, { outcome: "found", snapshot: r }, { outcome: "not-found" }, { items: [], nextCursor: r.id }]) {
        state.outcome = Object.freeze(outcome); const result = await service.getRecipe(r.id, 2); assert(result.ok); assert.equal(result.value, state.outcome);
    }
});
test("validation vs storage failures use only fixed sanitized errors", async () => {
    const { service, state } = setup();
    for (const thrown of [new FoodDraftValidationError("SQL secret evidence"), new FoodDraftStorageError("SQL private details"), new Error("Invalid input SQL secret"), new TypeError("private internals"), "secret stack"]) {
        state.thrown = thrown;
        for (const method of methods) {
            const actual = await invoke(service, method, []); assert.deepEqual(actual, expected(thrown instanceof FoodDraftValidationError ? "invalid-input" : "storage")); assert.doesNotMatch(JSON.stringify(actual), /SQL|secret|evidence|stack|internals/);
        }
    }
});
test("real repository snapshots, revisions and structural completeness remain unchanged", async () => {
    const repository = new InMemoryFoodDraftRepository();
    const service = new SingleAdminFoodDraftService({ repository, callerResolver: { resolve: async () => authorized as never }, administratorPrincipalId: administrator });
    const r = recipe(); const p = product();
    const created = await service.createInitialRecipe(r); assert(created.ok); assert.equal(created.value.outcome, "created");
    assert.equal((await service.createInitialRecipe(r)).ok, true);
    const retry = await service.createInitialRecipe(r); assert(retry.ok); assert.equal(retry.value.outcome, "already-present");
    const conflict = await service.createInitialRecipe({ ...r, ingredients: [] }); assert(conflict.ok); assert.equal(conflict.value.outcome, "conflict");
    await service.createInitialProduct(p); await service.appendRecipeRevision(recipe(2), 1);
    const readR = await service.getRecipe(r.id, 1); const readP = await service.getProduct(p.id, 1); assert(readR.ok && readR.value.outcome === "found"); assert(readP.ok && readP.value.outcome === "found");
    assert.equal(readP.value.snapshot.recipe.version, 1); assert(Object.isFrozen(readR.value.snapshot)); assert(Object.isFrozen(readR.value.snapshot.ingredients?.[0])); assert(Object.isFrozen(readP.value.snapshot.recipe));
    assert.deepEqual(assessFoodDraftEvidenceCompleteness(readP.value.snapshot, readR.value.snapshot), assessFoodDraftEvidenceCompleteness(p, r));
    const completeness = assessFoodDraftEvidenceCompleteness(readP.value.snapshot, readR.value.snapshot); assert(completeness.requiredEvidencePresent); assert(completeness.unresolvedReviews.length > 0);
    const missing = await service.getProduct("food-product:missing", 1); assert(missing.ok); assert.equal(missing.value.outcome, "not-found");
    assert.deepEqual(await service.getRecipe("bad", 1), expected("invalid-input"));
});
test("administrator configuration is canonical and captured without inference", async () => {
    const { repository, resolver } = setup();
    for (const administratorPrincipalId of [undefined, null, "", "test-admin", "principal:", " principal:test-admin", [administrator]]) assert.throws(() => new SingleAdminFoodDraftService({ repository, callerResolver: resolver, administratorPrincipalId } as never));
    const dependencies = { repository, callerResolver: resolver, administratorPrincipalId: administrator };
    const service = new SingleAdminFoodDraftService(dependencies); dependencies.administratorPrincipalId = parsePrincipalId("principal:other"); assert((await service.listLatestRecipes()).ok);
});
test("source isolation uses identity contracts only and introduces no runtime/audit/sale authority", async () => {
    const source = await readFile(new URL("./private-draft-service.ts", import.meta.url), "utf8"); const ast = ts.createSourceFile("service.ts", source, ts.ScriptTarget.Latest, true);
    const imports = ast.statements.filter(ts.isImportDeclaration);
    assert.deepEqual(imports.map(i => (i.moduleSpecifier as ts.StringLiteral).text), ["../identity/identifiers", "../identity/session/principal-resolver", "./draft-persistence"]);
    assert.equal(imports[1].importClause?.isTypeOnly, true);
    assert.doesNotMatch(source, /process\.env|import\.meta\.env|globalThis|cloudflare:|Date\b|console\.|fetch\(|randomUUID|RIVER_FOOD_DB|DefaultSessionPrincipalResolver|createSession|ownerId|actorId|auditId/);
    assert.doesNotMatch(source, /\b(?:approved|sellable|launchReady|saleReady|purchaseAuthorized)\b/);
});
