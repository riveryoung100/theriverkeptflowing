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
  FOOD_EXACT_BATCH_PHYSICAL_INVENTORY_CORRECTION_ALLOCATION_KIND,
  FOOD_PHYSICAL_INVENTORY_CORRECTION_DIRECTIONS,
  allocateFoodExactBatchPhysicalInventoryCorrection,
} from "./exact-batch-physical-inventory-correction-allocation";

function sku() {
  return {
    id: createFoodSkuId("006s-synthetic-sku"),
    version: 2,
  };
}

function batch(id: string, version = 1) {
  return {
    id: createFoodProductionBatchId(id),
    version,
  };
}

function countObservation(countedPackageCount: number) {
  return {
    kind: FOOD_EXACT_SKU_PHYSICAL_COUNT_OBSERVATION_KIND,
    id: createFoodExactSkuPhysicalCountObservationId("006s-count"),
    sku: sku(),
    countScope: FOOD_EXACT_SKU_PHYSICAL_COUNT_SCOPE,
    countedPackageCount,
    observedAt: "2026-10-15T18:00:00Z",
    attribution: "synthetic:test-counter",
    sourceReference: "synthetic:006s-count",
  };
}

function recordedValidation(recordedPackageBalance: number) {
  const exactSku = sku();
  const first = batch("006s-batch-a");
  const second = batch("006s-batch-b");
  const head = 21;

  const perBatch = (
    exactBatch: ReturnType<typeof batch>,
    balance: number,
    sequence: number,
  ) => ({
    productionBatchEvidenceSequence: sequence,
    batch: exactBatch,
    movements: [],
    recordedBalance: {
      kind: "food-production-batch-recorded-physical-balance",
      batch: exactBatch,
      sku: exactSku,
      recordedPackageBalance: balance,
      movementReferences: [],
    },
  });

  return {
    outcome: "validated" as const,
    value: {
      composition: {
        acquisition: {
          sku: exactSku,
          exactSkuEvidenceHead: head,
          bookmark: "synthetic:b1",
        },
        recordedBalance: {
          kind: "food-lossless-grouped-inventory-recorded-balance",
          sku: exactSku,
          cutoff: head,
          batches: [
            perBatch(first, Math.trunc(recordedPackageBalance / 2), 1),
            perBatch(
              second,
              recordedPackageBalance - Math.trunc(recordedPackageBalance / 2),
              2,
            ),
          ],
          skuBalance: {
            kind: "food-sku-recorded-physical-balance",
            sku: exactSku,
            recordedPackageBalance,
            batchReferences: [first, second],
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
          bookmark: "synthetic:b2",
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

test("006S correction directions are exactly adjustment-in and adjustment-out", () => {
  assert.deepEqual(
    [...FOOD_PHYSICAL_INVENTORY_CORRECTION_DIRECTIONS],
    ["adjustment-in", "adjustment-out"],
  );
  assert(Object.isFrozen(FOOD_PHYSICAL_INVENTORY_CORRECTION_DIRECTIONS));
});

test("006S agreement requires no allocation and produces no-correction-required", () => {
  const source = reconciliation(10, 10);
  const result =
    allocateFoodExactBatchPhysicalInventoryCorrection(source, []);

  assert.equal(result.outcome, "no-correction-required");
  assert.equal(result.reconciliation.status, "agreement");
  assert(Object.isFrozen(result));
});

test("006S agreement rejects invented correction allocations", () => {
  const source = reconciliation(10, 10);

  assert.throws(() =>
    allocateFoodExactBatchPhysicalInventoryCorrection(
      source,
      [{ batch: batch("006s-batch-a"), packageCount: 1 }],
    ),
  );
});

test("006S positive variance derives only adjustment-in", () => {
  const source = reconciliation(10, 14);
  const result =
    allocateFoodExactBatchPhysicalInventoryCorrection(
      source,
      [
        { batch: batch("006s-batch-a"), packageCount: 1 },
        { batch: batch("006s-batch-b"), packageCount: 3 },
      ],
    );

  assert.equal(result.outcome, "allocated");
  if (result.outcome !== "allocated") throw new Error("expected allocation");

  assert.equal(
    result.value.kind,
    FOOD_EXACT_BATCH_PHYSICAL_INVENTORY_CORRECTION_ALLOCATION_KIND,
  );
  assert.equal(result.value.proposedMovementType, "adjustment-in");
  assert.equal(result.value.requiredPackageCount, 4);
});

test("006S negative variance derives only adjustment-out", () => {
  const source = reconciliation(10, 7);
  const result =
    allocateFoodExactBatchPhysicalInventoryCorrection(
      source,
      [{ batch: batch("006s-batch-a"), packageCount: 3 }],
    );

  assert.equal(result.outcome, "allocated");
  if (result.outcome !== "allocated") throw new Error("expected allocation");

  assert.equal(result.value.proposedMovementType, "adjustment-out");
  assert.equal(result.value.requiredPackageCount, 3);
});

test("006S allocation total must exactly equal absolute reconciliation variance", () => {
  const source = reconciliation(10, 14);

  for (const packageCount of [3, 5]) {
    assert.throws(() =>
      allocateFoodExactBatchPhysicalInventoryCorrection(
        source,
        [{ batch: batch("006s-batch-a"), packageCount }],
      ),
    );
  }
});

test("006S nonzero reconciliation requires at least one allocation", () => {
  assert.throws(() =>
    allocateFoodExactBatchPhysicalInventoryCorrection(
      reconciliation(10, 11),
      [],
    ),
  );
});

test("006S allocation package counts are positive safe integers without coercion", () => {
  const source = reconciliation(10, 11);

  for (const packageCount of [
    0,
    -1,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
    "1",
    null,
  ]) {
    assert.throws(() =>
      allocateFoodExactBatchPhysicalInventoryCorrection(
        source,
        [{ batch: batch("006s-batch-a"), packageCount }],
      ),
    );
  }
});

test("006S rejects duplicate exact batch allocation", () => {
  const source = reconciliation(10, 12);

  assert.throws(() =>
    allocateFoodExactBatchPhysicalInventoryCorrection(
      source,
      [
        { batch: batch("006s-batch-a"), packageCount: 1 },
        { batch: batch("006s-batch-a"), packageCount: 1 },
      ],
    ),
  );
});

test("006S rejects batch ID or version absent from 006P composition", () => {
  const source = reconciliation(10, 11);

  assert.throws(() =>
    allocateFoodExactBatchPhysicalInventoryCorrection(
      source,
      [{ batch: batch("unknown-batch"), packageCount: 1 }],
    ),
  );

  assert.throws(() =>
    allocateFoodExactBatchPhysicalInventoryCorrection(
      source,
      [{ batch: batch("006s-batch-a", 99), packageCount: 1 }],
    ),
  );
});

test("006S canonical output ordering is independent of caller allocation order", () => {
  const source = reconciliation(10, 14);

  const first = allocateFoodExactBatchPhysicalInventoryCorrection(
    source,
    [
      { batch: batch("006s-batch-b"), packageCount: 3 },
      { batch: batch("006s-batch-a"), packageCount: 1 },
    ],
  );

  const second = allocateFoodExactBatchPhysicalInventoryCorrection(
    source,
    [
      { batch: batch("006s-batch-a"), packageCount: 1 },
      { batch: batch("006s-batch-b"), packageCount: 3 },
    ],
  );

  assert.deepEqual(first, second);
});

test("006S revalidates the supplied FOOD-006R reconciliation and fails closed on tampering", () => {
  const source = reconciliation(10, 11);

  assert.throws(() =>
    allocateFoodExactBatchPhysicalInventoryCorrection(
      { ...source, variancePackageCount: 99 },
      [{ batch: batch("006s-batch-a"), packageCount: 1 }],
    ),
  );

  assert.throws(() =>
    allocateFoodExactBatchPhysicalInventoryCorrection(
      { ...source, status: "agreement" },
      [{ batch: batch("006s-batch-a"), packageCount: 1 }],
    ),
  );
});

test("006S supports canonical negative recorded balances without clamping", () => {
  const source = reconciliation(-2, 1);
  const result =
    allocateFoodExactBatchPhysicalInventoryCorrection(
      source,
      [{ batch: batch("006s-batch-a"), packageCount: 3 }],
    );

  assert.equal(result.outcome, "allocated");
  if (result.outcome !== "allocated") throw new Error("expected allocation");

  assert.equal(result.value.reconciliation.recordedPackageBalance, -2);
  assert.equal(result.value.requiredPackageCount, 3);
  assert.equal(result.value.proposedMovementType, "adjustment-in");
});

test("006S output is detached and deeply frozen across the new allocation layer", () => {
  const source = reconciliation(10, 12);
  const input = [
    { batch: batch("006s-batch-b"), packageCount: 2 },
  ];

  const result =
    allocateFoodExactBatchPhysicalInventoryCorrection(source, input);

  assert.equal(result.outcome, "allocated");
  if (result.outcome !== "allocated") throw new Error("expected allocation");

  assert(Object.isFrozen(result));
  assert(Object.isFrozen(result.value));
  assert(Object.isFrozen(result.value.sku));
  assert(Object.isFrozen(result.value.allocations));
  assert(Object.isFrozen(result.value.allocations[0]));
  assert(Object.isFrozen(result.value.allocations[0]?.batch));

  input[0]!.packageCount = 99;
  assert.equal(result.value.allocations[0]?.packageCount, 2);
});

test("006S remains a pure plan and creates no movement persistence or operational authority", async () => {
  const source = await readFile(
    new URL(
      "./exact-batch-physical-inventory-correction-allocation.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(source, /proposedMovementType/);
  assert.match(source, /recordedBalanceValidation/);
  assert.match(source, /BigInt/);

  assert.doesNotMatch(
    source,
    /\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bSELECT\b|D1Database|prepare\s*\(|fetch\s*\(/,
  );

  assert.doesNotMatch(
    source,
    /\bmovementId\s*:|\boccurredOn\s*:|\battribution\s*:|\bsourceReference\s*:/,
  );

  assert.doesNotMatch(
    source,
    /\bcurrentQoh\s*:|\bavailableToPromise\s*:|\breservationAuthority\s*:|\bcheckoutReady\s*:|\bpaymentReady\s*:/,
  );
});
