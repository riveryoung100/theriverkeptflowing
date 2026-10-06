import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createPrivateFoodMenuMutationRequestBoundary, FOOD_MENU_MUTATION_TRANSPORT_MESSAGES, type FoodMenuMutationRequestEnvelope, type FoodMenuMutationRequestResult } from "./private-menu-mutation-request";
import { SingleAdminFoodMenuService, type FoodPrivateMenuOperationGate, type FoodMenuServiceErrorCode } from "./private-menu-service";
import { createPrivateFoodMenuWorkspaceController, FOOD_MENU_WORKSPACE_FEEDBACK, type FoodPrivateMenuWorkspaceController } from "./private-menu-workspace";
import { InMemoryFoodMenuRepository } from "./menu-persistence";
import { InMemoryFoodDraftRepository } from "./draft-persistence";
import { parsePrincipalId } from "../identity/identifiers";
import { createFoodProductId, createFoodRecipeId } from "./draft-domain";
import { createFoodDishId, createFoodServingOfferId, validateFoodDishPresentation } from "./dish-offer-domain";
import { createFoodMenuPublicationId, validateFoodMenuPublication } from "./menu-publication-domain";

const spec = JSON.parse(readFileSync(new URL("../../../.river-dev/specifications/food-002m-private-menu-mutation-transport-request-boundary.json", import.meta.url), "utf8"));
const operations = spec.mutations.map((m: { operation: string }) => m.operation) as string[];
const encoder = new TextEncoder();
function wire(operation = "createInitialPresentation", snapshot = '{"version":1}', predecessor?: string): Uint8Array {
    return encoder.encode(`operation=${operation}&snapshot=${encodeURIComponent(snapshot)}${predecessor === undefined ? "" : `&${operation === "appendAvailabilityRevision" ? "expectedPreviousRevision" : "expectedPreviousVersion"}=${encodeURIComponent(predecessor)}`}`);
}
function code(result: FoodMenuMutationRequestResult): string { assert(!result.ok); return result.error.code; }
function frozen(value: unknown): void { if (value && typeof value === "object") { assert(Object.isFrozen(value)); Object.values(value).forEach(frozen); } }
function fixture() {
    const events: string[] = [], calls: { method: string; args: unknown[] }[] = [];
    let gateReply: unknown, workspaceReply: unknown, throwWorkspace = false;
    const gate: FoodPrivateMenuOperationGate = { async runAuthorized(callback) {
        events.push("gate"); if (gateReply !== undefined) return gateReply as never;
        try { events.push("authorized"); return { ok: true, value: await callback() }; }
        catch { return { ok: false, error: { code: "callback-failed", message: "Private food menu operation could not be completed." } }; }
    } };
    const workspace = Object.fromEntries(operations.map(method => [method, async function (...args: unknown[]) {
        events.push(method); calls.push({ method, args }); if (throwWorkspace) throw new Error("private evidence SQL stack");
        if (workspaceReply !== undefined) return workspaceReply;
        return { ok: true, value: { outcome: "created", snapshot: args[0], message: "untrusted feedback", ...(method.includes("Publication") ? { publicationLabel: "Publication snapshot: published" } : {}) } };
    }])) as unknown as FoodPrivateMenuWorkspaceController;
    const boundary = createPrivateFoodMenuMutationRequestBoundary({ operationGate: gate, workspace, expectedOrigin: "https://menu.example" });
    function request(bytes = wire(), overrides: Partial<FoodMenuMutationRequestEnvelope> = {}): FoodMenuMutationRequestEnvelope {
        return { method: "POST", origin: "https://menu.example", contentType: "application/x-www-form-urlencoded", readBody() {
            events.push("read"); return (async function* () { events.push("chunk"); yield bytes; })();
        }, ...overrides };
    }
    return { boundary, gate, workspace, events, calls, request, gateReply(r: unknown) { gateReply = r; }, reply(r: unknown) { workspaceReply = r; }, throwWorkspace() { throwWorkspace = true; } };
}

