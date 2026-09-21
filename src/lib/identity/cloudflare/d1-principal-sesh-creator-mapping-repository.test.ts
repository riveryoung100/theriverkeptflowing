import assert from "node:assert/strict";
import test from "node:test";

import {
  createPrincipalId,
} from "../identifiers";

import {
  createSeshCreatorId,
} from "../../sesh/identifiers";

import {
  D1PrincipalSeshCreatorMappingRepository,
} from "./d1-principal-sesh-creator-mapping-repository";

import type {
  IdentityD1DatabaseLike,
  IdentityD1PreparedStatementLike,
} from "./types";

interface MappingRow {
  principal_id:
    string;

  sesh_creator_id:
    string;

  created_at:
    string;
}

class FakeStatement
implements IdentityD1PreparedStatementLike {
  readonly #db:
    FakeDatabase;

  readonly #sql:
    string;

  #values:
    unknown[] =
      [];

  constructor(
    db:
      FakeDatabase,
    sql:
      string,
  ) {
    this.#db =
      db;

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
      this.#db.failReads
    ) {
      throw new Error(
        "simulated D1 read failure",
      );
    }

    if (
      this.#sql.includes(
        "WHERE principal_id = ?",
      )
    ) {
      const principalId =
        this.#values[0] as string;

      const row =
        this.#db.rows.find(
          (candidate) =>
            candidate.principal_id ===
            principalId,
        );

      return (
        row ??
        null
      ) as T | null;
    }

    if (
      this.#sql.includes(
        "WHERE sesh_creator_id = ?",
      )
    ) {
      const seshCreatorId =
        this.#values[0] as string;

      const row =
        this.#db.rows.find(
          (candidate) =>
            candidate.sesh_creator_id ===
            seshCreatorId,
        );

      return (
        row ??
        null
      ) as T | null;
    }

    return null;
  }

  async run():
  Promise<{
    readonly success:
      boolean;
  }> {
    if (
      this.#db.failWrites
    ) {
      throw new Error(
        "simulated D1 write failure",
      );
    }

    const [
      principalId,
      seshCreatorId,
      createdAt,
    ] =
      this.#values as [
        string,
        string,
        string,
      ];

    if (
      this.#db.rows.some(
        (row) =>
          row.principal_id ===
            principalId ||
          row.sesh_creator_id ===
            seshCreatorId,
      )
    ) {
      throw new Error(
        "UNIQUE constraint failed",
      );
    }

    this.#db.rows.push({
      principal_id:
        principalId,

      sesh_creator_id:
        seshCreatorId,

      created_at:
        createdAt,
    });

    return {
      success:
        true,
    };
  }

  async all<T>():
  Promise<{
    readonly results:
      T[];
  }> {
    return {
      results:
        [] as T[],
    };
  }
}

class FakeDatabase
implements IdentityD1DatabaseLike {
  readonly rows:
    MappingRow[] =
      [];

  failReads =
    false;

  failWrites =
    false;

  prepare(
    sql:
      string,
  ): IdentityD1PreparedStatementLike {
    return new FakeStatement(
      this,
      sql,
    );
  }
}

function mapping() {
  return {
    principalId:
      createPrincipalId(
        "d1-mapping",
      ),

    seshCreatorId:
      createSeshCreatorId(
        "d1-mapping",
      ),

    createdAt:
      "2026-09-21T22:00:00.000Z",
  };
}

test(
  "stores and reloads a canonical principal to Sesh creator mapping through D1",
  async () => {
    const db =
      new FakeDatabase();

    const repository =
      new D1PrincipalSeshCreatorMappingRepository(
        db,
      );

    const canonical =
      mapping();

    const saved =
      await repository.saveMapping(
        canonical,
      );

    assert.deepEqual(
      saved,
      {
        ok:
          true,

        value:
          canonical,
      },
    );

    const loaded =
      await repository.getByPrincipalId(
        canonical.principalId,
      );

    assert.deepEqual(
      loaded,
      {
        ok:
          true,

        value:
          canonical,
      },
    );
  },
);

test(
  "loads mappings by SeshCreatorId",
  async () => {
    const db =
      new FakeDatabase();

    const repository =
      new D1PrincipalSeshCreatorMappingRepository(
        db,
      );

    const canonical =
      mapping();

    await repository.saveMapping(
      canonical,
    );

    const loaded =
      await repository.getBySeshCreatorId(
        canonical.seshCreatorId,
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
        canonical.principalId,
      );
    }
  },
);

