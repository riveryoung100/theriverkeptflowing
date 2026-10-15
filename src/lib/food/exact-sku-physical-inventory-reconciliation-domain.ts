/**
 * FOOD-006R: pure exact-SKU physical inventory reconciliation projection.
 *
 * Compares one canonical FOOD-006Q caller-asserted physical count observation
 * with one canonical FOOD-006P validated recorded-balance state.
 *
 * The result is a mechanical comparison of those two evidence states only.
 * It does not authenticate the physical count, align the two observations to
 * one atomic instant, establish continued currentness/current QOH, or grant
 * availability, capacity, reservation, checkout, payment, fulfillment,
 * accounting, or rewards authority.
 */

import {
  validateFoodExactSkuPhysicalCountObservation,
  type FoodExactSkuPhysicalCountObservation,
} from "./exact-sku-physical-count-observation-domain";
import type {
  FoodAuthoritativeRecordedInventoryBalanceReadPointValidationResult,
} from "./authoritative-recorded-inventory-balance-read-point-validation";
import {
  parseFoodSkuId,
  type FoodSkuId,
} from "./package-sku-domain";

export const FOOD_EXACT_SKU_PHYSICAL_INVENTORY_RECONCILIATION_KIND =
  "food-exact-sku-physical-inventory-reconciliation" as const;

export const FOOD_EXACT_SKU_PHYSICAL_INVENTORY_RECONCILIATION_STATUSES =
  Object.freeze([
    "agreement",
    "count-over-recorded",
    "count-under-recorded",
  ] as const);

export type FoodExactSkuPhysicalInventoryReconciliationStatus =
  (typeof FOOD_EXACT_SKU_PHYSICAL_INVENTORY_RECONCILIATION_STATUSES)[number];

type FoodValidatedRecordedBalanceResult = Extract<
  FoodAuthoritativeRecordedInventoryBalanceReadPointValidationResult,
  Readonly<{ outcome: "validated" }>
>;

export type FoodExactSkuPhysicalInventoryReconciliation = Readonly<{
  kind: typeof FOOD_EXACT_SKU_PHYSICAL_INVENTORY_RECONCILIATION_KIND;
  sku: Readonly<{ id: FoodSkuId; version: number }>;
  status: FoodExactSkuPhysicalInventoryReconciliationStatus;
  countedPackageCount: number;
  recordedPackageBalance: number;
  variancePackageCount: number;
  countObservation: FoodExactSkuPhysicalCountObservation;
  recordedBalanceValidation: FoodValidatedRecordedBalanceResult["value"];
}>;

type ExactSku = Readonly<{ id: FoodSkuId; version: number }>;

function object(value: unknown, label: string): Record<PropertyKey, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
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
    symbols.length !== 0
    || names.length !== expected.length
    || expected.some((key) => !Object.prototype.hasOwnProperty.call(value, key))
    || names.some((key) => !expected.includes(key))
  ) {
    throw new TypeError(`${label} has invalid fields`);
  }
}

function positiveSafeInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${label} must be a positive safe integer`);
  }
  return value;
}

function nonnegativeSafeInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${label} must be a nonnegative safe integer`);
  }
  return value;
}

function signedSafeInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new TypeError(`${label} must be a signed safe integer`);
  }
  return value;
}

function exactSku(value: unknown, label: string): ExactSku {
  const candidate = object(value, label);
  exactOwnKeys(candidate, ["id", "version"], label);
  return Object.freeze({
    id: parseFoodSkuId(candidate.id),
    version: positiveSafeInteger(candidate.version, `${label} version`),
  });
}

function sameSku(left: ExactSku, right: ExactSku): boolean {
  return left.id === right.id && left.version === right.version;
}

