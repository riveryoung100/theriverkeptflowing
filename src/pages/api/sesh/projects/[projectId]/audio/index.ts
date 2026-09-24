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
  handleCreatorAudioAssetCollectionRead,
} from "../../../../../../lib/sesh/http/creator-audio-asset-api";

import {
  handleCreatorAudioUpload,
} from "../../../../../../lib/sesh/http/creator-audio-upload-api";

import {
  createCreatorAudioAssetOperationsAtRuntime,
  type CreatorAudioAssetApiRuntimeEnvironment,
} from "../../../../../../lib/sesh/runtime/creator-audio-asset-api";

import {
  createCreatorAudioUploadAtRuntime,
  type CreatorAudioUploadApiRuntimeEnvironment,
} from "../../../../../../lib/sesh/runtime/creator-audio-upload-api";

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

  return createCreatorAudioAssetOperationsAtRuntime(
    session as AstroSessionLike,
    env as unknown as CreatorAudioAssetApiRuntimeEnvironment,
  );
}

export const GET:
APIRoute =
  async ({
    params,
    session,
  }) => {
    return await handleCreatorAudioAssetCollectionRead({
      projectId:
        params.projectId,

      operations:
        operationsForSession(
          session,
        ),
    });
  };

export const POST:
APIRoute =
  async ({
    request,
    params,
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

      return await handleCreatorAudioUpload({
        request,

        projectId:
          params.projectId,

        uploads:
          createCreatorAudioUploadAtRuntime(
            session as AstroSessionLike,
            env as unknown as CreatorAudioUploadApiRuntimeEnvironment,
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
              "Sesh private audio upload API is temporarily unavailable.",
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
  };