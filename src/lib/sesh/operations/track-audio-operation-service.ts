import {
  parseSeshAudioAssetId,
  parseSeshMusicProjectId,
  parseSeshTrackId,
} from "../identifiers";

import type {
  SeshAudioAssetId,
  SeshMusicProjectId,
  SeshTrackId,
} from "../identifiers";

import type {
  SeshTrack,
} from "../model";

import type {
  SeshProjectOwnershipAuthorizer,
  SeshProjectOwnershipAuthorizationFailureCode,
} from "../authorization/project-ownership-authorizer";

import type {
  SeshAudioAssetRepository,
  SeshProjectRepository,
} from "../persistence/repositories";

import type {
  SeshPersistenceError,
} from "../persistence/model";

import type {
  SeshTrackRepository,
} from "../persistence/track-repository";

export type SeshTrackAudioOperationFailureCode =
  | SeshProjectOwnershipAuthorizationFailureCode
  | "invalid-input"
  | "not-found"
  | "conflict"
  | "unavailable";

export type SeshTrackAudioOperationResult =
  | {
      readonly ok:
        true;

      readonly value:
        SeshTrack;
    }
  | {
      readonly ok:
        false;

      readonly error: {
        readonly code:
          SeshTrackAudioOperationFailureCode;

        readonly message:
          string;
      };
    };

export interface AuthorizedSeshTrackAudioOperationService {
  attachAudioAsset(
    projectId:
      unknown,

    trackId:
      unknown,

    audioAssetId:
      unknown,
  ): Promise<SeshTrackAudioOperationResult>;

  detachAudioAsset(
    projectId:
      unknown,

    trackId:
      unknown,

    audioAssetId:
      unknown,
  ): Promise<SeshTrackAudioOperationResult>;
}

export interface DefaultAuthorizedSeshTrackAudioOperationServiceDependencies {
  readonly authorizer:
    SeshProjectOwnershipAuthorizer;

  readonly projects:
    Pick<
      SeshProjectRepository,
      "getProjectSnapshot"
    >;

  readonly tracks:
    Pick<
      SeshTrackRepository,
      | "getTrackSnapshot"
      | "updateTrackConditionally"
    >;

  readonly audioAssets:
    Pick<
      SeshAudioAssetRepository,
      "getAudioAsset"
    >;
}

interface ParsedIds {
  readonly projectId:
    SeshMusicProjectId;

  readonly trackId:
    SeshTrackId;

  readonly audioAssetId:
    SeshAudioAssetId;
}

function failure(
  code:
    SeshTrackAudioOperationFailureCode,

  message:
    string,
): SeshTrackAudioOperationResult {
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
): SeshTrackAudioOperationResult {
  switch (
    error.kind
  ) {
    case "not-found":
      return failure(
        "not-found",
        fallback,
      );

    case "conflict":
      return failure(
        "conflict",
        fallback,
      );

    case "validation":
    case "version":
    case "storage":
    default:
      return failure(
        "unavailable",
        fallback,
      );
  }
}

