import assert from "node:assert/strict";
import test from "node:test";

import {
  createPrincipalId,
} from "../identifiers";
import {
  D1PrincipalRepository,
} from "./d1-principal-repository";
import type {
  IdentityD1DatabaseLike,
  IdentityD1PreparedStatementLike,
  IdentityD1RunResultLike,
} from "./types";

interface StoredPrincipalRow {
  principal_id: string;
  status: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

class FakeIdentityD1Database
implements IdentityD1DatabaseLike {
  readonly principals =
    new Map<
      string,
      StoredPrincipalRow
    >();

  failPrepare =
    false;

  failFirst =
    false;

  failRun =
    false;

  runSuccess =
    true;

  prepare(
    sql:
      string,
  ): IdentityD1PreparedStatementLike {
    if (this.failPrepare) {
      throw new Error(
        "prepare failed",
      );
    }

    return new FakeIdentityD1Statement(
      this,
      sql,
    );
  }
}

class FakeIdentityD1Statement
implements IdentityD1PreparedStatementLike {
  readonly #database:
    FakeIdentityD1Database;

  readonly #sql:
    string;

  #values:
    unknown[] = [];

  constructor(
    database:
      FakeIdentityD1Database,
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

  async first<T = Record<string, unknown>>():
    Promise<T | null> {
    if (this.#database.failFirst) {
      throw new Error(
        "first failed",
      );
    }

    const principalId =
      String(
        this.#values[0],
      );

    if (
      this.#sql.includes(
        "FROM principals",
      )
    ) {
      const row =
        this.#database
          .principals
          .get(
            principalId,
          );

      return (
        row === undefined
          ? null
          : row
      ) as T | null;
    }

    throw new Error(
      "Unexpected first() SQL.",
    );
  }

  async run():
    Promise<IdentityD1RunResultLike> {
    if (this.#database.failRun) {
      throw new Error(
        "run failed",
      );
    }

    if (
      !this.#sql.includes(
        "INSERT INTO principals",
      )
    ) {
      throw new Error(
        "Unexpected run() SQL.",
      );
    }

    if (
      this.#database.runSuccess === false
    ) {
      return {
        success: false,
      };
    }

    const [
      principalId,
      status,
      displayName,
      createdAt,
      updatedAt,
    ] =
      this.#values;

    const existing =
      this.#database
        .principals
        .get(
          String(
            principalId,
          ),
        );

    this.#database
      .principals
      .set(
        String(
          principalId,
        ),
        {
          principal_id:
            String(
              principalId,
            ),

          status:
            String(
              status,
            ),

          display_name:
            displayName === null
              ? null
              : String(
                  displayName,
                ),

          created_at:
            existing?.created_at ??
            String(
              createdAt,
            ),

          updated_at:
            String(
              updatedAt,
            ),
        },
      );

    return {
      success: true,
    };
  }
}

function canonicalPrincipal() {
  return {
    principalId:
      "principal:river-01",

    status:
      "active",

    displayName:
      "River",

    createdAt:
      "2026-09-21T20:00:00.000Z",

    updatedAt:
      "2026-09-21T20:00:00.000Z",
  } as const;
}

test(
  "stores and reloads a canonical principal through D1",
  async () => {
    const database =
      new FakeIdentityD1Database();

    const repository =
      new D1PrincipalRepository(
        database,
      );

    const saved =
      await repository.savePrincipal(
        canonicalPrincipal(),
      );

    assert.equal(
      saved.ok,
      true,
    );

    const loaded =
      await repository.getPrincipal(
        createPrincipalId(
          "river-01",
        ),
      );

    assert.equal(
      loaded.ok,
      true,
    );

    if (loaded.ok) {
      assert.equal(
        loaded.value.principalId,
        "principal:river-01",
      );

      assert.equal(
        loaded.value.displayName,
        "River",
      );
    }
  },
);

test(
  "updates mutable principal fields while preserving createdAt",
  async () => {
    const database =
      new FakeIdentityD1Database();

    const repository =
      new D1PrincipalRepository(
        database,
      );

    await repository.savePrincipal(
      canonicalPrincipal(),
    );

    const updated =
      await repository.savePrincipal({
        ...canonicalPrincipal(),

        status:
          "disabled",

        displayName:
          "River Updated",

        updatedAt:
          "2026-09-21T21:00:00.000Z",
      });

    assert.equal(
      updated.ok,
      true,
    );

    const stored =
      database.principals.get(
        "principal:river-01",
      );

    assert.equal(
      stored?.created_at,
      "2026-09-21T20:00:00.000Z",
    );

    assert.equal(
      stored?.status,
      "disabled",
    );

    assert.equal(
      stored?.display_name,
      "River Updated",
    );
  },
);

