import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createFoodSkuId } from "./package-sku-domain";
import { createFoodProductionBatchId } from "./production-batch-domain";
import {
  FOOD_EXACT_SKU_PHYSICAL_COUNT_OBSERVATION_KIND,
  FOOD_EXACT_SKU_PHYSICAL_COUNT_SCOPE,
  createFoodExactSkuPhysicalCountObservationId,
} from "./exact-sku-physical-count-observation-domain";
import {
  reconcileFoodExactSkuPhysicalInventory,
} from "./exact-sku-physical-inventory-reconciliation-domain";
import {
  allocateFoodExactBatchPhysicalInventoryCorrection,
} from "./exact-batch-physical-inventory-correction-allocation";
import {
  deriveFoodPhysicalInventoryCorrectionMovementCandidates,
} from "./physical-inventory-correction-movement-candidates";
import {
  createFoodPhysicalInventoryMovementId,
  type FoodPhysicalInventoryMovement,
} from "./physical-inventory-movement-domain";
import type {
  FoodPhysicalInventoryMovementD1Database,
  FoodPhysicalInventoryMovementD1Statement,
} from "./d1-physical-inventory-movement-persistence";
import {
  persistFoodPhysicalInventoryCorrectionCandidates,
} from "./physical-inventory-correction-persistence-orchestration";

function sku() {
  return {
    id: createFoodSkuId("006u-synthetic-sku"),
    version: 2,
  };
}

function batch(local: string, version = 1) {
  return {
    id: createFoodProductionBatchId(local),
    version,
  };
}

const batches = [
  batch("006u-batch-a"),
  batch("006u-batch-b"),
  batch("006u-batch-c"),
] as const;

function countObservation(countedPackageCount: number) {
  return {
    kind: FOOD_EXACT_SKU_PHYSICAL_COUNT_OBSERVATION_KIND,
    id: createFoodExactSkuPhysicalCountObservationId("006u-count"),
    sku: sku(),
    countScope: FOOD_EXACT_SKU_PHYSICAL_COUNT_SCOPE,
    countedPackageCount,
    observedAt: "2026-10-15T18:00:00Z",
    attribution: "synthetic:test-counter",
    sourceReference: "synthetic:006u-count",
  };
}

function recordedValidation(recordedPackageBalance: number) {
  const exactSku = sku();
  const head = 41;
  const firstBalance = Math.trunc(recordedPackageBalance / 3);
  const secondBalance = Math.trunc(recordedPackageBalance / 3);
  const thirdBalance =
    recordedPackageBalance - firstBalance - secondBalance;

  const balances = [
    firstBalance,
    secondBalance,
    thirdBalance,
  ];

  const perBatch = batches.map((exactBatch, index) => ({
    productionBatchEvidenceSequence: index + 1,
    batch: exactBatch,
    movements: [],
    recordedBalance: {
      kind: "food-production-batch-recorded-physical-balance",
      batch: exactBatch,
      sku: exactSku,
      recordedPackageBalance: balances[index]!,
      movementReferences: [],
    },
  }));

  return {
    outcome: "validated" as const,
    value: {
      composition: {
        acquisition: {
          sku: exactSku,
          exactSkuEvidenceHead: head,
          bookmark: "synthetic:006u-b1",
        },
        recordedBalance: {
          kind: "food-lossless-grouped-inventory-recorded-balance",
          sku: exactSku,
          cutoff: head,
          batches: perBatch,
          skuBalance: {
            kind: "food-sku-recorded-physical-balance",
            sku: exactSku,
            recordedPackageBalance,
            batchReferences: [...batches],
          },
        },
      },
      readPoint: {
        kind: "food-authoritative-inventory-read-point",
        sku: exactSku,
        composedCutoff: head,
        exactSkuEvidenceHead: head,
        consistencyToken: {
          sku: exactSku,
          composedCutoff: head,
          exactSkuEvidenceHead: head,
          bookmark: "synthetic:006u-b2",
        },
      },
    },
  };
}

function reconciliation(
  recordedPackageBalance: number,
  countedPackageCount: number,
) {
  return reconcileFoodExactSkuPhysicalInventory(
    recordedValidation(recordedPackageBalance),
    countObservation(countedPackageCount),
  );
}

