import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SingleAdminFoodMenuService, type FoodPrivateMenuService, type FoodMenuServiceErrorCode, type FoodPrivateMenuOperationGate, type FoodMenuAuthorizedCallbackResult } from "./private-menu-service";
import { AstroPrincipalSessionStore } from "../identity/session/astro-session-adapter";
import { DefaultSessionPrincipalResolver } from "../identity/session/principal-resolver";
import type { AstroSessionLike } from "../identity/session/contracts";
import type { PrincipalRepository } from "../identity/repository";
import { AUTHENTICATED_PRINCIPAL_SESSION_KEY } from "../identity/session/model";
import type { FoodMenuRepository } from "./menu-persistence";
import { InMemoryFoodMenuRepository } from "./menu-persistence";
import { InMemoryFoodDraftRepository } from "./draft-persistence";
import { parsePrincipalId } from "../identity/identifiers";
import type { SessionPrincipalResolver } from "../identity/session/principal-resolver";
import { createFoodProductId, createFoodRecipeId } from "./draft-domain";
import { createFoodDishId, createFoodServingOfferId } from "./dish-offer-domain";
import { createFoodMenuPublicationId } from "./menu-publication-domain";
const spec = JSON.parse(readFileSync(new URL("../../../.river-dev/specifications/food-002e-single-admin-private-menu-management-service-boundary.json", import.meta.url), "utf8"));
const methods = spec.service.methods as (keyof FoodPrivateMenuService)[];
const admin = parsePrincipalId("principal:river");
const allowed = { ok: true, value: { principalId: admin } };
const failure = (code: FoodMenuServiceErrorCode) => ({ ok: false, error: { code, message: spec.results.fixedMessages[code] } });
function harness() {
    const calls: { method: string; args: unknown[]; receiver: unknown }[] = []; let resolutions = 0;
    let resolution: unknown = allowed; let result: unknown = { ok: true, value: { outcome: "not-found" } }; let thrown = false;
    const repo = Object.fromEntries(methods.map(method => [method, async function(this: unknown, ...args: unknown[]) { calls.push({ method, args, receiver: this }); if (thrown) throw new Error("private SQL evidence"); return result; }])) as unknown as FoodMenuRepository;
    const resolver = { resolve: async () => { resolutions++; if (resolution instanceof Error) throw resolution; return resolution; } } as SessionPrincipalResolver;
    const service = new SingleAdminFoodMenuService({ repository: repo, callerResolver: resolver, administratorPrincipalId: admin });
    return { service, repo, resolver, calls, setResolution(v: unknown) { resolution = v; }, setResult(v: unknown) { result = v; }, throwRepository() { thrown = true; }, count: () => resolutions };
}
async function invoke(service: FoodPrivateMenuService, method: keyof FoodPrivateMenuService, args: unknown[]) { return (service[method] as (...args: unknown[]) => Promise<unknown>)(...args); }
for (const method of methods) {
    test(`${method}: denied input remains untouched and repository never called`, async () => {
        const h = harness(); const poison = new Proxy({}, { get() { throw new Error("payload used"); }, ownKeys() { throw new Error("payload inspected"); } });
        for (const [resolution, code] of [
            [{ ok: false, error: { code: "unauthenticated", message: "secret" } }, "unauthenticated"],
            [{ ok: true, value: { principalId: "principal:other" } }, "forbidden"],
            [{ ok: false, error: { code: "unavailable", message: "secret" } }, "access-unavailable"],
            [new Error("secret"), "access-unavailable"], [null, "access-unavailable"],
            [{ ok: true, value: { principalId: " principal:river" } }, "access-unavailable"],
            [{ ok: true, value: { principalId: admin, role: "admin" } }, "access-unavailable"],
            [{ ok: true, value: { principalId: admin }, [Symbol()]: true }, "access-unavailable"],
            [{ get ok() { throw new Error("private"); } }, "access-unavailable"]
        ] as const) { h.setResolution(resolution); assert.deepEqual(await invoke(h.service, method, [poison, poison, poison]), failure(code)); }
        assert.equal(h.calls.length, 0); assert.equal(h.count(), 9);
    });
    test(`${method}: exact forwarding, receiver, success and fresh authorization`, async () => {
        const h = harness(); assert.equal(h.count(), 0); assert.equal(h.calls.length, 0);
        const args = [Object.freeze({ identity: "unchanged", role: "admin" }), 7, Object.freeze({ limit: 20, afterVersion: 2 }), undefined];
        const value = Object.freeze(method.startsWith("list") ? { items: Object.freeze([]), nextCursor: undefined } : method.startsWith("get") ? { outcome: "found", snapshot: Object.freeze({ version: 7 }) } : { outcome: "created", snapshot: Object.freeze({ version: 7 }) });
        h.setResult({ ok: true, value }); const result = await invoke(h.service, method, args) as { ok: boolean; value: unknown };
        assert.equal(result.ok, true); assert.equal(result.value, value); assert.ok(Object.isFrozen(result));
        assert.equal(h.calls[0].receiver, h.repo); args.forEach((arg, i) => assert.equal(h.calls[0].args[i], arg)); assert.equal(h.calls[0].args.length, args.length);
        h.setResolution({ ok: false, error: { code: "unauthenticated", message: "revoked" } });
        assert.deepEqual(await invoke(h.service, method, args), failure("unauthenticated")); assert.equal(h.count(), 2); assert.equal(h.calls.length, 1);
    });
}
test("constructor rejects malformed dependencies and every missing callable with fixed error", () => {
    const h = harness(); const good = { repository: h.repo, callerResolver: h.resolver, administratorPrincipalId: admin };
    const bad: unknown[] = [undefined, null, [], {}, { ...good, repository: null }, { ...good, repository: [] }, { ...good, callerResolver: null }, { ...good, callerResolver: [] }, { ...good, callerResolver: { resolve: 1 } }, ...[null, undefined, 7, "principal:river ", "river"].map(id => ({ ...good, administratorPrincipalId: id })), { get repository() { throw new Error("secret"); } }];
    for (const method of methods) bad.push({ ...good, repository: { ...h.repo, [method]: undefined } });
    bad.push({ ...good, repository: { ...h.repo, get getOffer() { throw new Error("secret"); } } });
    for (const input of bad) assert.throws(() => new SingleAdminFoodMenuService(input as typeof good), { name: "TypeError", message: "Private food menu service configuration is unavailable." });
    assert.equal(h.calls.length, 0); assert.equal(h.count(), 0);
});
test("bounded success discriminants and sanitized failures", async () => {
    const h = harness();
    for (const outcome of ["created", "already-present"]) { const value = { outcome, snapshot: Object.freeze({ state: "published" }) }; h.setResult({ ok: true, value }); assert.deepEqual(await h.service.createInitialPublication({} as never), { ok: true, value }); }
    const conflict = { outcome: "conflict", reason: "different-content" }; h.setResult({ ok: true, value: conflict }); assert.deepEqual(await h.service.createInitialOffer({} as never), { ok: true, value: conflict });
    h.setResult({ ok: true, value: { outcome: "not-found" } }); assert.deepEqual(await h.service.getCurrentAvailability("food-serving-offer:x" as never, 2), { ok: true, value: { outcome: "not-found" } });
    for (const code of ["invalid-input", "storage"] as const) { h.setResult({ ok: false, error: { code, message: "private evidence SQL" } }); assert.deepEqual(await h.service.getLatestOffer("bad" as never), failure(code)); }
    for (const malformed of [null, [], {}, { ok: 1 }, { ok: true }, { ok: true, value: null }, { ok: true, value: { outcome: "found" } }, { ok: true, value: { outcome: "not-found", snapshot: {} } }, { ok: true, value: { outcome: "unknown" } }, { ok: false, error: { code: "other", message: "secret" } }, { ok: false, error: { code: "storage", message: 1 } }, { ok: true, value: { outcome: "not-found" }, extra: true }, { get ok() { throw new Error("secret"); } }, { ok: true, value: { outcome: "not-found", [Symbol()]: 1 } }]) { h.setResult(malformed); assert.deepEqual(await h.service.getLatestOffer("bad" as never), failure("storage")); }
    h.throwRepository(); assert.deepEqual(await h.service.getLatestOffer("bad" as never), failure("storage"));
});
test("page cursor envelope validation without domain input coercion", async () => {
    const h = harness();
    for (const cursor of [1, Number.MAX_SAFE_INTEGER, undefined]) { const value = { items: [], nextCursor: cursor }; h.setResult({ ok: true, value }); assert.deepEqual(await h.service.listOfferVersions("bad" as never), { ok: true, value }); }
    for (const cursor of [0, "1", 1.5, null, Number.MAX_SAFE_INTEGER + 1]) { h.setResult({ ok: true, value: { items: [], nextCursor: cursor } }); assert.deepEqual(await h.service.listOfferVersions("bad" as never), failure("storage")); }
    for (const [method, cursor] of [["listLatestPresentations", "food-dish:x"], ["listLatestOffers", "food-serving-offer:x"], ["listLatestPublications", "food-menu-publication:x"]] as const) { const value = { items: [], nextCursor: cursor }; h.setResult({ ok: true, value }); assert.deepEqual(await invoke(h.service, method, []), { ok: true, value }); h.setResult({ ok: true, value: { items: [], nextCursor: "wrong:x" } }); assert.deepEqual(await invoke(h.service, method, []), failure("storage")); }
});
test("real immutable repository preserves publication, history, retry and independent availability streams", async () => {
    const drafts = new InMemoryFoodDraftRepository(); const recipe = { id: createFoodRecipeId("rice"), version: 1, evidence: [] }; const product = { id: createFoodProductId("rice"), version: 1, recipe: { id: recipe.id, version: 1 }, evidence: [] };
    await drafts.createInitialRecipe(recipe); await drafts.createInitialProduct(product);
    const repo = new InMemoryFoodMenuRepository(drafts); const service = new SingleAdminFoodMenuService({ repository: repo, callerResolver: { resolve: async () => allowed as never }, administratorPrincipalId: admin });
    const presentation = { dishId: createFoodDishId("rice"), version: 1, product: { id: product.id, version: 1 }, recipe: { id: recipe.id, version: 1 }, name: "Rice" }; const offer = { offerId: createFoodServingOfferId("rice"), version: 1, presentation: { dishId: presentation.dishId, version: 1 }, format: { kind: "family" as const }, servingEstimate: { state: "unknown" as const } };
    assert.equal((await service.createInitialPresentation(presentation)).ok, true); assert.equal((await service.createInitialOffer(offer)).ok, true);
    assert.deepEqual(await service.getCurrentAvailability(offer.offerId, 1), { ok: true, value: { outcome: "not-found" } });
    const observation = { offer: { offerId: offer.offerId, version: 1 }, revision: 1, state: "available" as const }; const created = await service.createInitialAvailability(observation); assert.ok(created.ok); if (created.ok && "snapshot" in created.value) { assert.ok(Object.isFrozen(created.value.snapshot)); assert.notEqual(created.value.snapshot, observation); }
    const retry = await service.createInitialAvailability(observation); assert.ok(retry.ok && retry.value.outcome === "already-present"); const conflict = await service.createInitialAvailability({ ...observation, state: "sold-out" }); assert.ok(conflict.ok && conflict.value.outcome === "conflict");
    await service.appendOfferRevision({ ...offer, version: 2 }, 1); assert.deepEqual(await service.getCurrentAvailability(offer.offerId, 2), { ok: true, value: { outcome: "not-found" } });
    const publication = { publicationId: createFoodMenuPublicationId("menu"), version: 1, state: "published" as const, title: "Menu", sections: [] }; const published = await service.createInitialPublication(publication); assert.ok(published.ok && published.value.outcome === "created");
    const history = await service.listOfferVersions(offer.offerId, { limit: 1 }); assert.ok(history.ok); if (history.ok) { assert.deepEqual(history.value.items.map(s => s.version), [1]); assert.equal(history.value.nextCursor, 1); assert.ok(Object.isFrozen(history.value.items)); }
    assert.deepEqual(await service.listLatestOffers({ limit: 101 }), failure("invalid-input"));
});
test("explicit service surface and source isolation", () => {
    const h = harness(); assert.deepEqual(Object.getOwnPropertyNames(Object.getPrototypeOf(h.service)).filter(k => k !== "constructor").sort(), [...methods, "runAuthorized"].sort());
    assert.equal(methods.length, 23); assert.deepEqual(Object.keys(h.service), []);
    const source = readFileSync(new URL("./private-menu-service.ts", import.meta.url), "utf8");
    for (const forbidden of ["SingleAdminFoodDraftService", "cloudflare:workers", "FormData", "wrangler", "process.env", "fetch(", "Date.now", "Math.random", "../river-os", "stripe", "Request", "Response", "URLSearchParams", "JSON.parse", "isAuthorized", "authorizationToken"]) assert.equal(source.includes(forbidden), false, forbidden);
});

