import {
  parseSeshMusicProjectId,
  parseSeshTrackId,
} from "../identifiers";

import type {
  SeshMusicProjectId,
  SeshTrackId,
} from "../identifiers";

import type {
  SeshTrack,
} from "../model";

import type {
  SeshProjectOwnershipAuthorizer,
} from "../authorization/project-ownership-authorizer";

import type {
  SeshProjectRepository,
} from "../persistence/repositories";

import type {
  SeshTrackRepository,
} from "../persistence/track-repository";

export type SeshTrackReorderFailureCode =
  | "invalid-input"
  | "unauthenticated"
  | "unmapped"
  | "forbidden"
  | "not-found"
  | "conflict"
  | "unavailable";

export type SeshTrackReorderResult =
  | {
      readonly ok:
        true;

      readonly value: {
        readonly tracks:
          readonly SeshTrack[];
      };
    }
  | {
      readonly ok:
        false;

      readonly error: {
        readonly code:
          SeshTrackReorderFailureCode;

        readonly message:
          string;
      };
    };

export interface SeshTrackReorderInput {
  readonly orderedTrackIds:
    readonly unknown[];
}

export interface AuthorizedSeshTrackReorderOperationService {
  reorderTracks(
    projectId:
      unknown,

    input:
      unknown,
  ): Promise<
    SeshTrackReorderResult
  >;
}

export interface SeshTrackReorderPersistence {
  reorderProjectTracksAtomically(
    projectId:
      SeshMusicProjectId,

    tracks:
      readonly {
        readonly id:
          SeshTrackId;

        readonly expectedRevision:
          number;

        readonly order:
          number;
      }[],
  ): Promise<
    | {
        readonly ok:
          true;

        readonly value:
          readonly SeshTrack[];
      }
    | {
        readonly ok:
          false;

        readonly error: {
          readonly kind:
            | "validation"
            | "not-found"
            | "conflict"
            | "version"
            | "storage";

          readonly message:
            string;
        };
      }
  >;
}

export interface DefaultAuthorizedSeshTrackReorderOperationServiceDependencies {
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
      | "listTracksForProject"
      | "getTrackSnapshot"
    >;

  readonly reorderPersistence:
    SeshTrackReorderPersistence;
}

function failure(
  code:
    SeshTrackReorderFailureCode,

  message:
    string,
): SeshTrackReorderResult {
  return {
    ok:
      false,

    error: {
      code,
      message,
    },
  };
}

function validateInput(
  input:
    unknown,
):
  | {
      readonly orderedTrackIds:
        readonly SeshTrackId[];
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
    input as Record<
      string,
      unknown
    >;

  if (
    Object.keys(
      record,
    ).length !==
      1 ||
    !Object.prototype.hasOwnProperty.call(
      record,
      "orderedTrackIds",
    ) ||
    !Array.isArray(
      record.orderedTrackIds,
    )
  ) {
    return null;
  }

  const ids:
    SeshTrackId[] =
      [];

  const seen =
    new Set<string>();

  try {
    for (
      const candidate of
      record.orderedTrackIds
    ) {
      const id =
        parseSeshTrackId(
          candidate,
        );

      if (
        seen.has(
          id,
        )
      ) {
        return null;
      }

      seen.add(
        id,
      );

      ids.push(
        id,
      );
    }
  }
  catch {
    return null;
  }

  return {
    orderedTrackIds:
      ids,
  };
}

function mapAuthorizationFailure(
  result:
    Awaited<
      ReturnType<
        SeshProjectOwnershipAuthorizer["authorize"]
      >
    >,
): SeshTrackReorderResult | null {
  if (result.ok) {
    return null;
  }

  return failure(
    result.error.code,
    result.error.message,
  );
}

