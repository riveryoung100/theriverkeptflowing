/**
 * FOOD-006T: pure physical inventory correction movement candidates.
 *
 * FOOD-006S provides a caller-selected exact-batch correction allocation.
 * FOOD-006T binds explicit caller movement metadata to those exact allocations
 * and delegates complete movement validation to the canonical physical
 * inventory movement domain.
 *
 * Candidate creation is not persistence. No database write, evidence-sequence
 * insertion, clock generation, batch selection, current-QOH claim,
 * availability, capacity, reservation, checkout, payment, fulfillment,
 * accounting or rewards authority is created here.
 */

import {
  FOOD_EXACT_BATCH_PHYSICAL_INVENTORY_CORRECTION_ALLOCATION_KIND,
  allocateFoodExactBatchPhysicalInventoryCorrection,
  type FoodExactBatchPhysicalInventoryCorrectionAllocationResult,
  type FoodExactBatchPhysicalInventoryCorrectionPlan,
} from "./exact-batch-physical-inventory-correction-allocation";
import {
  FOOD_PHYSICAL_INVENTORY_MOVEMENT_KIND,
  validateFoodPhysicalInventoryMovement,
  type FoodPhysicalInventoryMovement,
} from "./physical-inventory-movement-domain";
import {
  parseFoodProductionBatchId,
  type FoodProductionBatchId,
} from "./production-batch-domain";
import type { FoodSkuId } from "./package-sku-domain";

export const FOOD_PHYSICAL_INVENTORY_CORRECTION_MOVEMENT_CANDIDATE_BUNDLE_KIND =
  "food-physical-inventory-correction-movement-candidate-bundle" as const;

export type FoodPhysicalInventoryCorrectionMovementMetadata = Readonly<{
  batch: Readonly<{ id: FoodProductionBatchId; version: number }>;
  movementId: string;
  occurredOn: string;
  attribution: string;
  sourceReference: string;
}>;

export type FoodPhysicalInventoryCorrectionMovementCandidateBundle = Readonly<{
  kind: typeof FOOD_PHYSICAL_INVENTORY_CORRECTION_MOVEMENT_CANDIDATE_BUNDLE_KIND;
  sku: Readonly<{ id: FoodSkuId; version: number }>;
  movements: readonly FoodPhysicalInventoryMovement[];
  allocationPlan: FoodExactBatchPhysicalInventoryCorrectionPlan;
}>;

