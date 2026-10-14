import assert from "node:assert/strict";
import test from "node:test";

import {
  FOOD_INVENTORY_EVIDENCE_MANIFEST_KIND,
} from "./inventory-evidence-provenance-domain";
import {
  composeFoodPersistedInventoryRecordedBalance,
} from "./persisted-inventory-recorded-balance-service";
import type {
  FoodInventoryEvidenceResolutionD1Database,
  FoodInventoryEvidenceResolutionD1Statement,
} from "./d1-inventory-evidence-resolution-persistence";
import {
  createFoodSkuId,
} from "./package-sku-domain";
import {
  createFoodProductionBatchId,
} from "./production-batch-domain";
import {
  createFoodPhysicalInventoryMovementId,
} from "./physical-inventory-movement-domain";

type Primitive =
  | string
  | number
  | null;

const skuId =
  createFoodSkuId(
    "synthetic-006g-sku",
  );

const otherSkuId =
  createFoodSkuId(
    "synthetic-006g-other-sku",
  );

const batchA =
  createFoodProductionBatchId(
    "synthetic-006g-batch-a",
  );

const batchB =
  createFoodProductionBatchId(
    "synthetic-006g-batch-b",
  );

const movementA =
  createFoodPhysicalInventoryMovementId(
    "synthetic-006g-movement-a",
  );

const movementB =
  createFoodPhysicalInventoryMovementId(
    "synthetic-006g-movement-b",
  );

function manifest() {
  return {
    kind:
      FOOD_INVENTORY_EVIDENCE_MANIFEST_KIND,

    sku: {
      id:
        skuId,
      version:
        2,
    },

    batches: [
      {
        batch: {
          id:
            batchA,
          version:
            1,
        },
        movementIds: [
          movementA,
        ],
      },
      {
        batch: {
          id:
            batchB,
          version:
            3,
        },
        movementIds: [
          movementB,
        ],
      },
    ],

    provenance: {
      attribution:
        "synthetic:test",
      sourceReference:
        "synthetic:006g-manifest",
    },
  };
}

function batchRow(
  id:
    typeof batchA,
  version:
    number,
  producedPackageCount:
    number,
  sku:
    typeof skuId =
      skuId,
) {
  return {
    batch_id:
      id,
    version,
    sku_id:
      sku,
    sku_version:
      2,
    batch_code:
      `SYN-${version}`,
    storage_mode:
      "refrigerated",
    produced_package_count:
      producedPackageCount,
    prepared_on:
      "2026-10-14",
    frozen_on:
      null,
    attribution:
      "synthetic:test",
    source_reference:
      `synthetic:${id}:${version}`,
  };
}

function movementRow(
  id:
    typeof movementA,
  batchId:
    typeof batchA,
  batchVersion:
    number,
  movementType:
    "adjustment-in" |
    "adjustment-out" |
    "waste",
  packageCount:
    number,
  sku:
    typeof skuId =
      skuId,
) {
  return {
    movement_id:
      id,
    batch_id:
      batchId,
    batch_version:
      batchVersion,
    sku_id:
      sku,
    sku_version:
      2,
    movement_type:
      movementType,
    package_count:
      packageCount,
    occurred_on:
      "2026-10-14",
    attribution:
      "synthetic:test",
    source_reference:
      `synthetic:${id}`,
  };
}

