import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createFoodSkuId } from "./package-sku-domain";
import {
  createFoodProductionBatchId,
  validateFoodProductionBatchVersion,
} from "./production-batch-domain";
import {
  createFoodPhysicalInventoryMovementId,
  validateFoodPhysicalInventoryMovement,
} from "./physical-inventory-movement-domain";
import {
  listFoodPhysicalInventoryMovementsByExactBatch,
  listFoodProductionBatchesByExactSku,
  type FoodInventoryEvidenceReadD1Database,
  type FoodInventoryEvidenceReadD1Statement,
} from "./d1-inventory-evidence-read-persistence";

type Primitive =
  | string
  | number
  | null;

const skuId =
  createFoodSkuId(
    "synthetic-sku",
  );

const batchId = (
  local: string,
) =>
  createFoodProductionBatchId(
    local,
  );

const movementId = (
  local: string,
) =>
  createFoodPhysicalInventoryMovementId(
    local,
  );

function batchRow(
  local: string,
  version = 1,
  skuVersion = 2,
): Record<string, unknown> {
  return {
    batch_id:
      batchId(local),
    version,
    sku_id:
      skuId,
    sku_version:
      skuVersion,
    batch_code:
      local,
    storage_mode:
      "frozen",
    produced_package_count:
      10,
    prepared_on:
      "2026-10-14",
    frozen_on:
      "2026-10-14",
    attribution:
      "synthetic:test",
    source_reference:
      `synthetic:${local}`,
  };
}

function movementRow(
  local: string,
  batchLocal = "batch-a",
): Record<string, unknown> {
  return {
    movement_id:
      movementId(local),
    batch_id:
      batchId(batchLocal),
    batch_version:
      1,
    sku_id:
      skuId,
    sku_version:
      2,
    movement_type:
      "adjustment-in",
    package_count:
      2,
    occurred_on:
      "2026-10-14",
    attribution:
      "synthetic:test",
    source_reference:
      `synthetic:${local}`,
  };
}

class MemoryDatabase
implements FoodInventoryEvidenceReadD1Database {
  readonly batches:
    Record<string, unknown>[] = [];

  readonly movements:
    Record<string, unknown>[] = [];

  readonly calls:
    {
      sql: string;
      values: Primitive[];
    }[] = [];

  nextResult:
    unknown | undefined;

  readError = false;

  prepare(
    sql: string,
  ): FoodInventoryEvidenceReadD1Statement {
    let values:
      Primitive[] = [];

    const statement:
      FoodInventoryEvidenceReadD1Statement = {
        bind: (...input) => {
          values = input;
          return statement;
        },

        all: async () => {
          this.calls.push({
            sql,
            values,
          });

          if (this.readError) {
            throw new Error(
              "synthetic read failure",
            );
          }

          if (this.nextResult !== undefined) {
            return this.nextResult;
          }

          if (
            sql.includes(
              "FROM food_production_batches",
            )
          ) {
            const [
              requestedSkuId,
              requestedSkuVersion,
              afterId,
              ,
              afterVersion,
              limit,
            ] = values;

            const rows =
              this.batches
                .filter(row =>
                  row.sku_id === requestedSkuId &&
                  row.sku_version === requestedSkuVersion &&
                  (
                    String(row.batch_id) >
                      String(afterId) ||
                    (
                      row.batch_id === afterId &&
                      Number(row.version) >
                        Number(afterVersion)
                    )
                  ),
                )
                .sort((left, right) => {
                  const a =
                    String(left.batch_id);

                  const b =
                    String(right.batch_id);

                  if (a < b) return -1;
                  if (a > b) return 1;

                  return (
                    Number(left.version) -
                    Number(right.version)
                  );
                })
                .slice(
                  0,
                  Number(limit),
                );

            return {
              success: true,
              results: rows,
            };
          }

          if (
            sql.includes(
              "FROM food_physical_inventory_movements",
            )
          ) {
            const [
              requestedBatchId,
              requestedBatchVersion,
              afterMovementId,
              limit,
            ] = values;

            const rows =
              this.movements
                .filter(row =>
                  row.batch_id === requestedBatchId &&
                  row.batch_version ===
                    requestedBatchVersion &&
                  String(row.movement_id) >
                    String(afterMovementId),
                )
                .sort((left, right) =>
                  String(left.movement_id)
                    .localeCompare(
                      String(right.movement_id),
                    ),
                )
                .slice(
                  0,
                  Number(limit),
                );

            return {
              success: true,
              results: rows,
            };
          }

          throw new Error(
            "Unexpected SQL",
          );
        },
      };

    return statement;
  }
}

