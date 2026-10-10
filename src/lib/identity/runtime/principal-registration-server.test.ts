import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { createPrincipalId } from "../identifiers";
import { canonicalizeRegistrationClientIp, createIdentityRegistrationServerRuntime, createIdentityRegistrationWorkSlot, type IdentityRegistrationServerRuntimeInput } from "./principal-registration-server";
import type { IdentityRegistrationD1Database } from "../cloudflare/d1-registration-repository";

const failure = { ok: false, error: { code: "unavailable", message: "Registration is temporarily unavailable." } };
function fixture() {
  const calls: string[] = [];
  const queries: { sql: string; values: (string | null)[] }[] = [];
  const database: IdentityRegistrationD1Database = {
    prepare(sql) { calls.push("prepare"); assert.equal(this, database); const q = { sql, values: [] as (string | null)[] }; queries.push(q); return { bind(...values) { q.values = values; return this; } }; },
    async batch(statements) {
      calls.push("batch"); assert.equal(this, database); assert.equal(statements.length, 3);
      const [p, c] = queries.slice(-3).map(q => q.values);
      assert.match(c[2]!, /^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
      return [{ success: true, meta: { changes: 1 } }, { success: true, meta: { changes: 1 } }, { success: true, meta: { changes: 0 }, results: [{ principal_id: p[0], status: p[1], display_name: p[2], created_at: p[3], updated_at: p[4], credential_principal_id: c[0], email_normalized: c[1], password_hash: c[2], credential_created_at: c[3], credential_updated_at: c[4] }] }];
    },
  };
  const environment: Record<string, unknown> = {
    RIVER_IDENTITY_REGISTRATION_ENABLED: "true", RIVER_IDENTITY_DB: database,
    RIVER_IDENTITY_REGISTRATION_IP_LIMITER: { async limit({ key }: { key: string }) { calls.push(key); return { success: true }; } },
    RIVER_IDENTITY_REGISTRATION_SHARED_LIMITER: { async limit({ key }: { key: string }) { calls.push(key); return { success: true }; } },
  };
  const input: IdentityRegistrationServerRuntimeInput = {
    environment, site: "https://signup.example.test/", trustedClientKey: "2001:db8::1", mode: "production",
    async fetch(url, init) { calls.push("fetch"); assert.equal(url, "https://api.pwnedpasswords.com/range/00000"); assert.equal(init.method, "GET"); assert.equal(init.credentials, "omit"); assert.equal(Object.hasOwn(init, "redirect"), false); assert.equal(init.cache, "no-store"); assert.deepEqual(init.headers, { "Add-Padding": "true" }); assert.equal(init.body, undefined); return new Response("0".repeat(35) + ":0\n"); },
    subtle: { async digest(algorithm, bytes) { calls.push("digest"); assert.equal(algorithm, "SHA-1"); assert.equal(new TextDecoder().decode(bytes as Uint8Array), "Synthetic password only"); return new ArrayBuffer(20); } },
    scheduleTimeout(_callback, milliseconds) { calls.push("timer:" + milliseconds); return () => { calls.push("cancel:" + milliseconds); }; },
    acquireWorkSlot() { calls.push("slot"); return () => { calls.push("release"); }; },
    generatePrincipalId() { calls.push("id"); return createPrincipalId("synthetic-c1"); },
    now() { calls.push("clock"); return new Date("2026-01-01T00:00:00.000Z"); },
  };
  return { input, environment, database, calls, queries };
}
function request(origin = "https://signup.example.test") {
  return new Request("https://untrusted-host.example.test/api/identity/register", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ email: "Synthetic@example.test", password: "Synthetic password only" }) });
}

