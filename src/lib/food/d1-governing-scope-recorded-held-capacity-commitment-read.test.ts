import assert from "node:assert/strict";
import test from "node:test";

import {
  FOOD_GOVERNING_SCOPE_RECORDED_HELD_CAPACITY_COMMITMENT_KIND,
  readFoodGoverningScopeRecordedHeldCapacityCommitment,
} from "./d1-governing-scope-recorded-held-capacity-commitment-read";

type Mode =
  | "ok"
  | "failure"
  | "missing-results"
  | "multi"
  | "malformed"
  | "prepare-throw"
  | "bind-throw"
  | "all-throw";

class Database {
  readonly calls:
    Array<{
      sql: string;
      bound: unknown[];
    }> = [];

  mode: Mode = "ok";

  quantity = 0;

  prepare(
    sql: string,
  ) {
    if (
      this.mode ===
      "prepare-throw"
    ) {
      throw new Error(
        "prepare failed",
      );
    }

    return {
      bind:
        (...bound: unknown[]) => {
          if (
            this.mode ===
            "bind-throw"
          ) {
            throw new Error(
              "bind failed",
            );
          }

          this.calls.push({
            sql,
            bound,
          });

          return {
            all:
              async <T>() => {
                if (
                  this.mode ===
                  "all-throw"
                ) {
                  throw new Error(
                    "all failed",
                  );
                }

                if (
                  this.mode ===
                  "failure"
                ) {
                  return {
                    success: false,
                    results: [],
                  };
                }

                if (
                  this.mode ===
                  "missing-results"
                ) {
                  return {
                    success: true,
                  };
                }

                if (
                  this.mode ===
                  "multi"
                ) {
                  return {
                    success: true,
                    results: [
                      {
                        recorded_held_quantity:
                          this.quantity,
                      },
                      {
                        recorded_held_quantity:
                          this.quantity,
                      },
                    ] as T[],
                  };
                }

                if (
                  this.mode ===
                  "malformed"
                ) {
                  return {
                    success: true,
                    results: [
                      {
                        wrong:
                          this.quantity,
                      },
                    ] as T[],
                  };
                }

                return {
                  success: true,
                  results: [
                    {
                      recorded_held_quantity:
                        this.quantity,
                    },
                  ] as T[],
                };
              },
          };
        },
    };
  }
}

function skuSelector() {
  return {
    scope: "sku" as const,
    sku: {
      id: "food-sku:007j",
      version: 2,
    },
    governingRevision: 7,
  };
}

function slotSelector() {
  return {
    scope: "slot" as const,
    method:
      "personal-delivery" as const,
    locationReference:
      "location:007j",
    windowReference:
      "window:007j",
    governingRevision: 9,
  };
}