function allocatedCandidateResult() {
  const allocation =
    allocateFoodExactBatchPhysicalInventoryCorrection(
      reconciliation(10, 16),
      [
        { batch: batches[0], packageCount: 1 },
        { batch: batches[1], packageCount: 2 },
        { batch: batches[2], packageCount: 3 },
      ],
    );

  return deriveFoodPhysicalInventoryCorrectionMovementCandidates(
    allocation,
    [
      {
        batch: batches[0],
        movementId: createFoodPhysicalInventoryMovementId("006u-movement-a"),
        occurredOn: "2026-10-15",
        attribution: "synthetic:operator",
        sourceReference: "synthetic:006u:a",
      },
      {
        batch: batches[1],
        movementId: createFoodPhysicalInventoryMovementId("006u-movement-b"),
        occurredOn: "2026-10-15",
        attribution: "synthetic:operator",
        sourceReference: "synthetic:006u:b",
      },
      {
        batch: batches[2],
        movementId: createFoodPhysicalInventoryMovementId("006u-movement-c"),
        occurredOn: "2026-10-15",
        attribution: "synthetic:operator",
        sourceReference: "synthetic:006u:c",
      },
    ],
  );
}

function noCorrectionCandidateResult() {
  const allocation =
    allocateFoodExactBatchPhysicalInventoryCorrection(
      reconciliation(10, 10),
      [],
    );

  return deriveFoodPhysicalInventoryCorrectionMovementCandidates(
    allocation,
    [],
  );
}

function movementRow(
  movement: FoodPhysicalInventoryMovement,
): Record<string, unknown> {
  return {
    movement_id: movement.id,
    batch_id: movement.batch.id,
    batch_version: movement.batch.version,
    sku_id: movement.sku.id,
    sku_version: movement.sku.version,
    movement_type: movement.movementType,
    package_count: movement.packageCount,
    occurred_on: movement.occurredOn,
    attribution: movement.attribution,
    source_reference: movement.sourceReference,
  };
}

function batchRow(
  movement: FoodPhysicalInventoryMovement,
  index: number,
): Record<string, unknown> {
  return {
    batch_id: movement.batch.id,
    version: movement.batch.version,
    sku_id: movement.sku.id,
    sku_version: movement.sku.version,
    batch_code: `SYN-006U-00${index + 1}`,
    storage_mode: "frozen",
    produced_package_count: 100,
    prepared_on: "2026-10-01",
    frozen_on: "2026-10-01",
    attribution: "synthetic:batch",
    source_reference: `synthetic:006u-batch:${index + 1}`,
  };
}

class MemoryDatabase
  implements FoodPhysicalInventoryMovementD1Database {
  readonly calls: Array<{ sql: string; values: unknown[] }> = [];
  readonly movements: Record<string, unknown>[] = [];
  readonly batchRows: Record<string, unknown>[];
  readonly insertFailures = new Set<string>();

  constructor(movements: readonly FoodPhysicalInventoryMovement[]) {
    this.batchRows = movements.map(batchRow);
  }

  prepare(sql: string): FoodPhysicalInventoryMovementD1Statement {
    let values: unknown[] = [];

    const statement: FoodPhysicalInventoryMovementD1Statement = {
      bind: (...args) => {
        values = [...args];
        return statement;
      },
      all: async () => {
        this.calls.push({ sql, values: [...values] });

        if (
          sql.startsWith("SELECT")
          && sql.includes("FROM food_physical_inventory_movements")
        ) {
          return {
            success: true,
            results: this.movements.filter(
              (row) => row.movement_id === values[0],
            ),
          };
        }

        if (
          sql.startsWith("SELECT")
          && sql.includes("FROM food_production_batches")
        ) {
          return {
            success: true,
            results: this.batchRows.filter(
              (row) =>
                row.batch_id === values[0]
                && row.version === values[1],
            ),
          };
        }

        assert(
          sql.startsWith(
            "INSERT INTO food_physical_inventory_movements",
          ),
        );

        const movementId = String(values[0]);

        if (this.insertFailures.has(movementId)) {
          throw new Error("synthetic insert failure");
        }

        if (
          this.movements.some(
            (row) => row.movement_id === values[0],
          )
        ) {
          throw new Error("synthetic unique conflict");
        }

        const row = {
          movement_id: values[0],
          batch_id: values[1],
          batch_version: values[2],
          sku_id: values[3],
          sku_version: values[4],
          movement_type: values[5],
          package_count: values[6],
          occurred_on: values[7],
          attribution: values[8],
          source_reference: values[9],
        };

        this.movements.push(row);

        return {
          success: true,
          results: [row],
        };
      },
    };

    return statement;
  }

  seedExact(movement: FoodPhysicalInventoryMovement): void {
    this.movements.push(movementRow(movement));
  }

  seedConflict(movement: FoodPhysicalInventoryMovement): void {
    this.movements.push({
      ...movementRow(movement),
      package_count: movement.packageCount + 1,
    });
  }

  removeBatch(movement: FoodPhysicalInventoryMovement): void {
    const index = this.batchRows.findIndex(
      (row) =>
        row.batch_id === movement.batch.id
        && row.version === movement.batch.version,
    );

    if (index >= 0) {
      this.batchRows.splice(index, 1);
    }
  }
}

