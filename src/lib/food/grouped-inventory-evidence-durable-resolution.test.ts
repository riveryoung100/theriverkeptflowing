import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveFoodGroupedInventoryEvidenceDurably,
} from "./grouped-inventory-evidence-durable-resolution";

import type {
  FoodLosslessGroupedInventoryEvidence,
} from "./lossless-inventory-evidence-grouping";

import type {
  FoodInventoryEvidenceResolutionD1Database,
  FoodInventoryEvidenceResolutionD1Statement,
} from "./d1-inventory-evidence-resolution-persistence";

type Primitive =
  string |
  number |
  null;

interface Row {
  readonly [key: string]:
    Primitive;
}

class MemoryStatement
implements FoodInventoryEvidenceResolutionD1Statement {
  private readonly values:
    Primitive[] =
      [];

  constructor(
    private readonly database:
      MemoryDatabase,
    private readonly sql:
      string,
  ) {}

  bind(
    ...values: Primitive[]
  ): FoodInventoryEvidenceResolutionD1Statement {
    this.values.splice(
      0,
      this.values.length,
      ...values,
    );

    return this;
  }

  async all(): Promise<unknown> {
    this.database.reads.push({ sql: this.sql, values: [...this.values] });
    this.database.readCount +=
      1;

    if (
      this.database.failAtRead !==
        undefined &&
      this.database.readCount ===
        this.database.failAtRead
    ) {
      throw new Error(
        "synthetic read failure",
      );
    }

    if (
      this.sql.includes(
        "FROM food_production_batches",
      )
    ) {
      const [
        id,
        version,
      ] =
        this.values;

      return {
        success: true,
        results:
          this.database.batchRows.filter(
            (row) =>
              row.batch_id ===
                id &&
              row.version ===
                version,
          ),
      };
    }

    if (
      this.sql.includes(
        "FROM food_physical_inventory_movements",
      )
    ) {
      const [id] =
        this.values;

      return {
        success: true,
        results:
          this.database.movementRows.filter(
            (row) =>
              row.movement_id ===
                id,
          ),
      };
    }

    throw new Error(
      `Unexpected SQL: ${this.sql}`,
    );
  }
}

class MemoryDatabase
implements FoodInventoryEvidenceResolutionD1Database {
  readonly reads: { sql: string; values: Primitive[] }[] = [];
  readonly batchRows:
    Row[] =
      [];

  readonly movementRows:
    Row[] =
      [];

  readCount =
    0;

  failAtRead?:
    number;

  prepare(
    sql: string,
  ): FoodInventoryEvidenceResolutionD1Statement {
    return new MemoryStatement(
      this,
      sql,
    );
  }
}

const sku =
  Object.freeze({
    id:
      "food-sku:meal-a",
    version:
      3,
  });

const batchId =
  "food-production-batch:batch-a";

function grouped(
  movementCount =
    1,
): FoodLosslessGroupedInventoryEvidence {
  return Object.freeze({
    sku,
    cutoff:
      movementCount +
      1,
    batches:
      Object.freeze([
        Object.freeze({
          productionBatchEvidenceSequence:
            1,
          batch:
            Object.freeze({
              id:
                batchId,
              version:
                1,
            }),
          movements:
            Object.freeze(
              Array.from(
                {
                  length:
                    movementCount,
                },
                (
                  _,
                  index,
                ) =>
                  Object.freeze({
                    evidenceSequence:
                      index +
                      2,
                    movementId:
                      `food-physical-inventory-movement:m${index + 1}`,
                  }),
              ),
            ),
        }),
      ]),
  });
}

function emptyGrouped(): FoodLosslessGroupedInventoryEvidence {
  return Object.freeze({
    sku,
    cutoff:
      0,
    batches:
      Object.freeze([]),
  });
}

function batchRow(
  id =
    batchId,
): Row {
  return {
    batch_id:
      id,
    version:
      1,
    sku_id:
      sku.id,
    sku_version:
      sku.version,
    batch_code:
      "BATCH-A",
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
  };
}

