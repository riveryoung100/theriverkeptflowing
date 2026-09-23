import {
  DefaultPublicSeshProjectPresentationService,
} from "../operations/public-project-presentation-service";

import type {
  PublicSeshProjectPresentationService,
} from "../operations/public-project-presentation-service";

import {
  D1SeshCreatorHandleReservationRepository,
  D1SeshCreatorProfileRepository,
  D1SeshProjectPublicationRepository,
  D1SeshProjectRepository,
} from "../persistence/cloudflare";

import type {
  SeshD1DatabaseLike,
} from "../persistence/cloudflare";

export interface PublicSeshProjectPresentationRuntimeEnvironment {
  readonly SESH_DB?:
    unknown;
}

function requireSeshDatabase(
  value:
    unknown,
): SeshD1DatabaseLike {
  if (
    typeof value !==
      "object" ||
    value ===
      null ||
    typeof (
      value as {
        prepare?:
          unknown;
      }
    ).prepare !==
      "function"
  ) {
    throw new TypeError(
      "SESH_DB is unavailable or does not satisfy the Sesh D1 database contract.",
    );
  }

  return value as
    SeshD1DatabaseLike;
}

export function createPublicSeshProjectPresentationAtRuntime(
  runtimeEnvironment:
    PublicSeshProjectPresentationRuntimeEnvironment,
): PublicSeshProjectPresentationService {
  if (
    typeof runtimeEnvironment !==
      "object" ||
    runtimeEnvironment ===
      null
  ) {
    throw new TypeError(
      "Public Sesh project presentation runtime environment is required.",
    );
  }

  const seshDatabase =
    requireSeshDatabase(
      runtimeEnvironment
        .SESH_DB,
    );

  return new DefaultPublicSeshProjectPresentationService({
    publications:
      new D1SeshProjectPublicationRepository(
        seshDatabase,
      ),

    projects:
      new D1SeshProjectRepository(
        seshDatabase,
      ),

    reservations:
      new D1SeshCreatorHandleReservationRepository(
        seshDatabase,
      ),

    profiles:
      new D1SeshCreatorProfileRepository(
        seshDatabase,
      ),
  });
}