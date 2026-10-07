import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createIdentityRegistrationRuntime, type IdentityRegistrationRuntimeInput } from "./principal-registration-api";
import { createPrincipalId } from "../identifiers";
const failure = { ok: false, error: { code: "unavailable", message: "Registration is temporarily unavailable." } };
function fixture() {
  const calls: string[] = [];
  const input: IdentityRegistrationRuntimeInput = {
    database: { prepare() { calls.push("prepare"); throw Error("synthetic-storage-detail"); }, async batch() { calls.push("batch"); throw Error(); } },
    expectedOrigin: "https://signup.example.test",
    compromisedPasswords: { async check() { calls.push("check"); return "allowed"; } },
    abuseControl: { async check() { calls.push("abuse"); return "allowed"; } },
    acquireWorkSlot() { calls.push("slot"); return () => { calls.push("release"); }; },
    scheduleTimeout() { calls.push("timer"); return () => { calls.push("cancel-timer"); }; },
    generatePrincipalId() { calls.push("id"); return createPrincipalId("synthetic-runtime"); },
    now() { calls.push("clock"); return new Date("2026-01-01T00:00:00.000Z"); },
  };
  return { input, calls };
}
function request() { return new Request("https://unused.example/", { method: "POST", headers: { origin: "https://signup.example.test", "content-type": "application/json" }, body: JSON.stringify({ email: "synthetic@example.test", password: "Synthetic password 😀" }) }); }
test("valid construction service-free handler-only result and zero dependency calls", () => {
  const f = fixture(); const result = createIdentityRegistrationRuntime(f.input); assert(result.ok); assert.equal(typeof result.value, "function"); assert.deepEqual(Object.keys(result).sort(), ["ok", "value"]); assert.deepEqual(Object.keys(result.value), []); assert.deepEqual(f.calls, []);
});
test("malformed/throwing dependencies fail closed before construction work", () => {
  for (const patch of [{ database: null }, { database: [] }, { database: { prepare: null, batch() {} } }, { database: { prepare() {}, batch: null } }, { compromisedPasswords: null }, { compromisedPasswords: { check: 1 } }, { abuseControl: [] }, { abuseControl: { check: false } }, { expectedOrigin: "null" }, { expectedOrigin: "https://signup.example.test/" }, { expectedOrigin: "https://user:pass@signup.example.test" }, { acquireWorkSlot: null }, { scheduleTimeout: null }, { generatePrincipalId: null }, { now: null }]) {
    const f = fixture(); assert.deepEqual(createIdentityRegistrationRuntime({ ...f.input, ...patch } as unknown as IdentityRegistrationRuntimeInput), failure); assert.deepEqual(f.calls, []);
  }
  for (const value of [null, undefined, []]) assert.deepEqual(createIdentityRegistrationRuntime(value as unknown as IdentityRegistrationRuntimeInput), failure);
  for (const key of ["database", "expectedOrigin", "compromisedPasswords", "abuseControl", "acquireWorkSlot", "scheduleTimeout", "generatePrincipalId", "now"]) {
    const f = fixture(); Object.defineProperty(f.input, key, { get() { throw Error("private-configuration"); } }); assert.deepEqual(createIdentityRegistrationRuntime(f.input), failure); assert.deepEqual(f.calls, []);
  }
});
test("runtime request policy precedes injected calls; approved operation reaches unchanged ZB D1 adapter", async () => {
  const f = fixture(); const result = createIdentityRegistrationRuntime(f.input); assert(result.ok);
  const bad = request(); bad.headers.delete("origin"); assert.equal((await result.value(bad)).status, 403); assert.deepEqual(f.calls, []);
  const response = await result.value(request()); assert.equal(response.status, 503); const text = await response.text(); assert(!text.includes("synthetic-storage-detail"));
  assert.deepEqual(f.calls, ["abuse", "slot", "timer", "cancel-timer", "check", "id", "clock", "prepare", "release"]);
});
test("successful runtime uses one atomic batch and keeps database receiver; real hasher reused", async () => {
  const f = fixture(); const queries: { sql: string; values: (string | null)[] }[] = []; let batches = 0;
  f.input.database.prepare = function (sql) { assert.equal(this, f.input.database); const q = { sql, values: [] as (string | null)[] }; queries.push(q); return { bind(...values) { q.values = values; return this; } }; };
  f.input.database.batch = async function () {
    assert.equal(this, f.input.database); batches++; const [p, c] = queries.map(q => q.values);
    assert((c[2] as string).startsWith("$argon2id$v=19$m=19456,t=2,p=1$"));
    return [{ success: true, meta: { changes: 1 } }, { success: true, meta: { changes: 1 } }, { success: true, meta: { changes: 0 }, results: [{ principal_id: p[0], status: p[1], display_name: p[2], created_at: p[3], updated_at: p[4], credential_principal_id: c[0], email_normalized: c[1], password_hash: c[2], credential_created_at: c[3], credential_updated_at: c[4] }] }];
  };
  const result = createIdentityRegistrationRuntime(f.input); assert(result.ok); assert.equal(batches, 0);
  assert.equal((await result.value(request())).status, 202); assert.equal(batches, 1); assert.equal(queries.length, 3); assert.equal(queries[0].values[0], "principal:synthetic-runtime");
});
test("runtime source has no env acquisition, route, session or external network adapter", () => {
  const source = readFileSync(new URL("./principal-registration-api.ts", import.meta.url), "utf8"); assert(!/cloudflare:workers|process\.env|import\.meta\.env|wrangler|fetch\(|createSession|\.\.\/.*food/.test(source));
});
