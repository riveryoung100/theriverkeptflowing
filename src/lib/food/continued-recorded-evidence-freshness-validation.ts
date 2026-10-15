/**
 * FOOD-006Y: bounded later exact-SKU recorded-evidence head validation.
 * Validated means no later evidence sequence was observed at that head check.
 * It grants no physical truth, current QOH, perpetual currentness, availability,
 * capacity, reservation, checkout, payment, fulfillment or accounting authority.
 */
import {
  acquireFoodAuthoritativeInventoryEvidenceHead,
  type FoodAuthoritativeInventoryEvidenceHeadAcquisitionResult,
} from "./authoritative-inventory-evidence-head-acquisition";
import type { FoodAuthoritativeInventoryReadPointD1Database } from "./authoritative-inventory-read-point-validation";
import {
  classifyFoodPostCorrectionRecordedBalanceConvergence,
  type FoodPostCorrectionRecordedBalanceConvergenceResult,
} from "./post-correction-recorded-balance-convergence";

type Converged = Extract<FoodPostCorrectionRecordedBalanceConvergenceResult, { outcome: "converged" }>;
type Acquired = Extract<FoodAuthoritativeInventoryEvidenceHeadAcquisitionResult, { outcome: "acquired" }>;
type Checked = Readonly<{
  sku: Converged["sku"];
  convergenceCutoff: number;
  laterExactSkuEvidenceHead: number;
  convergence: Converged;
  laterHeadAcquisition: Acquired;
}>;

export type FoodContinuedRecordedInventoryEvidenceFreshnessResult =
  | Readonly<{ outcome: "invalid" }>
  | Readonly<{
      outcome: "ineligible";
      upstreamOutcome: "invalid" | "ineligible" | "no-correction-required" | "not-converged";
    }>
  | (Checked & Readonly<{ outcome: "validated" | "stale" }>)
  | Readonly<{ outcome: "storage-failure" }>;

// Copy only plain canonical data, without invoking getters or serialization hooks.
// This also detaches nested provenance that upstream validators may retain.
function snapshot(input: unknown, ancestors = new Set<object>()): unknown {
  if (input === null || typeof input === "string" || typeof input === "boolean") return input;
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input !== "object" || input === null || ancestors.has(input)) {
    throw new TypeError("Expected acyclic canonical data");
  }
  const array = Array.isArray(input);
  if (!array && Object.getPrototypeOf(input) !== Object.prototype && Object.getPrototypeOf(input) !== null) {
    throw new TypeError("Expected plain canonical object");
  }
  ancestors.add(input);
  const entries: [string, unknown][] = [];
  for (const key of Reflect.ownKeys(input)) {
    if (array && key === "length") continue;
    const descriptor = Object.getOwnPropertyDescriptor(input, key)!;
    if (typeof key !== "string" || !descriptor.enumerable || !("value" in descriptor)) {
      throw new TypeError("Expected enumerable canonical data fields");
    }
    entries.push([key, snapshot(descriptor.value, ancestors)]);
  }
  ancestors.delete(input);
  if (array) {
    if (entries.length !== input.length || entries.some(([key], index) => key !== String(index))) {
      throw new TypeError("Expected dense canonical array");
    }
    return entries.map(([, value]) => value);
  }
  return Object.fromEntries(entries);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): void {
  const supplied = Object.keys(value);
  if (supplied.length !== keys.length || supplied.some((key) => !keys.includes(key))) {
    throw new TypeError("Invalid FOOD-006X fields");
  }
}

function canonicalConvergence(input: unknown): FoodPostCorrectionRecordedBalanceConvergenceResult {
  const copied = snapshot(input);
  if (copied === null || typeof copied !== "object" || Array.isArray(copied)) {
    throw new TypeError("Expected FOOD-006X result");
  }
  const value = copied as Record<string, unknown>;
  if (value.outcome === "invalid") {
    exactKeys(value, ["outcome"]);
    return { outcome: "invalid" };
  }
  if (value.outcome === "ineligible") {
    exactKeys(value, ["outcome", "upstreamOutcome"]);
    const upstreamOutcome = value.upstreamOutcome;
    if (upstreamOutcome !== "invalid" && upstreamOutcome !== "ineligible" && upstreamOutcome !== "missing-evidence") {
      throw new TypeError("Invalid FOOD-006X upstream outcome");
    }
    return { outcome: "ineligible", upstreamOutcome };
  }
  let canonical: FoodPostCorrectionRecordedBalanceConvergenceResult;
  if (value.outcome === "no-correction-required") {
    exactKeys(value, ["outcome", "reconciliation"]);
    canonical = classifyFoodPostCorrectionRecordedBalanceConvergence(value);
  } else {
    exactKeys(value, ["outcome", "sku", "cutoff", "countedPackageCount", "recordedPackageBalance", "variancePackageCount", "inclusions", "correctionInclusionVerification"]);
    if (value.outcome !== "converged" && value.outcome !== "not-converged") {
      throw new TypeError("Unknown FOOD-006X outcome");
    }
    canonical = classifyFoodPostCorrectionRecordedBalanceConvergence(value.correctionInclusionVerification);
  }
  if (canonical.outcome !== value.outcome || JSON.stringify(canonical) !== JSON.stringify(value)) {
    throw new TypeError("FOOD-006X canonical provenance mismatch");
  }
  return canonical;
}

function freeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

export async function validateFoodContinuedRecordedInventoryEvidenceFreshness(
  database: FoodAuthoritativeInventoryReadPointD1Database,
  convergenceResultInput: unknown,
): Promise<FoodContinuedRecordedInventoryEvidenceFreshnessResult> {
  let convergence: FoodPostCorrectionRecordedBalanceConvergenceResult;
  try {
    convergence = freeze(canonicalConvergence(convergenceResultInput));
  } catch {
    return Object.freeze({ outcome: "invalid" as const });
  }
  if (convergence.outcome !== "converged") {
    return Object.freeze({ outcome: "ineligible" as const, upstreamOutcome: convergence.outcome });
  }
  const acquired = await acquireFoodAuthoritativeInventoryEvidenceHead(database, { sku: convergence.sku });
  if (acquired.outcome !== "acquired") {
    // A canonical selector becoming invalid is internal dependency disagreement.
    return Object.freeze({ outcome: "storage-failure" as const });
  }
  const later = acquired.value;
  if (later.sku.id !== convergence.sku.id || later.sku.version !== convergence.sku.version
    || later.exactSkuEvidenceHead < convergence.cutoff) {
    return Object.freeze({ outcome: "storage-failure" as const });
  }
  return freeze({
    outcome: later.exactSkuEvidenceHead === convergence.cutoff ? "validated" as const : "stale" as const,
    sku: convergence.sku,
    convergenceCutoff: convergence.cutoff,
    laterExactSkuEvidenceHead: later.exactSkuEvidenceHead,
    convergence,
    laterHeadAcquisition: acquired,
  });
}
