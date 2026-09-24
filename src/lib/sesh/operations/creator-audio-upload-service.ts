import type {
  SeshProjectOwnershipAuthorizer,
  SeshProjectOwnershipAuthorizationFailureCode,
} from "../authorization/project-ownership-authorizer";

import {
  createSeshAudioAssetId,
  parseSeshMusicProjectId,
  type SeshAudioAssetId,
  type SeshMusicProjectId,
} from "../identifiers";

import {
  SESH_AUDIO_ASSET_KINDS,
  type SeshAudioAsset,
  type SeshAudioAssetKind,
  type SeshStorageReference,
} from "../model";

import type {
  SeshPersistenceError,
} from "../persistence/model";

import type {
  SeshAudioAssetRepository,
  SeshAudioObjectStore,
  SeshProjectRepository,
} from "../persistence/repositories";

import {
  validateSeshAudioAsset,
} from "../validation";

export const SESH_PRIVATE_AUDIO_UPLOAD_CONTENT_TYPES =
  [
    "audio/wav",
  ] as const;

export const SESH_PRIVATE_AUDIO_UPLOAD_MAX_BYTES =
  25 *
  1024 *
  1024;

export type SeshPrivateAudioUploadContentType =
  (
    typeof SESH_PRIVATE_AUDIO_UPLOAD_CONTENT_TYPES
  )[number];

export interface CreatorAudioUploadInput {
  readonly kind:
    SeshAudioAssetKind;

  readonly name:
    string;

  readonly contentType:
    SeshPrivateAudioUploadContentType;

  readonly bytes:
    Uint8Array;

  readonly durationSeconds?:
    number;

  readonly sampleRateHz?:
    number;

  readonly channelCount?:
    number;
}

export interface CreatorAudioUploadView {
  readonly id:
    SeshAudioAssetId;

  readonly kind:
    SeshAudioAssetKind;

  readonly name:
    string;

  readonly contentType:
    SeshPrivateAudioUploadContentType;

  readonly durationSeconds?:
    number;

  readonly sampleRateHz?:
    number;

  readonly channelCount?:
    number;

  readonly hasStoredAudio:
    true;
}

export type CreatorAudioUploadFailureCode =
  | "invalid-input"
  | SeshProjectOwnershipAuthorizationFailureCode
  | "conflict"
  | "unavailable";

export type CreatorAudioUploadResult =
  | {
      readonly ok:
        true;

      readonly value:
        CreatorAudioUploadView;
    }
  | {
      readonly ok:
        false;

      readonly error: {
        readonly code:
          CreatorAudioUploadFailureCode;

        readonly message:
          string;
      };
    };

export interface CreatorAudioUploadService {
  uploadProjectAudio(
    projectId:
      unknown,

    input:
      unknown,
  ): Promise<
    CreatorAudioUploadResult
  >;
}

export interface DefaultCreatorAudioUploadServiceDependencies {
  readonly authorizer:
    SeshProjectOwnershipAuthorizer;

  readonly projects:
    Pick<
      SeshProjectRepository,
      | "getProjectSnapshot"
      | "updateProjectConditionally"
    >;

  readonly audioAssets:
    Pick<
      SeshAudioAssetRepository,
      | "saveAudioAsset"
      | "deleteAudioAssetMetadata"
    >;

  readonly audioObjects:
    Pick<
      SeshAudioObjectStore,
      | "putObject"
      | "deleteObject"
    >;

  readonly now:
    () => string;

  readonly createAudioAssetId:
    () => SeshAudioAssetId;

  readonly createStorageReference:
    (
      projectId:
        SeshMusicProjectId,

      audioAssetId:
        SeshAudioAssetId,
    ) => SeshStorageReference;
}

interface ValidatedUploadInput {
  readonly kind:
    SeshAudioAssetKind;

  readonly name:
    string;

  readonly contentType:
    SeshPrivateAudioUploadContentType;

  readonly bytes:
    Uint8Array;

  readonly durationSeconds?:
    number;

  readonly sampleRateHz?:
    number;

  readonly channelCount?:
    number;
}

const UPLOAD_INPUT_KEYS =
  new Set([
    "kind",
    "name",
    "contentType",
    "bytes",
    "durationSeconds",
    "sampleRateHz",
    "channelCount",
  ]);

function success(
  value:
    CreatorAudioUploadView,
): CreatorAudioUploadResult {
  return {
    ok:
      true,

    value,
  };
}

function failure(
  code:
    CreatorAudioUploadFailureCode,

  message:
    string,
): CreatorAudioUploadResult {
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

  fallback:
    string,
): CreatorAudioUploadResult {
  switch (
    error.kind
  ) {
    case "validation":
      return failure(
        "invalid-input",
        error.message,
      );

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

    case "version":
    case "storage":
    default:
      return failure(
        "unavailable",
        error.message ||
          fallback,
      );
  }
}