function parseIds(
  projectIdInput:
    unknown,

  trackIdInput:
    unknown,

  audioAssetIdInput:
    unknown,
): ParsedIds | null {
  try {
    return {
      projectId:
        parseSeshMusicProjectId(
          projectIdInput,
        ),

      trackId:
        parseSeshTrackId(
          trackIdInput,
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

export class DefaultAuthorizedSeshTrackAudioOperationService
implements AuthorizedSeshTrackAudioOperationService {
  readonly #authorizer:
    SeshProjectOwnershipAuthorizer;

  readonly #projects:
    Pick<
      SeshProjectRepository,
      "getProjectSnapshot"
    >;

  readonly #tracks:
    Pick<
      SeshTrackRepository,
      | "getTrackSnapshot"
      | "updateTrackConditionally"
    >;

  readonly #audioAssets:
    Pick<
      SeshAudioAssetRepository,
      "getAudioAsset"
    >;

  constructor(
    dependencies:
      DefaultAuthorizedSeshTrackAudioOperationServiceDependencies,
  ) {
    this.#authorizer =
      dependencies.authorizer;

    this.#projects =
      dependencies.projects;

    this.#tracks =
      dependencies.tracks;

    this.#audioAssets =
      dependencies.audioAssets;
  }

  async #authorizedProject(
    ids:
      ParsedIds,
  ): Promise<
    | {
        readonly ok:
          true;

        readonly project:
          Awaited<
            ReturnType<
              SeshProjectRepository["getProjectSnapshot"]
            >
          > extends {
            readonly ok:
              true;

            readonly value:
              infer TValue;
          }
            ? TValue
            : never;
      }
    | {
        readonly ok:
          false;

        readonly result:
          SeshTrackAudioOperationResult;
      }
  > {
    const authorization =
      await this.#authorizer
        .authorize(
          ids.projectId,
          "write",
        );

    if (
      !authorization.ok
    ) {
      return {
        ok:
          false,

        result:
          failure(
            authorization.error.code,
            authorization.error.message,
          ),
      };
    }

    const projectResult =
      await this.#projects
        .getProjectSnapshot(
          ids.projectId,
        );

    if (
      !projectResult.ok
    ) {
      return {
        ok:
          false,

        result:
          mapPersistenceFailure(
            projectResult.error,
            "Sesh project snapshot is unavailable.",
          ),
      };
    }

    if (
      projectResult.value.project.id !==
        ids.projectId ||
      projectResult.value.project.ownerCreatorId !==
        authorization.value.seshCreatorId
    ) {
      return {
        ok:
          false,

        result:
          failure(
            "unavailable",
            "Sesh project snapshot failed its authorization invariant.",
          ),
      };
    }

    if (
      !projectResult.value.project.trackIds.includes(
        ids.trackId,
      )
    ) {
      return {
        ok:
          false,

        result:
          failure(
            "not-found",
            "Sesh track is not attached to this project.",
          ),
      };
    }

    return {
      ok:
        true,

      project:
        projectResult.value,
    };
  }

  async attachAudioAsset(
    projectIdInput:
      unknown,

    trackIdInput:
      unknown,

    audioAssetIdInput:
      unknown,
  ): Promise<SeshTrackAudioOperationResult> {
    const ids =
      parseIds(
        projectIdInput,
        trackIdInput,
        audioAssetIdInput,
      );

    if (
      ids ===
      null
    ) {
      return failure(
        "invalid-input",
        "Invalid Sesh track audio attachment resource identifier.",
      );
    }

    const projectResult =
      await this.#authorizedProject(
        ids,
      );

    if (
      !projectResult.ok
    ) {
      return projectResult.result;
    }

    if (
      !projectResult.project.project.audioAssetIds.includes(
        ids.audioAssetId,
      )
    ) {
      return failure(
        "not-found",
        "Sesh private audio is not attached to this project.",
      );
    }

    const audioResult =
      await this.#audioAssets
        .getAudioAsset(
          ids.audioAssetId,
        );

    if (
      !audioResult.ok
    ) {
      return mapPersistenceFailure(
        audioResult.error,
        audioResult.error.kind ===
          "not-found"
          ? "Sesh private audio was not found."
          : "Sesh private audio metadata is unavailable.",
      );
    }

    if (
      audioResult.value.id !==
        ids.audioAssetId ||
      audioResult.value.projectId !==
        ids.projectId
    ) {
      return failure(
        "unavailable",
        "Sesh private audio metadata failed its project identity invariant.",
      );
    }

    const trackResult =
      await this.#tracks
        .getTrackSnapshot(
          ids.trackId,
        );

    if (
      !trackResult.ok
    ) {
      return mapPersistenceFailure(
        trackResult.error,
        "Sesh track snapshot is unavailable.",
      );
    }

    const snapshot =
      trackResult.value;

    if (
      snapshot.track.id !==
        ids.trackId ||
      snapshot.track.projectId !==
        ids.projectId
    ) {
      return failure(
        "unavailable",
        "Sesh track snapshot failed its project identity invariant.",
      );
    }

    if (
      snapshot.track.audioAssetIds.includes(
        ids.audioAssetId,
      )
    ) {
      return {
        ok:
          true,

        value:
          snapshot.track,
      };
    }

    const updatedTrack = {
      ...snapshot.track,

      audioAssetIds: [
        ...snapshot.track.audioAssetIds,
        ids.audioAssetId,
      ],
    };

    const written =
      await this.#tracks
        .updateTrackConditionally(
          updatedTrack,
          snapshot.revision,
        );

    if (
      !written.ok
    ) {
      return mapPersistenceFailure(
        written.error,
        written.error.kind ===
          "conflict"
          ? "Sesh track audio attachment conflicted with a concurrent update."
          : "Sesh track audio attachment failed.",
      );
    }

    if (
      written.value.track.id !==
        ids.trackId ||
      written.value.track.projectId !==
        ids.projectId ||
      !written.value.track.audioAssetIds.includes(
        ids.audioAssetId,
      )
    ) {
      return failure(
        "unavailable",
        "Sesh track audio attachment result failed its canonical invariant.",
      );
    }

    return {
      ok:
        true,

      value:
        written.value.track,
    };
  }

  async detachAudioAsset(
    projectIdInput:
      unknown,

    trackIdInput:
      unknown,

    audioAssetIdInput:
      unknown,
  ): Promise<SeshTrackAudioOperationResult> {
    const ids =
      parseIds(
        projectIdInput,
        trackIdInput,
        audioAssetIdInput,
      );

    if (
      ids ===
      null
    ) {
      return failure(
        "invalid-input",
        "Invalid Sesh track audio detachment resource identifier.",
      );
    }

    const projectResult =
      await this.#authorizedProject(
        ids,
      );

    if (
      !projectResult.ok
    ) {
      return projectResult.result;
    }

    const trackResult =
      await this.#tracks
        .getTrackSnapshot(
          ids.trackId,
        );

    if (
      !trackResult.ok
    ) {
      return mapPersistenceFailure(
        trackResult.error,
        "Sesh track snapshot is unavailable.",
      );
    }

    const snapshot =
      trackResult.value;

    if (
      snapshot.track.id !==
        ids.trackId ||
      snapshot.track.projectId !==
        ids.projectId
    ) {
      return failure(
        "unavailable",
        "Sesh track snapshot failed its project identity invariant.",
      );
    }

    if (
      !snapshot.track.audioAssetIds.includes(
        ids.audioAssetId,
      )
    ) {
      return {
        ok:
          true,

        value:
          snapshot.track,
      };
    }

    const updatedTrack = {
      ...snapshot.track,

      audioAssetIds:
        snapshot.track.audioAssetIds.filter(
          (
            candidate,
          ) =>
            candidate !==
            ids.audioAssetId,
        ),
    };

    const written =
      await this.#tracks
        .updateTrackConditionally(
          updatedTrack,
          snapshot.revision,
        );

    if (
      !written.ok
    ) {
      return mapPersistenceFailure(
        written.error,
        written.error.kind ===
          "conflict"
          ? "Sesh track audio detachment conflicted with a concurrent update."
          : "Sesh track audio detachment failed.",
      );
    }

    if (
      written.value.track.id !==
        ids.trackId ||
      written.value.track.projectId !==
        ids.projectId ||
      written.value.track.audioAssetIds.includes(
        ids.audioAssetId,
      )
    ) {
      return failure(
        "unavailable",
        "Sesh track audio detachment result failed its canonical invariant.",
      );
    }

    return {
      ok:
        true,

      value:
        written.value.track,
    };
  }
}