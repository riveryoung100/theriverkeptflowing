/**
 * FOOD-006U: sequential physical-inventory correction persistence.
 *
 * FOOD-006T creates canonical movement candidates. FOOD-006U revalidates
 * that candidate result before storage and then delegates every attempted
 * durable append to appendFoodPhysicalInventoryMovement.
 *
 * This orchestration is intentionally non-atomic. created and
 * already-present are non-blocking. conflict, invalid and storage-failure
 * stop the sequence immediately. Earlier durable success is preserved and
 * explicitly reported; remaining candidates are reported as unattempted.
 *
 * No rollback, current-QOH, continued-currentness, availability, capacity,
 * reservation, checkout, payment, fulfillment, accounting or rewards
 * authority is created here.
 */

import {
  appendFoodPhysicalInventoryMovement,
  type FoodPhysicalInventoryMovementD1Database,
  type FoodPhysicalInventoryMovementPersistenceResult,
} from "./d1-physical-inventory-movement-persistence";
import {
  FOOD_PHYSICAL_INVENTORY_CORRECTION_MOVEMENT_CANDIDATE_BUNDLE_KIND,
  deriveFoodPhysicalInventoryCorrectionMovementCandidates,
  type FoodPhysicalInventoryCorrectionMovementCandidateBundle,
  type FoodPhysicalInventoryCorrectionMovementCandidateResult,
} from "./physical-inventory-correction-movement-candidates";
import {
  validateFoodPhysicalInventoryMovement,
  type FoodPhysicalInventoryMovement,
} from "./physical-inventory-movement-domain";

type NoCorrectionCandidateResult = Extract<
  FoodPhysicalInventoryCorrectionMovementCandidateResult,
  Readonly<{ outcome: "no-correction-required" }>
>;

export type FoodPhysicalInventoryCorrectionPersistenceAttempt = Readonly<{
  index: number;
  movement: FoodPhysicalInventoryMovement;
  result: FoodPhysicalInventoryMovementPersistenceResult;
}>;

export type FoodPhysicalInventoryCorrectionUnattemptedIdentity = Readonly<{
  index: number;
  movementId: FoodPhysicalInventoryMovement["id"];
  batch: FoodPhysicalInventoryMovement["batch"];
}>;

export type FoodPhysicalInventoryCorrectionPersistenceOrchestrationResult =
  | Readonly<{
      outcome: "invalid";
    }>
  | Readonly<{
      outcome: "no-correction-required";
      candidateResult: NoCorrectionCandidateResult;
    }>
  | Readonly<{
      outcome: "completed";
      candidateBundle: FoodPhysicalInventoryCorrectionMovementCandidateBundle;
      attempts: readonly FoodPhysicalInventoryCorrectionPersistenceAttempt[];
    }>
  | Readonly<{
      outcome: "blocked";
      candidateBundle: FoodPhysicalInventoryCorrectionMovementCandidateBundle;
      attempts: readonly FoodPhysicalInventoryCorrectionPersistenceAttempt[];
      blocking: FoodPhysicalInventoryCorrectionPersistenceAttempt;
      remaining: readonly FoodPhysicalInventoryCorrectionUnattemptedIdentity[];
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
    || expected.some(
      (key) => !Object.prototype.hasOwnProperty.call(input, key),
    )
    || names.some((key) => !expected.includes(key))
  ) {
    throw new TypeError(`${label} has invalid fields`);
  }
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function canonicalCandidateResult(
  input: unknown,
): FoodPhysicalInventoryCorrectionMovementCandidateResult {
  const outer = record(input, "FOOD-006T candidate result");

  if (outer.outcome === "no-correction-required") {
    exactKeys(
      outer,
      ["outcome", "movements", "allocationResult"],
      "FOOD-006T no-correction result",
    );

    if (!Array.isArray(outer.movements) || outer.movements.length !== 0) {
      throw new TypeError(
        "FOOD-006T no-correction result must contain zero movements",
      );
    }

    const canonical =
      deriveFoodPhysicalInventoryCorrectionMovementCandidates(
        outer.allocationResult,
        [],
      );

    if (canonical.outcome !== "no-correction-required") {
      throw new TypeError("FOOD-006T no-correction invariant mismatch");
    }

    if (!sameJson(canonical.allocationResult, outer.allocationResult)) {
      throw new TypeError("FOOD-006T no-correction provenance mismatch");
    }

    return canonical;
  }

  if (outer.outcome !== "candidates") {
    throw new TypeError("Invalid FOOD-006T candidate outcome");
  }

  exactKeys(
    outer,
    ["outcome", "value"],
    "FOOD-006T candidates result",
  );

  const suppliedBundle = record(
    outer.value,
    "FOOD-006T candidate bundle",
  );

  exactKeys(
    suppliedBundle,
    ["kind", "sku", "movements", "allocationPlan"],
    "FOOD-006T candidate bundle",
  );

  if (
    suppliedBundle.kind !==
    FOOD_PHYSICAL_INVENTORY_CORRECTION_MOVEMENT_CANDIDATE_BUNDLE_KIND
  ) {
    throw new TypeError("Wrong FOOD-006T candidate bundle kind");
  }

  if (!Array.isArray(suppliedBundle.movements)) {
    throw new TypeError("FOOD-006T movements must be an array");
  }

  const suppliedSku = record(
    suppliedBundle.sku,
    "FOOD-006T candidate SKU",
  );

  exactKeys(
    suppliedSku,
    ["id", "version"],
    "FOOD-006T candidate SKU",
  );

  const suppliedMovements = suppliedBundle.movements.map(
    (movement) => validateFoodPhysicalInventoryMovement(movement),
  );

  const metadata = suppliedMovements.map((movement) => ({
    batch: movement.batch,
    movementId: movement.id,
    occurredOn: movement.occurredOn,
    attribution: movement.attribution,
    sourceReference: movement.sourceReference,
  }));

  const canonical =
    deriveFoodPhysicalInventoryCorrectionMovementCandidates(
      {
        outcome: "allocated",
        value: suppliedBundle.allocationPlan,
      },
      metadata,
    );

  if (canonical.outcome !== "candidates") {
    throw new TypeError("FOOD-006T candidate invariant mismatch");
  }

  if (
    suppliedSku.id !== canonical.value.sku.id
    || suppliedSku.version !== canonical.value.sku.version
  ) {
    throw new TypeError("FOOD-006T candidate SKU mismatch");
  }

  if (
    suppliedMovements.length !==
    canonical.value.movements.length
  ) {
    throw new TypeError("FOOD-006T candidate cardinality mismatch");
  }

  for (
    let index = 0;
    index < canonical.value.movements.length;
    index += 1
  ) {
    if (
      !sameJson(
        suppliedMovements[index],
        canonical.value.movements[index],
      )
    ) {
      throw new TypeError(
        "FOOD-006T candidate ordering/content mismatch",
      );
    }
  }

  if (
    !sameJson(
      suppliedBundle.allocationPlan,
      canonical.value.allocationPlan,
    )
  ) {
    throw new TypeError("FOOD-006T allocation provenance mismatch");
  }

  return canonical;
}

