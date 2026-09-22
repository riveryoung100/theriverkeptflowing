import type {
  APIRoute,
} from "astro";

import {
  env,
} from "cloudflare:workers";

import type {
  AstroSessionLike,
} from "../../../../lib/identity/session";

import {
  handleSeshCreatorHandleClaim,
} from "../../../../lib/sesh/http";

import {
  createAuthenticatedSeshCreatorHandleClaimAtRuntime,
} from "../../../../lib/sesh/runtime/creator-handle-claim-api";

import type {
  SeshCreatorHandleClaimRuntimeEnvironment,
} from "../../../../lib/sesh/runtime/creator-handle-claim-api";

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
          "Sesh creator handle claim API is temporarily unavailable.",
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

function claimsForSession(
  session:
    unknown,
) {
  if (
    typeof session !==
      "object" ||
    session ===
      null
  ) {
    throw new TypeError(
      "Astro session support is unavailable.",
    );
  }

  return createAuthenticatedSeshCreatorHandleClaimAtRuntime(
    session as AstroSessionLike,
    env as unknown as
      SeshCreatorHandleClaimRuntimeEnvironment,
  );
}

export const POST:
  APIRoute =
async ({
  request,
  session,
}) => {
  try {
    return await handleSeshCreatorHandleClaim({
      request,

      claims:
        claimsForSession(
          session,
        ),
    });
  }
  catch {
    return infrastructureFailure();
  }
};