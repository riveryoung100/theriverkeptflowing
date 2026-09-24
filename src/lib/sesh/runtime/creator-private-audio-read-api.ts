import type {
  AstroSessionLike,
} from "../../identity/session";

import type {
  CreatorAudioAssetApiRuntimeEnvironment,
} from "./creator-audio-asset-api";

import {
  createCreatorAudioAssetOperationsAtRuntime,
} from "./creator-audio-asset-api";

import {
  createSeshRuntimePersistence,
} from "./cloudflare";

import {
  DefaultCreatorPrivateAudioReadService,
  type CreatorPrivateAudioReadService,
} from "../operations/creator-private-audio-read-service";

export type CreatorPrivateAudioReadApiRuntimeEnvironment =
  CreatorAudioAssetApiRuntimeEnvironment;

export function createCreatorPrivateAudioReadAtRuntime(
  session:
    AstroSessionLike,

  runtimeEnvironment:
    CreatorPrivateAudioReadApiRuntimeEnvironment,
): CreatorPrivateAudioReadService {
  if (
    typeof session !==
      "object" ||
    session ===
      null
  ) {
    throw new TypeError(
      "Astro session support is required for private Sesh audio read.",
    );
  }

  if (
    typeof runtimeEnvironment !==
      "object" ||
    runtimeEnvironment ===
      null
  ) {
    throw new TypeError(
      "Sesh private audio read runtime environment is required.",
    );
  }

  const persistence =
    createSeshRuntimePersistence(
      runtimeEnvironment,
    );

  return new DefaultCreatorPrivateAudioReadService({
    authorizedAssets:
      createCreatorAudioAssetOperationsAtRuntime(
        session,
        runtimeEnvironment,
      ),

    audioAssets:
      persistence.audioAssetRepository,

    audioObjects:
      persistence.audioObjectStore,
  });
}