test(
  "007Q reads recorded held SKU commitment for one exact capacity revision",
  async () => {
    const database =
      new Database();

    database.quantity = 6;

    const result =
      await readFoodGoverningScopeRecordedHeldCapacityCommitment(
        database,
        skuSelector(),
      );

    assert.equal(
      result.outcome,
      "read",
    );

    if (
      result.outcome !==
      "read"
    ) {
      throw new Error(
        "expected read",
      );
    }

    assert.deepEqual(
      result.value,
      {
        kind:
          FOOD_GOVERNING_SCOPE_RECORDED_HELD_CAPACITY_COMMITMENT_KIND,
        scope: "sku",
        selector: {
          sku: {
            id:
              "food-sku:007j",
            version: 2,
          },
          governingRevision: 7,
        },
        recordedHeldQuantity: 6,
      },
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

    assert.equal(
      Object.isFrozen(
        result.value.selector,
      ),
      true,
    );

    assert.equal(
      database.calls.length,
      1,
    );

    assert.deepEqual(
      database.calls[0]!.bound,
      [
        "food-sku:007j",
        2,
        7,
      ],
    );

    assert.match(
      database.calls[0]!.sql,
      /SUM\(line\.quantity\)/,
    );

    assert.match(
      database.calls[0]!.sql,
      /food_capacity_reservation_lines/,
    );

    assert.match(
      database.calls[0]!.sql,
      /food_capacity_reservations/,
    );

    assert.match(
      database.calls[0]!.sql,
      /reservation\.state = 'held'/,
    );

    assert.match(
      database.calls[0]!.sql,
      /line\.capacity_revision <= \?/,
    );
  },
);

test(
  "007Q represents no matching recorded held rows as zero rather than absence authority",
  async () => {
    const database =
      new Database();

    database.quantity = 0;

    const result =
      await readFoodGoverningScopeRecordedHeldCapacityCommitment(
        database,
        skuSelector(),
      );

    assert.equal(
      result.outcome,
      "read",
    );

    if (
      result.outcome !==
      "read"
    ) {
      throw new Error(
        "expected read",
      );
    }

    assert.equal(
      result.value.recordedHeldQuantity,
      0,
    );
  },
);

test(
  "007Q reads recorded held fulfillment-slot commitment for one exact slot revision",
  async () => {
    const database =
      new Database();

    database.quantity = 3;

    const result =
      await readFoodGoverningScopeRecordedHeldCapacityCommitment(
        database,
        slotSelector(),
      );

    assert.equal(
      result.outcome,
      "read",
    );

    if (
      result.outcome !==
      "read"
    ) {
      throw new Error(
        "expected read",
      );
    }

    assert.deepEqual(
      result.value,
      {
        kind:
          FOOD_GOVERNING_SCOPE_RECORDED_HELD_CAPACITY_COMMITMENT_KIND,
        scope: "slot",
        selector: {
          method:
            "personal-delivery",
          locationReference:
            "location:007j",
          windowReference:
            "window:007j",
          governingRevision: 9,
        },
        recordedHeldQuantity: 3,
      },
    );

    assert.equal(
      database.calls.length,
      1,
    );

    assert.deepEqual(
      database.calls[0]!.bound,
      [
        "personal-delivery",
        "location:007j",
        "window:007j",
        9,
      ],
    );

    assert.match(
      database.calls[0]!.sql,
      /SUM\(slot\.quantity\)/,
    );

    assert.match(
      database.calls[0]!.sql,
      /food_fulfillment_slot_reservations/,
    );

    assert.match(
      database.calls[0]!.sql,
      /reservation\.state = 'held'/,
    );

    assert.match(
      database.calls[0]!.sql,
      /slot\.capacity_revision <= \?/,
    );
  },
);

test(
  "007Q rejects malformed SKU selector before database access",
  async () => {
    const database =
      new Database();

    const result =
      await readFoodGoverningScopeRecordedHeldCapacityCommitment(
        database,
        {
          ...skuSelector(),
          governingRevision: 0,
        } as never,
      );

    assert.deepEqual(
      result,
      {
        outcome: "invalid",
      },
    );

    assert.equal(
      database.calls.length,
      0,
    );
  },
);

test(
  "007Q rejects malformed slot selector before database access",
  async () => {
    const database =
      new Database();

    const result =
      await readFoodGoverningScopeRecordedHeldCapacityCommitment(
        database,
        {
          ...slotSelector(),
          method:
            "shipping",
        } as never,
      );

    assert.deepEqual(
      result,
      {
        outcome: "invalid",
      },
    );

    assert.equal(
      database.calls.length,
      0,
    );
  },
);

test(
  "007Q rejects extra authority-bearing selector fields before database access",
  async () => {
    const database =
      new Database();

    const result =
      await readFoodGoverningScopeRecordedHeldCapacityCommitment(
        database,
        {
          ...skuSelector(),
          active: true,
        } as never,
      );

    assert.deepEqual(
      result,
      {
        outcome: "invalid",
      },
    );

    assert.equal(
      database.calls.length,
      0,
    );
  },
);

test(
  "007Q rejects selector accessors without invoking them",
  async () => {
    const database =
      new Database();

    let calls = 0;

    const input =
      skuSelector();

    Object.defineProperty(
      input,
      "scope",
      {
        enumerable: true,
        get() {
          calls += 1;

          return "sku";
        },
      },
    );

    const result =
      await readFoodGoverningScopeRecordedHeldCapacityCommitment(
        database,
        input,
      );

    assert.deepEqual(
      result,
      {
        outcome: "invalid",
      },
    );

    assert.equal(
      calls,
      0,
    );

    assert.equal(
      database.calls.length,
      0,
    );
  },
);

for (
  const mode of
    [
      "failure",
      "missing-results",
      "multi",
      "malformed",
      "prepare-throw",
      "bind-throw",
      "all-throw",
    ] as const
) {
  test(
    `007Q fails closed on ${mode} storage behavior`,
    async () => {
      const database =
        new Database();

      database.mode = mode;

      const result =
        await readFoodGoverningScopeRecordedHeldCapacityCommitment(
          database,
          skuSelector(),
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
}

for (
  const quantity of
    [
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1,
    ]
) {
  test(
    `007Q rejects malformed aggregate quantity ${String(quantity)}`,
    async () => {
      const database =
        new Database();

      database.quantity =
        quantity;

      const result =
        await readFoodGoverningScopeRecordedHeldCapacityCommitment(
          database,
          skuSelector(),
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
}

test(
  "007Q SQL is read-only and exact-revision scoped",
  async () => {
    const skuDatabase =
      new Database();

    const slotDatabase =
      new Database();

    await readFoodGoverningScopeRecordedHeldCapacityCommitment(
      skuDatabase,
      skuSelector(),
    );

    await readFoodGoverningScopeRecordedHeldCapacityCommitment(
      slotDatabase,
      slotSelector(),
    );

    const sql =
      [
        skuDatabase.calls[0]!.sql,
        slotDatabase.calls[0]!.sql,
      ].join("\n");

    assert.doesNotMatch(
      sql,
      /\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bUPSERT\b/i,
    );

    assert.doesNotMatch(
      sql,
      /food_sku_capacity_sources|food_fulfillment_slot_capacity_sources/i,
    );

    assert.match(
      sql,
      /capacity_revision <= \?/,
    );

    assert.match(
      sql,
      /state = 'held'/,
    );
  },
);

test(
  "007Q result surface does not claim active remaining reservable ATP governing acceptance or physical authority",
  async () => {
    const database =
      new Database();

    database.quantity = 4;

    const result =
      await readFoodGoverningScopeRecordedHeldCapacityCommitment(
        database,
        skuSelector(),
      );

    assert.equal(
      result.outcome,
      "read",
    );

    const serialized =
      JSON.stringify(
        result,
      ).toLowerCase();

    for (
      const forbidden of
        [
          '"active"',
          '"remaining"',
          '"reservable"',
          '"atp"',
          '"governing"',
          '"eligible"',
          '"trusted"',
          '"accepted"',
          '"acceptance"',
          '"quantityonhand"',
          '"available"',
          '"orderable"',
          '"checkoutready"',
          '"paymentready"',
          '"released"',
          '"expired"',
          '"cancelled"',
          '"consumed"',
        ]
    ) {
      assert.equal(
        serialized.includes(
          forbidden,
        ),
        false,
        forbidden,
      );
    }
  },
);
