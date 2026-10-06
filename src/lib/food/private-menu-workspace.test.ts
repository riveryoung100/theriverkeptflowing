import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createPrivateFoodMenuWorkspaceController, getFoodMenuPublicationWorkspaceLabel, FOOD_MENU_WORKSPACE_FEEDBACK } from "./private-menu-workspace";
import { SingleAdminFoodMenuService, type FoodPrivateMenuService, type FoodMenuServiceErrorCode } from "./private-menu-service";
import type { FoodMenuRepository } from "./menu-persistence";
import { parsePrincipalId } from "../identity/identifiers";
const spec = JSON.parse(readFileSync(new URL("../../../.river-dev/specifications/food-002f-private-menu-workspace-controller-boundary.json", import.meta.url), "utf8"));
const methods = spec.controller.methods as (keyof FoodPrivateMenuService)[];
const fail = (code: FoodMenuServiceErrorCode) => ({ ok: false, error: { code, message: FOOD_MENU_WORKSPACE_FEEDBACK[code] } });
function fixture() {
    const calls: { method: string; args: unknown[]; receiver: unknown }[] = [];
    let reply: unknown = { ok: true, value: { outcome: "not-found" } }; let thrown = false;
    const responses = new Map<string, unknown>();
    const service = Object.fromEntries(methods.map(method => [method, async function(this: unknown, ...args: unknown[]) { calls.push({ method, args, receiver: this }); if (thrown) throw new Error("private SQL evidence"); return responses.has(method) ? responses.get(method) : reply; }])) as unknown as FoodPrivateMenuService;
    const controller = createPrivateFoodMenuWorkspaceController(service);
    return { service, controller, calls, reply(value: unknown) { reply = value; }, respond(method: string, value: unknown) { responses.set(method, value); }, throwService() { thrown = true; } };
}
async function invoke(f: ReturnType<typeof fixture>, method: keyof FoodPrivateMenuService, args: unknown[]) { return (f.controller[method] as (...args: unknown[]) => Promise<unknown>)(...args); }
function frozen(value: unknown): void { if (value && typeof value === "object") { assert.ok(Object.isFrozen(value)); Object.values(value).forEach(frozen); } }
for (const method of methods) {
    test(`${method}: forwards exact arguments before presentation and sanitizes denied poison input`, async () => {
        const f = fixture(); assert.equal(f.calls.length, 0); assert.ok(Object.isFrozen(f.controller));
        const poison = new Proxy({}, { get() { throw new Error("payload read"); }, ownKeys() { throw new Error("payload inspected"); } });
        for (const code of Object.keys(FOOD_MENU_WORKSPACE_FEEDBACK) as FoodMenuServiceErrorCode[]) { f.reply({ ok: false, error: { code, message: "principal:private SQL payload" } }); assert.deepEqual(await invoke(f, method, [poison, 7, undefined]), fail(code)); }
        for (const call of f.calls) { assert.equal(call.receiver, f.service); assert.equal(call.args[0], poison); assert.deepEqual(call.args.slice(1), [7, undefined]); }
        assert.equal(f.calls.length, 5);
    });
    test(`${method}: successful outcomes are detached, frozen and not retried`, async () => {
        const f = fixture(); const snapshot = { version: 7, state: "published", detail: { state: "unknown", values: ["b", "a"] }, optional: undefined };
        const args = [{ submitted: "not echoed" }, 6, { limit: 20, afterVersion: 2 }, undefined];
        if (method.startsWith("create") || method.startsWith("append")) {
            for (const outcome of ["created", "already-present"] as const) { f.reply({ ok: true, value: { outcome, snapshot } }); const result = await invoke(f, method, args) as { value: { snapshot: unknown; message: string; publicationLabel?: string } }; assert.equal(result.value.message, outcome === "created" ? "Snapshot recorded." : "Identical snapshot already recorded."); assert.notEqual(result.value.snapshot, snapshot); assert.deepEqual(result.value.snapshot, snapshot); frozen(result); if (method.includes("Publication")) assert.equal(result.value.publicationLabel, "Publication snapshot: published"); }
            f.reply({ ok: true, value: { outcome: "conflict", reason: "different-content" } }); assert.deepEqual(await invoke(f, method, args), { ok: true, value: { outcome: "conflict", message: "A different version already exists. Refresh and reconcile before retrying." } });
        } else if (method.startsWith("get")) {
            f.reply({ ok: true, value: { outcome: "found", snapshot } }); const result = await invoke(f, method, args) as { value: { snapshot: unknown; message: string; publicationLabel?: string } }; assert.equal(result.value.message, "Snapshot found."); assert.notEqual(result.value.snapshot, snapshot); frozen(result);
            f.reply({ ok: true, value: { outcome: "not-found" } }); assert.deepEqual(await invoke(f, method, args), { ok: true, value: { outcome: "not-found", message: "No snapshot recorded." } });
        } else {
            const cursor = method.startsWith("listLatest") ? "canonical:unchanged" : 7; const items = [snapshot, { ...snapshot, version: 8 }];
            f.reply({ ok: true, value: { items, nextCursor: cursor } }); const result = await invoke(f, method, args) as { value: { items: unknown[]; nextCursor: unknown } }; assert.deepEqual(result.value.items, items); assert.notEqual(result.value.items, items); assert.equal(result.value.nextCursor, cursor); frozen(result);
            snapshot.detail.values.push("after return"); assert.notDeepEqual(result.value.items[0], snapshot);
            f.reply({ ok: true, value: { items: [] } }); assert.deepEqual(await invoke(f, method, args), { ok: true, value: { items: [], message: "No snapshots returned." } });
            f.reply({ ok: true, value: { items: [], nextCursor: undefined } }); const empty = await invoke(f, method, args) as { value: object }; assert.ok(Object.hasOwn(empty.value, "nextCursor"));
        }
        for (const call of f.calls) { assert.equal(call.args.length, args.length); args.forEach((arg, index) => assert.equal(call.args[index], arg)); }
        assert.equal(f.calls.length, method.startsWith("create") || method.startsWith("append") || method.startsWith("list") ? 3 : 2);
    });
}
test("constructor validates every required callable without invoking service", () => {
    const f = fixture(); const inputs: unknown[] = [null, undefined, [], {}, { get getOffer() { throw new Error("private"); } }];
    for (const method of methods) inputs.push({ ...f.service, [method]: null });
    for (const input of inputs) assert.throws(() => createPrivateFoodMenuWorkspaceController(input as FoodPrivateMenuService), { name: "TypeError", message: "Private food menu workspace configuration is unavailable." }); assert.equal(f.calls.length, 0);
});
test("malformed service envelopes and presentation errors fail closed", async () => {
    const f = fixture();
    for (const value of [null, [], {}, { ok: 1 }, { ok: true }, { ok: true, value: null }, { ok: true, value: { outcome: "found" } }, { ok: true, value: { outcome: "found", snapshot: [] } }, { ok: true, value: { outcome: "not-found", secret: 1 } }, { ok: true, value: { outcome: "not-found" }, [Symbol()]: 1 }, { ok: false, error: { code: "unknown", message: "secret" } }, { ok: false, error: { code: "storage", message: 1 } }, { get ok() { throw new Error("secret"); } }]) { f.reply(value); assert.deepEqual(await f.controller.getOffer("bad" as never, 0), fail("storage")); }
    f.reply({ ok: true, value: { items: [], nextCursor: "7" } }); assert.deepEqual(await f.controller.listOfferVersions("bad" as never), fail("storage"));
    f.reply({ ok: true, value: { items: [null] } }); assert.deepEqual(await f.controller.listLatestOffers(), fail("storage"));
    f.reply({ ok: true, value: { outcome: "found", snapshot: { state: "live" } } }); assert.deepEqual(await f.controller.getPublication("bad" as never, 1), fail("storage"));
    const cycle: Record<string, unknown> = {}; cycle.self = cycle; f.reply({ ok: true, value: { outcome: "found", snapshot: cycle } }); assert.deepEqual(await f.controller.getOffer("bad" as never, 0), fail("storage"));
    f.throwService(); assert.deepEqual(await f.controller.listLatestOffers(), fail("storage"));
});
test("publication labels preserve snapshot state only", async () => {
    const f = fixture(); for (const state of ["unpublished", "published"] as const) { assert.equal(getFoodMenuPublicationWorkspaceLabel(state), `Publication snapshot: ${state}`); f.reply({ ok: true, value: { outcome: "found", snapshot: { state } } }); const r = await f.controller.getPublication("id" as never, 1); assert.ok(r.ok && r.value.outcome === "found"); if (r.ok && r.value.outcome === "found") assert.equal(r.value.publicationLabel, `Publication snapshot: ${state}`); }
});
const offerId = "food-serving-offer:family" as Parameters<FoodPrivateMenuService["getOffer"]>[0];
function aggregateFixture(version = 2) { const f = fixture(); f.respond("getOffer", { ok: true, value: { outcome: "found", snapshot: { offerId, version, servingEstimate: { state: "unknown" } } } }); f.respond("getCurrentAvailability", { ok: true, value: { outcome: "found", snapshot: { offer: { offerId, version }, revision: 3, state: "retired" } } }); return f; }
test("exact aggregate observation, not-recorded state and detached history", async () => {
    const f = aggregateFixture(); const r = await f.controller.getOfferWorkspaceDetail(offerId, 2); assert.ok(r.ok && r.value.outcome === "found"); frozen(r); if (r.ok && r.value.outcome === "found") { assert.equal(r.value.availability.state, "recorded"); if (r.value.availability.state === "recorded") { assert.equal(r.value.availability.observation.offer.version, 2); assert.equal(r.value.availability.observation.revision, 3); assert.equal(r.value.availability.observation.state, "retired"); } }
    assert.deepEqual(f.calls.map(c => [c.method, ...c.args]), [["getOffer", offerId, 2], ["getCurrentAvailability", offerId, 2]]);
    const g = aggregateFixture(3); g.respond("getCurrentAvailability", { ok: true, value: { outcome: "not-found" } }); const missing = await g.controller.getOfferWorkspaceDetail(offerId, 3); assert.ok(missing.ok && missing.value.outcome === "found"); if (missing.ok && missing.value.outcome === "found") assert.deepEqual(missing.value.availability, { state: "not-recorded" });
});
test("aggregate early exits, mismatches and second-call failure return no partial data", async () => {
    for (const first of [{ ok: true, value: { outcome: "not-found" } }, { ok: false, error: { code: "forbidden", message: "secret" } }, { ok: true, value: { outcome: "found", snapshot: { offerId, version: 1 } } }]) { const f = aggregateFixture(); f.respond("getOffer", first); const r = await f.controller.getOfferWorkspaceDetail(offerId, 2); assert.equal(f.calls.length, 1); assert.deepEqual(r, first.ok && first.value?.outcome === "not-found" ? { ok: true, value: { outcome: "not-found", message: "No snapshot recorded." } } : fail(first.ok ? "storage" : "forbidden")); }
    for (const second of [{ ok: false, error: { code: "access-unavailable", message: "private" } }, { ok: true, value: { outcome: "found", snapshot: { offer: { offerId, version: 1 } } } }, { ok: true, value: { outcome: "found", snapshot: { offer: { offerId: "food-serving-offer:other", version: 2 } } } }]) { const f = aggregateFixture(); f.respond("getCurrentAvailability", second); assert.deepEqual(await f.controller.getOfferWorkspaceDetail(offerId, 2), fail(second.ok ? "storage" : "access-unavailable")); assert.equal(f.calls.length, 2); }
});
test("real service reauthorizes each aggregate call and honors revocation", async () => {
    const f = aggregateFixture(); let resolutions = 0; let repositoryCalls = 0; const principal = parsePrincipalId("principal:test-admin");
    const repository = Object.fromEntries(methods.map(method => [method, async (...args: unknown[]) => { repositoryCalls++; return (f.service[method] as (...args: unknown[]) => Promise<unknown>)(...args); }])) as unknown as FoodMenuRepository;
    let revoked = true;
    const service = new SingleAdminFoodMenuService({ repository, administratorPrincipalId: principal, callerResolver: { async resolve() { resolutions++; return revoked && resolutions === 2 ? { ok: false, error: { code: "unauthenticated", message: "revoked" } } : { ok: true, value: { principalId: principal } }; } } });
    const controller = createPrivateFoodMenuWorkspaceController(service); assert.deepEqual(await controller.getOfferWorkspaceDetail(offerId, 2), fail("unauthenticated")); assert.equal(resolutions, 2); assert.equal(repositoryCalls, 1);
    revoked = false; const r = await controller.getOfferWorkspaceDetail(offerId, 2); assert.equal(r.ok, true); assert.equal(resolutions, 4); assert.equal(repositoryCalls, 3);
});
test("surface and source isolation", () => {
    const f = fixture(); assert.deepEqual(Object.keys(f.controller).sort(), [...methods, "getOfferWorkspaceDetail"].sort());
    const source = readFileSync(new URL("./private-menu-workspace.ts", import.meta.url), "utf8");
    for (const text of ["FoodMenuRepository", "SessionPrincipalResolver", "administratorPrincipal", "FormData", "URLSearchParams", "cloudflare:workers", "wrangler", "process.env", "projectFoodPublicMenu", "runAuthorized", "Date.now", "Math.random"]) assert.equal(source.includes(text), false, text);
});
