import type {
  IdentityD1DatabaseLike,
} from "./types";

import type {
  PrincipalId,
} from "../identifiers";

import type {
  SeshCreatorId,
} from "../../sesh/identifiers";

import {
  validatePrincipalSeshCreatorMapping,
} from "../sesh/creator-mapping";

import type {
  PrincipalSeshCreatorMapping,
} from "../sesh/creator-mapping";

import type {
  PrincipalSeshCreatorMappingRepository,
  PrincipalSeshCreatorMappingRepositoryResult,
} from "../sesh/creator-mapping-repository";

interface PrincipalSeshCreatorMappingRow {
  readonly principal_id:
    string;

  readonly sesh_creator_id:
    string;

  readonly created_at:
    string;
}

function notFound(
  message:
    string,
): PrincipalSeshCreatorMappingRepositoryResult<never> {
  return {
    ok:
      false,

    error: {
      kind:
        "not-found",

      message,
    },
  };
}

function validationFailure(
  message:
    string,
): PrincipalSeshCreatorMappingRepositoryResult<never> {
  return {
    ok:
      false,

    error: {
      kind:
        "validation",

      message,
    },
  };
}

function conflict(
  message:
    string,
): PrincipalSeshCreatorMappingRepositoryResult<never> {
  return {
    ok:
      false,

    error: {
      kind:
        "conflict",

      message,
    },
  };
}

function storage(
  message:
    string,
): PrincipalSeshCreatorMappingRepositoryResult<never> {
  return {
    ok:
      false,

    error: {
      kind:
        "storage",

      message,
    },
  };
}

function rowToMapping(
  row:
    PrincipalSeshCreatorMappingRow,
): PrincipalSeshCreatorMapping {
  return validatePrincipalSeshCreatorMapping({
    principalId:
      row.principal_id as PrincipalId,

    seshCreatorId:
      row.sesh_creator_id as SeshCreatorId,

    createdAt:
      row.created_at,
  });
}