test("construction is frozen and inert; exact metadata policy rejects before gate/reader getter", async () => {
    const f = fixture(); assert.deepEqual(f.events, []); assert.deepEqual(Object.keys(f.boundary), ["submit"]); frozen(f.boundary);
    const cases: [Partial<FoodMenuMutationRequestEnvelope>, string][] = [
        ...["GET", "post", "DELETE", "OPTIONS"].map(method => [{ method }, "method-not-allowed"] as [Partial<FoodMenuMutationRequestEnvelope>, string]),
        ...[null, "null", "*", "https://menu.example/", "https://menu.example.evil", "HTTPS://menu.example", "https://menu.example:443", "https://user@menu.example", "https://menu.example?x", "https://menu.example#x", "https://menu.example https://menu.example", "ftp://menu.example"].map(origin => [{ origin }, "origin-rejected"] as [Partial<FoodMenuMutationRequestEnvelope>, string]),
        ...[null, "application/json", "multipart/form-data", "application/x-www-form-urlencoded; charset=latin1", "application/x-www-form-urlencoded; charset=UTF-8; charset=UTF-8", "application/x-www-form-urlencoded; gzip"].map(contentType => [{ contentType }, "unsupported-content-type"] as [Partial<FoodMenuMutationRequestEnvelope>, string]),
        ...["", "01", "-1", "+1", " 1", "1.0", "1e2", "1,2", "9007199254740992", null].map(contentLength => [{ contentLength: contentLength as string }, "invalid-request"] as [Partial<FoodMenuMutationRequestEnvelope>, string]),
        [{ contentLength: "33554433" }, "payload-too-large"],
    ];
    for (const [overrides, expected] of cases) {
        const request = f.request(wire(), overrides); Object.defineProperty(request, "readBody", { get() { assert.fail("pre-auth reader access"); } });
        assert.equal(code(await f.boundary.submit(request)), expected);
    }
    assert.deepEqual(f.events, []);
    for (const name of ["method", "origin", "contentType", "contentLength"]) { const request = f.request(); Object.defineProperty(request, name, { get() { throw new Error("private metadata"); } }); assert.equal(code(await f.boundary.submit(request)), "invalid-request"); }
    const invalid = createPrivateFoodMenuMutationRequestBoundary({ operationGate: f.gate, workspace: f.workspace, expectedOrigin: "https://menu.example/" }); assert.equal(code(await invalid.submit(f.request())), "origin-rejected");
});

test("denied gates never access reader; fixed access and callback failures cannot leak", async () => {
    const f = fixture();
    for (const denied of ["unauthenticated", "forbidden", "access-unavailable", "callback-failed"] as const) {
        f.gateReply({ ok: false, error: { code: denied, message: "private principal evidence stack" } });
        const request = f.request(); Object.defineProperty(request, "readBody", { get() { assert.fail("denied reader access"); } });
        const result = await f.boundary.submit(request); assert.equal(code(result), denied);
        assert(!JSON.stringify(result).includes("private principal")); frozen(result);
    }
    assert.deepEqual(f.events, ["gate", "gate", "gate", "gate"]);
    for (const malformed of [null, {}, { ok: true, value: { secret: "body" } }, { ok: false, error: { code: "storage", message: "secret" } }]) { f.gateReply(malformed); assert.equal(code(await f.boundary.submit(f.request())), "callback-failed"); }
    const thrown = createPrivateFoodMenuMutationRequestBoundary({ operationGate: { async runAuthorized() { throw new Error("SQL"); } }, workspace: f.workspace, expectedOrigin: "https://menu.example" }); assert.equal(code(await thrown.submit(f.request())), "callback-failed");
});

