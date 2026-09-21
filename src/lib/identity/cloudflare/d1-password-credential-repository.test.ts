import assert from "node:assert/strict";
import test from "node:test";

import {
  createPrincipalId,
} from "../identifiers";

import type {
  PasswordCredential,
} from "../credentials/model";

import type {
  IdentityD1DatabaseLike,
  IdentityD1PreparedStatementLike,
} from "./types";

import {
  D1PasswordCredentialRepository,
} from "./d1-password-credential-repository";

interface StoredRow {
  principal_id:
    string;

  email_normalized:
    string;

  password_hash:
    string;

  created_at:
    string;

  updated_at:
    string;
}

class FakePreparedStatement
implements IdentityD1PreparedStatementLike {
  readonly #database:
    FakeIdentityDatabase;

  readonly #sql:
    string;

  #values:
    unknown[] =
      [];

  constructor(
    database:
      FakeIdentityDatabase,
    sql:
      string,
  ) {
    this.#database =
      database;

    this.#sql =
      sql;
  }

  bind(
    ...values:
      unknown[]
  ): IdentityD1PreparedStatementLike {
    this.#values =
      values;

    return this;
  }

  async first<T>():
  Promise<T | null> {
    if (
      this.#database.failReads
    ) {
      throw new Error(
        "simulated read failure",
      );
    }

    if (
      this.#sql.includes(
        "WHERE principal_id = ?",
      )
    ) {
      const principalId =
        String(
          this.#values[0],
        );

      return (
        this.#database.rows.get(
          principalId,
        ) ??
        null
      ) as T | null;
    }

    if (
      this.#sql.includes(
        "WHERE email_normalized = ?",
      )
    ) {
      const email =
        String(
          this.#values[0],
        );

      for (
        const row of
        this.#database.rows.values()
      ) {
        if (
          row.email_normalized ===
          email
        ) {
          return row as T;
        }
      }

      return null;
    }

    throw new Error(
      "Unsupported fake SELECT statement.",
    );
  }

  async run():
  Promise<{
    success:
      boolean;
  }> {
    if (
      this.#database.failWrites
    ) {
      return {
        success:
          false,
      };
    }

    if (
      !this.#sql.includes(
        "INSERT INTO principal_password_credentials",
      )
    ) {
      throw new Error(
        "Unsupported fake write statement.",
      );
    }

    const principalId =
      String(
        this.#values[0],
      );

    const emailNormalized =
      String(
        this.#values[1],
      );

    const existingPrincipalForEmail =
      Array
        .from(
          this.#database.rows.values(),
        )
        .find(
          (row) =>
            row.email_normalized ===
              emailNormalized &&
            row.principal_id !==
              principalId,
        );

    if (
      existingPrincipalForEmail
    ) {
      throw new Error(
        "UNIQUE constraint failed: principal_password_credentials.email_normalized",
      );
    }

    const previous =
      this.#database.rows.get(
        principalId,
      );

    this.#database.rows.set(
      principalId,
      {
        principal_id:
          principalId,

        email_normalized:
          emailNormalized,

        password_hash:
          String(
            this.#values[2],
          ),

        created_at:
          previous?.created_at ??
          String(
            this.#values[3],
          ),

        updated_at:
          String(
            this.#values[4],
          ),
      },
    );

    return {
      success:
        true,
    };
  }
}

class FakeIdentityDatabase
implements IdentityD1DatabaseLike {
  readonly rows =
    new Map<
      string,
      StoredRow
    >();

  failReads =
    false;

  failWrites =
    false;

  prepare(
    sql:
      string,
  ): IdentityD1PreparedStatementLike {
    return new FakePreparedStatement(
      this,
      sql,
    );
  }
}

function credential(
  overrides: Partial<PasswordCredential> =
    {},
): PasswordCredential {
  return {
    principalId:
      createPrincipalId(
        "credential-repository-test",
      ),

    emailNormalized:
      "river@example.com",

    passwordHash:
      "$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHQ$aGFzaA",

    createdAt:
      "2026-09-21T22:00:00.000Z",

    updatedAt:
      "2026-09-21T22:00:00.000Z",

    ...overrides,
  };
}

test(
  "stores and reloads a canonical password credential through D1",
  async () => {
    const database =
      new FakeIdentityDatabase();

    const repository =
      new D1PasswordCredentialRepository(
        database,
      );

    const source =
      credential();

    const saved =
      await repository.saveCredential(
        source,
      );

    assert.equal(
      saved.ok,
      true,
    );

    const loaded =
      await repository.getCredentialByPrincipalId(
        source.principalId,
      );

    assert.equal(
      loaded.ok,
      true,
    );

    if (
      loaded.ok
    ) {
      assert.deepEqual(
        loaded.value,
        source,
      );
    }
  },
);

test(
  "loads a password credential by canonical normalized email",
  async () => {
    const database =
      new FakeIdentityDatabase();

    const repository =
      new D1PasswordCredentialRepository(
        database,
      );

    const source =
      credential();

    await repository.saveCredential(
      source,
    );

    const loaded =
      await repository.getCredentialByNormalizedEmail(
        "river@example.com",
      );

    assert.equal(
      loaded.ok,
      true,
    );

    if (
      loaded.ok
    ) {
      assert.equal(
        loaded.value.principalId,
        source.principalId,
      );
    }
  },
);

test(
  "rejects non-normalized email lookup values",
  async () => {
    const database =
      new FakeIdentityDatabase();

    const repository =
      new D1PasswordCredentialRepository(
        database,
      );

    const result =
      await repository.getCredentialByNormalizedEmail(
        "River@Example.com",
      );

    assert.deepEqual(
      result,
      {
        ok:
          false,

        error: {
          kind:
            "validation",

          message:
            "Credential lookup email must already be normalized.",
        },
      },
    );
  },
);

