import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  cancelFoodPhysicalOrderVersion,
  validateFoodPhysicalOrderVersion,
  type FoodPhysicalOrderVersion,
} from "./physical-order-domain";

import {
  appendFoodPhysicalOrderVersion,
  type FoodPhysicalOrderVersionPersistenceD1Database,
} from "./d1-physical-order-version-persistence";

type StoredRow =
  Readonly<{
    order_id: unknown;
    order_version: unknown;
    state: unknown;
    snapshot_format_version: unknown;
    snapshot_json: unknown;
  }>;

type InsertMode =
  | "normal"
  | "throw-empty"
  | "same-race"
  | "divergent-race"
  | "malformed-return"
  | "uncertain-return";

type Call =
  Readonly<{
    sql: string;
    values: readonly unknown[];
  }>;

function requested(
  windowReference =
    "window:008a",
): FoodPhysicalOrderVersion {
  return validateFoodPhysicalOrderVersion({
    id:
      "food-physical-order:008a",
    version:
      1,
    state:
      "requested",
    quote: {
      id:
        "food-merchandise-quote:008a",
      version:
        1,
    },
    fulfillmentIntent: {
      id:
        "food-fulfillment-intent:008a",
      version:
        1,
      method:
        "personal-delivery",
      locationReference:
        "location:008a",
      windowReference,
    },
    reservationRequest: {
      id:
        "food-reservation-request:008a",
      version:
        1,
      capacityRequirements: [
        {
          sku: {
            id:
              "food-sku:008a",
            version:
              1,
          },
          quantity:
            2,
        },
      ],
    },
    lines: [
      {
        sku: {
          id:
            "food-sku:008a",
          version:
            1,
        },
        approvedPrice: {
          id:
            "food-approved-commercial-price:008a",
          version:
            1,
        },
        quantity:
          2,
        unitPrice: {
          currency:
            "USD",
          minorUnits:
            500,
        },
        merchandiseSubtotal: {
          currency:
            "USD",
          minorUnits:
            1000,
        },
      },
    ],
    merchandiseSubtotal: {
      currency:
        "USD",
      minorUnits:
        1000,
    },
  });
}

function cancelled(
  base =
    requested(),
): FoodPhysicalOrderVersion {
  return cancelFoodPhysicalOrderVersion(
    base,
    {
      id:
        base.id,
      version:
        2,
    },
  );
}

function snapshot(
  value: FoodPhysicalOrderVersion,
) {
  return {
    quote:
      value.quote,
    fulfillmentIntent:
      value.fulfillmentIntent,
    reservationRequest:
      value.reservationRequest,
    lines:
      value.lines,
    merchandiseSubtotal:
      value.merchandiseSubtotal,
  };
}

function storedRow(
  value: FoodPhysicalOrderVersion,
): StoredRow {
  return {
    order_id:
      value.id,
    order_version:
      value.version,
    state:
      value.state,
    snapshot_format_version:
      1,
    snapshot_json:
      JSON.stringify(
        snapshot(
          value,
        ),
      ),
  };
}

