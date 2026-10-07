import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createCloudflareRegistrationAbuseControl, type CloudflareRegistrationAbuseControlInput } from "./registration-abuse-control";
import { createIdentityRegistrationRequestHandler } from "../http/principal-registration-api";
import { createPrincipalId } from "../identifiers";

const request = new Request("https://isolated.example/", { headers: { "CF-Connecting-IP": "attacker", "X-Forwarded-For": "spoof", Forwarded: "for=spoof" } });
function fixture(ipResult: unknown = { success: true }, sharedResult: unknown = { success: true }) {
  const calls: string[] = [];
  const ipLimiter = { async limit({ key }: { key: string }) { assert.equal(this, ipLimiter); calls.push(key); return ipResult as { success: boolean }; } };
  const sharedLimiter = { async limit({ key }: { key: string }) { assert.equal(this, sharedLimiter); calls.push(key); return sharedResult as { success: boolean }; } };
  const input: CloudflareRegistrationAbuseControlInput = { ipLimiter, sharedLimiter, trustedClientKey: "2001:db8::1" };
  return { calls, input, control: createCloudflareRegistrationAbuseControl(input) };
}

test("zero construction quota; independent ordered keys and preserved receivers", async () => {
  const f = fixture(); assert.deepEqual(f.calls, []);
  assert.equal(await f.control.check(request), "allowed");
  assert.deepEqual(f.calls, ["registration:ip:2001:db8::1", "registration:shared"]);
  assert.equal(await f.control.check(request), "allowed"); assert.equal(f.calls.length, 4);
});
for (const [ip, shared, result, count] of [
  [false, true, "denied", 1], [true, false, "denied", 2], [true, true, "allowed", 2],
] as const) test(`IP ${ip}, shared ${shared} -> ${result}`, async () => {
  const f = fixture({ success: ip }, { success: shared });
  assert.equal(await f.control.check(request), result); assert.equal(f.calls.length, count);
});
for (const dimension of ["ip", "shared"] as const) {
  for (const value of [null, undefined, [], {}, { success: "true" }, { success: 1 }, { success: null },
    Object.defineProperty({}, "success", { get() { throw new Error("private evidence"); } })]) {
    test(`${dimension} malformed result ${String(value)} unavailable`, async () => {
      const f = dimension === "ip" ? fixture(value) : fixture({ success: true }, value);
      // fixture defaults apply to undefined; explicitly override in that case.
      if (value === undefined) f.input[dimension === "ip" ? "ipLimiter" : "sharedLimiter"].limit = async () => undefined as never;
      const control = createCloudflareRegistrationAbuseControl(f.input);
      assert.equal(await control.check(request), "unavailable");
      if (dimension === "ip") assert(!f.calls.includes("registration:shared"));
    });
  }
  test(`${dimension} sync throw and async rejection unavailable without fallback`, async () => {
    for (const limit of [() => { throw new Error("private password"); }, async () => { throw new Error("private password"); }]) {
      const f = fixture(); f.input[dimension === "ip" ? "ipLimiter" : "sharedLimiter"].limit = limit;
      assert.equal(await createCloudflareRegistrationAbuseControl(f.input).check(request), "unavailable");
      assert.equal(f.calls.length, dimension === "ip" ? 0 : 1);
    }
  });
}