test(
  "preserves createdAt when updating password hash or normalized email",
  async () => {
    const database =
      new FakeIdentityDatabase();

    const repository =
      new D1PasswordCredentialRepository(
        database,
      );

    const source =
      credential();

    await repository.saveCredential(
      source,
    );

    const updated =
      credential({
        emailNormalized:
          "river.young@example.com",

        passwordHash:
          "$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHQ$bmV3aGFzaA",

        createdAt:
          source.createdAt,

        updatedAt:
          "2026-09-21T23:00:00.000Z",
      });

    const saved =
      await repository.saveCredential(
        updated,
      );

    assert.equal(
      saved.ok,
      true,
    );

    const loaded =
      await repository.getCredentialByPrincipalId(
        source.principalId,
      );

    assert.equal(
      loaded.ok,
      true,
    );

    if (
      loaded.ok
    ) {
      assert.equal(
        loaded.value.createdAt,
        source.createdAt,
      );

      assert.equal(
        loaded.value.emailNormalized,
        "river.young@example.com",
      );

      assert.equal(
        loaded.value.passwordHash,
        updated.passwordHash,
      );
    }
  },
);

test(
  "rejects createdAt drift under an existing PrincipalId",
  async () => {
    const database =
      new FakeIdentityDatabase();

    const repository =
      new D1PasswordCredentialRepository(
        database,
      );

    const source =
      credential();

    await repository.saveCredential(
      source,
    );

    const result =
      await repository.saveCredential(
        credential({
          createdAt:
            "2026-09-21T22:30:00.000Z",

          updatedAt:
            "2026-09-21T23:00:00.000Z",
        }),
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      !result.ok
    ) {
      assert.equal(
        result.error.kind,
        "conflict",
      );
    }
  },
);

test(
  "rejects normalized email reuse across different PrincipalId values",
  async () => {
    const database =
      new FakeIdentityDatabase();

    const repository =
      new D1PasswordCredentialRepository(
        database,
      );

    const first =
      credential();

    await repository.saveCredential(
      first,
    );

    const second =
      credential({
        principalId:
          createPrincipalId(
            "second-principal",
          ),

        createdAt:
          "2026-09-21T22:05:00.000Z",

        updatedAt:
          "2026-09-21T22:05:00.000Z",
      });

    const result =
      await repository.saveCredential(
        second,
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      !result.ok
    ) {
      assert.equal(
        result.error.kind,
        "conflict",
      );
    }
  },
);

test(
  "returns explicit not-found behavior",
  async () => {
    const repository =
      new D1PasswordCredentialRepository(
        new FakeIdentityDatabase(),
      );

    const result =
      await repository.getCredentialByPrincipalId(
        createPrincipalId(
          "missing-credential",
        ),
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      !result.ok
    ) {
      assert.equal(
        result.error.kind,
        "not-found",
      );
    }
  },
);

test(
  "reports credential existence without exposing password hashes",
  async () => {
    const database =
      new FakeIdentityDatabase();

    const repository =
      new D1PasswordCredentialRepository(
        database,
      );

    const source =
      credential();

    const before =
      await repository.credentialExistsForPrincipal(
        source.principalId,
      );

    assert.deepEqual(
      before,
      {
        ok:
          true,
        value:
          false,
      },
    );

    await repository.saveCredential(
      source,
    );

    const after =
      await repository.credentialExistsForPrincipal(
        source.principalId,
      );

    assert.deepEqual(
      after,
      {
        ok:
          true,
        value:
          true,
      },
    );
  },
);

test(
  "rejects malformed credentials before persistence",
  async () => {
    const repository =
      new D1PasswordCredentialRepository(
        new FakeIdentityDatabase(),
      );

    const source =
      credential({
        emailNormalized:
          "River@Example.com",
      });

    const result =
      await repository.saveCredential(
        source,
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      !result.ok
    ) {
      assert.equal(
        result.error.kind,
        "validation",
      );
    }
  },
);

test(
  "maps unsuccessful D1 writes to storage errors",
  async () => {
    const database =
      new FakeIdentityDatabase();

    database.failWrites =
      true;

    const repository =
      new D1PasswordCredentialRepository(
        database,
      );

    const result =
      await repository.saveCredential(
        credential(),
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      !result.ok
    ) {
      assert.equal(
        result.error.kind,
        "storage",
      );
    }
  },
);

test(
  "maps D1 read failures to storage errors",
  async () => {
    const database =
      new FakeIdentityDatabase();

    database.failReads =
      true;

    const repository =
      new D1PasswordCredentialRepository(
        database,
      );

    const result =
      await repository.getCredentialByPrincipalId(
        createPrincipalId(
          "read-failure",
        ),
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      !result.ok
    ) {
      assert.equal(
        result.error.kind,
        "storage",
      );
    }
  },
);

test(
  "rejects malformed persisted credential rows",
  async () => {
    const database =
      new FakeIdentityDatabase();

    const principalId =
      createPrincipalId(
        "malformed-row",
      );

    database.rows.set(
      principalId,
      {
        principal_id:
          principalId,

        email_normalized:
          "Not-Normalized@Example.com",

        password_hash:
          "hash",

        created_at:
          "2026-09-21T22:00:00.000Z",

        updated_at:
          "2026-09-21T22:00:00.000Z",
      },
    );

    const repository =
      new D1PasswordCredentialRepository(
        database,
      );

    const result =
      await repository.getCredentialByPrincipalId(
        principalId,
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      !result.ok
    ) {
      assert.equal(
        result.error.kind,
        "storage",
      );
    }
  },
);
