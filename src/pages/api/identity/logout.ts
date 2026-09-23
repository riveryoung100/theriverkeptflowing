import type {
  APIRoute,
} from "astro";

import type {
  AstroSessionLike,
} from "../../../lib/identity/session";

import {
  handlePrincipalLogout,
} from "../../../lib/identity/http/principal-login-api";

import {
  createPrincipalLogoutRuntime,
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
          "Logout is temporarily unavailable.",
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
    return await handlePrincipalLogout({
      request,

      sessions:
        createPrincipalLogoutRuntime(
          session as AstroSessionLike,
        ),
    });
  }
  catch {
    return infrastructureFailure();
  }
};
