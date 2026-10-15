/**
 * FOOD-006Z: pure age-policy validation of retained physical-count metadata.
 * Fresh means age <= the explicit allowance at the supplied reference instant.
 * It proves no physical truth, current QOH, continued currentness, capacity,
 * availability, reservation, orderability, checkout or payment authority.
 */
import {
  validateFoodExactSkuPhysicalCountObservation,
  type FoodExactSkuPhysicalCountObservation,
} from "./exact-sku-physical-count-observation-domain";
import {
  classifyFoodPostCorrectionRecordedBalanceConvergence,
} from "./post-correction-recorded-balance-convergence";
import type {
  FoodContinuedRecordedInventoryEvidenceFreshnessResult,
} from "./continued-recorded-evidence-freshness-validation";

type CheckedEvidence = Extract<
  FoodContinuedRecordedInventoryEvidenceFreshnessResult,
  { outcome: "validated" | "stale" }
>;
type ValidatedEvidence = CheckedEvidence & Readonly<{ outcome: "validated" }>;

export interface FoodExactSkuPhysicalCountObservationFreshnessRequest {
  readonly freshnessValidationInput: FoodContinuedRecordedInventoryEvidenceFreshnessResult;
  readonly referenceTime: string;
  readonly maxObservationAgeSeconds: number;
}

type Timing = Readonly<{
  sku: FoodExactSkuPhysicalCountObservation["sku"];
  referenceTime: string;
  maxObservationAgeSeconds: number;
  observationAgeSeconds: number;
  physicalCountObservation: FoodExactSkuPhysicalCountObservation;
  upstreamEvidenceFreshnessValidation: ValidatedEvidence;
}>;

export type FoodExactSkuPhysicalCountObservationFreshnessResult =
  | Readonly<{ outcome: "invalid" }>
  | Readonly<{
      outcome: "ineligible";
      upstreamOutcome: "invalid" | "ineligible" | "stale" | "storage-failure";
    }>
  | (Timing & Readonly<{ outcome: "fresh" | "stale" }>);

// Y's pure snapshot helper is private. Keep this local to the retained-result
// boundary; reject hidden fields/hooks instead of losing them in a JSON clone.
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
      throw new TypeError("Expected enumerable canonical fields");
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

function record(input: unknown, keys: readonly string[]): Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Expected canonical result object");
  }
  const value = input as Record<string, unknown>;
  const own = Reflect.ownKeys(value);
  if (own.length !== keys.length || own.some((key) => typeof key !== "string" || !keys.includes(key))) {
    throw new TypeError("Unexpected canonical fields");
  }
  return value;
}

function nonnegativeSafeInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new TypeError("Expected nonnegative safe integer");
  }
  return value;
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function canonicalEvidence(input: unknown): FoodContinuedRecordedInventoryEvidenceFreshnessResult {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Expected FOOD-006Y result");
  }
  const outcome = (input as Record<string, unknown>).outcome;
  if (outcome === "invalid" || outcome === "storage-failure") {
    record(input, ["outcome"]);
    return { outcome };
  }
  if (outcome === "ineligible") {
    const supplied = record(input, ["outcome", "upstreamOutcome"]);
    const upstreamOutcome = supplied.upstreamOutcome;
    if (upstreamOutcome !== "invalid" && upstreamOutcome !== "ineligible"
      && upstreamOutcome !== "no-correction-required" && upstreamOutcome !== "not-converged") {
      throw new TypeError("Invalid FOOD-006Y upstream outcome");
    }
    return { outcome, upstreamOutcome };
  }
  if (outcome !== "validated" && outcome !== "stale") {
    throw new TypeError("Unknown FOOD-006Y outcome");
  }
  const supplied = record(input, ["outcome", "sku", "convergenceCutoff", "laterExactSkuEvidenceHead", "convergence", "laterHeadAcquisition"]);
  const convergenceInput = record(supplied.convergence, [
    "outcome", "sku", "cutoff", "countedPackageCount", "recordedPackageBalance",
    "variancePackageCount", "inclusions", "correctionInclusionVerification",
  ]);
  const convergence = classifyFoodPostCorrectionRecordedBalanceConvergence(
    convergenceInput.correctionInclusionVerification,
  );
  if (convergence.outcome !== "converged" || !sameJson(convergence, convergenceInput)) {
    throw new TypeError("Noncanonical FOOD-006X convergence");
  }
  const acquired = record(supplied.laterHeadAcquisition, ["outcome", "value"]);
  const later = record(acquired.value, ["sku", "exactSkuEvidenceHead", "bookmark"]);
  const head = nonnegativeSafeInteger(later.exactSkuEvidenceHead);
  if (acquired.outcome !== "acquired" || !sameJson(later.sku, convergence.sku)
    || typeof later.bookmark !== "string" || later.bookmark.length === 0
    || head < convergence.cutoff) {
    throw new TypeError("Invalid retained FOOD-006N1 acquisition");
  }
  // Replay only Y's stored envelope/head relation; never acquire another head.
  const canonical: CheckedEvidence = {
    outcome: head === convergence.cutoff ? "validated" : "stale",
    sku: convergence.sku,
    convergenceCutoff: convergence.cutoff,
    laterExactSkuEvidenceHead: head,
    convergence,
    laterHeadAcquisition: {
      outcome: "acquired",
      value: { sku: convergence.sku, exactSkuEvidenceHead: head, bookmark: later.bookmark },
    },
  };
  if (!sameJson(canonical, supplied)) throw new TypeError("FOOD-006Y provenance mismatch");
  return canonical;
}

function freeze<T>(input: T): T {
  if (input !== null && typeof input === "object") {
    Object.values(input).forEach(freeze);
    Object.freeze(input);
  }
  return input;
}

export function validateFoodExactSkuPhysicalCountObservationFreshness(
  input: unknown,
): FoodExactSkuPhysicalCountObservationFreshnessResult {
  try {
    const request = record(snapshot(input), ["freshnessValidationInput", "referenceTime", "maxObservationAgeSeconds"]);
    const upstream = canonicalEvidence(request.freshnessValidationInput);
    if (upstream.outcome !== "validated") {
      return Object.freeze({ outcome: "ineligible" as const, upstreamOutcome: upstream.outcome });
    }
    const physicalCountObservation = validateFoodExactSkuPhysicalCountObservation(
      upstream.convergence.correctionInclusionVerification.postCorrectionVerification
        .bookkeepingReconciliation.countObservation,
    );
    // Q's calendar parser is private. Reuse its exact rules on the explicit
    // reference field without emitting or substituting a new count observation.
    const referenceTime = validateFoodExactSkuPhysicalCountObservation({
      ...physicalCountObservation,
      observedAt: request.referenceTime,
    }).observedAt;
    const maxObservationAgeSeconds = nonnegativeSafeInteger(request.maxObservationAgeSeconds);
    // Parsing already validated UTC-second instants reads no clock. Years
    // 0001..9999 and their differences fit exactly in safe integer seconds.
    const observationAgeSeconds = (Date.parse(referenceTime) - Date.parse(physicalCountObservation.observedAt)) / 1000;
    nonnegativeSafeInteger(observationAgeSeconds);
    return freeze({
      outcome: observationAgeSeconds <= maxObservationAgeSeconds ? "fresh" as const : "stale" as const,
      sku: physicalCountObservation.sku,
      referenceTime,
      maxObservationAgeSeconds,
      observationAgeSeconds,
      physicalCountObservation,
      upstreamEvidenceFreshnessValidation: upstream as ValidatedEvidence,
    });
  } catch {
    return Object.freeze({ outcome: "invalid" as const });
  }
}