test("missing/malformed dependencies validated together before quota consumption", async () => {
  for (const patch of [null, undefined, [], {}, { ipLimiter: null }, { sharedLimiter: null }, { ipLimiter: [] }, { sharedLimiter: [] },
    { ipLimiter: {} }, { sharedLimiter: {} }, { ipLimiter: { limit: 1 } }, { sharedLimiter: { limit: false } },
    { trustedClientKey: undefined }, { trustedClientKey: null }, { trustedClientKey: 1 }]) {
    const f = fixture();
    const input = patch === null || patch === undefined || Array.isArray(patch) || Object.keys(patch).length === 0 ? patch : { ...f.input, ...patch };
    assert.equal(await createCloudflareRegistrationAbuseControl(input as CloudflareRegistrationAbuseControlInput).check(request), "unavailable");
    assert.deepEqual(f.calls, []);
  }
  for (const key of ["ipLimiter", "sharedLimiter", "trustedClientKey"]) {
    const f = fixture(); const input = { ...f.input };
    Object.defineProperty(input, key, { get() { throw new Error("private config"); } });
    assert.equal(await createCloudflareRegistrationAbuseControl(input).check(request), "unavailable"); assert.deepEqual(f.calls, []);
  }
  for (const key of ["ipLimiter", "sharedLimiter"] as const) {
    const f = fixture(); Object.defineProperty(f.input[key], "limit", { get() { throw new Error("private config"); } });
    assert.equal(await createCloudflareRegistrationAbuseControl(f.input).check(request), "unavailable"); assert.deepEqual(f.calls, []);
  }
});

for (const key of ["", " padded", "padded ", "line\n", "a\r", "a/b", "a@b", "é", "a".repeat(129)]) test(`invalid key ${JSON.stringify(key)} no fallback`, async () => {
  const f = fixture();
  assert.equal(await createCloudflareRegistrationAbuseControl({ ...f.input, trustedClientKey: key }).check(request), "unavailable"); assert.deepEqual(f.calls, []);
});
test("key bounds and IPv4/IPv6 remain unchanged, no header/request properties accessed", async () => {
  const hostile = new Proxy(request, { get() { throw new Error("request must not be inspected"); } });
  for (const trustedClientKey of ["a", "a".repeat(128), "192.0.2.1", "2001:db8::1"]) {
    const f = fixture();
    assert.equal(await createCloudflareRegistrationAbuseControl({ ...f.input, trustedClientKey }).check(hostile), "allowed");
    assert.deepEqual(f.calls, ["registration:ip:" + trustedClientKey, "registration:shared"]);
  }
});

test("Slice A concrete control blocks body/checker/registration on denial and unavailable", async () => {
  for (const [ip, shared, status] of [[{ success: false }, { success: true }, 429], [{ success: true }, { success: false }, 429], [{}, { success: true }, 503], [{ success: true }, {}, 503], [{ success: true }, { success: true }, 202]] as const) {
    const f = fixture(ip, shared); const calls: string[] = [];
    const handler = createIdentityRegistrationRequestHandler({ expectedOrigin: "https://signup.example.test", abuseControl: f.control,
      compromisedPasswords: { async check() { calls.push("checker"); return "allowed"; } },
      acquireWorkSlot() { calls.push("slot"); return () => {}; }, scheduleTimeout: () => () => {},
      registration: { async register() { calls.push("register"); return { ok: true, value: { principalId: createPrincipalId("synthetic") } }; } },
    });
    const req = new Request("https://untrusted.example/", { method: "POST", headers: { origin: "https://signup.example.test", "content-type": "application/json" }, body: JSON.stringify({ email: "synthetic@example.test", password: "Synthetic password for tests" }) });
    let bodyReads = 0; const body = req.body;
    Object.defineProperty(req, "body", { get() { bodyReads++; return body; } });
    const response = await handler(req); assert.equal(response.status, status);
    if (status !== 202) { assert.deepEqual(calls, []); assert.equal(bodyReads, 0); }
    else { assert.deepEqual(calls, ["slot", "checker", "register"]); assert(bodyReads > 0); }
    const text = await response.text(); assert(!text.includes("2001:db8")); assert(!text.includes("private"));
  }
});
test("source has no headers, body, email/password keying, slots, configuration or external I/O", () => {
  const source = readFileSync(new URL("./registration-abuse-control.ts", import.meta.url), "utf8");
  assert(!/headers|CF-Connecting-IP|X-Forwarded-For|Forwarded|request\.|fetch\(|process\.env|globalThis|cloudflare:workers|wrangler|console\.|acquireWorkSlot|semaphore|mutex|email|password/.test(source));
  assert(source.includes("not global quotas"));
});
