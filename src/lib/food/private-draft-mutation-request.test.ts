import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createPrivateFoodDraftMutationRequestBoundary, FOOD_MUTATION_TRANSPORT_MESSAGES, type FoodMutationRequestEnvelope } from "./private-draft-mutation-request";
import { SingleAdminFoodDraftService, type FoodPrivateDraftOperationGate } from "./private-draft-service";
import { createPrivateFoodDraftWorkspaceController, FOOD_WORKSPACE_FEEDBACK } from "./private-draft-workspace";
import { InMemoryFoodDraftRepository } from "./draft-persistence";
import { parsePrincipalId } from "../identity/identifiers";

const recipe = (version = 1) => ({ id: "food-recipe:transport", version, evidence: [] });
const product = (version = 1) => ({ id: "food-product:transport", version, recipe: { id: recipe().id, version: 1 }, evidence: [] });
const encode = (operation = "createInitialRecipe", snapshot = JSON.stringify(recipe()), predecessor?: string) => new TextEncoder().encode(`operation=${operation}&snapshot=${encodeURIComponent(snapshot).replace(/%20/g, "+")}${predecessor === undefined ? "" : `&expectedPreviousVersion=${encodeURIComponent(predecessor)}`}`);
function fixture() {
    const repository = new InMemoryFoodDraftRepository();
    const state = { resolves: 0, reads: 0, gateCalls: 0, authorized: true, unauthenticated: false, revoke: false, closed: 0 };
    const service = new SingleAdminFoodDraftService({ repository, administratorPrincipalId: parsePrincipalId("principal:admin"), callerResolver: { async resolve() {
        state.resolves++;
        if (state.unauthenticated) return { ok: false as const, error: { code: "unauthenticated" as const, message: "private" } };
        return { ok: true as const, value: { principalId: parsePrincipalId(state.authorized ? "principal:admin" : "principal:other") } };
    } } });
    const gate: FoodPrivateDraftOperationGate = { runAuthorized(callback) { state.gateCalls++; return service.runAuthorized(callback); } };
    const controller = createPrivateFoodDraftWorkspaceController(service);
    const boundary = createPrivateFoodDraftMutationRequestBoundary({ gate, controller, expectedOrigin: "https://food.example" });
    function request(bytes = encode(), overrides: Partial<FoodMutationRequestEnvelope> = {}): FoodMutationRequestEnvelope {
        return { method: "POST", origin: "https://food.example", contentType: "application/x-www-form-urlencoded", readBody: async function* () {
            state.reads++; if (state.revoke) state.authorized = false;
            try { yield bytes; } finally { state.closed++; }
        }, ...overrides };
    }
    return { repository, state, service, controller, gate, boundary, request };
}
function code(result: Awaited<ReturnType<ReturnType<typeof createPrivateFoodDraftMutationRequestBoundary>["submit"]>>) { assert(!result.ok); return result.error.code; }

test("construction is inert; policy rejects before gate and read", async () => {
    const f = fixture(); assert.deepEqual(Object.keys(f.boundary), ["submit"]); assert(Object.isFrozen(f.boundary));
    const cases: [Partial<FoodMutationRequestEnvelope>, string][] = [
        ...["GET", "post", "DELETE"].map(method => [{ method }, "method-not-allowed"] as [Partial<FoodMutationRequestEnvelope>, string]),
        ...[null, "null", "https://other.example", "https://food.example/", "https://food.example?q=x", "https://food.example#x", "https://u@food.example", "https://food.example https://food.example", "ftp://food.example", "HTTPS://food.example"].map(origin => [{ origin }, "origin-rejected"] as [Partial<FoodMutationRequestEnvelope>, string]),
        ...[null, "application/json", "multipart/form-data", "application/x-www-form-urlencoded; charset=latin1", "application/x-www-form-urlencoded; charset=UTF-8; charset=UTF-8", "application/x-www-form-urlencoded; gzip"].map(contentType => [{ contentType }, "unsupported-content-type"] as [Partial<FoodMutationRequestEnvelope>, string]),
        ...["01", "-1", "+1", " 1", "1 ", "1.0", "1e2", "9007199254740992", ""].map(contentLength => [{ contentLength }, "invalid-request"] as [Partial<FoodMutationRequestEnvelope>, string]),
        [{ contentLength: "65537" }, "payload-too-large"], [{ contentLength: 1 as never }, "invalid-request"],
    ];
    for (const [override, expected] of cases) assert.equal(code(await f.boundary.submit(f.request(encode(), override))), expected);
    assert.equal(f.state.gateCalls, 0); assert.equal(f.state.reads, 0); assert.equal(f.state.resolves, 0);
    const throwing = f.request(); Object.defineProperty(throwing, "origin", { get() { throw new Error("secret"); } });
    assert.equal(code(await f.boundary.submit(throwing)), "invalid-request");
});

