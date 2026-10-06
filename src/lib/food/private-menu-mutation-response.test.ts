import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { FoodMenuMutationRequestResult } from "./private-menu-mutation-request";
import { createPrivateFoodMenuMutationResponse } from "./private-menu-mutation-response";

const map = (value: unknown) => createPrivateFoodMenuMutationResponse(value as FoodMenuMutationRequestResult);
const errors = [
    ["method-not-allowed", 405, "Private food menu mutations require POST."],
    ["origin-rejected", 403, "Private food menu request origin is not permitted."],
    ["unsupported-content-type", 415, "Private food menu request content type is not supported."],
    ["payload-too-large", 413, "Private food menu request exceeds the permitted limits."],
    ["invalid-request", 400, "The private food menu request is invalid."],
    ["body-unavailable", 400, "Private food menu request body could not be read."],
    ["unauthenticated", 401, "Authentication is required."],
    ["forbidden", 403, "Food menu access is denied."],
    ["access-unavailable", 503, "Food menu access could not be checked."],
    ["invalid-input", 400, "The food menu operation input is invalid."],
    ["storage", 503, "Food menu storage is unavailable. Reconcile the result before retrying."],
    ["callback-failed", 500, "Private food menu operation could not be completed."],
] as const;
const outcomes = [
    ["created", 201, "Snapshot recorded."],
    ["already-present", 200, "Identical snapshot already recorded."],
    ["conflict", 409, "A different version already exists. Refresh and reconcile before retrying."],
] as const;
async function check(response: Response, status: number, body: unknown, allow = false) {
    assert.ok(response instanceof Response);
    assert.equal(response.status, status);
    assert.deepEqual([...response.headers.entries()], [
        ...(allow ? [["allow", "POST"]] : []),
        ["cache-control", "no-store"], ["content-type", "application/json; charset=utf-8"],
    ]);
    const bytes = new Uint8Array(await response.arrayBuffer());
    assert.deepEqual(bytes, new TextEncoder().encode(JSON.stringify(body)));
    assert.notDeepEqual([...bytes.slice(0, 3)], [239, 187, 191]);
}
for (const [code, status, message] of errors) {
    test(`exact sanitized failure mapping: ${code}`, async () => {
        const input = Object.freeze({ ok: false, error: Object.freeze({ code, message: "private SQL stack session environment evidence" }) });
        await check(map(input), status, { ok: false, error: { code, message } }, code === "method-not-allowed");
        assert.equal(input.error.message, "private SQL stack session environment evidence");
        await check(map(input), status, { ok: false, error: { code, message } }, code === "method-not-allowed");
    });
}
for (const [outcome, status, message] of outcomes) {
    test(`exact sanitized outcome mapping: ${outcome}`, async () => {
        const snapshot = Object.freeze({ privateEvidence: "secret", toJSON() { throw new Error("must not serialize"); } });
        const value = Object.freeze({ outcome, ...(outcome === "conflict" ? {} : { snapshot, publicationLabel: "private label" }), message: "private body" });
        const input = Object.freeze({ ok: true, value });
        await check(map(input), status, { ok: true, value: { outcome, message } });
        assert.equal(input.value.message, "private body");
        assert.ok(Object.isFrozen(input.value));
    });
}
test("snapshot and publication label getters are never accessed, including cyclic/private values", async () => {
    let calls = 0;
    const value = { outcome: "created", message: "untrusted" };
    for (const key of ["snapshot", "publicationLabel"]) Object.defineProperty(value, key, { enumerable: true, get() { calls++; throw new Error("private"); } });
    await check(map(Object.freeze({ ok: true, value: Object.freeze(value) })), 201, { ok: true, value: { outcome: "created", message: "Snapshot recorded." } });
    assert.equal(calls, 0);
    const cycle: Record<string, unknown> = {}; cycle.self = cycle;
    await check(map({ ok: true, value: { outcome: "already-present", snapshot: cycle, message: "" } }), 200, { ok: true, value: { outcome: "already-present", message: "Identical snapshot already recorded." } });
});
test("malformed, incompatible, inherited, extra and symbol envelopes fail closed", async () => {
    const bad: unknown[] = [null, undefined, [], 1, "x", {}, { ok: 1 }, { ok: true }, { ok: false },
        { ok: true, value: null }, { ok: false, error: [] },
        { ok: false, error: { code: "configuration-unavailable", message: "private" } },
        { ok: false, error: { code: "constructor", message: "private" } },
        { ok: false, error: { code: "storage", message: 1 } },
        { ok: false, error: { code: "storage", message: "", stack: "private" } },
        { ok: true, value: { outcome: "found", message: "", snapshot: {} } },
        { ok: true, value: { outcome: "created", message: "" } },
        { ok: true, value: { outcome: "created", snapshot: {}, message: null } },
        { ok: true, value: { outcome: "conflict", snapshot: {}, message: "" } },
        { ok: true, value: { outcome: "conflict", message: "", reason: "private" } },
        { ok: true, value: { outcome: "created", snapshot: {}, message: "", extra: 1 } },
        { ok: false, error: { code: "storage", message: "" }, value: {} },
        Object.assign(Object.create({ ok: false }), { error: { code: "storage", message: "" } }),
        { ok: false, error: Object.assign(Object.create({ code: "storage" }), { message: "" }) },
        { ok: false, error: { code: "storage", message: "" }, [Symbol("private")]: 1 },
        { ok: true, value: { outcome: "created", snapshot: {}, message: "", [Symbol("private")]: 1 } },
    ];
    for (const input of bad) await check(map(input), 500, { ok: false, error: { code: "callback-failed", message: errors[11][2] } });
});
test("throwing required property access and proxy reflection are sanitized", async () => {
    const inputs: unknown[] = [new Proxy({}, { ownKeys() { throw new Error("private stack"); }, get() { return false; } })];
    for (const key of ["ok", "value", "error"]) {
        const input = key === "value" ? { ok: true } : { ok: false };
        Object.defineProperty(input, key, { get() { throw new Error("private stack"); } }); inputs.push(input);
    }
    for (const key of ["code", "message"]) {
        const error = { code: "storage", message: "" };
        Object.defineProperty(error, key, { get() { throw new Error("private stack"); } }); inputs.push({ ok: false, error });
    }
    for (const key of ["outcome", "message"]) {
        const value = { outcome: "created", message: "", snapshot: {} };
        Object.defineProperty(value, key, { get() { throw new Error("private stack"); } }); inputs.push({ ok: true, value });
    }
    for (const input of inputs) await check(map(input), 500, { ok: false, error: { code: "callback-failed", message: errors[11][2] } });
});
test("mapping invokes no supplied capabilities and reads required scalar properties once", async () => {
    let calls = 0;
    const snapshot = Object.freeze({ resolve() { calls++; }, prepare() { calls++; }, readBody() { calls++; }, toJSON() { calls++; } });
    const counts = { ok: 0, outcome: 0, message: 0 };
    const value = { get outcome() { counts.outcome++; return "created"; }, get message() { counts.message++; return "private"; }, snapshot };
    const input = { get ok() { counts.ok++; return true; }, value };
    await check(map(input), 201, { ok: true, value: { outcome: "created", message: "Snapshot recorded." } });
    assert.equal(calls, 0); assert.deepEqual(counts, { ok: 1, outcome: 1, message: 1 });
});
test("source isolation and exact public function", () => {
    const source = readFileSync(new URL("./private-menu-mutation-response.ts", import.meta.url), "utf8");
    assert.deepEqual([...source.matchAll(/^export function (\w+)/gm)].map(match => match[1]), ["createPrivateFoodMenuMutationResponse"]);
    assert.deepEqual([...source.matchAll(/from "(.+)"/g)].map(match => match[1]), ["./private-menu-mutation-request", "./private-menu-workspace"]);
    assert.doesNotMatch(source, /cloudflare:workers|wrangler|process\.|globalThis|fetch\(|console\.|FormData|new Request|\.resolve\(|\.prepare\(|\.batch\(|\.readBody\(|\.snapshot\b|\.publicationLabel\b/);
});
