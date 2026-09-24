import type {
  SeshMusicProjectId,
  SeshTrackId,
} from "../identifiers";

import {
  parseSeshMusicProjectId,
  parseSeshTrackId,
} from "../identifiers";

import type {
  SeshTrack,
} from "../model";

import {
  validateSeshTrack,
} from "../validation";

import type {
  SeshPersistenceResult,
} from "./model";

export interface SeshTrackPersistenceSnapshot {
  readonly track:
    SeshTrack;

  readonly revision:
    number;
}

export interface SeshTrackRepository {
  saveTrack(
    track:
      unknown,
  ): Promise<
    SeshPersistenceResult<
      SeshTrack
    >
  >;

  getTrack(
    trackId:
      SeshTrackId,
  ): Promise<
    SeshPersistenceResult<
      SeshTrack
    >
  >;

  listTracksForProject(
    projectId:
      SeshMusicProjectId,
  ): Promise<
    SeshPersistenceResult<
      readonly SeshTrack[]
    >
  >;

  getTrackSnapshot(
    trackId:
      SeshTrackId,
  ): Promise<
    SeshPersistenceResult<
      SeshTrackPersistenceSnapshot
    >
  >;

  updateTrackConditionally(
    track:
      unknown,

    expectedRevision:
      number,
  ): Promise<
    SeshPersistenceResult<
      SeshTrackPersistenceSnapshot
    >
  >;

  deleteTrack(
    trackId:
      SeshTrackId,
  ): Promise<
    SeshPersistenceResult<
      boolean
    >
  >;
}

function success<T>(
  value:
    T,
): SeshPersistenceResult<T> {
  return {
    ok:
      true,

    value,
  };
}

function failure<T>(
  kind:
    | "not-found"
    | "validation"
    | "conflict"
    | "storage",

  message:
    string,
): SeshPersistenceResult<T> {
  return {
    ok:
      false,

    error: {
      kind,
      message,
    },
  };
}

function cloneTrack(
  track:
    SeshTrack,
): SeshTrack {
  return validateSeshTrack(
    structuredClone(
      track,
    ),
  );
}

function validateRevision(
  value:
    number,
): number {
  if (
    !Number.isInteger(
      value,
    ) ||
    value <
      0
  ) {
    throw new TypeError(
      "Expected Sesh track revision must be a non-negative integer.",
    );
  }

  return value;
}

export class InMemorySeshTrackRepository
implements SeshTrackRepository {
  readonly #tracks =
    new Map<
      SeshTrackId,
      SeshTrack
    >();

  readonly #revisions =
    new Map<
      SeshTrackId,
      number
    >();

  async saveTrack(
    track:
      unknown,
  ): Promise<
    SeshPersistenceResult<
      SeshTrack
    >
  > {
    let validated:
      SeshTrack;

    try {
      validated =
        validateSeshTrack(
          track,
        );
    }
    catch (
      error
    ) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "Sesh track validation failed.",
      );
    }

    if (
      this.#tracks.has(
        validated.id,
      )
    ) {
      return failure(
        "conflict",
        `Sesh track already exists: ${validated.id}`,
      );
    }

    const stored =
      cloneTrack(
        validated,
      );

    this.#tracks.set(
      stored.id,
      stored,
    );

    this.#revisions.set(
      stored.id,
      0,
    );

    return success(
      cloneTrack(
        stored,
      ),
    );
  }

  async getTrack(
    trackId:
      SeshTrackId,
  ): Promise<
    SeshPersistenceResult<
      SeshTrack
    >
  > {
    let canonicalId:
      SeshTrackId;

    try {
      canonicalId =
        parseSeshTrackId(
          trackId,
        );
    }
    catch (
      error
    ) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "Sesh track identifier validation failed.",
      );
    }

    const stored =
      this.#tracks.get(
        canonicalId,
      );

    if (
      stored ===
      undefined
    ) {
      return failure(
        "not-found",
        `Sesh track not found: ${canonicalId}`,
      );
    }

    return success(
      cloneTrack(
        stored,
      ),
    );
  }

  async listTracksForProject(
    projectId:
      SeshMusicProjectId,
  ): Promise<
    SeshPersistenceResult<
      readonly SeshTrack[]
    >
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
        "validation",
        error instanceof Error
          ? error.message
          : "Sesh project identifier validation failed.",
      );
    }

    const tracks =
      Array.from(
        this.#tracks.values(),
      )
        .filter(
          (
            track,
          ) =>
            track.projectId ===
            canonicalProjectId,
        )
        .sort(
          (
            left,
            right,
          ) =>
            left.order -
              right.order ||
            left.id.localeCompare(
              right.id,
            ),
        )
        .map(
          cloneTrack,
        );

    return success(
      tracks,
    );
  }

  async getTrackSnapshot(
    trackId:
      SeshTrackId,
  ): Promise<
    SeshPersistenceResult<
      SeshTrackPersistenceSnapshot
    >
  > {
    const track =
      await this.getTrack(
        trackId,
      );

    if (
      !track.ok
    ) {
      return track;
    }

    const revision =
      this.#revisions.get(
        track.value.id,
      );

    if (
      revision ===
      undefined
    ) {
      return failure(
        "storage",
        "Sesh track revision metadata is unavailable.",
      );
    }

    return success({
      track:
        cloneTrack(
          track.value,
        ),

      revision,
    });
  }

  async updateTrackConditionally(
    track:
      unknown,

    expectedRevision:
      number,
  ): Promise<
    SeshPersistenceResult<
      SeshTrackPersistenceSnapshot
    >
  > {
    let validated:
      SeshTrack;

    let revision:
      number;

    try {
      validated =
        validateSeshTrack(
          track,
        );

      revision =
        validateRevision(
          expectedRevision,
        );
    }
    catch (
      error
    ) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "Sesh conditional track update validation failed.",
      );
    }

    const current =
      await this.getTrackSnapshot(
        validated.id,
      );

    if (
      !current.ok
    ) {
      return current;
    }

    if (
      current.value.revision !==
      revision
    ) {
      return failure(
        "conflict",
        "Sesh track changed before conditional update.",
      );
    }

    if (
      current.value.track.id !==
        validated.id ||
      current.value.track.projectId !==
        validated.projectId
    ) {
      return failure(
        "conflict",
        "Ordinary Sesh track updates cannot reassign id or projectId.",
      );
    }

    const nextRevision =
      revision +
      1;

    const stored =
      cloneTrack(
        validated,
      );

    this.#tracks.set(
      stored.id,
      stored,
    );

    this.#revisions.set(
      stored.id,
      nextRevision,
    );

    return success({
      track:
        cloneTrack(
          stored,
        ),

      revision:
        nextRevision,
    });
  }

  async deleteTrack(
    trackId:
      SeshTrackId,
  ): Promise<
    SeshPersistenceResult<
      boolean
    >
  > {
    let canonicalId:
      SeshTrackId;

    try {
      canonicalId =
        parseSeshTrackId(
          trackId,
        );
    }
    catch (
      error
    ) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "Sesh track identifier validation failed.",
      );
    }

    const deleted =
      this.#tracks.delete(
        canonicalId,
      );

    this.#revisions.delete(
      canonicalId,
    );

    return success(
      deleted,
    );
  }
}