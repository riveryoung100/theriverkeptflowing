import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeSeshCreatorHandle,
} from "../../creator-handle";

import {
  createSeshCreatorId,
} from "../../identifiers";

import type {
  SeshD1AllResultLike,
  SeshD1DatabaseLike,
  SeshD1PreparedStatementLike,
  SeshD1RunResultLike,
} from "./types";

import {
  D1SeshCreatorHandleReservationRepository,
} from "./d1-creator-handle-reservation-repository";

interface Row {
  readonly normalized_handle:
    string;

  readonly creator_id:
    string;

  readonly created_at:
    string;
}

class FakeHandleD1
implements SeshD1DatabaseLike {
  readonly byHandle =
    new Map<
      string,
      Row
    >();

  fail =
    false;

  prepare(
    sql:
      string,
  ): SeshD1PreparedStatementLike {
    const byHandle =
      this.byHandle;

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
          sql.includes(
            "WHERE normalized_handle = ?",
          )
        ) {
          return (
            byHandle.get(
              String(
                this.values[0],
              ),
            ) ??
            null
          ) as T | null;
        }

        if (
          sql.includes(
            "WHERE creator_id = ?",
          )
        ) {
          const creatorId =
            String(
              this.values[0],
            );

          for (
            const row of
              byHandle.values()
          ) {
            if (
              row.creator_id ===
                creatorId
            ) {
              return row as
                T;
            }
          }

          return null;
        }

        return null;
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
          sql.includes(
            "INSERT INTO sesh_creator_handle_reservations",
          )
        ) {
          const normalizedHandle =
            String(
              this.values[0],
            );

          const creatorId =
            String(
              this.values[1],
            );

          if (
            byHandle.has(
              normalizedHandle,
            )
          ) {
            throw new Error(
              "UNIQUE constraint failed: sesh_creator_handle_reservations.normalized_handle",
            );
          }

          for (
            const row of
              byHandle.values()
          ) {
            if (
              row.creator_id ===
                creatorId
            ) {
              throw new Error(
                "UNIQUE constraint failed: sesh_creator_handle_reservations.creator_id",
              );
            }
          }

          byHandle.set(
            normalizedHandle,
            {
              normalized_handle:
                normalizedHandle,

              creator_id:
                creatorId,

              created_at:
                String(
                  this.values[2],
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

        if (
          sql.includes(
            "DELETE FROM sesh_creator_handle_reservations",
          )
        ) {
          const normalizedHandle =
            String(
              this.values[0],
            );

          const creatorId =
            String(
              this.values[1],
            );

          const existing =
            byHandle.get(
              normalizedHandle,
            );

          if (
            existing ===
              undefined ||
            existing.creator_id !==
              creatorId
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

          byHandle.delete(
            normalizedHandle,
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

        return {
          success:
            true,

          meta: {
            changes:
              0,
          },
        };
      }
    }();
  }
}

const createdAt =
  "2026-09-22T20:00:00.000Z";

test(
  "reserves and reloads a canonical creator handle",
  async () => {
    const database =
      new FakeHandleD1();

    const repository =
      new D1SeshCreatorHandleReservationRepository(
        database,
      );

    const creatorId =
      createSeshCreatorId(
        "creator-one",
      );

    const normalizedHandle =
      normalizeSeshCreatorHandle(
        "River_Young",
      );

    const saved =
      await repository.reserveHandle({
        normalizedHandle,
        creatorId,
        createdAt,
      });

    assert.equal(
      saved.ok,
      true,
    );

    const loaded =
      await repository.getByHandle(
        normalizedHandle,
      );

    assert.equal(
      loaded.ok,
      true,
    );

    if (
      loaded.ok
    ) {
      assert.equal(
        loaded.value.creatorId,
        creatorId,
      );
    }
  },
);

test(
  "same creator and same handle reservation is idempotent",
  async () => {
    const repository =
      new D1SeshCreatorHandleReservationRepository(
        new FakeHandleD1(),
      );

    const reservation = {
      normalizedHandle:
        normalizeSeshCreatorHandle(
          "river",
        ),

      creatorId:
        createSeshCreatorId(
          "creator-one",
        ),

      createdAt,
    };

    assert.equal(
      (
        await repository.reserveHandle(
          reservation,
        )
      ).ok,
      true,
    );

    assert.equal(
      (
        await repository.reserveHandle(
          reservation,
        )
      ).ok,
      true,
    );
  },
);

test(
  "rejects one normalized handle across different creators",
  async () => {
    const repository =
      new D1SeshCreatorHandleReservationRepository(
        new FakeHandleD1(),
      );

    const normalizedHandle =
      normalizeSeshCreatorHandle(
        "river",
      );

    await repository.reserveHandle({
      normalizedHandle,

      creatorId:
        createSeshCreatorId(
          "creator-one",
        ),

      createdAt,
    });

    const conflict =
      await repository.reserveHandle({
        normalizedHandle,

        creatorId:
          createSeshCreatorId(
            "creator-two",
          ),

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
  "rejects multiple handles for one creator",
  async () => {
    const repository =
      new D1SeshCreatorHandleReservationRepository(
        new FakeHandleD1(),
      );

    const creatorId =
      createSeshCreatorId(
        "creator-one",
      );

    await repository.reserveHandle({
      normalizedHandle:
        normalizeSeshCreatorHandle(
          "river",
        ),

      creatorId,
      createdAt,
    });

    const conflict =
      await repository.reserveHandle({
        normalizedHandle:
          normalizeSeshCreatorHandle(
            "river-two",
          ),

      creatorId,
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
  "releases only the exact handle and creator pairing",
  async () => {
    const repository =
      new D1SeshCreatorHandleReservationRepository(
        new FakeHandleD1(),
      );

    const creatorId =
      createSeshCreatorId(
        "creator-one",
      );

    const normalizedHandle =
      normalizeSeshCreatorHandle(
        "river",
      );

    await repository.reserveHandle({
      normalizedHandle,
      creatorId,
      createdAt,
    });

    const wrongCreator =
      await repository.releaseHandle(
        normalizedHandle,
        createSeshCreatorId(
          "creator-two",
        ),
      );

    assert.equal(
      wrongCreator.ok &&
        wrongCreator.value,
      false,
    );

    const released =
      await repository.releaseHandle(
        normalizedHandle,
        creatorId,
      );

    assert.equal(
      released.ok &&
        released.value,
      true,
    );

    const missing =
      await repository.getByHandle(
        normalizedHandle,
      );

    assert.equal(
      missing.ok,
      false,
    );
  },
);

test(
  "maps D1 failure to storage",
  async () => {
    const database =
      new FakeHandleD1();

    database.fail =
      true;

    const repository =
      new D1SeshCreatorHandleReservationRepository(
        database,
      );

    const result =
      await repository.getByHandle(
        normalizeSeshCreatorHandle(
          "river",
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