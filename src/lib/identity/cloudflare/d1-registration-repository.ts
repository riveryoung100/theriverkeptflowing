import type { AuthenticatedPrincipal } from "../model";
import type { PasswordCredential } from "../credentials/model";
import { validateAuthenticatedPrincipal } from "../validation";
import { validatePasswordCredential } from "../credentials/validation";
import type { IdentityRegistrationRepository, IdentityRegistrationRepositoryResult } from "../authentication/registration-service";

export interface IdentityRegistrationD1Result {
  readonly success: boolean;
  readonly results?: readonly Record<string, unknown>[];
  readonly meta?: { readonly changes?: number };
}
export interface IdentityRegistrationD1Statement {
  bind(...values: (string | null)[]): IdentityRegistrationD1Statement;
}
export interface IdentityRegistrationD1Database {
  prepare(sql: string): IdentityRegistrationD1Statement;
  batch(statements: IdentityRegistrationD1Statement[]): Promise<readonly IdentityRegistrationD1Result[]>;
}
function storage(): IdentityRegistrationRepositoryResult {
  return { ok: false, error: { code: "storage", message: "Registration persistence is unavailable." } };
}
function conflict(): IdentityRegistrationRepositoryResult {
  return { ok: true, value: { outcome: "conflict" } };
}
// Only the identity schema's exact unique constraints are classified as conflicts.
function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /^(?:D1_ERROR: )?UNIQUE constraint failed: (?:principals\.principal_id|principal_password_credentials\.(?:principal_id|email_normalized))(?:: SQLITE_CONSTRAINT(?: \(extended: SQLITE_CONSTRAINT_(?:PRIMARYKEY|UNIQUE)\))?)?$/.test(error.message);
}
export class D1IdentityRegistrationRepository implements IdentityRegistrationRepository {
  readonly #database: IdentityRegistrationD1Database;
  constructor(database: IdentityRegistrationD1Database) { this.#database = database; }
  async createAccount(principal: AuthenticatedPrincipal, credential: PasswordCredential): Promise<IdentityRegistrationRepositoryResult> {
    try {
      const p = validateAuthenticatedPrincipal(principal);
      const c = validatePasswordCredential(credential);
      if (p.status !== "active" || p.principalId !== c.principalId || p.createdAt !== p.updatedAt || p.createdAt !== c.createdAt || p.createdAt !== c.updatedAt) return storage();
      const result = await this.#database.batch([
        this.#database.prepare("INSERT INTO principals (principal_id, status, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").bind(p.principalId, p.status, p.displayName ?? null, p.createdAt, p.updatedAt),
        this.#database.prepare("INSERT INTO principal_password_credentials (principal_id, email_normalized, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").bind(c.principalId, c.emailNormalized, c.passwordHash, c.createdAt, c.updatedAt),
        this.#database.prepare("SELECT p.principal_id, p.status, p.display_name, p.created_at, p.updated_at, c.principal_id AS credential_principal_id, c.email_normalized, c.password_hash, c.created_at AS credential_created_at, c.updated_at AS credential_updated_at FROM principals p JOIN principal_password_credentials c ON c.principal_id = p.principal_id WHERE p.principal_id = ?").bind(p.principalId),
      ]);
      if (!Array.isArray(result) || result.length !== 3 || result.some(r => r?.success !== true) || result[0].meta?.changes !== 1 || result[1].meta?.changes !== 1 || result[2].meta?.changes !== 0) return storage();
      const rows = result[2].results;
      if (!Array.isArray(rows) || rows.length !== 1) return storage();
      const row = rows[0];
      if (row.principal_id !== p.principalId || row.status !== p.status || row.display_name !== (p.displayName ?? null) || row.created_at !== p.createdAt || row.updated_at !== p.updatedAt || row.credential_principal_id !== c.principalId || row.email_normalized !== c.emailNormalized || row.password_hash !== c.passwordHash || row.credential_created_at !== c.createdAt || row.credential_updated_at !== c.updatedAt) return storage();
      return { ok: true, value: { outcome: "created" } };
    } catch (error) { return isUniqueViolation(error) ? conflict() : storage(); }
  }
}
