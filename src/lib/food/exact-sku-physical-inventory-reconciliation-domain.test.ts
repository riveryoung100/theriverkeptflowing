import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createFoodSkuId } from "./package-sku-domain";
import {
  FOOD_EXACT_SKU_PHYSICAL_COUNT_OBSERVATION_KIND,
  FOOD_EXACT_SKU_PHYSICAL_COUNT_SCOPE,
  createFoodExactSkuPhysicalCountObservationId,
} from "./exact-sku-physical-count-observation-domain";
import {
  FOOD_EXACT_SKU_PHYSICAL_INVENTORY_RECONCILIATION_KIND,
  FOOD_EXACT_SKU_PHYSICAL_INVENTORY_RECONCILIATION_STATUSES,
  reconcileFoodExactSkuPhysicalInventory,
} from "./exact-sku-physical-inventory-reconciliation-domain";

function sku() {
  return {
    id: createFoodSkuId("006r-synthetic-sku"),
    version: 2,
  };
}

function countObservation(countedPackageCount = 10) {
  return {
    kind: FOOD_EXACT_SKU_PHYSICAL_COUNT_OBSERVATION_KIND,
    id: createFoodExactSkuPhysicalCountObservationId("006r-count-001"),
    sku: sku(),
    countScope: FOOD_EXACT_SKU_PHYSICAL_COUNT_SCOPE,
    countedPackageCount,
    observedAt: "2026-10-15T18:00:00Z",
    attribution: "synthetic:test-counter",
    sourceReference: "synthetic:count:006r-001",
  };
}

