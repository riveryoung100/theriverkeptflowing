import type {
  APIRoute,
} from "astro";

import {
  env,
} from "cloudflare:workers";

import type {
  AstroSessionLike,
} from "../../../lib/identity/session";

import {
  handlePrincipalLogin,
} from "../../../lib/identity/http/principal-login-api";

import {
  createPrincipalLoginRuntime,
} from "../../../lib/identity/runtime/principal-login-api";

import type {
  PrincipalLoginRuntimeEnvironment,
} from "../../../lib/identity/runtime/principal-login-api";

export const prerender =
  false;

function infrastructureFailure():
Response {
  return new Response(
    JSON.stringify({
      ok:
        false,

      error: {
        code:
          "unavailable",

        message:
          "Authentication is temporarily unavailable.",
      },
    }),
    {
      status:
        503,

      headers: {
        "cache-control":
          "no-store",

        "content-type":
          "application/json; charset=utf-8",
      },
    },
  );
}

export const POST:
  APIRoute =
async ({
  request,
  session,
}) => {
  try {
    const runtime =
      createPrincipalLoginRuntime(
        session as AstroSessionLike,
        env as unknown as
          PrincipalLoginRuntimeEnvironment,
      );

    return await handlePrincipalLogin({
      request,

      authentication:
        runtime.authentication,

      sessions:
        runtime.sessions,
    });
  }
  catch {
    return infrastructureFailure();
  }
};
