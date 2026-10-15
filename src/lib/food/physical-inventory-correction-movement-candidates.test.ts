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
  createFoodPhysicalInventoryMovementId,
} from "./physical-inventory-movement-domain";
import {
  FOOD_PHYSICAL_INVENTORY_CORRECTION_MOVEMENT_CANDIDATE_BUNDLE_KIND,
  deriveFoodPhysicalInventoryCorrectionMovementCandidates,
} from "./physical-inventory-correction-movement-candidates";

function sku() {
  return {
    id: createFoodSkuId("006t-synthetic-sku"),
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
    id: createFoodExactSkuPhysicalCountObservationId("006t-count"),
    sku: sku(),
    countScope: FOOD_EXACT_SKU_PHYSICAL_COUNT_SCOPE,
    countedPackageCount,
    observedAt: "2026-10-15T18:00:00Z",
    attribution: "synthetic:test-counter",
    sourceReference: "synthetic:006t-count",
  };
}

function recordedValidation(recordedPackageBalance: number) {
  const exactSku = sku();
  const first = batch("006t-batch-a");
  const second = batch("006t-batch-b");
  const head = 31;

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
          bookmark: "synthetic:006t-b1",
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
          bookmark: "synthetic:006t-b2",
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

function allocationResult(
  recordedPackageBalance: number,
  countedPackageCount: number,
  allocations: unknown[],
) {
  return allocateFoodExactBatchPhysicalInventoryCorrection(
    reconciliation(recordedPackageBalance, countedPackageCount),
    allocations,
  );
}

function metadata(
  localBatch: string,
  movementLocal: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    batch: batch(localBatch),
    movementId: createFoodPhysicalInventoryMovementId(movementLocal),
    occurredOn: "2026-10-14",
    attribution: "synthetic:operator",
    sourceReference: `synthetic:006t:${movementLocal}`,
    ...overrides,
  };
}

test("006T agreement produces zero movement candidates and requires zero metadata", () => {
  const source = allocationResult(10, 10, []);
  const result =
    deriveFoodPhysicalInventoryCorrectionMovementCandidates(source, []);

  assert.equal(result.outcome, "no-correction-required");
  assert.deepEqual(result.movements, []);
  assert(Object.isFrozen(result));
  assert(Object.isFrozen(result.movements));

  assert.throws(() =>
    deriveFoodPhysicalInventoryCorrectionMovementCandidates(
      source,
      [metadata("006t-batch-a", "agreement-invalid")],
    ),
  );
});

test("006T derives exactly one canonical adjustment-in candidate per allocation", () => {
  const source = allocationResult(
    10,
    14,
    [
      { batch: batch("006t-batch-a"), packageCount: 1 },
      { batch: batch("006t-batch-b"), packageCount: 3 },
    ],
  );

  const result = deriveFoodPhysicalInventoryCorrectionMovementCandidates(
    source,
    [
      metadata("006t-batch-a", "movement-a"),
      metadata("006t-batch-b", "movement-b"),
    ],
  );

  assert.equal(result.outcome, "candidates");
  if (result.outcome !== "candidates") throw new Error("expected candidates");

  assert.equal(
    result.value.kind,
    FOOD_PHYSICAL_INVENTORY_CORRECTION_MOVEMENT_CANDIDATE_BUNDLE_KIND,
  );
  assert.equal(result.value.movements.length, 2);
  assert.equal(result.value.movements[0]?.movementType, "adjustment-in");
  assert.equal(result.value.movements[0]?.packageCount, 1);
  assert.equal(result.value.movements[1]?.movementType, "adjustment-in");
  assert.equal(result.value.movements[1]?.packageCount, 3);
});

test("006T derives adjustment-out candidates for count-under-recorded allocation", () => {
  const source = allocationResult(
    10,
    7,
    [{ batch: batch("006t-batch-a"), packageCount: 3 }],
  );

  const result = deriveFoodPhysicalInventoryCorrectionMovementCandidates(
    source,
    [metadata("006t-batch-a", "movement-out")],
  );

  assert.equal(result.outcome, "candidates");
  if (result.outcome !== "candidates") throw new Error("expected candidates");

  assert.equal(result.value.movements.length, 1);
  assert.equal(result.value.movements[0]?.movementType, "adjustment-out");
  assert.equal(result.value.movements[0]?.packageCount, 3);
});

