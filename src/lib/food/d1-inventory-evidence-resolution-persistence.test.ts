import assert from "node:assert/strict";
import test from "node:test";

import {
  createFoodSkuId,
} from "./package-sku-domain";
import {
  createFoodProductionBatchId,
} from "./production-batch-domain";
import {
  createFoodPhysicalInventoryMovementId,
} from "./physical-inventory-movement-domain";
import {
  readFoodPhysicalInventoryMovementByExactIdentity,
  readFoodProductionBatchByExactIdentity,
  type FoodInventoryEvidenceResolutionD1Statement,
} from "./d1-inventory-evidence-resolution-persistence";

type Primitive =
  | string
  | number
  | null;

const skuId =
  createFoodSkuId("synthetic-sku");

const batchId =
  createFoodProductionBatchId(
    "synthetic-batch",
  );

const movementId =
  createFoodPhysicalInventoryMovementId(
    "synthetic-movement",
  );

const batchRow = () => ({
  batch_id:
    batchId,
  version:
    1,
  sku_id:
    skuId,
  sku_version:
    2,
  batch_code:
    "synthetic-batch-code",
  storage_mode:
    "refrigerated",
  produced_package_count:
    12,
  prepared_on:
    "2026-10-14",
  frozen_on:
    null,
  attribution:
    "synthetic:test",
  source_reference:
    "synthetic:batch",
});

const movementRow = () => ({
  movement_id:
    movementId,
  batch_id:
    batchId,
  batch_version:
    1,
  sku_id:
    skuId,
  sku_version:
    2,
  movement_type:
    "adjustment-out",
  package_count:
    3,
  occurred_on:
    "2026-10-14",
  attribution:
    "synthetic:test",
  source_reference:
    "synthetic:movement",
});

class Database {
  readonly calls:
    {
      sql: string;
      values:
        Primitive[];
    }[] = [];

  batchResult:
    unknown = {
      success: true,
      results: [
        batchRow(),
      ],
    };

  movementResult:
    unknown = {
      success: true,
      results: [
        movementRow(),
      ],
    };

  throwRead =
    false;

  prepare(
    sql: string,
  ):
    FoodInventoryEvidenceResolutionD1Statement {
    let values:
      Primitive[] = [];

    const statement:
      FoodInventoryEvidenceResolutionD1Statement =
      {
        bind:
          (...bound) => {
            values =
              [...bound];

            return statement;
          },

        all:
          async () => {
            this.calls.push({
              sql,
              values,
            });

            if (this.throwRead) {
              throw new Error(
                "synthetic storage",
              );
            }

            if (
              sql.includes(
                "food_production_batches",
              )
            ) {
              return this.batchResult;
            }

            if (
              sql.includes(
                "food_physical_inventory_movements",
              )
            ) {
              return this.movementResult;
            }

            throw new Error(
              "Unexpected SQL",
            );
          },
      };

    return statement;
  }
}

test("exact production batch read returns canonical found value", async () => {
  const db =
    new Database();

  const result =
    await readFoodProductionBatchByExactIdentity(
      db,
      {
        id: batchId,
        version: 1,
      },
    );

  assert.equal(
    result.outcome,
    "found",
  );

  if (
    result.outcome !==
    "found"
  ) {
    assert.fail(
      "Expected found",
    );
  }

  assert.equal(
    result.value.id,
    batchId,
  );

  assert.equal(
    result.value.version,
    1,
  );

  assert.deepEqual(
    result.value.sku,
    {
      id: skuId,
      version: 2,
    },
  );

  assert.equal(
    db.calls.length,
    1,
  );

  assert.match(
    db.calls[0]!.sql,
    /WHERE batch_id = \? AND version = \? LIMIT 2/,
  );

  assert.deepEqual(
    db.calls[0]!.values,
    [
      batchId,
      1,
    ],
  );

  assert(
    Object.isFrozen(
      result,
    ),
  );

  assert(
    Object.isFrozen(
      result.value,
    ),
  );
});

