import assert from "node:assert/strict";
import test from "node:test";
import { createHash, webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
import { createPwnedPasswordsRegistrationChecker, type PwnedPasswordsCheckerInput } from "./pwned-passwords-checker";
import { createIdentityRegistrationRequestHandler } from "../http/principal-registration-api";
import { createPrincipalId } from "../identifiers";

const password = " Synthetic password 😀 ";
const hash = (value = password) => createHash("sha1").update(value, "utf8").digest("hex").toUpperCase();
const suffix = hash().slice(5);
const other = "F".repeat(35);
const bytes = (text: string) => new TextEncoder().encode(text);
function fixture(body = other + ":0", overrides: Partial<PwnedPasswordsCheckerInput> = {}) {
  const calls: string[] = [];
  const requests: { url: string; init: RequestInit }[] = [];
  let deadline: (() => void) | undefined;
  const input: PwnedPasswordsCheckerInput = {
    fetch: async (url, init) => { calls.push("fetch"); requests.push({ url, init }); return new Response(body); },
    subtle: { async digest(algorithm, value) { calls.push("digest"); return webcrypto.subtle.digest(algorithm, value as Parameters<typeof webcrypto.subtle.digest>[1]); } },
    scheduleTimeout(callback, ms) { assert.equal(ms, 3000); calls.push("timer"); deadline = callback; return () => { calls.push("cancel"); }; },
    ...overrides,
  };
  const checker = createPwnedPasswordsRegistrationChecker(input);
  return { checker, input, calls, requests, expire: () => { assert(deadline); deadline(); } };
}

for (const value of ["Synthetic ASCII password", password, "é synthetic password"]) {
  test(`unchanged UTF-8 digest, prefix-only endpoint/options for ${JSON.stringify(value)}`, async () => {
    const f = fixture(other + ":0");
    assert.deepEqual(f.calls, []);
    assert.equal(await f.checker.check(value), "allowed");
    assert.deepEqual(f.calls, ["timer", "digest", "fetch", "cancel"]);
    assert.equal(f.requests.length, 1);
    const { url, init } = f.requests[0];
    assert.equal(url, "https://api.pwnedpasswords.com/range/" + hash(value).slice(0, 5));
    assert.deepEqual(init.headers, { "Add-Padding": "true" });
    assert.equal(init.method, "GET"); assert.equal(init.redirect, "error");
    assert.equal(init.credentials, "omit"); assert.equal(init.cache, "no-store");
    assert(init.signal instanceof AbortSignal); assert.equal(init.body, undefined);
    for (const secret of [value, hash(value), hash(value).slice(5)]) assert(!JSON.stringify({ url, init }).includes(secret));
  });
}

for (const [body, expected] of [
  [suffix + ":1", "rejected"], [suffix + ":00000001", "rejected"],
  [suffix + ":99999999999999999999", "rejected"], [suffix + ":0", "allowed"],
  [suffix + ":00000", "allowed"], [other + ":42", "allowed"],
  [other + ":0\n" + suffix + ":2\n", "rejected"],
  [other + ":0\r\n" + suffix + ":2\r\n", "rejected"],
] as const) test(`range decision ${JSON.stringify(body)}`, async () => {
  assert.equal(await fixture(body).checker.check(password), expected);
});

for (const body of ["", "\n", "\r\n", other + ":1\n\n", " " + other + ":1", other + ":1 ",
  other.toLowerCase() + ":1", other + ":-1", other + ":+1", other + ":1.0", other + ":1e2", other + ":",
  other + ":" + "1".repeat(21), other.slice(1) + ":1", other + "F:1", other + ":1:2",
  other + ":1\n" + other + ":1", other + ":0\n" + other + ":1", suffix + ":2\nmalformed",
  other + ":1\r", "\ufeff" + other + ":1",
]) test(`malformed range fails closed ${JSON.stringify(body)}`, async () => {
  assert.equal(await fixture(body).checker.check(password), "unavailable");
});

test("fatal UTF-8, invalid stream chunks and rejected reads fail closed", async () => {
  for (const response of [
    new Response(new Uint8Array([0xc3, 0x28])),
    new Response(new ReadableStream({ start(c) { c.enqueue("not bytes"); c.close(); } })),
    new Response(new ReadableStream({ start(c) { c.error(new Error(password)); } })),
  ]) assert.equal(await fixture("", { fetch: async () => response }).checker.check(password), "unavailable");
});

for (const status of [201, 204, 301, 400, 429, 500]) test(`HTTP ${status} unavailable`, async () => {
  assert.equal(await fixture("", { fetch: async () => new Response(status === 204 ? null : other + ":0", { status }) }).checker.check(password), "unavailable");
});
test("missing body, malformed response, redirected response and dependency failures are sanitized", async () => {
  const redirected = new Response(other + ":0"); Object.defineProperty(redirected, "redirected", { value: true });
  for (const fetch of [async () => new Response(null), async () => redirected, async () => ({ status: 200 }) as Response,
    async () => { throw new Error(password + hash()); }]) {
    assert.equal(await fixture("", { fetch }).checker.check(password), "unavailable");
  }
  for (const value of [new ArrayBuffer(19), new Uint8Array(20), null]) {
    const f = fixture("", { subtle: { async digest() { return value as ArrayBuffer; } } });
    assert.equal(await f.checker.check(password), "unavailable"); assert.equal(f.requests.length, 0);
  }
  assert.equal(await fixture("", { subtle: { async digest() { throw new Error(password); } } }).checker.check(password), "unavailable");
});

test("line/count exact boundaries; bounded streaming bytes and cancellation", async () => {
  const line = (i: number, digits = 1) => i.toString(16).toUpperCase().padStart(35, "0") + ":" + "0".repeat(digits);
  const lines = Array.from({ length: 25000 }, (_, i) => line(i));
  assert.equal(await fixture(lines.join("\n")).checker.check(password), "allowed");
  assert.equal(await fixture([...lines, line(25000)].join("\n")).checker.check(password), "unavailable");
  // Build a syntactically valid response of exactly 1MiB, below the line limit.
  const base = Array.from({ length: 20000 }, (_, i) => line(i));
  let extra = 1048576 - base.join("\n").length;
  for (let i = 0; extra > 0; i++) { const add = Math.min(19, extra); base[i] = line(i, 1 + add); extra -= add; }
  const exact = base.join("\n"); assert.equal(bytes(exact).length, 1048576);
  assert.equal(await fixture(exact).checker.check(password), "allowed");
  let cancelled = 0; let reads = 0;
  const response = new Response(new ReadableStream<Uint8Array>({
    pull(c) { reads++; c.enqueue(reads === 1 ? bytes(exact) : bytes("x")); },
    cancel() { cancelled++; },
  }, { highWaterMark: 0 }));
  const f = fixture("", { fetch: async () => response });
  assert.equal(await f.checker.check(password), "unavailable");
  assert.equal(cancelled, 1); assert.equal(reads, 2);
});

test("fragmented CRLF and UTF-8 response decoding is independent of chunk boundaries", async () => {
  const body = bytes(other + ":0\r\n" + suffix + ":1\r\n");
  const response = new Response(new ReadableStream({ start(c) { for (const byte of body) c.enqueue(new Uint8Array([byte])); c.close(); } }));
  assert.equal(await fixture("", { fetch: async () => response }).checker.check(password), "rejected");
});

test("deadline during noncooperating digest prevents late network access", async () => {
  let finish!: (value: ArrayBuffer) => void;
  const f = fixture("", { subtle: { digest() { return new Promise((resolve) => { finish = resolve; }); } } });
  const pending = f.checker.check(password); f.expire();
  assert.equal(await pending, "unavailable");
  finish(new ArrayBuffer(20)); await Promise.resolve(); await Promise.resolve();
  assert.equal(f.requests.length, 0); assert(f.calls.includes("cancel"));
});

test("deadline aborts noncooperating fetch and safely handles late rejection", async () => {
  let reject!: (error: Error) => void; let entered!: () => void;
  const ready = new Promise<void>((resolve) => { entered = resolve; });
  let signal: AbortSignal | undefined;
  const f = fixture("", { fetch: (_url, init) => { signal = init.signal!; entered(); return new Promise((_resolve, fail) => { reject = fail; }); } });
  const pending = f.checker.check(password); await ready; f.expire();
  assert.equal(await pending, "unavailable"); assert.equal(signal?.aborted, true);
  reject(new Error(password)); await Promise.resolve();
});

test("deadline covers streamed read, cancels reader and timer", async () => {
  let entered!: () => void; const ready = new Promise<void>((resolve) => { entered = resolve; });
  let cancelled = 0;
  const response = new Response(new ReadableStream<Uint8Array>({ pull() { entered(); }, cancel() { cancelled++; } }, { highWaterMark: 0 }));
  const f = fixture("", { fetch: async () => response });
  const pending = f.checker.check(password); await ready; f.expire();
  assert.equal(await pending, "unavailable"); assert.equal(cancelled, 1); assert(f.calls.includes("cancel"));
});

test("late fetch response after timeout is cancelled without parsing or a second request", async () => {
  let entered!: () => void; const ready = new Promise<void>((resolve) => { entered = resolve; });
  let finish!: (value: Response) => void; let cancelled = 0; let requests = 0;
  const f = fixture("", { fetch: () => { requests++; entered(); return new Promise((resolve) => { finish = resolve; }); } });
  const pending = f.checker.check(password); await ready; f.expire();
  assert.equal(await pending, "unavailable");
  finish(new Response(new ReadableStream({ cancel() { cancelled++; } })));
  await Promise.resolve(); await Promise.resolve();
  assert.equal(cancelled, 1); assert.equal(requests, 1);
});

test("AbortError rejection remains unavailable and cancels the scheduled timer", async () => {
  const f = fixture("", { fetch: async () => { throw new DOMException("Synthetic abort", "AbortError"); } });
  assert.equal(await f.checker.check(password), "unavailable");
  assert.equal(f.calls.filter((c) => c === "cancel").length, 1);
});

test("timer setup/cancellation failures and immediate deadline fail closed", async () => {
  for (const scheduleTimeout of [
    () => { throw new Error(password); }, () => null as unknown as () => void,
    () => () => { throw new Error(password); },
    (callback: () => void) => { callback(); return () => {}; },
  ]) assert.equal(await fixture(other + ":0", { scheduleTimeout }).checker.check(password), "unavailable");
});

test("malformed/throwing construction and invalid direct passwords never reach dependencies", async () => {
  for (const patch of [null, [], undefined, {}, { fetch: null }, { subtle: null }, { subtle: [] }, { subtle: { digest: 1 } }, { scheduleTimeout: null }]) {
    const f = fixture();
    const input = patch === null || patch === undefined || Array.isArray(patch) || Object.keys(patch).length === 0 ? patch : { ...f.input, ...patch };
    assert.equal(await createPwnedPasswordsRegistrationChecker(input as PwnedPasswordsCheckerInput).check(password), "unavailable");
    assert.deepEqual(f.calls, []);
  }
  for (const key of ["fetch", "subtle", "scheduleTimeout"]) {
    const f = fixture(); const input = { ...f.input };
    Object.defineProperty(input, key, { get() { throw new Error(password); } });
    assert.equal(await createPwnedPasswordsRegistrationChecker(input).check(password), "unavailable"); assert.deepEqual(f.calls, []);
  }
  const subtle = Object.defineProperty({}, "digest", { get() { throw new Error(password); } });
  assert.equal(await fixture("", { subtle: subtle as SubtleCrypto }).checker.check(password), "unavailable");
  for (const value of ["short", "\ud800".repeat(15), null, 123]) {
    const f = fixture(); assert.equal(await f.checker.check(value as string), "unavailable"); assert.deepEqual(f.calls, []);
  }
});

test("digest receiver preserved; caller endpoint ignored; repeated checks independent", async () => {
  const subtle = { digest(algorithm: AlgorithmIdentifier, value: BufferSource) { assert.equal(this, subtle); return webcrypto.subtle.digest(algorithm, value as Parameters<typeof webcrypto.subtle.digest>[1]); } };
  const f = fixture(other + ":0", { subtle });
  const input = { ...f.input, endpoint: "https://attacker.example/" };
  const checker = createPwnedPasswordsRegistrationChecker(input);
  for (let i = 0; i < 2; i++) assert.equal(await checker.check(password), "allowed");
  assert.equal(f.requests.length, 2); assert(f.requests.every((r) => r.url.startsWith("https://api.pwnedpasswords.com/range/")));
});

test("concrete checker integrates unchanged Slice A rejection/unavailability/allowed flow", async () => {
  for (const [body, status] of [[suffix + ":1", 400], ["malformed", 503], [other + ":0", 202]] as const) {
    let registrations = 0;
    const handler = createIdentityRegistrationRequestHandler({
      expectedOrigin: "https://signup.example.test", compromisedPasswords: fixture(body).checker,
      abuseControl: { async check() { return "allowed"; } }, acquireWorkSlot: () => () => {}, scheduleTimeout: () => () => {},
      registration: { async register(value) { registrations++; assert.deepEqual(value, { email: "synthetic@example.test", password }); return { ok: true, value: { principalId: createPrincipalId("synthetic") } }; } },
    });
    const response = await handler(new Request("https://untrusted.example/", { method: "POST", headers: { origin: "https://signup.example.test", "content-type": "application/json" }, body: JSON.stringify({ email: "synthetic@example.test", password }) }));
    assert.equal(response.status, status); assert.equal(registrations, status === 202 ? 1 : 0);
    const text = await response.text(); for (const secret of [password, hash(), suffix]) assert(!text.includes(secret));
  }
});

test("source isolation: only injected network and no config, DB, route, logging or storage hash", () => {
  const source = readFileSync(new URL("./pwned-passwords-checker.ts", import.meta.url), "utf8");
  assert(!/cloudflare:workers|process\.env|globalThis|console\.|wrangler|D1|argon2|localStorage|setTimeout\(/i.test(source));
});
