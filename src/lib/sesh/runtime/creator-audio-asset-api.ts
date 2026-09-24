import type {
  AstroSessionLike,
} from "../../identity/session";

import {
  createSeshRuntimePersistence,
} from "./cloudflare";

import {
  createAuthorizedSeshProjectOperationsAtRuntime,
  type SeshProjectApiRuntimeEnvironment,
} from "./project-api";

import {
  DefaultCreatorAudioAssetOperationService,
  type CreatorAudioAssetOperationService,
} from "../operations/creator-audio-asset-operation-service";

export type CreatorAudioAssetApiRuntimeEnvironment =
  SeshProjectApiRuntimeEnvironment;

export function createCreatorAudioAssetOperationsAtRuntime(
  session:
    AstroSessionLike,

  runtimeEnvironment:
    CreatorAudioAssetApiRuntimeEnvironment,
): CreatorAudioAssetOperationService {
  if (
    typeof session !==
      "object" ||
    session ===
      null
  ) {
    throw new TypeError(
      "Astro session support is required for private Sesh audio metadata operations.",
    );
  }

  if (
    typeof runtimeEnvironment !==
      "object" ||
    runtimeEnvironment ===
      null
  ) {
    throw new TypeError(
      "Sesh audio API runtime environment is required.",
    );
  }

  const projects =
    createAuthorizedSeshProjectOperationsAtRuntime(
      session,
      runtimeEnvironment,
    );

  const persistence =
    createSeshRuntimePersistence(
      runtimeEnvironment,
    );

  return new DefaultCreatorAudioAssetOperationService({
    projects,

    audioAssets:
      persistence.audioAssetRepository,
  });
}