function movementRow(
  id:
    string,
): Row {
  return {
    movement_id:
      id,
    batch_id:
      batchId,
    batch_version:
      1,
    sku_id:
      sku.id,
    sku_version:
      sku.version,
    movement_type:
      "adjustment-in",
    package_count:
      1,
    occurred_on:
      "2026-10-14",
    attribution:
      "synthetic:test",
    source_reference:
      "synthetic:movement",
  };
}

function seed(
  database:
    MemoryDatabase,
  input:
    FoodLosslessGroupedInventoryEvidence,
): void {
  for (
    const groupedBatch of
      input.batches
  ) {
    database.batchRows.push(
      batchRow(
        groupedBatch.batch.id,
      ),
    );

    for (
      const movement of
        groupedBatch.movements
    ) {
      database.movementRows.push(
        movementRow(
          movement.movementId,
        ),
      );
    }
  }
}

test("006L resolves each exact batch once and each exact movement once", async () => {
  const database =
    new MemoryDatabase();

  const input =
    grouped(
      2,
    );

  seed(
    database,
    input,
  );

  const result =
    await resolveFoodGroupedInventoryEvidenceDurably(
      database,
      input,
    );

  assert.equal(
    result.outcome,
    "success",
  );

  assert.equal(
    database.readCount,
    3,
  );
  assert.deepEqual(database.reads.map(read => read.values), [
    [batchId, 1],
    [input.batches[0]!.movements[0]!.movementId],
    [input.batches[0]!.movements[1]!.movementId],
  ]);

  if (
    result.outcome ===
      "success"
  ) {
    assert.equal(
      result.batches.length,
      1,
    );

    assert.equal(
      result.batches[0]
        ?.movements.length,
      2,
    );
  }
});

test("006L empty grouping succeeds with zero durable reads", async () => {
  const database =
    new MemoryDatabase();

  const result =
    await resolveFoodGroupedInventoryEvidenceDurably(
      database,
      emptyGrouped(),
    );

  assert.deepEqual(
    result,
    {
      outcome:
        "success",
      sku,
      cutoff:
        0,
      batches:
        [],
    },
  );

  assert.equal(
    database.readCount,
    0,
  );
});

test("006L one batch with zero movements performs exactly one durable read", async () => {
  const database =
    new MemoryDatabase();

  const input =
    grouped(
      0,
    );

  database.batchRows.push(
    batchRow(),
  );

  const result =
    await resolveFoodGroupedInventoryEvidenceDurably(
      database,
      input,
    );

  assert.equal(
    result.outcome,
    "success",
  );

  assert.equal(
    database.readCount,
    1,
  );
});

test("006L durable batch not-found fails whole resolution", async () => {
  const database =
    new MemoryDatabase();

  const result =
    await resolveFoodGroupedInventoryEvidenceDurably(
      database,
      grouped(
        0,
      ),
    );

  assert.deepEqual(
    result,
    {
      outcome:
        "not-found",
    },
  );
});

test("006L durable movement not-found fails whole resolution without partial success", async () => {
  const database =
    new MemoryDatabase();

  const input =
    grouped(
      1,
    );

  database.batchRows.push(
    batchRow(),
  );

  const result =
    await resolveFoodGroupedInventoryEvidenceDurably(
      database,
      input,
    );

  assert.deepEqual(
    result,
    {
      outcome:
        "not-found",
    },
  );
});

test("006L storage failure on any later read fails whole resolution", async () => {
  const database =
    new MemoryDatabase();

  const input =
    grouped(
      2,
    );

  seed(
    database,
    input,
  );

  database.failAtRead =
    3;

  const result =
    await resolveFoodGroupedInventoryEvidenceDurably(
      database,
      input,
    );

  assert.deepEqual(
    result,
    {
      outcome:
        "storage-failure",
    },
  );
  assert.equal(database.readCount, 3);
});

test("006L durable batch SKU mismatch fails closed", async () => {
  const database =
    new MemoryDatabase();

  const input =
    grouped(
      0,
    );

  database.batchRows.push({
    ...batchRow(),
    sku_id:
      "food-sku:other",
  });

  const result =
    await resolveFoodGroupedInventoryEvidenceDurably(
      database,
      input,
    );

  assert.deepEqual(
    result,
    {
      outcome:
        "storage-failure",
    },
  );
});

