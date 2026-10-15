/**
 * FOOD-006V: post-correction authoritative bookkeeping verification.
 *
 * A canonical completed FOOD-006U result is revalidated before database
 * access. FOOD-006V then performs one fresh canonical FOOD-006P recorded
 * balance validation and mechanically reconciles that fresh recorded balance
 * against the exact historical FOOD-006Q count observation preserved through
 * FOOD-006R -> FOOD-006S -> FOOD-006T -> FOOD-006U provenance.
 *
 * "verified" means only that a fresh authoritative recorded balance was
 * reconstructed/validated and compared mechanically with the historical
 * count. It does not prove movement inclusion, a new physical count, count
 * truth, current QOH, continued currentness, availability or reservation.
 */

import {
  validateFoodAuthoritativeRecordedInventoryBalanceAtReadPoint,
  type FoodAuthoritativeRecordedInventoryBalanceReadPointValidationResult,
} from "./authoritative-recorded-inventory-balance-read-point-validation";
import type {
  FoodAuthoritativeInventoryReadPointD1Database,
} from "./authoritative-inventory-read-point-validation";
import {
  reconcileFoodExactSkuPhysicalInventory,
  type FoodExactSkuPhysicalInventoryReconciliation,
} from "./exact-sku-physical-inventory-reconciliation-domain";
import {
  FOOD_PHYSICAL_INVENTORY_CORRECTION_MOVEMENT_CANDIDATE_BUNDLE_KIND,
  deriveFoodPhysicalInventoryCorrectionMovementCandidates,
  type FoodPhysicalInventoryCorrectionMovementCandidateBundle,
} from "./physical-inventory-correction-movement-candidates";
import {
  validateFoodPhysicalInventoryMovement,
} from "./physical-inventory-movement-domain";

type ValidatedRecordedBalance = Extract<
  FoodAuthoritativeRecordedInventoryBalanceReadPointValidationResult,
  Readonly<{ outcome: "validated" }>
>;

export type FoodPostCorrectionAuthoritativeBookkeepingVerificationResult =
  | Readonly<{
      outcome: "invalid";
    }>
  | Readonly<{
      outcome: "ineligible";
      upstreamOutcome: "blocked" | "invalid";
    }>
  | Readonly<{
      outcome: "no-correction-required";
      reconciliation: FoodExactSkuPhysicalInventoryReconciliation;
    }>
  | Readonly<{
      outcome: "stale";
      exactSkuEvidenceHead: number;
    }>
  | Readonly<{
      outcome: "not-found";
    }>
  | Readonly<{
      outcome: "storage-failure";
    }>
  | Readonly<{
      outcome: "verified";
      candidateBundle: FoodPhysicalInventoryCorrectionMovementCandidateBundle;
      originalReconciliation: FoodExactSkuPhysicalInventoryReconciliation;
      recordedBalanceValidation: ValidatedRecordedBalance["value"];
      bookkeepingReconciliation: FoodExactSkuPhysicalInventoryReconciliation;
    }>;

