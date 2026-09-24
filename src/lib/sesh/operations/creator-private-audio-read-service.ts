import {
  parseSeshAudioAssetId,
  parseSeshMusicProjectId,
} from "../identifiers";

import type {
  SeshAudioAssetId,
  SeshMusicProjectId,
} from "../identifiers";

import type {
  SeshAudioAssetRepository,
  SeshAudioObjectReadRange,
  SeshAudioObjectStore,
  SeshResolvedAudioObjectRange,
} from "../persistence";

import type {
  CreatorAudioAssetOperationFailureCode,
  CreatorAudioAssetOperationService,
} from "./creator-audio-asset-operation-service";

export interface CreatorPrivateAudioReadValue {
  readonly bytes:
    Uint8Array;

  readonly contentType:
    "audio/wav";

  readonly totalSize:
    number;

  readonly range?:
    SeshResolvedAudioObjectRange;
}

export type CreatorPrivateAudioReadFailureCode =
  | CreatorAudioAssetOperationFailureCode
  | "range-not-satisfiable";

export interface CreatorPrivateAudioReadFailure {
  readonly code:
    CreatorPrivateAudioReadFailureCode;

  readonly message:
    string;
}

export type CreatorPrivateAudioReadResult =
  | {
      readonly ok:
        true;

      readonly value:
        CreatorPrivateAudioReadValue;
    }
  | {
      readonly ok:
        false;

      readonly error:
        CreatorPrivateAudioReadFailure;
    };

export interface CreatorPrivateAudioReadService {
  readProjectAudioBytes(
    projectId:
      unknown,

    audioAssetId:
      unknown,

    range?:
      SeshAudioObjectReadRange,
  ): Promise<CreatorPrivateAudioReadResult>;
}

export interface DefaultCreatorPrivateAudioReadServiceDependencies {
  readonly authorizedAssets:
    CreatorAudioAssetOperationService;

  readonly audioAssets:
    Pick<
      SeshAudioAssetRepository,
      "getAudioAsset"
    >;

  readonly audioObjects:
    Pick<
      SeshAudioObjectStore,
      "getObject"
    >;
}

function failure(
  code:
    CreatorPrivateAudioReadFailureCode,

  message:
    string,
): CreatorPrivateAudioReadResult {
  return {
    ok:
      false,

    error: {
      code,
      message,
    },
  };
}

function parseIds(
  projectIdInput:
    unknown,

  audioAssetIdInput:
    unknown,
):
| {
    readonly projectId:
      SeshMusicProjectId;

    readonly audioAssetId:
      SeshAudioAssetId;
  }
| null {
  try {
    return {
      projectId:
        parseSeshMusicProjectId(
          projectIdInput,
        ),

      audioAssetId:
        parseSeshAudioAssetId(
          audioAssetIdInput,
        ),
    };
  }
  catch {
    return null;
  }
}

export class DefaultCreatorPrivateAudioReadService
implements CreatorPrivateAudioReadService {
  readonly #authorizedAssets:
    CreatorAudioAssetOperationService;

  readonly #audioAssets:
    Pick<
      SeshAudioAssetRepository,
      "getAudioAsset"
    >;

  readonly #audioObjects:
    Pick<
      SeshAudioObjectStore,
      "getObject"
    >;

  constructor(
    dependencies:
      DefaultCreatorPrivateAudioReadServiceDependencies,
  ) {
    this.#authorizedAssets =
      dependencies.authorizedAssets;

    this.#audioAssets =
      dependencies.audioAssets;

    this.#audioObjects =
      dependencies.audioObjects;
  }

  async readProjectAudioBytes(
    projectIdInput:
      unknown,

    audioAssetIdInput:
      unknown,

    range?:
      SeshAudioObjectReadRange,
  ): Promise<CreatorPrivateAudioReadResult> {
    const ids =
      parseIds(
        projectIdInput,
        audioAssetIdInput,
      );

    if (
      ids ===
      null
    ) {
      return failure(
        "invalid-input",
        "Invalid Sesh private audio resource identifier.",
      );
    }

    const authorization =
      await this.#authorizedAssets
        .readProjectAudioAsset(
          ids.projectId,
          ids.audioAssetId,
        );

    if (
      !authorization.ok
    ) {
      return failure(
        authorization.error.code,
        authorization.error.message,
      );
    }

    const metadata =
      await this.#audioAssets
        .getAudioAsset(
          ids.audioAssetId,
        );

    if (
      !metadata.ok
    ) {
      return failure(
        metadata.error.kind ===
          "not-found"
          ? "not-found"
          : "unavailable",
        metadata.error.kind ===
          "not-found"
          ? "Sesh private audio was not found."
          : "Sesh private audio metadata is temporarily unavailable.",
      );
    }

    const asset =
      metadata.value;

    if (
      asset.id !==
        ids.audioAssetId ||
      asset.projectId !==
        ids.projectId ||
      authorization.value.id !==
        ids.audioAssetId
    ) {
      return failure(
        "unavailable",
        "Sesh private audio metadata failed its authorization invariant.",
      );
    }

    if (
      asset.storageReference ===
        undefined ||
      asset.contentType !==
        "audio/wav" ||
      authorization.value.hasStoredAudio !==
        true
    ) {
      return failure(
        "not-found",
        "Sesh private audio content is unavailable.",
      );
    }

    const object =
      await this.#audioObjects
        .getObject(
          asset.storageReference,
          range,
        );

    if (
      !object.ok
    ) {
      if (
        range !==
          undefined &&
        object.error.kind ===
          "validation"
      ) {
        return failure(
          "range-not-satisfiable",
          "The requested private audio byte range is not satisfiable.",
        );
      }

      return failure(
        object.error.kind ===
          "not-found"
          ? "not-found"
          : "unavailable",
        object.error.kind ===
          "not-found"
          ? "Sesh private audio content was not found."
          : "Sesh private audio storage is temporarily unavailable.",
      );
    }

    if (
      !(
        object.value.bytes instanceof
        Uint8Array
      ) ||
      object.value.bytes.byteLength ===
        0
    ) {
      return failure(
        "unavailable",
        "Sesh private audio storage returned invalid content.",
      );
    }

    return {
      ok:
        true,

      value: {
        bytes:
          new Uint8Array(
            object.value.bytes,
          ),

        contentType:
          "audio/wav",

        totalSize:
          Number.isSafeInteger(
            object.value.totalSize,
          ) &&
          object.value.totalSize! >=
            object.value.bytes.byteLength
            ? object.value.totalSize!
            : object.value.bytes.byteLength,

        range:
          object.value.range ===
          undefined
            ? undefined
            : {
                ...object.value.range,
              },
      },
    };
  }
}