function mapPersistenceFailure(
  error: {
    readonly kind:
      | "validation"
      | "not-found"
      | "conflict"
      | "version"
      | "storage";

    readonly message:
      string;
  },

  fallback:
    string,
): SeshTrackReorderResult {
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

export class DefaultAuthorizedSeshTrackReorderOperationService
implements AuthorizedSeshTrackReorderOperationService {
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
      | "listTracksForProject"
      | "getTrackSnapshot"
    >;

  readonly #reorderPersistence:
    SeshTrackReorderPersistence;

  constructor(
    dependencies:
      DefaultAuthorizedSeshTrackReorderOperationServiceDependencies,
  ) {
    this.#authorizer =
      dependencies.authorizer;

    this.#projects =
      dependencies.projects;

    this.#tracks =
      dependencies.tracks;

    this.#reorderPersistence =
      dependencies.reorderPersistence;
  }

  async reorderTracks(
    projectId:
      unknown,

    input:
      unknown,
  ): Promise<
    SeshTrackReorderResult
  > {
    let canonicalProjectId:
      SeshMusicProjectId;

    try {
      canonicalProjectId =
        parseSeshMusicProjectId(
          projectId,
        );
    }
    catch (
      error
    ) {
      return failure(
        "invalid-input",
        error instanceof Error
          ? error.message
          : "Sesh project identifier is invalid.",
      );
    }

    const validated =
      validateInput(
        input,
      );

    if (!validated) {
      return failure(
        "invalid-input",
        "Sesh track reorder input must contain only one unique orderedTrackIds array.",
      );
    }

    const authorization =
      await this.#authorizer
        .authorize(
          canonicalProjectId,
          "write",
        );

    const authorizationFailure =
      mapAuthorizationFailure(
        authorization,
      );

    if (authorizationFailure) {
      return authorizationFailure;
    }

    if (!authorization.ok) {
      return failure(
        "unavailable",
        "Sesh track reorder authorization is unavailable.",
      );
    }

    const projectSnapshot =
      await this.#projects
        .getProjectSnapshot(
          canonicalProjectId,
        );

    if (!projectSnapshot.ok) {
      return mapPersistenceFailure(
        projectSnapshot.error,
        "Sesh project snapshot is unavailable for track reorder.",
      );
    }

    if (
      projectSnapshot.value.project.id !==
        canonicalProjectId ||
      projectSnapshot.value.project.ownerCreatorId !==
        authorization.value.seshCreatorId
    ) {
      return failure(
        "unavailable",
        "Sesh project reorder authorization disagrees with canonical project state.",
      );
    }

    const canonicalTrackIds =
      projectSnapshot.value.project.trackIds;

    if (
      validated.orderedTrackIds.length !==
      canonicalTrackIds.length
    ) {
      return failure(
        "invalid-input",
        "Sesh track reorder must contain every canonical project track exactly once.",
      );
    }

    const canonicalSet =
      new Set(
        canonicalTrackIds,
      );

    if (
      validated.orderedTrackIds.some(
        (
          trackId,
        ) =>
          !canonicalSet.has(
            trackId,
          ),
      )
    ) {
      return failure(
        "invalid-input",
        "Sesh track reorder contains a track outside canonical project membership.",
      );
    }

    const listed =
      await this.#tracks
        .listTracksForProject(
          canonicalProjectId,
        );

    if (!listed.ok) {
      return mapPersistenceFailure(
        listed.error,
        "Sesh canonical track listing is unavailable for reorder.",
      );
    }

    const listedById =
      new Map<
        SeshTrackId,
        SeshTrack
      >();

    for (
      const track of
      listed.value
    ) {
      if (
        track.projectId !==
          canonicalProjectId ||
        !canonicalSet.has(
          track.id,
        ) ||
        listedById.has(
          track.id,
        )
      ) {
        return failure(
          "unavailable",
          "Sesh canonical track listing failed its project membership invariant.",
        );
      }

      listedById.set(
        track.id,
        track,
      );
    }

    if (
      listedById.size !==
      canonicalSet.size
    ) {
      return failure(
        "unavailable",
        "Sesh canonical track listing is incomplete for reorder.",
      );
    }

    const writes:
      {
        readonly id:
          SeshTrackId;

        readonly expectedRevision:
          number;

        readonly order:
          number;
      }[] =
      [];

    for (
      let order = 0;
      order <
        validated.orderedTrackIds.length;
      order++
    ) {
      const trackId =
        validated.orderedTrackIds[
          order
        ];

      const snapshot =
        await this.#tracks
          .getTrackSnapshot(
            trackId,
          );

      if (!snapshot.ok) {
        return mapPersistenceFailure(
          snapshot.error,
          "Sesh track snapshot is unavailable for reorder.",
        );
      }

      if (
        snapshot.value.track.id !==
          trackId ||
        snapshot.value.track.projectId !==
          canonicalProjectId
      ) {
        return failure(
          "unavailable",
          "Sesh track reorder snapshot failed its canonical identity invariant.",
        );
      }

      writes.push({
        id:
          trackId,

        expectedRevision:
          snapshot.value.revision,

        order,
      });
    }

    const reordered =
      await this.#reorderPersistence
        .reorderProjectTracksAtomically(
          canonicalProjectId,
          writes,
        );

    if (!reordered.ok) {
      return mapPersistenceFailure(
        reordered.error,
        "Sesh canonical track reorder failed.",
      );
    }

    if (
      reordered.value.length !==
      validated.orderedTrackIds.length
    ) {
      return failure(
        "unavailable",
        "Sesh canonical track reorder result has an unexpected size.",
      );
    }

    for (
      let order = 0;
      order <
        reordered.value.length;
      order++
    ) {
      const track =
        reordered.value[
          order
        ];

      if (
        track.id !==
          validated.orderedTrackIds[
            order
          ] ||
        track.projectId !==
          canonicalProjectId ||
        track.order !==
          order
      ) {
        return failure(
          "unavailable",
          "Sesh canonical track reorder result failed its ordering invariant.",
        );
      }

      const before =
        listedById.get(
          track.id,
        );

      if (
        !before ||
        track.name !==
          before.name ||
        track.muted !==
          before.muted ||
        track.solo !==
          before.solo ||
        track.gain !==
          before.gain ||
        JSON.stringify(
          track.audioAssetIds,
        ) !==
          JSON.stringify(
            before.audioAssetIds,
          )
      ) {
        return failure(
          "unavailable",
          "Sesh canonical track reorder changed non-order track state.",
        );
      }
    }

    return {
      ok:
        true,

      value: {
        tracks:
          reordered.value,
      },
    };
  }
}