test("006L durable movement batch mismatch fails closed", async () => {
  const database =
    new MemoryDatabase();

  const input =
    grouped(
      1,
    );

  seed(
    database,
    input,
  );

  database.movementRows[0] = {
    ...database.movementRows[0]!,
    batch_id:
      "food-production-batch:other",
  };

  const result =
    await resolveFoodGroupedInventoryEvidenceDurably(
      database,
      input,
    );

  assert.deepEqual(
    result,
    {
      outcome:
        "storage-failure",
    },
  );
});

test("006L durable movement SKU mismatch fails closed", async () => {
  const database =
    new MemoryDatabase();

  const input =
    grouped(
      1,
    );

  seed(
    database,
    input,
  );

  database.movementRows[0] = {
    ...database.movementRows[0]!,
    sku_id:
      "food-sku:other",
  };

  const result =
    await resolveFoodGroupedInventoryEvidenceDurably(
      database,
      input,
    );

  assert.deepEqual(
    result,
    {
      outcome:
        "storage-failure",
    },
  );
});

test("006L preserves cutoff batch and movement evidence provenance", async () => {
  const database =
    new MemoryDatabase();

  const input =
    grouped(
      2,
    );

  seed(
    database,
    input,
  );

  const result =
    await resolveFoodGroupedInventoryEvidenceDurably(
      database,
      input,
    );

  assert.equal(
    result.outcome,
    "success",
  );

  if (
    result.outcome !==
      "success"
  ) {
    return;
  }

  assert.equal(
    result.cutoff,
    3,
  );

  assert.equal(
    result.batches[0]
      ?.productionBatchEvidenceSequence,
    1,
  );

  assert.deepEqual(
    result.batches[0]
      ?.movements.map(
        (item) =>
          item.evidenceSequence,
      ),
    [
      2,
      3,
    ],
  );
});

test("006L resolves more than FOOD-006C 128 movements without truncation", async () => {
  const database =
    new MemoryDatabase();

  const input =
    grouped(
      129,
    );

  seed(
    database,
    input,
  );

  const result =
    await resolveFoodGroupedInventoryEvidenceDurably(
      database,
      input,
    );

  assert.equal(
    result.outcome,
    "success",
  );

  assert.equal(
    database.readCount,
    130,
  );

  if (
    result.outcome ===
      "success"
  ) {
    assert.equal(
      result.batches[0]
        ?.movements.length,
      129,
    );
  }
});

test("006L result is detached deeply frozen and preserves grouped order", async () => {
  const database =
    new MemoryDatabase();

  const input =
    grouped(
      2,
    );

  seed(
    database,
    input,
  );

  const result =
    await resolveFoodGroupedInventoryEvidenceDurably(
      database,
      input,
    );

  assert.equal(
    result.outcome,
    "success",
  );

  if (
    result.outcome !==
      "success"
  ) {
    return;
  }

  assert.ok(
    Object.isFrozen(
      result,
    ),
  );

  assert.ok(
    Object.isFrozen(
      result.sku,
    ),
  );

  assert.ok(
    Object.isFrozen(
      result.batches,
    ),
  );

  assert.ok(
    Object.isFrozen(
      result.batches[0],
    ),
  );

  assert.ok(
    Object.isFrozen(
      result.batches[0]
        ?.movements,
    ),
  );

  assert.ok(
    Object.isFrozen(
      result.batches[0]
        ?.movements[0],
    ),
  );
});

test("006L source reuses exact 006E primitives and performs no balance composition", async () => {
  const source =
    await import(
      "node:fs/promises"
    ).then(
      ({
        readFile,
      }) =>
        readFile(
          new URL(
            "./grouped-inventory-evidence-durable-resolution.ts",
            import.meta.url,
          ),
          "utf8",
        ),
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
    /listFoodProductionBatchesByExactSku/,
  );

  assert.doesNotMatch(
    source,
    /listFoodPhysicalInventoryMovementsByExactBatch/,
  );

  assert.doesNotMatch(
    source,
    /validateFoodInventoryEvidenceManifest/,
  );

  assert.doesNotMatch(
    source,
    /projectFoodProductionBatchRecordedPhysicalBalance/,
  );

  assert.doesNotMatch(
    source,
    /projectFoodSkuRecordedPhysicalBalance/,
  );

  assert.doesNotMatch(
    source,
    /quantityOnHand|availableToPromise|checkoutReady|paymentReady/,
  );
  assert.doesNotMatch(source, /inventory-evidence-manifest|inventory-evidence-manifest-resolution|resolved-inventory-balance-composition|physical-inventory-balance-domain|sku-physical-inventory-balance-domain|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b/);
});

