/**
 * FOOD-007B exact-SKU stocked capacity-source domain.
 *
 * Historical capacity-source evidence only.
 *
 * This does not establish current QOH, physical truth, available stock,
 * reservable quantity, ATP, availability, orderability or reservation
 * authority.
 */

import {
  parseFoodSkuId,
  type FoodSkuId,
} from "./package-sku-domain";

import {
  deriveFoodExactSkuStockedCapacitySourceCandidate,
  type FoodExactSkuStockedCapacitySourceCandidate,
} from "./exact-sku-stocked-capacity-source-candidate";

export const FOOD_EXACT_SKU_STOCKED_CAPACITY_SOURCE_KIND =
  "exact-sku-stocked-capacity-source" as const;

export type FoodExactSkuStockedCapacitySourceRevision = Readonly<{
  kind: typeof FOOD_EXACT_SKU_STOCKED_CAPACITY_SOURCE_KIND;
  sku: Readonly<{
    id: FoodSkuId;
    version: number;
  }>;
  revision: number;
  capacityUnits: number;
  attribution: string;
  sourceReference: string;
}>;

export type FoodExactSkuStockedCapacitySourceCandidateWriteRequest =
  Readonly<{
    candidate: FoodExactSkuStockedCapacitySourceCandidate;
    revision: number;
    attribution: string;
    sourceReference: string;
  }>;

const MAX_TEXT_LENGTH = 512;

function object(
  value: unknown,
  label: string,
): Record<PropertyKey, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new TypeError(`${label} must be an object`);
  }

  return value as Record<PropertyKey, unknown>;
}

function exactOwnKeys(
  value: Record<PropertyKey, unknown>,
  expected: readonly string[],
  label: string,
): void {
  const names = Object.getOwnPropertyNames(value);
  const symbols = Object.getOwnPropertySymbols(value);

  if (
    symbols.length !== 0 ||
    names.length !== expected.length ||
    expected.some(
      (key) =>
        !Object.prototype.hasOwnProperty.call(value, key),
    ) ||
    names.some(
      (key) =>
        !expected.includes(key),
    )
  ) {
    throw new TypeError(`${label} has invalid fields`);
  }
}

function positiveSafeInteger(
  value: unknown,
  label: string,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 1
  ) {
    throw new TypeError(
      `${label} must be a positive safe integer`,
    );
  }

  return value;
}

function nonnegativeSafeInteger(
  value: unknown,
  label: string,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new TypeError(
      `${label} must be a nonnegative safe integer`,
    );
  }

  return value;
}

function boundedText(
  value: unknown,
  label: string,
): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > MAX_TEXT_LENGTH ||
    value.trim() !== value
  ) {
    throw new TypeError(
      `${label} must be nonempty unpadded bounded text`,
    );
  }

  return value;
}

function stableValue(value: unknown): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (
      typeof value === "number" &&
      Number.isFinite(value)
    )
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(stableValue);
  }

  if (
    typeof value !== "object" ||
    value === null
  ) {
    throw new TypeError("unsupported canonical value");
  }

  const source =
    value as Record<string, unknown>;

  const result: Record<string, unknown> = {};

  for (const key of Object.keys(source).sort()) {
    result[key] =
      stableValue(source[key]);
  }

  return result;
}

function sameCanonical(
  left: unknown,
  right: unknown,
): boolean {
  return JSON.stringify(stableValue(left)) ===
    JSON.stringify(stableValue(right));
}

export function validateFoodExactSkuStockedCapacitySourceRevision(
  input: unknown,
): FoodExactSkuStockedCapacitySourceRevision {
  const value =
    object(input, "exact-SKU stocked capacity source");

  exactOwnKeys(
    value,
    [
      "kind",
      "sku",
      "revision",
      "capacityUnits",
      "attribution",
      "sourceReference",
    ],
    "exact-SKU stocked capacity source",
  );

  if (
    value.kind !==
    FOOD_EXACT_SKU_STOCKED_CAPACITY_SOURCE_KIND
  ) {
    throw new TypeError(
      "invalid exact-SKU stocked capacity-source kind",
    );
  }

  const sku =
    object(
      value.sku,
      "exact-SKU stocked capacity-source SKU",
    );

  exactOwnKeys(
    sku,
    ["id", "version"],
    "exact-SKU stocked capacity-source SKU",
  );

  return Object.freeze({
    kind:
      FOOD_EXACT_SKU_STOCKED_CAPACITY_SOURCE_KIND,

    sku: Object.freeze({
      id: parseFoodSkuId(sku.id),

      version:
        positiveSafeInteger(
          sku.version,
          "SKU version",
        ),
    }),

    revision:
      positiveSafeInteger(
        value.revision,
        "revision",
      ),

    capacityUnits:
      nonnegativeSafeInteger(
        value.capacityUnits,
        "capacityUnits",
      ),

    attribution:
      boundedText(
        value.attribution,
        "attribution",
      ),

    sourceReference:
      boundedText(
        value.sourceReference,
        "sourceReference",
      ),
  });
}

export function serializeFoodExactSkuStockedCapacitySourceRevision(
  input: unknown,
): string {
  const value =
    validateFoodExactSkuStockedCapacitySourceRevision(
      input,
    );

  return JSON.stringify({
    kind: value.kind,

    sku: {
      id: value.sku.id,
      version: value.sku.version,
    },

    revision: value.revision,
    capacityUnits: value.capacityUnits,
    attribution: value.attribution,
    sourceReference: value.sourceReference,
  });
}

export function deriveFoodExactSkuStockedCapacitySourceRevisionFromCandidate(
  input: unknown,
): FoodExactSkuStockedCapacitySourceRevision {
  const request =
    object(
      input,
      "exact-SKU capacity-source write request",
    );

  exactOwnKeys(
    request,
    [
      "candidate",
      "revision",
      "attribution",
      "sourceReference",
    ],
    "exact-SKU capacity-source write request",
  );

  const suppliedCandidate =
    object(
      request.candidate,
      "FOOD-007A capacity candidate",
    );

  exactOwnKeys(
    suppliedCandidate,
    [
      "kind",
      "sku",
      "capacityUnits",
      "physicalCountObservationFreshnessValidation",
    ],
    "FOOD-007A capacity candidate",
  );

  if (
    suppliedCandidate.kind !==
    "exact-sku-stocked-capacity-source-candidate"
  ) {
    throw new TypeError(
      "invalid FOOD-007A candidate kind",
    );
  }

  const replay =
    deriveFoodExactSkuStockedCapacitySourceCandidate(
      suppliedCandidate
        .physicalCountObservationFreshnessValidation,
    );

  if (replay.outcome !== "candidate") {
    throw new TypeError(
      "FOOD-007A candidate is not canonically eligible",
    );
  }

  if (
    !sameCanonical(
      replay.value,
      suppliedCandidate,
    )
  ) {
    throw new TypeError(
      "FOOD-007A candidate canonical replay mismatch",
    );
  }

  return validateFoodExactSkuStockedCapacitySourceRevision({
    kind:
      FOOD_EXACT_SKU_STOCKED_CAPACITY_SOURCE_KIND,

    sku: replay.value.sku,

    revision:
      request.revision,

    capacityUnits:
      replay.value.capacityUnits,

    attribution:
      request.attribution,

    sourceReference:
      request.sourceReference,
  });
}
