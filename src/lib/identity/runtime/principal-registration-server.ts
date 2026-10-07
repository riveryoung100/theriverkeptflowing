import {
  createIdentityRegistrationRuntime,
  type IdentityRegistrationRuntimeInput,
  type IdentityRegistrationRuntimeResult,
} from "./principal-registration-api";
import { createPwnedPasswordsRegistrationChecker, type PwnedPasswordsCheckerInput } from "../credentials/pwned-passwords-checker";
import { createCloudflareRegistrationAbuseControl, type RegistrationRateLimitBinding } from "../cloudflare/registration-abuse-control";
import type { IdentityRegistrationD1Database } from "../cloudflare/d1-registration-repository";

export interface IdentityRegistrationServerRuntimeInput {
  readonly environment: unknown;
  readonly site: unknown;
  readonly trustedClientKey: unknown;
  readonly mode: "production" | "isolated-test";
  readonly fetch: PwnedPasswordsCheckerInput["fetch"];
  readonly subtle: PwnedPasswordsCheckerInput["subtle"];
  readonly scheduleTimeout: PwnedPasswordsCheckerInput["scheduleTimeout"];
  readonly acquireWorkSlot: IdentityRegistrationRuntimeInput["acquireWorkSlot"];
  readonly generatePrincipalId: IdentityRegistrationRuntimeInput["generatePrincipalId"];
  readonly now: IdentityRegistrationRuntimeInput["now"];
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Syntax/canonicalization only: the trusted runtime caller must establish ingress provenance.
export function canonicalizeRegistrationClientIp(value: unknown): string | null {
  if (typeof value !== "string" || !value || value.length > 45 || /[^0-9a-fA-F:.]/.test(value)) return null;
  if (!value.includes(":")) {
    const octets = value.split(".");
    return octets.length === 4 && octets.every(octet => /^(0|[1-9][0-9]{0,2})$/.test(octet) && Number(octet) <= 255) ? value : null;
  }
  try {
    const hostname = new URL("http://[" + value + "]/").hostname;
    return hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : null;
  } catch { return null; }
}

// One instance is shared across request-scoped runtimes in an isolate; no queue/global quota.
export function createIdentityRegistrationWorkSlot(): () => (() => void) | null {
  let inFlight = 0;
  return () => {
    if (inFlight === 2) return null;
    inFlight++;
    let released = false;
    return () => {
      if (!released) { released = true; inFlight--; }
    };
  };
}

export function createIdentityRegistrationServerRuntime(input: IdentityRegistrationServerRuntimeInput): IdentityRegistrationRuntimeResult {
  try {
    if (!record(input)) throw new Error();
    const { environment, site, trustedClientKey, mode, fetch, subtle, scheduleTimeout, acquireWorkSlot, generatePrincipalId, now } = input;
    if (!record(environment) || environment.RIVER_IDENTITY_REGISTRATION_ENABLED !== "true") throw new Error();
    const database = environment.RIVER_IDENTITY_DB;
    const ipLimiter = environment.RIVER_IDENTITY_REGISTRATION_IP_LIMITER;
    const sharedLimiter = environment.RIVER_IDENTITY_REGISTRATION_SHARED_LIMITER;
    if (!record(database) || typeof database.prepare !== "function" || typeof database.batch !== "function" ||
        !record(ipLimiter) || typeof ipLimiter.limit !== "function" || !record(sharedLimiter) || typeof sharedLimiter.limit !== "function" ||
        (mode !== "production" && mode !== "isolated-test") || typeof site !== "string" || !site || site.trim() !== site ||
        typeof trustedClientKey !== "string" || canonicalizeRegistrationClientIp(trustedClientKey) !== trustedClientKey ||
        typeof fetch !== "function" || !record(subtle) || typeof subtle.digest !== "function" ||
        typeof scheduleTimeout !== "function" || typeof acquireWorkSlot !== "function" || typeof generatePrincipalId !== "function" || typeof now !== "function") throw new Error();
    const url = new URL(site);
    if (!/^https?:\/\//i.test(site) || !["http:", "https:"].includes(url.protocol) ||
        (mode === "production" && url.protocol !== "https:") || url.username || url.password ||
        url.search || url.hash || site.includes("?") || site.includes("#") || url.pathname !== "/") throw new Error();
    const compromisedPasswords = createPwnedPasswordsRegistrationChecker({ fetch, subtle, scheduleTimeout });
    const abuseControl = createCloudflareRegistrationAbuseControl({
      ipLimiter: ipLimiter as unknown as RegistrationRateLimitBinding,
      sharedLimiter: sharedLimiter as unknown as RegistrationRateLimitBinding,
      trustedClientKey,
    });
    return createIdentityRegistrationRuntime({
      database: database as unknown as IdentityRegistrationD1Database,
      expectedOrigin: url.origin,
      compromisedPasswords, abuseControl, acquireWorkSlot, scheduleTimeout, generatePrincipalId, now,
    });
  } catch {
    return { ok: false, error: { code: "unavailable", message: "Registration is temporarily unavailable." } };
  }
}