test("all eight explicit mutations forward exact nested values/predecessors once and expose frozen detached results", async () => {
    for (const operation of operations) {
        const f = fixture(); const snapshot = { version: 7, revision: 7, state: "published", refs: [{ version: 3, id: "exact:identity" }], descriptor: { state: "unknown" }, ordered: ["second", "first"], explicit: null };
        const result = await f.boundary.submit(f.request(wire(operation, JSON.stringify(snapshot), operation.startsWith("append") ? "6" : undefined), { contentType: 'APPLICATION/X-WWW-FORM-URLENCODED; charset="utf-8"', contentLength: "0" }));
        assert(result.ok && result.value.outcome === "created"); frozen(result);
        assert.deepEqual(f.events, ["gate", "authorized", "read", "chunk", operation]); assert.equal(f.calls.length, 1); assert.equal(f.calls[0].method, operation);
        assert.deepEqual(JSON.parse(JSON.stringify(f.calls[0].args[0])), snapshot); assert.deepEqual(f.calls[0].args.slice(1), operation.startsWith("append") ? [6] : []);
        const forwarded = f.calls[0].args[0] as { ordered: string[] }; forwarded.ordered.push("later"); assert.deepEqual((result.value.snapshot as unknown as { ordered: string[] }).ordered, ["second", "first"]);
    }
});

test("strict URL-form and JSON reject ambiguity, malformed input and arbitrary/read dispatch", async () => {
    const f = fixture();
    const invalidBodies = [
        "", "operation", "operation=x&snapshot=%", "operation=x&snapshot=%C0%AF", "operation=x&snapshot=%GG", "operation=x&snapshot={}&", "operation=x&snapshot={}&extra=1", "operation=x&snapshot={}&operation=x", "operation=x&snapshot={}&%6Fperation=x",
        "operation=createInitialPresentation&snapshot={}&expectedPreviousVersion=1", "operation=appendAvailabilityRevision&snapshot={}&expectedPreviousVersion=1", "operation=appendOfferRevision&snapshot={}",
    ];
    for (const body of invalidBodies) assert.equal(code(await f.boundary.submit(f.request(encoder.encode(body)))), "invalid-request");
    assert.equal(code(await f.boundary.submit(f.request(new Uint8Array([255])))), "invalid-request");
    for (const json of ['[]', 'null', '{} trailing', '{', '{"x":1,"x":2}', '{"x":1,"\\u0078":2}', '{"nested":{"__proto__":{}}}', '{"constructor":1}', '{"prototype":1}', '{"x":"\\q"}', '{"x":"newline\n"}']) assert.equal(code(await f.boundary.submit(f.request(wire(undefined, json)))), "invalid-request");
    const reads = ["getPresentation", "getLatestPresentation", "listPresentationVersions", "listLatestPresentations", "getOffer", "getLatestOffer", "listOfferVersions", "listLatestOffers", "getPublication", "getLatestPublication", "listPublicationVersions", "listLatestPublications", "getAvailability", "listAvailabilityRevisions", "getCurrentAvailability", "getOfferWorkspaceDetail"];
    for (const operation of [...reads, "constructor", "__proto__", "toString", "createinitialOffer", "unknown"]) assert.equal(code(await f.boundary.submit(f.request(wire(operation)))), "invalid-request");
    assert.equal(f.calls.length, 0);
});

test("canonical numeric spelling rejects unsafe conversion throughout nested snapshots and predecessor fields", async () => {
    for (const key of ["version", "revision", "minimum", "maximum"]) for (const token of ['"1"', "0", "-1", "1.5", "1e0", "1E2", "01", "+1", "9007199254740992", "true", "null", "[]", "{}"]) {
        const f = fixture(); assert.equal(code(await f.boundary.submit(f.request(wire(undefined, `{"nested":{"${key}":${token}}}`)))), "invalid-request", `${key}:${token}`); assert.equal(f.calls.length, 0);
    }
    for (const predecessor of ["0", "-1", "1.0", "1e0", "01", " 1", "+1", "9007199254740992"]) { const f = fixture(); assert.equal(code(await f.boundary.submit(f.request(wire("appendOfferRevision", "{}", predecessor)))), "invalid-request"); }
    const f = fixture(); assert((await f.boundary.submit(f.request(wire(undefined, '{"version":9007199254740991}')))).ok);
});