test("exact movement read returns canonical found value", async () => {
  const db =
    new Database();

  const result =
    await readFoodPhysicalInventoryMovementByExactIdentity(
      db,
      {
        id:
          movementId,
      },
    );

  assert.equal(
    result.outcome,
    "found",
  );

  if (
    result.outcome !==
    "found"
  ) {
    assert.fail(
      "Expected found",
    );
  }

  assert.equal(
    result.value.id,
    movementId,
  );

  assert.deepEqual(
    result.value.batch,
    {
      id: batchId,
      version: 1,
    },
  );

  assert.deepEqual(
    result.value.sku,
    {
      id: skuId,
      version: 2,
    },
  );

  assert.equal(
    db.calls.length,
    1,
  );

  assert.match(
    db.calls[0]!.sql,
    /WHERE movement_id = \? LIMIT 2/,
  );

  assert.deepEqual(
    db.calls[0]!.values,
    [
      movementId,
    ],
  );
});

test("zero durable batch rows return not-found", async () => {
  const db =
    new Database();

  db.batchResult = {
    success: true,
    results: [],
  };

  assert.deepEqual(
    await readFoodProductionBatchByExactIdentity(
      db,
      {
        id: batchId,
        version: 1,
      },
    ),
    {
      outcome:
        "not-found",
    },
  );
});

test("zero durable movement rows return not-found", async () => {
  const db =
    new Database();

  db.movementResult = {
    success: true,
    results: [],
  };

  assert.deepEqual(
    await readFoodPhysicalInventoryMovementByExactIdentity(
      db,
      {
        id:
          movementId,
      },
    ),
    {
      outcome:
        "not-found",
    },
  );
});

test("invalid batch selector performs no database read", async () => {
  const db =
    new Database();

  for (
    const selector of [
      null,
      {},
      {
        id:
          batchId,
      },
      {
        id:
          batchId,
        version:
          0,
      },
      {
        id:
          "wrong",
        version:
          1,
      },
      {
        id:
          batchId,
        version:
          1,
        extra:
          true,
      },
    ]
  ) {
    assert.deepEqual(
      await readFoodProductionBatchByExactIdentity(
        db,
        selector,
      ),
      {
        outcome:
          "invalid",
      },
    );
  }

  assert.equal(
    db.calls.length,
    0,
  );
});

test("invalid movement selector performs no database read", async () => {
  const db =
    new Database();

  for (
    const selector of [
      null,
      {},
      {
        id:
          "wrong",
      },
      {
        id:
          movementId,
        extra:
          true,
      },
    ]
  ) {
    assert.deepEqual(
      await readFoodPhysicalInventoryMovementByExactIdentity(
        db,
        selector,
      ),
      {
        outcome:
          "invalid",
      },
    );
  }

  assert.equal(
    db.calls.length,
    0,
  );
});

test("multiple exact batch rows fail closed as storage-failure", async () => {
  const db =
    new Database();

  db.batchResult = {
    success: true,
    results: [
      batchRow(),
      batchRow(),
    ],
  };

  assert.deepEqual(
    await readFoodProductionBatchByExactIdentity(
      db,
      {
        id: batchId,
        version: 1,
      },
    ),
    {
      outcome:
        "storage-failure",
    },
  );
});

test("multiple exact movement rows fail closed as storage-failure", async () => {
  const db =
    new Database();

  db.movementResult = {
    success: true,
    results: [
      movementRow(),
      movementRow(),
    ],
  };

  assert.deepEqual(
    await readFoodPhysicalInventoryMovementByExactIdentity(
      db,
      {
        id:
          movementId,
      },
    ),
    {
      outcome:
        "storage-failure",
    },
  );
});

