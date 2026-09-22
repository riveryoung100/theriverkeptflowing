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
  handleSeshCreatorProfileRead,
  handleSeshCreatorProfileUpdate,
} from "../../../../lib/sesh/http";

import {
  createAuthenticatedSeshCreatorProfileOperationsAtRuntime,
} from "../../../../lib/sesh/runtime/creator-profile-api";

import type {
  SeshCreatorProfileApiRuntimeEnvironment,
} from "../../../../lib/sesh/runtime/creator-profile-api";

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
          "Sesh creator profile API is temporarily unavailable.",
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

function operationsForSession(
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

  return createAuthenticatedSeshCreatorProfileOperationsAtRuntime(
    session as AstroSessionLike,
    env as unknown as
      SeshCreatorProfileApiRuntimeEnvironment,
  );
}

export const GET:
  APIRoute =
async ({
  request,
  session,
}) => {
  try {
    return await handleSeshCreatorProfileRead({
      request,

      operations:
        operationsForSession(
          session,
        ),
    });
  }
  catch {
    return infrastructureFailure();
  }
};

export const PATCH:
  APIRoute =
async ({
  request,
  session,
}) => {
  try {
    return await handleSeshCreatorProfileUpdate({
      request,

      operations:
        operationsForSession(
          session,
        ),
    });
  }
  catch {
    return infrastructureFailure();
  }
};