class Database
implements
  FoodPhysicalOrderVersionPersistenceD1Database {
  readonly rows:
    StoredRow[] =
      [];

  readonly calls:
    Call[] =
      [];

  insertMode:
    InsertMode =
      "normal";

  divergentRaceRow:
    StoredRow | null =
      null;

  failSelect =
    false;

  prepare(
    sql: string,
  ) {
    return {
      bind:
        (
          ...values: unknown[]
        ) => ({
          all:
            async <T>() => {
              this.calls.push(
                Object.freeze({
                  sql,
                  values:
                    Object.freeze([
                      ...values,
                    ]),
                }),
              );

              if (
                this.failSelect &&
                /^\s*SELECT\b/i.test(
                  sql,
                )
              ) {
                throw new Error(
                  "synthetic select failure",
                );
              }

              if (
                sql.includes(
                  "WHERE order_id = ?",
                ) &&
                sql.includes(
                  "AND order_version = ?",
                )
              ) {
                const [
                  id,
                  version,
                ] =
                  values;

                const found =
                  this.rows.filter(
                    (
                      row,
                    ) =>
                      row.order_id === id &&
                      row.order_version === version,
                  );

                return {
                  success:
                    true,
                  results:
                    found as T[],
                };
              }

              if (
                sql.includes(
                  "ORDER BY order_version DESC",
                )
              ) {
                const [
                  id,
                ] =
                  values;

                const found =
                  this.rows
                    .filter(
                      (
                        row,
                      ) =>
                        row.order_id === id,
                    )
                    .sort(
                      (
                        left,
                        right,
                      ) =>
                        Number(
                          right.order_version,
                        ) -
                        Number(
                          left.order_version,
                        ),
                    )
                    .slice(
                      0,
                      1,
                    );

                return {
                  success:
                    true,
                  results:
                    found as T[],
                };
              }

              if (
                /^\s*INSERT\b/i.test(
                  sql,
                )
              ) {
                const row:
                  StoredRow =
                    Object.freeze({
                      order_id:
                        values[0],
                      order_version:
                        values[1],
                      state:
                        values[2],
                      snapshot_format_version:
                        values[3],
                      snapshot_json:
                        values[4],
                    });

                if (
                  this.insertMode ===
                  "throw-empty"
                ) {
                  throw new Error(
                    "synthetic insert failure",
                  );
                }

                if (
                  this.insertMode ===
                  "same-race"
                ) {
                  this.rows.push(
                    row,
                  );

                  throw new Error(
                    "synthetic concurrent exact insert",
                  );
                }

                if (
                  this.insertMode ===
                  "divergent-race"
                ) {
                  if (
                    this.divergentRaceRow ===
                    null
                  ) {
                    throw new Error(
                      "missing divergent race row fixture",
                    );
                  }

                  this.rows.push(
                    this.divergentRaceRow,
                  );

                  throw new Error(
                    "synthetic divergent race",
                  );
                }

                if (
                  this.insertMode ===
                  "uncertain-return"
                ) {
                  return {
                    success:
                      false,
                    results:
                      [],
                  } as {
                    success: boolean;
                    results: T[];
                  };
                }

                this.rows.push(
                  row,
                );

                if (
                  this.insertMode ===
                  "malformed-return"
                ) {
                  return {
                    success:
                      true,
                    results: [
                      {
                        ...row,
                        snapshot_format_version:
                          2,
                      },
                    ] as T[],
                  };
                }

                return {
                  success:
                    true,
                  results: [
                    row,
                  ] as T[],
                };
              }

              throw new Error(
                `Unexpected FOOD-008A SQL: ${sql}`,
              );
            },
        }),
    };
  }
}

test(
  "008A creates authoritative requested version one",
  async () => {
    const database =
      new Database();

    const order =
      requested();

    const result =
      await appendFoodPhysicalOrderVersion(
        database,
        order,
      );

    assert.equal(
      result.outcome,
      "created",
    );

    if (
      result.outcome !==
      "created"
    ) {
      return;
    }

    assert.deepEqual(
      result.value,
      order,
    );

    assert.equal(
      database.rows.length,
      1,
    );

    assert.deepEqual(
      database.rows[0],
      storedRow(
        order,
      ),
    );

    assert.equal(
      Object.isFrozen(
        result,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        result.value,
      ),
      true,
    );
  },
);

test(
  "008A exact requested replay is already-present without another insert",
  async () => {
    const database =
      new Database();

    const order =
      requested();

    database.rows.push(
      storedRow(
        order,
      ),
    );

    const result =
      await appendFoodPhysicalOrderVersion(
        database,
        order,
      );

    assert.equal(
      result.outcome,
      "already-present",
    );

    assert.equal(
      database.calls.filter(
        (
          call,
        ) =>
          /^\s*INSERT\b/i.test(
            call.sql,
          ),
      ).length,
      0,
    );
  },
);

test(
  "008A same identity and version with divergent canonical content conflicts",
  async () => {
    const database =
      new Database();

    database.rows.push(
      storedRow(
        requested(
          "window:durable-other",
        ),
      ),
    );

    const result =
      await appendFoodPhysicalOrderVersion(
        database,
        requested(),
      );

    assert.deepEqual(
      result,
      {
        outcome:
          "conflict",
      },
    );
  },
);

test(
  "008A rejects structurally invalid input before database access",
  async () => {
    const database =
      new Database();

    const result =
      await appendFoodPhysicalOrderVersion(
        database,
        {
          id:
            "wrong-prefix:008a",
          version:
            1,
          state:
            "requested",
        },
      );

    assert.deepEqual(
      result,
      {
        outcome:
          "invalid",
      },
    );

    assert.equal(
      database.calls.length,
      0,
    );
  },
);

