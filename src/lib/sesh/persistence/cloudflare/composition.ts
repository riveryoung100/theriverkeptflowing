import {
  D1SeshAudioAssetRepository,
} from "./d1-audio-asset-repository";
import {
  D1SeshCreatorProfileRepository,
} from "./d1-creator-profile-repository";
import {
  D1SeshProjectRepository,
} from "./d1-project-repository";
import {
  D1SeshProjectPublicationRepository,
} from "./d1-project-publication-repository";
import {
  R2SeshAudioObjectStore,
} from "./r2-audio-object-store";
import type {
  SeshD1DatabaseLike,
  SeshR2BucketLike,
} from "./types";

export interface SeshCloudflarePersistenceBindings {
  readonly SESH_DB: SeshD1DatabaseLike;
  readonly SESH_AUDIO: SeshR2BucketLike;
}

export interface SeshCloudflarePersistenceComposition {
  readonly creatorProfileRepository: D1SeshCreatorProfileRepository;
  readonly projectRepository: D1SeshProjectRepository;
  readonly projectPublicationRepository: D1SeshProjectPublicationRepository;
  readonly audioAssetRepository: D1SeshAudioAssetRepository;
  readonly audioObjectStore: R2SeshAudioObjectStore;
}

export function createSeshCloudflarePersistence(
  bindings: SeshCloudflarePersistenceBindings,
): SeshCloudflarePersistenceComposition {
  if (
    typeof bindings !== "object" ||
    bindings === null
  ) {
    throw new TypeError(
      "Sesh Cloudflare persistence bindings are required.",
    );
  }

  if (
    typeof bindings.SESH_DB !== "object" ||
    bindings.SESH_DB === null ||
    typeof bindings.SESH_DB.prepare !== "function"
  ) {
    throw new TypeError(
      "SESH_DB must provide the Sesh D1 database contract.",
    );
  }

  if (
    typeof bindings.SESH_AUDIO !== "object" ||
    bindings.SESH_AUDIO === null ||
    typeof bindings.SESH_AUDIO.put !== "function" ||
    typeof bindings.SESH_AUDIO.get !== "function" ||
    typeof bindings.SESH_AUDIO.delete !== "function" ||
    typeof bindings.SESH_AUDIO.head !== "function"
  ) {
    throw new TypeError(
      "SESH_AUDIO must provide the Sesh R2 bucket contract.",
    );
  }

  return {
    creatorProfileRepository:
      new D1SeshCreatorProfileRepository(bindings.SESH_DB),

    projectRepository:
      new D1SeshProjectRepository(bindings.SESH_DB),

    projectPublicationRepository:
      new D1SeshProjectPublicationRepository(bindings.SESH_DB),

    audioAssetRepository:
      new D1SeshAudioAssetRepository(bindings.SESH_DB),

    audioObjectStore:
      new R2SeshAudioObjectStore(bindings.SESH_AUDIO),
  };
}
