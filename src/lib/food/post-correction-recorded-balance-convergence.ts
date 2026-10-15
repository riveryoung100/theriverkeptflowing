/**
 * FOOD-006X: pure post-correction recorded-balance convergence projection.
 *
 * Canonical FOOD-006W already proves every correction movement is present
 * in the validated bounded exact-SKU evidence at or before cutoff H.
 * Its retained FOOD-006V result already contains canonical FOOD-006R
 * bookkeeping reconciliation against the historical FOOD-006Q observation.
 *
 * FOOD-006X therefore performs no database read and no persistence. It
 * classifies whether the validated recorded balance at H equals that exact
 * historical caller-asserted count while preserving the inclusion proof.
 *
 * Convergence does not prove correction causality, exclusive contribution,
 * fresh physical truth, continued currentness or current QOH.
 */

import {
  reconcileFoodExactSkuPhysicalInventory,
  type FoodExactSkuPhysicalInventoryReconciliation,
} from "./exact-sku-physical-inventory-reconciliation-domain";
import {
  verifyFoodCorrectionMovementEvidenceInclusion,
  type FoodCorrectionMovementEvidenceInclusionVerificationResult,
} from "./correction-movement-evidence-inclusion-verification";

type Verified006W = Extract<
  FoodCorrectionMovementEvidenceInclusionVerificationResult,
  Readonly<{ outcome: "verified" }>
>;

type Missing006W = Extract<
  FoodCorrectionMovementEvidenceInclusionVerificationResult,
  Readonly<{ outcome: "missing-evidence" }>
>;

type ConvergenceFields = Readonly<{
  sku: Verified006W["sku"];
  cutoff: number;
  countedPackageCount: number;
  recordedPackageBalance: number;
  variancePackageCount: number;
  inclusions: Verified006W["inclusions"];
  correctionInclusionVerification: Verified006W;
}>;

export type FoodPostCorrectionRecordedBalanceConvergenceResult =
  | Readonly<{
      outcome: "invalid";
    }>
  | Readonly<{
      outcome: "ineligible";
      upstreamOutcome: "invalid" | "ineligible" | "missing-evidence";
    }>
  | Readonly<{
      outcome: "no-correction-required";
      reconciliation: FoodExactSkuPhysicalInventoryReconciliation;
    }>
  | (
      ConvergenceFields
      & Readonly<{
        outcome: "not-converged";
      }>
    )
  | (
      ConvergenceFields
      & Readonly<{
        outcome: "converged";
      }>
    );

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

function canonicalNoCorrection(
  input: Record<PropertyKey, unknown>,
): FoodExactSkuPhysicalInventoryReconciliation {
  exactKeys(
    input,
    ["outcome", "reconciliation"],
    "FOOD-006W no-correction result",
  );

  const reconciliation = record(
    input.reconciliation,
    "FOOD-006W no-correction reconciliation",
  );

  const canonical = reconcileFoodExactSkuPhysicalInventory(
    {
      outcome: "validated",
      value: reconciliation.recordedBalanceValidation,
    },
    reconciliation.countObservation,
  );

  if (
    canonical.status !== "agreement"
    || canonical.variancePackageCount !== 0
    || canonical.countedPackageCount !== canonical.recordedPackageBalance
    || !sameJson(input.reconciliation, canonical)
  ) {
    throw new TypeError("Invalid FOOD-006W no-correction result");
  }

  return canonical;
}

function canonicalVerified006W(input: unknown): Verified006W {
  const supplied = record(input, "FOOD-006W verified result");

  exactKeys(
    supplied,
    [
      "outcome",
      "sku",
      "cutoff",
      "inclusions",
      "postCorrectionVerification",
    ],
    "FOOD-006W verified result",
  );

  if (supplied.outcome !== "verified") {
    throw new TypeError("Expected FOOD-006W verified result");
  }

  const canonical =
    verifyFoodCorrectionMovementEvidenceInclusion(
      supplied.postCorrectionVerification,
    );

  if (
    canonical.outcome !== "verified"
    || !sameJson(supplied, canonical)
  ) {
    throw new TypeError("FOOD-006W verified provenance mismatch");
  }

  return canonical;
}

