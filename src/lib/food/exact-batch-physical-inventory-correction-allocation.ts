/**
 * FOOD-006S: pure exact-batch correction allocation prerequisite.
 *
 * FOOD-006R proves only an exact-SKU discrepancy. Canonical physical
 * inventory movements require an exact production batch, and the repository
 * has no automatic batch-allocation policy. Therefore this domain requires
 * the caller to explicitly allocate a nonzero reconciliation discrepancy
 * across exact batches already present in the validated recorded composition.
 *
 * This object is not a physical inventory movement, does not create an ID,
 * does not choose occurredOn/attribution/sourceReference, performs no write,
 * and grants no current-QOH, availability, capacity, reservation, checkout,
 * payment, fulfillment, accounting, or rewards authority.
 */

import {
  FOOD_EXACT_SKU_PHYSICAL_INVENTORY_RECONCILIATION_KIND,
  reconcileFoodExactSkuPhysicalInventory,
  type FoodExactSkuPhysicalInventoryReconciliation,
} from "./exact-sku-physical-inventory-reconciliation-domain";
import {
  parseFoodProductionBatchId,
  type FoodProductionBatchId,
} from "./production-batch-domain";
import type { FoodSkuId } from "./package-sku-domain";

export const FOOD_EXACT_BATCH_PHYSICAL_INVENTORY_CORRECTION_ALLOCATION_KIND =
  "food-exact-batch-physical-inventory-correction-allocation" as const;

export const FOOD_PHYSICAL_INVENTORY_CORRECTION_DIRECTIONS =
  Object.freeze(["adjustment-in", "adjustment-out"] as const);

export type FoodPhysicalInventoryCorrectionDirection =
  (typeof FOOD_PHYSICAL_INVENTORY_CORRECTION_DIRECTIONS)[number];

export type FoodPhysicalInventoryCorrectionBatchAllocation = Readonly<{
  batch: Readonly<{ id: FoodProductionBatchId; version: number }>;
  packageCount: number;
}>;

export type FoodExactBatchPhysicalInventoryCorrectionPlan = Readonly<{
  kind: typeof FOOD_EXACT_BATCH_PHYSICAL_INVENTORY_CORRECTION_ALLOCATION_KIND;
  sku: Readonly<{ id: FoodSkuId; version: number }>;
  proposedMovementType: FoodPhysicalInventoryCorrectionDirection;
  requiredPackageCount: number;
  allocations: readonly FoodPhysicalInventoryCorrectionBatchAllocation[];
  reconciliation: FoodExactSkuPhysicalInventoryReconciliation;
}>;

export type FoodExactBatchPhysicalInventoryCorrectionAllocationResult =
  | Readonly<{
      outcome: "no-correction-required";
      reconciliation: FoodExactSkuPhysicalInventoryReconciliation;
    }>
  | Readonly<{
      outcome: "allocated";
      value: FoodExactBatchPhysicalInventoryCorrectionPlan;
    }>;

type ExactBatch = Readonly<{
  id: FoodProductionBatchId;
  version: number;
}>;

function record(
  input: unknown,
  label: string,
): Record<PropertyKey, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError(`${label} must be an object`);
  }
  return input as Record<PropertyKey, unknown>;
}

function exactKeys(
  input: Record<PropertyKey, unknown>,
  expected: readonly string[],
  label: string,
): void {
  const names = Object.getOwnPropertyNames(input);
  const symbols = Object.getOwnPropertySymbols(input);

  if (
    symbols.length !== 0
    || names.length !== expected.length
    || expected.some((key) => !Object.prototype.hasOwnProperty.call(input, key))
    || names.some((key) => !expected.includes(key))
  ) {
    throw new TypeError(`${label} has invalid fields`);
  }
}

function positiveSafeInteger(
  input: unknown,
  label: string,
): number {
  if (
    typeof input !== "number"
    || !Number.isSafeInteger(input)
    || input <= 0
  ) {
    throw new TypeError(`${label} must be a positive safe integer`);
  }
  return input;
}

function exactBatch(
  input: unknown,
  label: string,
): ExactBatch {
  const value = record(input, label);
  exactKeys(value, ["id", "version"], label);

  return Object.freeze({
    id: parseFoodProductionBatchId(value.id),
    version: positiveSafeInteger(value.version, `${label} version`),
  });
}

function batchKey(batch: ExactBatch): string {
  return JSON.stringify([batch.id, batch.version]);
}

function sameSku(
  left: Readonly<{ id: FoodSkuId; version: number }>,
  right: Readonly<{ id: FoodSkuId; version: number }>,
): boolean {
  return left.id === right.id && left.version === right.version;
}

function canonicalReconciliation(
  input: unknown,
): FoodExactSkuPhysicalInventoryReconciliation {
  const value = record(input, "FOOD-006R reconciliation");

  exactKeys(
    value,
    [
      "kind",
      "sku",
      "status",
      "countedPackageCount",
      "recordedPackageBalance",
      "variancePackageCount",
      "countObservation",
      "recordedBalanceValidation",
    ],
    "FOOD-006R reconciliation",
  );

  if (
    value.kind !==
    FOOD_EXACT_SKU_PHYSICAL_INVENTORY_RECONCILIATION_KIND
  ) {
    throw new TypeError("Wrong FOOD-006R reconciliation kind");
  }

  const canonical = reconcileFoodExactSkuPhysicalInventory(
    Object.freeze({
      outcome: "validated" as const,
      value: value.recordedBalanceValidation,
    }),
    value.countObservation,
  );

  const suppliedSku = record(value.sku, "FOOD-006R reconciliation SKU");
  exactKeys(
    suppliedSku,
    ["id", "version"],
    "FOOD-006R reconciliation SKU",
  );

  if (
    suppliedSku.id !== canonical.sku.id
    || suppliedSku.version !== canonical.sku.version
    || value.status !== canonical.status
    || value.countedPackageCount !== canonical.countedPackageCount
    || value.recordedPackageBalance !== canonical.recordedPackageBalance
    || value.variancePackageCount !== canonical.variancePackageCount
  ) {
    throw new TypeError("FOOD-006R reconciliation invariant mismatch");
  }

  return canonical;
}

