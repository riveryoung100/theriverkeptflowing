import type {
  PrincipalRepository,
} from "../repository";

import type {
  PrincipalId,
} from "../identifiers";

import type {
  PrincipalSessionStore,
} from "./contracts";

export type SessionPrincipalResolutionFailureCode =
  | "unauthenticated"
  | "unavailable";

export type SessionPrincipalResolutionResult =
  | {
      readonly ok:
        true;

      readonly value: {
        readonly principalId:
          PrincipalId;
      };
    }
  | {
      readonly ok:
        false;

      readonly error: {
        readonly code:
          SessionPrincipalResolutionFailureCode;

        readonly message:
          string;
      };
    };

export interface SessionPrincipalResolver {
  resolve():
  Promise<
    SessionPrincipalResolutionResult
  >;
}

export interface DefaultSessionPrincipalResolverDependencies {
  readonly sessions:
    PrincipalSessionStore;

  readonly principals:
    PrincipalRepository;
}

function unauthenticated():
SessionPrincipalResolutionResult {
  return {
    ok:
      false,

    error: {
      code:
        "unauthenticated",

      message:
        "Authentication is required.",
    },
  };
}

function unavailable():
SessionPrincipalResolutionResult {
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

export class DefaultSessionPrincipalResolver
implements SessionPrincipalResolver {
  readonly #sessions:
    PrincipalSessionStore;

  readonly #principals:
    PrincipalRepository;

  constructor(
    dependencies:
      DefaultSessionPrincipalResolverDependencies,
  ) {
    this.#sessions =
      dependencies.sessions;

    this.#principals =
      dependencies.principals;
  }

  async #invalidateStaleSession():
  Promise<boolean> {
    try {
      await this.#sessions
        .destroySession();

      return true;
    }
    catch {
      return false;
    }
  }

  async resolve():
  Promise<
    SessionPrincipalResolutionResult
  > {
    let session:
      Awaited<
        ReturnType<
          PrincipalSessionStore[
            "getSession"
          ]
        >
      >;

    try {
      session =
        await this.#sessions
          .getSession();
    }
    catch {
      return unavailable();
    }

    if (
      session ===
      null
    ) {
      return unauthenticated();
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
            session.principalId,
          );
    }
    catch {
      return unavailable();
    }

    if (
      !principalResult.ok
    ) {
      if (
        principalResult.error.code ===
        "not-found"
      ) {
        const invalidated =
          await this.#invalidateStaleSession();

        return invalidated
          ? unauthenticated()
          : unavailable();
      }

      return unavailable();
    }

    if (
      principalResult.value.principalId !==
      session.principalId
    ) {
      const invalidated =
        await this.#invalidateStaleSession();

      return invalidated
        ? unauthenticated()
        : unavailable();
    }

    if (
      principalResult.value.status !==
      "active"
    ) {
      const invalidated =
        await this.#invalidateStaleSession();

      return invalidated
        ? unauthenticated()
        : unavailable();
    }

    return {
      ok:
        true,

      value: {
        principalId:
          principalResult.value.principalId,
      },
    };
  }
}