function recordedValidation(recordedPackageBalance = 10) {
  const exactSku = sku();
  const head = 17;
  return {
    outcome: "validated",
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
          batches: [],
          skuBalance: {
            kind: "food-sku-recorded-physical-balance",
            sku: exactSku,
            recordedPackageBalance,
            batchReferences: [],
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

test("006R status vocabulary is fixed and narrow", () => {
  assert.deepEqual(
    [...FOOD_EXACT_SKU_PHYSICAL_INVENTORY_RECONCILIATION_STATUSES],
    ["agreement", "count-over-recorded", "count-under-recorded"],
  );
  assert(Object.isFrozen(FOOD_EXACT_SKU_PHYSICAL_INVENTORY_RECONCILIATION_STATUSES));
});

test("006R exact equality derives agreement and zero signed variance", () => {
  const result = reconcileFoodExactSkuPhysicalInventory(
    recordedValidation(10),
    countObservation(10),
  );
  assert.equal(result.kind, FOOD_EXACT_SKU_PHYSICAL_INVENTORY_RECONCILIATION_KIND);
  assert.equal(result.status, "agreement");
  assert.equal(result.countedPackageCount, 10);
  assert.equal(result.recordedPackageBalance, 10);
  assert.equal(result.variancePackageCount, 0);
});

test("006R higher physical count derives count-over-recorded", () => {
  const result = reconcileFoodExactSkuPhysicalInventory(
    recordedValidation(10),
    countObservation(13),
  );
  assert.equal(result.status, "count-over-recorded");
  assert.equal(result.variancePackageCount, 3);
});

test("006R lower physical count derives count-under-recorded", () => {
  const result = reconcileFoodExactSkuPhysicalInventory(
    recordedValidation(10),
    countObservation(6),
  );
  assert.equal(result.status, "count-under-recorded");
  assert.equal(result.variancePackageCount, -4);
});

test("006R preserves negative recorded history without clamping", () => {
  const result = reconcileFoodExactSkuPhysicalInventory(
    recordedValidation(-5),
    countObservation(0),
  );
  assert.equal(result.recordedPackageBalance, -5);
  assert.equal(result.countedPackageCount, 0);
  assert.equal(result.variancePackageCount, 5);
  assert.equal(result.status, "count-over-recorded");
});

test("006R uses exact BigInt subtraction and rejects unsafe final variance", () => {
  assert.throws(() =>
    reconcileFoodExactSkuPhysicalInventory(
      recordedValidation(-Number.MAX_SAFE_INTEGER),
      countObservation(Number.MAX_SAFE_INTEGER),
    ),
  );

  assert.equal(
    reconcileFoodExactSkuPhysicalInventory(
      recordedValidation(0),
      countObservation(Number.MAX_SAFE_INTEGER),
    ).variancePackageCount,
    Number.MAX_SAFE_INTEGER,
  );
});

test("006R requires exact SKU identity and exact version equality", () => {
  const wrongId = countObservation();
  wrongId.sku.id = createFoodSkuId("different-sku");
  assert.throws(() =>
    reconcileFoodExactSkuPhysicalInventory(recordedValidation(), wrongId),
  );

  const wrongVersion = countObservation();
  wrongVersion.sku.version = 3;
  assert.throws(() =>
    reconcileFoodExactSkuPhysicalInventory(recordedValidation(), wrongVersion),
  );
});

test("006R requires a validated FOOD-006P result", () => {
  for (const recorded of [
    { outcome: "stale", exactSkuEvidenceHead: 18 },
    { outcome: "invalid" },
    { outcome: "not-found" },
    { outcome: "storage-failure" },
  ]) {
    assert.throws(() =>
      reconcileFoodExactSkuPhysicalInventory(recorded, countObservation()),
    );
  }
});

test("006R fails closed when supplied 006P internal SKU invariants disagree", () => {
  const recorded = recordedValidation();
  const bad = {
    ...recorded,
    value: {
      ...recorded.value,
      readPoint: {
        ...recorded.value.readPoint,
        sku: {
          ...recorded.value.readPoint.sku,
          version: 99,
        },
      },
    },
  };
  assert.throws(() =>
    reconcileFoodExactSkuPhysicalInventory(bad, countObservation()),
  );
});

test("006R fails closed when supplied 006P generation invariants disagree", () => {
  const recorded = recordedValidation();
  const bad = {
    ...recorded,
    value: {
      ...recorded.value,
      readPoint: {
        ...recorded.value.readPoint,
        exactSkuEvidenceHead: 18,
      },
    },
  };
  assert.throws(() =>
    reconcileFoodExactSkuPhysicalInventory(bad, countObservation()),
  );
});

test("006R delegates strict count observation validation to canonical 006Q", () => {
  assert.throws(() =>
    reconcileFoodExactSkuPhysicalInventory(
      recordedValidation(),
      { ...countObservation(), countedPackageCount: -1 },
    ),
  );
  assert.throws(() =>
    reconcileFoodExactSkuPhysicalInventory(
      recordedValidation(),
      { ...countObservation(), countScope: "partial" },
    ),
  );
});

test("006R result is frozen, count evidence is canonical, and 006P value provenance is preserved by reference", () => {
  const recorded = recordedValidation();
  const observation = countObservation(12);
  const result = reconcileFoodExactSkuPhysicalInventory(recorded, observation);

  assert(Object.isFrozen(result));
  assert(Object.isFrozen(result.sku));
  assert(Object.isFrozen(result.countObservation));
  assert(Object.isFrozen(result.countObservation.sku));
  assert.equal(result.recordedBalanceValidation, recorded.value);

  observation.countedPackageCount = 99;
  assert.equal(result.countObservation.countedPackageCount, 12);
});

test("006R source remains synchronous pure and grants no operational/current-QOH authority", async () => {
  const source = await readFile(
    new URL("./exact-sku-physical-inventory-reconciliation-domain.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /validateFoodExactSkuPhysicalCountObservation/);
  assert.match(source, /FoodAuthoritativeRecordedInventoryBalanceReadPointValidationResult/);
  assert.match(source, /BigInt/);
  assert.doesNotMatch(source, /\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bSELECT\b/);
  assert.doesNotMatch(source, /\bfetch\s*\(|Date\.now\s*\(|new Date\s*\(/);
  assert.doesNotMatch(source, /\bcurrentQoh\s*:|\bavailableToPromise\s*:|\breservationAuthority\s*:/);
});