test(
  "008A requested version two is lifecycle conflict",
  async () => {
    const database =
      new Database();

    const base =
      requested();

    const versionTwoRequested =
      validateFoodPhysicalOrderVersion({
        ...base,
        version:
          2,
      });

    const result =
      await appendFoodPhysicalOrderVersion(
        database,
        versionTwoRequested,
      );

    assert.deepEqual(
      result,
      {
        outcome:
          "conflict",
      },
    );

    assert.equal(
      database.calls.some(
        (
          call,
        ) =>
          /^\s*INSERT\b/i.test(
            call.sql,
          ),
      ),
      false,
    );
  },
);

test(
  "008A cancelled version one is lifecycle conflict",
  async () => {
    const database =
      new Database();

    const invalidLifecycle =
      validateFoodPhysicalOrderVersion({
        ...requested(),
        state:
          "cancelled",
      });

    const result =
      await appendFoodPhysicalOrderVersion(
        database,
        invalidLifecycle,
      );

    assert.deepEqual(
      result,
      {
        outcome:
          "conflict",
      },
    );
  },
);

test(
  "008A versions above FOOD-005E terminal cancellation conflict",
  async () => {
    const database =
      new Database();

    const versionThree =
      validateFoodPhysicalOrderVersion({
        ...cancelled(),
        version:
          3,
      });

    const result =
      await appendFoodPhysicalOrderVersion(
        database,
        versionThree,
      );

    assert.deepEqual(
      result,
      {
        outcome:
          "conflict",
      },
    );
  },
);

test(
  "008A cancellation requires durable requested predecessor",
  async () => {
    const database =
      new Database();

    const result =
      await appendFoodPhysicalOrderVersion(
        database,
        cancelled(),
      );

    assert.deepEqual(
      result,
      {
        outcome:
          "conflict",
      },
    );

    assert.equal(
      database.calls.some(
        (
          call,
        ) =>
          /^\s*INSERT\b/i.test(
            call.sql,
          ),
      ),
      false,
    );
  },
);

test(
  "008A cancellation requires byte-exact canonical predecessor snapshot",
  async () => {
    const database =
      new Database();

    const targetRequested =
      requested();

    const targetCancelled =
      cancelled(
        targetRequested,
      );

    database.rows.push(
      storedRow(
        requested(
          "window:different",
        ),
      ),
    );

    const result =
      await appendFoodPhysicalOrderVersion(
        database,
        targetCancelled,
      );

    assert.deepEqual(
      result,
      {
        outcome:
          "conflict",
      },
    );
  },
);

test(
  "008A creates terminal cancellation after exact requested predecessor",
  async () => {
    const database =
      new Database();

    const first =
      requested();

    database.rows.push(
      storedRow(
        first,
      ),
    );

    const second =
      cancelled(
        first,
      );

    const result =
      await appendFoodPhysicalOrderVersion(
        database,
        second,
      );

    assert.equal(
      result.outcome,
      "created",
    );

    assert.equal(
      database.rows.length,
      2,
    );

    assert.deepEqual(
      database.rows[1],
      storedRow(
        second,
      ),
    );
  },
);

test(
  "008A exact cancellation replay remains already-present",
  async () => {
    const database =
      new Database();

    const first =
      requested();

    const second =
      cancelled(
        first,
      );

    database.rows.push(
      storedRow(
        first,
      ),
      storedRow(
        second,
      ),
    );

    const result =
      await appendFoodPhysicalOrderVersion(
        database,
        second,
      );

    assert.equal(
      result.outcome,
      "already-present",
    );

    assert.equal(
      database.calls.filter(
        (
          call,
        ) =>
          /^\s*INSERT\b/i.test(
            call.sql,
          ),
      ).length,
      0,
    );
  },
);

test(
  "008A same concurrent exact insert resolves to already-present",
  async () => {
    const database =
      new Database();

    database.insertMode =
      "same-race";

    const result =
      await appendFoodPhysicalOrderVersion(
        database,
        requested(),
      );

    assert.equal(
      result.outcome,
      "already-present",
    );

    assert.equal(
      database.rows.length,
      1,
    );
  },
);

