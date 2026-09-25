import type {
  APIRoute,
} from "astro";

export const prerender = false;

import {
  handleSeshTrackAudioAttach,
  handleSeshTrackAudioDetach,
} from "../../../../../../../../lib/sesh/http/track-audio-api";

import {
  createAuthorizedSeshTrackAudioOperationsAtRuntime,
} from "../../../../../../../../lib/sesh/runtime/track-audio-api";

import type {
  SeshTrackAudioApiRuntimeEnvironment,
} from "../../../../../../../../lib/sesh/runtime/track-audio-api";

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
          "Sesh track audio operation infrastructure is unavailable.",
      },
    }),
    {
      status:
        503,

      headers: {
        "content-type":
          "application/json; charset=utf-8",

        "cache-control":
          "no-store",
      },
    },
  );
}

export const PUT:
APIRoute =
async ({
  request,
  params,
  session,
  locals,
}) => {
  try {
    const env =
      locals.runtime.env;

    return await handleSeshTrackAudioAttach({
      request,

      projectId:
        params.projectId,

      trackId:
        params.trackId,

      audioAssetId:
        params.audioAssetId,

      operations:
        createAuthorizedSeshTrackAudioOperationsAtRuntime(
          session,
          env as unknown as
            SeshTrackAudioApiRuntimeEnvironment,
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
  locals,
}) => {
  try {
    const env =
      locals.runtime.env;

    return await handleSeshTrackAudioDetach({
      request,

      projectId:
        params.projectId,

      trackId:
        params.trackId,

      audioAssetId:
        params.audioAssetId,

      operations:
        createAuthorizedSeshTrackAudioOperationsAtRuntime(
          session,
          env as unknown as
            SeshTrackAudioApiRuntimeEnvironment,
        ),
    });
  }
  catch {
    return infrastructureFailure();
  }
};