export class D1PrincipalSeshCreatorMappingRepository
implements PrincipalSeshCreatorMappingRepository {
  readonly #db:
    IdentityD1DatabaseLike;

  constructor(
    db:
      IdentityD1DatabaseLike,
  ) {
    this.#db =
      db;
  }

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
      return validationFailure(
        error instanceof Error
          ? error.message
          : "Invalid principal to Sesh creator mapping.",
      );
    }

    const existingByPrincipal =
      await this.getByPrincipalId(
        canonical.principalId,
      );

    if (
      existingByPrincipal.ok
    ) {
      if (
        existingByPrincipal.value.seshCreatorId !==
          canonical.seshCreatorId
      ) {
        return conflict(
          "PrincipalId is already mapped to a different SeshCreatorId.",
        );
      }

      if (
        existingByPrincipal.value.createdAt !==
          canonical.createdAt
      ) {
        return conflict(
          "Principal to Sesh creator mapping creation timestamp is immutable.",
        );
      }

      return existingByPrincipal;
    }

    if (
      existingByPrincipal.error.kind !==
      "not-found"
    ) {
      return existingByPrincipal;
    }

    const existingByCreator =
      await this.getBySeshCreatorId(
        canonical.seshCreatorId,
      );

    if (
      existingByCreator.ok
    ) {
      if (
        existingByCreator.value.principalId !==
          canonical.principalId
      ) {
        return conflict(
          "SeshCreatorId is already mapped to a different PrincipalId.",
        );
      }

      return existingByCreator;
    }

    if (
      existingByCreator.error.kind !==
      "not-found"
    ) {
      return existingByCreator;
    }

    try {
      const result =
        await this.#db
          .prepare(
            `
              INSERT INTO principal_sesh_creator_mappings (
                principal_id,
                sesh_creator_id,
                created_at
              )
              VALUES (?, ?, ?)
            `,
          )
          .bind(
            canonical.principalId,
            canonical.seshCreatorId,
            canonical.createdAt,
          )
          .run();

      if (
        result.success !==
        true
      ) {
        return storage(
          "Unable to persist principal to Sesh creator mapping.",
        );
      }
    }
    catch (
      error
    ) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown D1 mapping write failure.";

      if (
        /unique|constraint/i.test(
          message,
        )
      ) {
        return conflict(
          "PrincipalId or SeshCreatorId is already mapped.",
        );
      }

      return storage(
        "Unable to persist principal to Sesh creator mapping.",
      );
    }

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
    if (
      typeof principalId !==
        "string" ||
      !principalId.startsWith(
        "principal:",
      )
    ) {
      return validationFailure(
        "principalId must be a canonical PrincipalId.",
      );
    }

    try {
      const row =
        await this.#db
          .prepare(
            `
              SELECT
                principal_id,
                sesh_creator_id,
                created_at
              FROM principal_sesh_creator_mappings
              WHERE principal_id = ?
              LIMIT 1
            `,
          )
          .bind(
            principalId,
          )
          .first<
            PrincipalSeshCreatorMappingRow
          >();

      if (
        row ===
        null
      ) {
        return notFound(
          "No Sesh creator mapping exists for the PrincipalId.",
        );
      }

      try {
        return {
          ok:
            true,

          value:
            rowToMapping(
              row,
            ),
        };
      }
      catch (
        error
      ) {
        return validationFailure(
          error instanceof Error
            ? error.message
            : "Persisted principal to Sesh creator mapping is invalid.",
        );
      }
    }
    catch {
      return storage(
        "Unable to load principal to Sesh creator mapping.",
      );
    }
  }

  async getBySeshCreatorId(
    seshCreatorId:
      SeshCreatorId,
  ): Promise<
    PrincipalSeshCreatorMappingRepositoryResult<
      PrincipalSeshCreatorMapping
    >
  > {
    if (
      typeof seshCreatorId !==
        "string" ||
      !seshCreatorId.startsWith(
        "sesh-creator:",
      )
    ) {
      return validationFailure(
        "seshCreatorId must be a canonical SeshCreatorId.",
      );
    }

    try {
      const row =
        await this.#db
          .prepare(
            `
              SELECT
                principal_id,
                sesh_creator_id,
                created_at
              FROM principal_sesh_creator_mappings
              WHERE sesh_creator_id = ?
              LIMIT 1
            `,
          )
          .bind(
            seshCreatorId,
          )
          .first<
            PrincipalSeshCreatorMappingRow
          >();

      if (
        row ===
        null
      ) {
        return notFound(
          "No principal mapping exists for the SeshCreatorId.",
        );
      }

      try {
        return {
          ok:
            true,

          value:
            rowToMapping(
              row,
            ),
        };
      }
      catch (
        error
      ) {
        return validationFailure(
          error instanceof Error
            ? error.message
            : "Persisted principal to Sesh creator mapping is invalid.",
        );
      }
    }
    catch {
      return storage(
        "Unable to load principal to Sesh creator mapping.",
      );
    }
  }

  async mappingExistsForPrincipal(
    principalId:
      PrincipalId,
  ): Promise<
    PrincipalSeshCreatorMappingRepositoryResult<boolean>
  > {
    const result =
      await this.getByPrincipalId(
        principalId,
      );

    if (
      result.ok
    ) {
      return {
        ok:
          true,

        value:
          true,
      };
    }

    if (
      result.error.kind ===
      "not-found"
    ) {
      return {
        ok:
          true,

        value:
          false,
      };
    }

    return result;
  }

  async mappingExistsForCreator(
    seshCreatorId:
      SeshCreatorId,
  ): Promise<
    PrincipalSeshCreatorMappingRepositoryResult<boolean>
  > {
    const result =
      await this.getBySeshCreatorId(
        seshCreatorId,
      );

    if (
      result.ok
    ) {
      return {
        ok:
          true,

        value:
          true,
      };
    }

    if (
      result.error.kind ===
      "not-found"
    ) {
      return {
        ok:
          true,

        value:
          false,
      };
    }

    return result;
  }
}
