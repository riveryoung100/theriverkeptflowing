export const FOOD_FULFILLMENT_SLOT_CAPACITY_SOURCE_KIND =
  "fulfillment-slot-capacity-source" as const;

export type FoodFulfillmentSlotCapacitySourceKind =
  typeof FOOD_FULFILLMENT_SLOT_CAPACITY_SOURCE_KIND;

export type FoodFulfillmentSlotCapacityMethod =
  | "personal-delivery"
  | "meetup";

export interface FoodFulfillmentSlotCapacitySourceRevision {
  readonly kind: FoodFulfillmentSlotCapacitySourceKind;
  readonly method: FoodFulfillmentSlotCapacityMethod;
  readonly locationReference: string;
  readonly windowReference: string;
  readonly revision: number;
  readonly capacityUnits: number;
  readonly attribution: string;
  readonly sourceReference: string;
}

const MAX_TEXT_LENGTH = 512;

function record(value: unknown, label: string): Record<PropertyKey, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
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
  const keys = Reflect.ownKeys(value);

  if (
    keys.length !== expected.length ||
    keys.some(
      (key) =>
        typeof key !== "string" ||
        !expected.includes(key),
    )
  ) {
    throw new TypeError(`${label} has invalid fields`);
  }
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
    throw new TypeError(`${label} must be bounded unpadded text`);
  }

  return value;
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
    throw new TypeError(`${label} must be a positive safe integer`);
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
    throw new TypeError(`${label} must be a nonnegative safe integer`);
  }

  return value;
}

function method(
  value: unknown,
): FoodFulfillmentSlotCapacityMethod {
  if (
    value !== "personal-delivery" &&
    value !== "meetup"
  ) {
    throw new TypeError("method is invalid");
  }

  return value;
}

export function validateFoodFulfillmentSlotCapacitySourceRevision(
  input: unknown,
): FoodFulfillmentSlotCapacitySourceRevision {
  const value = record(
    input,
    "fulfillment-slot capacity source revision",
  );

  exactOwnKeys(
    value,
    [
      "kind",
      "method",
      "locationReference",
      "windowReference",
      "revision",
      "capacityUnits",
      "attribution",
      "sourceReference",
    ],
    "fulfillment-slot capacity source revision",
  );

  if (
    value.kind !==
    FOOD_FULFILLMENT_SLOT_CAPACITY_SOURCE_KIND
  ) {
    throw new TypeError("kind is invalid");
  }

  return Object.freeze({
    kind: FOOD_FULFILLMENT_SLOT_CAPACITY_SOURCE_KIND,
    method: method(value.method),
    locationReference: boundedText(
      value.locationReference,
      "locationReference",
    ),
    windowReference: boundedText(
      value.windowReference,
      "windowReference",
    ),
    revision: positiveSafeInteger(
      value.revision,
      "revision",
    ),
    capacityUnits: nonnegativeSafeInteger(
      value.capacityUnits,
      "capacityUnits",
    ),
    attribution: boundedText(
      value.attribution,
      "attribution",
    ),
    sourceReference: boundedText(
      value.sourceReference,
      "sourceReference",
    ),
  });
}

export function createInitialFoodFulfillmentSlotCapacitySourceRevision(
  input: unknown,
): FoodFulfillmentSlotCapacitySourceRevision {
  const value =
    validateFoodFulfillmentSlotCapacitySourceRevision(input);

  if (value.revision !== 1) {
    throw new TypeError("initial revision must equal 1");
  }

  return value;
}

export function reviseFoodFulfillmentSlotCapacitySourceRevision(
  previousInput: unknown,
  nextInput: unknown,
): FoodFulfillmentSlotCapacitySourceRevision {
  const previous =
    validateFoodFulfillmentSlotCapacitySourceRevision(
      previousInput,
    );

  const next =
    validateFoodFulfillmentSlotCapacitySourceRevision(
      nextInput,
    );

  if (
    next.method !== previous.method ||
    next.locationReference !== previous.locationReference ||
    next.windowReference !== previous.windowReference
  ) {
    throw new TypeError(
      "capacity source identity must remain stable",
    );
  }

  if (
    previous.revision === Number.MAX_SAFE_INTEGER ||
    next.revision !== previous.revision + 1
  ) {
    throw new TypeError(
      "capacity source revisions must be consecutive",
    );
  }

  return next;
}

export function serializeFoodFulfillmentSlotCapacitySourceRevision(
  input: unknown,
): string {
  const value =
    validateFoodFulfillmentSlotCapacitySourceRevision(input);

  return JSON.stringify({
    kind: value.kind,
    method: value.method,
    locationReference: value.locationReference,
    windowReference: value.windowReference,
    revision: value.revision,
    capacityUnits: value.capacityUnits,
    attribution: value.attribution,
    sourceReference: value.sourceReference,
  });
}
