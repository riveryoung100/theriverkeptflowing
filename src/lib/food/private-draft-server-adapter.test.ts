import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { createPrivateFoodDraftRuntimeFromServerContext, createPrivateFoodDraftRuntimeCapabilitiesFromServerContext } from "./private-draft-server-adapter";
import type { AstroSessionLike } from "../identity/session/contracts";
import type { IdentityD1DatabaseLike, IdentityD1PreparedStatementLike } from "../identity/cloudflare/types";
import { AUTHENTICATED_PRINCIPAL_SESSION_KEY } from "../identity/session/model";
import { foodDraftIdentityOrderKey, type FoodD1Database, type FoodD1Result, type FoodD1Statement } from "./d1-draft-persistence";
import { serializeFoodRecipeDraft } from "./draft-persistence";

const failure = { ok: false, error: { code: "configuration-unavailable", message: "Food draft runtime configuration is unavailable." } };
const admin = "principal:server-test";
const payload = () => ({ version: 1, principalId: admin, authenticatedAt: "2026-10-05T00:00:00Z", expiresAt: "2026-10-05T12:00:00Z" });
const recipe = (version = 1) => ({ id: "food-recipe:server-test", version, evidence: [] });
test("capability server construction is inert, request-isolated and preserves fresh async authorization", async () => {
    const first = fixture(), second = fixture(); second.state.raw = undefined;
    const a = createPrivateFoodDraftRuntimeCapabilitiesFromServerContext(first.input), b = createPrivateFoodDraftRuntimeCapabilitiesFromServerContext(second.input); assert(a.ok && b.ok);
    assert.equal(a.value.service, a.value.gate); assert.notEqual(a.value.service, b.value.service); assert(Object.isFrozen(a.value)); assert.deepEqual(Object.keys(a.value), ["service", "gate"]); assert.deepEqual(Object.keys(a.value.service), []);
    assert.deepEqual(first.state.events, []); assert.deepEqual(second.state.events, []);
    const denied = await b.value.gate.runAuthorized(() => assert.fail("denied callback")); assert(!denied.ok && denied.error.code === "unauthenticated"); assert.equal(second.state.foodStatements.length, 0);
    const allowed = await a.value.gate.runAuthorized(() => "opaque"); assert.deepEqual(allowed, { ok: true, value: "opaque" }); assert.equal(first.state.foodStatements.length, 0);
    first.state.raw = undefined;
    const revoked = await a.value.service.getRecipe(recipe().id, 1); assert(!revoked.ok && revoked.error.code === "unauthenticated"); assert.equal(first.state.foodStatements.length, 0);
    for (const bad of invalidInputs()) assert.deepEqual(createPrivateFoodDraftRuntimeCapabilitiesFromServerContext(bad as never), failure);
});

