import {
  parseSeshCreatorId,
  parseSeshMusicProjectId,
} from "../../identifiers";

import type {
  SeshCreatorId,
  SeshMusicProjectId,
} from "../../identifiers";

import {
  validateSeshProjectPublicationRecord,
} from "../../project-publication";

import type {
  SeshProjectPublicationRecord,
} from "../../project-publication";

import type {
  SeshPersistenceResult,
} from "../model";

import type {
  SeshProjectPublicationRepository,
  SeshPublicProjectPublicationDiscoveryRepository,
} from "../project-publication-repository";

import type {
  SeshD1DatabaseLike,
  SeshD1RunResultLike,
} from "./types";

interface ProjectPublicationRow {
  readonly project_id:
    string;

  readonly owner_creator_id:
    string;

  readonly state:
    string;

  readonly updated_at:
    string;
}

function success<T>(
  value: T,
): SeshPersistenceResult<T> {
  return {
    ok: true,
    value,
  };
}

function failure<T>(
  kind:
    | "not-found"
    | "validation"
    | "conflict"
    | "storage",
  message: string,
): SeshPersistenceResult<T> {
  return {
    ok: false,
    error: {
      kind,
      message,
    },
  };
}

function changedExactlyOne(
  result: SeshD1RunResultLike,
): boolean {
  return (
    result.success !== false &&
    result.meta?.changes === 1
  );
}

function recordFromRow(
  row: ProjectPublicationRow,
): SeshProjectPublicationRecord {
  return validateSeshProjectPublicationRecord({
    projectId:
      row.project_id,
    ownerCreatorId:
      row.owner_creator_id,
    state:
      row.state,
    updatedAt:
      row.updated_at,
  });
}