class Database
  implements
    FoodInventoryEvidenceResolutionD1Database {
  readonly calls:
    {
      sql: string;
      values:
        Primitive[];
    }[] = [];

  readonly batches =
    new Map<
      string,
      unknown
    >([
      [
        `${batchA}@1`,
        batchRow(
          batchA,
          1,
          10,
        ),
      ],
      [
        `${batchB}@3`,
        batchRow(
          batchB,
          3,
          4,
        ),
      ],
    ]);

  readonly movements =
    new Map<
      string,
      unknown
    >([
      [
        movementA,
        movementRow(
          movementA,
          batchA,
          1,
          "adjustment-out",
          3,
        ),
      ],
      [
        movementB,
        movementRow(
          movementB,
          batchB,
          3,
          "adjustment-in",
          2,
        ),
      ],
    ]);

  failNext =
    false;

  invalidEnvelope =
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
              values:
                [...values],
            });

            if (this.failNext) {
              this.failNext =
                false;

              throw new Error(
                "synthetic storage failure",
              );
            }

            if (this.invalidEnvelope) {
              return {
                success:
                  false,
                results:
                  [],
              };
            }

            if (
              sql.includes(
                "food_production_batches",
              )
            ) {
              const row =
                this.batches.get(
                  `${String(values[0])}@${String(values[1])}`,
                );

              return {
                success:
                  true,
                results:
                  row === undefined
                    ? []
                    : [row],
              };
            }

            if (
              sql.includes(
                "food_physical_inventory_movements",
              )
            ) {
              const row =
                this.movements.get(
                  String(values[0]),
                );

              return {
                success:
                  true,
                results:
                  row === undefined
                    ? []
                    : [row],
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

test("persisted manifest resolves through 006E and composes through 006F", async () => {
  const db =
    new Database();

  const result =
    await composeFoodPersistedInventoryRecordedBalance(
      db,
      manifest(),
    );

  assert.equal(
    result.outcome,
    "composed",
  );

  if (
    result.outcome !==
    "composed"
  ) {
    assert.fail(
      "Expected composed",
    );
  }

  assert.equal(
    result.value.batchBalances.length,
    2,
  );

  assert.deepEqual(
    result.value.batchBalances.map(
      value =>
        value.recordedPackageBalance,
    ),
    [
      7,
      6,
    ],
  );

  assert.equal(
    result.value.skuBalance
      .recordedPackageBalance,
    13,
  );

  assert.equal(
    result.value.manifest.provenance
      .sourceReference,
    "synthetic:006g-manifest",
  );

  assert.equal(
    db.calls.length,
    4,
  );
});

test("invalid manifest passes through invalid and performs no storage reads", async () => {
  const db =
    new Database();

  const result =
    await composeFoodPersistedInventoryRecordedBalance(
      db,
      {
        ...manifest(),
        extra:
          true,
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
    db.calls.length,
    0,
  );
});

test("missing exact batch passes through whole-operation not-found", async () => {
  const db =
    new Database();

  db.batches.delete(
    `${batchB}@3`,
  );

  assert.deepEqual(
    await composeFoodPersistedInventoryRecordedBalance(
      db,
      manifest(),
    ),
    {
      outcome:
        "not-found",
    },
  );

  assert.equal(
    db.calls.length,
    3,
  );
});

test("missing exact movement passes through whole-operation not-found", async () => {
  const db =
    new Database();

  db.movements.delete(
    movementA,
  );

  assert.deepEqual(
    await composeFoodPersistedInventoryRecordedBalance(
      db,
      manifest(),
    ),
    {
      outcome:
        "not-found",
    },
  );

  assert.equal(
    db.calls.length,
    2,
  );
});

test("storage exception passes through storage-failure without partial balance", async () => {
  const db =
    new Database();

  db.failNext =
    true;

  assert.deepEqual(
    await composeFoodPersistedInventoryRecordedBalance(
      db,
      manifest(),
    ),
    {
      outcome:
        "storage-failure",
    },
  );

  assert.equal(
    db.calls.length,
    1,
  );
});

test("uncertain durable envelope passes through storage-failure", async () => {
  const db =
    new Database();

  db.invalidEnvelope =
    true;

  assert.deepEqual(
    await composeFoodPersistedInventoryRecordedBalance(
      db,
      manifest(),
    ),
    {
      outcome:
        "storage-failure",
    },
  );

  assert.equal(
    db.calls.length,
    1,
  );
});

test("durable batch SKU disagreement fails closed without partial balance", async () => {
  const db =
    new Database();

  db.batches.set(
    `${batchA}@1`,
    batchRow(
      batchA,
      1,
      10,
      otherSkuId,
    ),
  );

  assert.deepEqual(
    await composeFoodPersistedInventoryRecordedBalance(
      db,
      manifest(),
    ),
    {
      outcome:
        "storage-failure",
    },
  );

  assert.equal(
    db.calls.length,
    1,
  );
});

test("empty manifest composes exact-SKU recorded balance zero with zero reads", async () => {
  const db =
    new Database();

  const input = {
    ...manifest(),
    batches:
      [],
  };

  const result =
    await composeFoodPersistedInventoryRecordedBalance(
      db,
      input,
    );

  assert.equal(
    result.outcome,
    "composed",
  );

  if (
    result.outcome !==
    "composed"
  ) {
    assert.fail(
      "Expected composed",
    );
  }

  assert.equal(
    result.value.skuBalance
      .recordedPackageBalance,
    0,
  );

  assert.deepEqual(
    result.value.batchBalances,
    [],
  );

  assert.equal(
    db.calls.length,
    0,
  );
});

test("successful result and retained canonical composition are frozen", async () => {
  const db =
    new Database();

  const result =
    await composeFoodPersistedInventoryRecordedBalance(
      db,
      manifest(),
    );

  assert.equal(
    result.outcome,
    "composed",
  );

  if (
    result.outcome !==
    "composed"
  ) {
    assert.fail(
      "Expected composed",
    );
  }

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

  assert(
    Object.isFrozen(
      result.value.manifest,
    ),
  );

  assert(
    Object.isFrozen(
      result.value.batchBalances,
    ),
  );

  assert(
    Object.isFrozen(
      result.value.skuBalance,
    ),
  );
});

test("caller mutation cannot alter successful persisted composition", async () => {
  const db =
    new Database();

  const input =
    manifest();

  const result =
    await composeFoodPersistedInventoryRecordedBalance(
      db,
      input,
    );

  assert.equal(
    result.outcome,
    "composed",
  );

  if (
    result.outcome !==
    "composed"
  ) {
    assert.fail(
      "Expected composed",
    );
  }

  input.provenance.attribution =
    "synthetic:changed";

  input.batches[0]!
    .movementIds =
      [];

  assert.equal(
    result.value.manifest.provenance
      .attribution,
    "synthetic:test",
  );

  assert.deepEqual(
    result.value.batchBalances[0]!
      .movementIds,
    [
      movementA,
    ],
  );
});

test("source orchestrates only 006E resolution and 006F composition", async () => {
  const source =
    await import(
      "node:fs/promises"
    ).then(
      fs =>
        fs.readFile(
          new URL(
            "./persisted-inventory-recorded-balance-service.ts",
            import.meta.url,
          ),
          "utf8",
        ),
    );

  assert.match(
    source,
    /resolveFoodInventoryEvidenceManifest/,
  );

  assert.match(
    source,
    /projectFoodResolvedInventoryEvidenceRecordedBalance/,
  );

  assert.doesNotMatch(
    source,
    /readFoodProductionBatchByExactIdentity|readFoodPhysicalInventoryMovementByExactIdentity|projectFoodProductionBatchRecordedPhysicalBalance|projectFoodSkuRecordedPhysicalBalance|\bINSERT\b|\bUPDATE\b|\bDELETE\b|Date\.now|fetch\(|quantityOnHand|availableToPromise|checkoutReady|paymentReady/i,
  );
});
