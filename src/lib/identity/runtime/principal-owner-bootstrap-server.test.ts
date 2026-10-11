import assert from "node:assert/strict";
import test from "node:test";
import { webcrypto } from "node:crypto";
import { createPrincipalId } from "../identifiers";
import type { IdentityRegistrationD1Database } from "../cloudflare/d1-registration-repository";
import { createIdentityOwnerBootstrapServerRuntime, verifyOwnerBootstrapBearer, type IdentityOwnerBootstrapServerRuntimeInput } from "./principal-owner-bootstrap-server";

const token = "synthetic_bootstrap_authorization_only_0123456789";
const ownerEmail = "bootstrap-owner@example.test";
const password = "Synthetic bootstrap password only";
const unavailable = { ok: false, error: { code: "unavailable", message: "Registration is temporarily unavailable." } };
const acknowledgement = { ok: true, message: "Registration request processed. Continue to sign in." };
function fixture() {
  const calls: string[] = [];
  const queries: { sql: string; values: (string | null)[] }[] = [];
  const control = { principals: 0, credentials: 0, range: "0".repeat(35) + ":0", countResult: undefined as unknown, countThrows: false, persistenceThrows: false };
  const database: IdentityRegistrationD1Database = {
    prepare(sql) {
      assert.equal(this, database);
      const query = { sql, values: [] as (string | null)[] }; queries.push(query);
      return { bind(...values) { query.values = values; return this; } };
    },
    async batch(statements) {
      assert.equal(this, database);
      if (statements.length === 1) {
        calls.push("counts");
        assert.equal(queries.at(-1)?.sql, "SELECT (SELECT COUNT(*) FROM principals) AS principals, (SELECT COUNT(*) FROM principal_password_credentials) AS credentials");
        assert.deepEqual(queries.at(-1)?.values, []);
        if (control.countThrows) throw Error("synthetic-private-storage-detail");
        if (control.countResult !== undefined) return control.countResult as Awaited<ReturnType<typeof database.batch>>;
        return [{ success: true, meta: { changes: 0 }, results: [{ principals: control.principals, credentials: control.credentials }] }];
      }
      calls.push("persist"); assert.equal(statements.length, 3);
      if (control.persistenceThrows) throw Error("synthetic-private-persistence-detail");
      const [p, c] = queries.slice(-3).map(query => query.values);
      assert.equal(c[1], ownerEmail); assert.match(c[2]!, /^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
      return [{ success: true, meta: { changes: 1 } }, { success: true, meta: { changes: 1 } }, {
        success: true, meta: { changes: 0 }, results: [{ principal_id: p[0], status: p[1], display_name: p[2], created_at: p[3], updated_at: p[4], credential_principal_id: c[0], email_normalized: c[1], password_hash: c[2], credential_created_at: c[3], credential_updated_at: c[4] }],
      }];
    },
  };
  const subtle = {
    importKey: webcrypto.subtle.importKey.bind(webcrypto.subtle),
    sign: webcrypto.subtle.sign.bind(webcrypto.subtle),
    async verify(...args: Parameters<typeof webcrypto.subtle.verify>) { calls.push("authorize"); return webcrypto.subtle.verify(...args); },
    async digest() { calls.push("digest"); return new ArrayBuffer(20); },
  } as unknown as IdentityOwnerBootstrapServerRuntimeInput["subtle"];
  const environment: Record<string, unknown> = {
    RIVER_IDENTITY_OWNER_BOOTSTRAP_ENABLED: "true", RIVER_IDENTITY_REGISTRATION_ENABLED: "false",
    RIVER_IDENTITY_OWNER_BOOTSTRAP_TOKEN: token, RIVER_IDENTITY_OWNER_BOOTSTRAP_EMAIL: ownerEmail,
    RIVER_IDENTITY_DB: database,
    RIVER_IDENTITY_REGISTRATION_IP_LIMITER: { async limit() { calls.push("ip"); return { success: true }; } },
    RIVER_IDENTITY_REGISTRATION_SHARED_LIMITER: { async limit() { calls.push("shared"); return { success: true }; } },
  };
  const input: IdentityOwnerBootstrapServerRuntimeInput = {
    environment, site: "https://bootstrap.example.test/", trustedClientKey: "192.0.2.1", mode: "production", subtle,
    async fetch() { calls.push("hibp"); return new Response(control.range); },
    scheduleTimeout(_callback, milliseconds) { calls.push("timer:" + milliseconds); return () => {}; },
    acquireWorkSlot() { calls.push("slot"); return () => { calls.push("release"); }; },
    generatePrincipalId() { calls.push("principal-id"); return createPrincipalId("synthetic-bootstrap"); },
    now() { return new Date("2026-01-01T00:00:00.000Z"); },
  };
  async function run(request = bootstrapRequest()) {
    const runtime = createIdentityOwnerBootstrapServerRuntime(input);
    assert(runtime.ok); return runtime.value(request);
  }
  return { calls, queries, control, database, environment, input, run };
}
function bootstrapRequest(options: { authorization?: string | null; origin?: string | null; body?: string; method?: string; email?: string; password?: string } = {}) {
  const headers = new Headers({ "content-type": "application/json" });
  const origin = options.origin === undefined ? "https://bootstrap.example.test" : options.origin;
  const authorization = options.authorization === undefined ? "Bearer " + token : options.authorization;
  if (origin !== null) headers.set("origin", origin);
  if (authorization !== null) headers.set("authorization", authorization);
  const method = options.method ?? "POST";
  return new Request("https://reachable-version.example.test/api/identity/bootstrap-owner", {
    method, headers, ...(method === "POST" ? { body: options.body ?? JSON.stringify({ email: options.email ?? ownerEmail, password: options.password ?? password }) } : {}),
  });
}
async function checkPrivacy(response: Response, status: number) {
  assert.equal(response.status, status);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("access-control-allow-origin"), null);
  assert.equal(response.headers.get("set-cookie"), null);
  const text = await response.text();
  for (const privateValue of [token, ownerEmail, password, "synthetic-private", "$argon2id$", "principal:synthetic-bootstrap"]) assert(!text.includes(privateValue));
  return JSON.parse(text);
}
function assertNoPasswordWork(f: ReturnType<typeof fixture>) {
  for (const call of ["digest", "hibp", "persist", "principal-id"]) assert(!f.calls.includes(call));
}

