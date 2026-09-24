import type {
  SeshProjectOwnershipAuthorizationFailureCode,
  SeshProjectOwnershipAuthorizer,
} from "../authorization/project-ownership-authorizer";

import {
  parseSeshAudioAssetId,
  parseSeshMusicProjectId,
} from "../identifiers";

import type {
  SeshAudioAsset,
} from "../model";

import type {
  SeshPersistenceError,
  SeshAudioAssetRepository,
} from "../persistence/repositories";

import {
  validateSeshAudioAsset,
} from "../validation";

import type {
  CreatorAudioAssetView,
} from "./creator-audio-asset-operation-service";

export type CreatorAudioRenameFailureCode =
  | "invalid-input"
  | SeshProjectOwnershipAuthorizationFailureCode
  | "not-found"
  | "conflict"
  | "unavailable";

export interface CreatorAudioRenameFailure {
  readonly code:
    CreatorAudioRenameFailureCode;

  readonly message:
    string;
}

export type CreatorAudioRenameResult =
  | {
      readonly ok:
        true;

      readonly value:
        CreatorAudioAssetView;
    }
  | {
      readonly ok:
        false;

      readonly error:
        CreatorAudioRenameFailure;
    };

export interface CreatorAudioRenameService {
  renameProjectAudio(
    projectId:
      unknown,

    audioAssetId:
      unknown,

    input:
      unknown,
  ): Promise<CreatorAudioRenameResult>;
}

export interface DefaultCreatorAudioRenameServiceDependencies {
  readonly authorizer:
    SeshProjectOwnershipAuthorizer;

  readonly audioAssets:
    Pick<
      SeshAudioAssetRepository,
      | "getAudioAssetSnapshot"
      | "updateAudioAssetConditionally"
    >;
}

function failure(
  code:
    CreatorAudioRenameFailureCode,

  message:
    string,
): CreatorAudioRenameResult {
  return {
    ok:
      false,

    error: {
      code,
      message,
    },
  };
}

function mapPersistenceFailure(
  error:
    SeshPersistenceError,
): CreatorAudioRenameResult {
  switch (error.kind) {
    case "not-found":
      return failure(
        "not-found",
        error.message,
      );

    case "conflict":
      return failure(
        "conflict",
        error.message,
      );

    case "validation":
    case "version":
    case "storage":
    default:
      return failure(
        "unavailable",
        error.message,
      );
  }
}

function renameInput(
  input:
    unknown,
):
  | {
      readonly name:
        string;
    }
  | null {
  if (
    typeof input !==
      "object" ||
    input ===
      null ||
    Array.isArray(
      input,
    )
  ) {
    return null;
  }

  const record =
    input as
      Record<string, unknown>;

  const keys =
    Object.keys(
      record,
    );

  if (
    keys.length !==
      1 ||
    keys[0] !==
      "name"
  ) {
    return null;
  }

  if (
    typeof record.name !==
      "string"
  ) {
    return null;
  }

  const name =
    record.name.trim();

  if (
    name.length ===
      0 ||
    name.length >
      120
  ) {
    return null;
  }

  return {
    name,
  };
}

function sanitizedView(
  asset:
    SeshAudioAsset,
): CreatorAudioAssetView {
  return {
    id:
      asset.id,

    kind:
      asset.kind,

    name:
      asset.name,

    durationSeconds:
      asset.durationSeconds,

    sampleRateHz:
      asset.sampleRateHz,

    channelCount:
      asset.channelCount,

    contentType:
      asset.contentType,

    hasStoredAudio:
      asset.storageReference !==
      undefined,
  };
}

export class DefaultCreatorAudioRenameService
implements CreatorAudioRenameService {
  readonly #authorizer:
    SeshProjectOwnershipAuthorizer;

  readonly #audioAssets:
    Pick<
      SeshAudioAssetRepository,
      | "getAudioAssetSnapshot"
      | "updateAudioAssetConditionally"
    >;

  constructor(
    dependencies:
      DefaultCreatorAudioRenameServiceDependencies,
  ) {
    this.#authorizer =
      dependencies.authorizer;

    this.#audioAssets =
      dependencies.audioAssets;
  }

  async renameProjectAudio(
    projectIdInput:
      unknown,

    audioAssetIdInput:
      unknown,

    input:
      unknown,
  ): Promise<CreatorAudioRenameResult> {
    const validatedInput =
      renameInput(
        input,
      );

    if (
      validatedInput ===
      null
    ) {
      return failure(
        "invalid-input",
        "Sesh private audio rename requires exactly one valid name field.",
      );
    }

    let projectId;
    let audioAssetId;

    try {
      projectId =
        parseSeshMusicProjectId(
          projectIdInput,
        );

      audioAssetId =
        parseSeshAudioAssetId(
          audioAssetIdInput,
        );
    }
    catch (error) {
      return failure(
        "invalid-input",
        error instanceof Error
          ? error.message
          : "Invalid Sesh audio rename resource identifier.",
      );
    }

    const authorization =
      await this.#authorizer
        .authorize(
          projectId,
          "write",
        );

    if (
      !authorization.ok
    ) {
      return failure(
        authorization.error.code,
        authorization.error.message,
      );
    }

    const snapshotResult =
      await this.#audioAssets
        .getAudioAssetSnapshot(
          audioAssetId,
        );

    if (
      !snapshotResult.ok
    ) {
      return mapPersistenceFailure(
        snapshotResult.error,
      );
    }

    const snapshot =
      snapshotResult.value;

    if (
      snapshot.asset.id !==
        audioAssetId ||
      snapshot.asset.projectId !==
        projectId
    ) {
      return failure(
        "not-found",
        "Sesh private audio asset was not found in the authorized project.",
      );
    }

    let candidate:
      SeshAudioAsset;

    try {
      candidate =
        validateSeshAudioAsset({
          ...snapshot.asset,

          name:
            validatedInput.name,
        });
    }
    catch (error) {
      return failure(
        "invalid-input",
        error instanceof Error
          ? error.message
          : "Sesh private audio rename metadata is invalid.",
      );
    }

    const updated =
      await this.#audioAssets
        .updateAudioAssetConditionally(
          candidate,
          snapshot.revision,
        );

    if (
      !updated.ok
    ) {
      return mapPersistenceFailure(
        updated.error,
      );
    }

    if (
      updated.value.asset.id !==
        snapshot.asset.id ||
      updated.value.asset.projectId !==
        snapshot.asset.projectId ||
      updated.value.asset.kind !==
        snapshot.asset.kind ||
      updated.value.asset.createdAt !==
        snapshot.asset.createdAt ||
      updated.value.asset.durationSeconds !==
        snapshot.asset.durationSeconds ||
      updated.value.asset.sampleRateHz !==
        snapshot.asset.sampleRateHz ||
      updated.value.asset.channelCount !==
        snapshot.asset.channelCount ||
      updated.value.asset.contentType !==
        snapshot.asset.contentType ||
      JSON.stringify(
        updated.value.asset.storageReference ??
        null,
      ) !==
      JSON.stringify(
        snapshot.asset.storageReference ??
        null,
      )
    ) {
      return failure(
        "unavailable",
        "Sesh private audio rename violated immutable metadata invariants.",
      );
    }

    return {
      ok:
        true,

      value:
        sanitizedView(
          updated.value.asset,
        ),
    };
  }
}