test("empty exact-SKU batch page succeeds", async () => {
  const db =
    new MemoryDatabase();

  const result =
    await listFoodProductionBatchesByExactSku(
      db,
      {
        id: skuId,
        version: 2,
      },
    );

  assert.deepEqual(
    result,
    {
      outcome: "success",
      items: [],
    },
  );

  assert(Object.isFrozen(result));
  assert(Object.isFrozen(result.items));
});

test("batch read reconstructs canonical snapshots", async () => {
  const db =
    new MemoryDatabase();

  db.batches.push(
    batchRow("batch-a"),
  );

  const result =
    await listFoodProductionBatchesByExactSku(
      db,
      {
        id: skuId,
        version: 2,
      },
    );

  assert.equal(
    result.outcome,
    "success",
  );

  if (result.outcome !== "success") {
    assert.fail(
      "Expected success",
    );
  }

  assert.equal(
    result.items.length,
    1,
  );

  const value =
    result.items[0];

  assert.deepEqual(
    validateFoodProductionBatchVersion(
      JSON.parse(
        JSON.stringify(value),
      ),
    ),
    value,
  );

  assert(Object.isFrozen(value));
  assert(Object.isFrozen(value.sku));
});

test("exact-SKU batch read excludes other SKUs", async () => {
  const db =
    new MemoryDatabase();

  db.batches.push(
    batchRow("batch-a"),
    {
      ...batchRow("batch-other"),
      sku_id:
        createFoodSkuId("other-sku"),
    },
  );

  const result =
    await listFoodProductionBatchesByExactSku(
      db,
      {
        id: skuId,
        version: 2,
      },
    );

  assert.equal(
    result.outcome,
    "success",
  );

  if (result.outcome !== "success") {
    assert.fail();
  }

  assert.equal(
    result.items.length,
    1,
  );
});

test("batch pagination is deterministic and continues after exact batch cursor", async () => {
  const db =
    new MemoryDatabase();

  db.batches.push(
    batchRow("batch-c"),
    batchRow("batch-a"),
    batchRow("batch-b"),
  );

  const first =
    await listFoodProductionBatchesByExactSku(
      db,
      {
        id: skuId,
        version: 2,
      },
      {
        limit: 2,
      },
    );

  assert.equal(
    first.outcome,
    "success",
  );

  if (first.outcome !== "success") {
    assert.fail();
  }

  assert.deepEqual(
    first.items.map(item => item.id),
    [
      batchId("batch-a"),
      batchId("batch-b"),
    ],
  );

  assert.deepEqual(
    first.nextCursor,
    {
      id: batchId("batch-b"),
      version: 1,
    },
  );

  assert(
    first.nextCursor &&
    Object.isFrozen(first.nextCursor),
  );

  const second =
    await listFoodProductionBatchesByExactSku(
      db,
      {
        id: skuId,
        version: 2,
      },
      {
        limit: 2,
        after:
          first.nextCursor,
      },
    );

  assert.equal(
    second.outcome,
    "success",
  );

  if (second.outcome !== "success") {
    assert.fail();
  }

  assert.deepEqual(
    second.items.map(item => item.id),
    [
      batchId("batch-c"),
    ],
  );

  assert.equal(
    second.nextCursor,
    undefined,
  );
});

test("batch versions participate in deterministic cursor order", async () => {
  const db =
    new MemoryDatabase();

  db.batches.push(
    batchRow("batch-a", 2),
    batchRow("batch-a", 1),
  );

  const result =
    await listFoodProductionBatchesByExactSku(
      db,
      {
        id: skuId,
        version: 2,
      },
    );

  assert.equal(
    result.outcome,
    "success",
  );

  if (result.outcome !== "success") {
    assert.fail();
  }

  assert.deepEqual(
    result.items.map(item => item.version),
    [1, 2],
  );
});