test("Web Crypto HMAC verification accepts exact token and rejects same-length incorrect token", async () => {
  const subtle = webcrypto.subtle as unknown as IdentityOwnerBootstrapServerRuntimeInput["subtle"];
  assert.equal(await verifyOwnerBootstrapBearer("Bearer " + token, token, subtle), true);
  assert.equal(await verifyOwnerBootstrapBearer("Bearer X" + token.slice(1), token, subtle), false);
});

test("closed mode, exact enabling string, mutual exclusion and invalid secret configuration fail before operations", () => {
  const patches = [
    ...[undefined, false, true, "false", "TRUE", "true "].map(value => ({ RIVER_IDENTITY_OWNER_BOOTSTRAP_ENABLED: value })),
    { RIVER_IDENTITY_REGISTRATION_ENABLED: "true" },
    ...[undefined, null, "", "short", token + "\n", "a".repeat(257)].map(value => ({ RIVER_IDENTITY_OWNER_BOOTSTRAP_TOKEN: value })),
    ...[undefined, null, "", "bad", "a@@b"].map(value => ({ RIVER_IDENTITY_OWNER_BOOTSTRAP_EMAIL: value })),
  ];
  for (const patch of patches) {
    const f = fixture(); Object.assign(f.environment, patch);
    assert.deepEqual(createIdentityOwnerBootstrapServerRuntime(f.input), unavailable); assert.deepEqual(f.calls, []); assert.deepEqual(f.queries, []);
  }
});