const callbackFailure = { ok: false, error: { code: "callback-failed", message: "Private food menu operation could not be completed." } };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }

test("FOOD-002K: denied and malformed callers never inspect/invoke callbacks or access repository", async () => {
    const h = harness(); let callbacks = 0;
    const poison = new Proxy(function () { callbacks++; }, { get() { assert.fail("Callback inspected"); }, apply() { assert.fail("Callback invoked"); } });
    const malformed: unknown[] = [undefined, null, [], {}, { ok: 1 }, { ok: true, value: null }, { ok: true, value: { principalId: "principal:a:b" } }, { ok: true, value: { principalId: " principal:river" } }, { ok: true, value: { principalId: "principal:river " } }, { ok: true, value: { principalId: 1 } }, { ok: true, value: { principalId: admin, role: "admin" } }, { ok: true, value: { principalId: admin }, [Symbol()]: true }, { ok: false, error: { code: "unavailable", message: 1 } }, { get ok() { throw new Error("private resolution"); } }, new Error("private resolver")];
    const cases: [unknown, FoodMenuServiceErrorCode][] = [
        [{ ok: false, error: { code: "unauthenticated", message: "private" } }, "unauthenticated"],
        [{ ok: true, value: { principalId: "principal:other" } }, "forbidden"],
        [{ ok: false, error: { code: "unavailable", message: "private" } }, "access-unavailable"],
        ...malformed.map(value => [value, "access-unavailable"] as [unknown, FoodMenuServiceErrorCode]),
    ];
    for (const [resolution, code] of cases) {
        h.setResolution(resolution);
        for (const callback of [poison, null, {}]) {
            const result = await h.service.runAuthorized(callback as never);
            assert.deepEqual(result, failure(code)); assert(Object.isFrozen(result)); assert(!result.ok && Object.isFrozen(result.error));
        }
    }
    assert.equal(callbacks, 0); assert.equal(h.count(), cases.length * 3); assert.equal(h.calls.length, 0);
});