export class D1SeshProjectPublicationRepository
implements
  SeshProjectPublicationRepository,
  SeshPublicProjectPublicationDiscoveryRepository {
  constructor(
    private readonly database:
      SeshD1DatabaseLike,
  ) {}

  async saveProjectPublication(
    record: unknown,
  ): Promise<
    SeshPersistenceResult<
      SeshProjectPublicationRecord
    >
  > {
    let validated:
      SeshProjectPublicationRecord;

    try {
      validated =
        validateSeshProjectPublicationRecord(
          record,
        );
    }
    catch (error) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "Sesh project publication validation failed.",
      );
    }

    try {
      const result =
        await this.database
          .prepare(
            `INSERT INTO sesh_project_publication (
              project_id,
              owner_creator_id,
              state,
              updated_at
            ) VALUES (?, ?, ?, ?)
            ON CONFLICT(project_id) DO NOTHING`,
          )
          .bind(
            validated.projectId,
            validated.ownerCreatorId,
            validated.state,
            validated.updatedAt,
          )
          .run();

      if (
        !changedExactlyOne(
          result,
        )
      ) {
        return failure(
          "conflict",
          "Sesh project publication record already exists.",
        );
      }

      return success(
        validated,
      );
    }
    catch (error) {
      return failure(
        "storage",
        error instanceof Error
          ? error.message
          : "Sesh project publication creation failed.",
      );
    }
  }

  async getProjectPublication(
    projectId: SeshMusicProjectId,
  ): Promise<
    SeshPersistenceResult<
      SeshProjectPublicationRecord
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
    catch (error) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "Sesh project identifier validation failed.",
      );
    }

    try {
      const row =
        await this.database
          .prepare(
            `SELECT
              project_id,
              owner_creator_id,
              state,
              updated_at
            FROM sesh_project_publication
            WHERE project_id = ?`,
          )
          .bind(
            canonicalProjectId,
          )
          .first<ProjectPublicationRow>();

      if (
        row ===
          null
      ) {
        return failure(
          "not-found",
          "Sesh project publication record not found.",
        );
      }

      let validated:
        SeshProjectPublicationRecord;

      try {
        validated =
          recordFromRow(
            row,
          );
      }
      catch (error) {
        return failure(
          "validation",
          error instanceof Error
            ? error.message
            : "Stored Sesh project publication record is invalid.",
        );
      }

      if (
        validated.projectId !==
          canonicalProjectId
      ) {
        return failure(
          "validation",
          "Stored Sesh project publication identity does not agree with the lookup.",
        );
      }

      return success(
        validated,
      );
    }
    catch (error) {
      return failure(
        "storage",
        error instanceof Error
          ? error.message
          : "Sesh project publication read failed.",
      );
    }
  }

  async listPublicProjectPublications(
    limit: number,
  ): Promise<
    SeshPersistenceResult<
      readonly SeshProjectPublicationRecord[]
    >
  > {
    if (
      !Number.isInteger(
        limit,
      ) ||
      limit <
        1 ||
      limit >
        50
    ) {
      return failure(
        "validation",
        "Sesh public project discovery limit must be an integer from 1 through 50.",
      );
    }

    let rows:
      readonly ProjectPublicationRow[];

    try {
      const result =
        await this.database
          .prepare(
            `SELECT
              project_id,
              owner_creator_id,
              state,
              updated_at
            FROM sesh_project_publication
            WHERE state = 'public'
            ORDER BY
              updated_at DESC,
              project_id ASC
            LIMIT ?`,
          )
          .bind(
            limit,
          )
          .all<ProjectPublicationRow>();

      rows =
        result.results;
    }
    catch (error) {
      return failure(
        "storage",
        error instanceof Error
          ? error.message
          : "Sesh global public project publication read failed.",
      );
    }

    if (
      rows.length >
        limit
    ) {
      return failure(
        "validation",
        "Sesh global public project publication read exceeded its requested result bound.",
      );
    }

    const publications:
      SeshProjectPublicationRecord[] =
        [];

    for (
      const row of rows
    ) {
      let validated:
        SeshProjectPublicationRecord;

      try {
        validated =
          recordFromRow(
            row,
          );
      }
      catch (error) {
        return failure(
          "validation",
          error instanceof Error
            ? error.message
            : "Stored Sesh project publication record is invalid.",
        );
      }

      if (
        validated.state !==
          "public"
      ) {
        return failure(
          "validation",
          "Global Sesh public project publication read returned a non-public record.",
        );
      }

      publications.push(
        validated,
      );
    }

    return success(
      publications,
    );
  }

  async listPublicProjectPublicationsForOwner(
    ownerCreatorId:
      SeshCreatorId,
  ): Promise<
    SeshPersistenceResult<
      readonly SeshProjectPublicationRecord[]
    >
  > {
    let canonicalOwnerCreatorId:
      SeshCreatorId;

    try {
      canonicalOwnerCreatorId =
        parseSeshCreatorId(
          ownerCreatorId,
        );
    }
    catch (error) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "Sesh creator identifier validation failed.",
      );
    }

    let rows:
      readonly ProjectPublicationRow[];

    try {
      const result =
        await this.database
          .prepare(
            `SELECT
              project_id,
              owner_creator_id,
              state,
              updated_at
            FROM sesh_project_publication
            WHERE
              owner_creator_id = ?
              AND state = 'public'
            ORDER BY
              updated_at DESC,
              project_id ASC`,
          )
          .bind(
            canonicalOwnerCreatorId,
          )
          .all<ProjectPublicationRow>();

      rows =
        result.results;
    }
    catch (error) {
      return failure(
        "storage",
        error instanceof Error
          ? error.message
          : "Sesh public project publication collection read failed.",
      );
    }

    const publications:
      SeshProjectPublicationRecord[] =
        [];

    for (
      const row of rows
    ) {
      let validated:
        SeshProjectPublicationRecord;

      try {
        validated =
          recordFromRow(
            row,
          );
      }
      catch (error) {
        return failure(
          "validation",
          error instanceof Error
            ? error.message
            : "Stored Sesh project publication record is invalid.",
        );
      }

      if (
        validated.ownerCreatorId !==
          canonicalOwnerCreatorId ||
        validated.state !==
          "public"
      ) {
        return failure(
          "validation",
          "Stored Sesh project publication does not agree with the public owner collection query.",
        );
      }

      publications.push(
        validated,
      );
    }

    return success(
      publications,
    );
  }

  async updateProjectPublication(
    record: unknown,
  ): Promise<
    SeshPersistenceResult<
      SeshProjectPublicationRecord
    >
  > {
    let validated:
      SeshProjectPublicationRecord;

    try {
      validated =
        validateSeshProjectPublicationRecord(
          record,
        );
    }
    catch (error) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "Sesh project publication validation failed.",
      );
    }

    const existing =
      await this.getProjectPublication(
        validated.projectId,
      );

    if (
      !existing.ok
    ) {
      return existing;
    }

    if (
      existing.value.ownerCreatorId !==
        validated.ownerCreatorId
    ) {
      return failure(
        "conflict",
        "Sesh project publication ownership cannot be reassigned.",
      );
    }

    try {
      const result =
        await this.database
          .prepare(
            `UPDATE sesh_project_publication
            SET
              state = ?,
              updated_at = ?
            WHERE
              project_id = ?
              AND owner_creator_id = ?`,
          )
          .bind(
            validated.state,
            validated.updatedAt,
            validated.projectId,
            validated.ownerCreatorId,
          )
          .run();

      if (
        !changedExactlyOne(
          result,
        )
      ) {
        return failure(
          "conflict",
          "Sesh project publication changed before update.",
        );
      }

      return success(
        validated,
      );
    }
    catch (error) {
      return failure(
        "storage",
        error instanceof Error
          ? error.message
          : "Sesh project publication update failed.",
      );
    }
  }
}