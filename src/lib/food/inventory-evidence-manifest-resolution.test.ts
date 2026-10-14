import assert from "node:assert/strict";
import test from "node:test";

import {
  FOOD_INVENTORY_EVIDENCE_MANIFEST_KIND,
} from "./inventory-evidence-provenance-domain";
import {
  FOOD_RESOLVED_INVENTORY_EVIDENCE_KIND,
  resolveFoodInventoryEvidenceManifest,
} from "./inventory-evidence-manifest-resolution";
import type {
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
    "synthetic-resolution-sku",
  );

const otherSkuId =
  createFoodSkuId(
    "synthetic-other-sku",
  );

const batchA =
  createFoodProductionBatchId(
    "synthetic-resolution-batch-a",
  );

const batchB =
  createFoodProductionBatchId(
    "synthetic-resolution-batch-b",
  );

const movementA =
  createFoodPhysicalInventoryMovementId(
    "synthetic-resolution-movement-a",
  );

const movementB =
  createFoodPhysicalInventoryMovementId(
    "synthetic-resolution-movement-b",
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
        "synthetic:manifest-resolution",
    },
  };
}

function batchRow(
  id:
    typeof batchA,
  version:
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
      12,
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
      "adjustment-out",
    package_count:
      1,
    occurred_on:
      "2026-10-14",
    attribution:
      "synthetic:test",
    source_reference:
      `synthetic:${id}`,
  };
}

