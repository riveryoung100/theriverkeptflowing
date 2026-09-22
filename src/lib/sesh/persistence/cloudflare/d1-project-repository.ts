import {
  parseSeshCreatorId,
  parseSeshMusicProjectId,
  type SeshCreatorId,
  type SeshMusicProjectId,
} from "../../identifiers";

import type {
  SeshMusicProject,
} from "../../model";

import {
  validateSeshMusicProject,
} from "../../validation";

import type {
  SeshPersistenceResult,
  SeshProjectPersistenceSnapshot,
} from "../model";

import type {
  SeshProjectRepository,
} from "../repositories";

import {
  createSeshMusicProjectEnvelope,
  deserializeSeshPersistenceEnvelope,
  serializeSeshPersistenceEnvelope,
} from "../serialization";

import type {
  SeshD1DatabaseLike,
  SeshD1RunResultLike,
} from "./types";

interface ProjectRow {
  readonly project_id: string;
  readonly schema_version: number;
  readonly revision: number | null;
  readonly stored_at: string;
  readonly payload_json: string;
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
    | "version"
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

function mapReadError<T>(
  error: unknown,
): SeshPersistenceResult<T> {
  const message =
    error instanceof Error
      ? error.message
      : "Unknown Sesh D1 project read failure.";

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

  if (
    message.includes("Sesh") ||
    message.includes("payload") ||
    message.includes("recordId")
  ) {
    return failure(
      "validation",
      message,
    );
  }

  return failure(
    "storage",
    message,
  );
}

function canonicalRevision(
  rowRevision: number | null,
  envelopeRevision: number | undefined,
): number {
  const revision =
    rowRevision ??
    envelopeRevision ??
    0;

  if (
    !Number.isInteger(revision) ||
    revision < 0
  ) {
    throw new TypeError(
      "Stored Sesh project revision must be a non-negative integer.",
    );
  }

  if (
    rowRevision !== null &&
    envelopeRevision !== undefined &&
    rowRevision !== envelopeRevision
  ) {
    throw new TypeError(
      "Stored Sesh project revision metadata does not agree.",
    );
  }

  return revision;
}

function changedExactlyOne(
  result: SeshD1RunResultLike,
): boolean {
  return (
    result.success !== false &&
    result.meta?.changes === 1
  );
}

export class D1SeshProjectRepository
implements SeshProjectRepository {
  constructor(
    private readonly database:
      SeshD1DatabaseLike,
  ) {}

  async saveProject(
    project: unknown,
  ): Promise<
    SeshPersistenceResult<SeshMusicProject>
  > {
    let validated:
      SeshMusicProject;

    try {
      validated =
        validateSeshMusicProject(
          project,
        );
    }
    catch (error) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "Sesh project validation failed.",
      );
    }

    const storedAt =
      new Date().toISOString();

    const revision =
      0;

