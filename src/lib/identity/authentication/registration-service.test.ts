import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { DefaultIdentityRegistrationService, isValidRegistrationPassword, type IdentityRegistrationRepositoryResult } from "./registration-service";
import { createPrincipalId } from "../identifiers";
import type { AuthenticatedPrincipal } from "../model";
import type { PasswordCredential } from "../credentials/model";
const id = createPrincipalId("synthetic-registration");
const password = "  Synthetic password 😀  ";
function fixture() {
  const calls: unknown[] = [];
  let result: IdentityRegistrationRepositoryResult = { ok: true, value: { outcome: "created" } };
  const service = new DefaultIdentityRegistrationService({
    repository: { async createAccount(p: AuthenticatedPrincipal, c: PasswordCredential) { calls.push([p, c]); return result; } },
    passwordHasher: { async hashPassword(value) { calls.push(value); return "synthetic-encoded-hash"; }, async verifyPassword() { throw Error("unused"); } },
    generatePrincipalId: () => id,
    now: () => new Date("2026-01-01T00:00:00.000Z"),
  });
  return { service, calls, setResult: (next: IdentityRegistrationRepositoryResult) => { result = next; } };
}
test("valid registration canonicalizes email, hashes unchanged once and returns only principalId", async () => {
  const f = fixture(); assert.deepEqual(f.calls, []);
  const result = await f.service.register({ email: " Synthetic@Example.test ", password });
  assert.deepEqual(result, { ok: true, value: { principalId: id } });
  assert.equal(f.calls[0], password); assert.equal(f.calls.length, 2);
  const [p, c] = f.calls[1] as [AuthenticatedPrincipal, PasswordCredential];
  assert.equal(p.status, "active"); assert.equal(c.emailNormalized, "synthetic@example.test");
  assert.equal(p.createdAt, c.createdAt); assert.equal(c.createdAt, c.updatedAt);
  assert.equal(c.passwordHash, "synthetic-encoded-hash"); assert(!JSON.stringify([p, c, result]).includes(password));
});
test("scalar count, exact limits, unchanged Unicode and unpaired surrogate rejection", () => {
  for (const value of ["a".repeat(15), "a".repeat(128), "😀".repeat(15), "😀".repeat(128), " ".repeat(15)]) assert(isValidRegistrationPassword(value));
  for (const value of ["a".repeat(14), "😀".repeat(14), "a".repeat(129), "😀".repeat(257), "a".repeat(15) + "\ud800", "a".repeat(15) + "\udfff", null, 123]) assert(!isValidRegistrationPassword(value));
  // At 128 valid scalars the byte maximum is 512; >1024 necessarily violates scalar count too.
  assert(new TextEncoder().encode("😀".repeat(257)).length > 1024);
});
test("invalid envelopes, email, passwords and throwing properties never hash or persist", async () => {
  for (const input of [null, [], {}, { email: "bad", password }, { email: "a@@b", password }, { email: "a b@c", password }, { email: "a".repeat(321) + "@b", password }, { email: "a@b", password: "short" }, { email: "a@b", password, role: "admin" }, { email: "a@b", get password() { throw Error(password); } }]) {
    const f = fixture(); assert.deepEqual(await f.service.register(input), { ok: false, error: { code: "invalid-input", message: "Registration input is invalid." } }); assert.deepEqual(f.calls, []);
  }
});
test("conflicts, storage, malformed results and exceptions sanitized without retry", async () => {
  for (const result of [{ ok: true, value: { outcome: "conflict" } }, { ok: false, error: { code: "storage", message: password } }, null, { ok: true, value: { outcome: "unexpected" } }] as unknown[]) {
    const f = fixture(); f.setResult(result as IdentityRegistrationRepositoryResult);
    const out = await f.service.register({ email: "a@b", password });
    assert(!out.ok); assert.equal(out.error.code, (result as { value?: { outcome?: string } } | null)?.value?.outcome === "conflict" ? "conflict" : "unavailable"); assert(!JSON.stringify(out).includes(password)); assert.equal(f.calls.length, 2);
  }
});
test("hasher/generator/clock/repository sync and async failures fail closed", async () => {
  for (const stage of ["hash", "id", "clock", "repository"]) {
    let writes = 0;
    const service = new DefaultIdentityRegistrationService({ repository: { async createAccount() { writes++; throw Error(password); } }, passwordHasher: { async hashPassword() { if (stage === "hash") throw Error(password); return "encoded"; }, async verifyPassword() { throw Error(); } }, generatePrincipalId: () => stage === "id" ? " invalid" as typeof id : id, now: () => stage === "clock" ? new Date(NaN) : new Date() });
    assert.deepEqual(await service.register({ email: "a@b", password }), { ok: false, error: { code: "unavailable", message: "Registration is temporarily unavailable." } });
    assert.equal(writes, stage === "repository" ? 1 : 0);
  }
});
test("generic source excludes sessions, food, HTTP and runtime acquisition", () => {
  const source = readFileSync(new URL("./registration-service.ts", import.meta.url), "utf8");
  assert(!/food|Home Cottage|cloudflare:workers|createSession|Response|Request|console\.|process\.env/.test(source));
});
test("synchronous dependency exceptions and empty hash never leak or persist", async () => {
  for (const stage of ["hash", "id", "clock", "write", "empty-hash"]) {
    let writes = 0;
    const service = new DefaultIdentityRegistrationService({
      repository: { createAccount() { writes++; throw Error(password); } },
      passwordHasher: { hashPassword() { if (stage === "hash") throw Error(password); return Promise.resolve(stage === "empty-hash" ? "" : "encoded"); }, async verifyPassword() { throw Error(); } },
      generatePrincipalId() { if (stage === "id") throw Error(password); return id; },
      now() { if (stage === "clock") throw Error(password); return new Date(); },
    });
    assert.deepEqual(await service.register({ email: "a@b", password }), { ok: false, error: { code: "unavailable", message: "Registration is temporarily unavailable." } });
    assert.equal(writes, stage === "write" ? 1 : 0);
  }
});
