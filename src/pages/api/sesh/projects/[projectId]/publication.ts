import type {
  APIRoute,
} from "astro";

import {
  env,
} from "cloudflare:workers";

import type {
  AstroSessionLike,
} from "../../../../../lib/identity/session";

import {
  handleSeshProjectPublicationUpdate,
} from "../../../../../lib/sesh/http";

import {
  createAuthorizedSeshProjectPublicationOperationsAtRuntime,
} from "../../../../../lib/sesh/runtime/project-publication-api";

import type {
  SeshProjectPublicationApiRuntimeEnvironment,
} from "../../../../../lib/sesh/runtime/project-publication-api";

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
          "Sesh project publication API is temporarily unavailable.",
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
    typeof session !== "object" ||
    session === null
  ) {
    throw new TypeError(
      "Astro session support is unavailable.",
    );
  }

  return createAuthorizedSeshProjectPublicationOperationsAtRuntime(
    session as AstroSessionLike,
    env as unknown as
      SeshProjectPublicationApiRuntimeEnvironment,
  );
}

export const PATCH:
  APIRoute =
async ({
  request,
  params,
  session,
}) => {
  try {
    return await handleSeshProjectPublicationUpdate({
      request,

      projectId:
        params.projectId,

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