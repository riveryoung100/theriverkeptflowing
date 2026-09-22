import type {
  SeshAudioAsset,
  SeshCreatorProfile,
  SeshMusicProject,
  SeshStorageReference,
  SeshTimestamp,
} from "../model";

export const SESH_PERSISTENCE_SCHEMA_VERSION = 1 as const;

export const SESH_PERSISTENCE_RECORD_TYPES = [
  "creator-profile",
  "music-project",
  "audio-asset",
] as const;

export type SeshPersistenceRecordType =
  (typeof SESH_PERSISTENCE_RECORD_TYPES)[number];

export type SeshPersistenceRevision = number;

export interface SeshProjectPersistenceSnapshot {
  readonly project: SeshMusicProject;
  readonly revision: SeshPersistenceRevision;
}

export interface SeshCreatorProfilePersistenceSnapshot {
  readonly profile: SeshCreatorProfile;
  readonly revision: SeshPersistenceRevision;
}

export interface SeshCreatorProfilePersistenceEnvelope {
  readonly schemaVersion:
    typeof SESH_PERSISTENCE_SCHEMA_VERSION;
  readonly recordType:
    "creator-profile";
  readonly recordId:
    string;
  readonly storedAt:
    SeshTimestamp;
  readonly revision?:
    SeshPersistenceRevision;
  readonly payload:
    SeshCreatorProfile;
}
export interface SeshMusicProjectPersistenceEnvelope {
  readonly schemaVersion: typeof SESH_PERSISTENCE_SCHEMA_VERSION;
  readonly recordType: "music-project";
  readonly recordId: string;
  readonly storedAt: SeshTimestamp;
  readonly revision?: SeshPersistenceRevision;
  readonly payload: SeshMusicProject;
}

export interface SeshAudioAssetPersistenceEnvelope {
  readonly schemaVersion: typeof SESH_PERSISTENCE_SCHEMA_VERSION;
  readonly recordType: "audio-asset";
  readonly recordId: string;
  readonly storedAt: SeshTimestamp;
  readonly revision?: SeshPersistenceRevision;
  readonly payload: SeshAudioAsset;
}

export type SeshPersistenceEnvelope =
  | SeshCreatorProfilePersistenceEnvelope
  | SeshMusicProjectPersistenceEnvelope
  | SeshAudioAssetPersistenceEnvelope;

export type SeshPersistenceErrorKind =
  | "not-found"
  | "validation"
  | "version"
  | "conflict"
  | "storage";

export interface SeshPersistenceError {
  readonly kind: SeshPersistenceErrorKind;
  readonly message: string;
}

export type SeshPersistenceResult<T> =
  | {
      readonly ok: true;
      readonly value: T;
    }
  | {
      readonly ok: false;
      readonly error: SeshPersistenceError;
    };

export interface SeshStoredAudioObject {
  readonly reference: SeshStorageReference;
  readonly bytes: Uint8Array;
}