    const envelope =
      createSeshMusicProjectEnvelope(
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
            `INSERT INTO sesh_projects (
              project_id,
              schema_version,
              revision,
              stored_at,
              payload_json
            ) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(project_id) DO NOTHING`,
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
        !changedExactlyOne(
          result,
        )
      ) {
        return failure(
          "conflict",
          "Sesh project already exists.",
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
          : "Sesh D1 project creation failed.",
      );
    }
  }

  async getProjectSnapshot(
    projectId: SeshMusicProjectId,
  ): Promise<
    SeshPersistenceResult<
      SeshProjectPersistenceSnapshot
    >
  > {
    let canonicalId:
      SeshMusicProjectId;

    try {
      canonicalId =
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

    let row:
      ProjectRow | null;

    try {
      row =
        await this.database
          .prepare(
            `SELECT
              project_id,
              schema_version,
              revision,
              stored_at,
              payload_json
            FROM sesh_projects
            WHERE project_id = ?`,
          )
          .bind(
            canonicalId,
          )
          .first<ProjectRow>();
    }
    catch (error) {
      return failure(
        "storage",
        error instanceof Error
          ? error.message
          : "Sesh D1 project read failed.",
      );
    }

    if (
      row ===
      null
    ) {
      return failure(
        "not-found",
        `Sesh project not found: ${canonicalId}`,
      );
    }

    try {
      const envelope =
        deserializeSeshPersistenceEnvelope(
          row.payload_json,
        );

      if (
        envelope.recordType !==
        "music-project"
      ) {
        return failure(
          "validation",
          "Stored Sesh project row contains the wrong record type.",
        );
      }

      if (
        row.project_id !==
          canonicalId ||
        envelope.recordId !==
          canonicalId
      ) {
        return failure(
          "validation",
          "Stored Sesh project identifiers do not agree.",
        );
      }

      const revision =
        canonicalRevision(
          row.revision,
          envelope.revision,
        );

      return success({
        project:
          envelope.payload,

        revision,
      });
    }
    catch (error) {
      return mapReadError(
        error,
      );
    }
  }

  async getProject(
    projectId: SeshMusicProjectId,
  ): Promise<
    SeshPersistenceResult<SeshMusicProject>
  > {
    const snapshot =
      await this.getProjectSnapshot(
        projectId,
      );

    if (
      !snapshot.ok
    ) {
      return snapshot;
    }

    return success(
      snapshot.value.project,
    );
  }

  async updateProjectConditionally(
    project: unknown,
    expectedRevision: number,
    expectedOwnerCreatorId: string,
  ): Promise<
    SeshPersistenceResult<
      SeshProjectPersistenceSnapshot
    >
  > {
    let validated:
      SeshMusicProject;

    let expectedOwner:
      SeshCreatorId;

    try {
      validated =
        validateSeshMusicProject(
          project,
        );

      expectedOwner =
        parseSeshCreatorId(
          expectedOwnerCreatorId,
        );

      if (
        !Number.isInteger(
          expectedRevision,
        ) ||
        expectedRevision < 0
      ) {
        throw new TypeError(
          "Expected Sesh project revision must be a non-negative integer.",
        );
      }
    }
    catch (error) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "Sesh conditional project update validation failed.",
      );
    }

    const current =
      await this.getProjectSnapshot(
        validated.id,
      );

    if (
      !current.ok
    ) {
      return current;
    }

    if (
      current.value.revision !==
        expectedRevision ||
      current.value.project.ownerCreatorId !==
        expectedOwner
    ) {
      return failure(
        "conflict",
        "Sesh project changed before conditional update.",
      );
    }

    if (
      validated.ownerCreatorId !==
        expectedOwner
    ) {
      return failure(
        "conflict",
        "Ordinary Sesh project updates cannot reassign ownerCreatorId.",
      );
    }

    const nextRevision =
      expectedRevision +
      1;

    const storedAt =
      new Date().toISOString();

    const envelope =
      createSeshMusicProjectEnvelope(
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
            `UPDATE sesh_projects
            SET
              schema_version = ?,
              revision = ?,
              stored_at = ?,
              payload_json = ?
            WHERE
              project_id = ?
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
            expectedRevision,
            expectedRevision,
          )
          .run();

      if (
        !changedExactlyOne(
          result,
        )
      ) {
        return failure(
          "conflict",
          "Sesh project changed before conditional update.",
        );
      }

      return success({
        project:
          validated,

        revision:
          nextRevision,
      });
    }
    catch (error) {
      return failure(
        "storage",
        error instanceof Error
          ? error.message
          : "Sesh D1 conditional project update failed.",
      );
    }
  }

  async deleteProjectConditionally(
    projectId: SeshMusicProjectId,
    expectedRevision: number,
    expectedOwnerCreatorId: string,
  ): Promise<
    SeshPersistenceResult<boolean>
  > {
    let canonicalId:
      SeshMusicProjectId;

    let expectedOwner:
      SeshCreatorId;

    try {
      canonicalId =
        parseSeshMusicProjectId(
          projectId,
        );

      expectedOwner =
        parseSeshCreatorId(
          expectedOwnerCreatorId,
        );

      if (
        !Number.isInteger(
          expectedRevision,
        ) ||
        expectedRevision < 0
      ) {
        throw new TypeError(
          "Expected Sesh project revision must be a non-negative integer.",
        );
      }
    }
    catch (error) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "Sesh conditional project deletion validation failed.",
      );
    }

    const current =
      await this.getProjectSnapshot(
        canonicalId,
      );

    if (
      !current.ok
    ) {
      return current;
    }

    if (
      current.value.revision !==
        expectedRevision ||
      current.value.project.ownerCreatorId !==
        expectedOwner
    ) {
      return failure(
        "conflict",
        "Sesh project changed before conditional deletion.",
      );
    }

    try {
      const result =
        await this.database
          .prepare(
            `DELETE FROM sesh_projects
            WHERE
              project_id = ?
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
            expectedRevision,
            expectedRevision,
          )
          .run();

      if (
        !changedExactlyOne(
          result,
        )
      ) {
        return failure(
          "conflict",
          "Sesh project changed before conditional deletion.",
        );
      }

      return success(
        true,
      );
    }
    catch (error) {
      return failure(
        "storage",
        error instanceof Error
          ? error.message
          : "Sesh D1 conditional project deletion failed.",
      );
    }
  }

  async deleteProject(
    projectId: SeshMusicProjectId,
  ): Promise<
    SeshPersistenceResult<boolean>
  > {
    const snapshot =
      await this.getProjectSnapshot(
        projectId,
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

    return this.deleteProjectConditionally(
      projectId,
      snapshot.value.revision,
      snapshot.value.project.ownerCreatorId,
    );
  }

  async projectExists(
    projectId: SeshMusicProjectId,
  ): Promise<
    SeshPersistenceResult<boolean>
  > {
    let canonicalId:
      SeshMusicProjectId;

    try {
      canonicalId =
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
            "SELECT project_id FROM sesh_projects WHERE project_id = ?",
          )
          .bind(
            canonicalId,
          )
          .first<{
            readonly project_id:
              string;
          }>();

      return success(
        row !==
        null,
      );
    }
    catch (error) {
      return failure(
        "storage",
        error instanceof Error
          ? error.message
          : "Sesh D1 project existence check failed.",
      );
    }
  }
}
