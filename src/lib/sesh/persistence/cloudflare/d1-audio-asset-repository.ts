import {
  parseSeshAudioAssetId,
  parseSeshMusicProjectId,
  type SeshAudioAssetId,
  type SeshMusicProjectId,
} from "../../identifiers";
import type {
  SeshAudioAsset,
} from "../../model";
import {
  validateSeshAudioAsset,
} from "../../validation";
import type {
  SeshPersistenceResult,
} from "../model";
import type {
  SeshAudioAssetRepository,
} from "../repositories";
import {
  createSeshAudioAssetEnvelope,
  deserializeSeshPersistenceEnvelope,
  serializeSeshPersistenceEnvelope,
} from "../serialization";
import type {
  SeshD1DatabaseLike,
} from "./types";

interface AudioAssetRow {
  readonly audio_asset_id: string;
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

function decodeRow(
  row: AudioAssetRow,
): SeshPersistenceResult<SeshAudioAsset> {
  try {
    const envelope =
      deserializeSeshPersistenceEnvelope(
        row.payload_json,
      );

    if (envelope.recordType !== "audio-asset") {
      return failure(
        "validation",
        "Stored Sesh audio row contains the wrong record type.",
      );
    }

    if (
      row.audio_asset_id !== envelope.recordId ||
      row.project_id !== envelope.payload.projectId
    ) {
      return failure(
        "validation",
        "Stored Sesh audio identifiers do not agree.",
      );
    }

    return success(envelope.payload);
  }
  catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown Sesh D1 audio read failure.";

    if (message.includes("Unsupported Sesh persistence schema version")) {
      return failure("version", message);
    }

    return failure("validation", message);
  }
}

export class D1SeshAudioAssetRepository
implements SeshAudioAssetRepository {
  constructor(
    private readonly database: SeshD1DatabaseLike,
  ) {}

  async saveAudioAsset(
    asset: unknown,
  ): Promise<SeshPersistenceResult<SeshAudioAsset>> {
    let validated: SeshAudioAsset;

    try {
      validated = validateSeshAudioAsset(asset);
    }
    catch (error) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "Sesh audio asset validation failed.",
      );
    }

    const storedAt = new Date().toISOString();
    const envelope = createSeshAudioAssetEnvelope(
      validated,
      storedAt,
    );
    const payloadJson =
      serializeSeshPersistenceEnvelope(envelope);

    try {
      await this.database
        .prepare(
          `INSERT INTO sesh_audio_assets (
            audio_asset_id,
            project_id,
            schema_version,
            revision,
            stored_at,
            payload_json
          ) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(audio_asset_id) DO UPDATE SET
            project_id = excluded.project_id,
            schema_version = excluded.schema_version,
            revision = excluded.revision,
            stored_at = excluded.stored_at,
            payload_json = excluded.payload_json`,
        )
        .bind(
          validated.id,
          validated.projectId,
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
          : "Sesh D1 audio metadata write failed.",
      );
    }
  }

  async getAudioAsset(
    assetId: SeshAudioAssetId,
  ): Promise<SeshPersistenceResult<SeshAudioAsset>> {
    let canonicalId: SeshAudioAssetId;

    try {
      canonicalId = parseSeshAudioAssetId(assetId);
    }
    catch (error) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "Sesh audio identifier validation failed.",
      );
    }

    let row: AudioAssetRow | null;

    try {
      row = await this.database
        .prepare(
          `SELECT
            audio_asset_id,
            project_id,
            schema_version,
            revision,
            stored_at,
            payload_json
          FROM sesh_audio_assets
          WHERE audio_asset_id = ?`,
        )
        .bind(canonicalId)
        .first<AudioAssetRow>();
    }
    catch (error) {
      return failure(
        "storage",
        error instanceof Error
          ? error.message
          : "Sesh D1 audio metadata read failed.",
      );
    }

    if (row === null) {
      return failure(
        "not-found",
        `Sesh audio asset not found: ${canonicalId}`,
      );
    }

    if (row.audio_asset_id !== canonicalId) {
      return failure(
        "validation",
        "Stored Sesh audio row identifier does not match the requested identifier.",
      );
    }

    return decodeRow(row);
  }

  async listAudioAssetsForProject(
    projectId: SeshMusicProjectId,
  ): Promise<SeshPersistenceResult<readonly SeshAudioAsset[]>> {
    let canonicalProjectId: SeshMusicProjectId;

    try {
      canonicalProjectId =
        parseSeshMusicProjectId(projectId);
    }
    catch (error) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "Sesh project identifier validation failed.",
      );
    }

    let rows: readonly AudioAssetRow[];

    try {
      const result = await this.database
        .prepare(
          `SELECT
            audio_asset_id,
            project_id,
            schema_version,
            revision,
            stored_at,
            payload_json
          FROM sesh_audio_assets
          WHERE project_id = ?
          ORDER BY audio_asset_id`,
        )
        .bind(canonicalProjectId)
        .all<AudioAssetRow>();

      rows = result.results;
    }
    catch (error) {
      return failure(
        "storage",
        error instanceof Error
          ? error.message
          : "Sesh D1 audio metadata listing failed.",
      );
    }

    const assets: SeshAudioAsset[] = [];

    for (const row of rows) {
      if (row.project_id !== canonicalProjectId) {
        return failure(
          "validation",
          "Stored Sesh audio row project identifier does not match query scope.",
        );
      }

      const decoded = decodeRow(row);

      if (!decoded.ok) {
        return decoded;
      }

      assets.push(decoded.value);
    }

    return success(assets);
  }

  async deleteAudioAssetMetadata(
    assetId: SeshAudioAssetId,
  ): Promise<SeshPersistenceResult<boolean>> {
    let canonicalId: SeshAudioAssetId;

    try {
      canonicalId = parseSeshAudioAssetId(assetId);
    }
    catch (error) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "Sesh audio identifier validation failed.",
      );
    }

    try {
      const existing = await this.getAudioAsset(canonicalId);

      if (!existing.ok) {
        if (existing.error.kind === "not-found") {
          return success(false);
        }

        return existing;
      }

      await this.database
        .prepare(
          "DELETE FROM sesh_audio_assets WHERE audio_asset_id = ?",
        )
        .bind(canonicalId)
        .run();

      return success(true);
    }
    catch (error) {
      return failure(
        "storage",
        error instanceof Error
          ? error.message
          : "Sesh D1 audio metadata deletion failed.",
      );
    }
  }
}