type CanonicalInput =
  | Readonly<{
      kind: "no-correction";
      reconciliation: FoodExactSkuPhysicalInventoryReconciliation;
    }>
  | Readonly<{
      kind: "completed";
      candidateBundle: FoodPhysicalInventoryCorrectionMovementCandidateBundle;
    }>
  | Readonly<{
      kind: "ineligible";
      upstreamOutcome: "blocked" | "invalid";
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

function canonicalCandidateBundle(
  input: unknown,
): FoodPhysicalInventoryCorrectionMovementCandidateBundle {
  const bundle = record(input, "FOOD-006T candidate bundle");

  exactKeys(
    bundle,
    ["kind", "sku", "movements", "allocationPlan"],
    "FOOD-006T candidate bundle",
  );

  if (
    bundle.kind !==
    FOOD_PHYSICAL_INVENTORY_CORRECTION_MOVEMENT_CANDIDATE_BUNDLE_KIND
  ) {
    throw new TypeError("Wrong FOOD-006T candidate bundle kind");
  }

  if (!Array.isArray(bundle.movements)) {
    throw new TypeError("FOOD-006T movements must be an array");
  }

  const movements = bundle.movements.map(
    (movement) => validateFoodPhysicalInventoryMovement(movement),
  );

  const metadata = movements.map((movement) => ({
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
        value: bundle.allocationPlan,
      },
      metadata,
    );

  if (canonical.outcome !== "candidates") {
    throw new TypeError("FOOD-006T candidate bundle invariant mismatch");
  }

  if (!sameJson(bundle, canonical.value)) {
    throw new TypeError("FOOD-006T candidate bundle mismatch");
  }

  return canonical.value;
}

function canonicalNoCorrection(
  outer: Record<PropertyKey, unknown>,
): CanonicalInput {
  exactKeys(
    outer,
    ["outcome", "candidateResult"],
    "FOOD-006U no-correction result",
  );

  const candidate = record(
    outer.candidateResult,
    "FOOD-006T no-correction candidate result",
  );

  exactKeys(
    candidate,
    ["outcome", "movements", "allocationResult"],
    "FOOD-006T no-correction candidate result",
  );

  if (candidate.outcome !== "no-correction-required") {
    throw new TypeError("Wrong FOOD-006T no-correction outcome");
  }

  if (!Array.isArray(candidate.movements) || candidate.movements.length !== 0) {
    throw new TypeError("No-correction candidate must contain zero movements");
  }

  const canonical =
    deriveFoodPhysicalInventoryCorrectionMovementCandidates(
      candidate.allocationResult,
      [],
    );

  if (canonical.outcome !== "no-correction-required") {
    throw new TypeError("FOOD-006T no-correction invariant mismatch");
  }

  if (!sameJson(candidate, canonical)) {
    throw new TypeError("FOOD-006T no-correction provenance mismatch");
  }

  if (canonical.allocationResult.outcome !== "no-correction-required") {
    throw new TypeError("FOOD-006S no-correction invariant mismatch");
  }

  return Object.freeze({
    kind: "no-correction" as const,
    reconciliation: canonical.allocationResult.reconciliation,
  });
}

function canonicalCompleted(
  outer: Record<PropertyKey, unknown>,
): CanonicalInput {
  exactKeys(
    outer,
    ["outcome", "candidateBundle", "attempts"],
    "FOOD-006U completed result",
  );

  const candidateBundle = canonicalCandidateBundle(
    outer.candidateBundle,
  );

  if (!Array.isArray(outer.attempts)) {
    throw new TypeError("FOOD-006U attempts must be an array");
  }

  if (outer.attempts.length !== candidateBundle.movements.length) {
    throw new TypeError("FOOD-006U completed attempt cardinality mismatch");
  }

  for (let index = 0; index < outer.attempts.length; index += 1) {
    const attempt = record(
      outer.attempts[index],
      "FOOD-006U persistence attempt",
    );

    exactKeys(
      attempt,
      ["index", "movement", "result"],
      "FOOD-006U persistence attempt",
    );

    if (attempt.index !== index) {
      throw new TypeError("FOOD-006U attempt index mismatch");
    }

    const expectedMovement = candidateBundle.movements[index];

    if (expectedMovement === undefined) {
      throw new TypeError("Missing canonical FOOD-006T movement");
    }

    const movement = validateFoodPhysicalInventoryMovement(
      attempt.movement,
    );

    if (!sameJson(movement, expectedMovement)) {
      throw new TypeError("FOOD-006U attempt movement mismatch");
    }

    const result = record(
      attempt.result,
      "FOOD-006U persistence result",
    );

    exactKeys(
      result,
      ["outcome", "value"],
      "FOOD-006U completed persistence result",
    );

    if (
      result.outcome !== "created"
      && result.outcome !== "already-present"
    ) {
      throw new TypeError("FOOD-006U completed result contains blocker");
    }

    const persistedValue = validateFoodPhysicalInventoryMovement(
      result.value,
    );

    if (!sameJson(persistedValue, expectedMovement)) {
      throw new TypeError("FOOD-006U durable result movement mismatch");
    }
  }

  return Object.freeze({
    kind: "completed" as const,
    candidateBundle,
  });
}

function canonicalInput(input: unknown): CanonicalInput {
  const outer = record(input, "FOOD-006U persistence result");

  if (outer.outcome === "no-correction-required") {
    return canonicalNoCorrection(outer);
  }

  if (outer.outcome === "completed") {
    return canonicalCompleted(outer);
  }

  if (outer.outcome === "invalid") {
    exactKeys(
      outer,
      ["outcome"],
      "FOOD-006U invalid result",
    );

    return Object.freeze({
      kind: "ineligible" as const,
      upstreamOutcome: "invalid" as const,
    });
  }

  if (outer.outcome === "blocked") {
    exactKeys(
      outer,
      ["outcome", "candidateBundle", "attempts", "blocking", "remaining"],
      "FOOD-006U blocked result",
    );

    return Object.freeze({
      kind: "ineligible" as const,
      upstreamOutcome: "blocked" as const,
    });
  }

  throw new TypeError("Unknown FOOD-006U persistence outcome");
}

export async function verifyFoodPostCorrectionAuthoritativeBookkeeping(
  database: FoodAuthoritativeInventoryReadPointD1Database,
  persistenceResultInput: unknown,
): Promise<FoodPostCorrectionAuthoritativeBookkeepingVerificationResult> {
  let upstream: CanonicalInput;

  try {
    upstream = canonicalInput(persistenceResultInput);
  } catch {
    return Object.freeze({ outcome: "invalid" as const });
  }

  if (upstream.kind === "ineligible") {
    return Object.freeze({
      outcome: "ineligible" as const,
      upstreamOutcome: upstream.upstreamOutcome,
    });
  }

  if (upstream.kind === "no-correction") {
    return Object.freeze({
      outcome: "no-correction-required" as const,
      reconciliation: upstream.reconciliation,
    });
  }

  const candidateBundle = upstream.candidateBundle;

  const fresh =
    await validateFoodAuthoritativeRecordedInventoryBalanceAtReadPoint(
      database,
      { sku: candidateBundle.sku },
    );

  if (fresh.outcome === "stale") {
    return Object.freeze({
      outcome: "stale" as const,
      exactSkuEvidenceHead: fresh.exactSkuEvidenceHead,
    });
  }

  if (fresh.outcome === "not-found") {
    return Object.freeze({ outcome: "not-found" as const });
  }

  if (fresh.outcome !== "validated") {
    return Object.freeze({ outcome: "storage-failure" as const });
  }

  const originalReconciliation =
    candidateBundle.allocationPlan.reconciliation;

  let bookkeepingReconciliation:
    FoodExactSkuPhysicalInventoryReconciliation;

  try {
    bookkeepingReconciliation = reconcileFoodExactSkuPhysicalInventory(
      fresh,
      originalReconciliation.countObservation,
    );
  } catch {
    return Object.freeze({ outcome: "storage-failure" as const });
  }

  return Object.freeze({
    outcome: "verified" as const,
    candidateBundle,
    originalReconciliation,
    recordedBalanceValidation: fresh.value,
    bookkeepingReconciliation,
  });
}
