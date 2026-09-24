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
  createSeshAudioAssetId,
  type SeshAudioAssetId,
} from "../identifiers";

import {
  DefaultCreatorAudioUploadService,
  type CreatorAudioUploadService,
} from "../operations/creator-audio-upload-service";

import {
  createPrivateSeshAudioStorageReference,
} from "../persistence/cloudflare/private-audio-storage-reference";

import {
  createSeshRuntimePersistence,
} from "./cloudflare";

import type {
  SeshProjectApiRuntimeEnvironment,
} from "./project-api";

export type CreatorAudioUploadApiRuntimeEnvironment =
  SeshProjectApiRuntimeEnvironment;

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

export function createCreatorAudioUploadAtRuntime(
  session:
    AstroSessionLike,

  runtimeEnvironment:
    CreatorAudioUploadApiRuntimeEnvironment,

  now:
    () => string =
      () =>
        new Date().toISOString(),

  createAudioAssetId:
    () => SeshAudioAssetId =
      () =>
        createSeshAudioAssetId(
          crypto.randomUUID(),
        ),
): CreatorAudioUploadService {
  if (
    typeof session !==
      "object" ||
    session ===
      null
  ) {
    throw new TypeError(
      "Astro session support is required for private Sesh audio upload.",
    );
  }

  if (
    typeof runtimeEnvironment !==
      "object" ||
    runtimeEnvironment ===
      null
  ) {
    throw new TypeError(
      "Sesh audio upload runtime environment is required.",
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

  return new DefaultCreatorAudioUploadService({
    authorizer,

    projects:
      persistence.projectRepository,

    audioAssets:
      persistence.audioAssetRepository,

    audioObjects:
      persistence.audioObjectStore,

    now,

    createAudioAssetId,

    createStorageReference:
      createPrivateSeshAudioStorageReference,
  });
}