import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { createPrivateFoodMenuRuntimeFromServerContext as create } from "./private-menu-server-adapter";
import { parsePrincipalId } from "../identity/identifiers";
import type { AstroSessionLike } from "../identity/session/contracts";
import type { IdentityD1DatabaseLike, IdentityD1PreparedStatementLike } from "../identity/cloudflare/types";
import type { FoodD1Database } from "./d1-draft-persistence";
import { AUTHENTICATED_PRINCIPAL_SESSION_KEY } from "../identity/session/model";
const admin = parsePrincipalId("principal:menu-adapter-test");
const failure = { ok: false, error: { code: "configuration-unavailable", message: "Food menu database configuration is unavailable." } };
const source = readFileSync(new URL("./private-menu-server-adapter.ts", import.meta.url), "utf8");
function fixture() {
    const state = { events: [] as string[], raw: { version: 1, principalId: admin, authenticatedAt: "2026-10-05T00:00:00Z", expiresAt: "2026-10-06T00:00:00Z" } as unknown, now: new Date("2026-10-05T06:00:00Z"), gate: Promise.resolve(), failRead: false, failDelete: false, failDestroy: false, principal: { principal_id: admin, status: "active", display_name: null, created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-01T00:00:00Z" } as Record<string, unknown> | null, identityArgs: [] as unknown[], menuArgs: [] as (string | number | null)[] };
    const session: AstroSessionLike = {
        async get(key) { assert.equal(this, session); assert.equal(key, AUTHENTICATED_PRINCIPAL_SESSION_KEY); state.events.push("get"); await state.gate; if (state.failRead) throw new Error("private read"); return state.raw; },
        set() { state.events.push("set"); }, delete(key) { assert.equal(key, AUTHENTICATED_PRINCIPAL_SESSION_KEY); state.events.push("delete"); if (state.failDelete) throw new Error("private cleanup"); state.raw = undefined; },
        async regenerate() { state.events.push("regenerate"); }, destroy() { state.events.push("destroy"); if (state.failDestroy) throw new Error("private destroy"); state.raw = undefined; },
    };
    const identity: IdentityD1DatabaseLike = { prepare() { state.events.push("identity"); const s: IdentityD1PreparedStatementLike = { bind(...args) { state.identityArgs = args; return s; }, async first<T>() { return state.principal as T | null; }, async run() { assert.fail("Identity write"); } }; return s; } };
    const menu: FoodD1Database = { prepare() { state.events.push("menu"); const s = { bind(...args: (string | number | null)[]) { state.menuArgs = args; return s; }, async all() { return { success: true, results: [] }; } }; return s; }, async batch() { assert.fail("Unexpected batch"); } };
    const input = { environment: { RIVER_IDENTITY_DB: identity, TEST_MENU: menu }, bindingName: "TEST_MENU", session, readDependencies: { getProduct() { assert.fail("Unexpected FOOD-001 read"); }, getRecipe() { assert.fail("Unexpected FOOD-001 read"); } }, administratorPrincipalId: admin, now: () => { state.events.push("clock"); return state.now; } };
    return { state, input };
}
function invalidInputs(): unknown[] {
    const { input } = fixture(); const malformed = [undefined, null, [], 1, "bad", false]; const inputs: unknown[] = [...malformed, {}];
    for (const value of malformed) inputs.push({ ...input, environment: value }, { ...input, session: value }, { ...input, readDependencies: value }, { ...input, environment: { ...input.environment, RIVER_IDENTITY_DB: value } });
    for (const method of ["get", "set", "delete", "regenerate", "destroy"]) inputs.push({ ...input, session: { ...input.session, [method]: null } }, { ...input, session: Object.defineProperty({ ...input.session }, method, { get() { throw new Error("private"); } }) });
    for (const method of ["getProduct", "getRecipe"]) inputs.push({ ...input, readDependencies: { ...input.readDependencies, [method]: 1 } });
    for (const value of [undefined, null, 1, "admin", " principal:test", "principal:test "]) inputs.push({ ...input, administratorPrincipalId: value });
    for (const value of [null, 1, {}, "clock"]) inputs.push({ ...input, now: value });
    for (const key of Object.keys(input)) inputs.push(Object.defineProperty({ ...input }, key, { get() { throw new Error("private getter"); } }));
    inputs.push({ ...input, environment: new Proxy({}, { get() { throw new Error("private env"); } }) }, { ...input, environment: { ...input.environment, RIVER_IDENTITY_DB: { prepare: null } } }, { ...input, environment: { ...input.environment, RIVER_IDENTITY_DB: { get prepare() { throw new Error("private"); } } } });
    return inputs;
}

test("valid construction is synchronous, inert, service-only and creates independent graphs", () => {
    const f = fixture(); const a = create(f.input), b = create(f.input); assert(a.ok && b.ok); assert.deepEqual(f.state.events, []);
    assert.deepEqual(Object.keys(a), ["ok", "value"]); assert.deepEqual(Object.keys(a.value), ["service", "workspace"]); assert(Object.isFrozen(a)); assert(Object.isFrozen(a.value)); assert.equal("then" in a, false);
    assert.notEqual(a.value.service, b.value.service); assert.notEqual(a.value.workspace, b.value.workspace); assert.deepEqual(Object.keys(a.value.service), []);
    assert(!Object.isFrozen(f.input.session)); assert(!Object.isFrozen(f.input.environment));
    assert(create({ ...f.input, now: undefined }).ok); const { now: _unused, ...withoutClock } = f.input; assert(create(withoutClock).ok); assert.deepEqual(f.state.events, []);
});

test("malformed and throwing dependencies fail closed with fixed sanitized result", () => {
    for (const input of invalidInputs()) { const r = create(input as never); assert.deepEqual(r, failure); assert(Object.isFrozen(r)); assert(!r.ok && Object.isFrozen(r.error)); }
    const f = fixture(); for (const bindingName of [undefined, "bad-key", " TEST_MENU"]) assert.deepEqual(create({ ...f.input, bindingName } as never), failure);
    assert.deepEqual(create({ ...f.input, environment: { RIVER_IDENTITY_DB: f.input.environment.RIVER_IDENTITY_DB } }), failure); assert.deepEqual(f.state.events, []);
});

test("instrumented delegation preserves exact I/H references, failure identity and constructor order", () => {
    const f = fixture(); const constructed: { kind: string; args: unknown[]; instance: object }[] = []; const acquisitions: unknown[] = [], compositions: { database: unknown; readDependencies: unknown; callerResolver: unknown; administratorPrincipalId: unknown }[] = [];
    const stub = (kind: string) => class { constructor(...args: unknown[]) { constructed.push({ kind, args, instance: this }); } };
    let acquired: unknown = { ok: true, value: f.input.environment.TEST_MENU }; const capabilities = Object.freeze({ service: {}, workspace: {} }); let throwH = false;
    const exports: Record<string, typeof create> = {};
    runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, Object, require(name: string) {
        if (name === "../identity/identifiers") return { parsePrincipalId };
        if (name === "../identity/session/astro-session-adapter") return { AstroPrincipalSessionStore: stub("sessions") };
        if (name === "../identity/cloudflare/d1-principal-repository") return { D1PrincipalRepository: stub("principals") };
        if (name === "../identity/session/principal-resolver") return { DefaultSessionPrincipalResolver: stub("resolver") };
        if (name === "./private-menu-runtime-acquisition") return { acquirePrivateFoodMenuDatabaseFromEnvironment(input: unknown) { acquisitions.push(input); return acquired; } };
        if (name === "./private-menu-runtime-composition") return { createPrivateFoodMenuRuntimeComposition(input: typeof compositions[number]) { compositions.push(input); if (throwH) throw new Error("private H"); return capabilities; } };
        assert.fail(name);
    } });
    const factory = exports.createPrivateFoodMenuRuntimeFromServerContext;
    for (const bad of invalidInputs()) { assert.equal(factory(bad as never).ok, false); } assert.equal(acquisitions.length, 0); assert.equal(constructed.length, 0);
    for (let i = 0; i < 2; i++) { const r = factory(f.input); assert(r.ok && r.value === capabilities); assert.equal((acquisitions[i] as { environment: unknown }).environment, f.input.environment); assert.equal((acquisitions[i] as { bindingName: unknown }).bindingName, f.input.bindingName); const offset = i * 3; assert.equal(constructed[offset].args[0], f.input.session); assert.equal(constructed[offset].args[1], f.input.now); assert.equal(constructed[offset + 1].args[0], f.input.environment.RIVER_IDENTITY_DB); assert.equal(compositions[i].callerResolver, constructed[offset + 2].instance); assert.equal(compositions[i].database, f.input.environment.TEST_MENU); assert.equal(compositions[i].readDependencies, f.input.readDependencies); assert.equal(compositions[i].administratorPrincipalId, admin); }
    assert.deepEqual(constructed.map(c => c.kind), ["sessions", "principals", "resolver", "sessions", "principals", "resolver"]); assert.notEqual(compositions[0].callerResolver, compositions[1].callerResolver);
    const denied = Object.freeze(failure); acquired = denied; assert.equal(factory(f.input), denied); assert.equal(constructed.length, 6); assert.equal(compositions.length, 2);
    acquired = { ok: true, value: f.input.environment.TEST_MENU }; throwH = true; assert.equal(JSON.stringify(factory(f.input)), JSON.stringify(failure)); assert.deepEqual(f.state.events, []);
});

