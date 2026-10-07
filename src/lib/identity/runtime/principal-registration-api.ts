import { Argon2idPasswordHasher } from "../credentials/argon2id";
import { DefaultIdentityRegistrationService } from "../authentication/registration-service";
import { D1IdentityRegistrationRepository, type IdentityRegistrationD1Database } from "../cloudflare/d1-registration-repository";
import type { PrincipalId } from "../identifiers";
import { createIdentityRegistrationRequestHandler, type IdentityRegistrationRequestHandler, type IdentityRegistrationRequestHandlerInput } from "../http/principal-registration-api";

export interface IdentityRegistrationRuntimeInput extends Omit<IdentityRegistrationRequestHandlerInput, "registration"> {
  readonly database: IdentityRegistrationD1Database;
  readonly generatePrincipalId: () => PrincipalId;
  readonly now: () => Date;
}
export type IdentityRegistrationRuntimeResult =
  | { readonly ok: true; readonly value: IdentityRegistrationRequestHandler }
  | { readonly ok: false; readonly error: { readonly code: "unavailable"; readonly message: "Registration is temporarily unavailable." } };
function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
export function createIdentityRegistrationRuntime(input: IdentityRegistrationRuntimeInput): IdentityRegistrationRuntimeResult {
  try {
    if (!record(input)) throw new Error();
    const { database, expectedOrigin, compromisedPasswords, abuseControl, acquireWorkSlot, scheduleTimeout, generatePrincipalId, now } = input;
    if (!record(database) || typeof database.prepare !== "function" || typeof database.batch !== "function" || !record(compromisedPasswords) || typeof compromisedPasswords.check !== "function" || !record(abuseControl) || typeof abuseControl.check !== "function" || typeof acquireWorkSlot !== "function" || typeof scheduleTimeout !== "function" || typeof generatePrincipalId !== "function" || typeof now !== "function" || typeof expectedOrigin !== "string") throw new Error();
    const url = new URL(expectedOrigin);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.origin !== expectedOrigin) throw new Error();
    const repository = new D1IdentityRegistrationRepository(database);
    const passwordHasher = new Argon2idPasswordHasher();
    const registration = new DefaultIdentityRegistrationService({ repository, passwordHasher, generatePrincipalId, now });
    return { ok: true, value: createIdentityRegistrationRequestHandler({ registration, expectedOrigin, compromisedPasswords, abuseControl, acquireWorkSlot, scheduleTimeout }) };
  } catch { return { ok: false, error: { code: "unavailable", message: "Registration is temporarily unavailable." } }; }
}
