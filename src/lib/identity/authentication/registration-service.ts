import { parsePrincipalId, type PrincipalId } from "../identifiers";
import { validateAuthenticatedPrincipal } from "../validation";
import type { AuthenticatedPrincipal } from "../model";
import type { PasswordCredential } from "../credentials/model";
import type { PasswordHasher } from "../credentials/contracts";
import { normalizeCredentialEmail, validatePasswordCredential } from "../credentials/validation";

export type IdentityRegistrationResult =
  | { readonly ok: true; readonly value: { readonly principalId: PrincipalId } }
  | { readonly ok: false; readonly error: { readonly code: "invalid-input" | "conflict" | "unavailable"; readonly message: string } };
export type IdentityRegistrationRepositoryResult =
  | { readonly ok: true; readonly value: { readonly outcome: "created" | "conflict" } }
  | { readonly ok: false; readonly error: { readonly code: "storage"; readonly message: string } };
export interface IdentityRegistrationRepository {
  createAccount(principal: AuthenticatedPrincipal, credential: PasswordCredential): Promise<IdentityRegistrationRepositoryResult>;
}
export interface IdentityRegistrationService {
  register(input: unknown): Promise<IdentityRegistrationResult>;
}
export interface IdentityRegistrationServiceDependencies {
  readonly repository: IdentityRegistrationRepository;
  readonly passwordHasher: PasswordHasher;
  readonly generatePrincipalId: () => PrincipalId;
  readonly now: () => Date;
}
const messages = {
  "invalid-input": "Registration input is invalid.",
  conflict: "Registration could not be completed.",
  unavailable: "Registration is temporarily unavailable.",
} as const;
function failure(code: keyof typeof messages): IdentityRegistrationResult {
  return { ok: false, error: { code, message: messages[code] } };
}
export function isValidRegistrationPassword(value: unknown): value is string {
  if (typeof value !== "string") return false;
  let scalars = 0;
  for (const scalar of value) {
    const point = scalar.codePointAt(0)!;
    if (point >= 0xd800 && point <= 0xdfff) return false;
    scalars++;
    if (scalars > 128) return false;
  }
  return scalars >= 15 && new TextEncoder().encode(value).length <= 1024;
}
export class DefaultIdentityRegistrationService implements IdentityRegistrationService {
  readonly #dependencies: IdentityRegistrationServiceDependencies;
  constructor(dependencies: IdentityRegistrationServiceDependencies) {
    this.#dependencies = { ...dependencies };
  }
  async register(input: unknown): Promise<IdentityRegistrationResult> {
    let emailNormalized: string;
    let password: string;
    try {
      if (typeof input !== "object" || input === null || Array.isArray(input)) return failure("invalid-input");
      const keys = Reflect.ownKeys(input);
      if (keys.length !== 2 || !keys.includes("email") || !keys.includes("password")) return failure("invalid-input");
      const record = input as Record<string, unknown>;
      emailNormalized = normalizeCredentialEmail(record.email);
      const candidate = record.password;
      if (!isValidRegistrationPassword(candidate)) return failure("invalid-input");
      password = candidate;
    } catch { return failure("invalid-input"); }
    try {
      const passwordHash = await this.#dependencies.passwordHasher.hashPassword(password);
      const principalId = parsePrincipalId(this.#dependencies.generatePrincipalId());
      const timestamp = this.#dependencies.now().toISOString();
      const principal = validateAuthenticatedPrincipal({ principalId, status: "active", createdAt: timestamp, updatedAt: timestamp });
      const credential = validatePasswordCredential({ principalId, emailNormalized, passwordHash, createdAt: timestamp, updatedAt: timestamp });
      const result = await this.#dependencies.repository.createAccount(principal, credential);
      if (result?.ok === true && result.value?.outcome === "created") return { ok: true, value: { principalId } };
      if (result?.ok === true && result.value?.outcome === "conflict") return failure("conflict");
      return failure("unavailable");
    } catch { return failure("unavailable"); }
  }
}
