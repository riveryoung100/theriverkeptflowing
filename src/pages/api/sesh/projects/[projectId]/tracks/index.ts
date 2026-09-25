import type {
  APIRoute,
} from "astro";

import {
  env,
} from "cloudflare:workers";

import type {
  AstroSessionLike,
} from "../../../../../../lib/identity/session";

import {
  handleSeshTrackCollectionRead,
  handleSeshTrackCreate,
} from "../../../../../../lib/sesh/http/track-api";

import {
  createAuthorizedSeshTrackOperationsAtRuntime,
  type SeshTrackApiRuntimeEnvironment,
} from "../../../../../../lib/sesh/runtime/track-api";

export const prerender =
  false;

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

  return createAuthorizedSeshTrackOperationsAtRuntime(
    session as
      AstroSessionLike,
    env as unknown as
      SeshTrackApiRuntimeEnvironment,
  );
}

function unavailableResponse(): Response {
  return new Response(
    JSON.stringify({
      ok:
        false,

      error: {
        code:
          "unavailable",

        message:
          "Sesh track API is temporarily unavailable.",
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
    session,
  }) => {
    try {
      return await handleSeshTrackCollectionRead({
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
      return unavailableResponse();
    }
  };

export const POST:
APIRoute =
  async ({
    request,
    params,
    session,
  }) => {
    try {
      return await handleSeshTrackCreate({
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
      return unavailableResponse();
    }
  };