test("denied gate never reads; normal mutation reauthorizes and honors revocation", async () => {
    const f = fixture(); f.state.authorized = false;
    assert.equal(code(await f.boundary.submit(f.request(new Uint8Array([255])))), "forbidden"); assert.equal(f.state.reads, 0);
    f.state.unauthenticated = true; assert.equal(code(await f.boundary.submit(f.request())), "unauthenticated"); assert.equal(f.state.reads, 0);
    f.state.unauthenticated = false; f.state.authorized = true; f.state.revoke = true;
    assert.equal(code(await f.boundary.submit(f.request())), "forbidden"); assert.equal(f.state.resolves, 4);
    assert.deepEqual(await f.repository.getRecipe(recipe().id, 1), { outcome: "not-found" });
    f.state.revoke = false; f.state.authorized = true;
    const created = await f.boundary.submit(f.request()); assert(created.ok && created.value.outcome === "created"); assert.equal(f.state.resolves, 6);
});

test("all four operations, historical retries, conflicts, exact recipe reference and frozen results", async () => {
    const f = fixture();
    for (const [operation, snapshot, predecessor] of [
        ["createInitialRecipe", recipe(), undefined], ["appendRecipeRevision", recipe(2), "1"],
        ["createInitialProduct", product(), undefined], ["appendProductRevision", product(2), "1"],
    ] as const) {
        const result = await f.boundary.submit(f.request(encode(operation, JSON.stringify(snapshot), predecessor), { contentType: "APPLICATION/X-WWW-FORM-URLENCODED; charset=\"utf-8\"", contentLength: "0" }));
        assert(result.ok && result.value.outcome === "created", JSON.stringify(result)); assert.deepEqual(result.value.snapshot, snapshot); assert(Object.isFrozen(result.value.snapshot));
        const retry = await f.boundary.submit(f.request(encode(operation, JSON.stringify(snapshot), predecessor))); assert(retry.ok && retry.value.outcome === "already-present");
    }
    const conflict = await f.boundary.submit(f.request(encode("createInitialRecipe", JSON.stringify({ ...recipe(), process: { classification: "unknown" } }))));
    assert(conflict.ok && conflict.value.outcome === "conflict"); assert.deepEqual(Object.keys(conflict.value), ["outcome", "message"]);
    assert.equal(f.state.resolves, 22);
});

test("strict form and JSON reject malformed, repeated, unexpected and inappropriate fields", async () => {
    const f = fixture(); const text = new TextDecoder().decode(encode());
    const bodies = ["", "operation=createInitialRecipe", `${text}&operation=createInitialRecipe`, text.replace("operation=", "role="), `${text}&expectedPreviousVersion=1`, text.replace("createInitialRecipe", "appendRecipeRevision"), "operation=%ZZ&snapshot=%7B%7D", "operation=%FF&snapshot=%7B%7D", text + "&", text.replace("operation=", "operation"), text.replace("createInitialRecipe", "unknown")];
    for (const body of bodies) assert.equal(code(await f.boundary.submit(f.request(new TextEncoder().encode(body)))), "invalid-request");
    for (const json of ['{"id":1,"\\u0069d":2}', '{"x":{"a":1,"a":2}}', '{"__proto__":{}}', '{"constructor":1}', '{"prototype":1}', '{"x":1,}', '{} trailing', '[1]', '{"x":"\\q"}', '{"x":01}']) assert.equal(code(await f.boundary.submit(f.request(encode("createInitialRecipe", json)))), "invalid-request");
    assert.equal(code(await f.boundary.submit(f.request(new Uint8Array([255])))), "invalid-request");
    for (const token of ["0", "01", "-1", "+1", "1.0", "1e0", "9007199254740992", '"1"']) assert.equal(code(await f.boundary.submit(f.request(encode("createInitialRecipe", `{"id":"food-recipe:transport","version":${token},"evidence":[]}`)))), "invalid-request");
    for (const predecessor of ["0", "01", "-1", "+1", "1.0", "1e0", " 1", "9007199254740992"]) assert.equal(code(await f.boundary.submit(f.request(encode("appendRecipeRevision", JSON.stringify(recipe(2)), predecessor)))), "invalid-request");
});

