import {
  parseSeshMusicProjectId,
  parseSeshTrackId,
  type SeshMusicProjectId,
  type SeshTrackId,
} from "../../identifiers";

import type {
  SeshTrack,
} from "../../model";

import {
  validateSeshTrack,
} from "../../validation";

import type {
  SeshPersistenceResult,
} from "../model";

import type {
  SeshTrackPersistenceSnapshot,
  SeshTrackRepository,
} from "../track-repository";

import {
  createSeshTrackEnvelope,
  deserializeSeshPersistenceEnvelope,
  serializeSeshPersistenceEnvelope,
} from "../serialization";

import type {
  SeshD1DatabaseLike,
  SeshD1RunResultLike,
} from "./types";

interface TrackRow {
  readonly track_id:
    string;

  readonly project_id:
    string;

  readonly schema_version:
    number;

  readonly revision:
    number | null;

  readonly stored_at:
    string;

  readonly payload_json:
    string;
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
    | "version"
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

function changedExactlyOne(
  result:
    SeshD1RunResultLike,
): boolean {
  return (
    result.success !==
      false &&
    result.meta?.changes ===
      1
  );
}

function canonicalRevision(
  rowRevision:
    number | null,

  envelopeRevision:
    number | undefined,
): number {
  const row =
    rowRevision ===
    null
      ? 0
      : rowRevision;

  const envelope =
    envelopeRevision ===
    undefined
      ? 0
      : envelopeRevision;

  if (
    !Number.isInteger(
      row,
    ) ||
    row <
      0 ||
    !Number.isInteger(
      envelope,
    ) ||
    envelope <
      0 ||
    row !==
      envelope
  ) {
    throw new TypeError(
      "Stored Sesh track revision metadata does not agree.",
    );
  }

  return row;
}

function rowFailure<T>(
  error:
    unknown,
): SeshPersistenceResult<T> {
  const message =
    error instanceof Error
      ? error.message
      : "Unknown Sesh D1 track persistence failure.";

  if (
    message.includes(
      "Unsupported Sesh persistence schema version",
    )
  ) {
    return failure(
      "version",
      message,
    );
  }

  return failure(
    "validation",
    message,
  );
}

function decodeRow(
  row:
    TrackRow,
): SeshPersistenceResult<
  SeshTrackPersistenceSnapshot
> {
  try {
    const envelope =
      deserializeSeshPersistenceEnvelope(
        row.payload_json,
      );

    if (
      envelope.recordType !==
      "track"
    ) {
      return failure(
        "validation",
        "Stored Sesh track row contains the wrong record type.",
      );
    }

    if (
      row.track_id !==
        envelope.recordId ||
      row.track_id !==
        envelope.payload.id ||
      row.project_id !==
        envelope.payload.projectId
    ) {
      return failure(
        "validation",
        "Stored Sesh track identifiers do not agree.",
      );
    }

    const revision =
      canonicalRevision(
        row.revision,
        envelope.revision,
      );

    if (
      row.stored_at !==
      envelope.storedAt
    ) {
      return failure(
        "validation",
        "Stored Sesh track timestamp metadata does not agree.",
      );
    }

    if (
      row.schema_version !==
      envelope.schemaVersion
    ) {
      return failure(
        "validation",
        "Stored Sesh track schema metadata does not agree.",
      );
    }

    return success({
      track:
        envelope.payload,

      revision,
    });
  }
  catch (
    error
  ) {
    return rowFailure(
      error,
    );
  }
}

function validateExpectedRevision(
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

export class D1SeshTrackRepository
implements SeshTrackRepository {
  constructor(
    private readonly database:
      SeshD1DatabaseLike,
  ) {}

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

    const storedAt =
      new Date().toISOString();

    const envelope =
      createSeshTrackEnvelope(
        validated,
        storedAt,
        0,
      );

    const payloadJson =
      serializeSeshPersistenceEnvelope(
        envelope,
      );

    try {
      const result =
        await this.database
          .prepare(
            `INSERT INTO sesh_tracks (
              track_id,
              project_id,
              schema_version,
              revision,
              stored_at,
              payload_json
            ) VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(track_id) DO NOTHING`,
          )
          .bind(
            validated.id,
            validated.projectId,
            envelope.schemaVersion,
            0,
            storedAt,
            payloadJson,
          )
          .run();

      if (
        !changedExactlyOne(
          result,
        )
      ) {
        return failure(
          "conflict",
          `Sesh track already exists: ${validated.id}`,
        );
      }

      return success(
        validated,
      );
    }
    catch (
      error
    ) {
      return failure(
        "storage",
        error instanceof Error
          ? error.message
          : "Sesh D1 track write failed.",
      );
    }
  }

  async getTrack(
    trackId:
      SeshTrackId,
  ): Promise<
    SeshPersistenceResult<
      SeshTrack
    >
  > {
    const snapshot =
      await this.getTrackSnapshot(
        trackId,
      );

    if (
      !snapshot.ok
    ) {
      return snapshot;
    }

    return success(
      snapshot.value.track,
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

    let rows:
      readonly TrackRow[];

    try {
      const result =
        await this.database
          .prepare(
            `SELECT
              track_id,
              project_id,
              schema_version,
              revision,
              stored_at,
              payload_json
            FROM sesh_tracks
            WHERE project_id = ?
            ORDER BY track_id`,
          )
          .bind(
            canonicalProjectId,
          )
          .all<TrackRow>();

      rows =
        result.results;
    }
    catch (
      error
    ) {
      return failure(
        "storage",
        error instanceof Error
          ? error.message
          : "Sesh D1 track listing failed.",
      );
    }

    const tracks:
      SeshTrack[] =
        [];

    for (
      const row
      of rows
    ) {
      if (
        row.project_id !==
        canonicalProjectId
      ) {
        return failure(
          "validation",
          "Stored Sesh track row project identifier does not match query scope.",
        );
      }

      const decoded =
        decodeRow(
          row,
        );

      if (
        !decoded.ok
      ) {
        return decoded;
      }

      tracks.push(
        decoded.value.track,
      );
    }

    tracks.sort(
      (
        left,
        right,
      ) =>
        left.order -
          right.order ||
        left.id.localeCompare(
          right.id,
        ),
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

    let row:
      TrackRow | null;

    try {
      row =
        await this.database
          .prepare(
            `SELECT
              track_id,
              project_id,
              schema_version,
              revision,
              stored_at,
              payload_json
            FROM sesh_tracks
            WHERE track_id = ?`,
          )
          .bind(
            canonicalId,
          )
          .first<TrackRow>();
    }
    catch (
      error
    ) {
      return failure(
        "storage",
        error instanceof Error
          ? error.message
          : "Sesh D1 track read failed.",
      );
    }

    if (
      row ===
      null
    ) {
      return failure(
        "not-found",
        `Sesh track not found: ${canonicalId}`,
      );
    }

    if (
      row.track_id !==
      canonicalId
    ) {
      return failure(
        "validation",
        "Stored Sesh track row identifier does not match the requested identifier.",
      );
    }

    return decodeRow(
      row,
    );
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
        validateExpectedRevision(
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

    const storedAt =
      new Date().toISOString();

    const envelope =
      createSeshTrackEnvelope(
        validated,
        storedAt,
        nextRevision,
      );

    const payloadJson =
      serializeSeshPersistenceEnvelope(
        envelope,
      );

    try {
      const result =
        await this.database
          .prepare(
            `UPDATE sesh_tracks
            SET
              schema_version = ?,
              revision = ?,
              stored_at = ?,
              payload_json = ?
            WHERE
              track_id = ?
              AND project_id = ?
              AND (
                revision = ?
                OR (
                  revision IS NULL
                  AND ? = 0
                )
              )`,
          )
          .bind(
            envelope.schemaVersion,
            nextRevision,
            storedAt,
            payloadJson,
            validated.id,
            validated.projectId,
            revision,
            revision,
          )
          .run();

      if (
        !changedExactlyOne(
          result,
        )
      ) {
        return failure(
          "conflict",
          "Sesh track changed before conditional update.",
        );
      }

      return success({
        track:
          validated,

        revision:
          nextRevision,
      });
    }
    catch (
      error
    ) {
      return failure(
        "storage",
        error instanceof Error
          ? error.message
          : "Sesh D1 conditional track update failed.",
      );
    }
  }

  async deleteTrackConditionally(
    trackId:
      SeshTrackId,

    expectedRevision:
      number,
  ): Promise<
    SeshPersistenceResult<
      boolean
    >
  > {
    let canonicalId:
      SeshTrackId;

    let revision:
      number;

    try {
      canonicalId =
        parseSeshTrackId(
          trackId,
        );

      revision =
        validateExpectedRevision(
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
          : "Sesh conditional track deletion validation failed.",
      );
    }

    const current =
      await this.getTrackSnapshot(
        canonicalId,
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
        "Sesh track changed before conditional deletion.",
      );
    }

    try {
      const result =
        await this.database
          .prepare(
            `DELETE FROM sesh_tracks
            WHERE
              track_id = ?
              AND (
                revision = ?
                OR (
                  revision IS NULL
                  AND ? = 0
                )
              )`,
          )
          .bind(
            canonicalId,
            revision,
            revision,
          )
          .run();

      if (
        !changedExactlyOne(
          result,
        )
      ) {
        return failure(
          "conflict",
          "Sesh track changed before conditional deletion.",
        );
      }

      return success(
        true,
      );
    }
    catch (
      error
    ) {
      return failure(
        "storage",
        error instanceof Error
          ? error.message
          : "Sesh D1 conditional track deletion failed.",
      );
    }
  }

  async deleteTrack(
    trackId:
      SeshTrackId,
  ): Promise<
    SeshPersistenceResult<
      boolean
    >
  > {
    const snapshot =
      await this.getTrackSnapshot(
        trackId,
      );

    if (
      !snapshot.ok
    ) {
      if (
        snapshot.error.kind ===
        "not-found"
      ) {
        return success(
          false,
        );
      }

      return snapshot;
    }

    return this.deleteTrackConditionally(
      trackId,
      snapshot.value.revision,
    );
  }
}