function attempt(
  index: number,
  movement: FoodPhysicalInventoryMovement,
  result: FoodPhysicalInventoryMovementPersistenceResult,
): FoodPhysicalInventoryCorrectionPersistenceAttempt {
  return Object.freeze({
    index,
    movement,
    result,
  });
}

function unattemptedIdentity(
  index: number,
  movement: FoodPhysicalInventoryMovement,
): FoodPhysicalInventoryCorrectionUnattemptedIdentity {
  return Object.freeze({
    index,
    movementId: movement.id,
    batch: Object.freeze({
      id: movement.batch.id,
      version: movement.batch.version,
    }),
  });
}

function isBlocking(
  result: FoodPhysicalInventoryMovementPersistenceResult,
): boolean {
  return (
    result.outcome === "conflict"
    || result.outcome === "invalid"
    || result.outcome === "storage-failure"
  );
}

export async function persistFoodPhysicalInventoryCorrectionCandidates(
  database: FoodPhysicalInventoryMovementD1Database,
  candidateResultInput: unknown,
): Promise<FoodPhysicalInventoryCorrectionPersistenceOrchestrationResult> {
  let candidateResult:
    FoodPhysicalInventoryCorrectionMovementCandidateResult;

  try {
    candidateResult = canonicalCandidateResult(candidateResultInput);
  } catch {
    return Object.freeze({ outcome: "invalid" as const });
  }

  if (candidateResult.outcome === "no-correction-required") {
    return Object.freeze({
      outcome: "no-correction-required" as const,
      candidateResult,
    });
  }

  const candidateBundle = candidateResult.value;
  const attempts: FoodPhysicalInventoryCorrectionPersistenceAttempt[] = [];

  for (
    let index = 0;
    index < candidateBundle.movements.length;
    index += 1
  ) {
    const movement = candidateBundle.movements[index];

    if (movement === undefined) {
      return Object.freeze({ outcome: "invalid" as const });
    }

    const persistenceResult =
      await appendFoodPhysicalInventoryMovement(database, movement);

    const currentAttempt = attempt(
      index,
      movement,
      persistenceResult,
    );

    attempts.push(currentAttempt);

    if (isBlocking(persistenceResult)) {
      const remaining = candidateBundle.movements
        .slice(index + 1)
        .map((unattempted, offset) =>
          unattemptedIdentity(
            index + 1 + offset,
            unattempted,
          ),
        );

      return Object.freeze({
        outcome: "blocked" as const,
        candidateBundle,
        attempts: Object.freeze([...attempts]),
        blocking: currentAttempt,
        remaining: Object.freeze(remaining),
      });
    }
  }

  return Object.freeze({
    outcome: "completed" as const,
    candidateBundle,
    attempts: Object.freeze([...attempts]),
  });
}
