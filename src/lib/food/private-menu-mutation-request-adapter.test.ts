import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createPrivateFoodMenuMutationRequestAdapter } from "./private-menu-mutation-request-adapter";
import { createPrivateFoodMenuMutationRequestBoundary, FOOD_MENU_MUTATION_TRANSPORT_MESSAGES, type FoodMenuMutationRequestBoundary, type FoodMenuMutationRequestEnvelope, type FoodMenuMutationRequestResult } from "./private-menu-mutation-request";
import { SingleAdminFoodMenuService, type FoodMenuServiceErrorCode } from "./private-menu-service";
import { createPrivateFoodMenuWorkspaceController, type FoodPrivateMenuWorkspaceController } from "./private-menu-workspace";
import { InMemoryFoodMenuRepository } from "./menu-persistence";
import { InMemoryFoodDraftRepository } from "./draft-persistence";
import { parsePrincipalId } from "../identity/identifiers";

const bytes = new TextEncoder().encode('operation=createInitialPresentation&snapshot=%7B%22version%22%3A1%7D');
const failure = (code: string) => ({ ok: false, error: { code, message: "Private food menu operation could not be completed." } });
function code(result: FoodMenuMutationRequestResult): string { assert(!result.ok); return result.error.code; }
function native(chunks = [bytes], init: RequestInit = {}) {
    const state = { starts: 0, pulls: 0, acquisitions: 0, reads: 0, cancels: 0, releases: 0 };
    let index = 0;
    const stream = new ReadableStream<Uint8Array>({ start() { state.starts++; }, pull(controller) { state.pulls++; if (index < chunks.length) controller.enqueue(chunks[index++]); else controller.close(); }, cancel() { state.cancels++; } }, { highWaterMark: 0 });
    const original = stream.getReader.bind(stream);
    Object.defineProperty(stream, "getReader", { configurable: true, value() {
        state.acquisitions++; const reader = original(); const read = reader.read.bind(reader), release = reader.releaseLock.bind(reader);
        reader.read = () => { state.reads++; return read(); }; reader.releaseLock = () => { state.releases++; release(); }; return reader;
    } });
    const request = new Request("https://untrusted-url.example/unused", { method: "POST", headers: { Origin: "https://menu.example", "Content-Type": "application/x-www-form-urlencoded" }, body: stream, duplex: "half", ...init } as RequestInit);
    return { request, stream, state };
}
function fixture(denial?: "unauthenticated" | "forbidden" | "access-unavailable") {
    const calls: unknown[][] = []; let gates = 0;
    const workspace = { async createInitialPresentation(...args: unknown[]) { calls.push(args); return { ok: true, value: { outcome: "created", snapshot: args[0], message: "Snapshot recorded." } }; } } as unknown as FoodPrivateMenuWorkspaceController;
    const boundary = createPrivateFoodMenuMutationRequestBoundary({ expectedOrigin: "https://menu.example", workspace, operationGate: { async runAuthorized(callback) {
        gates++; if (denial) return { ok: false, error: { code: denial, message: "private access" } };
        try { return { ok: true, value: await callback() }; } catch { return { ok: false, error: { code: "callback-failed", message: "Private food menu operation could not be completed." } }; }
    } } });
    return { boundary, adapter: createPrivateFoodMenuMutationRequestAdapter({ boundary }), calls, gates: () => gates };
}

test("construction is inert/frozen; malformed dependencies use one fixed exception", () => {
    const f = fixture(); assert.equal(f.gates(), 0); assert.equal(f.calls.length, 0); assert(Object.isFrozen(f.adapter)); assert.deepEqual(Object.keys(f.adapter), ["submit"]);
    const malformed = [null, undefined, [], {}, { boundary: null }, { boundary: [] }, { boundary: {} }, { boundary: { submit: 7 } }, { get boundary() { throw new Error("private config"); } }, { boundary: { get submit() { throw new Error("SQL"); } } }];
    for (const input of malformed) assert.throws(() => createPrivateFoodMenuMutationRequestAdapter(input as never), { name: "TypeError", message: "Private food menu request adapter configuration is unavailable." });
});

