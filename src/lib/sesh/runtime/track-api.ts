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
  createSeshTrackId,
} from "../identifiers";

import {
  DefaultAuthorizedSeshTrackOperationService,
} from "../operations";

import type {
  AuthorizedSeshTrackOperationService,
} from "../operations";

import {
  D1SeshProjectRepository,
  D1SeshTrackRepository,
} from "../persistence/cloudflare";

import type {
  SeshD1DatabaseLike,
} from "../persistence/cloudflare";

export interface SeshTrackApiRuntimeEnvironment {
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

export function createAuthorizedSeshTrackOperationsAtRuntime(
  session:
    AstroSessionLike,

  runtimeEnvironment:
    SeshTrackApiRuntimeEnvironment,

  now:
    () => string =
      () =>
        new Date().toISOString(),

  createTrackId =
    () =>
      createSeshTrackId(
        crypto.randomUUID(),
      ),
): AuthorizedSeshTrackOperationService {
  if (
    typeof session !==
      "object" ||
    session ===
      null
  ) {
    throw new TypeError(
      "Astro session support is required for authenticated Sesh track operations.",
    );
  }

  if (
    typeof runtimeEnvironment !==
      "object" ||
    runtimeEnvironment ===
      null
  ) {
    throw new TypeError(
      "Sesh track API runtime environment is required.",
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

  return new DefaultAuthorizedSeshTrackOperationService({
    authorizer,

    projects:
      projectRepository,

    tracks:
      trackRepository,

    now,

    createTrackId,
  });
}