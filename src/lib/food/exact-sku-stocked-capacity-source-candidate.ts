/**
 * FOOD-007A: pure exact-SKU stocked capacity-source candidate.
 *
 * A candidate is derived only from a canonical FOOD-006Z `fresh` result.
 * The numeric value is the canonical converged recorded package balance,
 * which canonical convergence requires to equal the retained physical count.
 *
 * This is deliberately NOT current QOH, physical truth, available stock,
 * sellable stock, reservable quantity, ATP, availability, orderability,
 * reservation authority, checkout readiness or payment readiness.
 *
 * No database. No persistence. No clock. No migration.
 */

import {
  validateFoodExactSkuPhysicalCountObservationFreshness,
  type FoodExactSkuPhysicalCountObservationFreshnessResult,
} from "./exact-sku-physical-count-observation-freshness-validation";

type Timed006Z = Extract<
  FoodExactSkuPhysicalCountObservationFreshnessResult,
  Readonly<{ outcome: "fresh" | "stale" }>
>;

type Fresh006Z =
  Timed006Z &
  Readonly<{ outcome: "fresh" }>;

export type FoodExactSkuStockedCapacitySourceCandidate = Readonly<{
  kind: "exact-sku-stocked-capacity-source-candidate";
  sku: Fresh006Z["sku"];
  capacityUnits: number;
  physicalCountObservationFreshnessValidation: Fresh006Z;
}>;

export type FoodExactSkuStockedCapacitySourceCandidateResult =
  | Readonly<{ outcome: "invalid" }>
  | Readonly<{
      outcome: "ineligible";
      upstreamOutcome: "invalid" | "ineligible" | "stale" | "storage-failure";
    }>
  | Readonly<{
      outcome: "candidate";
      value: FoodExactSkuStockedCapacitySourceCandidate;
    }>;

function record(
  input: unknown,
  keys: readonly string[],
): Record<PropertyKey, unknown> {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new TypeError("Expected canonical object");
  }

  const value = input as Record<PropertyKey, unknown>;
  const ownKeys = Reflect.ownKeys(value);

  if (
    ownKeys.length !== keys.length ||
    ownKeys.some(
      (key) =>
        typeof key !== "string" ||
        !keys.includes(key),
    )
  ) {
    throw new TypeError("Unexpected canonical fields");
  }

  for (const key of keys) {
    const descriptor =
      Object.getOwnPropertyDescriptor(value, key);

    if (
      descriptor === undefined ||
      !("value" in descriptor)
    ) {
      throw new TypeError("Expected plain canonical fields");
    }
  }

  return value;
}

function snapshot(
  input: unknown,
  ancestors = new Set<object>(),
): unknown {
  if (
    input === null ||
    typeof input === "string" ||
    typeof input === "boolean"
  ) {
    return input;
  }

  if (
    typeof input === "number" &&
    Number.isFinite(input)
  ) {
    return input;
  }

  if (
    typeof input !== "object" ||
    input === null ||
    ancestors.has(input)
  ) {
    throw new TypeError("Expected finite acyclic canonical data");
  }

  ancestors.add(input);

  if (Array.isArray(input)) {
    const ownKeys = Reflect.ownKeys(input);

    if (
      ownKeys.length !== input.length + 1 ||
      ownKeys[input.length] !== "length" ||
      ownKeys
        .slice(0, input.length)
        .some(
          (key, index) =>
            typeof key !== "string" ||
            key !== String(index),
        )
    ) {
      throw new TypeError(
        "Expected dense canonical array",
      );
    }

    const values: unknown[] = [];

    for (
      let index = 0;
      index < input.length;
      index += 1
    ) {
      const descriptor =
        Object.getOwnPropertyDescriptor(
          input,
          String(index),
        );

      if (
        descriptor === undefined ||
        !("value" in descriptor)
      ) {
        throw new TypeError(
          "Expected canonical array data fields",
        );
      }

      values.push(
        snapshot(
          descriptor.value,
          ancestors,
        ),
      );
    }

    ancestors.delete(input);

    return values;
  }

  const entries: Array<[string, unknown]> = [];

  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string") {
      throw new TypeError(
        "Unexpected symbol field",
      );
    }

    const descriptor =
      Object.getOwnPropertyDescriptor(
        input,
        key,
      );

    if (
      descriptor === undefined ||
      !("value" in descriptor)
    ) {
      throw new TypeError(
        "Expected canonical fields",
      );
    }

    entries.push([
      key,
      snapshot(
        descriptor.value,
        ancestors,
      ),
    ]);
  }

  ancestors.delete(input);

  return Object.fromEntries(entries);
}