function isFiniteOptional(
  value:
    unknown,
): value is
number | undefined {
  return value ===
    undefined ||
    (
      typeof value ===
        "number" &&
      Number.isFinite(
        value,
      )
    );
}

function validateInput(
  input:
    unknown,
): ValidatedUploadInput | null {
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
    input as Record<
      string,
      unknown
    >;

  for (
    const key of
    Object.keys(
      record,
    )
  ) {
    if (
      !UPLOAD_INPUT_KEYS.has(
        key,
      )
    ) {
      return null;
    }
  }

  if (
    typeof record.kind !==
      "string" ||
    !(
      SESH_AUDIO_ASSET_KINDS as
        readonly string[]
    ).includes(
      record.kind,
    )
  ) {
    return null;
  }

  if (
    typeof record.name !==
      "string" ||
    record.name.trim().length ===
      0 ||
    record.name.trim().length >
      120
  ) {
    return null;
  }

  if (
    record.contentType !==
      "audio/wav"
  ) {
    return null;
  }

  if (
    !(
      record.bytes instanceof
      Uint8Array
    ) ||
    record.bytes.byteLength ===
      0 ||
    record.bytes.byteLength >
      SESH_PRIVATE_AUDIO_UPLOAD_MAX_BYTES
  ) {
    return null;
  }

  if (
    !isFiniteOptional(
      record.durationSeconds,
    ) ||
    (
      record.durationSeconds !==
        undefined &&
      record.durationSeconds <
        0
    )
  ) {
    return null;
  }

  if (
    !isFiniteOptional(
      record.sampleRateHz,
    ) ||
    (
      record.sampleRateHz !==
        undefined &&
      record.sampleRateHz <=
        0
    )
  ) {
    return null;
  }

  if (
    record.channelCount !==
      undefined &&
    (
      typeof record.channelCount !==
        "number" ||
      !Number.isInteger(
        record.channelCount,
      ) ||
      record.channelCount <=
        0
    )
  ) {
    return null;
  }

  return {
    kind:
      record.kind as
        SeshAudioAssetKind,

    name:
      record.name.trim(),

    contentType:
      "audio/wav",

    bytes:
      new Uint8Array(
        record.bytes,
      ),

    durationSeconds:
      record.durationSeconds as
        number | undefined,

    sampleRateHz:
      record.sampleRateHz as
        number | undefined,

    channelCount:
      record.channelCount as
        number | undefined,
  };
}

function uploadView(
  asset:
    SeshAudioAsset,
): CreatorAudioUploadView {
  return {
    id:
      asset.id,

    kind:
      asset.kind,

    name:
      asset.name,

    contentType:
      "audio/wav",

    durationSeconds:
      asset.durationSeconds,

    sampleRateHz:
      asset.sampleRateHz,

    channelCount:
      asset.channelCount,

    hasStoredAudio:
      true,
  };
}