test("construction exposes only unchanged A handler and performs zero operations", () => {
  const f = fixture(); const result = createIdentityRegistrationServerRuntime(f.input);
  assert(result.ok); assert.deepEqual(Object.keys(result), ["ok", "value"]); assert.equal(typeof result.value, "function"); assert.deepEqual(Object.keys(result.value), []); assert.deepEqual(f.calls, []);
});
test("all validation precedes adapter construction; exact injected references and A result preserved", () => {
  const source = readFileSync(new URL("./principal-registration-server.ts", import.meta.url), "utf8");
  const calls: string[] = []; const f = fixture();
  const checker = { async check() { return "allowed"; } }; const abuse = { async check() { return "allowed"; } };
  const outcome = { ok: true, value: async () => new Response(null, { status: 202 }) };
  const exports: Record<string, unknown> = {};
  new vm.Script(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText).runInNewContext({ exports, URL, require(id: string) {
    if (id.endsWith("principal-registration-api")) return { createIdentityRegistrationRuntime(input: Record<string, unknown>) {
      calls.push("A"); assert.equal(input.database, f.database); assert.equal(input.expectedOrigin, "https://signup.example.test"); assert.equal(input.compromisedPasswords, checker); assert.equal(input.abuseControl, abuse);
      for (const key of ["scheduleTimeout", "acquireWorkSlot", "generatePrincipalId", "now"] as const) assert.equal(input[key], f.input[key]);
      return outcome;
    } };
    if (id.endsWith("pwned-passwords-checker")) return { createPwnedPasswordsRegistrationChecker(input: Record<string, unknown>) {
      calls.push("checker"); assert.equal(input.fetch, f.input.fetch); assert.equal(input.subtle, f.input.subtle); assert.equal(input.scheduleTimeout, f.input.scheduleTimeout); return checker;
    } };
    if (id.endsWith("registration-abuse-control")) return { createCloudflareRegistrationAbuseControl(input: Record<string, unknown>) {
      calls.push("abuse"); assert.equal(input.ipLimiter, f.environment.RIVER_IDENTITY_REGISTRATION_IP_LIMITER); assert.equal(input.sharedLimiter, f.environment.RIVER_IDENTITY_REGISTRATION_SHARED_LIMITER); assert.equal(input.trustedClientKey, f.input.trustedClientKey); return abuse;
    } };
    throw Error("unexpected module");
  } });
  const create = exports.createIdentityRegistrationServerRuntime as typeof createIdentityRegistrationServerRuntime;
  for (const patch of badInputs) { const invalid = create({ ...f.input, ...patch } as IdentityRegistrationServerRuntimeInput); assert.equal(invalid.ok, false); assert.deepEqual(calls, []); }
  assert.equal(create(f.input), outcome); assert.deepEqual(calls, ["checker", "abuse", "A"]); assert.deepEqual(f.calls, []);
});

