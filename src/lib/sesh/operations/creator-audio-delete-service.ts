import type {
  SeshProjectOwnershipAuthorizer,
  SeshProjectOwnershipAuthorizationFailureCode,
} from "../authorization/project-ownership-authorizer";

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
  SeshAudioObjectStore,
  SeshProjectRepository,
} from "../persistence";

import type {
  SeshTrackRepository,
} from "../persistence/track-repository";

import type {
  SeshPersistenceError,
} from "../persistence/model";

export type CreatorAudioDeleteFailureCode =
  | SeshProjectOwnershipAuthorizationFailureCode
  | "invalid-input"
  | "not-found"
  | "conflict"
  | "unavailable";

export interface CreatorAudioDeleteFailure {
  readonly code:
    CreatorAudioDeleteFailureCode;

  readonly message:
    string;
}

export interface CreatorAudioDeleteValue {
  readonly id:
    SeshAudioAssetId;

  readonly deleted:
    true;
}

export type CreatorAudioDeleteResult =
  | {
      readonly ok:
        true;

      readonly value:
        CreatorAudioDeleteValue;
    }
  | {
      readonly ok:
        false;

      readonly error:
        CreatorAudioDeleteFailure;
    };

export interface CreatorAudioDeleteService {
  deleteProjectAudio(
    projectId:
      unknown,

    audioAssetId:
      unknown,
  ): Promise<CreatorAudioDeleteResult>;
}

export interface DefaultCreatorAudioDeleteServiceDependencies {
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
      | "getAudioAsset"
      | "deleteAudioAssetMetadata"
    >;

  readonly audioObjects:
    Pick<
      SeshAudioObjectStore,
      "deleteObject"
    >;

  readonly tracks:
    Pick<
      SeshTrackRepository,
      "listTracksForProject"
    >;
  readonly now?:
    () => string;
}