test("stream failures, invalid iterator results/chunks and cleanup remain bounded and sanitized", async () => {
    for (const readBody of [() => { throw new Error("secret reader"); }, () => ({ [Symbol.asyncIterator]() { throw new Error("secret iterator"); } }), () => ({ [Symbol.asyncIterator]() { return { async next() { throw new Error("secret next"); } }; } })]) {
        const f = fixture(); assert.equal(code(await f.boundary.submit(f.request(wire(), { readBody: readBody as never }))), "body-unavailable");
    }
    for (const item of [null, 7, { done: "yes" }, { value: "not bytes" }]) {
        const f = fixture(); let cleanups = 0;
        const readBody = () => ({ [Symbol.asyncIterator]() { return { async next() { return item; }, async return() { cleanups++; throw new Error("cleanup secret"); } }; } });
        assert.equal(code(await f.boundary.submit(f.request(wire(), { readBody: readBody as never }))), "invalid-request"); assert.equal(cleanups, 1);
    }
    const f = fixture(); let pulls = 0, cleanups = 0, reads = 0; const chunk = new Uint8Array(1024 * 1024);
    const readBody = () => { reads++; return { [Symbol.asyncIterator]() { return { async next() { pulls++; return { value: chunk, done: false }; }, async return() { cleanups++; throw new Error("cleanup"); } }; } }; };
    assert.equal(code(await f.boundary.submit(f.request(wire(), { readBody: readBody as never, contentLength: "1" }))), "payload-too-large"); assert.equal(pulls, 33); assert.equal(reads, 1); assert.equal(cleanups, 1); assert.equal(f.calls.length, 0);
});

test("32 MiB encoded and 24 MiB decoded limits are inclusive independently of declared length", async () => {
    const f = fixture(); const base = wire();
    const exact = new Uint8Array(33554432); exact.fill(32); exact.set(base);
    // Spaces are legal trailing JSON whitespace, so the encoded boundary is valid but decoded limit exceeds capacity.
    assert.equal(code(await f.boundary.submit(f.request(exact, { contentLength: "33554432" }))), "payload-too-large");
    const prefix = "operation=createInitialPresentation&snapshot=";
    const decodedExact = encoder.encode(prefix + "{}" + " ".repeat(25165824 - 2));
    assert((await f.boundary.submit(f.request(decodedExact))).ok);
    const over = encoder.encode(prefix + "{}" + " ".repeat(25165824 - 1)); assert.equal(code(await f.boundary.submit(f.request(over))), "payload-too-large");
    // Encoded exactly 32 MiB with a small decoded snapshot: percent-encoded whitespace expands the wire.
    const filler = 33554432 - prefix.length - 2; const encodedExact = encoder.encode(prefix + "{}" + "%20".repeat(Math.floor(filler / 3)) + " ".repeat(filler % 3));
    assert.equal(encodedExact.length, 33554432); assert((await f.boundary.submit(f.request(encodedExact))).ok);
});

