import {
  DefaultPublicSeshCreatorHandleResolutionService,
} from "../operations";

import type {
  PublicSeshCreatorHandleResolutionService,
} from "../operations";

import {
  D1SeshCreatorHandleReservationRepository,
  D1SeshCreatorProfileRepository,
} from "../persistence/cloudflare";

import type {
  SeshD1DatabaseLike,
} from "../persistence/cloudflare";

export interface PublicSeshCreatorHandleApiRuntimeEnvironment {
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

export function createPublicSeshCreatorHandleResolutionAtRuntime(
  runtimeEnvironment:
    PublicSeshCreatorHandleApiRuntimeEnvironment,
): PublicSeshCreatorHandleResolutionService {
  if (
    typeof runtimeEnvironment !==
      "object" ||
    runtimeEnvironment ===
      null
  ) {
    throw new TypeError(
      "Public Sesh creator handle runtime environment is required.",
    );
  }

  const seshDatabase =
    requireSeshDatabase(
      runtimeEnvironment
        .SESH_DB,
    );

  return new DefaultPublicSeshCreatorHandleResolutionService({
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