test("FOOD-002K: fresh gate preserves opaque sync/async values, zero arguments and construction purity", async () => {
    const h = harness(); const gate: FoodPrivateMenuOperationGate = h.service; const narrow: FoodPrivateMenuService = h.service;
    assert.equal(narrow, h.service); assert.equal(h.count(), 0); assert.equal(h.calls.length, 0);
    const opaque = { ok: false, error: { code: "domain-result", message: "opaque" } }; let calls = 0;
    const sync: FoodMenuAuthorizedCallbackResult<typeof opaque> = await gate.runAuthorized(function (...args: unknown[]) { assert.deepEqual(args, []); calls++; return opaque; });
    assert(sync.ok); assert.equal(sync.value, opaque); assert(Object.isFrozen(sync)); assert(!Object.isFrozen(opaque));
    const wait = deferred<void>(); const started = deferred<void>(); let settled = false;
    const pending = gate.runAuthorized(async function (...args: unknown[]) { assert.deepEqual(args, []); calls++; started.resolve(); await wait.promise; return opaque; }).then(r => { settled = true; return r; });
    await started.promise; assert.equal(settled, false); wait.resolve(); const asyncResult = await pending;
    assert(asyncResult.ok); assert.equal(asyncResult.value, opaque); assert(!Object.isFrozen(opaque)); assert.equal(calls, 2);
    assert.deepEqual(await gate.runAuthorized(() => undefined), { ok: true, value: undefined });
    h.setResolution({ ok: true, value: { principalId: "principal:revoked" } });
    assert.deepEqual(await gate.runAuthorized(() => { calls++; }), failure("forbidden"));
    assert.equal(calls, 2); assert.equal(h.count(), 4); assert.equal(h.calls.length, 0);
});