function validatedRecordedBalance(input: unknown): Readonly<{
  source: FoodValidatedRecordedBalanceResult;
  sku: ExactSku;
  recordedPackageBalance: number;
}> {
  const result = object(input, "FOOD-006P validation result");
  if (result.outcome !== "validated") {
    throw new TypeError("FOOD-006R requires a validated FOOD-006P result");
  }

  const value = object(result.value, "FOOD-006P validated value");
  const composition = object(value.composition, "FOOD-006P composition");
  const acquisition = object(composition.acquisition, "FOOD-006P acquisition");
  const recordedBalance = object(
    composition.recordedBalance,
    "FOOD-006P recorded balance",
  );
  const skuBalance = object(
    recordedBalance.skuBalance,
    "FOOD-006P SKU recorded balance",
  );
  const readPoint = object(value.readPoint, "FOOD-006P read point");
  const token = object(
    readPoint.consistencyToken,
    "FOOD-006P consistency token",
  );

  const acquisitionSku = exactSku(acquisition.sku, "acquisition SKU");
  const recordedSku = exactSku(recordedBalance.sku, "recorded balance SKU");
  const skuBalanceSku = exactSku(skuBalance.sku, "SKU balance SKU");
  const readPointSku = exactSku(readPoint.sku, "read point SKU");
  const tokenSku = exactSku(token.sku, "consistency token SKU");

  if (
    !sameSku(acquisitionSku, recordedSku)
    || !sameSku(acquisitionSku, skuBalanceSku)
    || !sameSku(acquisitionSku, readPointSku)
    || !sameSku(acquisitionSku, tokenSku)
  ) {
    throw new TypeError("FOOD-006P exact-SKU invariant mismatch");
  }

  const head = nonnegativeSafeInteger(
    acquisition.exactSkuEvidenceHead,
    "acquisition exact-SKU evidence head",
  );

  if (
    nonnegativeSafeInteger(recordedBalance.cutoff, "recorded balance cutoff") !== head
    || nonnegativeSafeInteger(readPoint.composedCutoff, "read point composed cutoff") !== head
    || nonnegativeSafeInteger(readPoint.exactSkuEvidenceHead, "read point exact-SKU evidence head") !== head
    || nonnegativeSafeInteger(token.composedCutoff, "token composed cutoff") !== head
    || nonnegativeSafeInteger(token.exactSkuEvidenceHead, "token exact-SKU evidence head") !== head
  ) {
    throw new TypeError("FOOD-006P authoritative generation invariant mismatch");
  }

  return Object.freeze({
    source: input as FoodValidatedRecordedBalanceResult,
    sku: acquisitionSku,
    recordedPackageBalance: signedSafeInteger(
      skuBalance.recordedPackageBalance,
      "recordedPackageBalance",
    ),
  });
}

function safeVariance(counted: number, recorded: number): number {
  const result = BigInt(counted) - BigInt(recorded);
  const minimum = BigInt(Number.MIN_SAFE_INTEGER);
  const maximum = BigInt(Number.MAX_SAFE_INTEGER);
  if (result < minimum || result > maximum) {
    throw new TypeError("Physical inventory reconciliation variance exceeds signed safe integer range");
  }
  return Number(result);
}

function statusForVariance(
  variance: number,
): FoodExactSkuPhysicalInventoryReconciliationStatus {
  if (variance === 0) return "agreement";
  if (variance > 0) return "count-over-recorded";
  return "count-under-recorded";
}

export function reconcileFoodExactSkuPhysicalInventory(
  recordedValidationInput: unknown,
  countObservationInput: unknown,
): FoodExactSkuPhysicalInventoryReconciliation {
  const recorded = validatedRecordedBalance(recordedValidationInput);
  const countObservation =
    validateFoodExactSkuPhysicalCountObservation(countObservationInput);

  if (!sameSku(recorded.sku, countObservation.sku)) {
    throw new TypeError("Physical count observation must bind exact recorded-balance SKU");
  }

  const variancePackageCount = safeVariance(
    countObservation.countedPackageCount,
    recorded.recordedPackageBalance,
  );

  return Object.freeze({
    kind: FOOD_EXACT_SKU_PHYSICAL_INVENTORY_RECONCILIATION_KIND,
    sku: Object.freeze({
      id: recorded.sku.id,
      version: recorded.sku.version,
    }),
    status: statusForVariance(variancePackageCount),
    countedPackageCount: countObservation.countedPackageCount,
    recordedPackageBalance: recorded.recordedPackageBalance,
    variancePackageCount,
    countObservation,
    recordedBalanceValidation: recorded.source.value,
  });
}
