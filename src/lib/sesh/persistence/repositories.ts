import type {
  SeshCreatorHandle,
  SeshCreatorHandleReservation,
} from "../creator-handle";
import type {
  SeshAudioAssetId,
  SeshCreatorId,
  SeshMusicProjectId,
} from "../identifiers";
import type {
  SeshAudioAsset,
  SeshCreatorProfile,
  SeshMusicProject,
  SeshStorageReference,
} from "../model";
import type {
  SeshCreatorProfilePersistenceSnapshot,
  SeshPersistenceResult,
  SeshProjectPersistenceSnapshot,
  SeshStoredAudioObject,
} from "./model";

export interface SeshCreatorHandleReservationRepository {
  reserveHandle(
    reservation:
      unknown,
  ): Promise<
    SeshPersistenceResult<
      SeshCreatorHandleReservation
    >
  >;

  getByHandle(
    normalizedHandle:
      SeshCreatorHandle,
  ): Promise<
    SeshPersistenceResult<
      SeshCreatorHandleReservation
    >
  >;

  getByCreatorId(
    creatorId:
      SeshCreatorId,
  ): Promise<
    SeshPersistenceResult<
      SeshCreatorHandleReservation
    >
  >;

  releaseHandle(
    normalizedHandle:
      SeshCreatorHandle,

    creatorId:
      SeshCreatorId,
  ): Promise<
    SeshPersistenceResult<boolean>
  >;
}
export interface SeshCreatorProfileRepository {
  saveCreatorProfile(
    profile: unknown,
  ): Promise<
    SeshPersistenceResult<
      SeshCreatorProfile
    >
  >;

  getCreatorProfile(
    creatorId:
      SeshCreatorId,
  ): Promise<
    SeshPersistenceResult<
      SeshCreatorProfile
    >
  >;

  getCreatorProfileSnapshot(
    creatorId:
      SeshCreatorId,
  ): Promise<
    SeshPersistenceResult<
      SeshCreatorProfilePersistenceSnapshot
    >
  >;

  updateCreatorProfileConditionally(
    profile:
      unknown,
    expectedRevision:
      number,
  ): Promise<
    SeshPersistenceResult<
      SeshCreatorProfilePersistenceSnapshot
    >
  >;

  creatorProfileExists(
    creatorId:
      SeshCreatorId,
  ): Promise<
    SeshPersistenceResult<boolean>
  >;
}
export interface SeshProjectRepository {
  saveProject(
    project: unknown,
  ): Promise<SeshPersistenceResult<SeshMusicProject>>;

  getProject(
    projectId: SeshMusicProjectId,
  ): Promise<SeshPersistenceResult<SeshMusicProject>>;

  listProjectsForOwner(
    ownerCreatorId: string,
  ): Promise<SeshPersistenceResult<readonly SeshMusicProject[]>>;

  getProjectSnapshot(
    projectId: SeshMusicProjectId,
  ): Promise<SeshPersistenceResult<SeshProjectPersistenceSnapshot>>;

  updateProjectConditionally(
    project: unknown,
    expectedRevision: number,
    expectedOwnerCreatorId: string,
  ): Promise<SeshPersistenceResult<SeshProjectPersistenceSnapshot>>;

  deleteProjectConditionally(
    projectId: SeshMusicProjectId,
    expectedRevision: number,
    expectedOwnerCreatorId: string,
  ): Promise<SeshPersistenceResult<boolean>>;

  deleteProject(
    projectId: SeshMusicProjectId,
  ): Promise<SeshPersistenceResult<boolean>>;

  projectExists(
    projectId: SeshMusicProjectId,
  ): Promise<SeshPersistenceResult<boolean>>;
}

export interface SeshAudioAssetPersistenceSnapshot {
  readonly asset:
    SeshAudioAsset;

  readonly revision:
    number;
}

export interface SeshAudioAssetRepository {
  saveAudioAsset(
    asset: unknown,
  ): Promise<SeshPersistenceResult<SeshAudioAsset>>;

  getAudioAsset(
    assetId: SeshAudioAssetId,
  ): Promise<SeshPersistenceResult<SeshAudioAsset>>;

  getAudioAssetSnapshot(
    assetId: SeshAudioAssetId,
  ): Promise<
    SeshPersistenceResult<
      SeshAudioAssetPersistenceSnapshot
    >
  >;

  updateAudioAssetConditionally(
    asset: unknown,
    expectedRevision: number,
  ): Promise<
    SeshPersistenceResult<
      SeshAudioAssetPersistenceSnapshot
    >
  >;

  listAudioAssetsForProject(
    projectId: SeshMusicProjectId,
  ): Promise<SeshPersistenceResult<readonly SeshAudioAsset[]>>;

  deleteAudioAssetMetadata(
    assetId: SeshAudioAssetId,
  ): Promise<SeshPersistenceResult<boolean>>;
}

export interface SeshAudioObjectReadRange {
  readonly offset?:
    number;

  readonly length?:
    number;

  readonly suffix?:
    number;
}

export interface SeshResolvedAudioObjectRange {
  readonly offset:
    number;

  readonly length:
    number;
}

export interface SeshStoredAudioObjectRead
extends SeshStoredAudioObject {
  readonly totalSize?:
    number;

  readonly range?:
    SeshResolvedAudioObjectRange;
}

export interface SeshAudioObjectStore {
  putObject(
    reference: SeshStorageReference,
    bytes: Uint8Array,
  ): Promise<SeshPersistenceResult<SeshStorageReference>>;

  getObject(
    reference: SeshStorageReference,
    range?: SeshAudioObjectReadRange,
  ): Promise<SeshPersistenceResult<SeshStoredAudioObjectRead>>;

  deleteObject(
    reference: SeshStorageReference,
  ): Promise<SeshPersistenceResult<boolean>>;

  objectExists(
    reference: SeshStorageReference,
  ): Promise<SeshPersistenceResult<boolean>>;
}