test("FOOD-002K: callback exceptions, rejected thenables and noncallables are sanitized without retry", async () => {
    const h = harness(); let calls = 0;
    for (const callback of [() => { calls++; throw new Error("SQL evidence secret stack"); }, async () => { calls++; throw { privatePayload: "secret" }; }, () => { calls++; return { then(_resolve: unknown, reject: (reason: unknown) => void) { reject("private rejected value"); } }; }]) {
        const result = await h.service.runAuthorized(callback as () => unknown);
        assert.deepEqual(result, callbackFailure); assert(Object.isFrozen(result)); assert(!result.ok && Object.isFrozen(result.error));
    }
    for (const bad of [undefined, null, [], {}, 1, "callback"]) assert.deepEqual(await h.service.runAuthorized(bad as never), callbackFailure);
    assert.equal(calls, 3); assert.equal(h.count(), 9); assert.equal(h.calls.length, 0);
    h.setResult({ ok: false, error: { code: "callback-failed", message: "private" } });
    assert.deepEqual(await h.service.getLatestOffer("bad" as never), failure("storage"));
});

test("FOOD-002K: concurrent out-of-order resolutions never share authorization decisions", async () => {
    const h = harness(); const resolutions = [deferred<Awaited<ReturnType<SessionPrincipalResolver["resolve"]>>>(), deferred<Awaited<ReturnType<SessionPrincipalResolver["resolve"]>>>()]; let resolveCalls = 0; const callbacks: string[] = [];
    h.resolver.resolve = () => resolutions[resolveCalls++].promise;
    const first = h.service.runAuthorized(() => { callbacks.push("first"); return "first"; });
    const second = h.service.runAuthorized(() => { callbacks.push("second"); return "second"; });
    assert.equal(resolveCalls, 2); assert.deepEqual(callbacks, []);
    resolutions[1].resolve(allowed as never); assert.deepEqual(await second, { ok: true, value: "second" });
    resolutions[0].resolve({ ok: true, value: { principalId: parsePrincipalId("principal:other") } });
    assert.deepEqual(await first, failure("forbidden")); assert.deepEqual(callbacks, ["second"]); assert.equal(h.calls.length, 0);
});

