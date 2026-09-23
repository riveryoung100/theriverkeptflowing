import type {
  APIRoute,
} from "astro";

import {
  env,
} from "cloudflare:workers";

import {
  handlePublicSeshCreatorProjectsRead,
} from "../../../../../lib/sesh/http";

import {
  createPublicSeshCreatorProjectCollectionAtRuntime,
} from "../../../../../lib/sesh/runtime/public-creator-projects-api";

import type {
  PublicSeshCreatorProjectsApiRuntimeEnvironment,
} from "../../../../../lib/sesh/runtime/public-creator-projects-api";

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
          "Public Sesh creator project collection is temporarily unavailable.",
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
    return await handlePublicSeshCreatorProjectsRead({
      request,

      handle:
        params.handle,

      collection:
        createPublicSeshCreatorProjectCollectionAtRuntime(
          env as unknown as
            PublicSeshCreatorProjectsApiRuntimeEnvironment,
        ),
    });
  }
  catch {
    return infrastructureFailure();
  }
};