test("006L more than 128 batches remain ordered lossless and individually read once", async () => {
  const database = new MemoryDatabase();
  const input: FoodLosslessGroupedInventoryEvidence = {
    sku,
    cutoff: 258,
    batches: Array.from({ length: 129 }, (_, index) => ({
      productionBatchEvidenceSequence: index + 1,
      batch: { id: `food-production-batch:synthetic-${String(index).padStart(3, "0")}`, version: 1 },
      movements: [{ evidenceSequence: index + 130, movementId: `food-physical-inventory-movement:synthetic-${index}` }],
    })),
  };
  for (const group of input.batches) {
    database.batchRows.push(batchRow(group.batch.id));
    database.movementRows.push({ ...movementRow(group.movements[0]!.movementId), batch_id: group.batch.id });
  }
  const result = await resolveFoodGroupedInventoryEvidenceDurably(database, input);
  assert.equal(result.outcome, "success");
  if (result.outcome !== "success") assert.fail("Expected successful lossless resolution");
  assert.equal(result.batches.length, 129);
  assert.equal(database.readCount, 258);
  assert.deepEqual(result.batches.map(group => group.batch.id), input.batches.map(group => group.batch.id));
  assert.deepEqual(result.batches.map(group => group.productionBatchEvidenceSequence), input.batches.map(group => group.productionBatchEvidenceSequence));
  assert.deepEqual(result.batches.map(group => group.movements.map(item => [item.movement.id, item.evidenceSequence])),
    input.batches.map(group => group.movements.map(item => [item.movementId, item.evidenceSequence])));
  assert.equal(new Set(database.reads.map(read => JSON.stringify(read.values))).size, 258);
});

test("006L output is deeply frozen and detached from grouped input and durable rows", async () => {
  const input = structuredClone(grouped(2));
  const database = new MemoryDatabase(); seed(database, input);
  const result = await resolveFoodGroupedInventoryEvidenceDurably(database, input);
  assert.equal(result.outcome, "success");
  if (result.outcome !== "success") assert.fail("Expected success");
  function assertDeepFrozen(value: unknown): void {
    if (value !== null && typeof value === "object") {
      assert(Object.isFrozen(value));
      for (const child of Object.values(value)) assertDeepFrozen(child);
    }
  }
  assertDeepFrozen(result);
  assert.notEqual(result.sku, input.sku);
  assert.notEqual(result.batches, input.batches);
  assert.notEqual(result.batches[0]!.batch, database.batchRows[0]);
  assert.notEqual(result.batches[0]!.movements[0]!.movement, database.movementRows[0]);
  const expected = structuredClone(result);
  Object.assign(input.sku, { version: 99 });
  Object.assign(input.batches[0]!.batch, { version: 99 });
  Object.assign(input.batches[0]!.movements[0]!, { evidenceSequence: 99 });
  database.batchRows[0] = { ...batchRow(), produced_package_count: 99 };
  database.movementRows[0] = { ...movementRow("food-physical-inventory-movement:m1"), package_count: 99 };
  assert.deepEqual(result, expected);
});

test("006L invalid exact identity fails whole operation without partial output", async () => {
  const input = structuredClone(grouped(1));
  Object.assign(input.batches[0]!.movements[0]!, { movementId: "wrong:synthetic" });
  const database = new MemoryDatabase(); database.batchRows.push(batchRow());
  assert.deepEqual(await resolveFoodGroupedInventoryEvidenceDurably(database, input), { outcome: "invalid" });
  assert.equal(database.readCount, 1);
});
