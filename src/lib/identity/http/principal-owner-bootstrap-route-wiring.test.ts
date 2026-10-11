import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
import vm from "node:vm";
import ts from "typescript";
import { createPrincipalId } from "../identifiers";
import { canonicalizeRegistrationClientIp, createIdentityRegistrationWorkSlot } from "../runtime/principal-registration-server";
import { createIdentityOwnerBootstrapServerRuntime, type IdentityOwnerBootstrapServerRuntimeInput } from "../runtime/principal-owner-bootstrap-server";

const source = readFileSync(new URL("../../../pages/api/identity/bootstrap-owner.ts", import.meta.url), "utf8");
type Route = (context: { request: Request }) => Promise<Response>;
function harness(options: { environment?: unknown; prod?: unknown; runtime?: (input: IdentityOwnerBootstrapServerRuntimeInput) => ReturnType<typeof createIdentityOwnerBootstrapServerRuntime> } = {}) {
  const calls: string[] = []; const inputs: IdentityOwnerBootstrapServerRuntimeInput[] = [];
  const environment: Record<string, unknown> = {
    RIVER_IDENTITY_OWNER_BOOTSTRAP_ENABLED: "true", RIVER_IDENTITY_REGISTRATION_ENABLED: "false",
    RIVER_IDENTITY_OWNER_BOOTSTRAP_TOKEN: "synthetic_bootstrap_route_token_0123456789",
    RIVER_IDENTITY_OWNER_BOOTSTRAP_EMAIL: "route-owner@example.test",
    RIVER_IDENTITY_DB: { prepare() { calls.push("database"); throw Error("synthetic-private"); }, async batch() { calls.push("database"); throw Error(); } },
    RIVER_IDENTITY_REGISTRATION_IP_LIMITER: { async limit() { calls.push("ip"); return { success: true }; } },
    RIVER_IDENTITY_REGISTRATION_SHARED_LIMITER: { async limit() { calls.push("shared"); return { success: true }; } },
  };
  const selected = Object.hasOwn(options, "environment") ? options.environment : environment;
  const exports: Record<string, unknown> = {};
  const code = ts.transpileModule(source.replaceAll("import.meta.env", "testMeta"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new vm.Script(code).runInNewContext({
    exports, Response, Date, testMeta: { SITE: "https://bootstrap.example.test/", PROD: Object.hasOwn(options, "prod") ? options.prod : true },
    crypto: { subtle: webcrypto.subtle, randomUUID() { calls.push("principal-id"); return "synthetic-route"; } },
    fetch: async () => { calls.push("network"); throw Error(); }, setTimeout, clearTimeout,
    require(id: string) {
      if (id === "cloudflare:workers") return { env: selected };
      if (id.endsWith("/identifiers")) return { createPrincipalId };
      if (id.endsWith("/principal-registration-server")) return { canonicalizeRegistrationClientIp, createIdentityRegistrationWorkSlot };
      if (id.endsWith("/principal-owner-bootstrap-server")) return {
        createIdentityOwnerBootstrapServerRuntime(input: IdentityOwnerBootstrapServerRuntimeInput) { inputs.push(input); return options.runtime ? options.runtime(input) : createIdentityOwnerBootstrapServerRuntime(input); },
      };
      throw Error("Unexpected isolated import");
    },
  });
  return { ALL: exports.ALL as Route, environment, calls, inputs };
}
function request(ip: string | null = "192.0.2.1") {
  const headers = new Headers({ origin: "https://bootstrap.example.test", "content-type": "application/json" });
  if (ip !== null) headers.set("CF-Connecting-IP", ip);
  return new Request("https://version-url.example.test/api/identity/bootstrap-owner", { method: "POST", headers, body: JSON.stringify({ email: "route-owner@example.test", password: "Synthetic route password only" }) });
}

test("bootstrap route fails closed before runtime/body work for disabled/malformed flags, public registration or dev", async () => {
  for (const flag of [undefined, null, false, true, "false", "TRUE", "true "]) {
    const h = harness(); h.environment.RIVER_IDENTITY_OWNER_BOOTSTRAP_ENABLED = flag;
    const req = request(); const response = await h.ALL({ request: req });
    assert.equal(response.status, 503); assert.equal(req.bodyUsed, false); assert.equal(h.inputs.length, 0); assert.deepEqual(h.calls, []);
  }
  for (const options of [{ environment: null }, { environment: [] }, { prod: false }]) {
    const h = harness(options); assert.equal((await h.ALL({ request: request() })).status, 503); assert.equal(h.inputs.length, 0);
  }
  const h = harness(); h.environment.RIVER_IDENTITY_REGISTRATION_ENABLED = "true";
  assert.equal((await h.ALL({ request: request() })).status, 503); assert.equal(h.inputs.length, 0); assert.deepEqual(h.calls, []);
});

test("bootstrap route requires CF-Connecting-IP with no forwarded-header fallback", async () => {
  for (const ip of [null, "01.2.3.4", "bad", "192.0.2.1,192.0.2.2"]) {
    const h = harness(); const req = request(ip); req.headers.set("X-Forwarded-For", "192.0.2.1");
    assert.equal((await h.ALL({ request: req })).status, 503); assert.equal(req.bodyUsed, false); assert.equal(h.inputs.length, 0); assert.deepEqual(h.calls, []);
  }
});

test("reachable Version URL cannot bootstrap without bearer authorization; no cookie or CORS", async () => {
  const h = harness(); const req = request(); const response = await h.ALL({ request: req });
  assert.equal(response.status, 503); assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("set-cookie"), null); assert.equal(response.headers.get("access-control-allow-origin"), null);
  assert.equal(req.bodyUsed, false); assert.deepEqual(h.calls, []);
});

test("activated route forwards original unread request and uses configured SITE, normalized IP and shared isolate slots", async () => {
  const seen: Request[] = [];
  const h = harness({ runtime: input => {
    assert.equal(input.site, "https://bootstrap.example.test/"); assert.equal(input.trustedClientKey, "2001:db8::1"); assert.equal(input.mode, "production");
    return { ok: true, value: async req => { assert.equal(req.bodyUsed, false); seen.push(req); return new Response(null, { status: 202 }); } };
  } });
  const a = request("2001:DB8::1"); const b = request("2001:DB8::1");
  assert.equal((await h.ALL({ request: a })).status, 202); assert.equal((await h.ALL({ request: b })).status, 202);
  assert.deepEqual(seen, [a, b]); assert.equal(h.inputs[0].acquireWorkSlot, h.inputs[1].acquireWorkSlot);
});

test("bootstrap route/config expose no credentials, sessions, roles or administrator behavior; login remains independent", () => {
  assert(!/request\.(json|text)\(|\.clone\(|\.tee\(|session|RIVER_FOOD|X-Forwarded-For|console\.|process\.env/.test(source));
  for (const path of ["../../../pages/api/identity/login.ts", "../runtime/principal-login-api.ts", "../http/principal-login-api.ts"]) {
    assert(!/OWNER_BOOTSTRAP|REGISTRATION_ENABLED/.test(readFileSync(new URL(path, import.meta.url), "utf8")));
  }
  const config = readFileSync(new URL("../../../../wrangler.jsonc", import.meta.url), "utf8");
  assert.match(config, /"RIVER_IDENTITY_REGISTRATION_ENABLED": "false"/);
  assert.match(config, /"RIVER_IDENTITY_OWNER_BOOTSTRAP_ENABLED": "false"/);
  assert(!/OWNER_BOOTSTRAP_TOKEN|OWNER_BOOTSTRAP_EMAIL/.test(config));
});