test("006T metadata is bound by exact batch rather than caller array position", () => {
  const source = allocationResult(
    10,
    14,
    [
      { batch: batch("006t-batch-a"), packageCount: 1 },
      { batch: batch("006t-batch-b"), packageCount: 3 },
    ],
  );

  const result = deriveFoodPhysicalInventoryCorrectionMovementCandidates(
    source,
    [
      metadata("006t-batch-b", "movement-b"),
      metadata("006t-batch-a", "movement-a"),
    ],
  );

  assert.equal(result.outcome, "candidates");
  if (result.outcome !== "candidates") throw new Error("expected candidates");

  assert.equal(
    result.value.movements[0]?.id,
    createFoodPhysicalInventoryMovementId("movement-a"),
  );
  assert.equal(
    result.value.movements[1]?.id,
    createFoodPhysicalInventoryMovementId("movement-b"),
  );
});

test("006T rejects metadata cardinality mismatch", () => {
  const source = allocationResult(
    10,
    14,
    [
      { batch: batch("006t-batch-a"), packageCount: 1 },
      { batch: batch("006t-batch-b"), packageCount: 3 },
    ],
  );

  assert.throws(() =>
    deriveFoodPhysicalInventoryCorrectionMovementCandidates(
      source,
      [metadata("006t-batch-a", "movement-a")],
    ),
  );

  assert.throws(() =>
    deriveFoodPhysicalInventoryCorrectionMovementCandidates(
      source,
      [
        metadata("006t-batch-a", "movement-a"),
        metadata("006t-batch-b", "movement-b"),
        metadata("006t-batch-b", "movement-c"),
      ],
    ),
  );
});

test("006T rejects metadata for an unknown exact batch or wrong batch version", () => {
  const source = allocationResult(
    10,
    11,
    [{ batch: batch("006t-batch-a"), packageCount: 1 }],
  );

  assert.throws(() =>
    deriveFoodPhysicalInventoryCorrectionMovementCandidates(
      source,
      [metadata("unknown-batch", "unknown")],
    ),
  );

  assert.throws(() =>
    deriveFoodPhysicalInventoryCorrectionMovementCandidates(
      source,
      [
        metadata(
          "006t-batch-a",
          "wrong-version",
          { batch: batch("006t-batch-a", 99) },
        ),
      ],
    ),
  );
});

test("006T rejects duplicate metadata batch binding", () => {
  const source = allocationResult(
    10,
    14,
    [
      { batch: batch("006t-batch-a"), packageCount: 1 },
      { batch: batch("006t-batch-b"), packageCount: 3 },
    ],
  );

  assert.throws(() =>
    deriveFoodPhysicalInventoryCorrectionMovementCandidates(
      source,
      [
        metadata("006t-batch-a", "movement-a"),
        metadata("006t-batch-a", "movement-b"),
      ],
    ),
  );
});

test("006T rejects duplicate movement IDs across distinct allocations", () => {
  const source = allocationResult(
    10,
    14,
    [
      { batch: batch("006t-batch-a"), packageCount: 1 },
      { batch: batch("006t-batch-b"), packageCount: 3 },
    ],
  );

  assert.throws(() =>
    deriveFoodPhysicalInventoryCorrectionMovementCandidates(
      source,
      [
        metadata("006t-batch-a", "duplicate-id"),
        metadata("006t-batch-b", "duplicate-id"),
      ],
    ),
  );
});

test("006T delegates movement ID date attribution and source reference validation to canonical movement domain", () => {
  const source = allocationResult(
    10,
    11,
    [{ batch: batch("006t-batch-a"), packageCount: 1 }],
  );

  const invalidOverrides: Record<string, unknown>[] = [
    { movementId: "not-canonical" },
    { occurredOn: "2026-02-30" },
    { occurredOn: "2026-10-15T18:00:00Z" },
    { attribution: "" },
    { attribution: " padded" },
    { sourceReference: "" },
    { sourceReference: "x".repeat(513) },
  ];

  for (const overrides of invalidOverrides) {
    assert.throws(() =>
      deriveFoodPhysicalInventoryCorrectionMovementCandidates(
        source,
        [metadata("006t-batch-a", "canonical", overrides)],
      ),
    );
  }
});

