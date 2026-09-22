import {
  normalizeSeshCreatorHandle,
  validateSeshCreatorHandleReservation,
} from "../../creator-handle";

import type {
  SeshCreatorHandle,
  SeshCreatorHandleReservation,
} from "../../creator-handle";

import type {
  SeshCreatorId,
} from "../../identifiers";

import type {
  SeshPersistenceResult,
} from "../model";

import type {
  SeshCreatorHandleReservationRepository,
} from "../repositories";

import type {
  SeshD1DatabaseLike,
} from "./types";

interface CreatorHandleReservationRow {
  readonly normalized_handle:
    string;

  readonly creator_id:
    string;

  readonly created_at:
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

function rowToReservation(
  row:
    CreatorHandleReservationRow,
): SeshCreatorHandleReservation {
  return validateSeshCreatorHandleReservation({
    normalizedHandle:
      row.normalized_handle,

    creatorId:
      row.creator_id,

    createdAt:
      row.created_at,
  });
}

export class D1SeshCreatorHandleReservationRepository
implements SeshCreatorHandleReservationRepository {
  constructor(
    private readonly database:
      SeshD1DatabaseLike,
  ) {}

  async reserveHandle(
    reservation:
      unknown,
  ): Promise<
    SeshPersistenceResult<
      SeshCreatorHandleReservation
    >
  > {
    let canonical:
      SeshCreatorHandleReservation;

    try {
      canonical =
        validateSeshCreatorHandleReservation(
          reservation,
        );
    }
    catch (error) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "Invalid Sesh creator handle reservation.",
      );
    }

    const existingForHandle =
      await this.getByHandle(
        canonical.normalizedHandle,
      );

    if (
      existingForHandle.ok
    ) {
      return (
        existingForHandle.value.creatorId ===
          canonical.creatorId
      )
        ? success(
            existingForHandle.value,
          )
        : failure(
            "conflict",
            "Sesh creator handle is already reserved.",
          );
    }

    if (
      existingForHandle.error.kind !==
        "not-found"
    ) {
      return existingForHandle;
    }

    const existingForCreator =
      await this.getByCreatorId(
        canonical.creatorId,
      );

    if (
      existingForCreator.ok
    ) {
      return (
        existingForCreator.value.normalizedHandle ===
          canonical.normalizedHandle
      )
        ? success(
            existingForCreator.value,
          )
        : failure(
            "conflict",
            "Sesh creator already has a reserved handle.",
          );
    }

    if (
      existingForCreator.error.kind !==
        "not-found"
    ) {
      return existingForCreator;
    }

    try {
      const result =
        await this.database
          .prepare(
            `INSERT INTO sesh_creator_handle_reservations (
              normalized_handle,
              creator_id,
              created_at
            )
            VALUES (?, ?, ?)`,
          )
          .bind(
            canonical.normalizedHandle,
            canonical.creatorId,
            canonical.createdAt,
          )
          .run();

      if (
        result.success !==
          true
      ) {
        return failure(
          "storage",
          "Unable to persist Sesh creator handle reservation.",
        );
      }

      return success(
        canonical,
      );
    }
    catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown D1 handle reservation write failure.";

      if (
        /unique|constraint/i.test(
          message,
        )
      ) {
        return failure(
          "conflict",
          "Sesh creator handle or creator reservation already exists.",
        );
      }

      return failure(
        "storage",
        "Unable to persist Sesh creator handle reservation.",
      );
    }
  }

  async getByHandle(
    normalizedHandle:
      SeshCreatorHandle,
  ): Promise<
    SeshPersistenceResult<
      SeshCreatorHandleReservation
    >
  > {
    let canonicalHandle:
      SeshCreatorHandle;

    try {
      canonicalHandle =
        normalizeSeshCreatorHandle(
          normalizedHandle,
        );

      if (
        canonicalHandle !==
          normalizedHandle
      ) {
        return failure(
          "validation",
          "Handle lookup requires canonical normalized input.",
        );
      }
    }
    catch (error) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "Invalid creator handle lookup.",
      );
    }

    try {
      const row =
        await this.database
          .prepare(
            `SELECT
              normalized_handle,
              creator_id,
              created_at
            FROM sesh_creator_handle_reservations
            WHERE normalized_handle = ?
            LIMIT 1`,
          )
          .bind(
            canonicalHandle,
          )
          .first<
            CreatorHandleReservationRow
          >();

      if (
        row ===
          null
      ) {
        return failure(
          "not-found",
          "Sesh creator handle reservation does not exist.",
        );
      }

      try {
        return success(
          rowToReservation(
            row,
          ),
        );
      }
      catch (error) {
        return failure(
          "validation",
          error instanceof Error
            ? error.message
            : "Persisted Sesh creator handle reservation is invalid.",
        );
      }
    }
    catch {
      return failure(
        "storage",
        "Unable to load Sesh creator handle reservation.",
      );
    }
  }

  async getByCreatorId(
    creatorId:
      SeshCreatorId,
  ): Promise<
    SeshPersistenceResult<
      SeshCreatorHandleReservation
    >
  > {
    if (
      typeof creatorId !==
        "string" ||
      !creatorId.startsWith(
        "sesh-creator:",
      )
    ) {
      return failure(
        "validation",
        "creatorId must be a canonical SeshCreatorId.",
      );
    }

    try {
      const row =
        await this.database
          .prepare(
            `SELECT
              normalized_handle,
              creator_id,
              created_at
            FROM sesh_creator_handle_reservations
            WHERE creator_id = ?
            LIMIT 1`,
          )
          .bind(
            creatorId,
          )
          .first<
            CreatorHandleReservationRow
          >();

      if (
        row ===
          null
      ) {
        return failure(
          "not-found",
          "No Sesh creator handle reservation exists for the creator.",
        );
      }

      try {
        return success(
          rowToReservation(
            row,
          ),
        );
      }
      catch (error) {
        return failure(
          "validation",
          error instanceof Error
            ? error.message
            : "Persisted Sesh creator handle reservation is invalid.",
        );
      }
    }
    catch {
      return failure(
        "storage",
        "Unable to load Sesh creator handle reservation.",
      );
    }
  }

  async releaseHandle(
    normalizedHandle:
      SeshCreatorHandle,

    creatorId:
      SeshCreatorId,
  ): Promise<
    SeshPersistenceResult<boolean>
  > {
    let canonicalHandle:
      SeshCreatorHandle;

    try {
      canonicalHandle =
        normalizeSeshCreatorHandle(
          normalizedHandle,
        );

      if (
        canonicalHandle !==
          normalizedHandle
      ) {
        return failure(
          "validation",
          "Handle release requires canonical normalized input.",
        );
      }

      if (
        typeof creatorId !==
          "string" ||
        !creatorId.startsWith(
          "sesh-creator:",
        )
      ) {
        throw new TypeError(
          "creatorId must be a canonical SeshCreatorId.",
        );
      }
    }
    catch (error) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "Invalid Sesh creator handle release.",
      );
    }

    try {
      const result =
        await this.database
          .prepare(
            `DELETE FROM sesh_creator_handle_reservations
            WHERE
              normalized_handle = ?
              AND creator_id = ?`,
          )
          .bind(
            canonicalHandle,
            creatorId,
          )
          .run();

      if (
        result.success !==
          true
      ) {
        return failure(
          "storage",
          "Unable to release Sesh creator handle reservation.",
        );
      }

      return success(
        result.meta?.changes ===
          1,
      );
    }
    catch {
      return failure(
        "storage",
        "Unable to release Sesh creator handle reservation.",
      );
    }
  }
}