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
  handleSeshProjectDelete,
  handleSeshProjectRead,
  handleSeshProjectUpdate,
} from "../../../../lib/sesh/http";

import {
  createAuthorizedSeshProjectOperationsAtRuntime,
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
          "Sesh project API is temporarily unavailable.",
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

  return createAuthorizedSeshProjectOperationsAtRuntime(
    session as AstroSessionLike,
    env as unknown as
      SeshProjectApiRuntimeEnvironment,
  );
}

export const GET:
  APIRoute =
async ({
  request,
  params,
  session,
}) => {
  try {
    return await handleSeshProjectRead({
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

export const PATCH:
  APIRoute =
async ({
  request,
  params,
  session,
}) => {
  try {
    return await handleSeshProjectUpdate({
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

export const DELETE:
  APIRoute =
async ({
  request,
  params,
  session,
}) => {
  try {
    return await handleSeshProjectDelete({
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