test("delayed async session is awaited, exact principal/operation arguments preserved and authorization remains fresh", async () => {
    const f = fixture(); let release!: () => void; f.state.gate = new Promise<void>(resolve => { release = resolve; }); const r = create(f.input); assert(r.ok);
    const pending = r.value.workspace.getOffer("food-serving-offer:exact" as never, 7); await Promise.resolve(); assert.deepEqual(f.state.events, ["get"]); release(); const read = await pending; assert(read.ok && read.value.outcome === "not-found");
    assert.deepEqual(f.state.identityArgs, [admin]); assert.deepEqual(f.state.menuArgs, ["food-serving-offer:exact", 7]);
    f.state.principal = { ...f.state.principal, status: "disabled" }; const denied = await r.value.service.listLatestOffers(); assert(!denied.ok && denied.error.code === "unauthenticated"); assert.equal(f.state.events.filter(e => e === "menu").length, 1); assert.equal(f.state.events.filter(e => e === "get").length, 2);
});

test("missing, malformed, expired, boundary and rejected sessions retain cleanup and fail-closed behavior", async () => {
    for (const mode of ["missing", "malformed", "expired", "boundary", "rejected", "malformed-cleanup", "expired-cleanup"] as const) {
        const f = fixture(); if (mode === "missing") f.state.raw = undefined; if (mode.startsWith("malformed")) f.state.raw = {}; if (mode.startsWith("expired")) f.state.now = new Date("2026-10-06T00:00:01Z"); if (mode === "boundary") f.state.now = new Date("2026-10-06T00:00:00Z"); if (mode === "rejected") f.state.failRead = true; if (mode.endsWith("cleanup")) f.state.failDelete = true;
        const r = create(f.input); assert(r.ok); const denied = await r.value.workspace.listLatestOffers(); assert(!denied.ok && denied.error.code === (mode === "rejected" || mode.endsWith("cleanup") ? "access-unavailable" : "unauthenticated"), mode);
        assert.equal(f.state.events.includes("identity"), false, mode); assert.equal(f.state.events.includes("menu"), false, mode); assert.equal(f.state.events.includes("delete"), mode !== "missing" && mode !== "rejected", mode);
    }
});