test("FOOD-002K: gate does not transfer permission to any of the 23 independently authorized operations", async () => {
    for (const method of methods) {
        const h = harness(); const args = [{} as never, 7, undefined];
        const denied = await h.service.runAuthorized(() => { h.setResolution({ ok: false, error: { code: "unauthenticated", message: "revoked" } }); return invoke(h.service, method, args); });
        assert(denied.ok); assert.deepEqual(denied.value, failure("unauthenticated")); assert.equal(h.count(), 2); assert.equal(h.calls.length, 0);
        h.setResolution(allowed);
        const value = method.startsWith("list") ? { items: [] } : method.startsWith("get") ? { outcome: "not-found" } : { outcome: "created", snapshot: {} };
        h.setResult({ ok: true, value });
        const result = await h.service.runAuthorized(() => invoke(h.service, method, args));
        assert(result.ok); assert.deepEqual(result.value, { ok: true, value }); assert.equal(h.count(), 4); assert.equal(h.calls.length, 1); assert.equal(h.calls[0].method, method); assert.equal(h.calls[0].receiver, h.repo);
        args.forEach((arg, i) => assert.equal(h.calls[0].args[i], arg));
    }
});

function asyncSessionGate() {
    const h = harness(); const events: string[] = []; let raw: unknown = { version: 1, principalId: admin, authenticatedAt: "2026-10-05T00:00:00Z", expiresAt: "2026-10-06T00:00:00Z" };
    let now = new Date("2026-10-05T12:00:00Z"); let readFailure = false; let cleanupFailure = false; let destroyFailure = false; let principalMode = "active";
    let wait = Promise.resolve(); const started = deferred<void>();
    const session: AstroSessionLike = {
        async get(key) { assert.equal(key, AUTHENTICATED_PRINCIPAL_SESSION_KEY); events.push("get"); started.resolve(); await wait; if (readFailure) throw new Error("private read"); return raw; },
        set() { events.push("set"); }, delete(key) { assert.equal(key, AUTHENTICATED_PRINCIPAL_SESSION_KEY); events.push("delete"); if (cleanupFailure) throw new Error("private cleanup"); },
        async regenerate() { events.push("regenerate"); }, destroy() { events.push("destroy"); if (destroyFailure) throw new Error("private destruction"); },
    };
    const principals = { async getPrincipal(id: unknown) { assert.equal(id, admin); events.push("lookup"); if (principalMode === "missing") return { ok: false, error: { code: "not-found", message: "missing" } }; return { ok: true, value: { principalId: principalMode === "mismatched" ? parsePrincipalId("principal:other") : admin, status: principalMode === "disabled" ? "disabled" : "active" } }; } } as unknown as PrincipalRepository;
    const resolver = new DefaultSessionPrincipalResolver({ sessions: new AstroPrincipalSessionStore(session, () => now), principals });
    const service = new SingleAdminFoodMenuService({ repository: h.repo, callerResolver: resolver, administratorPrincipalId: admin });
    return { service, session, events, started, calls: h.calls, raw(v: unknown) { raw = v; }, now(v: string) { now = new Date(v); }, wait(v: Promise<void>) { wait = v; }, rejectRead() { readFailure = true; }, failCleanup() { cleanupFailure = true; }, principal(v: string) { principalMode = v; }, failDestroy() { destroyFailure = true; } };
}

