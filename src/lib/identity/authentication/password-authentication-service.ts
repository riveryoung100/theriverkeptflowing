import type {
  PrincipalRepository,
} from "../repository";

import type {
  PasswordHasher,
} from "../credentials/contracts";

import type {
  PasswordCredentialRepository,
} from "../credentials/repository";

import {
  normalizeCredentialEmail,
} from "../credentials/validation";

import type {
  PasswordAuthenticationRequest,
  PasswordAuthenticationResult,
  PasswordAuthenticationService,
} from "./contracts";

function invalidCredentials():
PasswordAuthenticationResult {
  return {
    ok:
      false,

    error: {
      code:
        "invalid-credentials",

      message:
        "Invalid email or password.",
    },
  };
}

function unavailable():
PasswordAuthenticationResult {
  return {
    ok:
      false,

    error: {
      code:
        "unavailable",

      message:
        "Authentication is temporarily unavailable.",
    },
  };
}

export interface DefaultPasswordAuthenticationServiceDependencies {
  readonly principals:
    PrincipalRepository;

  readonly credentials:
    PasswordCredentialRepository;

  readonly passwordHasher:
    PasswordHasher;

  readonly dummyPasswordHash:
    string;
}

export class DefaultPasswordAuthenticationService
implements PasswordAuthenticationService {
  readonly #principals:
    PrincipalRepository;

  readonly #credentials:
    PasswordCredentialRepository;

  readonly #passwordHasher:
    PasswordHasher;

  readonly #dummyPasswordHash:
    string;

  constructor(
    dependencies:
      DefaultPasswordAuthenticationServiceDependencies,
  ) {
    if (
      typeof dependencies.dummyPasswordHash !==
        "string" ||
      dependencies.dummyPasswordHash.length ===
        0
    ) {
      throw new Error(
        "A non-empty dummy password hash is required.",
      );
    }

    this.#principals =
      dependencies.principals;

    this.#credentials =
      dependencies.credentials;

    this.#passwordHasher =
      dependencies.passwordHasher;

    this.#dummyPasswordHash =
      dependencies.dummyPasswordHash;
  }

  async #burnDummyVerification(
    password:
      string,
  ): Promise<boolean> {
    try {
      await this.#passwordHasher.verifyPassword(
        password,
        this.#dummyPasswordHash,
      );

      return true;
    }
    catch {
      return false;
    }
  }

  async authenticate(
    request:
      PasswordAuthenticationRequest,
  ): Promise<
    PasswordAuthenticationResult
  > {
    if (
      typeof request !== "object" ||
      request === null ||
      typeof request.email !== "string" ||
      typeof request.password !== "string"
    ) {
      return invalidCredentials();
    }

    let emailNormalized:
      string;

    try {
      emailNormalized =
        normalizeCredentialEmail(
          request.email,
        );
    }
    catch {
      const burned =
        await this.#burnDummyVerification(
          request.password,
        );

      return burned
        ? invalidCredentials()
        : unavailable();
    }

    let credentialResult:
      Awaited<
        ReturnType<
          PasswordCredentialRepository[
            "getCredentialByNormalizedEmail"
          ]
        >
      >;

    try {
      credentialResult =
        await this.#credentials
          .getCredentialByNormalizedEmail(
            emailNormalized,
          );
    }
    catch {
      return unavailable();
    }

    if (
      !credentialResult.ok
    ) {
      if (
        credentialResult.error.kind ===
        "not-found"
      ) {
        const burned =
          await this.#burnDummyVerification(
            request.password,
          );

        return burned
          ? invalidCredentials()
          : unavailable();
      }

      return unavailable();
    }

    let verification:
      Awaited<
        ReturnType<
          PasswordHasher[
            "verifyPassword"
          ]
        >
      >;

    try {
      verification =
        await this.#passwordHasher
          .verifyPassword(
            request.password,
            credentialResult.value.passwordHash,
          );
    }
    catch {
      return unavailable();
    }

    if (
      verification.verified !==
      true
    ) {
      return invalidCredentials();
    }

    let principalResult:
      Awaited<
        ReturnType<
          PrincipalRepository[
            "getPrincipal"
          ]
        >
      >;

    try {
      principalResult =
        await this.#principals
          .getPrincipal(
            credentialResult.value.principalId,
          );
    }
    catch {
      return unavailable();
    }

    if (
      !principalResult.ok
    ) {
      return unavailable();
    }

    if (
      principalResult.value.principalId !==
      credentialResult.value.principalId
    ) {
      return unavailable();
    }

    if (
      principalResult.value.status !==
      "active"
    ) {
      return invalidCredentials();
    }

    return {
      ok:
        true,

      value: {
        principalId:
          principalResult.value.principalId,

        needsPasswordRehash:
          verification.needsRehash,
      },
    };
  }
}