function canonicalMissing006W(input: unknown): Missing006W {
  const supplied = record(input, "FOOD-006W missing-evidence result");

  exactKeys(
    supplied,
    [
      "outcome",
      "sku",
      "cutoff",
      "inclusions",
      "missing",
      "postCorrectionVerification",
    ],
    "FOOD-006W missing-evidence result",
  );

  if (supplied.outcome !== "missing-evidence") {
    throw new TypeError("Expected FOOD-006W missing-evidence result");
  }

  const canonical =
    verifyFoodCorrectionMovementEvidenceInclusion(
      supplied.postCorrectionVerification,
    );

  if (
    canonical.outcome !== "missing-evidence"
    || !sameJson(supplied, canonical)
  ) {
    throw new TypeError("FOOD-006W missing-evidence provenance mismatch");
  }

  return canonical;
}

function validate006WIneligible(
  input: Record<PropertyKey, unknown>,
): void {
  exactKeys(
    input,
    ["outcome", "upstreamOutcome"],
    "FOOD-006W ineligible result",
  );

  if (
    input.upstreamOutcome !== "invalid"
    && input.upstreamOutcome !== "ineligible"
    && input.upstreamOutcome !== "stale"
    && input.upstreamOutcome !== "not-found"
    && input.upstreamOutcome !== "storage-failure"
  ) {
    throw new TypeError("Invalid FOOD-006W upstream outcome");
  }
}

export function classifyFoodPostCorrectionRecordedBalanceConvergence(
  correctionInclusionVerificationInput: unknown,
): FoodPostCorrectionRecordedBalanceConvergenceResult {
  let outer: Record<PropertyKey, unknown>;

  try {
    outer = record(
      correctionInclusionVerificationInput,
      "FOOD-006W result",
    );

    if (outer.outcome === "invalid") {
      exactKeys(outer, ["outcome"], "FOOD-006W invalid result");

      return Object.freeze({
        outcome: "ineligible" as const,
        upstreamOutcome: "invalid" as const,
      });
    }

    if (outer.outcome === "ineligible") {
      validate006WIneligible(outer);

      return Object.freeze({
        outcome: "ineligible" as const,
        upstreamOutcome: "ineligible" as const,
      });
    }

    if (outer.outcome === "no-correction-required") {
      const reconciliation = canonicalNoCorrection(outer);

      return Object.freeze({
        outcome: "no-correction-required" as const,
        reconciliation,
      });
    }

    if (outer.outcome === "missing-evidence") {
      canonicalMissing006W(outer);

      return Object.freeze({
        outcome: "ineligible" as const,
        upstreamOutcome: "missing-evidence" as const,
      });
    }
  } catch {
    return Object.freeze({ outcome: "invalid" as const });
  }

  let verification: Verified006W;

  try {
    verification = canonicalVerified006W(outer);
  } catch {
    return Object.freeze({ outcome: "invalid" as const });
  }

  const bookkeeping =
    verification.postCorrectionVerification.bookkeepingReconciliation;

  const common = {
    sku: Object.freeze({
      id: verification.sku.id,
      version: verification.sku.version,
    }),
    cutoff: verification.cutoff,
    countedPackageCount: bookkeeping.countedPackageCount,
    recordedPackageBalance: bookkeeping.recordedPackageBalance,
    variancePackageCount: bookkeeping.variancePackageCount,
    inclusions: verification.inclusions,
    correctionInclusionVerification: verification,
  };

  if (bookkeeping.status === "agreement") {
    if (
      bookkeeping.variancePackageCount !== 0
      || bookkeeping.countedPackageCount !== bookkeeping.recordedPackageBalance
    ) {
      return Object.freeze({ outcome: "invalid" as const });
    }

    return Object.freeze({
      outcome: "converged" as const,
      ...common,
    });
  }

  if (
    bookkeeping.variancePackageCount === 0
    || bookkeeping.countedPackageCount === bookkeeping.recordedPackageBalance
  ) {
    return Object.freeze({ outcome: "invalid" as const });
  }

  return Object.freeze({
    outcome: "not-converged" as const,
    ...common,
  });
}
