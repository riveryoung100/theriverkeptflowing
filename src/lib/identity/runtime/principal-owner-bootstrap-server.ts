import { normalizeCredentialEmail } from "../credentials/validation";
import { createPwnedPasswordsRegistrationChecker } from "../credentials/pwned-passwords-checker";
import { createCloudflareRegistrationAbuseControl, type RegistrationRateLimitBinding } from "../cloudflare/registration-abuse-control";
import type { IdentityRegistrationD1Database } from "../cloudflare/d1-registration-repository";
import { createIdentityRegistrationRuntime, type IdentityRegistrationRuntimeResult } from "./principal-registration-api";
import { canonicalizeRegistrationClientIp, type IdentityRegistrationServerRuntimeInput } from "./principal-registration-server";

export interface IdentityOwnerBootstrapServerRuntimeInput extends Omit<IdentityRegistrationServerRuntimeInput, "subtle"> {
  readonly subtle: Pick<SubtleCrypto, "digest" | "importKey" | "sign" | "verify">;
}

const unavailable = () => ({ ok: false as const, error: { code: "unavailable" as const, message: "Registration is temporarily unavailable." as const } });
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
// A future owner workflow must provision a random high-entropy base64url secret.
function validToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{32,256}$/.test(value) && !/\s/.test(value);
}

/** HMAC verification delegates the signature comparison to Web Crypto, never JS string equality. */
export async function verifyOwnerBootstrapBearer(
  authorization: string | null,
  configuredToken: string,
  subtle: IdentityOwnerBootstrapServerRuntimeInput["subtle"],
): Promise<boolean> {
  try {
    if (!validToken(configuredToken) || typeof authorization !== "string") return false;
    const match = /^Bearer ([A-Za-z0-9_-]{32,256})$/.exec(authorization);
    if (!match || match[0] !== authorization) return false;
    const encoder = new TextEncoder();
    const expected = encoder.encode(configuredToken);
    const key = await subtle.importKey("raw", expected, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
    const signature = await subtle.sign("HMAC", key, expected);
    return await subtle.verify("HMAC", key, signature, encoder.encode(match[1])) === true;
  } catch { return false; }
}

export function createIdentityOwnerBootstrapServerRuntime(input: IdentityOwnerBootstrapServerRuntimeInput): IdentityRegistrationRuntimeResult {
  try {
    if (!record(input)) throw new Error();
    const { environment, site, mode, trustedClientKey, fetch, subtle, scheduleTimeout, acquireWorkSlot, generatePrincipalId, now } = input;
    if (!record(environment) || environment.RIVER_IDENTITY_OWNER_BOOTSTRAP_ENABLED !== "true" || environment.RIVER_IDENTITY_REGISTRATION_ENABLED === "true") throw new Error();
    const token = environment.RIVER_IDENTITY_OWNER_BOOTSTRAP_TOKEN;
    if (!validToken(token)) throw new Error();
    const ownerEmail = normalizeCredentialEmail(environment.RIVER_IDENTITY_OWNER_BOOTSTRAP_EMAIL);
    const database = environment.RIVER_IDENTITY_DB;
    const ipLimiter = environment.RIVER_IDENTITY_REGISTRATION_IP_LIMITER;
    const sharedLimiter = environment.RIVER_IDENTITY_REGISTRATION_SHARED_LIMITER;
    if (!record(database) || typeof database.prepare !== "function" || typeof database.batch !== "function" ||
        !record(ipLimiter) || typeof ipLimiter.limit !== "function" || !record(sharedLimiter) || typeof sharedLimiter.limit !== "function" ||
        (mode !== "production" && mode !== "isolated-test") || typeof site !== "string" || !site || site.trim() !== site ||
        typeof trustedClientKey !== "string" || canonicalizeRegistrationClientIp(trustedClientKey) !== trustedClientKey ||
        typeof fetch !== "function" || !record(subtle) || ["digest", "importKey", "sign", "verify"].some(method => typeof subtle[method as keyof typeof subtle] !== "function") ||
        typeof scheduleTimeout !== "function" || typeof acquireWorkSlot !== "function" || typeof generatePrincipalId !== "function" || typeof now !== "function") throw new Error();
    const url = new URL(site);
    if (!/^https?:\/\//i.test(site) || !["http:", "https:"].includes(url.protocol) || (mode === "production" && url.protocol !== "https:") ||
        url.username || url.password || url.search || url.hash || site.includes("?") || site.includes("#") || url.pathname !== "/") throw new Error();
    const identityDatabase = database as unknown as IdentityRegistrationD1Database;
    return createIdentityRegistrationRuntime({
      database: identityDatabase, expectedOrigin: url.origin, generatePrincipalId, now, scheduleTimeout, acquireWorkSlot,
      compromisedPasswords: createPwnedPasswordsRegistrationChecker({ fetch, subtle, scheduleTimeout }),
      abuseControl: createCloudflareRegistrationAbuseControl({
        ipLimiter: ipLimiter as unknown as RegistrationRateLimitBinding,
        sharedLimiter: sharedLimiter as unknown as RegistrationRateLimitBinding, trustedClientKey,
      }),
      authorizeRequest: request => verifyOwnerBootstrapBearer(request.headers.get("authorization"), token, subtle),
      async beforePasswordCheck(emailNormalized) {
        if (emailNormalized !== ownerEmail) return false;
        const result = await identityDatabase.batch([
          identityDatabase.prepare("SELECT (SELECT COUNT(*) FROM principals) AS principals, (SELECT COUNT(*) FROM principal_password_credentials) AS credentials"),
        ]);
        if (!Array.isArray(result) || result.length !== 1 || result[0]?.success !== true || result[0].meta?.changes !== 0 ||
            !Array.isArray(result[0].results) || result[0].results.length !== 1) return false;
        const row = result[0].results[0];
        return row.principals === 0 && row.credentials === 0;
      },
    });
  } catch { return unavailable(); }
}
