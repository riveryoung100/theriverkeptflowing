import type {
  APIRoute,
} from "astro";

import {
  env,
} from "cloudflare:workers";

import {
  handlePublicSeshProjectRead,
} from "../../../../../lib/sesh/http";

import {
  createPublicSeshProjectResolutionAtRuntime,
} from "../../../../../lib/sesh/runtime/public-project-api";

import type {
  PublicSeshProjectApiRuntimeEnvironment,
} from "../../../../../lib/sesh/runtime/public-project-api";

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
          "Public Sesh project API is temporarily unavailable.",
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

export const GET:
  APIRoute =
async ({
  request,
  params,
}) => {
  try {
    return await handlePublicSeshProjectRead({
      request,

      projectId:
        params.projectId,

      resolution:
        createPublicSeshProjectResolutionAtRuntime(
          env as unknown as
            PublicSeshProjectApiRuntimeEnvironment,
        ),
    });
  }
  catch {
    return infrastructureFailure();
  }
};