test("FOOD-002K: real resolver awaits delayed Astro-like reads before continuation, without construction I/O", async () => {
    const f = asyncSessionGate(); assert.deepEqual(f.events, []); const wait = deferred<void>(); f.wait(wait.promise); let callbacks = 0;
    const pending = f.service.runAuthorized(() => { callbacks++; return "done"; });
    await f.started.promise; assert.deepEqual(f.events, ["get"]); assert.equal(callbacks, 0);
    wait.resolve(); assert.deepEqual(await pending, { ok: true, value: "done" }); assert.deepEqual(f.events, ["get", "lookup"]); assert.equal(callbacks, 1); assert.equal(f.calls.length, 0);
});

test("FOOD-002K: inherited async-session cleanup, expiry, rejected reads and principal destruction fail closed", async () => {
    for (const mode of ["missing", "null", "malformed", "expired", "boundary", "rejected", "cleanup-malformed", "cleanup-expired", "missing-principal", "disabled", "mismatched", "async-destroy", "destroy-failure"]) {
        const f = asyncSessionGate();
        if (mode === "missing") f.raw(undefined); if (mode === "null") f.raw(null); if (mode.includes("malformed")) f.raw({});
        if (mode.includes("expired")) f.now("2026-10-06T00:00:01Z"); if (mode === "boundary") f.now("2026-10-06T00:00:00Z");
        if (mode === "rejected") f.rejectRead(); if (mode.startsWith("cleanup")) f.failCleanup();
        if (["missing-principal", "async-destroy", "destroy-failure"].includes(mode)) f.principal("missing"); if (["disabled", "mismatched"].includes(mode)) f.principal(mode);
        if (mode === "async-destroy") { const destroy = f.session.destroy; f.session.destroy = async () => { destroy(); }; }
        if (mode === "destroy-failure") f.failDestroy();
        const unavailable = mode === "rejected" || mode.startsWith("cleanup") || mode === "destroy-failure";
        assert.deepEqual(await f.service.runAuthorized(() => assert.fail("Denied callback invoked")), failure(unavailable ? "access-unavailable" : "unauthenticated"), mode);
        assert.equal(f.calls.length, 0); assert.equal(f.events.includes("delete"), ["malformed", "expired", "boundary", "cleanup-malformed", "cleanup-expired"].includes(mode), mode);
        assert.equal(f.events.includes("lookup"), ["missing-principal", "disabled", "mismatched", "async-destroy", "destroy-failure"].includes(mode), mode);
        assert.equal(f.events.includes("destroy"), f.events.includes("lookup"), mode);
    }
});
