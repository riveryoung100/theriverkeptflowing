import {
  DefaultPublicSeshProjectResolutionService,
} from "../operations";

import type {
  PublicSeshProjectResolutionService,
} from "../operations";

import {
  D1SeshProjectPublicationRepository,
  D1SeshProjectRepository,
} from "../persistence/cloudflare";

import type {
  SeshD1DatabaseLike,
} from "../persistence/cloudflare";

export interface PublicSeshProjectApiRuntimeEnvironment {
  readonly SESH_DB?:
    unknown;
}

function requireSeshDatabase(
  value:
    unknown,
): SeshD1DatabaseLike {
  if (
    typeof value !== "object" ||
    value === null ||
    typeof (
      value as {
        prepare?: unknown;
      }
    ).prepare !== "function"
  ) {
    throw new TypeError(
      "SESH_DB is unavailable or does not satisfy the Sesh D1 database contract.",
    );
  }

  return value as
    SeshD1DatabaseLike;
}

export function createPublicSeshProjectResolutionAtRuntime(
  runtimeEnvironment:
    PublicSeshProjectApiRuntimeEnvironment,
): PublicSeshProjectResolutionService {
  if (
    typeof runtimeEnvironment !== "object" ||
    runtimeEnvironment === null
  ) {
    throw new TypeError(
      "Public Sesh project runtime environment is required.",
    );
  }

  const seshDatabase =
    requireSeshDatabase(
      runtimeEnvironment
        .SESH_DB,
    );

  return new DefaultPublicSeshProjectResolutionService({
    publications:
      new D1SeshProjectPublicationRepository(
        seshDatabase,
      ),

    projects:
      new D1SeshProjectRepository(
        seshDatabase,
      ),
  });
}