function freeze<T>(input: T): T {
  if (
    input !== null &&
    typeof input === "object"
  ) {
    for (const value of Object.values(
      input as Record<string, unknown>,
    )) {
      freeze(value);
    }

    Object.freeze(input);
  }

  return input;
}

function sameJson(
  left: unknown,
  right: unknown,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function nonnegativeSafeInteger(
  input: unknown,
): number {
  if (
    typeof input !== "number" ||
    !Number.isSafeInteger(input) ||
    input < 0
  ) {
    throw new TypeError(
      "Expected nonnegative safe integer",
    );
  }

  return input;
}

function canonical006Z(
  input: unknown,
): FoodExactSkuPhysicalCountObservationFreshnessResult {
  const supplied =
    snapshot(input) as Record<PropertyKey, unknown>;

  if (
    supplied === null ||
    typeof supplied !== "object" ||
    Array.isArray(supplied)
  ) {
    throw new TypeError("Expected FOOD-006Z result");
  }

  if (supplied.outcome === "invalid") {
    record(supplied, ["outcome"]);

    return Object.freeze({
      outcome: "invalid" as const,
    });
  }

  if (supplied.outcome === "ineligible") {
    const value = record(
      supplied,
      ["outcome", "upstreamOutcome"],
    );

    if (
      value.upstreamOutcome !== "invalid" &&
      value.upstreamOutcome !== "ineligible" &&
      value.upstreamOutcome !== "stale" &&
      value.upstreamOutcome !== "storage-failure"
    ) {
      throw new TypeError(
        "Unknown FOOD-006Z ineligible outcome",
      );
    }

    return Object.freeze({
      outcome: "ineligible" as const,
      upstreamOutcome: value.upstreamOutcome,
    });
  }

  const value = record(
    supplied,
    [
      "outcome",
      "sku",
      "referenceTime",
      "maxObservationAgeSeconds",
      "observationAgeSeconds",
      "physicalCountObservation",
      "upstreamEvidenceFreshnessValidation",
    ],
  );

  if (
    value.outcome !== "fresh" &&
    value.outcome !== "stale"
  ) {
    throw new TypeError("Unknown FOOD-006Z outcome");
  }

  const replay =
    validateFoodExactSkuPhysicalCountObservationFreshness({
      freshnessValidationInput:
        value.upstreamEvidenceFreshnessValidation,
      referenceTime: value.referenceTime,
      maxObservationAgeSeconds:
        value.maxObservationAgeSeconds,
    });

  if (
    replay.outcome !== value.outcome ||
    !sameJson(replay, value)
  ) {
    throw new TypeError(
      "FOOD-006Z canonical provenance mismatch",
    );
  }

  return replay;
}

export function deriveFoodExactSkuStockedCapacitySourceCandidate(
  input: unknown,
): FoodExactSkuStockedCapacitySourceCandidateResult {
  try {
    const canonical = canonical006Z(input);

    if (canonical.outcome === "invalid") {
      return Object.freeze({
        outcome: "ineligible" as const,
        upstreamOutcome: "invalid" as const,
      });
    }

    if (canonical.outcome === "ineligible") {
      return Object.freeze({
        outcome: "ineligible" as const,
        upstreamOutcome: canonical.upstreamOutcome,
      });
    }

    if (canonical.outcome === "stale") {
      return Object.freeze({
        outcome: "ineligible" as const,
        upstreamOutcome: "stale" as const,
      });
    }

    const convergence =
      canonical
        .upstreamEvidenceFreshnessValidation
        .convergence;

    const capacityUnits =
      nonnegativeSafeInteger(
        convergence.recordedPackageBalance,
      );

    const countedPackageCount =
      nonnegativeSafeInteger(
        convergence.countedPackageCount,
      );

    if (
      convergence.variancePackageCount !== 0 ||
      capacityUnits !== countedPackageCount
    ) {
      return Object.freeze({
        outcome: "invalid" as const,
      });
    }

    const detached =
      snapshot(canonical) as Fresh006Z;

    const candidate: FoodExactSkuStockedCapacitySourceCandidate =
      freeze({
        kind:
          "exact-sku-stocked-capacity-source-candidate" as const,
        sku: {
          id: canonical.sku.id,
          version: canonical.sku.version,
        },
        capacityUnits,
        physicalCountObservationFreshnessValidation:
          detached,
      });

    return Object.freeze({
      outcome: "candidate" as const,
      value: candidate,
    });
  } catch {
    return Object.freeze({
      outcome: "invalid" as const,
    });
  }
}