test("inclusive JSON depth/string/array/node capacities and multibyte decoded sizes", async () => {
    const f = fixture();
    const depth = (n: number) => '{"x":'.repeat(n - 1) + '{}' + '}'.repeat(n - 1);
    assert((await f.boundary.submit(f.request(wire(undefined, depth(12))))).ok); assert.equal(code(await f.boundary.submit(f.request(wire(undefined, depth(13))))), "payload-too-large");
    assert((await f.boundary.submit(f.request(wire(undefined, JSON.stringify({ x: "a".repeat(65536) }))))).ok); assert.equal(code(await f.boundary.submit(f.request(wire(undefined, JSON.stringify({ x: "a".repeat(65537) }))))), "payload-too-large");
    assert((await f.boundary.submit(f.request(wire(undefined, JSON.stringify({ x: Array(40000).fill(null) }))))).ok); assert.equal(code(await f.boundary.submit(f.request(wire(undefined, JSON.stringify({ x: Array(40001).fill(null) }))))), "payload-too-large");
    const nodes = { x: Array.from({ length: 25 }, (_, i) => Array(i === 24 ? 39997 : 39999).fill(null)) };
    assert((await f.boundary.submit(f.request(wire(undefined, JSON.stringify(nodes))))).ok); nodes.x[24].push(null); assert.equal(code(await f.boundary.submit(f.request(wire(undefined, JSON.stringify(nodes))))), "payload-too-large");
    assert((await f.boundary.submit(f.request(wire(undefined, '{"x":"😀é","omitted":null}')))).ok);
});

test("all service failures and mutation outcomes use fixed feedback; malformed and private results fail closed", async () => {
    const f = fixture();
    for (const error of Object.keys(FOOD_MENU_WORKSPACE_FEEDBACK) as FoodMenuServiceErrorCode[]) {
        f.reply({ ok: false, error: { code: error, message: "SQL private stack" } }); const result = await f.boundary.submit(f.request()); assert.deepEqual(result, { ok: false, error: { code: error, message: FOOD_MENU_WORKSPACE_FEEDBACK[error] } }); frozen(result);
    }
    for (const outcome of ["created", "already-present", "conflict"]) {
        f.reply({ ok: true, value: { outcome, message: "private reason", ...(outcome === "conflict" ? {} : { snapshot: { version: 1 } }) } });
        const result = await f.boundary.submit(f.request()); assert(result.ok); assert.equal(result.value.outcome, outcome); assert(!JSON.stringify(result).includes("private"));
    }
    for (const malformed of [null, {}, { ok: true, value: { outcome: "not-found" } }, { ok: true, value: { outcome: "conflict", reason: "private", message: "x" } }, { ok: false, error: { code: "secret", message: "payload" } }]) { f.reply(malformed); assert.equal(code(await f.boundary.submit(f.request())), "storage"); }
    f.throwWorkspace(); assert.equal(code(await f.boundary.submit(f.request())), "callback-failed");
    const syntax = fixture(); assert.equal(code(await syntax.boundary.submit(syntax.request(wire(undefined, '{')))), "invalid-request");
});

async function realFixture() {
    const drafts = new InMemoryFoodDraftRepository(); const recipe = { id: createFoodRecipeId("m"), version: 1, evidence: [] }; const product = { id: createFoodProductId("m"), version: 1, recipe: { id: recipe.id, version: 1 }, evidence: [] };
    await drafts.createInitialRecipe(recipe); await drafts.createInitialProduct(product);
    const repo = new InMemoryFoodMenuRepository(drafts); let resolutions = 0, denied = false, writes = 0;
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(repo)).filter(k => k !== "constructor");
    const repository = Object.fromEntries(methods.map(method => [method, (...args: unknown[]) => { if (method.startsWith("create") || method.startsWith("append")) writes++; return (repo[method as keyof typeof repo] as (...args: unknown[]) => unknown).apply(repo, args); }])) as unknown as ConstructorParameters<typeof SingleAdminFoodMenuService>[0]["repository"];
    const service = new SingleAdminFoodMenuService({ repository, administratorPrincipalId: parsePrincipalId("principal:admin"), callerResolver: { async resolve() { resolutions++; return { ok: true, value: { principalId: parsePrincipalId(denied ? "principal:other" : "principal:admin") } }; } } });
    const workspace = createPrivateFoodMenuWorkspaceController(service); const boundary = createPrivateFoodMenuMutationRequestBoundary({ operationGate: service, workspace, expectedOrigin: "https://menu.example" });
    const presentation = { dishId: createFoodDishId("m"), version: 1, product: { id: product.id, version: 1 }, recipe: { id: recipe.id, version: 1 }, name: "Menu" };
    const offer = { offerId: createFoodServingOfferId("m"), version: 1, presentation: { dishId: presentation.dishId, version: 1 }, format: { kind: "family" as const }, servingEstimate: { state: "unknown" as const }, storageSummary: { state: "unknown" as const } };
    const publication = { publicationId: createFoodMenuPublicationId("m"), version: 1, state: "published" as const, title: "Menu", sections: [] };
    const availability = { offer: { offerId: offer.offerId, version: 1 }, revision: 1, state: "retired" as const };
    return { boundary, repo, presentation, offer, publication, availability, resolutions: () => resolutions, writes: () => writes, deny() { denied = true; } };
}