test("exact lazy metadata mapping, receiver and every result family pass through unchanged", async () => {
    let current: FoodMenuMutationRequestResult = failure("callback-failed") as FoodMenuMutationRequestResult; let calls = 0;
    const captured: FoodMenuMutationRequestEnvelope[] = [];
    const boundary: FoodMenuMutationRequestBoundary = { async submit(envelope) { calls++; assert.equal(this, boundary); captured.push(envelope); return current; } };
    const adapter = createPrivateFoodMenuMutationRequestAdapter({ boundary });
    for (const result of [
        ...Object.keys(FOOD_MENU_MUTATION_TRANSPORT_MESSAGES).map(code => failure(code)),
        ...["unauthenticated", "forbidden", "access-unavailable", "invalid-input", "storage", "callback-failed"].map(code => failure(code)),
        ...["created", "already-present", "conflict"].map(outcome => ({ ok: true, value: { outcome, snapshot: {}, message: "opaque" } })),
    ]) { current = result as FoodMenuMutationRequestResult; const f = native(); f.request.headers.set("Cookie", "private"); f.request.headers.set("Authorization", "secret"); assert.equal(await adapter.submit(f.request), current); assert.equal(f.state.acquisitions, 0); assert.equal(f.request.bodyUsed, false); }
    assert.equal(calls, 15); const envelope = captured[0]; assert.deepEqual(Object.keys(envelope), ["method", "origin", "contentType", "contentLength", "readBody"]);
    assert.equal(envelope.method, "POST"); assert.equal(envelope.origin, "https://menu.example"); assert.equal(envelope.contentType, "application/x-www-form-urlencoded"); assert.equal(envelope.contentLength, undefined);
    const f = native(); f.request.headers.set("Content-Length", "0007"); await adapter.submit(f.request); assert.equal(captured.at(-1)!.contentLength, "0007");
});

test("M policy rejection and metadata faults acquire/read/cancel zero body bytes", async () => {
    const cases: [RequestInit, string][] = [
        [{ method: "PUT" }, "method-not-allowed"],
        [{ headers: { Origin: "https://elsewhere.example", "Content-Type": "application/x-www-form-urlencoded" } }, "origin-rejected"],
        [{ headers: { Origin: "https://menu.example", "Content-Type": "application/json" } }, "unsupported-content-type"],
        [{ headers: { Origin: "https://menu.example", "Content-Type": "application/x-www-form-urlencoded", "Content-Length": "33554433" } }, "payload-too-large"],
        [{ headers: { Origin: "https://menu.example", "Content-Type": "application/x-www-form-urlencoded", "Content-Length": "1, 2" } }, "invalid-request"],
        [{ headers: { Origin: "https://menu.example, https://menu.example", "Content-Type": "application/x-www-form-urlencoded" } }, "origin-rejected"],
    ];
    for (const [init, expected] of cases) {
        const f = native([bytes], init), m = fixture(); Object.defineProperty(f.request, "body", { get() { assert.fail("policy body access"); } }); Object.defineProperty(f.request, "bodyUsed", { get() { assert.fail("policy body state access"); } });
        assert.equal(code(await m.adapter.submit(f.request)), expected); assert.equal(m.gates(), 0); assert.equal(f.state.reads, 0); assert.equal(f.state.acquisitions, 0); assert.equal(f.state.cancels, 0);
    }
    const f = native(), m = fixture(); Object.defineProperty(f.request, "headers", { get() { throw new Error("private header"); } }); assert.equal(code(await m.adapter.submit(f.request)), "invalid-request");
    const early = native([bytes], { method: "PUT" }); Object.defineProperty(early.request, "headers", { get() { assert.fail("later metadata read"); } }); assert.equal(code(await m.adapter.submit(early.request)), "method-not-allowed");
});

test("all denied gate paths never inspect native body state or acquire a reader", async () => {
    for (const denied of ["unauthenticated", "forbidden", "access-unavailable"] as const) {
        const f = native(), m = fixture(denied);
        Object.defineProperty(f.request, "body", { get() { assert.fail("unauthorized body access"); } }); Object.defineProperty(f.request, "bodyUsed", { get() { assert.fail("unauthorized bodyUsed access"); } });
        assert.equal(code(await m.adapter.submit(f.request)), denied); assert.equal(m.gates(), 1); assert.equal(f.state.starts, 1); assert.equal(f.state.pulls, 0); assert.equal(f.state.acquisitions, 0); assert.equal(f.state.cancels, 0);
    }
});

test("calling readBody stays lazy; ordered exact chunks are yielded once, released without cancellation", async () => {
    const chunks = [bytes.subarray(0, 10), bytes.subarray(10)]; const f = native(chunks); let calls = 0;
    const result = failure("callback-failed") as FoodMenuMutationRequestResult;
    const boundary: FoodMenuMutationRequestBoundary = { async submit(envelope) {
        calls++; const iterable = envelope.readBody(); assert.equal(f.state.acquisitions, 0); const received = [];
        for await (const chunk of iterable) received.push(chunk);
        assert.equal(received[0], chunks[0]); assert.equal(received[1], chunks[1]); return result;
    } };
    assert.equal(await createPrivateFoodMenuMutationRequestAdapter({ boundary }).submit(f.request), result);
    assert.equal(calls, 1); assert.equal(f.state.acquisitions, 1); assert.equal(f.state.reads, 3); assert.equal(f.state.releases, 1); assert.equal(f.state.cancels, 0); assert(!f.stream.locked); assert(f.request.bodyUsed);
    assert.equal(code(await fixture().adapter.submit(f.request)), "body-unavailable"); assert.equal(f.state.acquisitions, 1);
});

