import assert from "node:assert/strict";
import test from "node:test";

import {
  createSeshCreatorId,
} from "../../identifiers";

import {
  D1SeshCreatorProfileRepository,
} from "./d1-creator-profile-repository";

import type {
  SeshD1AllResultLike,
  SeshD1DatabaseLike,
  SeshD1PreparedStatementLike,
  SeshD1RunResultLike,
} from "./types";

interface StoredRow {
  readonly creator_id:
    string;
  readonly schema_version:
    number;
  readonly revision:
    number | null;
  readonly stored_at:
    string;
  readonly payload_json:
    string;
}

class FakeCreatorProfileD1
implements SeshD1DatabaseLike {
  readonly rows =
    new Map<
      string,
      StoredRow
    >();

  fail =
    false;

  prepare(
    sql:
      string,
  ): SeshD1PreparedStatementLike {
    const rows =
      this.rows;

    const shouldFail =
      () =>
        this.fail;

    return new class
    implements SeshD1PreparedStatementLike {
      private values:
        readonly unknown[] =
          [];

      bind(
        ...values:
          readonly unknown[]
      ): SeshD1PreparedStatementLike {
        this.values =
          values;

        return this;
      }

      async first<T>():
      Promise<T | null> {
        if (
          shouldFail()
        ) {
          throw new Error(
            "simulated D1 failure",
          );
        }

        if (
          !sql.includes(
            "FROM sesh_creator_profiles",
          )
        ) {
          return null;
        }

        const creatorId =
          String(
            this.values[0],
          );

        return (
          rows.get(
            creatorId,
          ) ??
          null
        ) as T | null;
      }

      async all<T>():
      Promise<
        SeshD1AllResultLike<T>
      > {
        return {
          results:
            [],
        };
      }

      async run():
      Promise<
        SeshD1RunResultLike
      > {
        if (
          shouldFail()
        ) {
          throw new Error(
            "simulated D1 failure",
          );
        }

        if (
          !sql.includes(
            "INSERT INTO sesh_creator_profiles",
          )
        ) {
          return {
            success:
              true,

            meta: {
              changes:
                0,
            },
          };
        }

        const [
          creatorIdValue,
          schemaVersionValue,
          revisionValue,
          storedAtValue,
          payloadJsonValue,
        ] =
          this.values;

        const creatorId =
          String(
            creatorIdValue,
          );

        if (
          rows.has(
            creatorId,
          )
        ) {
          return {
            success:
              true,

            meta: {
              changes:
                0,
            },
          };
        }

        rows.set(
          creatorId,
          {
            creator_id:
              creatorId,

            schema_version:
              Number(
                schemaVersionValue,
              ),

            revision:
              revisionValue ===
                null
                ? null
                : Number(
                    revisionValue,
                  ),

            stored_at:
              String(
                storedAtValue,
              ),

            payload_json:
              String(
                payloadJsonValue,
              ),
          },
        );

        return {
          success:
            true,

          meta: {
            changes:
              1,
          },
        };
      }
    }();
  }
}

const createdAt =
  "2026-09-22T18:00:00.000Z";

test(
  "D1 creator profile repository creates and reloads a canonical profile",
  async () => {
    const database =
      new FakeCreatorProfileD1();

    const repository =
      new D1SeshCreatorProfileRepository(
        database,
      );

    const creatorId =
      createSeshCreatorId(
        "profile-one",
      );

    const saved =
      await repository.saveCreatorProfile({
        id:
          creatorId,

        displayName:
          "River",

        createdAt,

        handle:
          "river",

        bio:
          "Making music.",
      });

    assert.equal(
      saved.ok,
      true,
    );

    const loaded =
      await repository.getCreatorProfile(
        creatorId,
      );

    assert.deepEqual(
      loaded,
      {
        ok:
          true,

        value: {
          id:
            creatorId,

          displayName:
            "River",

          createdAt,

          handle:
            "river",

          bio:
            "Making music.",
        },
      },
    );
  },
);

test(
  "D1 creator profile creation is idempotent for identical canonical data",
  async () => {
    const repository =
      new D1SeshCreatorProfileRepository(
        new FakeCreatorProfileD1(),
      );

    const profile = {
      id:
        createSeshCreatorId(
          "idempotent",
        ),

      displayName:
        "River",

      createdAt,
    };

    const first =
      await repository.saveCreatorProfile(
        profile,
      );

    const second =
      await repository.saveCreatorProfile(
        profile,
      );

    assert.equal(
      first.ok,
      true,
    );

    assert.equal(
      second.ok,
      true,
    );
  },
);

test(
  "D1 creator profile repository rejects conflicting reuse of a creator id",
  async () => {
    const repository =
      new D1SeshCreatorProfileRepository(
        new FakeCreatorProfileD1(),
      );

    const creatorId =
      createSeshCreatorId(
        "conflict",
      );

    const first =
      await repository.saveCreatorProfile({
        id:
          creatorId,

        displayName:
          "River",

        createdAt,
      });

    assert.equal(
      first.ok,
      true,
    );

    const conflict =
      await repository.saveCreatorProfile({
        id:
          creatorId,

        displayName:
          "Different",

        createdAt,
      });

    assert.equal(
      conflict.ok,
      false,
    );

    if (
      !conflict.ok
    ) {
      assert.equal(
        conflict.error.kind,
        "conflict",
      );
    }
  },
);

test(
  "D1 creator profile repository reports not-found and false existence",
  async () => {
    const repository =
      new D1SeshCreatorProfileRepository(
        new FakeCreatorProfileD1(),
      );

    const creatorId =
      createSeshCreatorId(
        "missing",
      );

    const loaded =
      await repository.getCreatorProfile(
        creatorId,
      );

    assert.equal(
      loaded.ok,
      false,
    );

    if (
      !loaded.ok
    ) {
      assert.equal(
        loaded.error.kind,
        "not-found",
      );
    }

    const exists =
      await repository.creatorProfileExists(
        creatorId,
      );

    assert.deepEqual(
      exists,
      {
        ok:
          true,

        value:
          false,
      },
    );
  },
);

test(
  "D1 creator profile repository fails closed on stored envelope identity mismatch",
  async () => {
    const database =
      new FakeCreatorProfileD1();

    const creatorId =
      createSeshCreatorId(
        "expected",
      );

    database.rows.set(
      creatorId,
      {
        creator_id:
          creatorId,

        schema_version:
          1,

        revision:
          0,

        stored_at:
          "2026-09-22T18:01:00.000Z",

        payload_json:
          JSON.stringify({
            schemaVersion:
              1,

            recordType:
              "creator-profile",

            recordId:
              "sesh-creator:different",

            storedAt:
              "2026-09-22T18:01:00.000Z",

            revision:
              0,

            payload: {
              id:
                "sesh-creator:different",

              displayName:
                "Different",

              createdAt,
            },
          }),
      },
    );

    const repository =
      new D1SeshCreatorProfileRepository(
        database,
      );

    const result =
      await repository.getCreatorProfile(
        creatorId,
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
  "D1 creator profile repository maps provider failures to storage",
  async () => {
    const database =
      new FakeCreatorProfileD1();

    database.fail =
      true;

    const repository =
      new D1SeshCreatorProfileRepository(
        database,
      );

    const result =
      await repository.getCreatorProfile(
        createSeshCreatorId(
          "failure",
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