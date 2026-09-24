import type {
  APIRoute,
} from "astro";

import {
  env,
} from "cloudflare:workers";

import type {
  AstroSessionLike,
} from "../../../../../../../lib/identity/session";

import {
  handleCreatorPrivateAudioRead,
} from "../../../../../../../lib/sesh/http/creator-private-audio-read-api";

import {
  createCreatorPrivateAudioReadAtRuntime,
  type CreatorPrivateAudioReadApiRuntimeEnvironment,
} from "../../../../../../../lib/sesh/runtime/creator-private-audio-read-api";

export const prerender =
  false;

export const GET:
APIRoute =
  async ({
    params,
    request,
    session,
  }) => {
    try {
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

      return await handleCreatorPrivateAudioRead({
        projectId:
          params.projectId,

        audioAssetId:
          params.audioAssetId,

        rangeHeader:
          request.headers.get(
            "range",
          ),

        reads:
          createCreatorPrivateAudioReadAtRuntime(
            session as AstroSessionLike,
            env as unknown as CreatorPrivateAudioReadApiRuntimeEnvironment,
          ),
      });
    }
    catch {
      return new Response(
        JSON.stringify({
          ok:
            false,

          error: {
            code:
              "unavailable",

            message:
              "Sesh private audio content is temporarily unavailable.",
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

            "x-content-type-options":
              "nosniff",
          },
        },
      );
    }
  };