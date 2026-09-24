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
  handleCreatorAudioAssetRead,
} from "../../../../../../lib/sesh/http/creator-audio-asset-api";

import {
  createCreatorAudioAssetOperationsAtRuntime,
  type CreatorAudioAssetApiRuntimeEnvironment,
} from "../../../../../../lib/sesh/runtime/creator-audio-asset-api";

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
    return await handleCreatorAudioAssetRead({
      projectId:
        params.projectId,

      audioAssetId:
        params.audioAssetId,

      operations:
        operationsForSession(
          session,
        ),
    });
  };
