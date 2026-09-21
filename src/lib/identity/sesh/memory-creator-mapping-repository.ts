import type {
  PrincipalSeshCreatorMapping,
} from "./creator-mapping";

import {
  validatePrincipalSeshCreatorMapping,
} from "./creator-mapping";

import type {
  PrincipalSeshCreatorMappingRepository,
  PrincipalSeshCreatorMappingRepositoryResult,
} from "./creator-mapping-repository";

import type {
  PrincipalId,
} from "../identifiers";

import type {
  SeshCreatorId,
} from "../../sesh/identifiers";

export class InMemoryPrincipalSeshCreatorMappingRepository
implements PrincipalSeshCreatorMappingRepository {
  readonly #byPrincipal =
    new Map<
      PrincipalId,
      PrincipalSeshCreatorMapping
    >();

  readonly #byCreator =
    new Map<
      SeshCreatorId,
      PrincipalSeshCreatorMapping
    >();

  async saveMapping(
    mapping:
      PrincipalSeshCreatorMapping,
  ): Promise<
    PrincipalSeshCreatorMappingRepositoryResult<
      PrincipalSeshCreatorMapping
    >
  > {
    let canonical:
      PrincipalSeshCreatorMapping;

    try {
      canonical =
        validatePrincipalSeshCreatorMapping(
          mapping,
        );
    }
    catch (
      error
    ) {
      return {
        ok:
          false,

        error: {
          kind:
            "validation",

          message:
            error instanceof Error
              ? error.message
              : "Invalid principal to Sesh creator mapping.",
        },
      };
    }

    const existingByPrincipal =
      this.#byPrincipal.get(
        canonical.principalId,
      );

    if (
      existingByPrincipal !==
        undefined
    ) {
      if (
        existingByPrincipal.seshCreatorId !==
          canonical.seshCreatorId
      ) {
        return {
          ok:
            false,

          error: {
            kind:
              "conflict",

            message:
              "PrincipalId is already mapped to a different SeshCreatorId.",
          },
        };
      }

      if (
        existingByPrincipal.createdAt !==
          canonical.createdAt
      ) {
        return {
          ok:
            false,

          error: {
            kind:
              "conflict",

            message:
              "Principal to Sesh creator mapping creation timestamp is immutable.",
          },
        };
      }

      return {
        ok:
          true,

        value:
          existingByPrincipal,
      };
    }

    const existingByCreator =
      this.#byCreator.get(
        canonical.seshCreatorId,
      );

    if (
      existingByCreator !==
        undefined &&
      existingByCreator.principalId !==
        canonical.principalId
    ) {
      return {
        ok:
          false,

        error: {
          kind:
            "conflict",

        message:
          "SeshCreatorId is already mapped to a different PrincipalId.",
        },
      };
    }

    this.#byPrincipal.set(
      canonical.principalId,
      canonical,
    );

    this.#byCreator.set(
      canonical.seshCreatorId,
      canonical,
    );

    return {
      ok:
        true,

      value:
        canonical,
    };
  }

  async getByPrincipalId(
    principalId:
      PrincipalId,
  ): Promise<
    PrincipalSeshCreatorMappingRepositoryResult<
      PrincipalSeshCreatorMapping
    >
  > {
    const mapping =
      this.#byPrincipal.get(
        principalId,
      );

    if (
      mapping ===
      undefined
    ) {
      return {
        ok:
          false,

        error: {
          kind:
            "not-found",

          message:
            "No Sesh creator mapping exists for the PrincipalId.",
        },
      };
    }

    return {
      ok:
        true,

      value:
        mapping,
    };
  }

  async getBySeshCreatorId(
    seshCreatorId:
      SeshCreatorId,
  ): Promise<
    PrincipalSeshCreatorMappingRepositoryResult<
      PrincipalSeshCreatorMapping
    >
  > {
    const mapping =
      this.#byCreator.get(
        seshCreatorId,
      );

    if (
      mapping ===
      undefined
    ) {
      return {
        ok:
          false,

        error: {
          kind:
            "not-found",

          message:
            "No principal mapping exists for the SeshCreatorId.",
        },
      };
    }

    return {
      ok:
        true,

      value:
        mapping,
    };
  }

  async mappingExistsForPrincipal(
    principalId:
      PrincipalId,
  ): Promise<
    PrincipalSeshCreatorMappingRepositoryResult<boolean>
  > {
    return {
      ok:
        true,

      value:
        this.#byPrincipal.has(
          principalId,
        ),
    };
  }

  async mappingExistsForCreator(
    seshCreatorId:
      SeshCreatorId,
  ): Promise<
    PrincipalSeshCreatorMappingRepositoryResult<boolean>
  > {
    return {
      ok:
        true,

      value:
        this.#byCreator.has(
          seshCreatorId,
        ),
    };
  }
}
