import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { createPrincipalId } from "../../../lib/identity/identifiers";
import {
  canonicalizeRegistrationClientIp,
  createIdentityRegistrationServerRuntime,
  createIdentityRegistrationWorkSlot,
} from "../../../lib/identity/runtime/principal-registration-server";

export const prerender = false;
const acquireWorkSlot = createIdentityRegistrationWorkSlot();

function unavailable(): Response {
  return new Response(JSON.stringify({ ok: false, error: { code: "unavailable", message: "Registration is temporarily unavailable." } }), {
    status: 503,
    headers: { "cache-control": "no-store", "content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff" },
  });
}

export const ALL: APIRoute = async ({ request }) => {
  try {
    // No configured local project database access. Activation also asserts separately verified ingress.
    const environment: unknown = env;
    if (import.meta.env.PROD !== true || typeof environment !== "object" || environment === null || Array.isArray(environment) ||
        (environment as Record<string, unknown>).RIVER_IDENTITY_REGISTRATION_ENABLED !== "true") return unavailable();
    const trustedClientKey = canonicalizeRegistrationClientIp(request.headers.get("CF-Connecting-IP"));
    if (trustedClientKey === null) return unavailable();
    const runtime = createIdentityRegistrationServerRuntime({
      environment, site: import.meta.env.SITE, trustedClientKey, mode: "production",
      fetch, subtle: crypto.subtle,
      scheduleTimeout(callback, milliseconds) {
        const timer = setTimeout(callback, milliseconds);
        return () => clearTimeout(timer);
      },
      acquireWorkSlot,
      generatePrincipalId: () => createPrincipalId(crypto.randomUUID()),
      now: () => new Date(),
    });
    return runtime.ok ? await runtime.value(request) : unavailable();
  } catch { return unavailable(); }
};