function candidates() {
  const result = allocatedCandidateResult();
  assert.equal(result.outcome, "candidates");
  if (result.outcome !== "candidates") {
    throw new Error("expected FOOD-006T candidates");
  }
  return result;
}

test("006U no-correction path performs zero database calls", async () => {
  const source = noCorrectionCandidateResult();
  assert.equal(source.outcome, "no-correction-required");

  let prepares = 0;
  const database: FoodPhysicalInventoryMovementD1Database = {
    prepare() {
      prepares += 1;
      throw new Error("database must not be touched");
    },
  };

  const result =
    await persistFoodPhysicalInventoryCorrectionCandidates(
      database,
      source,
    );

  assert.equal(result.outcome, "no-correction-required");
  assert.equal(prepares, 0);
});

test("006U persists all candidates sequentially and completes", async () => {
  const source = candidates();
  const db = new MemoryDatabase(source.value.movements);

  const result =
    await persistFoodPhysicalInventoryCorrectionCandidates(db, source);

  assert.equal(result.outcome, "completed");
  if (result.outcome !== "completed") {
    throw new Error("expected completed");
  }

  assert.equal(result.attempts.length, 3);
  assert.deepEqual(
    result.attempts.map((entry) => entry.result.outcome),
    ["created", "created", "created"],
  );
  assert.equal(db.movements.length, 3);
  assert.equal(db.calls.length, 9);
  assert.deepEqual(
    result.attempts.map((entry) => entry.movement.id),
    source.value.movements.map((movement) => movement.id),
  );
});

test("006U exact retry preserves already-present per candidate", async () => {
  const source = candidates();
  const db = new MemoryDatabase(source.value.movements);

  const first =
    await persistFoodPhysicalInventoryCorrectionCandidates(db, source);
  assert.equal(first.outcome, "completed");

  db.calls.length = 0;

  const retry =
    await persistFoodPhysicalInventoryCorrectionCandidates(db, source);

  assert.equal(retry.outcome, "completed");
  if (retry.outcome !== "completed") {
    throw new Error("expected completed retry");
  }

  assert.deepEqual(
    retry.attempts.map((entry) => entry.result.outcome),
    ["already-present", "already-present", "already-present"],
  );
  assert.equal(db.movements.length, 3);
  assert.equal(db.calls.length, 3);
});

test("006U conflict blocks immediately and exposes unattempted remainder", async () => {
  const source = candidates();
  const db = new MemoryDatabase(source.value.movements);

  db.seedConflict(source.value.movements[1]!);

  const result =
    await persistFoodPhysicalInventoryCorrectionCandidates(db, source);

  assert.equal(result.outcome, "blocked");
  if (result.outcome !== "blocked") {
    throw new Error("expected blocked");
  }

  assert.deepEqual(
    result.attempts.map((entry) => entry.result.outcome),
    ["created", "conflict"],
  );
  assert.equal(result.blocking.index, 1);
  assert.equal(result.blocking.result.outcome, "conflict");
  assert.equal(result.remaining.length, 1);
  assert.equal(
    result.remaining[0]?.movementId,
    source.value.movements[2]?.id,
  );
  assert.equal(
    db.movements.some(
      (row) => row.movement_id === source.value.movements[2]?.id,
    ),
    false,
  );
});

test("006U storage failure blocks while preserving earlier durable success", async () => {
  const source = candidates();
  const db = new MemoryDatabase(source.value.movements);

  db.insertFailures.add(source.value.movements[1]!.id);

  const result =
    await persistFoodPhysicalInventoryCorrectionCandidates(db, source);

  assert.equal(result.outcome, "blocked");
  if (result.outcome !== "blocked") {
    throw new Error("expected blocked");
  }

  assert.deepEqual(
    result.attempts.map((entry) => entry.result.outcome),
    ["created", "storage-failure"],
  );
  assert.equal(result.remaining.length, 1);
  assert.equal(
    db.movements.some(
      (row) => row.movement_id === source.value.movements[0]?.id,
    ),
    true,
  );
  assert.equal(
    db.movements.some(
      (row) => row.movement_id === source.value.movements[2]?.id,
    ),
    false,
  );
});

