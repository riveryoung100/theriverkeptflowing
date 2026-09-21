import {
  parsePrincipalId,
  type PrincipalId,
} from "../identifiers";
import type {
  AuthenticatedPrincipal,
} from "../model";
import type {
  PrincipalRepository,
  PrincipalRepositoryResult,
} from "../repository";
import {
  validateAuthenticatedPrincipal,
} from "../validation";
import type {
  IdentityD1DatabaseLike,
} from "./types";

interface PrincipalRow {
  readonly principal_id: unknown;
  readonly status: unknown;
  readonly display_name: unknown;
  readonly created_at: unknown;
  readonly updated_at: unknown;
}

const SELECT_PRINCIPAL_SQL = `
SELECT
    principal_id,
    status,
    display_name,
    created_at,
    updated_at
FROM principals
WHERE principal_id = ?
LIMIT 1
`;

const UPSERT_PRINCIPAL_SQL = `
INSERT INTO principals (
    principal_id,
    status,
    display_name,
    created_at,
    updated_at
)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT(principal_id)
DO UPDATE SET
    status = excluded.status,
    display_name = excluded.display_name,
    updated_at = excluded.updated_at
`;

const PRINCIPAL_EXISTS_SQL = `
SELECT principal_id
FROM principals
WHERE principal_id = ?
LIMIT 1
`;

function storageFailure(
  message:
    string,
): PrincipalRepositoryResult<never> {
  return {
    ok: false,
    error: {
      code:
        "storage",
      message,
    },
  };
}

function validationFailure(
  message:
    string,
): PrincipalRepositoryResult<never> {
  return {
    ok: false,
    error: {
      code:
        "validation",
      message,
    },
  };
}

function conflictFailure(
  message:
    string,
): PrincipalRepositoryResult<never> {
  return {
    ok: false,
    error: {
      code:
        "conflict",
      message,
    },
  };
}

function notFoundFailure():
  PrincipalRepositoryResult<never> {
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

function principalFromRow(
  row:
    PrincipalRow,
): AuthenticatedPrincipal {
  return validateAuthenticatedPrincipal({
    principalId:
      row.principal_id,

    status:
      row.status,

    ...(row.display_name === null ||
    row.display_name === undefined
      ? {}
      : {
          displayName:
            row.display_name,
        }),

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,
  });
}

export class D1PrincipalRepository
implements PrincipalRepository {
  readonly #database:
    IdentityD1DatabaseLike;

  constructor(
    database:
      IdentityD1DatabaseLike,
  ) {
    if (
      typeof database !== "object" ||
      database === null ||
      typeof database.prepare !== "function"
    ) {
      throw new TypeError(
        "Identity D1 database must provide prepare().",
      );
    }

    this.#database =
      database;
  }

  async savePrincipal(
    principal:
      unknown,
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
      return validationFailure(
        error instanceof Error
          ? error.message
          : "Principal validation failed.",
      );
    }

    let existing:
      PrincipalRow | null;

    try {
      existing =
        await this.#database
          .prepare(
            SELECT_PRINCIPAL_SQL,
          )
          .bind(
            validated.principalId,
          )
          .first<PrincipalRow>();
    }
    catch {
      return storageFailure(
        "Principal lookup failed.",
      );
    }

    if (existing !== null) {
      let existingPrincipal:
        AuthenticatedPrincipal;

      try {
        existingPrincipal =
          principalFromRow(
            existing,
          );
      }
      catch {
        return storageFailure(
          "Stored principal is invalid.",
        );
      }

      if (
        existingPrincipal.principalId !==
        validated.principalId
      ) {
        return conflictFailure(
          "Principal identity cannot change.",
        );
      }

      if (
        existingPrincipal.createdAt !==
        validated.createdAt
      ) {
        return conflictFailure(
          "Principal createdAt cannot change under an existing PrincipalId.",
        );
      }
    }

    try {
      const result =
        await this.#database
          .prepare(
            UPSERT_PRINCIPAL_SQL,
          )
          .bind(
            validated.principalId,
            validated.status,
            validated.displayName ??
              null,
            validated.createdAt,
            validated.updatedAt,
          )
          .run();

      if (
        result.success === false
      ) {
        return storageFailure(
          "Principal persistence failed.",
        );
      }
    }
    catch {
      return storageFailure(
        "Principal persistence failed.",
      );
    }

    return {
      ok: true,
      value:
        validated,
    };
  }

  async getPrincipal(
    principalId:
      PrincipalId,
  ): Promise<
    PrincipalRepositoryResult<AuthenticatedPrincipal>
  > {
    let canonicalId:
      PrincipalId;

    try {
      canonicalId =
        parsePrincipalId(
          principalId,
        );
    }
    catch (error) {
      return validationFailure(
        error instanceof Error
          ? error.message
          : "PrincipalId validation failed.",
      );
    }

    let row:
      PrincipalRow | null;

    try {
      row =
        await this.#database
          .prepare(
            SELECT_PRINCIPAL_SQL,
          )
          .bind(
            canonicalId,
          )
          .first<PrincipalRow>();
    }
    catch {
      return storageFailure(
        "Principal lookup failed.",
      );
    }

    if (row === null) {
      return notFoundFailure();
    }

    try {
      const principal =
        principalFromRow(
          row,
        );

      if (
        principal.principalId !==
        canonicalId
      ) {
        return storageFailure(
          "Stored principal identity mismatch.",
        );
      }

      return {
        ok: true,
        value:
          principal,
      };
    }
    catch {
      return storageFailure(
        "Stored principal is invalid.",
      );
    }
  }

  async principalExists(
    principalId:
      PrincipalId,
  ): Promise<
    PrincipalRepositoryResult<boolean>
  > {
    let canonicalId:
      PrincipalId;

    try {
      canonicalId =
        parsePrincipalId(
          principalId,
        );
    }
    catch (error) {
      return validationFailure(
        error instanceof Error
          ? error.message
          : "PrincipalId validation failed.",
      );
    }

    try {
      const row =
        await this.#database
          .prepare(
            PRINCIPAL_EXISTS_SQL,
          )
          .bind(
            canonicalId,
          )
          .first<{
            principal_id: unknown;
          }>();

      return {
        ok: true,
        value:
          row !== null,
      };
    }
    catch {
      return storageFailure(
        "Principal existence check failed.",
      );
    }
  }
}