export type FoodPhysicalInventoryCorrectionMovementCandidateResult =
  | Readonly<{
      outcome: "no-correction-required";
      movements: readonly [];
      allocationResult: FoodExactBatchPhysicalInventoryCorrectionAllocationResult;
    }>
  | Readonly<{
      outcome: "candidates";
      value: FoodPhysicalInventoryCorrectionMovementCandidateBundle;
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

function sameBatch(left: ExactBatch, right: ExactBatch): boolean {
  return left.id === right.id && left.version === right.version;
}

function sameSku(
  left: Readonly<{ id: FoodSkuId; version: number }>,
  right: Readonly<{ id: FoodSkuId; version: number }>,
): boolean {
  return left.id === right.id && left.version === right.version;
}

function canonicalAllocationResult(
  input: unknown,
): FoodExactBatchPhysicalInventoryCorrectionAllocationResult {
  const outer = record(input, "FOOD-006S allocation result");

  if (outer.outcome === "no-correction-required") {
    exactKeys(
      outer,
      ["outcome", "reconciliation"],
      "FOOD-006S no-correction result",
    );

    const canonical = allocateFoodExactBatchPhysicalInventoryCorrection(
      outer.reconciliation,
      [],
    );

    if (canonical.outcome !== "no-correction-required") {
      throw new TypeError("FOOD-006S no-correction invariant mismatch");
    }

    return canonical;
  }

  if (outer.outcome !== "allocated") {
    throw new TypeError("Invalid FOOD-006S allocation outcome");
  }

  exactKeys(
    outer,
    ["outcome", "value"],
    "FOOD-006S allocated result",
  );

  const supplied = record(outer.value, "FOOD-006S allocation plan");
  exactKeys(
    supplied,
    [
      "kind",
      "sku",
      "proposedMovementType",
      "requiredPackageCount",
      "allocations",
      "reconciliation",
    ],
    "FOOD-006S allocation plan",
  );

  if (
    supplied.kind !==
    FOOD_EXACT_BATCH_PHYSICAL_INVENTORY_CORRECTION_ALLOCATION_KIND
  ) {
    throw new TypeError("Wrong FOOD-006S allocation kind");
  }

  const canonical = allocateFoodExactBatchPhysicalInventoryCorrection(
    supplied.reconciliation,
    supplied.allocations,
  );

  if (canonical.outcome !== "allocated") {
    throw new TypeError("FOOD-006S allocated invariant mismatch");
  }

  const plan = canonical.value;
  const suppliedSku = record(supplied.sku, "FOOD-006S allocation SKU");
  exactKeys(suppliedSku, ["id", "version"], "FOOD-006S allocation SKU");

  if (
    suppliedSku.id !== plan.sku.id
    || suppliedSku.version !== plan.sku.version
    || supplied.proposedMovementType !== plan.proposedMovementType
    || supplied.requiredPackageCount !== plan.requiredPackageCount
  ) {
    throw new TypeError("FOOD-006S allocation invariant mismatch");
  }

  if (!Array.isArray(supplied.allocations)) {
    throw new TypeError("FOOD-006S allocations must be an array");
  }

  if (supplied.allocations.length !== plan.allocations.length) {
    throw new TypeError("FOOD-006S allocation cardinality mismatch");
  }

  for (let index = 0; index < plan.allocations.length; index += 1) {
    const suppliedAllocation = record(
      supplied.allocations[index],
      "FOOD-006S supplied allocation",
    );
    exactKeys(
      suppliedAllocation,
      ["batch", "packageCount"],
      "FOOD-006S supplied allocation",
    );

    const suppliedBatch = exactBatch(
      suppliedAllocation.batch,
      "FOOD-006S supplied allocation batch",
    );
    const canonicalAllocation = plan.allocations[index];

    if (
      canonicalAllocation === undefined
      || !sameBatch(suppliedBatch, canonicalAllocation.batch)
      || suppliedAllocation.packageCount !== canonicalAllocation.packageCount
    ) {
      throw new TypeError("FOOD-006S allocation ordering/content mismatch");
    }
  }

  return canonical;
}

function metadataByBatch(
  input: unknown,
  allocationPlan: FoodExactBatchPhysicalInventoryCorrectionPlan,
): ReadonlyMap<string, Readonly<{
  batch: ExactBatch;
  movementId: unknown;
  occurredOn: unknown;
  attribution: unknown;
  sourceReference: unknown;
}>> {
  if (!Array.isArray(input)) {
    throw new TypeError("Movement candidate metadata must be an array");
  }

  if (input.length !== allocationPlan.allocations.length) {
    throw new TypeError("Movement candidate metadata cardinality mismatch");
  }

  const allowed = new Set(
    allocationPlan.allocations.map((allocation) => batchKey(allocation.batch)),
  );

  const values = new Map<string, Readonly<{
    batch: ExactBatch;
    movementId: unknown;
    occurredOn: unknown;
    attribution: unknown;
    sourceReference: unknown;
  }>>();

  for (const metadataInput of input) {
    const metadata = record(
      metadataInput,
      "Movement candidate metadata",
    );

    exactKeys(
      metadata,
      [
        "batch",
        "movementId",
        "occurredOn",
        "attribution",
        "sourceReference",
      ],
      "Movement candidate metadata",
    );

    const batch = exactBatch(
      metadata.batch,
      "Movement candidate metadata batch",
    );

    const key = batchKey(batch);

    if (!allowed.has(key)) {
      throw new TypeError(
        "Movement candidate metadata must bind an exact FOOD-006S allocation batch",
      );
    }

    if (values.has(key)) {
      throw new TypeError("Duplicate movement metadata batch");
    }

    values.set(
      key,
      Object.freeze({
        batch,
        movementId: metadata.movementId,
        occurredOn: metadata.occurredOn,
        attribution: metadata.attribution,
        sourceReference: metadata.sourceReference,
      }),
    );
  }

  return values;
}

export function deriveFoodPhysicalInventoryCorrectionMovementCandidates(
  allocationResultInput: unknown,
  metadataInput: unknown,
): FoodPhysicalInventoryCorrectionMovementCandidateResult {
  const allocationResult =
    canonicalAllocationResult(allocationResultInput);

  if (allocationResult.outcome === "no-correction-required") {
    if (!Array.isArray(metadataInput) || metadataInput.length !== 0) {
      throw new TypeError(
        "No-correction FOOD-006S result requires zero movement metadata",
      );
    }

    return Object.freeze({
      outcome: "no-correction-required" as const,
      movements: Object.freeze([]) as readonly [],
      allocationResult,
    });
  }

  const allocationPlan = allocationResult.value;
  const metadata = metadataByBatch(metadataInput, allocationPlan);
  const movementIds = new Set<string>();
  const movements: FoodPhysicalInventoryMovement[] = [];

  for (const allocation of allocationPlan.allocations) {
    const candidateMetadata = metadata.get(batchKey(allocation.batch));

    if (candidateMetadata === undefined) {
      throw new TypeError("Missing movement metadata for exact allocation batch");
    }

    const movement = validateFoodPhysicalInventoryMovement({
      kind: FOOD_PHYSICAL_INVENTORY_MOVEMENT_KIND,
      id: candidateMetadata.movementId,
      batch: allocation.batch,
      sku: allocationPlan.sku,
      movementType: allocationPlan.proposedMovementType,
      packageCount: allocation.packageCount,
      occurredOn: candidateMetadata.occurredOn,
      attribution: candidateMetadata.attribution,
      sourceReference: candidateMetadata.sourceReference,
    });

    if (
      movement.movementType !== allocationPlan.proposedMovementType
      || !sameBatch(movement.batch, allocation.batch)
      || !sameSku(movement.sku, allocationPlan.sku)
      || movement.packageCount !== allocation.packageCount
    ) {
      throw new TypeError("Canonical movement candidate invariant mismatch");
    }


    if (movementIds.has(movement.id)) {
      throw new TypeError("Duplicate physical inventory movement candidate ID");
    }
    movementIds.add(movement.id);

    movements.push(movement);
  }

  if (movements.length !== allocationPlan.allocations.length) {
    throw new TypeError("Movement candidate cardinality mismatch");
  }

  return Object.freeze({
    outcome: "candidates" as const,
    value: Object.freeze({
      kind:
        FOOD_PHYSICAL_INVENTORY_CORRECTION_MOVEMENT_CANDIDATE_BUNDLE_KIND,
      sku: Object.freeze({
        id: allocationPlan.sku.id,
        version: allocationPlan.sku.version,
      }),
      movements: Object.freeze([...movements]),
      allocationPlan,
    }),
  });
}
