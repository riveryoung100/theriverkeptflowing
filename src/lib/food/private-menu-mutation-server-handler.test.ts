import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { createPrivateFoodMenuMutationServerHandler } from "./private-menu-mutation-server-handler";
import { createPrivateFoodMenuMutationRequestAdapter, type FoodMenuMutationRequestAdapter } from "./private-menu-mutation-request-adapter";
import { createPrivateFoodMenuMutationRequestBoundary, type FoodMenuMutationRequestResult } from "./private-menu-mutation-request";
import { createPrivateFoodMenuMutationResponse } from "./private-menu-mutation-response";
import { SingleAdminFoodMenuService } from "./private-menu-service";
import { createPrivateFoodMenuWorkspaceController } from "./private-menu-workspace";
import { InMemoryFoodMenuRepository } from "./menu-persistence";
import { InMemoryFoodDraftRepository } from "./draft-persistence";
import { parsePrincipalId } from "../identity/identifiers";

const source = readFileSync(new URL("./private-menu-mutation-server-handler.ts", import.meta.url), "utf8");
const callbackFailure = { ok: false, error: { code: "callback-failed", message: "Private food menu operation could not be completed." } } as const;
function instrument(mapper: (result: FoodMenuMutationRequestResult) => Response) {
    const exports: Record<string, typeof createPrivateFoodMenuMutationServerHandler> = {};
    runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
        exports, Object, TypeError, require(name: string) {
            assert.equal(name, "./private-menu-mutation-response");
            return { createPrivateFoodMenuMutationResponse: mapper };
        },
    });
    return exports.createPrivateFoodMenuMutationServerHandler;
}
function native(text = "", init: RequestInit = {}) {
    const state = { acquisitions: 0, reads: 0, cancels: 0 }; let sent = false;
    const stream = new ReadableStream<Uint8Array>({ pull(controller) { if (!sent) { sent = true; controller.enqueue(new TextEncoder().encode(text)); } else controller.close(); }, cancel() { state.cancels++; } }, { highWaterMark: 0 });
    const original = stream.getReader.bind(stream);
    Object.defineProperty(stream, "getReader", { value() { state.acquisitions++; const reader = original(); const read = reader.read.bind(reader); reader.read = () => { state.reads++; return read(); }; return reader; } });
    const request = new Request("https://untrusted.example/unused", { method: "POST", headers: { Origin: "https://menu.example", "Content-Type": "application/x-www-form-urlencoded" }, body: stream, duplex: "half", ...init } as RequestInit);
    return { request, state };
}
function pipeline() {
    let mode = "authorized", resolutions = 0, repositoryCalls = 0;
    const repo = new InMemoryFoodMenuRepository(new InMemoryFoodDraftRepository());
    const create = repo.createInitialPublication.bind(repo);
    repo.createInitialPublication = (...args) => { repositoryCalls++; return create(...args); };
    const service = new SingleAdminFoodMenuService({ repository: repo, administratorPrincipalId: parsePrincipalId("principal:admin"), callerResolver: { async resolve() {
        resolutions++;
        if (mode === "unauthenticated") return { ok: false, error: { code: "unauthenticated", message: "private" } };
        if (mode === "access-unavailable") return { ok: false, error: { code: "unavailable", message: "private" } };
        return { ok: true, value: { principalId: parsePrincipalId(mode === "forbidden" ? "principal:other" : "principal:admin") } };
    } } });
    const boundary = createPrivateFoodMenuMutationRequestBoundary({ operationGate: service, workspace: createPrivateFoodMenuWorkspaceController(service), expectedOrigin: "https://menu.example" });
    const handler = createPrivateFoodMenuMutationServerHandler({ adapter: createPrivateFoodMenuMutationRequestAdapter({ boundary }) });
    return { handler, mode(value: string) { mode = value; }, counts: () => ({ resolutions, repositoryCalls }) };
}
test("construction is frozen, synchronous, inert and validates only the injected capability", () => {
    let submissions = 0, mappings = 0, adapterReads = 0, methodReads = 0;
    const adapter = { get submit() { methodReads++; return async () => { submissions++; return callbackFailure; }; } };
    const input = { get adapter() { adapterReads++; return adapter; } };
    const handler = instrument(() => { mappings++; assert.fail("construction mapped a response"); })(input);
    assert(Object.isFrozen(handler)); assert.deepEqual(Object.keys(handler), ["handle"]);
    assert.equal(typeof handler.handle, "function"); assert.equal(submissions, 0); assert.equal(mappings, 0);
    assert.equal(adapterReads, 1); assert.equal(methodReads, 1); assert(!Object.isFrozen(adapter)); assert(!Object.isFrozen(input));
    for (const bad of [null, undefined, [], {}, { adapter: null }, { adapter: [] }, { adapter: {} }, { adapter: { submit: 1 } }, { get adapter() { throw new Error("private"); } }, { adapter: { get submit() { throw new Error("private"); } } }]) {
        assert.throws(() => createPrivateFoodMenuMutationServerHandler(bad as never), { name: "TypeError", message: "Private food menu mutation server handler configuration is unavailable." });
    }
});
test("exact Request/result/Response identities and receiver are preserved without property inspection", async () => {
    const request = new Proxy(new Request("https://test.example"), { get() { assert.fail("P inspected Request"); } });
    const result = new Proxy(callbackFailure, { get(_target, key) { if (key === "then") return undefined; assert.fail("P inspected result"); } });
    const response = new Response("opaque", { status: 202 }); let submissions = 0, mappings = 0;
    const adapter: FoodMenuMutationRequestAdapter = { async submit(value) { submissions++; assert.equal(value, request); assert.equal(this, adapter); return result; } };
    const handler = instrument(value => { mappings++; assert.equal(value, result); return response; })({ adapter });
    adapter.submit = async () => assert.fail("captured method was replaced");
    assert.equal(await handler.handle(request), response); assert.equal(submissions, 1); assert.equal(mappings, 1);
    assert(!Object.isFrozen(response)); assert(!Object.isFrozen(adapter));
});
const variants: FoodMenuMutationRequestResult[] = [
    ...["created", "already-present"].map(outcome => ({ ok: true, value: { outcome, snapshot: {}, message: "private" } })),
    { ok: true, value: { outcome: "conflict", message: "private" } },
    ...["method-not-allowed", "origin-rejected", "unsupported-content-type", "payload-too-large", "invalid-request", "body-unavailable", "unauthenticated", "forbidden", "access-unavailable", "invalid-input", "storage", "callback-failed"].map(code => ({ ok: false, error: { code, message: "private SQL evidence" } })),
] as FoodMenuMutationRequestResult[];
for (const result of variants) {
    const name = result.ok ? result.value.outcome : result.error.code;
    test(`delegates exact O behavior: ${name}`, async () => {
        let calls = 0;
        const handler = createPrivateFoodMenuMutationServerHandler({ adapter: { async submit() { calls++; return result; } } });
        const actual = await handler.handle(new Request("https://test.example")); const expected = createPrivateFoodMenuMutationResponse(result);
        assert.equal(calls, 1); assert.equal(actual.status, expected.status); assert.deepEqual([...actual.headers], [...expected.headers]); assert.equal(await actual.text(), await expected.text());
    });
}
test("adapter exceptions sanitize once; malformed fulfilled results remain O's responsibility", async () => {
    for (const submit of [() => { throw new Error("private SQL stack"); }, async () => { throw new Error("private rejection"); }]) {
        let calls = 0, maps = 0;
        const handler = instrument(result => { maps++; assert.deepEqual(JSON.parse(JSON.stringify(result)), callbackFailure); assert(Object.isFrozen(result)); assert(!result.ok && Object.isFrozen(result.error)); return createPrivateFoodMenuMutationResponse(result); })({ adapter: { submit() { calls++; return submit() as never; } } });
        const response = await handler.handle(new Request("https://test.example")); assert.equal(response.status, 500); assert.deepEqual(await response.json(), callbackFailure); assert.equal(calls, 1); assert.equal(maps, 1);
    }
    const malformed = { ok: true, value: { outcome: "unknown" } } as unknown as FoodMenuMutationRequestResult;
    const response = await createPrivateFoodMenuMutationServerHandler({ adapter: { async submit() { return malformed; } } }).handle(new Request("https://test.example"));
    assert.deepEqual(await response.json(), callbackFailure);
});
test("mapper failures propagate without remapping or adapter retry", async () => {
    let submits = 0, maps = 0; const exception = new Error("platform failure");
    const handler = instrument(() => { maps++; throw exception; })({ adapter: { async submit() { submits++; return callbackFailure; } } });
    await assert.rejects(handler.handle(new Request("https://test.example")), error => error === exception);
    assert.equal(submits, 1); assert.equal(maps, 1);
});
test("real N/M policy and denied K authorization consume zero body bytes", async () => {
    const cases: [RequestInit, string, number][] = [
        [{ method: "PUT" }, "authorized", 405],
        [{ headers: { Origin: "https://other.example", "Content-Type": "application/x-www-form-urlencoded" } }, "authorized", 403],
        [{ headers: { Origin: "https://menu.example", "Content-Type": "application/json" } }, "authorized", 415],
        [{ headers: { Origin: "https://menu.example", "Content-Type": "application/x-www-form-urlencoded", "Content-Length": "33554433" } }, "authorized", 413],
        [{}, "unauthenticated", 401], [{}, "forbidden", 403], [{}, "access-unavailable", 503],
    ];
    for (const [init, mode, status] of cases) {
        const f = native("private evidence", init), p = pipeline(); p.mode(mode);
        for (const key of ["body", "bodyUsed", "text", "json", "formData", "arrayBuffer", "blob", "clone"]) Object.defineProperty(f.request, key, { get() { assert.fail(`unauthorized ${key}`); } });
        assert.equal((await p.handler.handle(f.request)).status, status);
        assert.deepEqual(f.state, { acquisitions: 0, reads: 0, cancels: 0 });
        assert.deepEqual(p.counts(), { resolutions: mode === "authorized" ? 0 : 1, repositoryCalls: 0 });
    }
});
test("real in-memory mutation reauthorizes and preserves retry/conflict and explicit revisions", async () => {
    const p = pipeline();
    const publication = { publicationId: "food-menu-publication:p", version: 1, state: "unpublished", title: "Menu", sections: [] };
    async function send(snapshot: unknown, operation = "createInitialPublication", predecessor?: number) {
        const f = native(`operation=${operation}&snapshot=${encodeURIComponent(JSON.stringify(snapshot))}${predecessor === undefined ? "" : `&expectedPreviousVersion=${predecessor}`}`);
        for (const key of ["text", "json", "formData", "arrayBuffer", "blob", "clone"]) Object.defineProperty(f.request, key, { get() { assert.fail(`body shortcut ${key}`); } });
        const response = await p.handler.handle(f.request); assert.equal(f.state.acquisitions, 1); assert.equal(f.state.reads, 2); assert.equal(f.state.cancels, 0); return response;
    }
    assert.equal((await send(publication)).status, 201);
    assert.equal((await send(publication)).status, 200);
    const conflict = await send({ ...publication, title: "Different" }); assert.equal(conflict.status, 409); assert.deepEqual(await conflict.json(), { ok: true, value: { outcome: "conflict", message: "A different version already exists. Refresh and reconcile before retrying." } });
    assert.equal((await send({ ...publication, version: 2 }, "appendPublicationRevision", 1)).status, 201);
    assert.equal(p.counts().resolutions, 8); assert.equal(p.counts().repositoryCalls, 3);
});
test("concurrent independent requests retain invocation-local state with reverse completion", async () => {
    const one = new Request("https://test.example/one"), two = new Request("https://test.example/two");
    const pending = new Map<Request, (result: FoodMenuMutationRequestResult) => void>();
    const handler = createPrivateFoodMenuMutationServerHandler({ adapter: { submit(request) { return new Promise(resolve => pending.set(request, resolve)); } } });
    const first = handler.handle(one), second = handler.handle(two);
    pending.get(two)!(variants[1]); assert.equal((await second).status, 200);
    pending.get(one)!(variants[0]); assert.equal((await first).status, 201); assert.equal(pending.size, 2);
});
test("source isolation excludes request inspection, runtime acquisition and response duplication", () => {
    assert.deepEqual([...source.matchAll(/from "(.+)"/g)].map(match => match[1]), ["./private-menu-mutation-request-adapter", "./private-menu-mutation-request", "./private-menu-mutation-response"]);
    assert.doesNotMatch(source, /request\.|new Request|new Response|JSON\.|headers|status:|APIContext|APIRoute|cloudflare:workers|process\.|globalThis|runAuthorized|expectedOrigin|bindingName|wrangler|fetch\(|console\./);
    assert.equal((source.match(/submit\.call/g) ?? []).length, 1);
});