test("missing/inactive/mismatched principals destroy stale sessions; sync/async destruction and failures remain valid", async () => {
    for (const mode of ["missing", "inactive", "mismatched", "async-destroy", "destroy-failure"] as const) {
        const f = fixture(); if (mode === "inactive") f.state.principal = { ...f.state.principal, status: "disabled" }; else if (mode === "mismatched") f.state.principal = { ...f.state.principal, principal_id: "principal:other" }; else f.state.principal = null;
        if (mode === "async-destroy") { const original = f.input.session.destroy; f.input.session.destroy = async () => { original(); }; } if (mode === "destroy-failure") f.state.failDestroy = true;
        const r = create(f.input); assert(r.ok); const denied = await r.value.service.listLatestOffers(); assert(!denied.ok && denied.error.code === (mode === "destroy-failure" || mode === "mismatched" ? "access-unavailable" : "unauthenticated")); assert.equal(f.state.events.includes("destroy"), mode !== "mismatched"); assert(!f.state.events.includes("menu"));
    }
});

test("wrong administrator and independent request sessions never reach menu storage", async () => {
    const a = fixture(), b = fixture(); const ra = create({ ...a.input, administratorPrincipalId: parsePrincipalId("principal:other-admin") }), rb = create(b.input); assert(ra.ok && rb.ok); b.state.raw = undefined;
    const deniedA = await ra.value.workspace.listLatestOffers(), deniedB = await rb.value.workspace.listLatestOffers(); assert(!deniedA.ok && deniedA.error.code === "forbidden"); assert(!deniedB.ok && deniedB.error.code === "unauthenticated"); assert(!a.state.events.includes("menu")); assert(!b.state.events.includes("identity"));
});

test("source delegates menu acquisition/composition and excludes globals, HTTP and activation", () => {
    for (const banned of ["cloudflare:workers", "globalThis", "process.env", "import.meta", "wrangler", "FormData", "Response", "cookies", "redirect", "runAuthorized", "RIVER_FOOD", "TEST_MENU", "Date.now", "fetch(", "new D1FoodMenuRepository", "new SingleAdminFoodMenuService", "createPrivateFoodMenuWorkspaceController"]) assert.equal(source.includes(banned), false, banned);
    assert.equal((source.match(/environment\.RIVER_IDENTITY_DB/g) ?? []).length, 1);
    assert.equal((source.match(/acquirePrivateFoodMenuDatabaseFromEnvironment\(/g) ?? []).length, 1); assert.equal((source.match(/createPrivateFoodMenuRuntimeComposition\(/g) ?? []).length, 1);
});