test("null, consumed and locked bodies preserve M outcomes only after authorization", async () => {
    const empty = new Request("https://menu.example", { method: "POST", headers: { Origin: "https://menu.example", "Content-Type": "application/x-www-form-urlencoded" } }); assert.equal(code(await fixture().adapter.submit(empty)), "invalid-request");
    const used = native(); await used.request.text(); assert.equal(code(await fixture().adapter.submit(used.request)), "body-unavailable");
    const locked = native(); const owner = locked.stream.getReader(); const before = locked.state.acquisitions;
    assert.equal(code(await fixture().adapter.submit(locked.request)), "body-unavailable"); assert(locked.stream.locked); assert.equal(locked.state.cancels, 0); assert.equal(locked.state.releases, 0); assert.equal(locked.state.acquisitions, before + 1); owner.releaseLock();
});

test("delayed native reads are awaited; stream/body errors are sanitized and locks released", async () => {
    let release!: () => void; const wait = new Promise<void>(resolve => { release = resolve; }); let cancelled = 0;
    let emitted = false; const stream = new ReadableStream<Uint8Array>({ async pull(c) { await wait; if (!emitted) { emitted = true; c.enqueue(bytes); } else c.close(); }, cancel() { cancelled++; } }, { highWaterMark: 0 });
    const request = new Request("https://menu.example", { method: "POST", headers: { Origin: "https://menu.example", "Content-Type": "application/x-www-form-urlencoded" }, body: stream, duplex: "half" } as RequestInit);
    const m = fixture(); let settled = false; const pending = m.adapter.submit(request).then(result => { settled = true; return result; }); await new Promise(resolve => setTimeout(resolve, 0)); assert(!settled); assert.equal(m.calls.length, 0); release(); assert((await pending).ok); assert.equal(cancelled, 0); assert(!stream.locked);
    const broken = native(); Object.defineProperty(broken.stream, "getReader", { value() { throw new Error("private reader"); } }); assert.equal(code(await m.adapter.submit(broken.request)), "body-unavailable");
    const throwing = native(); Object.defineProperty(throwing.request, "body", { get() { throw new Error("private body"); } }); assert.equal(code(await m.adapter.submit(throwing.request)), "body-unavailable");
    const errored = new ReadableStream<Uint8Array>({ pull(c) { c.error(new Error("secret stream abort")); } }, { highWaterMark: 0 }); const errRequest = new Request("https://menu.example", { method: "POST", headers: request.headers, body: errored, duplex: "half" } as RequestInit);
    const failureResult = await m.adapter.submit(errRequest); assert.equal(code(failureResult), "body-unavailable"); assert(!JSON.stringify(failureResult).includes("secret")); assert(!errored.locked);
});

test("early iterator return cancels/releases; cleanup failure cannot replace results", async () => {
    const f = native(); const expected = failure("callback-failed") as FoodMenuMutationRequestResult;
    const boundary: FoodMenuMutationRequestBoundary = { async submit(envelope) { for await (const _chunk of envelope.readBody()) break; return expected; } };
    assert.equal(await createPrivateFoodMenuMutationRequestAdapter({ boundary }).submit(f.request), expected); assert.equal(f.state.reads, 1); assert.equal(f.state.cancels, 1); assert.equal(f.state.releases, 1); assert(!f.stream.locked);
    const cleanup = native(); const get = cleanup.stream.getReader.bind(cleanup.stream); Object.defineProperty(cleanup.stream, "getReader", { value() { const reader = get(); reader.cancel = async () => { throw new Error("private cancel"); }; const original = reader.releaseLock.bind(reader); reader.releaseLock = () => { original(); throw new Error("private release"); }; return reader; } });
    assert.equal(await createPrivateFoodMenuMutationRequestAdapter({ boundary }).submit(cleanup.request), expected); assert(!cleanup.stream.locked);
    const invalid = native(["bad" as never]); const result = await fixture().adapter.submit(invalid.request); assert.equal(code(result), "invalid-request"); assert.equal(invalid.state.cancels, 1); assert(!invalid.stream.locked);
});

