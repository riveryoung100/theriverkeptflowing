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
  handleSeshProjectCollectionRead,
  handleSeshProjectCreate,
} from "../../../../lib/sesh/http";

import {
  createAuthenticatedSeshProjectCollectionAtRuntime,
} from "../../../../lib/sesh/runtime/project-api";

import type {
  SeshProjectApiRuntimeEnvironment,
} from "../../../../lib/sesh/runtime/project-api";

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
          "Sesh project collection API is temporarily unavailable.",
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

function collectionForSession(
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

  return createAuthenticatedSeshProjectCollectionAtRuntime(
    session as AstroSessionLike,
    env as unknown as
      SeshProjectApiRuntimeEnvironment,
  );
}

export const GET:
  APIRoute =
async ({
  request,
  session,
}) => {
  try {
    return await handleSeshProjectCollectionRead({
      request,

      collection:
        collectionForSession(
          session,
        ),
    });
  }
  catch {
    return infrastructureFailure();
  }
};

export const POST:
  APIRoute =
async ({
  request,
  session,
}) => {
  try {
    return await handleSeshProjectCreate({
      request,

      collection:
        collectionForSession(
          session,
        ),
    });
  }
  catch {
    return infrastructureFailure();
  }
};