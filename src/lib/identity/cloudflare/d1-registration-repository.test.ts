import assert from "node:assert/strict";
import test from "node:test";
import { createPrincipalId } from "../identifiers";
import { D1IdentityRegistrationRepository, type IdentityRegistrationD1Result } from "./d1-registration-repository";
const id = createPrincipalId("unit"); const time = "2026-01-01T00:00:00.000Z";
const p = { principalId: id, status: "active" as const, createdAt: time, updatedAt: time };
const c = { principalId: id, emailNormalized: "unit@example.test", passwordHash: "encoded-synthetic", createdAt: time, updatedAt: time };
const row = { principal_id: id, status: "active", display_name: null, created_at: time, updated_at: time, credential_principal_id: id, email_normalized: c.emailNormalized, password_hash: c.passwordHash, credential_created_at: time, credential_updated_at: time };
function fixture(results: unknown = [{ success: true, meta: { changes: 1 } }, { success: true, meta: { changes: 1 } }, { success: true, meta: { changes: 0 }, results: [row] }], error?: Error) {
  const queries: { sql: string; values: (string | null)[] }[] = []; let batches = 0;
  const repo = new D1IdentityRegistrationRepository({ prepare(sql) { const q = { sql, values: [] as (string | null)[] }; queries.push(q); return { bind(...values) { q.values = values; return this; } }; }, async batch() { batches++; if (error) throw error; return results as IdentityRegistrationD1Result[]; } });
  return { repo, queries, batches: () => batches };
}
test("exact single batch of two plain inserts and joined readback", async () => {
  const f = fixture(); assert.equal(f.batches(), 0); assert.deepEqual(await f.repo.createAccount(p, c), { ok: true, value: { outcome: "created" } });
  assert.equal(f.batches(), 1); assert.equal(f.queries.length, 3); assert(f.queries[0].sql.startsWith("INSERT INTO principals")); assert(f.queries[1].sql.startsWith("INSERT INTO principal_password_credentials")); assert(f.queries[2].sql.startsWith("SELECT")); assert(!f.queries.some(q => /UPSERT|DELETE|ON CONFLICT|UPDATE/.test(q.sql)));
});
test("malformed metadata/readbacks fail closed", async () => {
  const base = [{ success: true, meta: { changes: 1 } }, { success: true, meta: { changes: 1 } }, { success: true, meta: { changes: 0 }, results: [row] }];
  for (const result of [null, [], base.slice(0, 2), [{ success: true }, ...base.slice(1)], [base[0], { success: true, meta: { changes: 0 } }, base[2]], [base[0], base[1], { ...base[2], results: [{ ...row, email_normalized: "wrong@b" }] }], [base[0], base[1], { ...base[2], results: [] }]]) assert.equal((await fixture(result).repo.createAccount(p, c)).ok, false);
});
test("only exact unique constraint errors conflict; uncertain failures sanitized", async () => {
  for (const message of ["D1_ERROR: UNIQUE constraint failed: principal_password_credentials.email_normalized: SQLITE_CONSTRAINT", "UNIQUE constraint failed: principals.principal_id"]) assert.deepEqual(await fixture(undefined, Error(message)).repo.createAccount(p, c), { ok: true, value: { outcome: "conflict" } });
  for (const message of ["transport failed with private data", "UNIQUE constraint failed: unrelated.id", "timeout"]) { const result = await fixture(undefined, Error(message)).repo.createAccount(p, c); assert.deepEqual(result, { ok: false, error: { code: "storage", message: "Registration persistence is unavailable." } }); }
});
test("invalid correspondence/status/canonical input performs zero batch calls", async () => {
  for (const credential of [{ ...c, principalId: createPrincipalId("other") }, { ...c, emailNormalized: " Unit@Example.test " }, { ...c, updatedAt: "2026-02-01T00:00:00.000Z" }]) { const f = fixture(); assert.equal((await f.repo.createAccount(p, credential)).ok, false); assert.equal(f.batches(), 0); }
  const f = fixture(); assert.equal((await f.repo.createAccount({ ...p, status: "disabled" }, c)).ok, false); assert.equal(f.batches(), 0);
});
