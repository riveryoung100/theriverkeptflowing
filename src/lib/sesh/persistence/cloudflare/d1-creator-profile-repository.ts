import {
  parseSeshCreatorId,
  type SeshCreatorId,
} from "../../identifiers";

import {
  validateSeshCreatorProfile,
} from "../../validation";

import type {
  SeshCreatorProfile,
} from "../../model";

import type {
  SeshPersistenceResult,
} from "../model";

import type {
  SeshCreatorProfileRepository,
} from "../repositories";

import {
  createSeshCreatorProfileEnvelope,
  deserializeSeshPersistenceEnvelope,
  serializeSeshPersistenceEnvelope,
} from "../serialization";

import type {
  SeshD1DatabaseLike,
  SeshD1RunResultLike,
} from "./types";

interface CreatorProfileRow {
  readonly creator_id:
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
    "not-found" |
    "validation" |
    "version" |
    "conflict" |
    "storage",
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

function profilesEqual(
  left:
    SeshCreatorProfile,
  right:
    SeshCreatorProfile,
): boolean {
  return (
    left.id ===
      right.id &&
    left.displayName ===
      right.displayName &&
    left.createdAt ===
      right.createdAt &&
    left.handle ===
      right.handle &&
    left.bio ===
      right.bio
  );
}

function rowFailure<T>(
  error:
    unknown,
): SeshPersistenceResult<T> {
  const message =
    error instanceof Error
      ? error.message
      : "Stored Sesh creator profile is invalid.";

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

export class D1SeshCreatorProfileRepository
implements SeshCreatorProfileRepository {
  constructor(
    private readonly database:
      SeshD1DatabaseLike,
  ) {}

  async saveCreatorProfile(
    profile:
      unknown,
  ): Promise<
    SeshPersistenceResult<
      SeshCreatorProfile
    >
  > {
    let validated:
      SeshCreatorProfile;

    try {
      validated =
        validateSeshCreatorProfile(
          profile,
        );
    }
    catch (error) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "Sesh creator profile validation failed.",
      );
    }

    const existing =
      await this.getCreatorProfile(
        validated.id,
      );

    if (
      existing.ok
    ) {
      return profilesEqual(
        existing.value,
        validated,
      )
        ? success(
            existing.value,
          )
        : failure(
            "conflict",
            "Sesh creator profile already exists with different canonical data.",
          );
    }

    if (
      existing.error.kind !==
      "not-found"
    ) {
      return existing;
    }

    const storedAt =
      new Date().toISOString();

    const revision =
      0;

    const envelope =
      createSeshCreatorProfileEnvelope(
        validated,
        storedAt,
        revision,
      );

    const payloadJson =
      serializeSeshPersistenceEnvelope(
        envelope,
      );

    try {
      const result =
        await this.database
          .prepare(
            `INSERT INTO sesh_creator_profiles (
              creator_id,
              schema_version,
              revision,
              stored_at,
              payload_json
            ) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(creator_id) DO NOTHING`,
          )
          .bind(
            validated.id,
            envelope.schemaVersion,
            revision,
            storedAt,
            payloadJson,
          )
          .run();

      if (
        changedExactlyOne(
          result,
        )
      ) {
        return success(
          validated,
        );
      }

      const raced =
        await this.getCreatorProfile(
          validated.id,
        );

      if (
        raced.ok &&
        profilesEqual(
          raced.value,
          validated,
        )
      ) {
        return raced;
      }

      return failure(
        "conflict",
        "Sesh creator profile already exists.",
      );
    }
    catch (error) {
      return failure(
        "storage",
        error instanceof Error
          ? error.message
          : "Sesh D1 creator profile creation failed.",
      );
    }
  }

  async getCreatorProfile(
    creatorId:
      SeshCreatorId,
  ): Promise<
    SeshPersistenceResult<
      SeshCreatorProfile
    >
  > {
    let canonicalId:
      SeshCreatorId;

    try {
      canonicalId =
        parseSeshCreatorId(
          creatorId,
        );
    }
    catch (error) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "SeshCreatorId validation failed.",
      );
    }

    let row:
      CreatorProfileRow |
      null;

    try {
      row =
        await this.database
          .prepare(
            `SELECT
              creator_id,
              schema_version,
              revision,
              stored_at,
              payload_json
            FROM sesh_creator_profiles
            WHERE creator_id = ?
            LIMIT 1`,
          )
          .bind(
            canonicalId,
          )
          .first<CreatorProfileRow>();
    }
    catch (error) {
      return failure(
        "storage",
        error instanceof Error
          ? error.message
          : "Sesh D1 creator profile lookup failed.",
      );
    }

    if (
      row ===
      null
    ) {
      return failure(
        "not-found",
        "Sesh creator profile does not exist.",
      );
    }

    try {
      const envelope =
        deserializeSeshPersistenceEnvelope(
          row.payload_json,
        );

      if (
        envelope.recordType !==
        "creator-profile"
      ) {
        return failure(
          "validation",
          "Stored Sesh creator profile has an unexpected record type.",
        );
      }

      if (
        row.creator_id !==
          canonicalId ||
        envelope.recordId !==
          canonicalId ||
        envelope.payload.id !==
          canonicalId
      ) {
        return failure(
          "validation",
          "Stored Sesh creator profile identity does not agree.",
        );
      }

      if (
        row.schema_version !==
          envelope.schemaVersion
      ) {
        return failure(
          "validation",
          "Stored Sesh creator profile schema metadata does not agree.",
        );
      }

      if (
        (
          row.revision ??
          0
        ) !==
        (
          envelope.revision ??
          0
        )
      ) {
        return failure(
          "validation",
          "Stored Sesh creator profile revision metadata does not agree.",
        );
      }

      if (
        row.stored_at !==
          envelope.storedAt
      ) {
        return failure(
          "validation",
          "Stored Sesh creator profile timestamp metadata does not agree.",
        );
      }

      return success(
        envelope.payload,
      );
    }
    catch (error) {
      return rowFailure(
        error,
      );
    }
  }

  async creatorProfileExists(
    creatorId:
      SeshCreatorId,
  ): Promise<
    SeshPersistenceResult<boolean>
  > {
    const result =
      await this.getCreatorProfile(
        creatorId,
      );

    if (
      result.ok
    ) {
      return success(
        true,
      );
    }

    if (
      result.error.kind ===
      "not-found"
    ) {
      return success(
        false,
      );
    }

    return result;
  }
}