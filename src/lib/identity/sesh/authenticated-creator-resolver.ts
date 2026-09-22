import type {
  PrincipalId,
} from "../identifiers";

import type {
  SessionPrincipalResolver,
} from "../session/principal-resolver";

import {
  parseSeshCreatorId,
} from "../../sesh/identifiers";

import type {
  SeshCreatorId,
} from "../../sesh/identifiers";

import type {
  PrincipalSeshCreatorMappingRepository,
} from "./creator-mapping-repository";

export type AuthenticatedSeshCreatorResolutionFailureCode =
  | "unauthenticated"
  | "unmapped"
  | "unavailable";

export type AuthenticatedSeshCreatorResolutionResult =
  | {
      readonly ok:
        true;

      readonly value: {
        readonly principalId:
          PrincipalId;

        readonly seshCreatorId:
          SeshCreatorId;
      };
    }
  | {
      readonly ok:
        false;

      readonly error: {
        readonly code:
          AuthenticatedSeshCreatorResolutionFailureCode;

        readonly message:
          string;
      };
    };

export interface AuthenticatedSeshCreatorResolver {
  resolve():
  Promise<
    AuthenticatedSeshCreatorResolutionResult
  >;
}

export interface DefaultAuthenticatedSeshCreatorResolverDependencies {
  readonly principalResolver:
    SessionPrincipalResolver;

  readonly mappings:
    PrincipalSeshCreatorMappingRepository;
}

function unauthenticated():
AuthenticatedSeshCreatorResolutionResult {
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

function unmapped():
AuthenticatedSeshCreatorResolutionResult {
  return {
    ok:
      false,

    error: {
      code:
        "unmapped",

      message:
        "No Sesh creator identity is provisioned for the authenticated principal.",
    },
  };
}

function unavailable():
AuthenticatedSeshCreatorResolutionResult {
  return {
    ok:
      false,

    error: {
      code:
        "unavailable",

      message:
        "Sesh creator identity is temporarily unavailable.",
    },
  };
}

export class DefaultAuthenticatedSeshCreatorResolver
implements AuthenticatedSeshCreatorResolver {
  readonly #principalResolver:
    SessionPrincipalResolver;

  readonly #mappings:
    PrincipalSeshCreatorMappingRepository;

  constructor(
    dependencies:
      DefaultAuthenticatedSeshCreatorResolverDependencies,
  ) {
    this.#principalResolver =
      dependencies.principalResolver;

    this.#mappings =
      dependencies.mappings;
  }

  async resolve():
  Promise<
    AuthenticatedSeshCreatorResolutionResult
  > {
    let principalResult:
      Awaited<
        ReturnType<
          SessionPrincipalResolver[
            "resolve"
          ]
        >
      >;

    try {
      principalResult =
        await this.#principalResolver
          .resolve();
    }
    catch {
      return unavailable();
    }

    if (
      !principalResult.ok
    ) {
      return principalResult.error.code ===
        "unauthenticated"
        ? unauthenticated()
        : unavailable();
    }

    let mappingResult:
      Awaited<
        ReturnType<
          PrincipalSeshCreatorMappingRepository[
            "getByPrincipalId"
          ]
        >
      >;

    try {
      mappingResult =
        await this.#mappings
          .getByPrincipalId(
            principalResult.value.principalId,
          );
    }
    catch {
      return unavailable();
    }

    if (
      !mappingResult.ok
    ) {
      return mappingResult.error.kind ===
        "not-found"
        ? unmapped()
        : unavailable();
    }

    if (
      mappingResult.value.principalId !==
      principalResult.value.principalId
    ) {
      return unavailable();
    }

    let seshCreatorId:
      SeshCreatorId;

    try {
      seshCreatorId =
        parseSeshCreatorId(
          mappingResult.value.seshCreatorId,
        );
    }
    catch {
      return unavailable();
    }

    return {
      ok:
        true,

      value: {
        principalId:
          principalResult.value.principalId,

        seshCreatorId,
      },
    };
  }
}