test("006T preserves explicit occurredOn and never truncates count observedAt", () => {
  const source = allocationResult(
    10,
    11,
    [{ batch: batch("006t-batch-a"), packageCount: 1 }],
  );

  const result = deriveFoodPhysicalInventoryCorrectionMovementCandidates(
    source,
    [
      metadata(
        "006t-batch-a",
        "explicit-date",
        { occurredOn: "2026-10-14" },
      ),
    ],
  );

  assert.equal(result.outcome, "candidates");
  if (result.outcome !== "candidates") throw new Error("expected candidates");

  assert.equal(result.value.movements[0]?.occurredOn, "2026-10-14");
  assert.equal(
    result.value.allocationPlan.reconciliation.countObservation.observedAt,
    "2026-10-15T18:00:00Z",
  );
});

test("006T preserves explicit attribution and sourceReference without synthesis", () => {
  const source = allocationResult(
    10,
    11,
    [{ batch: batch("006t-batch-a"), packageCount: 1 }],
  );

  const result = deriveFoodPhysicalInventoryCorrectionMovementCandidates(
    source,
    [
      metadata(
        "006t-batch-a",
        "explicit-provenance",
        {
          attribution: "operator:river",
          sourceReference: "physical-count-sheet:2026-10-15",
        },
      ),
    ],
  );

  assert.equal(result.outcome, "candidates");
  if (result.outcome !== "candidates") throw new Error("expected candidates");

  assert.equal(result.value.movements[0]?.attribution, "operator:river");
  assert.equal(
    result.value.movements[0]?.sourceReference,
    "physical-count-sheet:2026-10-15",
  );
});

test("006T fails closed on tampered FOOD-006S allocation plan", () => {
  const source = allocationResult(
    10,
    11,
    [{ batch: batch("006t-batch-a"), packageCount: 1 }],
  );

  assert.equal(source.outcome, "allocated");
  if (source.outcome !== "allocated") throw new Error("expected allocation");

  for (const value of [
    { ...source.value, requiredPackageCount: 99 },
    { ...source.value, proposedMovementType: "adjustment-out" },
    { ...source.value, kind: "wrong-kind" },
  ]) {
    assert.throws(() =>
      deriveFoodPhysicalInventoryCorrectionMovementCandidates(
        { outcome: "allocated", value },
        [metadata("006t-batch-a", "tamper")],
      ),
    );
  }
});

test("006T cannot derive waste from reconciliation correction allocation", () => {
  const source = allocationResult(
    10,
    11,
    [{ batch: batch("006t-batch-a"), packageCount: 1 }],
  );

  assert.equal(source.outcome, "allocated");
  if (source.outcome !== "allocated") throw new Error("expected allocation");

  assert.throws(() =>
    deriveFoodPhysicalInventoryCorrectionMovementCandidates(
      {
        outcome: "allocated",
        value: { ...source.value, proposedMovementType: "waste" },
      },
      [metadata("006t-batch-a", "waste")],
    ),
  );
});

test("006T output is detached and frozen across candidate bundle structures", () => {
  const source = allocationResult(
    10,
    11,
    [{ batch: batch("006t-batch-a"), packageCount: 1 }],
  );

  const input = [metadata("006t-batch-a", "frozen")];
  const result =
    deriveFoodPhysicalInventoryCorrectionMovementCandidates(source, input);

  assert.equal(result.outcome, "candidates");
  if (result.outcome !== "candidates") throw new Error("expected candidates");

  assert(Object.isFrozen(result));
  assert(Object.isFrozen(result.value));
  assert(Object.isFrozen(result.value.sku));
  assert(Object.isFrozen(result.value.movements));
  assert(Object.isFrozen(result.value.movements[0]));
  assert(Object.isFrozen(result.value.movements[0]?.batch));
  assert(Object.isFrozen(result.value.movements[0]?.sku));

  input[0]!.occurredOn = "2026-10-13";
  assert.equal(result.value.movements[0]?.occurredOn, "2026-10-14");
});

test("006T source remains pure and contains no movement writer clock SQL or operational authority", async () => {
  const source = await readFile(
    new URL(
      "./physical-inventory-correction-movement-candidates.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(source, /validateFoodPhysicalInventoryMovement/);
  assert.match(source, /movementId/);
  assert.match(source, /occurredOn/);
  assert.match(source, /attribution/);
  assert.match(source, /sourceReference/);

  assert.doesNotMatch(
    source,
    /appendFoodPhysicalInventoryMovement|D1Database|prepare\s*\(|withSession\s*\(|fetch\s*\(|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bSELECT\b/,
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