test("every parser limit has an inclusive boundary and fail-closed overflow", async () => {
    const f = fixture();
    const checkJson = async (json: string, expected: string) => assert.equal(code(await f.boundary.submit(f.request(encode("createInitialRecipe", json)))), expected);
    await checkJson(JSON.stringify({ x: "a".repeat(4096) }), "invalid-input"); await checkJson(JSON.stringify({ x: "a".repeat(4097) }), "payload-too-large");
    await checkJson(JSON.stringify({ ["a".repeat(4096)]: 1 }), "invalid-input"); await checkJson(JSON.stringify({ ["a".repeat(4097)]: 1 }), "payload-too-large");
    await checkJson(JSON.stringify({ x: Array(100).fill(0) }), "invalid-input"); await checkJson(JSON.stringify({ x: Array(101).fill(0) }), "payload-too-large");
    const nested = (depth: number) => '{"x":'.repeat(depth - 1) + '{}' + '}'.repeat(depth - 1);
    await checkJson(nested(12), "invalid-input"); await checkJson(nested(13), "payload-too-large");
    const nodes = (n: number) => JSON.stringify({ x: Array.from({ length: 20 }, () => Array(100).fill(0)), y: Array(n).fill(0) }); // 2023+n values
    await checkJson(nodes(25), "invalid-input"); await checkJson(nodes(26), "payload-too-large");
    const base = JSON.stringify(recipe());
    const good = await f.boundary.submit(f.request(encode("createInitialRecipe", base + " ".repeat(49152 - base.length)))); assert(good.ok);
    await checkJson(base + " ".repeat(49153 - base.length), "payload-too-large");
    // Raw JSON trailing whitespace avoids percent expansion to isolate encoded-byte bounds.
    const raw = `operation=createInitialRecipe&snapshot=${base}`;
    const exact = new TextEncoder().encode(raw + " ".repeat(65536 - raw.length)); assert.equal(code(await f.boundary.submit(f.request(exact))), "payload-too-large"); // decoded snapshot limit
    const over = new Uint8Array(65537).fill(32); const before = f.state.closed;
    assert.equal(code(await f.boundary.submit(f.request(over))), "payload-too-large"); assert.equal(f.state.closed, before + 1);
    const paddedOperation = "a".repeat(32); assert.equal(code(await f.boundary.submit(f.request(encode(paddedOperation)))), "invalid-request");
    assert.equal(code(await f.boundary.submit(f.request(encode("a".repeat(33))))), "payload-too-large");
    assert.equal(code(await f.boundary.submit(f.request(encode("appendRecipeRevision", JSON.stringify(recipe(2)), "11111111111111111")))), "payload-too-large");
});

test("stream cleanup, UTF-8 across chunks and body access failures are sanitized", async () => {
    const f = fixture(); let next = 0, returned = 0;
    const request = f.request(encode(), { readBody: () => ({ [Symbol.asyncIterator]() { return { async next() { next++; return { done: false, value: new Uint8Array(65537) }; }, async return() { returned++; throw new Error("private cleanup"); } }; } }) });
    assert.equal(code(await f.boundary.submit(request)), "payload-too-large"); assert.equal(next, 1); assert.equal(returned, 1);
    for (const readBody of [() => { throw new Error("private"); }, async function* () { throw new Error("private"); }]) {
        assert.deepEqual(await f.boundary.submit(f.request(encode(), { readBody })), { ok: false, error: { code: "body-unavailable", message: FOOD_MUTATION_TRANSPORT_MESSAGES["body-unavailable"] } });
    }
    const bytes = encode("createInitialRecipe", JSON.stringify({ ...recipe(), ingredients: [{ kind: "simple", name: "é" }] }));
    const result = await f.boundary.submit(f.request(bytes, { readBody: async function* () { for (const byte of bytes) yield new Uint8Array([byte]); } })); assert(result.ok);
});

test("exact recipe lookups, unknown/undisclosed/order/evidence semantics and domain feedback", async () => {
    const f = fixture(); const missing = await f.boundary.submit(f.request(encode("createInitialProduct", JSON.stringify(product())))); assert.equal(code(missing), "invalid-input");
    const snapshot = { ...recipe(), ingredients: [{ kind: "purchased-component", name: "Sauce", composition: "undisclosed" }, { kind: "purchased-component", name: "Mix", composition: "disclosed", subingredients: [{ name: "B" }, { name: "A" }] }], allergenReview: { state: "pending", declarations: [{ allergen: "sesame" }, { allergen: "fish", detail: "Cod" }] }, process: { classification: "unknown" } };
    const created = await f.boundary.submit(f.request(encode("createInitialRecipe", JSON.stringify(snapshot)))); assert(created.ok && created.value.outcome === "created"); assert.deepEqual(created.value.snapshot, snapshot);
    await f.boundary.submit(f.request(encode("appendRecipeRevision", JSON.stringify(recipe(2)), "1")));
    const productSnapshot = { ...product(), temperatureControl: "unknown", cottageReview: { state: "reviewed", conclusion: "inconclusive" }, salesTaxReview: { state: "pending" }, historicalLabelReference: { id: "label:old", version: 1 }, evidence: [{ requirement: "cottage-eligibility-review", sourceReference: "source:a", subject: { type: "product", id: product().id, version: 1 }, reviewDate: "2026-10-06", issuer: "Reviewer" }] };
    const saved = await f.boundary.submit(f.request(encode("createInitialProduct", JSON.stringify(productSnapshot)))); assert(saved.ok && saved.value.outcome === "created"); assert.deepEqual(saved.value.snapshot, productSnapshot);
    for (const changed of [{ ...recipe(), id: " food-recipe:bad" }, { ...recipe(), allergenReview: { state: "pending", declarations: [{ allergen: "milk" }, { allergen: "milk" }] } }, { ...recipe(), evidence: [{ requirement: "allergen-review", sourceReference: "a", subject: { type: "recipe", id: recipe().id, version: 2 }, reviewDate: "2026-02-30", reviewer: "X" }] }]) assert.equal(code(await f.boundary.submit(f.request(encode("createInitialRecipe", JSON.stringify(changed))))), "invalid-input");
});

