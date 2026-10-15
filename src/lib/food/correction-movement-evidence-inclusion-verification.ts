/**
 * FOOD-006W: pure correction-movement evidence-inclusion verification.
 *
 * FOOD-006V already retains the fresh FOOD-006P validated recorded-balance
 * composition. FOOD-006M preserves bounded physical-movement provenance as
 * exact movementId + evidenceSequence within each exact batch.
 *
 * FOOD-006W therefore performs no database read. It revalidates the 006V
 * result and proves that every canonical correction movement from the
 * completed 006U bundle is represented in the exact bounded composition, on
 * its exact batch, with evidenceSequence <= the validated cutoff.
 *
 * This does not establish fresh physical truth, absence of later events,
 * continued currentness, current QOH, availability, capacity, reservation,
 * checkout, payment, fulfillment, accounting or rewards authority.
 */

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
  type FoodPhysicalInventoryMovement,
  type FoodPhysicalInventoryMovementId,
} from "./physical-inventory-movement-domain";
import type {
  FoodPostCorrectionAuthoritativeBookkeepingVerificationResult,
} from "./post-correction-authoritative-bookkeeping-verification";

type Verified006V = Extract<
  FoodPostCorrectionAuthoritativeBookkeepingVerificationResult,
  Readonly<{ outcome: "verified" }>
>;

export type FoodCorrectionMovementEvidenceInclusion = Readonly<{
  index: number;
  movementId: FoodPhysicalInventoryMovementId;
  batch: FoodPhysicalInventoryMovement["batch"];
  evidenceSequence: number;
}>;

export type FoodCorrectionMovementMissingEvidence = Readonly<{
  index: number;
  movementId: FoodPhysicalInventoryMovementId;
  batch: FoodPhysicalInventoryMovement["batch"];
}>;

