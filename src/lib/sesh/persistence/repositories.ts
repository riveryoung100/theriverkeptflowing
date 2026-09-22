import type {
  SeshAudioAssetId,
  SeshMusicProjectId,
} from "../identifiers";
import type {
  SeshAudioAsset,
  SeshMusicProject,
  SeshStorageReference,
} from "../model";
import type {
  SeshPersistenceResult,
  SeshProjectPersistenceSnapshot,
  SeshStoredAudioObject,
} from "./model";

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

export interface SeshAudioAssetRepository {
  saveAudioAsset(
    asset: unknown,
  ): Promise<SeshPersistenceResult<SeshAudioAsset>>;

  getAudioAsset(
    assetId: SeshAudioAssetId,
  ): Promise<SeshPersistenceResult<SeshAudioAsset>>;

  listAudioAssetsForProject(
    projectId: SeshMusicProjectId,
  ): Promise<SeshPersistenceResult<readonly SeshAudioAsset[]>>;

  deleteAudioAssetMetadata(
    assetId: SeshAudioAssetId,
  ): Promise<SeshPersistenceResult<boolean>>;
}

export interface SeshAudioObjectStore {
  putObject(
    reference: SeshStorageReference,
    bytes: Uint8Array,
  ): Promise<SeshPersistenceResult<SeshStorageReference>>;

  getObject(
    reference: SeshStorageReference,
  ): Promise<SeshPersistenceResult<SeshStoredAudioObject>>;

  deleteObject(
    reference: SeshStorageReference,
  ): Promise<SeshPersistenceResult<boolean>>;

  objectExists(
    reference: SeshStorageReference,
  ): Promise<SeshPersistenceResult<boolean>>;
}
