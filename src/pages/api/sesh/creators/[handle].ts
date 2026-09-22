import type {
  APIRoute,
} from "astro";

import {
  env,
} from "cloudflare:workers";

import {
  handlePublicSeshCreatorHandleRead,
} from "../../../../lib/sesh/http";

import {
  createPublicSeshCreatorHandleResolutionAtRuntime,
} from "../../../../lib/sesh/runtime/public-creator-handle-api";

import type {
  PublicSeshCreatorHandleApiRuntimeEnvironment,
} from "../../../../lib/sesh/runtime/public-creator-handle-api";

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
          "Public Sesh creator API is temporarily unavailable.",
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
    return await handlePublicSeshCreatorHandleRead({
      request,

      handle:
        params.handle,

      resolution:
        createPublicSeshCreatorHandleResolutionAtRuntime(
          env as unknown as
            PublicSeshCreatorHandleApiRuntimeEnvironment,
        ),
    });
  }
  catch {
    return infrastructureFailure();
  }
};