export type FoodCorrectionMovementEvidenceInclusionVerificationResult =
  | Readonly<{
      outcome: "invalid";
    }>
  | Readonly<{
      outcome: "ineligible";
      upstreamOutcome:
        | "invalid"
        | "ineligible"
        | "stale"
        | "not-found"
        | "storage-failure";
    }>
  | Readonly<{
      outcome: "no-correction-required";
      reconciliation: FoodExactSkuPhysicalInventoryReconciliation;
    }>
  | Readonly<{
      outcome: "missing-evidence";
      sku: FoodPhysicalInventoryCorrectionMovementCandidateBundle["sku"];
      cutoff: number;
      inclusions: readonly FoodCorrectionMovementEvidenceInclusion[];
      missing: readonly FoodCorrectionMovementMissingEvidence[];
      postCorrectionVerification: Verified006V;
    }>
  | Readonly<{
      outcome: "verified";
      sku: FoodPhysicalInventoryCorrectionMovementCandidateBundle["sku"];
      cutoff: number;
      inclusions: readonly FoodCorrectionMovementEvidenceInclusion[];
      postCorrectionVerification: Verified006V;
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

function safeSequence(input: unknown, label: string): number {
  if (
    typeof input !== "number"
    || !Number.isSafeInteger(input)
    || input < 1
  ) {
    throw new TypeError(`${label} must be a positive safe integer`);
  }

  return input;
}

function safeHead(input: unknown, label: string): number {
  if (
    typeof input !== "number"
    || !Number.isSafeInteger(input)
    || input < 0
  ) {
    throw new TypeError(`${label} must be a nonnegative safe integer`);
  }

  return input;
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

function canonicalVerified006V(input: unknown): Verified006V {
  const outer = record(input, "FOOD-006V verified result");

  exactKeys(
    outer,
    [
      "outcome",
      "candidateBundle",
      "originalReconciliation",
      "recordedBalanceValidation",
      "bookkeepingReconciliation",
    ],
    "FOOD-006V verified result",
  );

  if (outer.outcome !== "verified") {
    throw new TypeError("Expected FOOD-006V verified result");
  }

  const candidateBundle = canonicalCandidateBundle(
    outer.candidateBundle,
  );

  const originalReconciliation =
    candidateBundle.allocationPlan.reconciliation;

  if (!sameJson(outer.originalReconciliation, originalReconciliation)) {
    throw new TypeError("FOOD-006V original reconciliation mismatch");
  }

  const bookkeepingReconciliation =
    reconcileFoodExactSkuPhysicalInventory(
      {
        outcome: "validated",
        value: outer.recordedBalanceValidation,
      },
      originalReconciliation.countObservation,
    );

  if (
    !sameJson(
      outer.bookkeepingReconciliation,
      bookkeepingReconciliation,
    )
  ) {
    throw new TypeError("FOOD-006V bookkeeping reconciliation mismatch");
  }

  if (
    !sameJson(
      outer.recordedBalanceValidation,
      bookkeepingReconciliation.recordedBalanceValidation,
    )
  ) {
    throw new TypeError("FOOD-006V recorded-balance provenance mismatch");
  }

  return Object.freeze({
    outcome: "verified" as const,
    candidateBundle,
    originalReconciliation,
    recordedBalanceValidation:
      bookkeepingReconciliation.recordedBalanceValidation,
    bookkeepingReconciliation,
  });
}

function canonicalNoCorrection(
  input: Record<PropertyKey, unknown>,
): FoodExactSkuPhysicalInventoryReconciliation {
  exactKeys(
    input,
    ["outcome", "reconciliation"],
    "FOOD-006V no-correction result",
  );

  const reconciliationInput = record(
    input.reconciliation,
    "FOOD-006R reconciliation",
  );

  const countObservation = reconciliationInput.countObservation;
  const recordedBalanceValidation =
    reconciliationInput.recordedBalanceValidation;

  const canonical = reconcileFoodExactSkuPhysicalInventory(
    {
      outcome: "validated",
      value: recordedBalanceValidation,
    },
    countObservation,
  );

  if (
    canonical.status !== "agreement"
    || canonical.variancePackageCount !== 0
    || !sameJson(input.reconciliation, canonical)
  ) {
    throw new TypeError("FOOD-006V no-correction invariant mismatch");
  }

  return canonical;
}

function knownIneligible(
  outer: Record<PropertyKey, unknown>,
):
  | "invalid"
  | "ineligible"
  | "stale"
  | "not-found"
  | "storage-failure"
  | null {
  if (outer.outcome === "invalid") {
    exactKeys(outer, ["outcome"], "FOOD-006V invalid result");
    return "invalid";
  }

  if (outer.outcome === "ineligible") {
    exactKeys(
      outer,
      ["outcome", "upstreamOutcome"],
      "FOOD-006V ineligible result",
    );

    if (
      outer.upstreamOutcome !== "blocked"
      && outer.upstreamOutcome !== "invalid"
    ) {
      throw new TypeError("Invalid FOOD-006V upstream outcome");
    }

    return "ineligible";
  }

  if (outer.outcome === "stale") {
    exactKeys(
      outer,
      ["outcome", "exactSkuEvidenceHead"],
      "FOOD-006V stale result",
    );

    safeHead(
      outer.exactSkuEvidenceHead,
      "FOOD-006V stale exact-SKU evidence head",
    );

    return "stale";
  }

  if (outer.outcome === "not-found") {
    exactKeys(outer, ["outcome"], "FOOD-006V not-found result");
    return "not-found";
  }

  if (outer.outcome === "storage-failure") {
    exactKeys(
      outer,
      ["outcome"],
      "FOOD-006V storage-failure result",
    );
    return "storage-failure";
  }

  return null;
}

export function verifyFoodCorrectionMovementEvidenceInclusion(
  postCorrectionVerificationInput: unknown,
): FoodCorrectionMovementEvidenceInclusionVerificationResult {
  let outer: Record<PropertyKey, unknown>;

  try {
    outer = record(
      postCorrectionVerificationInput,
      "FOOD-006V result",
    );

    if (outer.outcome === "no-correction-required") {
      const reconciliation = canonicalNoCorrection(outer);

      return Object.freeze({
        outcome: "no-correction-required" as const,
        reconciliation,
      });
    }

    const ineligible = knownIneligible(outer);

    if (ineligible !== null) {
      return Object.freeze({
        outcome: "ineligible" as const,
        upstreamOutcome: ineligible,
      });
    }
  } catch {
    return Object.freeze({ outcome: "invalid" as const });
  }

  let verification: Verified006V;

  try {
    verification = canonicalVerified006V(outer);
  } catch {
    return Object.freeze({ outcome: "invalid" as const });
  }

  const candidateBundle = verification.candidateBundle;
  const recordedBalanceValidation =
    verification.recordedBalanceValidation;
  const recordedBalance =
    recordedBalanceValidation.composition.recordedBalance;
  const cutoff = safeHead(
    recordedBalanceValidation.composition.acquisition
      .exactSkuEvidenceHead,
    "FOOD-006W validated cutoff",
  );

  if (recordedBalance.cutoff !== cutoff) {
    return Object.freeze({ outcome: "invalid" as const });
  }

  const references = new Map<
    FoodPhysicalInventoryMovementId,
    Readonly<{
      evidenceSequence: number;
      batch: FoodPhysicalInventoryMovement["batch"];
    }>
  >();

  try {
    for (const batch of recordedBalance.batches) {
      for (const movement of batch.movements) {
        const sequence = safeSequence(
          movement.evidenceSequence,
          "FOOD-006W movement evidence sequence",
        );

        if (sequence > cutoff) {
          throw new TypeError(
            "Bounded movement evidence exceeds validated cutoff",
          );
        }

        if (references.has(movement.movementId)) {
          throw new TypeError("Duplicate movement evidence identity");
        }

        references.set(
          movement.movementId,
          Object.freeze({
            evidenceSequence: sequence,
            batch: Object.freeze({
              id: batch.batch.id,
              version: batch.batch.version,
            }),
          }),
        );
      }
    }
  } catch {
    return Object.freeze({ outcome: "invalid" as const });
  }

  const inclusions: FoodCorrectionMovementEvidenceInclusion[] = [];
  const missing: FoodCorrectionMovementMissingEvidence[] = [];

  for (
    let index = 0;
    index < candidateBundle.movements.length;
    index += 1
  ) {
    const movement = candidateBundle.movements[index];

    if (movement === undefined) {
      return Object.freeze({ outcome: "invalid" as const });
    }

    const reference = references.get(movement.id);

    if (reference === undefined) {
      missing.push(
        Object.freeze({
          index,
          movementId: movement.id,
          batch: Object.freeze({
            id: movement.batch.id,
            version: movement.batch.version,
          }),
        }),
      );

      continue;
    }

    if (
      reference.batch.id !== movement.batch.id
      || reference.batch.version !== movement.batch.version
    ) {
      return Object.freeze({ outcome: "invalid" as const });
    }

    inclusions.push(
      Object.freeze({
        index,
        movementId: movement.id,
        batch: Object.freeze({
          id: movement.batch.id,
          version: movement.batch.version,
        }),
        evidenceSequence: reference.evidenceSequence,
      }),
    );
  }

  const sku = Object.freeze({
    id: candidateBundle.sku.id,
    version: candidateBundle.sku.version,
  });

  if (missing.length !== 0) {
    return Object.freeze({
      outcome: "missing-evidence" as const,
      sku,
      cutoff,
      inclusions: Object.freeze([...inclusions]),
      missing: Object.freeze([...missing]),
      postCorrectionVerification: verification,
    });
  }

  return Object.freeze({
    outcome: "verified" as const,
    sku,
    cutoff,
    inclusions: Object.freeze([...inclusions]),
    postCorrectionVerification: verification,
  });
}