test("malformed batch caller inputs perform no database access", async () => {
  for (
    const input of [
      null,
      {},
      {
        id: skuId,
        version: 0,
      },
      {
        id: "wrong",
        version: 2,
      },
      {
        id: skuId,
        version: 2,
        extra: true,
      },
    ]
  ) {
    const db =
      new MemoryDatabase();

    assert.deepEqual(
      await listFoodProductionBatchesByExactSku(
        db,
        input,
      ),
      {
        outcome: "invalid",
      },
    );

    assert.equal(
      db.calls.length,
      0,
    );
  }
});

test("invalid batch page options perform no database access", async () => {
  for (
    const options of [
      {
        limit: 0,
      },
      {
        limit: 101,
      },
      {
        limit: 1.5,
      },
      {
        extra: true,
      },
      {
        after: {
          id: "bad",
          version: 1,
        },
      },
    ]
  ) {
    const db =
      new MemoryDatabase();

    assert.deepEqual(
      await listFoodProductionBatchesByExactSku(
        db,
        {
          id: skuId,
          version: 2,
        },
        options,
      ),
      {
        outcome: "invalid",
      },
    );

    assert.equal(
      db.calls.length,
      0,
    );
  }
});

test("uncertain batch D1 results fail closed", async () => {
  for (
    const result of [
      null,
      {},
      {
        success: false,
        results: [],
      },
      {
        success: true,
      },
      {
        success: true,
        results: "wrong",
      },
    ]
  ) {
    const db =
      new MemoryDatabase();

    db.nextResult =
      result;

    assert.deepEqual(
      await listFoodProductionBatchesByExactSku(
        db,
        {
          id: skuId,
          version: 2,
        },
      ),
      {
        outcome: "storage-failure",
      },
    );
  }
});

test("malformed durable batch rows fail closed", async () => {
  for (
    const row of [
      {},
      {
        ...batchRow("batch-a"),
        produced_package_count: 0,
      },
      {
        ...batchRow("batch-a"),
        sku_version: "2",
      },
      {
        ...batchRow("batch-a"),
        prepared_on:
          "2026-02-30",
      },
      {
        ...batchRow("batch-a"),
        extra: true,
      },
    ]
  ) {
    const db =
      new MemoryDatabase();

    db.nextResult = {
      success: true,
      results: [row],
    };

    assert.deepEqual(
      await listFoodProductionBatchesByExactSku(
        db,
        {
          id: skuId,
          version: 2,
        },
      ),
      {
        outcome: "storage-failure",
      },
    );
  }
});

test("selector-divergent durable batch rows fail closed", async () => {
  const db =
    new MemoryDatabase();

  db.nextResult = {
    success: true,
    results: [
      {
        ...batchRow("batch-a"),
        sku_id:
          createFoodSkuId("other-sku"),
      },
    ],
  };

  assert.deepEqual(
    await listFoodProductionBatchesByExactSku(
      db,
      {
        id: skuId,
        version: 2,
      },
    ),
    {
      outcome: "storage-failure",
    },
  );
});

test("duplicate or out-of-order durable batch identities fail closed", async () => {
  for (
    const rows of [
      [
        batchRow("batch-a"),
        batchRow("batch-a"),
      ],
      [
        batchRow("batch-b"),
        batchRow("batch-a"),
      ],
    ]
  ) {
    const db =
      new MemoryDatabase();

    db.nextResult = {
      success: true,
      results: rows,
    };

    assert.deepEqual(
      await listFoodProductionBatchesByExactSku(
        db,
        {
          id: skuId,
          version: 2,
        },
      ),
      {
        outcome: "storage-failure",
      },
    );
  }
});

test("batch read exceptions are storage-failure", async () => {
  const db =
    new MemoryDatabase();

  db.readError = true;

  assert.deepEqual(
    await listFoodProductionBatchesByExactSku(
      db,
      {
        id: skuId,
        version: 2,
      },
    ),
    {
      outcome: "storage-failure",
    },
  );
});

test("empty exact-batch movement page succeeds", async () => {
  const db =
    new MemoryDatabase();

  const result =
    await listFoodPhysicalInventoryMovementsByExactBatch(
      db,
      {
        id: batchId("batch-a"),
        version: 1,
      },
    );

  assert.deepEqual(
    result,
    {
      outcome: "success",
      items: [],
    },
  );
});

