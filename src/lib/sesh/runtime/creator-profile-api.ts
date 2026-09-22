import {
  D1PrincipalRepository,
  D1PrincipalSeshCreatorMappingRepository,
} from "../../identity/cloudflare";

import type {
  IdentityD1DatabaseLike,
} from "../../identity/cloudflare";

import {
  DefaultAuthenticatedSeshCreatorResolver,
} from "../../identity/sesh";

import {
  AstroPrincipalSessionStore,
  DefaultSessionPrincipalResolver,
} from "../../identity/session";

import type {
  AstroSessionLike,
} from "../../identity/session";

import {
  DefaultAuthenticatedSeshCreatorProfileOperationService,
  DefaultSeshCreatorProfileProvisioningService,
} from "../operations";

import type {
  AuthenticatedSeshCreatorProfileOperationService,
  SeshCreatorProfileProvisioningService,
} from "../operations";

import {
  D1SeshCreatorHandleReservationRepository,
} from "../persistence/cloudflare/d1-creator-handle-reservation-repository";

import {
  D1SeshCreatorProfileRepository,
} from "../persistence/cloudflare/d1-creator-profile-repository";

import type {
  SeshD1DatabaseLike,
} from "../persistence/cloudflare/types";

export interface SeshCreatorProfileApiRuntimeEnvironment {
  readonly RIVER_IDENTITY_DB?:
    unknown;

  readonly SESH_DB?:
    unknown;
}

function requireIdentityDatabase(
  value:
    unknown,
): IdentityD1DatabaseLike {
  if (
    typeof value !==
      "object" ||
    value ===
      null ||
    typeof (
      value as {
        prepare?: unknown;
      }
    ).prepare !==
      "function"
  ) {
    throw new TypeError(
      "RIVER_IDENTITY_DB is unavailable or does not satisfy the identity D1 database contract.",
    );
  }

  return value as
    IdentityD1DatabaseLike;
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
        prepare?: unknown;
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

export function createSeshCreatorProfileProvisioningAtRuntime(
  session:
    AstroSessionLike,

  runtimeEnvironment:
    SeshCreatorProfileApiRuntimeEnvironment,

  now:
    () => string =
      () =>
        new Date().toISOString(),
): SeshCreatorProfileProvisioningService {
  if (
    typeof session !==
      "object" ||
    session ===
      null
  ) {
    throw new TypeError(
      "Astro session support is required for authenticated Sesh creator provisioning.",
    );
  }

  if (
    typeof runtimeEnvironment !==
      "object" ||
    runtimeEnvironment ===
      null
  ) {
    throw new TypeError(
      "Sesh creator provisioning runtime environment is required.",
    );
  }

  const identityDatabase =
    requireIdentityDatabase(
      runtimeEnvironment
        .RIVER_IDENTITY_DB,
    );

  const seshDatabase =
    requireSeshDatabase(
      runtimeEnvironment
        .SESH_DB,
    );

  const principalResolver =
    new DefaultSessionPrincipalResolver({
      sessions:
        new AstroPrincipalSessionStore(
          session,
        ),

      principals:
        new D1PrincipalRepository(
          identityDatabase,
        ),
    });

  return new DefaultSeshCreatorProfileProvisioningService({
    principalResolver,

    mappings:
      new D1PrincipalSeshCreatorMappingRepository(
        identityDatabase,
      ),

    profiles:
      new D1SeshCreatorProfileRepository(
        seshDatabase,
      ),

    now,
  });
}
export function createAuthenticatedSeshCreatorProfileOperationsAtRuntime(
  session:
    AstroSessionLike,

  runtimeEnvironment:
    SeshCreatorProfileApiRuntimeEnvironment,
): AuthenticatedSeshCreatorProfileOperationService {
  if (
    typeof session !==
      "object" ||
    session ===
      null
  ) {
    throw new TypeError(
      "Astro session support is required for authenticated Sesh creator profile operations.",
    );
  }

  if (
    typeof runtimeEnvironment !==
      "object" ||
    runtimeEnvironment ===
      null
  ) {
    throw new TypeError(
      "Sesh creator profile runtime environment is required.",
    );
  }

  const identityDatabase =
    requireIdentityDatabase(
      runtimeEnvironment
        .RIVER_IDENTITY_DB,
    );

  const seshDatabase =
    requireSeshDatabase(
      runtimeEnvironment
        .SESH_DB,
    );

  const principalResolver =
    new DefaultSessionPrincipalResolver({
      sessions:
        new AstroPrincipalSessionStore(
          session,
        ),

      principals:
        new D1PrincipalRepository(
          identityDatabase,
        ),
    });

  const creatorResolver =
    new DefaultAuthenticatedSeshCreatorResolver({
      principalResolver,

      mappings:
        new D1PrincipalSeshCreatorMappingRepository(
          identityDatabase,
        ),
    });

  return new DefaultAuthenticatedSeshCreatorProfileOperationService({
    creatorResolver,

    profiles:
      new D1SeshCreatorProfileRepository(
        seshDatabase,
      ),

    handles:
      new D1SeshCreatorHandleReservationRepository(
        seshDatabase,
      ),
  });
}
