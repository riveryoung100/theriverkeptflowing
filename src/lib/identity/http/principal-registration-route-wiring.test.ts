import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { createPrincipalId } from "../identifiers";
import { canonicalizeRegistrationClientIp, createIdentityRegistrationServerRuntime, createIdentityRegistrationWorkSlot, type IdentityRegistrationServerRuntimeInput } from "../runtime/principal-registration-server";

const routeSource = readFileSync(new URL("../../../pages/api/identity/register.ts", import.meta.url), "utf8");
type Route = (context: { request: Request }) => Promise<Response>;
function harness(options: { environment?: unknown; site?: unknown; prod?: unknown; runtime?: (input: IdentityRegistrationServerRuntimeInput) => ReturnType<typeof createIdentityRegistrationServerRuntime> } = {}) {
  const calls: string[] = []; const inputs: IdentityRegistrationServerRuntimeInput[] = []; const forwarded: Request[] = [];
  const environment: Record<string, unknown> = {
    RIVER_IDENTITY_REGISTRATION_ENABLED: "true",
    RIVER_IDENTITY_DB: { prepare() { calls.push("prepare"); throw Error("private synthetic database"); }, async batch() { calls.push("batch"); throw Error(); } },
    RIVER_IDENTITY_REGISTRATION_IP_LIMITER: { async limit({ key }: { key: string }) { calls.push(key); return { success: true }; } },
    RIVER_IDENTITY_REGISTRATION_SHARED_LIMITER: { async limit({ key }: { key: string }) { calls.push(key); return { success: true }; } },
  };
  const selectedEnvironment = "environment" in options ? options.environment : environment;
  const code = ts.transpileModule(routeSource.replaceAll("import.meta.env", "testMeta"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports: Record<string, unknown> = {}; let slotFactories = 0;
  const context = vm.createContext({
    exports, Response, JSON, Date,
    testMeta: { SITE: "site" in options ? options.site : "https://signup.example.test/", PROD: "prod" in options ? options.prod : true },
    fetch: async () => { calls.push("fetch"); return new Response("0".repeat(35) + ":0"); },
    crypto: { subtle: { async digest() { calls.push("digest"); return new ArrayBuffer(20); } }, randomUUID() { calls.push("id"); return "synthetic-route"; } },
    setTimeout(_callback: () => void, milliseconds: number) { calls.push("timer:" + milliseconds); return milliseconds; },
    clearTimeout(timer: number) { calls.push("cancel:" + timer); },
    require(id: string) {
      if (id === "cloudflare:workers") return { env: selectedEnvironment };
      if (id.endsWith("/identifiers")) return { createPrincipalId };
      if (id.endsWith("/principal-registration-server")) return {
        canonicalizeRegistrationClientIp,
        createIdentityRegistrationWorkSlot() { slotFactories++; return createIdentityRegistrationWorkSlot(); },
        createIdentityRegistrationServerRuntime(input: IdentityRegistrationServerRuntimeInput) {
          inputs.push(input); const result = options.runtime ? options.runtime(input) : createIdentityRegistrationServerRuntime(input);
          return result.ok ? { ok: true, value: async (request: Request) => { forwarded.push(request); return result.value(request); } } : result;
        },
      };
      throw Error("unexpected module " + id);
    },
  });
  new vm.Script(code, { filename: "isolated-registration-route.cjs" }).runInContext(context);
  return { ALL: exports.ALL as Route, prerender: exports.prerender, calls, inputs, forwarded, environment, selectedEnvironment, slotFactories, context };
}
function request(ip: string | null = "192.0.2.1", method = "POST", origin = "https://signup.example.test") {
  const headers: Record<string, string> = { origin, "content-type": "application/json", host: "attacker.example.test" };
  if (ip !== null) headers["CF-Connecting-IP"] = ip;
  return new Request("https://attacker.example.test/api/identity/register", { method, headers, ...(method === "POST" ? { body: JSON.stringify({ email: "synthetic-route@example.test", password: "Synthetic password only" }) } : {}) });
}
async function assertUnavailable(response: Response) {
  assert.equal(response.status, 503); assert.equal(response.headers.get("cache-control"), "no-store"); assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8"); assert.equal(response.headers.get("x-content-type-options"), "nosniff"); assert.equal(response.headers.get("set-cookie"), null); assert.equal(response.headers.get("access-control-allow-origin"), null);
  assert.deepEqual(await response.json(), { ok: false, error: { code: "unavailable", message: "Registration is temporarily unavailable." } });
}
test("route exports only ALL and prerender=false; module initialization has no operational calls", () => {
  const h = harness(); assert.equal(h.prerender, false); assert.equal(typeof h.ALL, "function"); assert.equal(h.slotFactories, 1); assert.deepEqual(h.calls, []); assert.equal(h.inputs.length, 0);
  assert.match(routeSource, /import \{ env \} from "cloudflare:workers"/); assert.match(routeSource, /import\.meta\.env\.SITE/); assert.match(routeSource, /import\.meta\.env\.PROD/);
  assert(!/export const (POST|GET)|\.clone\(|\.tee\(|request\.(json|text)\(|new Request\(|session|RIVER_FOOD|X-Forwarded-For|Forwarded|clientAddress|request\.cf/.test(routeSource));
});
test("original Request forwarded exactly once without pre-read; exact trusted dependencies retained", async () => {
  let seen!: Request;
  const response = new Response("synthetic acknowledgement", { status: 202 });
  const h = harness({ runtime: input => {
    assert.equal(input.environment, h.environment); assert.equal(input.site, "https://signup.example.test/"); assert.equal(input.trustedClientKey, "192.0.2.1"); assert.equal(input.mode, "production"); assert.deepEqual(h.calls, []);
    return { ok: true, value: async req => { seen = req; assert.equal(req.bodyUsed, false); return response; } };
  } });
  const req = request(); Object.defineProperty(req, "clone", { value() { throw Error("clone forbidden"); } });
  assert.equal(await h.ALL({ request: req }), response); assert.equal(seen, req); assert.deepEqual(h.forwarded, [req]); assert.equal(req.bodyUsed, false); assert.equal(h.inputs.length, 1); assert.deepEqual(h.calls, []);
});
test("fresh request runtimes preserve one shared isolate slot", async () => {
  const h = harness({ runtime: () => ({ ok: true, value: async () => new Response(null, { status: 202 }) }) });
  await h.ALL({ request: request() }); await h.ALL({ request: request("192.0.2.2") });
  assert.equal(h.inputs.length, 2); assert.notEqual(h.inputs[0], h.inputs[1]); assert.equal(h.inputs[0].acquireWorkSlot, h.inputs[1].acquireWorkSlot); assert.equal(h.slotFactories, 1);
});
for (const prod of [false, undefined, "true", null]) test("dev/nonproduction fails before header/body/env acquisition " + String(prod), async () => {
  const h = harness({ prod, environment: new Proxy({}, { get() { throw Error("must not acquire config"); } }) });
  const req = request(); Object.defineProperty(req, "headers", { get() { throw Error("must not acquire ingress"); } }); await assertUnavailable(await h.ALL({ request: req })); assert.equal(req.bodyUsed, false); assert.deepEqual(h.calls, []); assert.equal(h.inputs.length, 0);
});
for (const value of [undefined, null, [], 1]) test("bad environment fails before body " + JSON.stringify(value), async () => {
  const h = harness({ environment: value }); const req = request(); await assertUnavailable(await h.ALL({ request: req })); assert.equal(req.bodyUsed, false); assert.equal(h.inputs.length, 0); assert.deepEqual(h.calls, []);
});
for (const value of [undefined, null, true, false, "false", "TRUE", " true ", 1]) test("disabled switch " + JSON.stringify(value), async () => {
  const h = harness(); h.environment.RIVER_IDENTITY_REGISTRATION_ENABLED = value; const req = request(); Object.defineProperty(req, "headers", { get() { throw Error("no ingress before activation"); } }); await assertUnavailable(await h.ALL({ request: req })); assert.equal(req.bodyUsed, false); assert.deepEqual(h.calls, []); assert.equal(h.inputs.length, 0);
});
for (const key of ["RIVER_IDENTITY_DB", "RIVER_IDENTITY_REGISTRATION_IP_LIMITER", "RIVER_IDENTITY_REGISTRATION_SHARED_LIMITER"]) {
  for (const value of [undefined, null, [], {}, { prepare: false, batch() {} }, { limit: 1 }]) test("route malformed binding " + key + " " + JSON.stringify(value), async () => {
    const h = harness(); h.environment[key] = value; const req = request(); await assertUnavailable(await h.ALL({ request: req })); assert.equal(req.bodyUsed, false); assert.deepEqual(h.calls, []); assert.equal(h.forwarded.length, 0);
  });
}
for (const site of [undefined, null, "", "/", "https://signup.example.test/path", "http://signup.example.test/", "https://user@signup.example.test/", "https://signup.example.test/?x=1"]) test("route malformed SITE " + JSON.stringify(site), async () => {
  const h = harness({ site }); const req = request(); await assertUnavailable(await h.ALL({ request: req })); assert.equal(req.bodyUsed, false); assert.deepEqual(h.calls, []);
});
for (const ip of [null, "", "01.2.3.4", "256.2.3.4", "192.0.2.1,192.0.2.2", "[::1]", "fe80::1%zone", "not-an-ip"]) test("invalid ingress " + String(ip) + " has no forwarded fallback", async () => {
  const h = harness(); const req = request(ip); req.headers.set("X-Forwarded-For", "192.0.2.1"); req.headers.set("Forwarded", "for=192.0.2.1"); await assertUnavailable(await h.ALL({ request: req })); assert.equal(req.bodyUsed, false); assert.equal(h.inputs.length, 0); assert.deepEqual(h.calls, []);
});
for (const [ip, expected] of [["192.0.2.1", "192.0.2.1"], ["2001:0DB8::0001", "2001:db8::1"], ["::ffff:192.0.2.128", "::ffff:c000:280"]]) test("route canonical ingress " + ip, async () => {
  const h = harness({ runtime: () => ({ ok: true, value: async () => new Response(null, { status: 202 }) }) }); assert.equal((await h.ALL({ request: request(ip) })).status, 202); assert.equal(h.inputs[0].trustedClientKey, expected); assert.deepEqual(h.calls, []);
});
test("throwing activation/getters/acquisition/handler yield exact sanitized503", async () => {
  for (const key of ["RIVER_IDENTITY_REGISTRATION_ENABLED", "RIVER_IDENTITY_DB", "RIVER_IDENTITY_REGISTRATION_IP_LIMITER", "RIVER_IDENTITY_REGISTRATION_SHARED_LIMITER"]) {
    const h = harness(); Object.defineProperty(h.environment, key, { get() { throw Error("private config"); } }); const req = request(); await assertUnavailable(await h.ALL({ request: req })); assert.equal(req.bodyUsed, false); assert.deepEqual(h.calls, []);
  }
  for (const runtime of [() => { throw Error("private construction"); }, () => ({ ok: true as const, value: async () => { throw Error("private handler"); } })]) {
    const h = harness({ runtime }); await assertUnavailable(await h.ALL({ request: request() })); assert.deepEqual(h.calls, []);
  }
  const h = harness(); const req = request(); Object.defineProperty(req, "headers", { get() { throw Error("private request getter"); } }); await assertUnavailable(await h.ALL({ request: req })); assert.equal(h.inputs.length, 0);
});
test("SITE .origin policy rejects incoming Host/Origin changes before quota or body", async () => {
  const h = harness({ site: "https://SIGNUP.example.test:443/" }); const req = request("192.0.2.1", "POST", "https://attacker.example.test");
  const response = await h.ALL({ request: req }); assert.equal(response.status, 403); assert.equal(req.bodyUsed, false); assert.deepEqual(h.calls, []); assert.equal(h.forwarded[0], req);
});
test("missing or throwing platform security dependencies fail closed before body", async () => {
  for (const key of ["fetch", "crypto"]) {
    const h = harness(); Object.defineProperty(h.context, key, { get() { throw Error("private platform configuration"); } });
    const req = request(); await assertUnavailable(await h.ALL({ request: req })); assert.equal(req.bodyUsed, false); assert.deepEqual(h.calls, []);
  }
  const h = harness(); h.context.fetch = null; const req = request(); await assertUnavailable(await h.ALL({ request: req })); assert.equal(req.bodyUsed, false); assert.deepEqual(h.calls, []);
});
test("concrete checker/limiters and A/ZB execute only on synthetic request; no session", async () => {
  const h = harness(); const req = request(); const response = await h.ALL({ request: req }); await assertUnavailable(response);
  assert.deepEqual(h.calls, ["registration:ip:192.0.2.1", "registration:shared", "timer:5000", "cancel:5000", "timer:3000", "digest", "fetch", "cancel:3000", "id", "prepare"]); assert.equal(h.forwarded.length, 1); assert.equal(h.forwarded[0], req); assert.equal(req.bodyUsed, true);
});
test("installed Astro ALL dispatch preserves A405 and strips HEAD body only", async () => {
  const moduleUrl = new URL("../../../../node_modules/astro/dist/runtime/server/endpoint.js", import.meta.url).href;
  const { renderEndpoint } = await import(moduleUrl);
  const h = harness();
  for (const method of ["GET", "HEAD", "DELETE", "OPTIONS"]) {
    const req = request("192.0.2.1", method); const response: Response = await renderEndpoint({ ALL: h.ALL, prerender: false }, { request: req, url: new URL(req.url) }, false, { warn() { throw Error("unexpected404"); }, error() { throw Error("unexpected500"); } });
    assert.equal(response.status, 405); assert.equal(response.headers.get("allow"), "POST"); assert.equal(response.headers.get("cache-control"), "no-store"); assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    if (method === "HEAD") assert.equal(await response.text(), ""); else assert.deepEqual(await response.json(), { ok: false, error: { code: "method-not-allowed", message: "Registration requires POST." } });
  }
  assert.deepEqual(h.calls, []); assert.equal(h.forwarded.length, 4);
});
