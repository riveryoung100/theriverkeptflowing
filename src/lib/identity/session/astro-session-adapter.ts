import type {
  PrincipalId,
} from "../identifiers";

import type {
  AstroSessionLike,
  PrincipalSessionStore,
} from "./contracts";

import {
  AUTHENTICATED_PRINCIPAL_SESSION_KEY,
  AUTHENTICATED_PRINCIPAL_SESSION_TTL_SECONDS,
  AUTHENTICATED_PRINCIPAL_SESSION_VERSION,
} from "./model";

import type {
  AuthenticatedPrincipalSession,
} from "./model";

import {
  isAuthenticatedPrincipalSessionExpired,
  validateAuthenticatedPrincipalSession,
} from "./validation";

export class AstroPrincipalSessionStore
implements PrincipalSessionStore {
  readonly #session:
    AstroSessionLike;

  readonly #now:
    () => Date;

  constructor(
    session:
      AstroSessionLike,
    now:
      () => Date =
        () =>
          new Date(),
  ) {
    this.#session =
      session;

    this.#now =
      now;
  }

  async createSession(
    principalId:
      PrincipalId,
  ): Promise<
    AuthenticatedPrincipalSession
  > {
    await this.#session.regenerate();

    const authenticatedAtDate =
      this.#now();

    const expiresAtDate =
      new Date(
        authenticatedAtDate.getTime() +
        AUTHENTICATED_PRINCIPAL_SESSION_TTL_SECONDS *
          1000,
      );

    const payload =
      validateAuthenticatedPrincipalSession({
        version:
          AUTHENTICATED_PRINCIPAL_SESSION_VERSION,

        principalId,

        authenticatedAt:
          authenticatedAtDate.toISOString(),

        expiresAt:
          expiresAtDate.toISOString(),
      });

    this.#session.set(
      AUTHENTICATED_PRINCIPAL_SESSION_KEY,
      payload,
      {
        ttl:
          AUTHENTICATED_PRINCIPAL_SESSION_TTL_SECONDS,
      },
    );

    return payload;
  }

  async getSession():
  Promise<
    AuthenticatedPrincipalSession |
    null
  > {
    const raw =
      this.#session.get(
        AUTHENTICATED_PRINCIPAL_SESSION_KEY,
      );

    if (
      raw ===
        undefined ||
      raw ===
        null
    ) {
      return null;
    }

    let validated:
      AuthenticatedPrincipalSession;

    try {
      validated =
        validateAuthenticatedPrincipalSession(
          raw,
        );
    }
    catch {
      this.#session.delete(
        AUTHENTICATED_PRINCIPAL_SESSION_KEY,
      );

      return null;
    }

    if (
      isAuthenticatedPrincipalSessionExpired(
        validated,
        this.#now(),
      )
    ) {
      this.#session.delete(
        AUTHENTICATED_PRINCIPAL_SESSION_KEY,
      );

      return null;
    }

    return validated;
  }

  async destroySession():
  Promise<void> {
    await this.#session.destroy();
  }
}
