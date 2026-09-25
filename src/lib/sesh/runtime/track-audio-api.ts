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
  DefaultAuthorizedSeshTrackAudioOperationService,
} from "../operations";

import type {
  AuthorizedSeshTrackAudioOperationService,
} from "../operations";

import {
  D1SeshAudioAssetRepository,
  D1SeshProjectRepository,
  D1SeshTrackRepository,
} from "../persistence/cloudflare";

import type {
  SeshD1DatabaseLike,
} from "../persistence/cloudflare";

export interface SeshTrackAudioApiRuntimeEnvironment {
  readonly SESH_DB?:
    unknown;

  readonly RIVER_IDENTITY_DB?:
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
        prepare?:
          unknown;
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

export function createAuthorizedSeshTrackAudioOperationsAtRuntime(
  session:
    AstroSessionLike,

  runtimeEnvironment:
    SeshTrackAudioApiRuntimeEnvironment,
): AuthorizedSeshTrackAudioOperationService {
  if (
    typeof session !==
      "object" ||
    session ===
      null
  ) {
    throw new TypeError(
      "Astro session support is required for private Sesh track audio operations.",
    );
  }

  if (
    typeof runtimeEnvironment !==
      "object" ||
    runtimeEnvironment ===
      null
  ) {
    throw new TypeError(
      "Sesh track audio runtime environment is required.",
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

  const projects =
    new D1SeshProjectRepository(
      seshDatabase,
    );

  const tracks =
    new D1SeshTrackRepository(
      seshDatabase,
    );

  const audioAssets =
    new D1SeshAudioAssetRepository(
      seshDatabase,
    );

  const authorizer =
    new DefaultSeshProjectOwnershipAuthorizer({
      creatorResolver,
      projects,
    });

  return new DefaultAuthorizedSeshTrackAudioOperationService({
    authorizer,
    projects,
    tracks,
    audioAssets,
  });
}