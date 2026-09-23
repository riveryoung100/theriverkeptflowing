import {
  DefaultPasswordAuthenticationService,
} from "../authentication";

import {
  D1PasswordCredentialRepository,
  D1PrincipalRepository,
} from "../cloudflare";

import type {
  IdentityD1DatabaseLike,
} from "../cloudflare";

import {
  Argon2idPasswordHasher,
} from "../credentials";

import {
  AstroPrincipalSessionStore,
} from "../session";

import type {
  AstroSessionLike,
  PrincipalSessionStore,
} from "../session";

import type {
  PasswordAuthenticationService,
} from "../authentication";

const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$cml2ZXItc2VzaC1kdW1teTE$xWTll6aNp7bolxNvnHFw+2qfqWgKz9BEDQAb2Qf5eNw";

export interface PrincipalLoginRuntimeEnvironment {
  readonly RIVER_IDENTITY_DB?:
    unknown;
}

export interface PrincipalLoginRuntime {
  readonly authentication:
    PasswordAuthenticationService;

  readonly sessions:
    PrincipalSessionStore;
}

function identityDatabase(
  environment:
    PrincipalLoginRuntimeEnvironment,
): IdentityD1DatabaseLike {
  const database =
    environment.RIVER_IDENTITY_DB;

  if (
    typeof database !==
      "object" ||
    database ===
      null ||
    typeof (
      database as {
        prepare?:
          unknown;
      }
    ).prepare !==
      "function"
  ) {
    throw new TypeError(
      "RIVER_IDENTITY_DB binding is required for Principal authentication.",
    );
  }

  return database as
    IdentityD1DatabaseLike;
}

export function createPrincipalLoginRuntime(
  session:
    AstroSessionLike,
  environment:
    PrincipalLoginRuntimeEnvironment,
): PrincipalLoginRuntime {
  if (
    typeof session !==
      "object" ||
    session ===
      null
  ) {
    throw new TypeError(
      "Astro session support is required for Principal authentication.",
    );
  }

  const database =
    identityDatabase(
      environment,
    );

  const principals =
    new D1PrincipalRepository(
      database,
    );

  const credentials =
    new D1PasswordCredentialRepository(
      database,
    );

  const passwordHasher =
    new Argon2idPasswordHasher();

  const sessions =
    new AstroPrincipalSessionStore(
      session,
    );

  const authentication =
    new DefaultPasswordAuthenticationService({
      principals,
      credentials,
      passwordHasher,
      dummyPasswordHash:
        DUMMY_PASSWORD_HASH,
    });

  return {
    authentication,
    sessions,
  };
}

export function createPrincipalLogoutRuntime(
  session:
    AstroSessionLike,
): PrincipalSessionStore {
  if (
    typeof session !==
      "object" ||
    session ===
      null
  ) {
    throw new TypeError(
      "Astro session support is required for Principal logout.",
    );
  }

  return new AstroPrincipalSessionStore(
    session,
  );
}