test(
  "returns explicit not-found behavior",
  async () => {
    const repository =
      new D1PrincipalSeshCreatorMappingRepository(
        new FakeDatabase(),
      );

    const missing =
      await repository.getByPrincipalId(
        createPrincipalId(
          "missing-mapping",
        ),
      );

    assert.equal(
      missing.ok,
      false,
    );

    if (
      !missing.ok
    ) {
      assert.equal(
        missing.error.kind,
        "not-found",
      );
    }
  },
);

test(
  "enforces one creator mapping per PrincipalId",
  async () => {
    const db =
      new FakeDatabase();

    const repository =
      new D1PrincipalSeshCreatorMappingRepository(
        db,
      );

    const principalId =
      createPrincipalId(
        "principal-conflict",
      );

    await repository.saveMapping({
      principalId,

      seshCreatorId:
        createSeshCreatorId(
          "creator-a",
        ),

      createdAt:
        "2026-09-21T22:00:00.000Z",
    });

    const result =
      await repository.saveMapping({
        principalId,

        seshCreatorId:
          createSeshCreatorId(
            "creator-b",
          ),

        createdAt:
          "2026-09-21T22:00:00.000Z",
      });

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
  "enforces one PrincipalId per SeshCreatorId",
  async () => {
    const db =
      new FakeDatabase();

    const repository =
      new D1PrincipalSeshCreatorMappingRepository(
        db,
      );

    const seshCreatorId =
      createSeshCreatorId(
        "creator-conflict",
      );

    await repository.saveMapping({
      principalId:
        createPrincipalId(
          "principal-a",
        ),

      seshCreatorId,

      createdAt:
        "2026-09-21T22:00:00.000Z",
    });

    const result =
      await repository.saveMapping({
        principalId:
          createPrincipalId(
            "principal-b",
          ),

      seshCreatorId,

      createdAt:
        "2026-09-21T22:00:00.000Z",
    });

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
  "preserves immutable creation timestamp",
  async () => {
    const db =
      new FakeDatabase();

    const repository =
      new D1PrincipalSeshCreatorMappingRepository(
        db,
      );

    const canonical =
      mapping();

    await repository.saveMapping(
      canonical,
    );

    const changed =
      await repository.saveMapping({
        ...canonical,

        createdAt:
          "2026-09-21T23:00:00.000Z",
      });

    assert.equal(
      changed.ok,
      false,
    );

    if (
      !changed.ok
    ) {
      assert.equal(
        changed.error.kind,
        "conflict",
      );
    }
  },
);

test(
  "reports mapping existence without exposing unrelated identity fields",
  async () => {
    const db =
      new FakeDatabase();

    const repository =
      new D1PrincipalSeshCreatorMappingRepository(
        db,
      );

    const canonical =
      mapping();

    await repository.saveMapping(
      canonical,
    );

    const principalExists =
      await repository.mappingExistsForPrincipal(
        canonical.principalId,
      );

    const creatorExists =
      await repository.mappingExistsForCreator(
        canonical.seshCreatorId,
      );

    assert.deepEqual(
      principalExists,
      {
        ok:
          true,

        value:
          true,
      },
    );

    assert.deepEqual(
      creatorExists,
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
  "maps D1 read failures to storage",
  async () => {
    const db =
      new FakeDatabase();

    db.failReads =
      true;

    const repository =
      new D1PrincipalSeshCreatorMappingRepository(
        db,
      );

    const result =
      await repository.getByPrincipalId(
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
  "maps D1 write failures to storage",
  async () => {
    const db =
      new FakeDatabase();

    db.failWrites =
      true;

    const repository =
      new D1PrincipalSeshCreatorMappingRepository(
        db,
      );

    const result =
      await repository.saveMapping(
        mapping(),
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
  "rejects malformed persisted rows",
  async () => {
    const db =
      new FakeDatabase();

    db.rows.push({
      principal_id:
        "not-a-principal",

      sesh_creator_id:
        "not-a-creator",

      created_at:
        "invalid-date",
    });

    const repository =
      new D1PrincipalSeshCreatorMappingRepository(
        db,
      );

    const result =
      await repository.getByPrincipalId(
        "not-a-principal" as never,
      );

    assert.equal(
      result.ok,
      false,
    );
  },
);