test("selector-divergent batch row fails closed", async () => {
  const db =
    new Database();

  db.batchResult = {
    success: true,
    results: [
      {
        ...batchRow(),
        version: 2,
      },
    ],
  };

  assert.deepEqual(
    await readFoodProductionBatchByExactIdentity(
      db,
      {
        id: batchId,
        version: 1,
      },
    ),
    {
      outcome:
        "storage-failure",
    },
  );
});

test("selector-divergent movement row fails closed", async () => {
  const db =
    new Database();

  db.movementResult = {
    success: true,
    results: [
      {
        ...movementRow(),
        movement_id:
          createFoodPhysicalInventoryMovementId(
            "synthetic-other",
          ),
      },
    ],
  };

  assert.deepEqual(
    await readFoodPhysicalInventoryMovementByExactIdentity(
      db,
      {
        id:
          movementId,
      },
    ),
    {
      outcome:
        "storage-failure",
    },
  );
});

test("malformed durable rows fail closed", async () => {
  const batchDb =
    new Database();

  batchDb.batchResult = {
    success: true,
    results: [
      {
        ...batchRow(),
        produced_package_count:
          0,
      },
    ],
  };

  assert.deepEqual(
    await readFoodProductionBatchByExactIdentity(
      batchDb,
      {
        id: batchId,
        version: 1,
      },
    ),
    {
      outcome:
        "storage-failure",
    },
  );

  const movementDb =
    new Database();

  movementDb.movementResult = {
    success: true,
    results: [
      {
        ...movementRow(),
        package_count:
          0,
      },
    ],
  };

  assert.deepEqual(
    await readFoodPhysicalInventoryMovementByExactIdentity(
      movementDb,
      {
        id:
          movementId,
      },
    ),
    {
      outcome:
        "storage-failure",
    },
  );
});

test("uncertain D1 envelopes fail closed", async () => {
  for (
    const bad of [
      null,
      {},
      {
        success: false,
        results: [],
      },
      {
        success: true,
      },
    ]
  ) {
    const batchDb =
      new Database();

    batchDb.batchResult =
      bad;

    assert.deepEqual(
      await readFoodProductionBatchByExactIdentity(
        batchDb,
        {
          id:
            batchId,
          version:
            1,
        },
      ),
      {
        outcome:
          "storage-failure",
      },
    );

    const movementDb =
      new Database();

    movementDb.movementResult =
      bad;

    assert.deepEqual(
      await readFoodPhysicalInventoryMovementByExactIdentity(
        movementDb,
        {
          id:
            movementId,
        },
      ),
      {
        outcome:
          "storage-failure",
      },
    );
  }
});

test("read exceptions fail closed", async () => {
  const db =
    new Database();

  db.throwRead =
    true;

  assert.deepEqual(
    await readFoodProductionBatchByExactIdentity(
      db,
      {
        id:
          batchId,
        version:
          1,
      },
    ),
    {
      outcome:
        "storage-failure",
    },
  );

  assert.deepEqual(
    await readFoodPhysicalInventoryMovementByExactIdentity(
      db,
      {
        id:
          movementId,
      },
    ),
    {
      outcome:
        "storage-failure",
    },
  );
});

test("source is exact read-only and grants no composition or authority", async () => {
  const source =
    await import("node:fs/promises").then(
      fs =>
        fs.readFile(
          new URL(
            "./d1-inventory-evidence-resolution-persistence.ts",
            import.meta.url,
          ),
          "utf8",
        ),
    );

  assert.match(
    source,
    /WHERE batch_id = \? AND version = \? LIMIT 2/,
  );

  assert.match(
    source,
    /WHERE movement_id = \? LIMIT 2/,
  );

  assert.doesNotMatch(
    source,
    /\bINSERT\b|\bUPDATE\b|\bDELETE\b|projectFoodProductionBatchRecordedPhysicalBalance|projectFoodSkuRecordedPhysicalBalance|quantityOnHand|availableToPromise|checkoutReady|paymentReady/i,
  );
});