test("missing/malformed infrastructure, SITE and canonical client IP fail closed without operations", () => {
  for (const patch of [
    { trustedClientKey: null }, { trustedClientKey: "" }, { trustedClientKey: "01.2.3.4" }, { trustedClientKey: "2001:DB8::1" },
    { site: "http://bootstrap.example.test/" }, { site: "https://bootstrap.example.test/path" }, { site: "https://bootstrap.example.test/?" },
    { subtle: { digest() {} } }, { mode: "dev" }, { fetch: null },
  ]) {
    const f = fixture(); assert.deepEqual(createIdentityOwnerBootstrapServerRuntime({ ...f.input, ...patch } as unknown as IdentityOwnerBootstrapServerRuntimeInput), unavailable); assert.deepEqual(f.calls, []);
  }
  for (const name of ["RIVER_IDENTITY_DB", "RIVER_IDENTITY_REGISTRATION_IP_LIMITER", "RIVER_IDENTITY_REGISTRATION_SHARED_LIMITER"]) {
    const f = fixture(); f.environment[name] = {}; assert.deepEqual(createIdentityOwnerBootstrapServerRuntime(f.input), unavailable); assert.deepEqual(f.calls, []);
  }
  const f = fixture(); Object.defineProperty(f.environment, "RIVER_IDENTITY_OWNER_BOOTSTRAP_TOKEN", { get() { throw Error(token); } });
  assert.deepEqual(createIdentityOwnerBootstrapServerRuntime(f.input), unavailable);
});

test("method and canonical SITE Origin checks precede bearer verification", async () => {
  for (const options of [{ method: "GET" }, { origin: null }, { origin: "https://reachable-version.example.test" }, { origin: "https://bootstrap.example.test/" }]) {
    const f = fixture(); const response = await f.run(bootstrapRequest(options));
    await checkPrivacy(response, options.method ? 405 : 403); assert.deepEqual(f.calls, []); assert.deepEqual(f.queries, []);
  }
});

test("missing, malformed, wrong-scheme and wrong bearer tokens fail before abuse, body, counts or HIBP", async () => {
  for (const authorization of [null, "Basic " + token, "Bearer short", "Bearer X" + token.slice(1), "Bearer " + token + " extra"]) {
    const f = fixture(); const request = bootstrapRequest({ authorization });
    assert.deepEqual(await checkPrivacy(await f.run(request), 503), unavailable);
    assert.equal(request.bodyUsed, false); assert(!f.calls.includes("ip")); assert.deepEqual(f.queries, []); assertNoPasswordWork(f);
  }
});

test("crypto failure fails closed with no secret disclosure", async () => {
  const f = fixture(); f.input.subtle.verify = async () => { throw Error(token); };
  assert.deepEqual(await checkPrivacy(await f.run(), 503), unavailable); assert.deepEqual(f.queries, []); assertNoPasswordWork(f);
});

test("shared request parsing preserves bounded JSON, exact fields and local password validation", async () => {
  for (const body of ["{", JSON.stringify({ email: ownerEmail, password: "short" }), JSON.stringify({ email: ownerEmail, password, token }), JSON.stringify({ email: ownerEmail, password, role: "admin" }), '{"email":"a@b","email":"c@d"}']) {
    const f = fixture(); await checkPrivacy(await f.run(bootstrapRequest({ body })), 400); assert.deepEqual(f.queries, []); assertNoPasswordWork(f); assert(f.calls.includes("release"));
  }
  const f = fixture(); await checkPrivacy(await f.run(bootstrapRequest({ body: "x".repeat(8193) })), 413); assert.deepEqual(f.queries, []); assertNoPasswordWork(f);
});

test("wrong normalized email fails before COUNT or HIBP and cannot target another account", async () => {
  const f = fixture(); assert.deepEqual(await checkPrivacy(await f.run(bootstrapRequest({ email: "other-owner@example.test" })), 503), unavailable);
  assert.deepEqual(f.queries, []); assertNoPasswordWork(f); assert(f.calls.includes("release"));
});