test("real service reauthorizes after gate, preserves all histories/retries/conflicts and rejects domain errors downstream", async () => {
    const f = await realFixture(); const request = fixture().request;
    for (const [entity, initial, append] of [[f.presentation, "createInitialPresentation", "appendPresentationRevision"], [f.offer, "createInitialOffer", "appendOfferRevision"], [f.publication, "createInitialPublication", "appendPublicationRevision"], [f.availability, "createInitialAvailability", "appendAvailabilityRevision"]] as const) {
        const first = await f.boundary.submit(request(wire(initial, JSON.stringify(entity)))); assert(first.ok && first.value.outcome === "created");
        const next = "revision" in entity ? { ...entity, revision: 2 } : { ...entity, version: 2 };
        const appended = await f.boundary.submit(request(wire(append, JSON.stringify(next), "1"))); assert(appended.ok && appended.value.outcome === "created");
        const retried = await f.boundary.submit(request(wire(initial, JSON.stringify(entity)))); assert(retried.ok && retried.value.outcome === "already-present");
    }
    assert.equal(f.resolutions(), 24); assert.equal(f.writes(), 12);
    const conflict = await f.boundary.submit(request(wire(undefined, JSON.stringify({ ...f.presentation, name: "Different" })))); assert(conflict.ok && conflict.value.outcome === "conflict");
    const invalid = await f.boundary.submit(request(wire(undefined, JSON.stringify({ ...f.presentation, extra: "private evidence" })))); assert.equal(code(invalid), "invalid-input");
    const before = f.writes(); const originalRequest = request(wire()); const deniedRequest = { ...originalRequest, readBody: () => { f.deny(); return originalRequest.readBody(); } };
    assert.equal(code(await f.boundary.submit(deniedRequest)), "forbidden"); assert.equal(f.writes(), before);
});

test("maximum domain-bounded publication topology exceeds old J limits and fits M without pruning", async () => {
    const presentation = { dishId: createFoodDishId("large"), version: 1, product: { id: createFoodProductId("large"), version: 1 }, recipe: { id: createFoodRecipeId("large"), version: 1 }, name: "Large" };
    const contexts = Array.from({ length: 100 }, (_, i) => { const p = { ...presentation, dishId: createFoodDishId(String(i)) }; return { presentation: p, recipe: { id: presentation.recipe.id, version: 1, evidence: [] }, product: { id: presentation.product.id, version: 1, recipe: presentation.recipe, evidence: [] } }; });
    const offers = contexts.flatMap((c, index) => Array.from({ length: 20 }, (_, i) => ({ offerId: createFoodServingOfferId(`${index}-${i}`), version: 1, presentation: { dishId: c.presentation.dishId, version: 1 }, format: { kind: "family" as const }, servingEstimate: { state: "unknown" as const } })));
    const entries = contexts.map(c => ({ presentation: { dishId: c.presentation.dishId, version: 1 }, selection: { shortDescription: false, longDescription: false, mediaReferences: [] }, offers: offers.filter(o => o.presentation.dishId === c.presentation.dishId).map(o => ({ offer: { offerId: o.offerId, version: 1 }, intent: "informational" as const, selection: { packagingDescription: false, storageSummary: false, reheatingSummary: false, availability: true } })) }));
    const publication = { publicationId: createFoodMenuPublicationId("large"), version: 1, state: "published", title: "Large", sections: Array.from({ length: 20 }, (_, i) => ({ key: String(i), title: String(i), entries })) };
    assert(validateFoodMenuPublication(publication, contexts, offers).ok); const body = wire("createInitialPublication", JSON.stringify(publication)); assert(body.length > 65536);
    const f = fixture(); const result = await f.boundary.submit(f.request(body)); assert(result.ok && result.value.outcome === "created");
    const huge = { ...contexts[0].presentation, dishId: createFoodDishId("a".repeat(65537)) };
    assert.equal(validateFoodDishPresentation(huge, contexts[0].product, contexts[0].recipe).dishId, huge.dishId);
    const tooLarge = await f.boundary.submit(f.request(wire(undefined, JSON.stringify(huge)))); assert.equal(code(tooLarge), "payload-too-large");
});