test("movement read reconstructs canonical snapshots", async () => {
  const db =
    new MemoryDatabase();

  db.movements.push(
    movementRow("movement-a"),
  );

  const result =
    await listFoodPhysicalInventoryMovementsByExactBatch(
      db,
      {
        id: batchId("batch-a"),
        version: 1,
      },
    );

  assert.equal(
    result.outcome,
    "success",
  );

  if (result.outcome !== "success") {
    assert.fail();
  }

  const value =
    result.items[0];

  assert.deepEqual(
    validateFoodPhysicalInventoryMovement(
      JSON.parse(
        JSON.stringify(value),
      ),
    ),
    value,
  );

  assert(Object.isFrozen(value));
  assert(Object.isFrozen(value.batch));
  assert(Object.isFrozen(value.sku));
});

test("exact-batch movement read excludes other batches", async () => {
  const db =
    new MemoryDatabase();

  db.movements.push(
    movementRow("movement-a"),
    movementRow(
      "movement-b",
      "batch-other",
    ),
  );

  const result =
    await listFoodPhysicalInventoryMovementsByExactBatch(
      db,
      {
        id: batchId("batch-a"),
        version: 1,
      },
    );

  assert.equal(
    result.outcome,
    "success",
  );

  if (result.outcome !== "success") {
    assert.fail();
  }

  assert.equal(
    result.items.length,
    1,
  );
});

test("movement pagination is deterministic and uses movement identity cursor", async () => {
  const db =
    new MemoryDatabase();

  db.movements.push(
    movementRow("movement-c"),
    movementRow("movement-a"),
    movementRow("movement-b"),
  );

  const first =
    await listFoodPhysicalInventoryMovementsByExactBatch(
      db,
      {
        id: batchId("batch-a"),
        version: 1,
      },
      {
        limit: 2,
      },
    );

  assert.equal(
    first.outcome,
    "success",
  );

  if (first.outcome !== "success") {
    assert.fail();
  }

  assert.deepEqual(
    first.items.map(item => item.id),
    [
      movementId("movement-a"),
      movementId("movement-b"),
    ],
  );

  assert.equal(
    first.nextCursor,
    movementId("movement-b"),
  );

  const second =
    await listFoodPhysicalInventoryMovementsByExactBatch(
      db,
      {
        id: batchId("batch-a"),
        version: 1,
      },
      {
        limit: 2,
        afterMovementId:
          first.nextCursor,
      },
    );

  assert.equal(
    second.outcome,
    "success",
  );

  if (second.outcome !== "success") {
    assert.fail();
  }

  assert.deepEqual(
    second.items.map(item => item.id),
    [
      movementId("movement-c"),
    ],
  );

  assert.equal(
    second.nextCursor,
    undefined,
  );
});

test("occurredOn does not control movement ordering", async () => {
  const db =
    new MemoryDatabase();

  db.movements.push(
    {
      ...movementRow("movement-b"),
      occurred_on:
        "2026-01-01",
    },
    {
      ...movementRow("movement-a"),
      occurred_on:
        "2026-12-31",
    },
  );

  const result =
    await listFoodPhysicalInventoryMovementsByExactBatch(
      db,
      {
        id: batchId("batch-a"),
        version: 1,
      },
    );

  assert.equal(
    result.outcome,
    "success",
  );

  if (result.outcome !== "success") {
    assert.fail();
  }

  assert.deepEqual(
    result.items.map(item => item.id),
    [
      movementId("movement-a"),
      movementId("movement-b"),
    ],
  );
});

test("invalid movement caller inputs perform no database access", async () => {
  for (
    const input of [
      null,
      {},
      {
        id: batchId("batch-a"),
        version: 0,
      },
      {
        id: "wrong",
        version: 1,
      },
      {
        id: batchId("batch-a"),
        version: 1,
        extra: true,
      },
    ]
  ) {
    const db =
      new MemoryDatabase();

    assert.deepEqual(
      await listFoodPhysicalInventoryMovementsByExactBatch(
        db,
        input,
      ),
      {
        outcome: "invalid",
      },
    );

    assert.equal(
      db.calls.length,
      0,
    );
  }
});