test(
  "rejects createdAt drift under an existing PrincipalId",
  async () => {
    const database =
      new FakeIdentityD1Database();

    const repository =
      new D1PrincipalRepository(
        database,
      );

    await repository.savePrincipal(
      canonicalPrincipal(),
    );

    const result =
      await repository.savePrincipal({
        ...canonicalPrincipal(),

        createdAt:
          "2026-09-22T20:00:00.000Z",

        updatedAt:
          "2026-09-22T20:00:00.000Z",
      });

    assert.equal(
      result.ok,
      false,
    );

    if (!result.ok) {
      assert.equal(
        result.error.code,
        "conflict",
      );
    }
  },
);

test(
  "rejects malformed principal before persistence",
  async () => {
    const database =
      new FakeIdentityD1Database();

    const repository =
      new D1PrincipalRepository(
        database,
      );

    const result =
      await repository.savePrincipal({
        principalId:
          "sesh-creator:river",

        status:
          "active",

        createdAt:
          "2026-09-21T20:00:00.000Z",

        updatedAt:
          "2026-09-21T20:00:00.000Z",
      });

    assert.equal(
      result.ok,
      false,
    );

    if (!result.ok) {
      assert.equal(
        result.error.code,
        "validation",
      );
    }

    assert.equal(
      database.principals.size,
      0,
    );
  },
);

test(
  "returns explicit not-found behavior",
  async () => {
    const database =
      new FakeIdentityD1Database();

    const repository =
      new D1PrincipalRepository(
        database,
      );

    const result =
      await repository.getPrincipal(
        createPrincipalId(
          "missing",
        ),
      );

    assert.equal(
      result.ok,
      false,
    );

    if (!result.ok) {
      assert.equal(
        result.error.code,
        "not-found",
      );
    }
  },
);

test(
  "reports principal existence",
  async () => {
    const database =
      new FakeIdentityD1Database();

    const repository =
      new D1PrincipalRepository(
        database,
      );

    const principalId =
      createPrincipalId(
        "river-01",
      );

    const before =
      await repository.principalExists(
        principalId,
      );

    assert.deepEqual(
      before,
      {
        ok: true,
        value: false,
      },
    );

    await repository.savePrincipal(
      canonicalPrincipal(),
    );

    const after =
      await repository.principalExists(
        principalId,
      );

    assert.deepEqual(
      after,
      {
        ok: true,
        value: true,
      },
    );
  },
);

test(
  "maps D1 lookup failures to provider-neutral storage errors",
  async () => {
    const database =
      new FakeIdentityD1Database();

    database.failFirst =
      true;

    const repository =
      new D1PrincipalRepository(
        database,
      );

    const result =
      await repository.getPrincipal(
        createPrincipalId(
          "river-01",
        ),
      );

    assert.equal(
      result.ok,
      false,
    );

    if (!result.ok) {
      assert.equal(
        result.error.code,
        "storage",
      );
    }
  },
);

test(
  "maps unsuccessful D1 writes to provider-neutral storage errors",
  async () => {
    const database =
      new FakeIdentityD1Database();

    database.runSuccess =
      false;

    const repository =
      new D1PrincipalRepository(
        database,
      );

    const result =
      await repository.savePrincipal(
        canonicalPrincipal(),
      );

    assert.equal(
      result.ok,
      false,
    );

    if (!result.ok) {
      assert.equal(
        result.error.code,
        "storage",
      );
    }
  },
);

test(
  "rejects malformed persisted principal rows",
  async () => {
    const database =
      new FakeIdentityD1Database();

    database.principals.set(
      "principal:river-01",
      {
        principal_id:
          "principal:river-01",

        status:
          "invalid-status",

        display_name:
          "River",

        created_at:
          "2026-09-21T20:00:00.000Z",

        updated_at:
          "2026-09-21T20:00:00.000Z",
      },
    );

    const repository =
      new D1PrincipalRepository(
        database,
      );

    const result =
      await repository.getPrincipal(
        createPrincipalId(
          "river-01",
        ),
      );

    assert.equal(
      result.ok,
      false,
    );

    if (!result.ok) {
      assert.equal(
        result.error.code,
        "storage",
      );
    }
  },
);