test("stream copying preserves reused chunks and consumes each once; wire decoding is not domain normalization", async () => {
    const f = fixture(); const bytes = wire(undefined, '{"name":"keep + space é😀","order":["b","a"],"unknown":{"state":"unknown"}}');
    let reads = 0, emitted = 0;
    const request = f.request(bytes, { readBody() {
        reads++;
        return (async function* () {
            const reused = new Uint8Array(1);
            for (const byte of bytes) { reused[0] = byte; emitted++; yield reused; }
            reused[0] = 0;
        })();
    } });
    const result = await f.boundary.submit(request); assert(result.ok && result.value.outcome === "created");
    assert.equal(reads, 1); assert.equal(emitted, bytes.length); assert.equal(f.calls.length, 1);
    assert.equal((f.calls[0].args[0] as { name: string }).name, "keep + space é😀");
    const plus = await f.boundary.submit(f.request(encoder.encode('operation=createInitialPresentation&snapshot=%7B%22name%22%3A%22two+words%22%7D'))); assert(plus.ok); assert.equal((f.calls[1].args[0] as { name: string }).name, "two words");
});

test("concurrent submissions keep gate/body/operation state independent and source remains isolated", async () => {
    const f = fixture(); const pending: ((value: boolean) => void)[] = [];
    const gate: FoodPrivateMenuOperationGate = { async runAuthorized(callback) { const allowed = await new Promise<boolean>(resolve => pending.push(resolve)); if (!allowed) return { ok: false, error: { code: "forbidden", message: "secret" } }; return { ok: true, value: await callback() }; } };
    const boundary = createPrivateFoodMenuMutationRequestBoundary({ operationGate: gate, workspace: f.workspace, expectedOrigin: "https://menu.example" });
    const a = boundary.submit(f.request(wire("createInitialOffer", '{"version":1}'))); const b = boundary.submit(f.request(wire("createInitialPresentation", '{"version":2}')));
    pending[1](true); assert((await b).ok); pending[0](false); assert.equal(code(await a), "forbidden"); assert.equal(f.calls.length, 1); assert.equal(f.calls[0].method, "createInitialPresentation"); assert.equal(f.events.filter(e => e === "read").length, 1);
    const source = readFileSync(new URL("./private-menu-mutation-request.ts", import.meta.url), "utf8");
    for (const banned of ["cloudflare:workers", "process.env", "globalThis", "FormData", "new Request", "new Response", "wrangler", "RIVER_", "D1Food", "SingleAdmin", "parsePrincipal", "validateFood", "fetch(", "console.", "workspace[", "private-menu-runtime", "menu-persistence"]) assert(!source.includes(banned), banned);
    assert.deepEqual(Object.keys(FOOD_MENU_MUTATION_TRANSPORT_MESSAGES).sort(), Object.keys(spec.results.transportMessages).sort()); assert.deepEqual(FOOD_MENU_MUTATION_TRANSPORT_MESSAGES, spec.results.transportMessages);
});
