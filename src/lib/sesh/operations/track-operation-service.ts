import type {
  SeshProjectOwnershipAuthorizationFailureCode,
  SeshProjectOwnershipAuthorizer,
} from "../authorization/project-ownership-authorizer";

import {
  parseSeshMusicProjectId,
  parseSeshTrackId,
  type SeshMusicProjectId,
  type SeshTrackId,
} from "../identifiers";

import type {
  SeshTrack,
} from "../model";

import {
  validateSeshMusicProject,
  validateSeshTrack,
} from "../validation";

import type {
  SeshProjectRepository,
} from "../persistence/repositories";

import type {
  SeshPersistenceError,
} from "../persistence/model";

import type {
  SeshTrackRepository,
} from "../persistence/track-repository";

export interface SeshTrackCreateInput {
  readonly name:
    string;
}

export interface SeshTrackMutableUpdate {
  readonly name?:
    SeshTrack["name"];

  readonly order?:
    SeshTrack["order"];

  readonly muted?:
    SeshTrack["muted"];

  readonly solo?:
    SeshTrack["solo"];

  readonly gain?:
    SeshTrack["gain"];
}

export type SeshTrackOperationFailureCode =
  | SeshProjectOwnershipAuthorizationFailureCode
  | "invalid-input"
  | "conflict";

export type SeshTrackOperationResult<T> =
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
          SeshTrackOperationFailureCode;

        readonly message:
          string;
      };
    };

export interface AuthorizedSeshTrackOperationService {
  createTrack(
    projectId:
      unknown,

    input:
      unknown,
  ): Promise<
    SeshTrackOperationResult<
      SeshTrack
    >
  >;

  readTrack(
    projectId:
      unknown,

    trackId:
      unknown,
  ): Promise<
    SeshTrackOperationResult<
      SeshTrack
    >
  >;

  listTracks(
    projectId:
      unknown,
  ): Promise<
    SeshTrackOperationResult<
      readonly SeshTrack[]
    >
  >;

  updateTrack(
    projectId:
      unknown,

    trackId:
      unknown,

    update:
      unknown,
  ): Promise<
    SeshTrackOperationResult<
      SeshTrack
    >
  >;
  deleteTrack(
    projectId:
      unknown,

    trackId:
      unknown,
  ): Promise<
    SeshTrackOperationResult<
      boolean
    >
  >;
}

export interface DefaultAuthorizedSeshTrackOperationServiceDependencies {
  readonly authorizer:
    SeshProjectOwnershipAuthorizer;

  readonly projects:
    Pick<
      SeshProjectRepository,
      | "getProjectSnapshot"
      | "updateProjectConditionally"
    >;

  readonly tracks:
    SeshTrackRepository;

  readonly createTrackId:
    () => SeshTrackId;

  readonly now:
    () => string;
}

const TRACK_UPDATE_KEYS =
  new Set([
    "name",
    "order",
    "muted",
    "solo",
    "gain",
  ]);

function success<T>(
  value:
    T,
): SeshTrackOperationResult<T> {
  return {
    ok:
      true,

    value,
  };
}

function failure<T>(
  code:
    SeshTrackOperationFailureCode,

  message:
    string,
): SeshTrackOperationResult<T> {
  return {
    ok:
      false,

    error: {
      code,
      message,
    },
  };
}

function mapPersistenceFailure<T>(
  error:
    SeshPersistenceError,

  fallbackMessage:
    string,
): SeshTrackOperationResult<T> {
  if (
    error.kind ===
    "not-found"
  ) {
    return failure(
      "not-found",
      "Sesh track or project was not found.",
    );
  }

  if (
    error.kind ===
    "conflict"
  ) {
    return failure(
      "conflict",
      "Sesh track or project changed before the operation could be persisted.",
    );
  }

  return failure(
    "unavailable",
    fallbackMessage,
  );
}

function canonicalProjectId(
  value:
    unknown,
): SeshTrackOperationResult<
  SeshMusicProjectId