test("either nonempty table blocks HIBP, hashing and persistence", async () => {
  for (const counts of [{ principals: 1, credentials: 0 }, { principals: 0, credentials: 1 }, { principals: 1, credentials: 1 }]) {
    const f = fixture(); Object.assign(f.control, counts);
    assert.deepEqual(await checkPrivacy(await f.run(), 503), unavailable); assert.deepEqual(f.calls.filter(call => call === "counts"), ["counts"]); assertNoPasswordWork(f);
    assert.equal(f.queries.length, 1); assert.match(f.queries[0].sql, /^SELECT /); assert(!/INSERT|UPDATE|DELETE/.test(f.queries[0].sql));
  }
});

test("malformed, failed, missing or throwing COUNT results fail closed", async () => {
  for (const result of [[], [{ success: false }], [{ success: true, meta: { changes: 1 }, results: [{ principals: 0, credentials: 0 }] }],
    [{ success: true, meta: { changes: 0 }, results: [] }], [{ success: true, meta: { changes: 0 }, results: [{ principals: "0", credentials: 0 }] }],
    [{ success: true, meta: { changes: 0 }, results: [{ principals: 0 }] }]]) {
    const f = fixture(); f.control.countResult = result; await checkPrivacy(await f.run(), 503); assertNoPasswordWork(f);
  }
  const f = fixture(); f.control.countThrows = true; await checkPrivacy(await f.run(), 503); assertNoPasswordWork(f);
});

test("existing IP/shared limits and work-slot denial still stop all password work", async () => {
  for (const name of ["RIVER_IDENTITY_REGISTRATION_IP_LIMITER", "RIVER_IDENTITY_REGISTRATION_SHARED_LIMITER"]) {
    const f = fixture(); f.environment[name] = { async limit() { return { success: false }; } };
    await checkPrivacy(await f.run(), 429); assert.deepEqual(f.queries, []); assertNoPasswordWork(f);
  }
  const f = fixture(); Object.assign(f.input, { acquireWorkSlot: () => null }); await checkPrivacy(await f.run(), 503); assert.deepEqual(f.queries, []); assertNoPasswordWork(f);
});

test("authorized normalized owner and empty store reach corrected HIBP, real Argon2id and canonical persistence", async () => {
  const f = fixture(); f.environment.RIVER_IDENTITY_OWNER_BOOTSTRAP_EMAIL = " Bootstrap-Owner@Example.test ";
  const response = await f.run(bootstrapRequest({ email: " BOOTSTRAP-OWNER@EXAMPLE.TEST " }));
  assert.deepEqual(await checkPrivacy(response, 202), acknowledgement);
  assert.deepEqual(f.calls.filter(call => ["authorize", "ip", "shared", "slot", "counts", "digest", "hibp", "persist", "release"].includes(call)),
    ["authorize", "ip", "shared", "slot", "counts", "digest", "hibp", "persist", "release"]);
  assert.equal(f.queries.length, 4); assert.match(f.queries[1].sql, /^INSERT INTO principals /); assert.match(f.queries[2].sql, /^INSERT INTO principal_password_credentials /);
  assert.equal(f.queries[1].values[1], "active"); assert.equal(f.queries[2].values[1], ownerEmail);
});

test("compromised password and unavailable HIBP retain existing fail-closed behavior", async () => {
  const f = fixture(); f.control.range = "0".repeat(35) + ":1";
  const response = await f.run(); const body = await checkPrivacy(response, 400); assert.equal(body.error.code, "password-rejected"); assert(!f.calls.includes("persist")); assert(!f.calls.includes("principal-id"));
  const g = fixture(); Object.assign(g.input, { fetch: async () => { throw Error("synthetic-private-outbound-detail"); } });
  await checkPrivacy(await g.run(), 503); assert(!g.calls.includes("persist")); assert(!g.calls.includes("principal-id"));
});

test("persistence errors stay sanitized and do not create sessions or authority", async () => {
  const f = fixture(); f.control.persistenceThrows = true; await checkPrivacy(await f.run(), 503);
  assert.equal(f.calls.filter(call => call === "persist").length, 1);
});
