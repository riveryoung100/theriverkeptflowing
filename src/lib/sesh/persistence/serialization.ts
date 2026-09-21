import {
  validateSeshAudioAsset,
  validateSeshMusicProject,
} from "../validation";
import type {
  SeshAudioAsset,
  SeshMusicProject,
  SeshTimestamp,
} from "../model";
import {
  SESH_PERSISTENCE_SCHEMA_VERSION,
  type SeshAudioAssetPersistenceEnvelope,
  type SeshMusicProjectPersistenceEnvelope,
  type SeshPersistenceEnvelope,
  type SeshPersistenceRecordType,
  type SeshPersistenceRevision,
} from "./model";

type UnknownRecord = Record<string, unknown>;

function requireRecord(
  value: unknown,
  label: string,
): UnknownRecord {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new TypeError(`${label} must be an object.`);
  }

  return value as UnknownRecord;
}

function requireString(
  value: unknown,
  label: string,
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }

  return value;
}

function requireStoredAt(
  value: unknown,
): SeshTimestamp {
  const timestamp = requireString(
    value,
    "SeshPersistenceEnvelope.storedAt",
  );

  if (
    !timestamp.endsWith("Z") ||
    !Number.isFinite(Date.parse(timestamp))
  ) {
    throw new TypeError(
      "SeshPersistenceEnvelope.storedAt must be a valid ISO-8601 UTC timestamp.",
    );
  }

  return timestamp;
}

function optionalRevision(
  value: unknown,
): SeshPersistenceRevision | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0
  ) {
    throw new TypeError(
      "SeshPersistenceEnvelope.revision must be a non-negative integer.",
    );
  }

  return value;
}

function requireSchemaVersion(
  value: unknown,
): typeof SESH_PERSISTENCE_SCHEMA_VERSION {
  if (value !== SESH_PERSISTENCE_SCHEMA_VERSION) {
    throw new TypeError(
      `Unsupported Sesh persistence schema version: ${String(value)}.`,
    );
  }

  return SESH_PERSISTENCE_SCHEMA_VERSION;
}

function requireRecordType(
  value: unknown,
): SeshPersistenceRecordType {
  if (
    value !== "music-project" &&
    value !== "audio-asset"
  ) {
    throw new TypeError(
      `Unsupported Sesh persistence record type: ${String(value)}.`,
    );
  }

  return value;
}

function validateRecordIdentity(
  recordId: string,
  payloadId: string,
): void {
  if (recordId !== payloadId) {
    throw new TypeError(
      "Sesh persistence recordId must match payload.id.",
    );
  }
}

export function createSeshMusicProjectEnvelope(
  project: unknown,
  storedAt: SeshTimestamp,
  revision?: SeshPersistenceRevision,
): SeshMusicProjectPersistenceEnvelope {
  const payload = validateSeshMusicProject(project);

  return {
    schemaVersion: SESH_PERSISTENCE_SCHEMA_VERSION,
    recordType: "music-project",
    recordId: payload.id,
    storedAt: requireStoredAt(storedAt),
    revision: optionalRevision(revision),
    payload,
  };
}

export function createSeshAudioAssetEnvelope(
  asset: unknown,
  storedAt: SeshTimestamp,
  revision?: SeshPersistenceRevision,
): SeshAudioAssetPersistenceEnvelope {
  const payload = validateSeshAudioAsset(asset);

  return {
    schemaVersion: SESH_PERSISTENCE_SCHEMA_VERSION,
    recordType: "audio-asset",
    recordId: payload.id,
    storedAt: requireStoredAt(storedAt),
    revision: optionalRevision(revision),
    payload,
  };
}

export function serializeSeshPersistenceEnvelope(
  envelope: SeshPersistenceEnvelope,
): string {
  return JSON.stringify(envelope);
}

export function deserializeSeshPersistenceEnvelope(
  serialized: string,
): SeshPersistenceEnvelope {
  let parsed: unknown;

  try {
    parsed = JSON.parse(serialized);
  }
  catch {
    throw new TypeError(
      "Sesh persistence payload is not valid JSON.",
    );
  }

  const record = requireRecord(
    parsed,
    "SeshPersistenceEnvelope",
  );

  const schemaVersion = requireSchemaVersion(
    record.schemaVersion,
  );
  const recordType = requireRecordType(record.recordType);
  const recordId = requireString(
    record.recordId,
    "SeshPersistenceEnvelope.recordId",
  );
  const storedAt = requireStoredAt(record.storedAt);
  const revision = optionalRevision(record.revision);

  if (recordType === "music-project") {
    const payload: SeshMusicProject =
      validateSeshMusicProject(record.payload);

    validateRecordIdentity(recordId, payload.id);

    return {
      schemaVersion,
      recordType,
      recordId,
      storedAt,
      revision,
      payload,
    };
  }

  const payload: SeshAudioAsset =
    validateSeshAudioAsset(record.payload);

  validateRecordIdentity(recordId, payload.id);

  return {
    schemaVersion,
    recordType,
    recordId,
    storedAt,
    revision,
    payload,
  };
}
