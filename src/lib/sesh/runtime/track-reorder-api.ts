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
  DefaultSeshProjectOwnershipAuthorizer,
} from "../authorization";

import {
  DefaultAuthorizedSeshTrackReorderOperationService,
} from "../operations";

import {
  D1SeshProjectRepository,
  D1SeshTrackRepository,
} from "../persistence/cloudflare";

import type {
  SeshD1DatabaseLike,
} from "../persistence/cloudflare";

export interface SeshTrackReorderApiRuntimeEnvironment {
  readonly SESH_DB?:
    unknown;

  readonly RIVER_IDENTITY_DB?:
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
      "SESH_DB D1 binding is required for Sesh track reorder.",
    );
  }

  return value as
    SeshD1DatabaseLike;
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
        prepare?:
          unknown;
      }
    ).prepare !==
      "function"
  ) {
    throw new TypeError(
      "RIVER_IDENTITY_DB D1 binding is required for Sesh track reorder.",
    );
  }

  return value as
    IdentityD1DatabaseLike;
}

export function createAuthorizedSeshTrackReorderAtRuntime(
  session:
    AstroSessionLike,

  runtimeEnvironment:
    SeshTrackReorderApiRuntimeEnvironment,
) {
  if (
    typeof session !==
      "object" ||
    session ===
      null
  ) {
    throw new TypeError(
      "Astro session support is required for authenticated Sesh track reorder.",
    );
  }

  if (
    typeof runtimeEnvironment !==
      "object" ||
    runtimeEnvironment ===
      null
  ) {
    throw new TypeError(
      "Sesh track reorder runtime environment is required.",
    );
  }

  const seshDatabase =
    requireSeshDatabase(
      runtimeEnvironment
        .SESH_DB,
    );

  const identityDatabase =
    requireIdentityDatabase(
      runtimeEnvironment
        .RIVER_IDENTITY_DB,
    );

  const projectRepository =
    new D1SeshProjectRepository(
      seshDatabase,
    );

  const trackRepository =
    new D1SeshTrackRepository(
      seshDatabase,
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

  const authorizer =
    new DefaultSeshProjectOwnershipAuthorizer({
      creatorResolver,

      projects:
        projectRepository,
    });

  return new DefaultAuthorizedSeshTrackReorderOperationService({
    authorizer,

    projects:
      projectRepository,

    tracks:
      trackRepository,

    reorderPersistence:
      trackRepository,
  });
}