import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createFoodPublicMenuTransport, type FoodPublicMenuPublicationSelector, type FoodPublicMenuTransportDependencies } from "./public-menu-transport";
import { createFoodPublicMenuReadService, type FoodPublicMenuReadResult } from "./public-menu-read-service";
import { createFoodMenuPublicationId } from "./menu-publication-domain";

const reference = () => ({ publicationId: createFoodMenuPublicationId("synthetic-transport"), version: 7 });
const menu = () => ({ ...reference(), title: "Synthetic menu", sections: [] });
function setup(result: FoodPublicMenuReadResult = { status: "found", menu: menu() }, select: () => unknown = reference) {
    const calls: unknown[] = [];
    const dependencies = {
        selector: { select() { calls.push("select"); return select(); } } as FoodPublicMenuPublicationSelector,
        service: { async readPublicMenu(ref: unknown) { calls.push(ref); return result; } },
    };
    return { transport: createFoodPublicMenuTransport(dependencies), calls, dependencies };
}
test("GET serializes only canonical service projection; HEAD preserves status/headers and omits body", async () => {
    const s = setup(); const get = await s.transport.read({ method: "GET" });
    assert.deepEqual(get, { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify(menu()) });
    assert.deepEqual(s.calls, ["select", reference()]);
    const head = await s.transport.read({ method: "HEAD" });
    assert.deepEqual(head, { status: get.status, headers: get.headers });
    assert.equal(s.calls.length, 4);
    assert.deepEqual(Object.keys(s.transport), ["read"]);
    const originalStringify = JSON.stringify;
    JSON.stringify = (() => { throw new Error("HEAD must not serialize"); }) as typeof JSON.stringify;
    try {
        for (const result of [{ status: "found", menu: menu() }, { status: "invalid-input" }, { status: "not-found" }, { status: "not-published" }, { status: "unavailable" }] as FoodPublicMenuReadResult[]) {
            const expectedStatus = result.status === "found" ? 200 : result.status === "invalid-input" ? 400 : result.status === "unavailable" ? 503 : 404;
            assert.equal((await setup(result).transport.read({ method: "HEAD" })).status, expectedStatus);
        }
        assert.equal((await setup(undefined, () => null).transport.read({ method: "HEAD" })).status, 503);
        assert.equal((await setup().transport.read({ method: "HEAD", body: "ignored" } as never)).status, 400);
    } finally { JSON.stringify = originalStringify; }
});
test("all safe outcomes map; missing and unpublished are publicly identical on GET and HEAD", async () => {
    const statuses = { "invalid-input": 400, "not-found": 404, "not-published": 404, unavailable: 503 } as const;
    const errors = { 400: "invalid-request", 404: "menu-not-found", 503: "menu-unavailable" };
    for (const [status, http] of Object.entries(statuses)) {
        const s = setup({ status } as FoodPublicMenuReadResult);
        const get = await s.transport.read({ method: "GET" });
        assert.equal(get.status, http); assert.equal(get.body, JSON.stringify({ error: errors[http] }));
        assert.deepEqual(await s.transport.read({ method: "HEAD" }), { status: http, headers: get.headers });
    }
    assert.deepEqual(await setup({ status: "not-found" }).transport.read({ method: "GET" }), await setup({ status: "not-published" }).transport.read({ method: "GET" }));
});
test("method-first policy rejects unsupported methods and never consumes caller selection or body", async () => {
    const s = setup();
    for (const method of ["POST", "OPTIONS", "get", ""]) {
        assert.deepEqual(await s.transport.read({ method }), { status: 405, headers: { "Content-Type": "application/json; charset=utf-8", Allow: "GET, HEAD" }, body: '{"error":"method-not-allowed"}' });
    }
    for (const key of ["publicationId", "version", "body", "query", "url", "headers", "cookie", "readBody"]) {
        for (const method of ["GET", "HEAD"]) {
            const request = Object.defineProperty({ method }, key, { get() { throw new Error("Must never consume caller data"); } });
            const result = await s.transport.read(request);
            assert.equal(result.status, 400); assert.equal(result.body, method === "HEAD" ? undefined : '{"error":"invalid-request"}');
        }
    }
    for (const request of [null, {}, [], { method: 123 }]) assert.equal((await s.transport.read(request as never)).status, 400);
    assert.equal(s.calls.length, 0);
});
test("selector unavailable/malformed/throwing/async fails closed before service without identity echo", async () => {
    for (const select of [() => null, () => undefined, () => ({ ...reference(), version: 0 }), () => ({ ...reference(), publicationId: "wrong" }), () => ({ ...reference(), extra: "private" }), () => Promise.resolve(reference()), () => { throw new Error("synthetic private config path SQL"); }]) {
        const s = setup(undefined, select);
        assert.deepEqual(await s.transport.read({ method: "GET" }), { status: 503, headers: { "Content-Type": "application/json; charset=utf-8" }, body: '{"error":"menu-unavailable"}' });
        assert.deepEqual(s.calls, ["select"]);
    }
});
test("unexpected service exceptions and malformed envelopes reveal only fixed unavailable", async () => {
    for (const read of [async () => { throw new Error("synthetic private SQL secret"); }, async () => null, async () => ({ status: "unknown" }), async () => ({ status: "not-found", private: "diagnostic" }), async () => ({ status: "found" })]) {
        const transport = createFoodPublicMenuTransport({ selector: { select: reference }, service: { readPublicMenu: read } } as unknown as FoodPublicMenuTransportDependencies);
        assert.equal((await transport.read({ method: "GET" })).body, '{"error":"menu-unavailable"}');
        assert.equal((await transport.read({ method: "HEAD" })).body, undefined);
    }
});
test("reference/request capture and serialized frozen output detach mutable collaborators", async () => {
    const selected = reference(); const payload = menu(); let release!: () => void;
    const barrier = new Promise<void>(resolve => { release = resolve; }); let received: unknown;
    const transport = createFoodPublicMenuTransport({ selector: { select: () => selected }, service: { async readPublicMenu(ref) { received = ref; await barrier; return { status: "found", menu: payload }; } } });
    const request = { method: "GET" }; const pending = transport.read(request);
    selected.version = 999; request.method = "HEAD"; release();
    const result = await pending;
    assert.deepEqual(received, reference()); assert(Object.isFrozen(received));
    assert.equal(result.body, JSON.stringify(menu()));
    payload.title = "Changed afterward"; assert.equal(result.body, JSON.stringify(menu()));
    assert(Object.isFrozen(result)); assert(Object.isFrozen(result.headers));
    assert.throws(() => { (result.headers as Record<string, string>).private = "leak"; });
});
test("real FOOD-004A compatibility with exact synthetic publication and no downstream dependencies", async () => {
    const publication = { ...menu(), state: "published" as const }; const calls: unknown[] = [];
    const unused = async (): Promise<never> => { throw new Error("Unexpected dependency read"); };
    const service = createFoodPublicMenuReadService({ repository: { async getPublication(id, version) { calls.push([id, version]); return { ok: true, value: { outcome: "found", snapshot: publication } }; }, getPresentation: unused, getOffer: unused }, readDependencies: { getProduct: unused, getRecipe: unused } });
    const transport = createFoodPublicMenuTransport({ selector: { select: reference }, service });
    assert.equal((await transport.read({ method: "GET" })).body, JSON.stringify(menu()));
    assert.deepEqual(calls, [[reference().publicationId, 7]]);
});
test("factory stays inert, captures original collaborators, and source contains no activation or direct projector", async () => {
    assert.throws(() => createFoodPublicMenuTransport({} as FoodPublicMenuTransportDependencies), /configuration is unavailable/);
    const s = setup(); assert.equal(s.calls.length, 0);
    s.dependencies.selector.select = () => null; s.dependencies.service.readPublicMenu = async () => ({ status: "unavailable" });
    assert.equal((await s.transport.read({ method: "GET" })).status, 200);
    const source = await readFile(new URL("./public-menu-transport.ts", import.meta.url), "utf8");
    assert.doesNotMatch(source, /projectFoodPublicMenu|getLatest|getCurrent|process\.env|fetch\(|APIRoute|SessionPrincipal|Cache-Control|ETag|Access-Control/);
    assert.doesNotMatch((await s.transport.read({ method: "GET" })).body!, /price|orderable|nutrition|cost|repository|selector|service|callback/);
});