> {
  try {
    return success(
      parseSeshMusicProjectId(
        value,
      ),
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
}

function canonicalTrackId(
  value:
    unknown,
): SeshTrackOperationResult<
  SeshTrackId
> {
  try {
    return success(
      parseSeshTrackId(
        value,
      ),
    );
  }
  catch (
    error
  ) {
    return failure(
      "invalid-input",
      error instanceof Error
        ? error.message
        : "Invalid Sesh track identifier.",
    );
  }
}

function validateCreateInput(
  value:
    unknown,
):
  | {
      readonly ok:
        true;

      readonly value:
        SeshTrackCreateInput;
    }
  | {
      readonly ok:
        false;
    } {
  if (
    typeof value !==
      "object" ||
    value ===
      null ||
    Array.isArray(
      value,
    )
  ) {
    return {
      ok:
        false,
    };
  }

  const record =
    value as Record<
      string,
      unknown
    >;

  const keys =
    Object.keys(
      record,
    );

  if (
    keys.length !==
      1 ||
    keys[0] !==
      "name" ||
    typeof record.name !==
      "string" ||
    record.name.trim().length ===
      0
  ) {
    return {
      ok:
        false,
    };
  }

  return {
    ok:
      true,

    value: {
      name:
        record.name.trim(),
    },
  };
}

function validateUpdateInput(
  value:
    unknown,
):
  | {
      readonly ok:
        true;

      readonly value:
        SeshTrackMutableUpdate;
    }
  | {
      readonly ok:
        false;
    } {
  if (
    typeof value !==
      "object" ||
    value ===
      null ||
    Array.isArray(
      value,
    )
  ) {
    return {
      ok:
        false,
    };
  }

  const record =
    value as Record<
      string,
      unknown
    >;

  const keys =
    Object.keys(
      record,
    );

  if (
    keys.length ===
      0 ||
    keys.some(
      (
        key,
      ) =>
        !TRACK_UPDATE_KEYS.has(
          key,
        ),
    )
  ) {
    return {
      ok:
        false,
    };
  }

  if (
    Object.prototype.hasOwnProperty.call(
      record,
      "name",
    ) &&
    (
      typeof record.name !==
        "string" ||
      record.name.trim().length ===
        0
    )
  ) {
    return {
      ok:
        false,
    };
  }

  if (
    Object.prototype.hasOwnProperty.call(
      record,
      "order",
    ) &&
    (
      typeof record.order !==
        "number" ||
      !Number.isInteger(
        record.order,
      ) ||
      record.order <
        0
    )
  ) {
    return {
      ok:
        false,
    };
  }

  for (
    const key
    of [
      "muted",
      "solo",
    ] as const
  ) {
    if (
      Object.prototype.hasOwnProperty.call(
        record,
        key,
      ) &&
      typeof record[key] !==
        "boolean"
    ) {
      return {
        ok:
          false,
      };
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(
      record,
      "gain",
    ) &&
    typeof record.gain !==
      "number"
  ) {
    return {
      ok:
        false,
    };
  }

  return {
    ok:
      true,

    value: {
      ...(
        Object.prototype.hasOwnProperty.call(
          record,
          "name",
        )
          ? {
              name:
                (
                  record.name as string
                ).trim(),
            }
          : {}
      ),

      ...(
        Object.prototype.hasOwnProperty.call(
          record,
          "order",
        )
          ? {
              order:
                record.order as number,
            }
          : {}
      ),

      ...(
        Object.prototype.hasOwnProperty.call(
          record,
          "muted",
        )
          ? {
              muted:
                record.muted as boolean,
            }
          : {}
      ),

      ...(
        Object.prototype.hasOwnProperty.call(
          record,
          "solo",
        )
          ? {
              solo:
                record.solo as boolean,
            }
          : {}
      ),

      ...(
        Object.prototype.hasOwnProperty.call(
          record,
          "gain",
        )
          ? {
              gain:
                record.gain as number,
            }
          : {}
      ),
    },
  };
}

export class DefaultAuthorizedSeshTrackOperationService
implements AuthorizedSeshTrackOperationService {
  readonly #authorizer:
    SeshProjectOwnershipAuthorizer;

  readonly #projects:
    Pick<
      SeshProjectRepository,
      | "getProjectSnapshot"
      | "updateProjectConditionally"
    >;

  readonly #tracks:
    SeshTrackRepository;

  readonly #createTrackId:
    () => SeshTrackId;

  readonly #now:
    () => string;

  constructor(
    dependencies:
      DefaultAuthorizedSeshTrackOperationServiceDependencies,
  ) {
    this.#authorizer =
      dependencies.authorizer;

    this.#projects =
      dependencies.projects;

    this.#tracks =
      dependencies.tracks;

    this.#createTrackId =
      dependencies.createTrackId;

    this.#now =
      dependencies.now;
  }

  async #authorizedProjectSnapshot(
    projectId:
      SeshMusicProjectId,

    action:
      "read" |
      "write",
  ) {
    let authorization;

    try {
      authorization =
        await this.#authorizer
          .authorize(
            projectId,
            action,
          );
    }
    catch {
      return failure<never>(
        "unavailable",
        "Sesh project authorization is temporarily unavailable.",
      );
    }

    if (
      !authorization.ok
    ) {
      return failure<never>(
        authorization.error.code,
        authorization.error.message,
      );
    }

    const snapshot =
      await this.#projects
        .getProjectSnapshot(
          projectId,
        );

    if (
      !snapshot.ok
    ) {
      return mapPersistenceFailure<never>(
        snapshot.error,
        "Sesh project snapshot is temporarily unavailable.",
      );
    }

    if (
      snapshot.value.project.id !==
        projectId ||
      snapshot.value.project.ownerCreatorId !==
        authorization.value.seshCreatorId
    ) {
      return failure<never>(
        "unavailable",
        "Sesh project snapshot failed its ownership invariant.",
      );
    }

    return success({
      authorization:
        authorization.value,

      snapshot:
        snapshot.value,
    });
  }

  async createTrack(
    projectIdInput:
      unknown,

    input:
      unknown,
  ): Promise<
    SeshTrackOperationResult<
      SeshTrack
    >
  > {
    const projectIdResult =
      canonicalProjectId(
        projectIdInput,
      );

    if (
      !projectIdResult.ok
    ) {
      return projectIdResult;
    }

    const inputResult =
      validateCreateInput(
        input,
      );

    if (
      !inputResult.ok
    ) {
      return failure(
        "invalid-input",
        "Sesh track creation requires exactly one non-empty name field.",
      );
    }

    const projectResult =
      await this.#authorizedProjectSnapshot(
        projectIdResult.value,
        "write",
      );

    if (
      !projectResult.ok
    ) {
      return projectResult;
    }

    let trackId:
      SeshTrackId;

    let track:
      SeshTrack;

    try {
      trackId =
        parseSeshTrackId(
          this.#createTrackId(),
        );

      if (
        projectResult.value.snapshot.project.trackIds.includes(
          trackId,
        )
      ) {
        return failure(
          "conflict",
          "Generated Sesh track identifier is already attached to the project.",
        );
      }

      track =
        validateSeshTrack({
          id:
            trackId,

          projectId:
            projectIdResult.value,

          name:
            inputResult.value.name,

          order:
            projectResult.value.snapshot.project.trackIds.length,

          audioAssetIds:
            [],
        });
    }
    catch (
      error
    ) {
      return failure(
        "unavailable",
        error instanceof Error
          ? error.message
          : "Sesh track resource creation is temporarily unavailable.",
      );
    }

    const saved =
      await this.#tracks
        .saveTrack(
          track,
        );

    if (
      !saved.ok
    ) {
      return mapPersistenceFailure(
        saved.error,
        "Sesh track creation is temporarily unavailable.",
      );
    }

    let updatedProject;

    try {
      updatedProject =
        validateSeshMusicProject({
          ...projectResult.value.snapshot.project,

          trackIds: [
            ...projectResult.value.snapshot.project.trackIds,
            trackId,
          ],

          updatedAt:
            this.#now(),
        });
    }
    catch {
      const rollback =
        await this.#tracks
          .deleteTrack(
            trackId,
          );

      if (
        !rollback.ok
      ) {
        return failure(
          "unavailable",
          "Sesh track attachment validation failed and compensation also failed.",
        );
      }

      return failure(
        "unavailable",
        "Sesh track attachment validation failed.",
      );
    }

    const projectWrite =
      await this.#projects
        .updateProjectConditionally(
          updatedProject,
          projectResult.value.snapshot.revision,
          projectResult.value.authorization.seshCreatorId,
        );

    if (
      !projectWrite.ok
    ) {
      const rollback =
        await this.#tracks
          .deleteTrack(
            trackId,
          );

      if (
        !rollback.ok
      ) {
        return failure(
          "unavailable",
          "Sesh track attachment failed and metadata compensation also failed.",
        );
      }

      return mapPersistenceFailure(
        projectWrite.error,
        "Sesh track attachment is temporarily unavailable.",
      );
    }

    if (
      projectWrite.value.project.id !==
        projectIdResult.value ||
      projectWrite.value.project.ownerCreatorId !==
        projectResult.value.authorization.seshCreatorId ||
      !projectWrite.value.project.trackIds.includes(
        trackId,
      )
    ) {
      return failure(
        "unavailable",
        "Sesh track attachment result failed its canonical invariant.",
      );
    }

    return success(
      saved.value,
    );
  }

  async readTrack(
    projectIdInput:
      unknown,

    trackIdInput:
      unknown,
  ): Promise<
    SeshTrackOperationResult<
      SeshTrack
    >
  > {
    const projectIdResult =
      canonicalProjectId(
        projectIdInput,
      );

    if (
      !projectIdResult.ok
    ) {
      return projectIdResult;
    }

    const trackIdResult =
      canonicalTrackId(
        trackIdInput,
      );

    if (
      !trackIdResult.ok
    ) {
      return trackIdResult;
    }

    const projectResult =
      await this.#authorizedProjectSnapshot(
        projectIdResult.value,
        "read",
      );

    if (
      !projectResult.ok
    ) {
      return projectResult;
    }

    if (
      !projectResult.value.snapshot.project.trackIds.includes(
        trackIdResult.value,
      )
    ) {
      return failure(
        "not-found",
        "Sesh track was not found in this project.",
      );
    }

    const track =
      await this.#tracks
        .getTrack(
          trackIdResult.value,
        );

    if (
      !track.ok
    ) {
      return mapPersistenceFailure(
        track.error,
        "Sesh track read is temporarily unavailable.",
      );
    }

    if (
      track.value.id !==
        trackIdResult.value ||
      track.value.projectId !==
        projectIdResult.value
    ) {
      return failure(
        "unavailable",
        "Sesh track failed its project membership invariant.",
      );
    }

    return success(
      track.value,
    );
  }

  async listTracks(
    projectIdInput:
      unknown,
  ): Promise<
    SeshTrackOperationResult<
      readonly SeshTrack[]
    >
  > {
    const projectIdResult =
      canonicalProjectId(
        projectIdInput,
      );

    if (
      !projectIdResult.ok
    ) {
      return projectIdResult;
    }

    const projectResult =
      await this.#authorizedProjectSnapshot(
        projectIdResult.value,
        "read",
      );

    if (
      !projectResult.ok
    ) {
      return projectResult;
    }

    const listed =
      await this.#tracks
        .listTracksForProject(
          projectIdResult.value,
        );

    if (
      !listed.ok
    ) {
      return mapPersistenceFailure(
        listed.error,
        "Sesh track collection is temporarily unavailable.",
      );
    }

    const attachedIds =
      new Set(
        projectResult.value.snapshot.project.trackIds,
      );

    const attached =
      listed.value
        .filter(
          (
            track,
          ) =>
            attachedIds.has(
              track.id,
            ),
        );

    if (
      attached.length !==
      attachedIds.size
    ) {
      return failure(
        "unavailable",
        "Sesh project track membership is inconsistent with track persistence.",
      );
    }

    for (
      const track
      of attached
    ) {
      if (
        track.projectId !==
        projectIdResult.value
      ) {
        return failure(
          "unavailable",
          "Sesh track collection failed its project invariant.",
        );
      }
    }

    return success(
      [
        ...attached,
      ].sort(
        (
          left,
          right,
        ) =>
          left.order -
            right.order ||
          left.id.localeCompare(
            right.id,
          ),
      ),
    );
  }

  async updateTrack(
    projectIdInput:
      unknown,

    trackIdInput:
      unknown,

    update:
      unknown,
  ): Promise<
    SeshTrackOperationResult<
      SeshTrack
    >
  > {
    const projectIdResult =
      canonicalProjectId(
        projectIdInput,
      );

    if (
      !projectIdResult.ok
    ) {
      return projectIdResult;
    }

    const trackIdResult =
      canonicalTrackId(
        trackIdInput,
      );

    if (
      !trackIdResult.ok
    ) {
      return trackIdResult;
    }

    const updateResult =
      validateUpdateInput(
        update,
      );

    if (
      !updateResult.ok
    ) {
      return failure(
        "invalid-input",
        "Sesh track update contains no permitted mutable fields or attempts to modify an immutable field.",
      );
    }

    const projectResult =
      await this.#authorizedProjectSnapshot(
        projectIdResult.value,
        "write",
      );

    if (
      !projectResult.ok
    ) {
      return projectResult;
    }

    if (
      !projectResult.value.snapshot.project.trackIds.includes(
        trackIdResult.value,
      )
    ) {
      return failure(
        "not-found",
        "Sesh track was not found in this project.",
      );
    }

    const snapshot =
      await this.#tracks
        .getTrackSnapshot(
          trackIdResult.value,
        );

    if (
      !snapshot.ok
    ) {
      return mapPersistenceFailure(
        snapshot.error,
        "Sesh track snapshot is temporarily unavailable.",
      );
    }

    if (
      snapshot.value.track.id !==
        trackIdResult.value ||
      snapshot.value.track.projectId !==
        projectIdResult.value
    ) {
      return failure(
        "unavailable",
        "Sesh track snapshot failed its project invariant.",
      );
    }

    let candidate:
      SeshTrack;

    try {
      candidate =
        validateSeshTrack({
          ...snapshot.value.track,
          ...updateResult.value,

          id:
            snapshot.value.track.id,

          projectId:
            snapshot.value.track.projectId,

          audioAssetIds:
            snapshot.value.track.audioAssetIds,
        });
    }
    catch (
      error
    ) {
      return failure(
        "invalid-input",
        error instanceof Error
          ? error.message
          : "Sesh track update failed canonical validation.",
      );
    }

    const written =
      await this.#tracks
        .updateTrackConditionally(
          candidate,
          snapshot.value.revision,
        );

    if (
      !written.ok
    ) {
      return mapPersistenceFailure(
        written.error,
        "Sesh track update is temporarily unavailable.",
      );
    }

    if (
      written.value.track.id !==
        trackIdResult.value ||
      written.value.track.projectId !==
        projectIdResult.value ||
      written.value.track.audioAssetIds.length !==
        snapshot.value.track.audioAssetIds.length ||
      written.value.track.audioAssetIds.some(
        (
          audioAssetId,
          index,
        ) =>
          audioAssetId !==
          snapshot.value.track.audioAssetIds[index],
      )
    ) {
      return failure(
        "unavailable",
        "Sesh track update result failed its immutable-field invariant.",
      );
    }

    return success(
      written.value.track,
    );
  }
  async deleteTrack(
    projectIdInput:
      unknown,

    trackIdInput:
      unknown,
  ): Promise<
    SeshTrackOperationResult<
      boolean
    >
  > {
    const projectIdResult =
      canonicalProjectId(
        projectIdInput,
      );

    if (
      !projectIdResult.ok
    ) {
      return projectIdResult;
    }

    const trackIdResult =
      canonicalTrackId(
        trackIdInput,
      );

    if (
      !trackIdResult.ok
    ) {
      return trackIdResult;
    }

    const projectResult =
      await this.#authorizedProjectSnapshot(
        projectIdResult.value,
        "write",
      );

    if (
      !projectResult.ok
    ) {
      return projectResult;
    }

    if (
      !projectResult.value.snapshot.project.trackIds.includes(
        trackIdResult.value,
      )
    ) {
      return failure(
        "not-found",
        "Sesh track was not found in this project.",
      );
    }

    const trackSnapshot =
      await this.#tracks
        .getTrackSnapshot(
          trackIdResult.value,
        );

    if (
      !trackSnapshot.ok
    ) {
      return mapPersistenceFailure(
        trackSnapshot.error,
        "Sesh track snapshot is temporarily unavailable.",
      );
    }

    if (
      trackSnapshot.value.track.id !==
        trackIdResult.value ||
      trackSnapshot.value.track.projectId !==
        projectIdResult.value
    ) {
      return failure(
        "unavailable",
        "Sesh track snapshot failed its project invariant before deletion.",
      );
    }

    let detachedProject;

    try {
      detachedProject =
        validateSeshMusicProject({
          ...projectResult.value.snapshot.project,

          trackIds:
            projectResult.value.snapshot.project.trackIds.filter(
              (
                trackId,
              ) =>
                trackId !==
                trackIdResult.value,
            ),

          updatedAt:
            this.#now(),
        });
    }
    catch {
      return failure(
        "unavailable",
        "Sesh track detachment validation failed.",
      );
    }

    const projectWrite =
      await this.#projects
        .updateProjectConditionally(
          detachedProject,
          projectResult.value.snapshot.revision,
          projectResult.value.authorization.seshCreatorId,
        );

    if (
      !projectWrite.ok
    ) {
      return mapPersistenceFailure(
        projectWrite.error,
        "Sesh track detachment is temporarily unavailable.",
      );
    }

    if (
      projectWrite.value.project.id !==
        projectIdResult.value ||
      projectWrite.value.project.ownerCreatorId !==
        projectResult.value.authorization.seshCreatorId ||
      projectWrite.value.project.trackIds.includes(
        trackIdResult.value,
      )
    ) {
      return failure(
        "unavailable",
        "Sesh track detachment result failed its canonical invariant.",
      );
    }

    const deleted =
      await this.#tracks
        .deleteTrackConditionally(
          trackIdResult.value,
          trackSnapshot.value.revision,
        );

    if (
      !deleted.ok
    ) {
      if (
        deleted.error.kind ===
          "conflict"
      ) {
        return failure(
          "unavailable",
          "Sesh project detached the track, but track metadata changed before deletion. Cleanup is required.",
        );
      }

      if (
        deleted.error.kind ===
          "not-found"
      ) {
        return failure(
          "unavailable",
          "Sesh project detached the track, but track metadata disappeared before deletion completed.",
        );
      }

      return failure(
        "unavailable",
        "Sesh project detached the track, but track metadata cleanup did not complete.",
      );
    }

    if (
      deleted.value !==
        true
    ) {
      return failure(
        "unavailable",
        "Sesh project detached the track, but track metadata deletion did not confirm completion.",
      );
    }

    return success(
      true,
    );
  }
}