import type { RegistrationAbuseControl } from "../http/principal-registration-api";

export interface RegistrationRateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}
export interface CloudflareRegistrationAbuseControlInput {
  readonly ipLimiter: RegistrationRateLimitBinding;
  readonly sharedLimiter: RegistrationRateLimitBinding;
  readonly trustedClientKey: string;
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Per-location abuse mitigation, not global quotas. Ingress trust belongs to future server wiring.
export function createCloudflareRegistrationAbuseControl(input: CloudflareRegistrationAbuseControlInput): RegistrationAbuseControl {
  let ip: RegistrationRateLimitBinding["limit"];
  let shared: RegistrationRateLimitBinding["limit"];
  let key: string;
  try {
    if (!record(input)) throw new Error();
    const { ipLimiter, sharedLimiter, trustedClientKey } = input;
    if (!record(ipLimiter) || !record(sharedLimiter) || typeof trustedClientKey !== "string" || trustedClientKey.length < 1 || trustedClientKey.length > 128 || /[^A-Za-z0-9:._-]/.test(trustedClientKey)) throw new Error();
    const ipMethod = ipLimiter.limit;
    const sharedMethod = sharedLimiter.limit;
    if (typeof ipMethod !== "function" || typeof sharedMethod !== "function") throw new Error();
    ip = ipMethod.bind(ipLimiter);
    shared = sharedMethod.bind(sharedLimiter);
    key = "registration:ip:" + trustedClientKey;
  } catch {
    return { async check() { return "unavailable"; } };
  }
  return {
    async check() {
      try {
        for (const [limit, limiterKey] of [[ip, key], [shared, "registration:shared"]] as const) {
          const outcome: unknown = await limit({ key: limiterKey });
          if (!record(outcome)) return "unavailable";
          const success = outcome.success;
          if (typeof success !== "boolean") return "unavailable";
          if (!success) return "denied";
        }
        return "allowed";
      } catch { return "unavailable"; }
    },
  };
}