test("gate opacity/failure and controller lookup/storage feedback never leak or retry", async () => {
    const f = fixture(); let calls = 0;
    const controller = { ...f.controller, async getRecipe() { calls++; return { ok: false as const, error: { code: "storage" as const, message: FOOD_WORKSPACE_FEEDBACK.storage } }; } };
    const boundary = createPrivateFoodDraftMutationRequestBoundary({ gate: f.gate, controller, expectedOrigin: "https://food.example" });
    assert.equal(code(await boundary.submit(f.request(encode("createInitialProduct", JSON.stringify(product()))))), "storage"); assert.equal(calls, 1);
    const throwing = createPrivateFoodDraftMutationRequestBoundary({ gate: f.gate, controller: { ...controller, async createInitialRecipe() { throw new Error("private evidence SQL"); } }, expectedOrigin: "https://food.example" });
    const result = await throwing.submit(f.request()); assert.deepEqual(result, { ok: false, error: { code: "callback-failed", message: "Private food operation could not be completed." } }); assert(!JSON.stringify(result).includes("evidence"));
});

test("source remains isolated and exposes no destructive or sale activation operations", async () => {
    const source = await readFile(new URL("./private-draft-mutation-request.ts", import.meta.url), "utf8");
    for (const forbidden of ["cloudflare:workers", "wrangler", "FormData", "process.env", "stripe", "getLatestRecipe", "deleteRecipe", "approved", "sellable"]) assert(!source.includes(forbidden), forbidden);
    const imports = [...source.matchAll(/from "([^"]+)"/g)].map(match => match[1]); assert.deepEqual(imports, ["./draft-domain", "./private-draft-service", "./private-draft-workspace"]);
});

test("encoded 65536-byte boundary, streamed overflow and malformed chunks", async () => {
    const f = fixture();
    const prefix = new TextDecoder().decode(encode());
    // 22,000 decoded spaces; percent encoding expands only enough to reach exactly the wire limit.
    const extra = 65536 - prefix.length - 22000;
    const expanded = Math.floor(extra / 2);
    const exact = prefix + "%20".repeat(expanded) + "+".repeat(22000 + extra % 2 - expanded);
    assert.equal(exact.length, 65536);
    const result = await f.boundary.submit(f.request(new TextEncoder().encode(exact))); assert(result.ok);
    assert.equal(code(await f.boundary.submit(f.request(new TextEncoder().encode(exact + "+")))), "payload-too-large");
    assert.equal(code(await f.boundary.submit(f.request(encode(), { readBody: async function* () { yield "file" as never; } }))), "invalid-request");
});

test("all service failures stay fixed; uncertain mutation is not retried and payloads are absent", async () => {
    const f = fixture();
    for (const failureCode of Object.keys(FOOD_WORKSPACE_FEEDBACK) as (keyof typeof FOOD_WORKSPACE_FEEDBACK)[]) {
        let calls = 0;
        const response = { ok: false as const, error: { code: failureCode, message: "private SQL evidence" } };
        const controller = { ...f.controller, async getRecipe() { calls++; return response; }, async createInitialRecipe() { calls++; return response; } };
        const boundary = createPrivateFoodDraftMutationRequestBoundary({ gate: f.gate, controller, expectedOrigin: "https://food.example" });
        for (const bytes of [encode(), encode("createInitialProduct", JSON.stringify(product()))]) {
            const result = await boundary.submit(f.request(bytes));
            assert.deepEqual(result, { ok: false, error: { code: failureCode, message: FOOD_WORKSPACE_FEEDBACK[failureCode] } });
            assert(!JSON.stringify(result).includes("food-recipe:"));
        }
        assert.equal(calls, 2);
    }
    const unavailable = createPrivateFoodDraftMutationRequestBoundary({ gate: { async runAuthorized() { return { ok: false as const, error: { code: "access-unavailable" as const, message: "Food draft access is unavailable." } }; } }, controller: f.controller, expectedOrigin: "https://food.example" });
    assert.equal(code(await unavailable.submit(f.request())), "access-unavailable"); assert.equal(f.state.reads, 10);
});