export class DefaultCreatorAudioUploadService
implements CreatorAudioUploadService {
  readonly #authorizer:
    SeshProjectOwnershipAuthorizer;

  readonly #projects:
    Pick<
      SeshProjectRepository,
      | "getProjectSnapshot"
      | "updateProjectConditionally"
    >;

  readonly #audioAssets:
    Pick<
      SeshAudioAssetRepository,
      | "saveAudioAsset"
      | "deleteAudioAssetMetadata"
    >;

  readonly #audioObjects:
    Pick<
      SeshAudioObjectStore,
      | "putObject"
      | "deleteObject"
    >;

  readonly #now:
    () => string;

  readonly #createAudioAssetId:
    () => SeshAudioAssetId;

  readonly #createStorageReference:
    (
      projectId:
        SeshMusicProjectId,

      audioAssetId:
        SeshAudioAssetId,
    ) => SeshStorageReference;

  constructor(
    dependencies:
      DefaultCreatorAudioUploadServiceDependencies,
  ) {
    this.#authorizer =
      dependencies.authorizer;

    this.#projects =
      dependencies.projects;

    this.#audioAssets =
      dependencies.audioAssets;

    this.#audioObjects =
      dependencies.audioObjects;

    this.#now =
      dependencies.now;

    this.#createAudioAssetId =
      dependencies.createAudioAssetId;

    this.#createStorageReference =
      dependencies.createStorageReference;
  }

  async uploadProjectAudio(
    projectIdInput:
      unknown,

    input:
      unknown,
  ): Promise<
    CreatorAudioUploadResult
  > {
    const validated =
      validateInput(
        input,
      );

    if (
      validated ===
      null
    ) {
      return failure(
        "invalid-input",
        "Sesh private audio upload input is invalid.",
      );
    }

    let projectId:
      SeshMusicProjectId;

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
      await this.#projects
        .getProjectSnapshot(
          projectId,
        );

    if (
      !snapshotResult.ok
    ) {
      return mapPersistenceFailure(
        snapshotResult.error,
        "Sesh project snapshot is unavailable.",
      );
    }

    const snapshot =
      snapshotResult.value;

    if (
      snapshot.project.id !==
        projectId ||
      snapshot.project.ownerCreatorId !==
        authorization.value.seshCreatorId
    ) {
      return failure(
        "unavailable",
        "Sesh project snapshot failed its authorization invariant.",
      );
    }

    let audioAssetId:
      SeshAudioAssetId;

    let storageReference:
      SeshStorageReference;

    let createdAt:
      string;

    try {
      const generated =
        this.#createAudioAssetId();

      audioAssetId =
        createSeshAudioAssetId(
          generated.slice(
            "sesh-audio:".length,
          ),
        );

      storageReference =
        this.#createStorageReference(
          projectId,
          audioAssetId,
        );

      createdAt =
        this.#now();
    }
    catch {
      return failure(
        "unavailable",
        "Sesh audio upload resource creation is temporarily unavailable.",
      );
    }

    if (
      snapshot.project.audioAssetIds.includes(
        audioAssetId,
      )
    ) {
      return failure(
        "conflict",
        "Sesh audio asset already belongs to this project.",
      );
    }

    let asset:
      SeshAudioAsset;

    try {
      asset =
        validateSeshAudioAsset({
          id:
            audioAssetId,

          projectId,

          kind:
            validated.kind,

          name:
            validated.name,

          createdAt,

          durationSeconds:
            validated.durationSeconds,

          sampleRateHz:
            validated.sampleRateHz,

          channelCount:
            validated.channelCount,

          storageReference,

          contentType:
            validated.contentType,
        });
    }
    catch (
      error
    ) {
      return failure(
        "invalid-input",
        error instanceof Error
          ? error.message
          : "Sesh audio metadata is invalid.",
      );
    }

    const objectWrite =
      await this.#audioObjects
        .putObject(
          storageReference,
          validated.bytes,
        );

    if (
      !objectWrite.ok
    ) {
      return mapPersistenceFailure(
        objectWrite.error,
        "Sesh private audio storage is unavailable.",
      );
    }

    const metadataWrite =
      await this.#audioAssets
        .saveAudioAsset(
          asset,
        );

    if (
      !metadataWrite.ok
    ) {
      const objectRollback =
        await this.#audioObjects
          .deleteObject(
            storageReference,
          );

      if (
        !objectRollback.ok
      ) {
        return failure(
          "unavailable",
          "Sesh audio metadata creation failed and binary compensation also failed.",
        );
      }

      return mapPersistenceFailure(
        metadataWrite.error,
        "Sesh audio metadata creation failed.",
      );
    }

    if (
      metadataWrite.value.id !==
        audioAssetId ||
      metadataWrite.value.projectId !==
        projectId
    ) {
      const metadataRollback =
        await this.#audioAssets
          .deleteAudioAssetMetadata(
            audioAssetId,
          );

      if (
        !metadataRollback.ok
      ) {
        return failure(
          "unavailable",
          "Sesh audio metadata identity verification failed and metadata compensation also failed.",
        );
      }

      const objectRollback =
        await this.#audioObjects
          .deleteObject(
            storageReference,
          );

      if (
        !objectRollback.ok
      ) {
        return failure(
          "unavailable",
          "Sesh audio metadata identity verification failed and binary compensation also failed.",
        );
      }

      return failure(
        "unavailable",
        "Sesh audio metadata failed its canonical identity invariant.",
      );
    }

    const attachedProject = {
      ...snapshot.project,

      updatedAt:
        createdAt,

      audioAssetIds: [
        ...snapshot.project.audioAssetIds,
        audioAssetId,
      ],
    };

    const projectWrite =
      await this.#projects
        .updateProjectConditionally(
          attachedProject,
          snapshot.revision,
          authorization.value.seshCreatorId,
        );

    if (
      !projectWrite.ok
    ) {
      const metadataRollback =
        await this.#audioAssets
          .deleteAudioAssetMetadata(
            audioAssetId,
          );

      if (
        !metadataRollback.ok
      ) {
        return failure(
          "unavailable",
          "Sesh project attachment failed and metadata compensation also failed.",
        );
      }

      const objectRollback =
        await this.#audioObjects
          .deleteObject(
            storageReference,
          );

      if (
        !objectRollback.ok
      ) {
        return failure(
          "unavailable",
          "Sesh project attachment failed and binary compensation also failed.",
        );
      }

      return mapPersistenceFailure(
        projectWrite.error,
        "Sesh project attachment failed.",
      );
    }

    if (
      projectWrite.value.project.id !==
        projectId ||
      projectWrite.value.project.ownerCreatorId !==
        authorization.value.seshCreatorId ||
      !projectWrite.value.project.audioAssetIds.includes(
        audioAssetId,
      )
    ) {
      return failure(
        "unavailable",
        "Sesh audio upload completed but the project attachment result failed its canonical invariant.",
      );
    }

    return success(
      uploadView(
        metadataWrite.value,
      ),
    );
  }
}
