import {
  parsePrincipalId,
} from "../identifiers";

import type {
  PrincipalId,
} from "../identifiers";

import {
  normalizeCredentialEmail,
  validatePasswordCredential,
} from "../credentials/validation";

import type {
  PasswordCredential,
} from "../credentials/model";

import type {
  PasswordCredentialRepository,
  PasswordCredentialRepositoryError,
  PasswordCredentialRepositoryResult,
} from "../credentials/repository";

import type {
  IdentityD1DatabaseLike,
} from "./types";

const SELECT_BY_PRINCIPAL_SQL =
  `SELECT
     principal_id,
     email_normalized,
     password_hash,
     created_at,
     updated_at
   FROM principal_password_credentials
   WHERE principal_id = ?
   LIMIT 1`;

const SELECT_BY_EMAIL_SQL =
  `SELECT
     principal_id,
     email_normalized,
     password_hash,
     created_at,
     updated_at
   FROM principal_password_credentials
   WHERE email_normalized = ?
   LIMIT 1`;

const EXISTS_BY_PRINCIPAL_SQL =
  `SELECT principal_id
   FROM principal_password_credentials
   WHERE principal_id = ?
   LIMIT 1`;

const UPSERT_SQL =
  `INSERT INTO principal_password_credentials (
     principal_id,
     email_normalized,
     password_hash,
     created_at,
     updated_at
   )
   VALUES (?, ?, ?, ?, ?)
   ON CONFLICT(principal_id)
   DO UPDATE SET
     email_normalized = excluded.email_normalized,
     password_hash = excluded.password_hash,
     updated_at = excluded.updated_at`;

interface PasswordCredentialRow {
  readonly principal_id:
    unknown;

  readonly email_normalized:
    unknown;

  readonly password_hash:
    unknown;

  readonly created_at:
    unknown;

  readonly updated_at:
    unknown;
}

function failure(
  kind:
    PasswordCredentialRepositoryError["kind"],
  message:
    string,
): PasswordCredentialRepositoryResult<never> {
  return {
    ok:
      false,

    error: {
      kind,
      message,
    },
  };
}

function notFoundFailure():
PasswordCredentialRepositoryResult<never> {
  return failure(
    "not-found",
    "Password credential was not found.",
  );
}

function validationFailure(
  message:
    string,
): PasswordCredentialRepositoryResult<never> {
  return failure(
    "validation",
    message,
  );
}

function conflictFailure(
  message:
    string,
): PasswordCredentialRepositoryResult<never> {
  return failure(
    "conflict",
    message,
  );
}

function storageFailure(
  message:
    string,
): PasswordCredentialRepositoryResult<never> {
  return failure(
    "storage",
    message,
  );
}

function credentialFromRow(
  row:
    PasswordCredentialRow,
): PasswordCredential {
  return validatePasswordCredential({
    principalId:
      row.principal_id,

    emailNormalized:
      row.email_normalized,

    passwordHash:
      row.password_hash,

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,
  });
}

function looksLikeUniqueConstraintError(
  error:
    unknown,
): boolean {
  if (
    !(error instanceof Error)
  ) {
    return false;
  }

  return /unique|constraint/i.test(
    error.message,
  );
}

