import type {
  SeshCreatorId,
  SeshMusicProjectId,
} from "../identifiers";

import type {
  SeshProjectPublicationRecord,
} from "../project-publication";

import type {
  SeshPersistenceResult,
} from "./model";

export interface SeshProjectPublicationRepository {
  saveProjectPublication(
    record: unknown,
  ): Promise<
    SeshPersistenceResult<
      SeshProjectPublicationRecord
    >
  >;

  getProjectPublication(
    projectId: SeshMusicProjectId,
  ): Promise<
    SeshPersistenceResult<
      SeshProjectPublicationRecord
    >
  >;

  listPublicProjectPublicationsForOwner(
    ownerCreatorId:
      SeshCreatorId,
  ): Promise<
    SeshPersistenceResult<
      readonly SeshProjectPublicationRecord[]
    >
  >;

  updateProjectPublication(
    record: unknown,
  ): Promise<
    SeshPersistenceResult<
      SeshProjectPublicationRecord
    >
  >;
}