test("capability server companion forwards original environment and fresh identity instances through F companion", async () => {
    const source = await readFile(new URL("./private-draft-server-adapter.ts", import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const constructed: { kind: string; args: unknown[]; instance: object }[] = [], calls: { environment: unknown; callerResolver: unknown }[] = [];
    const stub = (kind: string) => class { constructor(...args: unknown[]) { constructed.push({ kind, args, instance: this }); } };
    const downstream = { ok: true, value: { service: {}, gate: {} } }; const exports: Record<string, (input: unknown) => unknown> = {};
    const modules: Record<string, unknown> = {
        "../identity/session/astro-session-adapter": { AstroPrincipalSessionStore: stub("sessions") },
        "../identity/cloudflare/d1-principal-repository": { D1PrincipalRepository: stub("principals") },
        "../identity/session/principal-resolver": { DefaultSessionPrincipalResolver: stub("resolver") },
        "./private-draft-runtime-acquisition": { createPrivateFoodDraftRuntimeCapabilitiesFromEnvironment(value: { environment: unknown; callerResolver: unknown }) { calls.push(value); return downstream; }, createPrivateFoodDraftRuntimeFromEnvironment() { assert.fail("wrong delegation"); } },
    };
    runInNewContext(compiled, { exports, require(name: string) { assert(name in modules); return modules[name]; } });
    const factory = exports.createPrivateFoodDraftRuntimeCapabilitiesFromServerContext;
    for (const bad of invalidInputs()) assert.equal(JSON.stringify(factory(bad)), JSON.stringify(failure)); assert.equal(constructed.length, 0); assert.equal(calls.length, 0);
    const { input, state } = fixture();
    const environment = new Proxy(input.environment, { get(target, key, receiver) { assert.equal(key, "RIVER_IDENTITY_DB"); return Reflect.get(target, key, receiver); } });
    assert.equal(factory({ ...input, environment }), downstream); assert.equal(factory({ ...input, environment }), downstream);
    assert.deepEqual(constructed.map(item => item.kind), ["sessions", "principals", "resolver", "sessions", "principals", "resolver"]);
    assert.equal(constructed[0].args[0], input.session); assert.equal(constructed[0].args[1], input.now); assert.equal(constructed[1].args[0], input.environment.RIVER_IDENTITY_DB);
    assert.equal(calls[0].environment, environment); assert.equal(calls[1].environment, environment); assert.equal(calls[0].callerResolver, constructed[2].instance); assert.equal(calls[1].callerResolver, constructed[5].instance); assert.notEqual(calls[0].callerResolver, calls[1].callerResolver);
    assert.deepEqual(state.events, []);
});
const row = (version = 1) => ({ recipe_id: recipe().id, version, identity_order_key: foodDraftIdentityOrderKey(recipe().id), serialization_format_version: 1, payload_json: serializeFoodRecipeDraft(recipe(version)) });
const result = (results: unknown[] = [], changes = 0): FoodD1Result => ({ success: true, results, meta: { changes } });

function fixture() {
    const state = {
        events: [] as string[], raw: payload() as unknown, readGate: Promise.resolve(), failRead: false, failDelete: false, failDestroy: false,
        now: new Date("2026-10-05T06:00:00Z"), principal: { principal_id: admin, status: "active", display_name: null, created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-01T00:00:00Z" } as Record<string, unknown> | null,
        identityValues: [] as unknown[], foodStatements: [] as { sql: string; values: (string | number | null)[] }[], readResult: result(), batchResult: [result([], 1), result([row()])] as readonly FoodD1Result[],
    };
    const session: AstroSessionLike = {
        async get(key) { assert.equal(this, session); assert.equal(key, AUTHENTICATED_PRINCIPAL_SESSION_KEY); state.events.push("get"); await state.readGate; if (state.failRead) throw new Error("private read details"); return state.raw; },
        set() { state.events.push("set"); },
        delete(key) { assert.equal(key, AUTHENTICATED_PRINCIPAL_SESSION_KEY); state.events.push("delete"); if (state.failDelete) throw new Error("private cleanup"); state.raw = undefined; },
        async regenerate() { state.events.push("regenerate"); },
        destroy() { state.events.push("destroy"); if (state.failDestroy) throw new Error("private destruction"); state.raw = undefined; },
    };
    const identity: IdentityD1DatabaseLike = { prepare() {
        assert.equal(this, identity); state.events.push("identity-prepare");
        const statement: IdentityD1PreparedStatementLike = {
            bind(...values) { state.identityValues = values; return statement; },
            async first<T>() { state.events.push("identity-first"); return state.principal as T | null; },
            async run() { throw new Error("unexpected identity write"); },
        }; return statement;
    } };
    const food: FoodD1Database = {
        prepare(sql) {
            assert.equal(this, food); state.events.push("food-prepare"); const recorded = { sql, values: [] as (string | number | null)[] }; state.foodStatements.push(recorded);
            const statement: FoodD1Statement = { bind(...values) { recorded.values = values; return statement; }, async all() { state.events.push("food-all"); return state.readResult; } }; return statement;
        },
        async batch() { state.events.push("food-batch"); return state.batchResult; },
    };
    const now = () => { state.events.push("clock"); return state.now; };
    return { state, input: { environment: { RIVER_IDENTITY_DB: identity, RIVER_FOOD_DB: food, RIVER_FOOD_ADMIN_PRINCIPAL_ID: admin }, session, now } };
}

function invalidInputs(): unknown[] {
    const { input } = fixture(); const malformed = [undefined, null, [], {}, 1, false, "input", () => {}];
    const cases: unknown[] = [...malformed];
    for (const bad of malformed) cases.push({ ...input, environment: bad }, { ...input, session: bad }, { ...input, environment: { ...input.environment, RIVER_IDENTITY_DB: bad } });
    for (const method of ["get", "set", "delete", "regenerate", "destroy"]) for (const bad of malformed.filter(v => typeof v !== "function")) cases.push({ ...input, session: { ...input.session, [method]: bad } });
    for (const bad of malformed.filter(v => typeof v !== "function")) cases.push({ ...input, environment: { ...input.environment, RIVER_IDENTITY_DB: { prepare: bad } } });
    for (const bad of [null, [], {}, false, 1, "clock"]) cases.push({ ...input, now: bad });
    const boom = () => { throw new Error("private dependency configuration"); };
    for (const key of ["environment", "session", "now"]) cases.push(Object.defineProperty({ ...input }, key, { get: boom }));
    cases.push({ ...input, environment: Object.defineProperty({ ...input.environment }, "RIVER_IDENTITY_DB", { get: boom }) });
    cases.push({ ...input, environment: { ...input.environment, RIVER_IDENTITY_DB: Object.defineProperty({}, "prepare", { get: boom }) } });
    for (const method of ["get", "set", "delete", "regenerate", "destroy"]) cases.push({ ...input, session: Object.defineProperty({ ...input.session }, method, { get: boom }) });
    return cases;
}

test("valid synchronous construction exposes only service with no dependency calls", () => {
    const { state, input } = fixture();
    for (const supplied of [input, { environment: input.environment, session: input.session }, { ...input, now: undefined }]) {
        const acquired = createPrivateFoodDraftRuntimeFromServerContext(supplied); assert(acquired.ok); assert(!(acquired instanceof Promise));
        assert.deepEqual(Object.keys(acquired), ["ok", "value"]); assert.deepEqual(Object.keys(acquired.value), []);
        for (const key of ["environment", "session", "database", "resolver", "repository", "administratorPrincipalId"]) { assert(!(key in acquired)); assert(!(key in acquired.value)); }
    }
    assert.equal(state.events.length, 0);
});

test("malformed and throwing dependencies fail closed with fixed sanitized failure", () => {
    for (const input of invalidInputs()) assert.deepEqual(createPrivateFoodDraftRuntimeFromServerContext(input as never), failure);
    const { input, state } = fixture();
    for (const environment of [{ RIVER_IDENTITY_DB: input.environment.RIVER_IDENTITY_DB }, { ...input.environment, RIVER_FOOD_DB: null }, { ...input.environment, RIVER_FOOD_ADMIN_PRINCIPAL_ID: " principal:server-test" }]) assert.deepEqual(createPrivateFoodDraftRuntimeFromServerContext({ ...input, environment }), failure);
    assert.equal(state.events.length, 0);
});

test("instrumented constructors prove validation ordering, exact references, fresh components and untouched food keys", async () => {
    const source = await readFile(new URL("./private-draft-server-adapter.ts", import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const constructed: { kind: string; args: unknown[]; instance: object }[] = []; const calls: { environment: unknown; callerResolver: unknown }[] = [];
    const stub = (kind: string) => class { constructor(...args: unknown[]) { constructed.push({ kind, args, instance: this }); } };
    let downstream: unknown = { ok: true, value: {} }; const exports: Record<string, (input: unknown) => unknown> = {};
    const modules: Record<string, unknown> = {
        "../identity/session/astro-session-adapter": { AstroPrincipalSessionStore: stub("sessions") },
        "../identity/cloudflare/d1-principal-repository": { D1PrincipalRepository: stub("principals") },
        "../identity/session/principal-resolver": { DefaultSessionPrincipalResolver: stub("resolver") },
        "./private-draft-runtime-acquisition": { createPrivateFoodDraftRuntimeFromEnvironment(input: { environment: unknown; callerResolver: unknown }) { calls.push(input); return downstream; } },
    };
    runInNewContext(compiled, { exports, require(name: string) { assert(name in modules); return modules[name]; } });
    const factory = exports.createPrivateFoodDraftRuntimeFromServerContext!;
    for (const bad of invalidInputs()) assert.equal(JSON.stringify(factory(bad)), JSON.stringify(failure));
    assert.equal(constructed.length, 0); assert.equal(calls.length, 0);
    const { input, state } = fixture(); const reads: string[] = [];
    const environment = new Proxy(input.environment, { get(target, key, receiver) { assert.equal(key, "RIVER_IDENTITY_DB"); reads.push(String(key)); return Reflect.get(target, key, receiver); } });
    for (let i = 0; i < 2; i++) assert.equal(factory({ ...input, environment }), downstream);
    assert.deepEqual(reads, ["RIVER_IDENTITY_DB", "RIVER_IDENTITY_DB"]);
    assert.deepEqual(constructed.map(c => c.kind), ["sessions", "principals", "resolver", "sessions", "principals", "resolver"]);
    assert.equal(constructed[0].args[0], input.session); assert.equal(constructed[0].args[1], input.now); assert.equal(constructed[1].args[0], input.environment.RIVER_IDENTITY_DB);
    const resolverArgs = constructed[2].args[0] as { sessions: unknown; principals: unknown };
    assert.equal(resolverArgs.sessions, constructed[0].instance); assert.equal(resolverArgs.principals, constructed[1].instance);
    assert.equal(calls[0].environment, environment); assert.equal(calls[0].callerResolver, constructed[2].instance); assert.notEqual(calls[0].callerResolver, calls[1].callerResolver);
    downstream = failure; assert.equal(factory(input), failure); assert.equal(state.events.length, 0);
});

test("delayed async session read is awaited and request instances remain isolated with fresh authorization", async () => {
    const first = fixture(); const second = fixture(); second.state.raw = undefined;
    const a = createPrivateFoodDraftRuntimeFromServerContext(first.input); const b = createPrivateFoodDraftRuntimeFromServerContext(second.input); assert(a.ok && b.ok);
    let release!: () => void; first.state.readGate = new Promise<void>(resolve => { release = resolve; });
    let settled = false; const pending = a.value.getRecipe(recipe().id, 1).then(value => { settled = true; return value; });
    await Promise.resolve(); assert.equal(settled, false); assert.deepEqual(first.state.events, ["get"]);
    const denied = await b.value.getRecipe(recipe().id, 1); assert(!denied.ok); assert.equal(denied.error.code, "unauthenticated"); assert.deepEqual(second.state.events, ["get"]);
    release(); const resolved = await pending; assert(resolved.ok); assert.equal(resolved.value.outcome, "not-found"); assert.deepEqual(first.state.identityValues, [admin]);
    first.state.events.length = 0; first.state.raw = undefined;
    const later = await a.value.getRecipe(recipe().id, 1); assert(!later.ok); assert.equal(later.error.code, "unauthenticated"); assert.deepEqual(first.state.events, ["get"]);
});

test("session/principal failure and cleanup semantics deny before every food call", async () => {
    for (const scenario of ["missing", "malformed", "expired", "boundary", "read-failure", "delete-failure", "expired-delete-failure", "missing-principal", "inactive", "mismatch", "destroy-failure", "wrong-admin"] as const) {
        const { input, state } = fixture();
        if (scenario === "missing") state.raw = null;
        if (scenario === "malformed" || scenario === "delete-failure") state.raw = {};
        if (scenario === "expired" || scenario === "expired-delete-failure") state.now = new Date("2026-10-05T12:00:00.001Z");
        if (scenario === "boundary") state.now = new Date(payload().expiresAt);
        state.failRead = scenario === "read-failure"; state.failDelete = scenario === "delete-failure" || scenario === "expired-delete-failure";
        if (scenario === "missing-principal" || scenario === "destroy-failure") state.principal = null;
        if (scenario === "inactive") state.principal!.status = "disabled";
        if (scenario === "mismatch") state.principal!.principal_id = "principal:other";
        if (scenario === "wrong-admin") input.environment.RIVER_FOOD_ADMIN_PRINCIPAL_ID = "principal:other";
        state.failDestroy = scenario === "destroy-failure";
        const acquired = createPrivateFoodDraftRuntimeFromServerContext(input); assert(acquired.ok); assert.equal(state.events.length, 0);
        const denied = await acquired.value.getRecipe("invalid", 1); assert(!denied.ok);
        const unavailable = ["read-failure", "delete-failure", "expired-delete-failure", "destroy-failure", "mismatch"].includes(scenario);
        assert.equal(denied.error.code, unavailable ? "access-unavailable" : scenario === "wrong-admin" ? "forbidden" : "unauthenticated");
        assert(!state.events.some(e => e.startsWith("food")));
        if (scenario === "missing" || scenario === "read-failure") assert.deepEqual(state.events, ["get"]);
        if (["malformed", "expired", "boundary", "delete-failure", "expired-delete-failure"].includes(scenario)) { assert(state.events.includes("delete")); assert(!state.events.includes("identity-prepare")); }
        if (["missing-principal", "inactive", "destroy-failure"].includes(scenario)) assert(state.events.includes("destroy"));
    }
});

test("authorized operations preserve canonical appends, exact reads, revisions, cursors and outcomes", async () => {
    const { input, state } = fixture(); const acquired = createPrivateFoodDraftRuntimeFromServerContext(input); assert(acquired.ok); const service = acquired.value;
    const created = await service.createInitialRecipe(recipe()); assert(created.ok); assert.equal(created.value.outcome, "created");
    assert(state.foodStatements[0].values.includes(serializeFoodRecipeDraft(recipe()))); assert.deepEqual(state.identityValues, [admin]);
    state.batchResult = [result([], 0), result([row()])];
    const retry = await service.createInitialRecipe(recipe()); assert(retry.ok); assert.equal(retry.value.outcome, "already-present");
    const conflict = await service.createInitialRecipe({ ...recipe(), ingredients: [] }); assert(conflict.ok); assert.equal(conflict.value.outcome, "conflict");
    state.readResult = result([row()]); const found = await service.getRecipe(recipe().id, 1); assert(found.ok); assert.equal(found.value.outcome, "found"); assert.deepEqual(state.foodStatements.at(-1)?.values, [recipe().id, 1]);
    state.batchResult = [result([], 1), result([row(2)])]; const revision = await service.appendRecipeRevision(recipe(2), 1); assert(revision.ok); assert.equal(revision.value.outcome, "created");
    assert.deepEqual(state.foodStatements.at(-2)?.values, [recipe().id, 2, foodDraftIdentityOrderKey(recipe().id), 1, serializeFoodRecipeDraft(recipe(2)), 1, recipe().id, 2, 1]);
    state.readResult = result(); await service.listRecipeVersions(recipe().id, { limit: 7, afterVersion: 2 }); assert.deepEqual(state.foodStatements.at(-1)?.values, [recipe().id, 2, 8]);
    await service.listLatestRecipes({ limit: 9, afterId: recipe().id }); assert.deepEqual(state.foodStatements.at(-1)?.values, [foodDraftIdentityOrderKey(recipe().id), 10]);
});

test("source only constructs required identity components and delegates food acquisition", async () => {
    const source = await readFile(new URL("./private-draft-server-adapter.ts", import.meta.url), "utf8"); const ast = ts.createSourceFile("adapter.ts", source, ts.ScriptTarget.Latest, true);
    const imports = ast.statements.filter(ts.isImportDeclaration);
    assert.deepEqual(imports.map(i => (i.moduleSpecifier as ts.StringLiteral).text), ["../identity/session/astro-session-adapter", "../identity/session/principal-resolver", "../identity/session/contracts", "../identity/cloudflare/d1-principal-repository", "../identity/cloudflare/types", "./private-draft-runtime-acquisition", "./private-draft-runtime-composition"]);
    assert.doesNotMatch(source, /cloudflare:|globalThis|process\.|import\.meta|wrangler|river-os|RIVER_FOOD_DB|RIVER_FOOD_ADMIN_PRINCIPAL_ID|migration|commerce|stripe|fulfillment|accounting|community|deploy|insurance|sesh|fetch\(|InMemory|Response|cookies|redirect/);
});