export class D1PasswordCredentialRepository
implements PasswordCredentialRepository {
  readonly #database:
    IdentityD1DatabaseLike;

  constructor(
    database:
      IdentityD1DatabaseLike,
  ) {
    this.#database =
      database;
  }

  async saveCredential(
    credential:
      PasswordCredential,
  ): Promise<
    PasswordCredentialRepositoryResult<PasswordCredential>
  > {
    let validated:
      PasswordCredential;

    try {
      validated =
        validatePasswordCredential(
          credential,
        );
    }
    catch (error) {
      return validationFailure(
        error instanceof Error
          ? error.message
          : "Password credential validation failed.",
      );
    }

    let existingByPrincipal:
      PasswordCredentialRow | null;

    try {
      existingByPrincipal =
        await this.#database
          .prepare(
            SELECT_BY_PRINCIPAL_SQL,
          )
          .bind(
            validated.principalId,
          )
          .first<PasswordCredentialRow>();
    }
    catch {
      return storageFailure(
        "Password credential lookup failed before persistence.",
      );
    }

    if (
      existingByPrincipal !==
      null
    ) {
      let existing:
        PasswordCredential;

      try {
        existing =
          credentialFromRow(
            existingByPrincipal,
          );
      }
      catch {
        return storageFailure(
          "Stored password credential is invalid.",
        );
      }

      if (
        existing.principalId !==
        validated.principalId
      ) {
        return conflictFailure(
          "Password credential principal identity cannot change.",
        );
      }

      if (
        existing.createdAt !==
        validated.createdAt
      ) {
        return conflictFailure(
          "Password credential createdAt cannot change under an existing PrincipalId.",
        );
      }
    }

    try {
      const existingByEmail =
        await this.#database
          .prepare(
            SELECT_BY_EMAIL_SQL,
          )
          .bind(
            validated.emailNormalized,
          )
          .first<PasswordCredentialRow>();

      if (
        existingByEmail !==
        null
      ) {
        const emailOwner =
          credentialFromRow(
            existingByEmail,
          );

        if (
          emailOwner.principalId !==
          validated.principalId
        ) {
          return conflictFailure(
            "Normalized credential email is already assigned to another PrincipalId.",
          );
        }
      }
    }
    catch (error) {
      if (
        looksLikeUniqueConstraintError(
          error,
        )
      ) {
        return conflictFailure(
          "Normalized credential email conflicts with an existing credential.",
        );
      }

      return storageFailure(
        "Password credential email uniqueness check failed.",
      );
    }

    try {
      const result =
        await this.#database
          .prepare(
            UPSERT_SQL,
          )
          .bind(
            validated.principalId,
            validated.emailNormalized,
            validated.passwordHash,
            validated.createdAt,
            validated.updatedAt,
          )
          .run();

      if (
        result.success ===
        false
      ) {
        return storageFailure(
          "Password credential persistence failed.",
        );
      }
    }
    catch (error) {
      if (
        looksLikeUniqueConstraintError(
          error,
        )
      ) {
        return conflictFailure(
          "Normalized credential email conflicts with an existing credential.",
        );
      }

      return storageFailure(
        "Password credential persistence failed.",
      );
    }

    return {
      ok:
        true,

      value:
        validated,
    };
  }

  async getCredentialByPrincipalId(
    principalId:
      PrincipalId,
  ): Promise<
    PasswordCredentialRepositoryResult<PasswordCredential>
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
      PasswordCredentialRow | null;

    try {
      row =
        await this.#database
          .prepare(
            SELECT_BY_PRINCIPAL_SQL,
          )
          .bind(
            canonicalId,
          )
          .first<PasswordCredentialRow>();
    }
    catch {
      return storageFailure(
        "Password credential lookup failed.",
      );
    }

    if (
      row ===
      null
    ) {
      return notFoundFailure();
    }

    try {
      const credential =
        credentialFromRow(
          row,
        );

      if (
        credential.principalId !==
        canonicalId
      ) {
        return storageFailure(
          "Stored password credential identity mismatch.",
        );
      }

      return {
        ok:
          true,

        value:
          credential,
      };
    }
    catch {
      return storageFailure(
        "Stored password credential is invalid.",
      );
    }
  }

  async getCredentialByNormalizedEmail(
    emailNormalized:
      string,
  ): Promise<
    PasswordCredentialRepositoryResult<PasswordCredential>
  > {
    let canonicalEmail:
      string;

    try {
      canonicalEmail =
        normalizeCredentialEmail(
          emailNormalized,
        );

      if (
        canonicalEmail !==
        emailNormalized
      ) {
        return validationFailure(
          "Credential lookup email must already be normalized.",
        );
      }
    }
    catch (error) {
      return validationFailure(
        error instanceof Error
          ? error.message
          : "Credential email validation failed.",
      );
    }

    let row:
      PasswordCredentialRow | null;

    try {
      row =
        await this.#database
          .prepare(
            SELECT_BY_EMAIL_SQL,
          )
          .bind(
            canonicalEmail,
          )
          .first<PasswordCredentialRow>();
    }
    catch {
      return storageFailure(
        "Password credential email lookup failed.",
      );
    }

    if (
      row ===
      null
    ) {
      return notFoundFailure();
    }

    try {
      const credential =
        credentialFromRow(
          row,
        );

      if (
        credential.emailNormalized !==
        canonicalEmail
      ) {
        return storageFailure(
          "Stored password credential email mismatch.",
        );
      }

      return {
        ok:
          true,

        value:
          credential,
      };
    }
    catch {
      return storageFailure(
        "Stored password credential is invalid.",
      );
    }
  }

  async credentialExistsForPrincipal(
    principalId:
      PrincipalId,
  ): Promise<
    PasswordCredentialRepositoryResult<boolean>
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
            EXISTS_BY_PRINCIPAL_SQL,
          )
          .bind(
            canonicalId,
          )
          .first<{
            principal_id:
              unknown;
          }>();

      return {
        ok:
          true,

        value:
          row !==
          null,
      };
    }
    catch {
      return storageFailure(
        "Password credential existence check failed.",
      );
    }
  }
}