test("006U invalid durable batch blocks and does not attempt later candidate", async () => {
  const source = candidates();
  const db = new MemoryDatabase(source.value.movements);

  db.removeBatch(source.value.movements[1]!);

  const result =
    await persistFoodPhysicalInventoryCorrectionCandidates(db, source);

  assert.equal(result.outcome, "blocked");
  if (result.outcome !== "blocked") {
    throw new Error("expected blocked");
  }

  assert.deepEqual(
    result.attempts.map((entry) => entry.result.outcome),
    ["created", "invalid"],
  );
  assert.equal(result.remaining.length, 1);
  assert.equal(
    result.remaining[0]?.movementId,
    source.value.movements[2]?.id,
  );
});

test("006U rejects tampered candidate movement before database access", async () => {
  const source = candidates();
  const db = new MemoryDatabase(source.value.movements);

  const tampered = {
    outcome: "candidates",
    value: {
      ...source.value,
      movements: [
        {
          ...source.value.movements[0],
          packageCount: source.value.movements[0]!.packageCount + 1,
        },
        ...source.value.movements.slice(1),
      ],
    },
  };

  const result =
    await persistFoodPhysicalInventoryCorrectionCandidates(
      db,
      tampered,
    );

  assert.deepEqual(result, { outcome: "invalid" });
  assert.equal(db.calls.length, 0);
  assert.equal(db.movements.length, 0);
});

test("006U rejects reordered candidate movements before database access", async () => {
  const source = candidates();
  const db = new MemoryDatabase(source.value.movements);

  const tampered = {
    outcome: "candidates",
    value: {
      ...source.value,
      movements: [
        source.value.movements[1],
        source.value.movements[0],
        source.value.movements[2],
      ],
    },
  };

  const result =
    await persistFoodPhysicalInventoryCorrectionCandidates(
      db,
      tampered,
    );

  assert.deepEqual(result, { outcome: "invalid" });
  assert.equal(db.calls.length, 0);
});

test("006U rejects tampered allocation provenance before database access", async () => {
  const source = candidates();
  const db = new MemoryDatabase(source.value.movements);

  const tampered = {
    outcome: "candidates",
    value: {
      ...source.value,
      allocationPlan: {
        ...source.value.allocationPlan,
        requiredPackageCount: 999,
      },
    },
  };

  const result =
    await persistFoodPhysicalInventoryCorrectionCandidates(
      db,
      tampered,
    );

  assert.deepEqual(result, { outcome: "invalid" });
  assert.equal(db.calls.length, 0);
});

test("006U result wrappers freeze orchestration state and preserve writer values", async () => {
  const source = candidates();
  const db = new MemoryDatabase(source.value.movements);

  const result =
    await persistFoodPhysicalInventoryCorrectionCandidates(db, source);

  assert.equal(result.outcome, "completed");
  if (result.outcome !== "completed") {
    throw new Error("expected completed");
  }

  assert(Object.isFrozen(result));
  assert(Object.isFrozen(result.attempts));
  assert(Object.isFrozen(result.attempts[0]));
  assert.equal(result.attempts[0]?.result.outcome, "created");

  if (result.attempts[0]?.result.outcome !== "created") {
    throw new Error("expected created result");
  }

  assert.deepEqual(
    result.attempts[0].result.value,
    result.attempts[0].movement,
  );
});

test("006U source delegates persistence and contains no SQL batch transaction or post-write reread", async () => {
  const source = await readFile(
    new URL(
      "./physical-inventory-correction-persistence-orchestration.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(source, /appendFoodPhysicalInventoryMovement/);
  assert.match(source, /deriveFoodPhysicalInventoryCorrectionMovementCandidates/);
  assert.match(source, /outcome: "blocked"/);
  assert.match(source, /remaining:/);

  assert.doesNotMatch(
    source,
    /\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bSELECT\b|prepare\s*\(|withSession\s*\(|database\.batch|\.transaction\s*\(/,
  );

  assert.doesNotMatch(
    source,
    /acquireFoodAuthoritativeInventoryEvidenceHead|composeFoodAuthoritativeRecordedInventoryBalance|validateFoodAuthoritativeRecordedInventoryBalanceAtReadPoint/,
  );

  assert.doesNotMatch(
    source,
    /Date\.now|new Date|crypto\.randomUUID|Math\.random/,
  );

  assert.doesNotMatch(
    source,
    /\bcurrentQoh\s*:|\bavailableToPromise\s*:|\breservationAuthority\s*:|\bcheckoutReady\s*:|\bpaymentReady\s*:/,
  );
});