for (const [value, expected] of [
  ["0.0.0.0", "0.0.0.0"], ["255.255.255.255", "255.255.255.255"], ["192.0.2.4", "192.0.2.4"],
  ["::", "::"], ["::1", "::1"], ["2001:0DB8:0000:0000:0000:0000:0000:0001", "2001:db8::1"],
  ["::ffff:192.0.2.128", "::ffff:c000:280"], ["2001:DB8::a", "2001:db8::a"],
] as const) test("canonical IP: " + value, () => assert.equal(canonicalizeRegistrationClientIp(value), expected));
for (const value of [undefined, null, 1, [], {}, "", " 192.0.2.1", "192.0.2.1 ", "01.2.3.4", "256.2.3.4", "1.2.3", "127.1", "0x7f000001", "1.2.3.4:80", "[::1]", "[::1]:80", "fe80::1%eth0", "::1,::2", "https://example.test", "1::2::3", ":::1", "gg::1", "1:2:3:4:5:6:7", "1:2:3:4:5:6:7:8:9", "a".repeat(46), "::1\n"]) {
  test("reject IP " + JSON.stringify(value), () => assert.equal(canonicalizeRegistrationClientIp(value), null));
}
for (const value of [undefined, null, [], 1, "true"]) test("reject outer input " + JSON.stringify(value), () => assert.deepEqual(createIdentityRegistrationServerRuntime(value as unknown as IdentityRegistrationServerRuntimeInput), failure));
const badInputs: Record<string, unknown>[] = [
  ...[undefined, null, [], 1].map(environment => ({ environment })),
  ...[undefined, null, [], 1, "", " /", "/", "signup.example.test", "https:/signup.example.test", "https://signup.example.test/path", "https://user:pass@signup.example.test", "https://signup.example.test?", "https://signup.example.test#", "https://signup.example.test/?q=1", "https://signup.example.test/#x", " https://signup.example.test", "https://signup.example.test ", "ftp://signup.example.test", "http://signup.example.test"].map(site => ({ site })),
  ...[undefined, null, 1, "", "01.2.3.4", "2001:DB8::1", "::ffff:192.0.2.128"].map(trustedClientKey => ({ trustedClientKey })),
  { mode: "dev" }, { mode: null }, { fetch: null }, { subtle: null }, { subtle: [] }, { subtle: { digest: 1 } }, { scheduleTimeout: null }, { acquireWorkSlot: null }, { generatePrincipalId: null }, { now: null },
];
badInputs.forEach((patch, i) => test("invalid input case " + i, () => {
  const f = fixture(); assert.deepEqual(createIdentityRegistrationServerRuntime({ ...f.input, ...patch } as IdentityRegistrationServerRuntimeInput), failure); assert.deepEqual(f.calls, []);
}));
for (const key of ["RIVER_IDENTITY_DB", "RIVER_IDENTITY_REGISTRATION_IP_LIMITER", "RIVER_IDENTITY_REGISTRATION_SHARED_LIMITER", "RIVER_IDENTITY_REGISTRATION_ENABLED"]) {
  for (const value of [undefined, null, [], {}, 1, false, true, "false", "TRUE"]) test("bad environment " + key + " " + JSON.stringify(value), () => {
    const f = fixture(); f.environment[key] = value; assert.deepEqual(createIdentityRegistrationServerRuntime(f.input), failure); assert.deepEqual(f.calls, []);
  });
  test("throwing environment " + key, () => {
    const f = fixture(); Object.defineProperty(f.environment, key, { get() { throw Error("private config value"); } }); assert.deepEqual(createIdentityRegistrationServerRuntime(f.input), failure); assert.deepEqual(f.calls, []);
  });
}
for (const key of ["environment", "site", "trustedClientKey", "mode", "fetch", "subtle", "scheduleTimeout", "acquireWorkSlot", "generatePrincipalId", "now"]) test("throwing input " + key, () => {
  const f = fixture(); Object.defineProperty(f.input, key, { get() { throw Error("private input"); } }); assert.deepEqual(createIdentityRegistrationServerRuntime(f.input), failure); assert.deepEqual(f.calls, []);
});
for (const [binding, method] of [["RIVER_IDENTITY_DB", "prepare"], ["RIVER_IDENTITY_DB", "batch"], ["RIVER_IDENTITY_REGISTRATION_IP_LIMITER", "limit"], ["RIVER_IDENTITY_REGISTRATION_SHARED_LIMITER", "limit"]]) {
  for (const throws of [false, true]) test("bad method " + binding + "." + method + " throws=" + throws, () => {
    const f = fixture(); Object.defineProperty(f.environment[binding], method, throws ? { get() { throw Error("private binding"); } } : { value: 1 }); assert.deepEqual(createIdentityRegistrationServerRuntime(f.input), failure); assert.deepEqual(f.calls, []);
  });
}
test("throwing digest access fails closed", () => {
  const f = fixture(); Object.defineProperty(f.input.subtle, "digest", { get() { throw Error("private digest"); } }); assert.deepEqual(createIdentityRegistrationServerRuntime(f.input), failure); assert.deepEqual(f.calls, []);
});
test("explicit isolated HTTP site supported without production fallback", () => {
  const f = fixture(); const result = createIdentityRegistrationServerRuntime({ ...f.input, mode: "isolated-test", site: "http://localhost:9876/" }); assert(result.ok); assert.deepEqual(f.calls, []);
});
test("environment reads exactly four specified keys; no alternate fallback", () => {
  const f = fixture(); const reads: string[] = []; const environment = new Proxy(f.environment, { get(target, key) { reads.push(String(key)); return target[String(key)]; } });
  assert(createIdentityRegistrationServerRuntime({ ...f.input, environment }).ok);
  assert.deepEqual(reads, ["RIVER_IDENTITY_REGISTRATION_ENABLED", "RIVER_IDENTITY_DB", "RIVER_IDENTITY_REGISTRATION_IP_LIMITER", "RIVER_IDENTITY_REGISTRATION_SHARED_LIMITER"]);
  delete f.environment.RIVER_IDENTITY_DB; f.environment.DB = f.database; assert.deepEqual(createIdentityRegistrationServerRuntime(f.input), failure);
});
test("trusted SITE origin, never incoming host/origin, governs A policy", async () => {
  const f = fixture(); const result = createIdentityRegistrationServerRuntime({ ...f.input, site: "https://SIGNUP.example.test:443/" }); assert(result.ok);
  const wrong = request("https://untrusted-host.example.test"); assert.equal((await result.value(wrong)).status, 403); assert.equal(wrong.bodyUsed, false); assert.deepEqual(f.calls, []);
  const method = await result.value(new Request("https://elsewhere.example/", { method: "DELETE" })); assert.equal(method.status, 405); assert.equal(method.headers.get("allow"), "POST"); assert.deepEqual(f.calls, []);
});
test("concrete B adapters precede unchanged ZB repository/Argon2 in one atomic synthetic batch", async () => {
  const f = fixture(); const result = createIdentityRegistrationServerRuntime(f.input); assert(result.ok);
  const response = await result.value(request()); assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { ok: true, message: "Registration request processed. Continue to sign in." }); assert.equal(response.headers.get("set-cookie"), null);
  assert.deepEqual(f.calls, ["registration:ip:2001:db8::1", "registration:shared", "slot", "timer:5000", "cancel:5000", "timer:3000", "digest", "fetch", "cancel:3000", "id", "clock", "prepare", "prepare", "prepare", "batch", "release"]);
  assert.equal(f.queries.length, 3); assert.equal(f.queries[0].values[0], "principal:synthetic-c1"); assert.equal(f.queries[1].values[1], "synthetic@example.test");
});
for (const outcome of ["denied", "unavailable"] as const) test("IP " + outcome + " stops before body/checker/database", async () => {
  const f = fixture(); f.environment.RIVER_IDENTITY_REGISTRATION_IP_LIMITER = { async limit() { f.calls.push("ip"); if (outcome === "unavailable") throw Error("private limiter"); return { success: false }; } };
  const result = createIdentityRegistrationServerRuntime(f.input); assert(result.ok); const req = request(); assert.equal((await result.value(req)).status, outcome === "denied" ? 429 : 503); assert.equal(req.bodyUsed, false); assert.deepEqual(f.calls, ["ip"]);
});
test("shared denial consumes only IP/shared, not body", async () => {
  const f = fixture(); f.environment.RIVER_IDENTITY_REGISTRATION_SHARED_LIMITER = { async limit() { f.calls.push("shared-denied"); return { success: false }; } };
  const result = createIdentityRegistrationServerRuntime(f.input); assert(result.ok); const req = request(); assert.equal((await result.value(req)).status, 429); assert.equal(req.bodyUsed, false); assert.deepEqual(f.calls, ["registration:ip:2001:db8::1", "shared-denied"]);
});
test("checker rejection/unavailability never hashes, generates or writes", async () => {
  for (const [response, status] of [[new Response("0".repeat(35) + ":1"), 400], [new Response("bad range"), 503]] as const) {
    const f = fixture(); const input = { ...f.input, fetch: async () => response }; const result = createIdentityRegistrationServerRuntime(input); assert(result.ok);
    assert.equal((await result.value(request())).status, status);
    assert(!f.calls.includes("id")); assert(!f.calls.includes("prepare")); assert(f.calls.includes("release"));
  }
});
test("two-slot helper is bounded/idempotent and recovers without queue", () => {
  const acquire = createIdentityRegistrationWorkSlot(); const a = acquire(), b = acquire(); assert(a && b); assert.equal(acquire(), null); a(); a(); const c = acquire(); assert(c); assert.equal(acquire(), null); b(); c(); const d = acquire(), e = acquire(); assert(d && e); assert.equal(acquire(), null); d(); e();
});
test("independent request runtimes share capacity and release after completion", async () => {
  const acquire = createIdentityRegistrationWorkSlot(); let finish!: () => void;
  const held = new Promise<void>(resolve => { finish = resolve; }); const fs = [fixture(), fixture(), fixture()];
  let started = 0; let ready!: () => void; const bothStarted = new Promise<void>(resolve => { ready = resolve; });
  const runtimes = fs.map(f => createIdentityRegistrationServerRuntime({ ...f.input, acquireWorkSlot: acquire, fetch: async () => { if (++started === 2) ready(); await held; return new Response("invalid"); } }));
  assert(runtimes.every(r => r.ok)); const handlers = runtimes.map(r => { assert(r.ok); return r.value; });
  const a = handlers[0](request()), b = handlers[1](request()); await bothStarted;
  const third = request(); assert.equal((await handlers[2](third)).status, 503); assert.equal(third.bodyUsed, false); assert(!fs[2].calls.includes("digest"));
  finish(); assert.equal((await a).status, 503); assert.equal((await b).status, 503); const release = acquire(); assert(release); release();
});
test("source delegates closed authorities without globals, session or FOOD dependencies", () => {
  const source = readFileSync(new URL("./principal-registration-server.ts", import.meta.url), "utf8");
  assert(!/cloudflare:workers|process\.env|import\.meta|createSession|food\/|RIVER_FOOD|\.hashPassword\(|\.prepare\(|\.batch\(|\.limit\(/.test(source));
  assert.match(source, /createIdentityRegistrationRuntime\(/); assert.match(source, /createPwnedPasswordsRegistrationChecker\(/); assert.match(source, /createCloudflareRegistrationAbuseControl\(/);
});
