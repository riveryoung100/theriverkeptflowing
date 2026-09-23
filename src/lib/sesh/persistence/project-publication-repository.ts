import type {
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

  updateProjectPublication(
    record: unknown,
  ): Promise<
    SeshPersistenceResult<
      SeshProjectPublicationRecord
    >
  >;
}