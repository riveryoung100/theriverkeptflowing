import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createIdentityRegistrationRequestHandler, type IdentityRegistrationRequestHandlerInput } from "./principal-registration-api";
import type { IdentityRegistrationResult } from "../authentication/registration-service";
import { createPrincipalId } from "../identifiers";
const expectedOrigin = "https://signup.example.test";
const password = " Synthetic password 😀 ";
const payload = { email: " Synthetic@Example.test ", password };
const specifiedErrors = JSON.parse(readFileSync(new URL("../../../../.river-dev/specifications/food-002zc-identity-registration-transport-security-browser-boundary.json", import.meta.url), "utf8")).publicResults.errors as Record<string, { status: number; message: string }>;
function request(body = JSON.stringify(payload), headers: Record<string, string> = {}, method = "POST") {
  return new Request("https://untrusted-url.example/", { method, headers: { origin: expectedOrigin, "content-type": "application/json", ...headers }, ...(method === "GET" ? {} : { body }) });
}
function fixture(overrides: Partial<IdentityRegistrationRequestHandlerInput> = {}) {
  const calls: string[] = []; let value: IdentityRegistrationResult = { ok: true, value: { principalId: createPrincipalId("synthetic") } };
  let timeout: (() => void) | undefined; let released = 0;
  const input: IdentityRegistrationRequestHandlerInput = {
    expectedOrigin,
    registration: { async register(input) { calls.push("register"); assert.deepEqual(input, payload); return value; } },
    compromisedPasswords: { async check(input) { calls.push("checker"); assert.equal(input, password); return "allowed"; } },
    abuseControl: { async check() { calls.push("abuse"); return "allowed"; } },
    acquireWorkSlot() { calls.push("slot"); return () => { released++; calls.push("release"); }; },
    scheduleTimeout(callback, ms) { calls.push("timer"); assert.equal(ms, 5000); timeout = callback; return () => { calls.push("cancel-timer"); }; },
    ...overrides,
  };
  return { handler: createIdentityRegistrationRequestHandler(input), input, calls, setResult: (next: IdentityRegistrationResult) => { value = next; }, timeout: () => timeout?.(), released: () => released };
}
async function check(response: Response, status: number, code?: string) {
  assert.equal(response.status, status);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("access-control-allow-origin"), null);
  assert.equal(response.headers.get("set-cookie"), null);
  const text = await response.text(); assert(!text.includes(password)); assert(!text.includes("principal:")); assert(!text.includes(payload.email));
  if (code) assert.equal(JSON.parse(text).error.code, code);
  const parsed = JSON.parse(text);
  if (parsed.ok === false) {
    const specified = specifiedErrors[parsed.error.code]; assert(specified);
    assert.equal(status, specified.status);
    assert.deepEqual(parsed, { ok: false, error: { code: parsed.error.code, message: specified.message } });
  }
  return text;
}
test("valid request exact ordering and created/conflict identical neutral response", async () => {
  const f = fixture(); assert.deepEqual(f.calls, []);
  const created = await f.handler(request()); const headers = [...created.headers];
  const body = await check(created, 202);
  assert.deepEqual(f.calls, ["abuse", "slot", "timer", "cancel-timer", "checker", "register", "release"]);
  f.setResult({ ok: false, error: { code: "conflict", message: "private conflict reason" } });
  const conflict = await f.handler(request()); assert.deepEqual([...conflict.headers], headers); assert.equal(await check(conflict, 202), body);
  assert.deepEqual(JSON.parse(body), { ok: true, message: "Registration request processed. Continue to sign in." });
});
for (const method of ["GET", "PUT", "DELETE", "OPTIONS"]) test(`method ${method} rejects before dependencies or body`, async () => {
  const f = fixture(); const r = request("", {}, method); const result = await f.handler(r);
  assert.equal(result.headers.get("allow"), "POST"); await check(result, 405, "method-not-allowed"); assert(!r.bodyUsed); assert.deepEqual(f.calls, []);
});
for (const value of ["", "null", "https://wrong.example", expectedOrigin + "/", expectedOrigin + "/path", "https://user:pass@signup.example.test", "https://signup.example.test, https://wrong.example", "invalid"]) test(`origin rejects ${value}`, async () => {
  const f = fixture(); const r = request(undefined, { origin: value }); await check(await f.handler(r), 403, "origin-rejected"); assert(!r.bodyUsed); assert.deepEqual(f.calls, []);
});
test("missing Origin rejects; local origin allowed only when explicitly injected", async () => {
  const f = fixture(); const r = request(); r.headers.delete("origin"); await check(await f.handler(r), 403); assert.deepEqual(f.calls, []);
  const local = fixture({ expectedOrigin: "http://localhost:4321" }); await check(await local.handler(request(undefined, { origin: "http://localhost:4321" })), 202);
  await check(await f.handler(request(undefined, { origin: "http://localhost:4321" })), 403);
});
for (const type of ["text/plain", "application/x-www-form-urlencoded", "multipart/form-data", "application/json; charset=latin1", "application/json; charset=utf-8; extra=x", "application/json, application/json"]) test(`content type rejects ${type}`, async () => {
  const f = fixture(); const r = request(undefined, { "content-type": type }); await check(await f.handler(r), 415); assert(!r.bodyUsed); assert.deepEqual(f.calls, []);
});
test("UTF-8 optional quoted charset accepted; missing type rejected", async () => {
  for (const type of ["APPLICATION/JSON", "application/json; charset=UTF-8", 'application/json; charset="UTF-8"']) await check(await fixture().handler(request(undefined, { "content-type": type })), 202);
  const f = fixture(); const r = request(); r.headers.delete("content-type"); await check(await f.handler(r), 415); assert.deepEqual(f.calls, []);
});
for (const length of ["8193", "01", "-1", "+1", "1, 1", "1.0", "9007199254740992"]) test(`declared length ${length} rejected before work`, async () => {
  const f = fixture(); const r = request(undefined, { "content-length": length }); await check(await f.handler(r), length === "8193" ? 413 : 400); assert.deepEqual(f.calls, []); assert(!r.bodyUsed);
});
test("unsupported encoding before work; declared mismatch and exact match", async () => {
  const f = fixture(); await check(await f.handler(request(undefined, { "content-encoding": "gzip" })), 400); assert.deepEqual(f.calls, []);
  await check(await f.handler(request(undefined, { "content-length": "1" })), 400); assert.equal(f.released(), 1);
  const size = new TextEncoder().encode(JSON.stringify(payload)).length;
  await check(await fixture().handler(request(undefined, { "content-length": String(size) })), 202);
});
function streaming(chunks: Uint8Array[], onCancel = () => {}) {
  let index = 0;
  const stream = new ReadableStream<Uint8Array>({ pull(c) { if (index < chunks.length) c.enqueue(chunks[index++]); else c.close(); }, cancel() { onCancel(); } }, { highWaterMark: 0 });
  return new Request("https://irrelevant.example/", { method: "POST", headers: { origin: expectedOrigin, "content-type": "application/json" }, body: stream, duplex: "half" } as RequestInit);
}
test("exact 8192 byte stream accepted, crossing rejected and cancelled without register", async () => {
  const source = JSON.stringify(payload); const bytes = new TextEncoder().encode(source + " ".repeat(8192 - new TextEncoder().encode(source).length));
  await check(await fixture().handler(streaming([bytes.subarray(0, 7), bytes.subarray(7)])), 202);
  let cancelled = 0; const f = fixture(); await check(await f.handler(streaming([bytes, new Uint8Array([32])], () => { cancelled++; })), 413); assert.equal(cancelled, 1); assert.equal(f.released(), 1); assert(!f.calls.includes("register"));
});
for (const body of ["", "{", "[]", "null", "{}", '{"email":"a@b"}', JSON.stringify({ ...payload, admin: true }), '{"email":"a@b","email":"b@c"}', '{"email":"a@b","\\u0065mail":"b@c"}', '{"__proto__":"x","password":"x"}', '{"email":{},"password":"x"}', '{"email":[],"password":"x"}', '{"email":1,"password":"x"}', JSON.stringify(payload) + "null", JSON.stringify({ ...payload, email: "bad" }), JSON.stringify({ ...payload, password: "short" })]) test(`malformed/policy input rejects ${body.slice(0, 20)}`, async () => {
  const f = fixture(); await check(await f.handler(request(body)), 400, "invalid-input"); assert.equal(f.released(), 1); assert(!f.calls.includes("checker")); assert(!f.calls.includes("register"));
});
test("fatal UTF-8, BOM, absent body, stream failure and delayed-read deadline", async () => {
  for (const bytes of [new Uint8Array([0xc3, 0x28]), new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode(JSON.stringify(payload))])]) await check(await fixture().handler(streaming([bytes])), 400);
  await check(await fixture().handler(new Request("https://irrelevant.example/", { method: "POST", headers: { origin: expectedOrigin, "content-type": "application/json" } })), 400);
  const broken = new Request("https://irrelevant.example/", { method: "POST", headers: { origin: expectedOrigin, "content-type": "application/json" }, body: new ReadableStream({ start(c) { c.error(Error(password)); } }), duplex: "half" } as RequestInit);
  await check(await fixture().handler(broken), 503);
  let cancelled = false; const f = fixture(); const pending = f.handler(new Request("https://irrelevant.example/", { method: "POST", headers: { origin: expectedOrigin, "content-type": "application/json" }, body: new ReadableStream({ cancel() { cancelled = true; } }), duplex: "half" } as RequestInit));
  await Promise.resolve(); f.timeout(); await check(await pending, 503); assert(cancelled); assert.equal(f.released(), 1);
});
test("abuse denial/unavailable/throws prevent body and checker/service access", async () => {
  for (const outcome of ["denied", "unavailable", "malformed", "throw"]) {
    const f = fixture({ abuseControl: { async check() { if (outcome === "throw") throw Error(password); return outcome as "denied"; } } }); const r = request(); const res = await f.handler(r); if (outcome === "denied") assert.equal(res.headers.get("retry-after"), "60"); await check(res, outcome === "denied" ? 429 : 503); assert.deepEqual(f.calls, []); assert(!r.bodyUsed);
  }
});
test("slot denial and exceptions prevent body; checker failures release exactly once", async () => {
  for (const acquire of [() => null, () => { throw Error(password); }]) { const f = fixture({ acquireWorkSlot: acquire }); const r = request(); await check(await f.handler(r), 503); assert(!r.bodyUsed); assert.deepEqual(f.calls, ["abuse"]); }
  for (const outcome of ["rejected", "unavailable", "malformed", "throw"]) {
    const f = fixture({ compromisedPasswords: { async check() { if (outcome === "throw") throw Error(password); return outcome as "rejected"; } } }); await check(await f.handler(request()), outcome === "rejected" ? 400 : 503); assert.equal(f.released(), 1); assert(!f.calls.includes("register"));
  }
});
test("service failures/malformed results sanitized and release capacity", async () => {
  for (const result of [{ ok: false, error: { code: "invalid-input", message: password } }, { ok: false, error: { code: "unavailable", message: password } }, null, {}, { ok: true, value: { principalId: "bad" } }, { ok: true, value: { principalId: "principal:synthetic", password } }]) {
    const f = fixture(); f.setResult(result as IdentityRegistrationResult); await check(await f.handler(request()), (result as { error?: { code: string } } | null)?.error?.code === "invalid-input" ? 400 : 503); assert.equal(f.released(), 1);
  }
  const f = fixture({ registration: { async register() { throw Error(password); } } }); await check(await f.handler(request()), 503); assert.equal(f.released(), 1);
});
test("two-slot injected guard has no queue and recovers after in-flight requests", async () => {
  let active = 0; let finish!: () => void; const wait = new Promise<void>(resolve => { finish = resolve; });
  const f = fixture({ acquireWorkSlot() { if (active === 2) return null; active++; let done = false; return () => { if (!done) { active--; done = true; } }; }, compromisedPasswords: { async check() { await wait; return "allowed"; } } });
  const a = f.handler(request()), b = f.handler(request()); await Promise.resolve(); await check(await f.handler(request()), 503); assert.equal(active, 2); finish(); await check(await a, 202); await check(await b, 202); assert.equal(active, 0);
});
test("invalid configuration and throwing getters return fixed unavailable without I/O", async () => {
  for (const patch of [{ expectedOrigin: "bad" }, { expectedOrigin: expectedOrigin + "/" }, { registration: null }, { compromisedPasswords: [] }, { abuseControl: {} }, { acquireWorkSlot: null }, { scheduleTimeout: null }, { get expectedOrigin() { throw Error(password); } }]) {
    const f = fixture(); const handler = createIdentityRegistrationRequestHandler(Object.assign(Object.create(null), f.input, Object.getOwnPropertyDescriptors(patch).expectedOrigin?.get ? {} : patch) as IdentityRegistrationRequestHandlerInput);
    if (Object.getOwnPropertyDescriptors(patch).expectedOrigin?.get) { const bad = { ...f.input }; Object.defineProperty(bad, "expectedOrigin", { get() { throw Error(password); } }); await check(await createIdentityRegistrationRequestHandler(bad)(request()), 503); } else await check(await handler(request()), 503);
    assert.deepEqual(f.calls, []);
  }
});
test("timer setup/cancellation and release failures sanitized; permits released exactly once", async () => {
  for (const schedule of [() => { throw Error(password); }, () => (() => { throw Error(password); })]) {
    const f = fixture({ scheduleTimeout: schedule }); await check(await f.handler(request()), 503, "unavailable"); assert.equal(f.released(), 1); assert(!f.calls.includes("register"));
  }
  let releases = 0; const f = fixture({ acquireWorkSlot: () => () => { releases++; throw Error(password); } }); await check(await f.handler(request()), 503, "unavailable"); assert.equal(releases, 1);
});
test("security/service object receivers preserved; source isolated", async () => {
  const f = fixture(); const original = f.input;
  original.abuseControl.check = async function () { assert.equal(this, original.abuseControl); return "allowed"; };
  original.compromisedPasswords.check = async function () { assert.equal(this, original.compromisedPasswords); return "allowed"; };
  await check(await f.handler(request()), 202);
  const source = readFileSync(new URL("./principal-registration-api.ts", import.meta.url), "utf8");
  assert(!/cloudflare:workers|\.\.\/.*food|console\.|process\.env|fetch\(|createSession|wrangler/.test(source));
});