test(
  "008A divergent concurrent exact insert resolves to conflict",
  async () => {
    const database =
      new Database();

    database.insertMode =
      "divergent-race";

    database.divergentRaceRow =
      storedRow(
        requested(
          "window:race-other",
        ),
      );

    const result =
      await appendFoodPhysicalOrderVersion(
        database,
        requested(),
      );

    assert.deepEqual(
      result,
      {
        outcome:
          "conflict",
      },
    );
  },
);

test(
  "008A unclassifiable insert failure is storage-failure and never blindly retries",
  async () => {
    const database =
      new Database();

    database.insertMode =
      "throw-empty";

    const result =
      await appendFoodPhysicalOrderVersion(
        database,
        requested(),
      );

    assert.deepEqual(
      result,
      {
        outcome:
          "storage-failure",
      },
    );

    assert.equal(
      database.calls.filter(
        (
          call,
        ) =>
          /^\s*INSERT\b/i.test(
            call.sql,
          ),
      ).length,
      1,
    );
  },
);

test(
  "008A malformed durable exact row fails closed",
  async () => {
    const database =
      new Database();

    database.rows.push({
      ...storedRow(
        requested(),
      ),
      snapshot_format_version:
        999,
    });

    const result =
      await appendFoodPhysicalOrderVersion(
        database,
        requested(),
      );

    assert.deepEqual(
      result,
      {
        outcome:
          "storage-failure",
      },
    );
  },
);

test(
  "008A noncanonical durable snapshot JSON fails closed",
  async () => {
    const database =
      new Database();

    const row =
      storedRow(
        requested(),
      );

    database.rows.push({
      ...row,
      snapshot_json:
        JSON.stringify(
          JSON.parse(
            String(
              row.snapshot_json,
            ),
          ),
          null,
          2,
        ),
    });

    const result =
      await appendFoodPhysicalOrderVersion(
        database,
        requested(),
      );

    assert.deepEqual(
      result,
      {
        outcome:
          "storage-failure",
      },
    );
  },
);

test(
  "008A D1 read failure becomes storage-failure",
  async () => {
    const database =
      new Database();

    database.failSelect =
      true;

    const result =
      await appendFoodPhysicalOrderVersion(
        database,
        requested(),
      );

    assert.deepEqual(
      result,
      {
        outcome:
          "storage-failure",
      },
    );
  },
);

test(
  "008A uncertain insert result becomes storage-failure after exact reread",
  async () => {
    const database =
      new Database();

    database.insertMode =
      "uncertain-return";

    const result =
      await appendFoodPhysicalOrderVersion(
        database,
        requested(),
      );

    assert.deepEqual(
      result,
      {
        outcome:
          "storage-failure",
      },
    );

    assert.equal(
      database.calls.filter(
        (
          call,
        ) =>
          /^\s*INSERT\b/i.test(
            call.sql,
          ),
      ).length,
      1,
    );
  },
);

test(
  "008A malformed INSERT RETURNING resolves from exact canonical durable reread",
  async () => {
    const database =
      new Database();

    database.insertMode =
      "malformed-return";

    const expected =
      requested();

    const result =
      await appendFoodPhysicalOrderVersion(
        database,
        expected,
      );

    assert.equal(
      result.outcome,
      "already-present",
    );

    if (
      result.outcome !==
      "already-present"
    ) {
      return;
    }

    assert.deepEqual(
      result.value,
      expected,
    );

    /*
     * The synthetic INSERT persisted the canonical durable row but supplied
     * an unusable RETURNING witness. FOOD-008A must not blindly retry the
     * write. Its one authoritative exact reread therefore classifies the
     * operation as an idempotent already-present result.
     */
    const inserts =
      database.calls.filter(
        (
          call,
        ) =>
          /^\s*INSERT\b/i.test(
            call.sql,
          ),
      );

    assert.equal(
      inserts.length,
      1,
    );

    const exactReads =
      database.calls.filter(
        (
          call,
        ) =>
          call.sql.includes(
            "AND order_version = ?",
          ),
      );

    assert.equal(
      exactReads.length,
      2,
    );

    assert.deepEqual(
      exactReads[0]!.values,
      [
        expected.id,
        expected.version,
      ],
    );

    assert.deepEqual(
      exactReads[1]!.values,
      [
        expected.id,
        expected.version,
      ],
    );
  },
);
test(
  "008A detaches caller input before asynchronous storage work",
  async () => {
    const database =
      new Database();

    const source =
      JSON.parse(
        JSON.stringify(
          requested(),
        ),
      ) as {
        lines: Array<{
          quantity: number;
        }>;
        fulfillmentIntent: {
          windowReference: string;
        };
      };

    const promise =
      appendFoodPhysicalOrderVersion(
        database,
        source,
      );

    source.lines[0]!.quantity =
      999;

    source.fulfillmentIntent.windowReference =
      "window:mutated-after-call";

    const result =
      await promise;

    assert.equal(
      result.outcome,
      "created",
    );

    if (
      result.outcome !==
      "created"
    ) {
      return;
    }

    assert.equal(
      result.value.lines[0]!.quantity,
      2,
    );

    assert.equal(
      result.value.fulfillmentIntent.windowReference,
      "window:008a",
    );
  },
);

