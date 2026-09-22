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
  DefaultAuthenticatedSeshProjectCollectionService,
  DefaultAuthorizedSeshProjectOperationService,
} from "../operations";

import type {
  AuthenticatedSeshProjectCollectionService,
  AuthorizedSeshProjectOperationService,
} from "../operations";

import {
  createSeshRuntimePersistence,
} from "./cloudflare";

import type {
  SeshRuntimeEnvironment,
} from "./cloudflare";

export interface SeshProjectApiRuntimeEnvironment
  extends SeshRuntimeEnvironment {
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

export function createAuthorizedSeshProjectOperationsAtRuntime(
  session:
    AstroSessionLike,

  runtimeEnvironment:
    SeshProjectApiRuntimeEnvironment,

  now:
    () => string =
      () =>
        new Date().toISOString(),
): AuthorizedSeshProjectOperationService {
  if (
    typeof session !==
      "object" ||
    session ===
      null
  ) {
    throw new TypeError(
      "Astro session support is required for authenticated Sesh project operations.",
    );
  }

  if (
    typeof runtimeEnvironment !==
      "object" ||
    runtimeEnvironment ===
      null
  ) {
    throw new TypeError(
      "Sesh project API runtime environment is required.",
    );
  }

  const identityDatabase =
    requireIdentityDatabase(
      runtimeEnvironment
        .RIVER_IDENTITY_DB,
    );

  const persistence =
    createSeshRuntimePersistence(
      runtimeEnvironment,
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
        persistence.projectRepository,
    });

  return new DefaultAuthorizedSeshProjectOperationService({
    authorizer,

    projects:
      persistence.projectRepository,

    now,
  });
}
export function createAuthenticatedSeshProjectCollectionAtRuntime(
  session:
    AstroSessionLike,

  runtimeEnvironment:
    SeshProjectApiRuntimeEnvironment,

  now:
    () => string =
      () =>
        new Date().toISOString(),

  createProjectId:
    () => SeshMusicProjectId =
      () =>
        createSeshMusicProjectId(
          crypto.randomUUID(),
        ),
): AuthenticatedSeshProjectCollectionService {
  if (
    typeof session !==
      "object" ||
    session ===
      null
  ) {
    throw new TypeError(
      "Astro session support is required for authenticated Sesh project collection operations.",
    );
  }

  if (
    typeof runtimeEnvironment !==
      "object" ||
    runtimeEnvironment ===
      null
  ) {
    throw new TypeError(
      "Sesh project collection runtime environment is required.",
    );
  }

  const identityDatabase =
    requireIdentityDatabase(
      runtimeEnvironment
        .RIVER_IDENTITY_DB,
    );

  const persistence =
    createSeshRuntimePersistence(
      runtimeEnvironment,
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

  return new DefaultAuthenticatedSeshProjectCollectionService({
    creatorResolver,

    projects:
      persistence.projectRepository,

    now,

    createProjectId,
  });
}