function eligibleBatches(
  reconciliation: FoodExactSkuPhysicalInventoryReconciliation,
): ReadonlyMap<string, ExactBatch> {
  const batches =
    reconciliation
      .recordedBalanceValidation
      .composition
      .recordedBalance
      .batches;

  if (!Array.isArray(batches)) {
    throw new TypeError("FOOD-006P recorded batch composition is invalid");
  }

  const eligible = new Map<string, ExactBatch>();

  for (const entryInput of batches) {
    const entry = record(
      entryInput,
      "FOOD-006P recorded batch composition entry",
    );

    const batch = exactBatch(
      entry.batch,
      "FOOD-006P recorded batch reference",
    );

    const recordedBalance = record(
      entry.recordedBalance,
      "FOOD-006P per-batch recorded balance",
    );

    const recordedBatch = exactBatch(
      recordedBalance.batch,
      "FOOD-006P per-batch balance reference",
    );

    const recordedSku = record(
      recordedBalance.sku,
      "FOOD-006P per-batch balance SKU",
    );

    exactKeys(
      recordedSku,
      ["id", "version"],
      "FOOD-006P per-batch balance SKU",
    );

    if (
      batch.id !== recordedBatch.id
      || batch.version !== recordedBatch.version
      || !sameSku(
        reconciliation.sku,
        recordedSku as Readonly<{ id: FoodSkuId; version: number }>,
      )
    ) {
      throw new TypeError("FOOD-006P recorded batch provenance mismatch");
    }

    const key = batchKey(batch);
    if (eligible.has(key)) {
      throw new TypeError("Duplicate exact batch in recorded composition");
    }

    eligible.set(key, batch);
  }

  return eligible;
}

function compareAllocations(
  left: FoodPhysicalInventoryCorrectionBatchAllocation,
  right: FoodPhysicalInventoryCorrectionBatchAllocation,
): number {
  if (left.batch.id < right.batch.id) return -1;
  if (left.batch.id > right.batch.id) return 1;
  return left.batch.version - right.batch.version;
}

export function allocateFoodExactBatchPhysicalInventoryCorrection(
  reconciliationInput: unknown,
  allocationsInput: unknown,
): FoodExactBatchPhysicalInventoryCorrectionAllocationResult {
  const reconciliation = canonicalReconciliation(reconciliationInput);

  if (!Array.isArray(allocationsInput)) {
    throw new TypeError("Correction allocations must be an array");
  }

  if (reconciliation.variancePackageCount === 0) {
    if (allocationsInput.length !== 0) {
      throw new TypeError("Agreement requires zero correction allocations");
    }

    return Object.freeze({
      outcome: "no-correction-required" as const,
      reconciliation,
    });
  }

  if (allocationsInput.length === 0) {
    throw new TypeError("Nonzero reconciliation requires correction allocation");
  }

  const eligible = eligibleBatches(reconciliation);
  const seen = new Set<string>();
  const allocations: FoodPhysicalInventoryCorrectionBatchAllocation[] = [];
  let allocatedTotal = 0n;

  for (const allocationInput of allocationsInput) {
    const allocation = record(
      allocationInput,
      "Correction batch allocation",
    );

    exactKeys(
      allocation,
      ["batch", "packageCount"],
      "Correction batch allocation",
    );

    const batch = exactBatch(
      allocation.batch,
      "Correction allocation batch",
    );

    const key = batchKey(batch);

    if (seen.has(key)) {
      throw new TypeError("Duplicate correction allocation batch");
    }
    seen.add(key);

    const canonicalBatch = eligible.get(key);
    if (!canonicalBatch) {
      throw new TypeError(
        "Correction allocation must reference an exact batch from FOOD-006P composition",
      );
    }

    const packageCount = positiveSafeInteger(
      allocation.packageCount,
      "Correction allocation packageCount",
    );

    allocatedTotal += BigInt(packageCount);

    allocations.push(
      Object.freeze({
        batch: Object.freeze({
          id: canonicalBatch.id,
          version: canonicalBatch.version,
        }),
        packageCount,
      }),
    );
  }

  const signedVariance = BigInt(reconciliation.variancePackageCount);
  const requiredTotal =
    signedVariance < 0n ? -signedVariance : signedVariance;

  if (allocatedTotal !== requiredTotal) {
    throw new TypeError(
      "Correction allocations must exactly equal absolute reconciliation variance",
    );
  }

  allocations.sort(compareAllocations);

  const proposedMovementType: FoodPhysicalInventoryCorrectionDirection =
    reconciliation.variancePackageCount > 0
      ? "adjustment-in"
      : "adjustment-out";

  return Object.freeze({
    outcome: "allocated" as const,
    value: Object.freeze({
      kind:
        FOOD_EXACT_BATCH_PHYSICAL_INVENTORY_CORRECTION_ALLOCATION_KIND,
      sku: Object.freeze({
        id: reconciliation.sku.id,
        version: reconciliation.sku.version,
      }),
      proposedMovementType,
      requiredPackageCount: Number(requiredTotal),
      allocations: Object.freeze([...allocations]),
      reconciliation,
    }),
  });
}