test(
  "008A SQL is limited to exact/latest reads and one append INSERT surface",
  async () => {
    const database =
      new Database();

    await appendFoodPhysicalOrderVersion(
      database,
      requested(),
    );

    const sql =
      database.calls
        .map(
          (
            call,
          ) =>
            call.sql,
        )
        .join(
          "\n",
        );

    assert.match(
      sql,
      /FROM food_physical_order_versions/,
    );

    assert.match(
      sql,
      /WHERE order_id = \?/,
    );

    assert.match(
      sql,
      /AND order_version = \?/,
    );

    assert.match(
      sql,
      /ORDER BY order_version DESC/,
    );

    assert.match(
      sql,
      /INSERT INTO food_physical_order_versions/,
    );

    assert.doesNotMatch(
      sql,
      /\bUPDATE\b|\bDELETE\b|\bUPSERT\b/i,
    );
  },
);

test(
  "008A implementation grants no payment readiness or operational authority",
  () => {
    const source =
      readFileSync(
        new URL(
          "./d1-physical-order-version-persistence.ts",
          import.meta.url,
        ),
        "utf8",
      );

    assert.doesNotMatch(
      source,
      /Date\.now|new Date|process\.env|fetch\s*\(|Math\.random|randomUUID|Stripe|Square|PayPal|paymentIntent/i,
    );

    assert.doesNotMatch(
      source,
      /database\.batch|\.batch\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\bUPDATE\s+\S+\s+SET\b|\bDELETE\s+FROM\b|\bUPSERT\b/i,
    );

    assert.doesNotMatch(
      source,
      /checkoutReady\s*:|paymentReady\s*:|paidInFull\s*:|dispatchReady\s*:|completedSale\s*:/,
    );

    assert.equal(
      (
        source.match(
          /export async function\s+appendFoodPhysicalOrderVersion/g,
        ) ?? []
      ).length,
      1,
    );

    assert.equal(
      (
        source.match(
          /export async function\s+readFoodPhysicalOrder/g,
        ) ?? []
      ).length,
      0,
    );
  },
);

test(
  "008A migration stays declarative append-only and unexecuted by source",
  () => {
    const migration =
      readFileSync(
        new URL(
          "../../../migrations/food/0008_food_physical_order_versions.sql",
          import.meta.url,
        ),
        "utf8",
      );

    assert.match(
      migration,
      /CREATE TABLE IF NOT EXISTS food_physical_order_versions/,
    );

    assert.match(
      migration,
      /PRIMARY KEY\s*\(\s*order_id,\s*order_version\s*\)/,
    );

    assert.match(
      migration,
      /food_physical_order_versions_initial_guard/,
    );

    assert.match(
      migration,
      /food_physical_order_versions_cancel_guard/,
    );

    assert.match(
      migration,
      /BEFORE UPDATE ON food_physical_order_versions/,
    );

    assert.match(
      migration,
      /BEFORE DELETE ON food_physical_order_versions/,
    );

    assert.doesNotMatch(
      migration,
      /^\s*(?:ALTER\s+TABLE|DROP\s+(?:TABLE|TRIGGER)|UPDATE\s+\S+\s+SET|DELETE\s+FROM|INSERT\s+INTO)\b/im,
    );
  },
);
