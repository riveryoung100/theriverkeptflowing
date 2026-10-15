/**
 * FOOD-006Q: caller-asserted exact-SKU total physical-count observation.
 *
 * This captures physical-world count evidence independently from recorded inventory.
 * It does not authenticate the observer or source, prove count completeness, perform
 * reconciliation, establish continued currentness/current QOH, or grant availability,
 * capacity, reservation, checkout, payment, fulfillment, accounting, or rewards authority.
 */
import { parseFoodSkuId, type FoodSkuId } from "./package-sku-domain";

export const FOOD_EXACT_SKU_PHYSICAL_COUNT_OBSERVATION_KIND =
  "food-exact-sku-physical-count-observation" as const;

export const FOOD_EXACT_SKU_PHYSICAL_COUNT_SCOPE =
  "exact-sku-total" as const;

export type FoodExactSkuPhysicalCountObservationId = string & {
  readonly __brand: "FoodExactSkuPhysicalCountObservationId";
};

export type FoodExactSkuPhysicalCountObservation = Readonly<{
  kind: typeof FOOD_EXACT_SKU_PHYSICAL_COUNT_OBSERVATION_KIND;
  id: FoodExactSkuPhysicalCountObservationId;
  sku: Readonly<{ id: FoodSkuId; version: number }>;
  countScope: typeof FOOD_EXACT_SKU_PHYSICAL_COUNT_SCOPE;
  countedPackageCount: number;
  observedAt: string;
  attribution: string;
  sourceReference: string;
}>;

const MAX_LOCAL_IDENTITY_LENGTH = 128;
const MAX_TEXT_LENGTH = 512;

function object(value: unknown, label: string): Record<PropertyKey, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  return value as Record<PropertyKey, unknown>;
}

function exactOwnKeys(value: Record<PropertyKey, unknown>, expected: readonly string[], label: string): void {
  const names = Object.getOwnPropertyNames(value);
  const symbols = Object.getOwnPropertySymbols(value);
  if (symbols.length !== 0 || names.length !== expected.length || expected.some((key) => !Object.prototype.hasOwnProperty.call(value, key)) || names.some((key) => !expected.includes(key))) {
    throw new TypeError(`${label} has invalid fields`);
  }
}

function boundedText(value: unknown, maximum: number, label: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > maximum || value.trim() !== value) {
    throw new TypeError(`${label} must be canonical bounded text`);
  }
  return value;
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

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  if (month === 4 || month === 6 || month === 9 || month === 11) return 30;
  return 31;
}

function utcInstant(value: unknown): string {
  if (typeof value !== "string") throw new TypeError("observedAt must be a canonical UTC instant");
  const match = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)Z$/.exec(value);
  if (!match) throw new TypeError("observedAt must be YYYY-MM-DDTHH:mm:ssZ");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    throw new TypeError("observedAt contains an invalid calendar date");
  }
  return value;
}

export function createFoodExactSkuPhysicalCountObservationId(value: unknown): FoodExactSkuPhysicalCountObservationId {
  const local = boundedText(value, MAX_LOCAL_IDENTITY_LENGTH, "physical count observation identity");
  if (local.includes(":")) throw new TypeError("physical count observation local identity cannot contain colon");
  return `food-exact-sku-physical-count-observation:${local}` as FoodExactSkuPhysicalCountObservationId;
}

export function parseFoodExactSkuPhysicalCountObservationId(value: unknown): FoodExactSkuPhysicalCountObservationId {
  const prefix = "food-exact-sku-physical-count-observation:";
  const text = boundedText(value, prefix.length + MAX_LOCAL_IDENTITY_LENGTH, "physical count observation identity");
  if (!text.startsWith(prefix)) throw new TypeError("wrong physical count observation identity prefix");
  return createFoodExactSkuPhysicalCountObservationId(text.slice(prefix.length));
}

export function validateFoodExactSkuPhysicalCountObservation(input: unknown): FoodExactSkuPhysicalCountObservation {
  const value = object(input, "physical count observation");
  exactOwnKeys(value, ["kind", "id", "sku", "countScope", "countedPackageCount", "observedAt", "attribution", "sourceReference"], "physical count observation");
  if (value.kind !== FOOD_EXACT_SKU_PHYSICAL_COUNT_OBSERVATION_KIND) throw new TypeError("invalid physical count observation kind");
  if (value.countScope !== FOOD_EXACT_SKU_PHYSICAL_COUNT_SCOPE) throw new TypeError("invalid physical count scope");
  const sku = object(value.sku, "physical count observation SKU");
  exactOwnKeys(sku, ["id", "version"], "physical count observation SKU");
  return Object.freeze({
    kind: FOOD_EXACT_SKU_PHYSICAL_COUNT_OBSERVATION_KIND,
    id: parseFoodExactSkuPhysicalCountObservationId(value.id),
    sku: Object.freeze({
      id: parseFoodSkuId(sku.id),
      version: positiveSafeInteger(sku.version, "SKU version"),
    }),
    countScope: FOOD_EXACT_SKU_PHYSICAL_COUNT_SCOPE,
    countedPackageCount: nonnegativeSafeInteger(value.countedPackageCount, "countedPackageCount"),
    observedAt: utcInstant(value.observedAt),
    attribution: boundedText(value.attribution, MAX_TEXT_LENGTH, "attribution"),
    sourceReference: boundedText(value.sourceReference, MAX_TEXT_LENGTH, "sourceReference"),
  });
}
