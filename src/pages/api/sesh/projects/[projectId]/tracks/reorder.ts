import type {
  APIRoute,
} from "astro";

import type {
  AstroSessionLike,
} from "../../../../../../lib/identity/session";

import {
  handleSeshTrackReorder,
} from "../../../../../../lib/sesh/http/track-reorder-api";

import {
  createAuthorizedSeshTrackReorderAtRuntime,
} from "../../../../../../lib/sesh/runtime/track-reorder-api";

import type {
  SeshTrackReorderApiRuntimeEnvironment,
} from "../../../../../../lib/sesh/runtime/track-reorder-api";

export const prerender =
  false;

function operationsForSession(
  session:
    unknown,

  runtimeEnvironment:
    SeshTrackReorderApiRuntimeEnvironment,
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

  return createAuthorizedSeshTrackReorderAtRuntime(
    session as AstroSessionLike,
    runtimeEnvironment,
  );
}

export const POST:
APIRoute =
  async ({
    request,
    params,
    session,
    locals,
  }) => {
    try {
      return await handleSeshTrackReorder({
        request,

        projectId:
          params.projectId,

        operations:
          operationsForSession(
            session,
            (
              locals as {
                runtime?: {
                  env?:
                    SeshTrackReorderApiRuntimeEnvironment;
                };
              }
            ).runtime?.env ??
            {},
          ),
      });
    }
    catch {
      return new Response(
        JSON.stringify({
          error:
            "Sesh track reorder is temporarily unavailable.",
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
  };