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
  handleCreatorAudioDelete,
} from "../../../../../../lib/sesh/http/creator-audio-delete-api";

import {
  handleCreatorAudioRename,
} from "../../../../../../lib/sesh/http/creator-audio-rename-api";

import {
  createCreatorAudioAssetOperationsAtRuntime,
  type CreatorAudioAssetApiRuntimeEnvironment,
} from "../../../../../../lib/sesh/runtime/creator-audio-asset-api";

import {
  createCreatorAudioDeleteAtRuntime,
  type CreatorAudioDeleteApiRuntimeEnvironment,
} from "../../../../../../lib/sesh/runtime/creator-audio-delete-api";

import {
  createCreatorAudioRenameAtRuntime,
  type CreatorAudioRenameApiRuntimeEnvironment,
} from "../../../../../../lib/sesh/runtime/creator-audio-rename-api";

export const prerender =
  false;

function requireSession(
  session:
    unknown,
): AstroSessionLike {
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

  return session as
    AstroSessionLike;
}

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
          "Sesh private audio API is temporarily unavailable.",
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

export const GET:
APIRoute =
  async ({
    params,
    session,
  }) => {
    try {
      const canonicalSession =
        requireSession(
          session,
        );

      return await handleCreatorAudioAssetRead({
        projectId:
          params.projectId,

        audioAssetId:
          params.audioAssetId,

        operations:
          createCreatorAudioAssetOperationsAtRuntime(
            canonicalSession,
            env as unknown as CreatorAudioAssetApiRuntimeEnvironment,
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
      const canonicalSession =
        requireSession(
          session,
        );

      return await handleCreatorAudioDelete({
        request,

        projectId:
          params.projectId,

        audioAssetId:
          params.audioAssetId,

        deletes:
          createCreatorAudioDeleteAtRuntime(
            canonicalSession,
            env as unknown as CreatorAudioDeleteApiRuntimeEnvironment,
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
      const canonicalSession =
        requireSession(
          session,
        );

      return await handleCreatorAudioRename({
        request,

        projectId:
          params.projectId,

        audioAssetId:
          params.audioAssetId,

        renames:
          createCreatorAudioRenameAtRuntime(
            canonicalSession,
            env as unknown as CreatorAudioRenameApiRuntimeEnvironment,
          ),
      });
    }
    catch {
      return infrastructureFailure();
    }
  };