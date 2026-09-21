import {
  parseSeshMusicProjectId,
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
  kind: "not-found" | "validation" | "version" | "storage",
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

  if (message.includes("Unsupported Sesh persistence schema version")) {
    return failure("version", message);
  }

  if (
    message.includes("Sesh") ||
    message.includes("payload") ||
    message.includes("recordId")
  ) {
    return failure("validation", message);
  }

  return failure("storage", message);
}

export class D1SeshProjectRepository
implements SeshProjectRepository {
  constructor(
    private readonly database: SeshD1DatabaseLike,
  ) {}

  async saveProject(
    project: unknown,
  ): Promise<SeshPersistenceResult<SeshMusicProject>> {
    let validated: SeshMusicProject;

    try {
      validated = validateSeshMusicProject(project);
    }
    catch (error) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "Sesh project validation failed.",
      );
    }

    const storedAt = new Date().toISOString();
    const envelope = createSeshMusicProjectEnvelope(
      validated,
      storedAt,
    );
    const payloadJson =
      serializeSeshPersistenceEnvelope(envelope);

    try {
      await this.database
        .prepare(
          `INSERT INTO sesh_projects (
            project_id,
            schema_version,
            revision,
            stored_at,
            payload_json
          ) VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(project_id) DO UPDATE SET
            schema_version = excluded.schema_version,
            revision = excluded.revision,
            stored_at = excluded.stored_at,
            payload_json = excluded.payload_json`,
        )
        .bind(
          validated.id,
          envelope.schemaVersion,
          envelope.revision ?? null,
          storedAt,
          payloadJson,
        )
        .run();

      return success(validated);
    }
    catch (error) {
      return failure(
        "storage",
        error instanceof Error
          ? error.message
          : "Sesh D1 project write failed.",
      );
    }
  }

  async getProject(
    projectId: SeshMusicProjectId,
  ): Promise<SeshPersistenceResult<SeshMusicProject>> {
    let canonicalId: SeshMusicProjectId;

    try {
      canonicalId = parseSeshMusicProjectId(projectId);
    }
    catch (error) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "Sesh project identifier validation failed.",
      );
    }

    let row: ProjectRow | null;

    try {
      row = await this.database
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
        .bind(canonicalId)
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

    if (row === null) {
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

      if (envelope.recordType !== "music-project") {
        return failure(
          "validation",
          "Stored Sesh project row contains the wrong record type.",
        );
      }

      if (
        row.project_id !== canonicalId ||
        envelope.recordId !== canonicalId
      ) {
        return failure(
          "validation",
          "Stored Sesh project identifiers do not agree.",
        );
      }

      return success(envelope.payload);
    }
    catch (error) {
      return mapReadError(error);
    }
  }

  async deleteProject(
    projectId: SeshMusicProjectId,
  ): Promise<SeshPersistenceResult<boolean>> {
    let canonicalId: SeshMusicProjectId;

    try {
      canonicalId = parseSeshMusicProjectId(projectId);
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
      const existed = await this.projectExists(canonicalId);

      if (!existed.ok) {
        return existed;
      }

      await this.database
        .prepare(
          "DELETE FROM sesh_projects WHERE project_id = ?",
        )
        .bind(canonicalId)
        .run();

      return success(existed.value);
    }
    catch (error) {
      return failure(
        "storage",
        error instanceof Error
          ? error.message
          : "Sesh D1 project deletion failed.",
      );
    }
  }

  async projectExists(
    projectId: SeshMusicProjectId,
  ): Promise<SeshPersistenceResult<boolean>> {
    let canonicalId: SeshMusicProjectId;

    try {
      canonicalId = parseSeshMusicProjectId(projectId);
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
      const row = await this.database
        .prepare(
          "SELECT project_id FROM sesh_projects WHERE project_id = ?",
        )
        .bind(canonicalId)
        .first<{ readonly project_id: string }>();

      return success(row !== null);
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