class Database {
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
        ),
      ],
      [
        `${batchB}@3`,
        batchRow(
          batchB,
          3,
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
        ),
      ],
      [
        movementB,
        movementRow(
          movementB,
          batchB,
          3,
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
              const key =
                `${String(values[0])}@${String(values[1])}`;

              const row =
                this.batches.get(
                  key,
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

test("canonical manifest resolves exact durable batches and movements", async () => {
  const db =
    new Database();

  const result =
    await resolveFoodInventoryEvidenceManifest(
      db,
      manifest(),
    );

  assert.equal(
    result.outcome,
    "resolved",
  );

  if (
    result.outcome !==
    "resolved"
  ) {
    assert.fail(
      "Expected resolved",
    );
  }

  assert.equal(
    result.value.kind,
    FOOD_RESOLVED_INVENTORY_EVIDENCE_KIND,
  );

  assert.equal(
    result.value.manifest.sku.id,
    skuId,
  );

  assert.deepEqual(
    result.value.batches.map(
      value => ({
        id:
          value.batch.id,
        version:
          value.batch.version,
        movements:
          value.movements.map(
            movement =>
              movement.id,
          ),
      }),
    ),
    [
      {
        id:
          batchA,
        version:
          1,
        movements: [
          movementA,
        ],
      },
      {
        id:
          batchB,
        version:
          3,
        movements: [
          movementB,
        ],
      },
    ],
  );

  assert.equal(
    db.calls.length,
    4,
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

  assert(
    Object.isFrozen(
      result.value.batches,
    ),
  );

  for (
    const batch of
    result.value.batches
  ) {
    assert(
      Object.isFrozen(
        batch,
      ),
    );

    assert(
      Object.isFrozen(
        batch.batch,
      ),
    );

    assert(
      Object.isFrozen(
        batch.movements,
      ),
    );
  }
});

test("invalid manifest performs zero storage reads", async () => {
  const db =
    new Database();

  const bad = {
    ...manifest(),
    extra:
      true,
  };

  assert.deepEqual(
    await resolveFoodInventoryEvidenceManifest(
      db,
      bad,
    ),
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

test("empty manifest resolves to empty exact evidence set", async () => {
  const db =
    new Database();

  const input = {
    ...manifest(),
    batches:
      [],
  };

  const result =
    await resolveFoodInventoryEvidenceManifest(
      db,
      input,
    );

  assert.equal(
    result.outcome,
    "resolved",
  );

  if (
    result.outcome !==
    "resolved"
  ) {
    assert.fail(
      "Expected resolved",
    );
  }

  assert.deepEqual(
    result.value.batches,
    [],
  );

  assert.equal(
    db.calls.length,
    0,
  );
});

test("batch with no movements resolves exact batch only", async () => {
  const db =
    new Database();

  const input = {
    ...manifest(),
    batches: [
      {
        batch: {
          id:
            batchA,
          version:
            1,
        },
        movementIds:
          [],
      },
    ],
  };

  const result =
    await resolveFoodInventoryEvidenceManifest(
      db,
      input,
    );

  assert.equal(
    result.outcome,
    "resolved",
  );

  if (
    result.outcome !==
    "resolved"
  ) {
    assert.fail(
      "Expected resolved",
    );
  }

  assert.equal(
    result.value.batches.length,
    1,
  );

  assert.deepEqual(
    result.value.batches[0]!
      .movements,
    [],
  );

  assert.equal(
    db.calls.length,
    1,
  );
});

test("missing exact batch fails whole manifest as not-found", async () => {
  const db =
    new Database();

  db.batches.delete(
    `${batchB}@3`,
  );

  const result =
    await resolveFoodInventoryEvidenceManifest(
      db,
      manifest(),
    );

  assert.deepEqual(
    result,
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

test("missing exact movement fails whole manifest as not-found", async () => {
  const db =
    new Database();

  db.movements.delete(
    movementA,
  );

  assert.deepEqual(
    await resolveFoodInventoryEvidenceManifest(
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

test("storage exception fails whole manifest with no partial result", async () => {
  const db =
    new Database();

  db.failNext =
    true;

  assert.deepEqual(
    await resolveFoodInventoryEvidenceManifest(
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

test("uncertain durable envelope fails whole manifest", async () => {
  const db =
    new Database();

  db.invalidEnvelope =
    true;

  assert.deepEqual(
    await resolveFoodInventoryEvidenceManifest(
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

test("resolved batch must bind manifest SKU exactly", async () => {
  const db =
    new Database();

  db.batches.set(
    `${batchA}@1`,
    batchRow(
      batchA,
      1,
      otherSkuId,
    ),
  );

  assert.deepEqual(
    await resolveFoodInventoryEvidenceManifest(
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

test("resolved movement must bind manifest batch exactly", async () => {
  const db =
    new Database();

  db.movements.set(
    movementA,
    movementRow(
      movementA,
      batchB,
      3,
    ),
  );

  assert.deepEqual(
    await resolveFoodInventoryEvidenceManifest(
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
    2,
  );
});

test("resolved movement must bind manifest SKU exactly", async () => {
  const db =
    new Database();

  db.movements.set(
    movementA,
    movementRow(
      movementA,
      batchA,
      1,
      otherSkuId,
    ),
  );

  assert.deepEqual(
    await resolveFoodInventoryEvidenceManifest(
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
    2,
  );
});

test("manifest order is canonical and resolved order follows it", async () => {
  const db =
    new Database();

  const input =
    manifest();

  input.batches.reverse();

  const result =
    await resolveFoodInventoryEvidenceManifest(
      db,
      input,
    );

  assert.equal(
    result.outcome,
    "resolved",
  );

  if (
    result.outcome !==
    "resolved"
  ) {
    assert.fail(
      "Expected resolved",
    );
  }

  assert.deepEqual(
    result.value.batches.map(
      value =>
        value.batch.id,
    ),
    [
      batchA,
      batchB,
    ],
  );
});

test("caller mutations cannot alter resolved canonical evidence", async () => {
  const db =
    new Database();

  const input =
    manifest();

  const result =
    await resolveFoodInventoryEvidenceManifest(
      db,
      input,
    );

  assert.equal(
    result.outcome,
    "resolved",
  );

  if (
    result.outcome !==
    "resolved"
  ) {
    assert.fail(
      "Expected resolved",
    );
  }

  input.provenance.attribution =
    "synthetic:mutated";

  input.batches[0]!
    .movementIds[0] =
      movementB;

  assert.equal(
    result.value.manifest.provenance
      .attribution,
    "synthetic:test",
  );

  assert.equal(
    result.value.batches[0]!
      .movements[0]!.id,
    movementA,
  );
});

test("source composes only manifest validation and exact evidence reads", async () => {
  const source =
    await import(
      "node:fs/promises"
    ).then(
      fs =>
        fs.readFile(
          new URL(
            "./inventory-evidence-manifest-resolution.ts",
            import.meta.url,
          ),
          "utf8",
        ),
    );

  assert.match(
    source,
    /validateFoodInventoryEvidenceManifest/,
  );

  assert.match(
    source,
    /readFoodProductionBatchByExactIdentity/,
  );

  assert.match(
    source,
    /readFoodPhysicalInventoryMovementByExactIdentity/,
  );

  assert.doesNotMatch(
    source,
    /projectFoodProductionBatchRecordedPhysicalBalance|projectFoodSkuRecordedPhysicalBalance|\bINSERT\b|\bUPDATE\b|\bDELETE\b|quantityOnHand|availableToPromise|checkoutReady|paymentReady/i,
  );
});