test("M actual overflow stops native reads, cancels and releases despite smaller declared length", async () => {
    const chunk = new Uint8Array(1024 * 1024); const f = native(Array(40).fill(chunk)); f.request.headers.set("Content-Length", "1");
    const result = await fixture().adapter.submit(f.request); assert.equal(code(result), "payload-too-large"); assert.equal(f.state.reads, 33); assert.equal(f.state.cancels, 1); assert.equal(f.state.releases, 1); assert(!f.stream.locked);
});

test("real K/service/workspace reauthorize; malformed principals and revocation prevent repository access", async () => {
    const drafts = new InMemoryFoodDraftRepository(); const repo = new InMemoryFoodMenuRepository(drafts); let resolutions = 0; let mode = "valid";
    const service = new SingleAdminFoodMenuService({ repository: repo, administratorPrincipalId: parsePrincipalId("principal:admin"), callerResolver: { async resolve() {
        resolutions++; if (mode === "malformed") return { ok: true, value: { principalId: " principal:admin" as never } };
        if (mode === "unavailable") return { ok: false, error: { code: "unavailable", message: "private" } };
        return { ok: true, value: { principalId: parsePrincipalId(mode === "denied" ? "principal:other" : "principal:admin") } };
    } } });
    const workspace = createPrivateFoodMenuWorkspaceController(service); const boundary = createPrivateFoodMenuMutationRequestBoundary({ operationGate: service, workspace, expectedOrigin: "https://menu.example" }); const adapter = createPrivateFoodMenuMutationRequestAdapter({ boundary });
    mode = "malformed"; const malformed = native(); assert.equal(code(await adapter.submit(malformed.request)), "access-unavailable"); assert.equal(malformed.state.acquisitions, 0);
    mode = "valid"; const request = native(); const get = request.stream.getReader.bind(request.stream); Object.defineProperty(request.stream, "getReader", { value() { mode = "denied"; return get(); } });
    assert.equal(code(await adapter.submit(request.request)), "forbidden"); assert.equal(resolutions, 3);
    mode = "valid"; const initial = resolutions; assert.equal(code(await adapter.submit(native().request)), "invalid-input"); assert.equal(resolutions - initial, 2);
    const raw = new TextEncoder().encode(`operation=createInitialPublication&snapshot=${encodeURIComponent(JSON.stringify({ publicationId: "food-menu-publication:n", version: 1, state: "unpublished", title: "Menu", sections: [] }))}`);
    const created = await adapter.submit(native([raw]).request); assert(created.ok && created.value.outcome === "created");
    const retry = await adapter.submit(native([raw]).request); assert(retry.ok && retry.value.outcome === "already-present");
});

test("boundary exceptions sanitize without retry; concurrent Requests preserve independent state", async () => {
    for (const submit of [() => { throw new Error("secret synchronous"); }, async () => { throw new Error("secret rejection"); }]) {
        let calls = 0; const adapter = createPrivateFoodMenuMutationRequestAdapter({ boundary: { submit(envelope) { calls++; return submit() as never; } } });
        const result = await adapter.submit(native().request); assert.deepEqual(result, failure("callback-failed")); assert.equal(calls, 1); assert(Object.isFrozen(result)); assert(!result.ok && Object.isFrozen(result.error));
    }
    const one = native([new Uint8Array([1])]), two = native([new Uint8Array([2])]);
    const boundary: FoodMenuMutationRequestBoundary = { async submit(envelope) { const collected: number[] = []; for await (const chunk of envelope.readBody()) collected.push(...chunk); return { ok: true, value: { outcome: "created", snapshot: { version: collected[0] } as never, message: "opaque" } }; } };
    const adapter = createPrivateFoodMenuMutationRequestAdapter({ boundary }); const results = await Promise.all([adapter.submit(one.request), adapter.submit(two.request)]);
    results.forEach((result, i) => { assert(result.ok && result.value.outcome === "created"); assert.equal((result.value.snapshot as { version: number }).version, i + 1); }); assert.equal(one.state.reads, 2); assert.equal(two.state.reads, 2);
});

test("source is native request adaptation only without body shortcuts or other authorities", () => {
    const source = readFileSync(new URL("./private-menu-mutation-request-adapter.ts", import.meta.url), "utf8");
    for (const banned of ["APIContext", "cloudflare:workers", "process.env", "globalThis", ".clone(", ".tee(", ".text(", ".json(", ".formData(", ".arrayBuffer(", ".signal", "runAuthorized", "createPrivateFoodMenuRuntime", "new Response", "request.url", "Cookie", "Authorization", "console.", "getProduct", "workspace.", "D1", "wrangler", "fetch("]) assert(!source.includes(banned), banned);
    assert.equal((source.match(/from /g) ?? []).length, 1);
});
