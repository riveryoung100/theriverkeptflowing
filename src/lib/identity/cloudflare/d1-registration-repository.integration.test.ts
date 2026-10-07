import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { D1IdentityRegistrationRepository, type IdentityRegistrationD1Database, type IdentityRegistrationD1Statement, type IdentityRegistrationD1Result } from "./d1-registration-repository";
import { DefaultIdentityRegistrationService } from "../authentication/registration-service";
import { createPrincipalId } from "../identifiers";
import { Argon2idPasswordHasher } from "../credentials/argon2id";
import { DefaultPasswordAuthenticationService } from "../authentication/password-authentication-service";
import { D1PrincipalRepository } from "./d1-principal-repository";
import { D1PasswordCredentialRepository } from "./d1-password-credential-repository";
type Query = { sql: string; values: unknown[] };
class Bridge implements IdentityRegistrationD1Database {
  readonly calls: Query[][] = [];
  constructor(readonly mf: Miniflare) {}
  async execute(queries: Query[]): Promise<IdentityRegistrationD1Result[]> {
    this.calls.push(queries);
    const response = await this.mf.dispatchFetch("http://identity.test/", { method: "POST", body: JSON.stringify(queries) });
    const value = await response.json() as { error?: string };
    if (!response.ok) throw Error(value.error);
    return value as unknown as IdentityRegistrationD1Result[];
  }
  prepare(sql: string) {
    let values: unknown[] = [];
    const statement = { bind: (...args: unknown[]) => { values = args; return statement; }, query: () => ({ sql, values }), first: async <T>() => ((await this.execute([{ sql, values }]))[0].results?.[0] ?? null) as T | null, run: async () => (await this.execute([{ sql, values }]))[0] };
    return statement;
  }
  batch(statements: IdentityRegistrationD1Statement[]) { return this.execute(statements.map(s => (s as IdentityRegistrationD1Statement & { query(): Query }).query())); }
}
async function harness(run: (db: Bridge) => Promise<void>) {
  const mf = new Miniflare(convertV4MiniflareOptions({ modules: true, compatibilityDate: "2026-07-24", cf: false, d1Persist: false, d1Databases: { IDENTITY_TEST: "identity-registration-isolated-test" }, script: `export default { async fetch(request, env) { try { const queries = await request.json(); return Response.json(await env.IDENTITY_TEST.batch(queries.map(q => env.IDENTITY_TEST.prepare(q.sql).bind(...q.values)))); } catch(e) { return Response.json({error:e.message}, {status:400}); } } }` }));
  try {
    const db = new Bridge(mf);
    const migration = await readFile(new URL("../../../../migrations/identity/0001_river_identity.sql", import.meta.url), "utf8");
    await db.execute(migration.split(";").map(sql => sql.trim()).filter(Boolean).map(sql => ({ sql, values: [] })));
    await run(db);
  } finally { await mf.dispose(); }
}
const time = "2026-01-01T00:00:00.000Z";
function pair(name: string, email = "synthetic@example.test") {
  const principalId = createPrincipalId(name);
  return [{ principalId, status: "active" as const, createdAt: time, updatedAt: time }, { principalId, emailNormalized: email, passwordHash: "synthetic-encoded", createdAt: time, updatedAt: time }] as const;
}
async function counts(db: Bridge) {
  return (await db.execute([{ sql: "SELECT (SELECT count(*) FROM principals) AS principals, (SELECT count(*) FROM principal_password_credentials) AS credentials", values: [] }]))[0].results;
}
test("actual schema, transactional visibility, affected rows and concurrent duplicates", async () => harness(async db => {
  const a = new D1IdentityRegistrationRepository(db); const b = new D1IdentityRegistrationRepository(new Bridge(db.mf));
  const results = await Promise.all([a.createAccount(...pair("one")), b.createAccount(...pair("two"))]);
  assert.deepEqual(results.map(r => r.ok ? r.value.outcome : r.error.code).sort(), ["conflict", "created"]);
  assert.deepEqual(await counts(db), [{ principals: 1, credentials: 1 }]);
  const batch = db.calls.find(q => q.length === 3 && q[0].sql.startsWith("INSERT"))!;
  assert.equal(batch.length, 3);
  assert.deepEqual(await a.createAccount(...pair("three")), { ok: true, value: { outcome: "conflict" } });
  assert.deepEqual(await counts(db), [{ principals: 1, credentials: 1 }]);
}));
test("credential failure rolls back principal; principal failure creates no credential", async () => harness(async db => {
  const repo = new D1IdentityRegistrationRepository(db);
  await db.execute([{ sql: "CREATE TRIGGER fail_credential BEFORE INSERT ON principal_password_credentials BEGIN SELECT RAISE(ABORT, 'synthetic failure'); END", values: [] }]);
  assert.equal((await repo.createAccount(...pair("failed"))).ok, false);
  assert.deepEqual(await counts(db), [{ principals: 0, credentials: 0 }]);
  await db.execute([{ sql: "DROP TRIGGER fail_credential", values: [] }]);
  assert.deepEqual(await repo.createAccount(...pair("existing")), { ok: true, value: { outcome: "created" } });
  await assert.rejects(db.execute(db.calls.find(q => q.length === 3 && q[0].values[0] === "principal:existing")!), /UNIQUE constraint failed: principals\.principal_id/);
  assert.deepEqual(await repo.createAccount(...pair("existing", "second@example.test")), { ok: true, value: { outcome: "conflict" } });
  assert.deepEqual(await counts(db), [{ principals: 1, credentials: 1 }]);
}));
test("real Argon2 registration is compatible with unchanged existing password login", async () => harness(async db => {
  const hasher = new Argon2idPasswordHasher(); const password = "Synthetic unicode 😀 password";
  const id = createPrincipalId("login-compatible");
  const registration = new DefaultIdentityRegistrationService({ repository: new D1IdentityRegistrationRepository(db), passwordHasher: hasher, generatePrincipalId: () => id, now: () => new Date(time) });
  assert.deepEqual(await registration.register({ email: " Synthetic@Example.test ", password }), { ok: true, value: { principalId: id } });
  const login = new DefaultPasswordAuthenticationService({ principals: new D1PrincipalRepository(db), credentials: new D1PasswordCredentialRepository(db), passwordHasher: hasher, dummyPasswordHash: "unused-synthetic" });
  assert.deepEqual(await login.authenticate({ email: " SYNTHETIC@example.test ", password }), { ok: true, value: { principalId: id, needsPasswordRehash: false } });
  const stored = (await db.execute([{ sql: "SELECT password_hash FROM principal_password_credentials", values: [] }]))[0].results![0].password_hash;
  assert.equal(typeof stored, "string"); assert((stored as string).startsWith("$argon2id$v=19$m=19456,t=2,p=1$")); assert.notEqual(stored, password);
}));
