import type {
  PrincipalId,
} from "./identifiers";
import type {
  AuthenticatedPrincipal,
} from "./model";
import type {
  PrincipalRepository,
  PrincipalRepositoryResult,
} from "./repository";
import {
  validateAuthenticatedPrincipal,
} from "./validation";

function clonePrincipal(
  principal: AuthenticatedPrincipal,
): AuthenticatedPrincipal {
  return {
    principalId:
      principal.principalId,
    status:
      principal.status,
    ...(principal.displayName === undefined
      ? {}
      : {
          displayName:
            principal.displayName,
        }),
    createdAt:
      principal.createdAt,
    updatedAt:
      principal.updatedAt,
  };
}

export class InMemoryPrincipalRepository
implements PrincipalRepository {
  readonly #principals =
    new Map<
      PrincipalId,
      AuthenticatedPrincipal
    >();

  async savePrincipal(
    principal: unknown,
  ): Promise<
    PrincipalRepositoryResult<AuthenticatedPrincipal>
  > {
    let validated:
      AuthenticatedPrincipal;

    try {
      validated =
        validateAuthenticatedPrincipal(
          principal,
        );
    }
    catch (error) {
      return {
        ok: false,
        error: {
          code:
            "validation",
          message:
            error instanceof Error
              ? error.message
              : "Principal validation failed.",
        },
      };
    }

    const existing =
      this.#principals.get(
        validated.principalId,
      );

    if (
      existing !== undefined &&
      existing.createdAt !==
        validated.createdAt
    ) {
      return {
        ok: false,
        error: {
          code:
            "conflict",
          message:
            "Principal createdAt cannot change under an existing PrincipalId.",
        },
      };
    }

    const stored =
      clonePrincipal(
        validated,
      );

    this.#principals.set(
      stored.principalId,
      stored,
    );

    return {
      ok: true,
      value:
        clonePrincipal(
          stored,
        ),
    };
  }

  async getPrincipal(
    principalId: PrincipalId,
  ): Promise<
    PrincipalRepositoryResult<AuthenticatedPrincipal>
  > {
    const principal =
      this.#principals.get(
        principalId,
      );

    if (principal === undefined) {
      return {
        ok: false,
        error: {
          code:
            "not-found",
          message:
            "Principal was not found.",
        },
      };
    }

    return {
      ok: true,
      value:
        clonePrincipal(
          principal,
        ),
    };
  }

  async principalExists(
    principalId: PrincipalId,
  ): Promise<
    PrincipalRepositoryResult<boolean>
  > {
    return {
      ok: true,
      value:
        this.#principals.has(
          principalId,
        ),
    };
  }
}