test("invalid movement page options perform no database access", async () => {
  for (
    const options of [
      {
        limit: 0,
      },
      {
        limit: 101,
      },
      {
        limit: 1.5,
      },
      {
        extra: true,
      },
      {
        afterMovementId:
          "bad",
      },
    ]
  ) {
    const db =
      new MemoryDatabase();

    assert.deepEqual(
      await listFoodPhysicalInventoryMovementsByExactBatch(
        db,
        {
          id: batchId("batch-a"),
          version: 1,
        },
        options,
      ),
      {
        outcome: "invalid",
      },
    );

    assert.equal(
      db.calls.length,
      0,
    );
  }
});

test("malformed or selector-divergent durable movement rows fail closed", async () => {
  for (
    const row of [
      {},
      {
        ...movementRow("movement-a"),
        package_count: 0,
      },
      {
        ...movementRow("movement-a"),
        movement_type:
          "sale",
      },
      {
        ...movementRow("movement-a"),
        occurred_on:
          "2026-02-30",
      },
      {
        ...movementRow("movement-a"),
        batch_id:
          batchId("other-batch"),
      },
      {
        ...movementRow("movement-a"),
        extra: true,
      },
    ]
  ) {
    const db =
      new MemoryDatabase();

    db.nextResult = {
      success: true,
      results: [row],
    };

    assert.deepEqual(
      await listFoodPhysicalInventoryMovementsByExactBatch(
        db,
        {
          id: batchId("batch-a"),
          version: 1,
        },
      ),
      {
        outcome: "storage-failure",
      },
    );
  }
});

test("duplicate or out-of-order movement identities fail closed", async () => {
  for (
    const rows of [
      [
        movementRow("movement-a"),
        movementRow("movement-a"),
      ],
      [
        movementRow("movement-b"),
        movementRow("movement-a"),
      ],
    ]
  ) {
    const db =
      new MemoryDatabase();

    db.nextResult = {
      success: true,
      results: rows,
    };

    assert.deepEqual(
      await listFoodPhysicalInventoryMovementsByExactBatch(
        db,
        {
          id: batchId("batch-a"),
          version: 1,
        },
      ),
      {
        outcome: "storage-failure",
      },
    );
  }
});

test("movement read exceptions are storage-failure", async () => {
  const db =
    new MemoryDatabase();

  db.readError = true;

  assert.deepEqual(
    await listFoodPhysicalInventoryMovementsByExactBatch(
      db,
      {
        id: batchId("batch-a"),
        version: 1,
      },
    ),
    {
      outcome: "storage-failure",
    },
  );
});

test("only read-only deterministic SQL is emitted", async () => {
  const db =
    new MemoryDatabase();

  await listFoodProductionBatchesByExactSku(
    db,
    {
      id: skuId,
      version: 2,
    },
  );

  await listFoodPhysicalInventoryMovementsByExactBatch(
    db,
    {
      id: batchId("batch-a"),
      version: 1,
    },
  );

  assert.equal(
    db.calls.length,
    2,
  );

  for (const call of db.calls) {
    assert.match(
      call.sql,
      /^SELECT /,
    );

    assert.match(
      call.sql,
      /ORDER BY .*COLLATE BINARY/i,
    );

    assert.match(
      call.sql,
      /LIMIT \?/,
    );

    assert.doesNotMatch(
      call.sql,
      /\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bUPSERT\b/i,
    );
  }
});

test("source remains read-only and makes no authority claims", async () => {
  const source =
    await readFile(
      new URL(
        "./d1-inventory-evidence-read-persistence.ts",
        import.meta.url,
      ),
      "utf8",
    );

  assert.doesNotMatch(
    source,
    /\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bUPSERT\b|checkoutReady|paymentReady|availableToPromise|capacityUnits|food_sku_capacity_sources|food_capacity_reservations|Stripe|Square|PayPal|fetch\s*\(|process\.env|Date\.now/i,
  );

  assert.doesNotMatch(
    source,
    /projectFoodProductionBatchRecordedPhysicalBalance|projectFoodSkuRecordedPhysicalBalance/,
  );
});
