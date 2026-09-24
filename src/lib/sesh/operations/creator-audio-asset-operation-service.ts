import {
  parseSeshAudioAssetId,
  parseSeshMusicProjectId,
  type SeshAudioAssetId,
} from "../identifiers";

import type {
  SeshAudioAsset,
} from "../model";

import type {
  SeshAudioAssetRepository,
} from "../persistence/repositories";

import type {
  AuthorizedSeshProjectOperationService,
  SeshProjectOperationFailureCode,
} from "./project-operation-service";

export interface CreatorAudioAssetView {
  readonly id:
    SeshAudioAssetId;

  readonly kind:
    SeshAudioAsset["kind"];

  readonly name:
    string;

  readonly durationSeconds?:
    number;

  readonly sampleRateHz?:
    number;

  readonly channelCount?:
    number;

  readonly contentType?:
    string;

  readonly hasStoredAudio:
    boolean;
}

export type CreatorAudioAssetOperationFailureCode =
  SeshProjectOperationFailureCode;

export type CreatorAudioAssetOperationResult<T> =
  | {
      readonly ok:
        true;

      readonly value:
        T;
    }
  | {
      readonly ok:
        false;

      readonly error: {
        readonly code:
          CreatorAudioAssetOperationFailureCode;

        readonly message:
          string;
      };
    };

export interface CreatorAudioAssetOperationService {
  listProjectAudioAssets(
    projectId:
      unknown,
  ): Promise<
    CreatorAudioAssetOperationResult<
      readonly CreatorAudioAssetView[]
    >
  >;

  readProjectAudioAsset(
    projectId:
      unknown,

    audioAssetId:
      unknown,
  ): Promise<
    CreatorAudioAssetOperationResult<
      CreatorAudioAssetView
    >
  >;
}

export interface DefaultCreatorAudioAssetOperationServiceDependencies {
  readonly projects:
    Pick<
      AuthorizedSeshProjectOperationService,
      "readProject"
    >;

  readonly audioAssets:
    Pick<
      SeshAudioAssetRepository,
      | "getAudioAsset"
      | "listAudioAssetsForProject"
    >;
}

function success<T>(
  value:
    T,
): CreatorAudioAssetOperationResult<T> {
  return {
    ok:
      true,

    value,
  };
}

function failure<T>(
  code:
    CreatorAudioAssetOperationFailureCode,

  message:
    string,
): CreatorAudioAssetOperationResult<T> {
  return {
    ok:
      false,

    error: {
      code,
      message,
    },
  };
}

function persistenceFailure<T>(
  error: {
    readonly kind:
      string;

    readonly message:
      string;
  },
): CreatorAudioAssetOperationResult<T> {
  if (
    error.kind ===
    "validation"
  ) {
    return failure(
      "invalid-input",
      error.message,
    );
  }

  if (
    error.kind ===
    "not-found"
  ) {
    return failure(
      "not-found",
      error.message,
    );
  }

  return failure(
    "unavailable",
    error.message,
  );
}

function sanitizeAudioAsset(
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

export class DefaultCreatorAudioAssetOperationService
implements CreatorAudioAssetOperationService {
  readonly #projects:
    Pick<
      AuthorizedSeshProjectOperationService,
      "readProject"
    >;

  readonly #audioAssets:
    Pick<
      SeshAudioAssetRepository,
      | "getAudioAsset"
      | "listAudioAssetsForProject"
    >;

  constructor(
    dependencies:
      DefaultCreatorAudioAssetOperationServiceDependencies,
  ) {
    this.#projects =
      dependencies.projects;

    this.#audioAssets =
      dependencies.audioAssets;
  }

  async listProjectAudioAssets(
    projectIdInput:
      unknown,
  ): Promise<
    CreatorAudioAssetOperationResult<
      readonly CreatorAudioAssetView[]
    >
  > {
    let projectId;

    try {
      projectId =
        parseSeshMusicProjectId(
          projectIdInput,
        );
    }
    catch (
      error
    ) {
      return failure(
        "invalid-input",
        error instanceof Error
          ? error.message
          : "Invalid Sesh project identifier.",
      );
    }

    const projectResult =
      await this.#projects
        .readProject(
          projectId,
        );

    if (
      !projectResult.ok
    ) {
      return failure(
        projectResult.error.code,
        projectResult.error.message,
      );
    }

    const assetsResult =
      await this.#audioAssets
        .listAudioAssetsForProject(
          projectId,
        );

    if (
      !assetsResult.ok
    ) {
      return persistenceFailure(
        assetsResult.error,
      );
    }

    const sanitized:
      CreatorAudioAssetView[] =
        [];

    for (
      const asset of
      assetsResult.value
    ) {
      if (
        asset.projectId !==
        projectId
      ) {
        return failure(
          "unavailable",
          "Sesh audio metadata did not agree with the authorized project.",
        );
      }

      sanitized.push(
        sanitizeAudioAsset(
          asset,
        ),
      );
    }

    return success(
      sanitized,
    );
  }

  async readProjectAudioAsset(
    projectIdInput:
      unknown,

    audioAssetIdInput:
      unknown,
  ): Promise<
    CreatorAudioAssetOperationResult<
      CreatorAudioAssetView
    >
  > {
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
    catch (
      error
    ) {
      return failure(
        "invalid-input",
        error instanceof Error
          ? error.message
          : "Invalid Sesh audio resource identifier.",
      );
    }

    const projectResult =
      await this.#projects
        .readProject(
          projectId,
        );

    if (
      !projectResult.ok
    ) {
      return failure(
        projectResult.error.code,
        projectResult.error.message,
      );
    }

    const assetResult =
      await this.#audioAssets
        .getAudioAsset(
          audioAssetId,
        );

    if (
      !assetResult.ok
    ) {
      return persistenceFailure(
        assetResult.error,
      );
    }

    if (
      assetResult.value.projectId !==
      projectId
    ) {
      return failure(
        "not-found",
        "Sesh audio asset was not found.",
      );
    }

    return success(
      sanitizeAudioAsset(
        assetResult.value,
      ),
    );
  }
}