function failure(
  code:
    CreatorAudioDeleteFailureCode,

  message:
    string,
): CreatorAudioDeleteResult {
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
): CreatorAudioDeleteResult {
  switch (error.kind) {
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

export class DefaultCreatorAudioDeleteService
implements CreatorAudioDeleteService {
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
      | "getAudioAsset"
      | "deleteAudioAssetMetadata"
    >;

  readonly #audioObjects:
    Pick<
      SeshAudioObjectStore,
      "deleteObject"
    >;

  readonly #tracks:
    Pick<
      SeshTrackRepository,
      "listTracksForProject"
    >;

  readonly #now:
    () => string;

  constructor(
    dependencies:
      DefaultCreatorAudioDeleteServiceDependencies,
  ) {
    this.#authorizer =
      dependencies.authorizer;

    this.#projects =
      dependencies.projects;

    this.#audioAssets =
      dependencies.audioAssets;

    this.#audioObjects =
      dependencies.audioObjects;

    this.#tracks =
      dependencies.tracks;

    this.#now =
      dependencies.now ??
      (() =>
        new Date().toISOString());
  }

  async deleteProjectAudio(
    projectIdInput:
      unknown,

    audioAssetIdInput:
      unknown,
  ): Promise<CreatorAudioDeleteResult> {
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
        "Invalid Sesh private audio delete resource identifier.",
      );
    }

    const authorization =
      await this.#authorizer
        .authorize(
          ids.projectId,
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
          ids.projectId,
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
        ids.projectId ||
      snapshot.project.ownerCreatorId !==
        authorization.value.seshCreatorId
    ) {
      return failure(
        "unavailable",
        "Sesh project snapshot failed its authorization invariant.",
      );
    }

    const metadataResult =
      await this.#audioAssets
        .getAudioAsset(
          ids.audioAssetId,
        );

    if (
      !metadataResult.ok
    ) {
      return mapPersistenceFailure(
        metadataResult.error,
        metadataResult.error.kind ===
          "not-found"
          ? "Sesh private audio was not found."
          : "Sesh private audio metadata is unavailable.",
      );
    }

    const asset =
      metadataResult.value;

    if (
      asset.id !==
        ids.audioAssetId ||
      asset.projectId !==
        ids.projectId
    ) {
      return failure(
        "unavailable",
        "Sesh private audio metadata failed its project identity invariant.",
      );
    }

    if (
      !snapshot.project.audioAssetIds.includes(
        ids.audioAssetId,
      )
    ) {
      return failure(
        "not-found",
        "Sesh private audio is not attached to this project.",
      );
    }

    const tracksResult =
      await this.#tracks
        .listTracksForProject(
          ids.projectId,
        );

    if (
      !tracksResult.ok
    ) {
      return mapPersistenceFailure(
        tracksResult.error,
        "Sesh project track references are unavailable.",
      );
    }

    const canonicalTrackIds =
      new Set(
        snapshot.project.trackIds,
      );

    const seenCanonicalTrackIds =
      new Set<
        (typeof snapshot.project.trackIds)[number]
      >();

    for (
      const track of
      tracksResult.value
    ) {
      if (
        track.projectId !==
        ids.projectId
      ) {
        return failure(
          "unavailable",
          "Sesh project track listing failed its project identity invariant.",
        );
      }

      if (
        !canonicalTrackIds.has(
          track.id,
        )
      ) {
        continue;
      }

      if (
        seenCanonicalTrackIds.has(
          track.id,
        )
      ) {
        return failure(
          "unavailable",
          "Sesh project track listing contains duplicate canonical track metadata.",
        );
      }

      seenCanonicalTrackIds.add(
        track.id,
      );

      if (
        track.audioAssetIds.includes(
          ids.audioAssetId,
        )
      ) {
        return failure(
          "conflict",
          "Sesh private audio is attached to a track. Detach it from all tracks before deleting it.",
        );
      }
    }

    if (
      seenCanonicalTrackIds.size !==
      canonicalTrackIds.size
    ) {
      return failure(
        "unavailable",
        "Sesh project track listing is missing canonical track metadata.",
      );
    }

    if (
      asset.storageReference ===
      undefined
    ) {
      return failure(
        "unavailable",
        "Sesh private audio storage reference is unavailable.",
      );
    }

    const detachedProject = {
      ...snapshot.project,

      updatedAt:
        this.#now(),

      audioAssetIds:
        snapshot.project.audioAssetIds.filter(
          (
            candidate,
          ) =>
            candidate !==
            ids.audioAssetId,
        ),
    };

    const projectWrite =
      await this.#projects
        .updateProjectConditionally(
          detachedProject,
          snapshot.revision,
          authorization.value.seshCreatorId,
        );

    if (
      !projectWrite.ok
    ) {
      return mapPersistenceFailure(
        projectWrite.error,
        "Sesh private audio project detachment failed.",
      );
    }

    if (
      projectWrite.value.project.id !==
        ids.projectId ||
      projectWrite.value.project.ownerCreatorId !==
        authorization.value.seshCreatorId ||
      projectWrite.value.project.audioAssetIds.includes(
        ids.audioAssetId,
      )
    ) {
      return failure(
        "unavailable",
        "Sesh private audio project detachment result failed its canonical invariant.",
      );
    }

    const metadataDelete =
      await this.#audioAssets
        .deleteAudioAssetMetadata(
          ids.audioAssetId,
        );

    if (
      !metadataDelete.ok
    ) {
      return failure(
        "unavailable",
        "Sesh private audio was detached from its project but metadata cleanup failed.",
      );
    }

    const objectDelete =
      await this.#audioObjects
        .deleteObject(
          asset.storageReference,
        );

    if (
      !objectDelete.ok
    ) {
      return failure(
        "unavailable",
        "Sesh private audio metadata was deleted but binary cleanup failed.",
      );
    }

    return {
      ok:
        true,

      value: {
        id:
          ids.audioAssetId,

        deleted:
          true,
      },
    };
  }
}