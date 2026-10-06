import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SingleAdminFoodMenuService, type FoodPrivateMenuService, type FoodMenuServiceErrorCode } from "./private-menu-service";
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
    const h = harness(); assert.deepEqual(Object.getOwnPropertyNames(Object.getPrototypeOf(h.service)).filter(k => k !== "constructor").sort(), [...methods].sort());
    const source = readFileSync(new URL("./private-menu-service.ts", import.meta.url), "utf8");
    for (const forbidden of ["SingleAdminFoodDraftService", "runAuthorized", "cloudflare:workers", "FormData", "wrangler", "process.env", "fetch(", "Date.now", "Math.random", "../river-os", "stripe"]) assert.equal(source.includes(forbidden), false, forbidden);
});
