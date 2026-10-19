/**
 * FOOD-007H: highest recorded exact fulfillment-slot source assertion from the injected read only.
 * Structural validation does not authenticate provenance or sourceReference,
 * establish current slot availability, remaining capacity, or operational authority.
 */
import { validateFoodFulfillmentMethod } from "./fulfillment-capacity-reservation-domain";
import {
  FOOD_FULFILLMENT_SLOT_CAPACITY_SOURCE_KIND,
  validateFoodFulfillmentSlotCapacitySourceRevision,
} from "./fulfillment-slot-capacity-source-domain";

import type {
  FoodExactFulfillmentSlotCapacitySourceReadD1Database,
  FoodExactFulfillmentSlotCapacitySourceReadResult,
} from "./d1-exact-fulfillment-slot-capacity-source-read";

const LATEST_SQL = `
SELECT method, location_reference, window_reference, revision, capacity_units, attribution, source_reference
FROM food_fulfillment_slot_capacity_sources
WHERE method = ? AND location_reference = ? AND window_reference = ?
ORDER BY revision DESC
LIMIT 1
`.trim();

// Read own data descriptors so invalid selectors cannot invoke accessors.
function ownData(
  input: unknown,
  keys: readonly string[],
): Record<string, unknown> {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new TypeError("Expected data object");
  }

  const ownKeys = Reflect.ownKeys(input);

  if (
    ownKeys.length !== keys.length ||
    ownKeys.some(
      key =>
        typeof key !== "string" ||
        !keys.includes(key),
    )
  ) {
    throw new TypeError("Unexpected fields");
  }

  const result: Record<string, unknown> = {};

  for (const key of keys) {
    const descriptor =
      Object.getOwnPropertyDescriptor(input, key);

    if (
      !descriptor ||
      !("value" in descriptor)
    ) {
      throw new TypeError("Expected own data field");
    }

    result[key] = descriptor.value;
  }

  return result;
}

function reference(input: unknown): string {
  if (
    typeof input !== "string" ||
    input.length < 1 ||
    input.length > 512 ||
    input.trim() !== input
  ) {
    throw new TypeError(
      "Expected nonempty unpadded bounded reference",
    );
  }

  return input;
}

function selector(input: unknown) {
  const request = ownData(
    input,
    [
      "method",
      "locationReference",
      "windowReference",
    ],
  );

  return Object.freeze({
    method:
      validateFoodFulfillmentMethod(
        request.method,
      ),
    locationReference:
      reference(
        request.locationReference,
      ),
    windowReference:
      reference(
        request.windowReference,
      ),
  });
}

export async function readFoodLatestExactFulfillmentSlotCapacitySourceRevision(
  database: FoodExactFulfillmentSlotCapacitySourceReadD1Database,
  input: unknown,
): Promise<FoodExactFulfillmentSlotCapacitySourceReadResult> {
  let requested: ReturnType<typeof selector>;

  try {
    requested = selector(input);
  } catch {
    return Object.freeze({
      outcome: "invalid",
    });
  }

  try {
    const result =
      await database
        .prepare(LATEST_SQL)
        .bind(
          requested.method,
          requested.locationReference,
          requested.windowReference,
        )
        .all<unknown>();

    if (
      !result ||
      typeof result !== "object" ||
      result.success !== true ||
      !Array.isArray(result.results) ||
      result.results.length > 1
    ) {
      return Object.freeze({
        outcome: "storage-failure",
      });
    }

    if (result.results.length === 0) {
      return Object.freeze({
        outcome: "not-found",
      });
    }

    const row = ownData(
      result.results[0],
      [
        "method",
        "location_reference",
        "window_reference",
        "revision",
        "capacity_units",
        "attribution",
        "source_reference",
      ],
    );

    const value =
      validateFoodFulfillmentSlotCapacitySourceRevision({
        kind:
          FOOD_FULFILLMENT_SLOT_CAPACITY_SOURCE_KIND,
        method:
          row.method,
        locationReference:
          row.location_reference,
        windowReference:
          row.window_reference,
        revision:
          row.revision,
        capacityUnits:
          row.capacity_units,
        attribution:
          row.attribution,
        sourceReference:
          row.source_reference,
      });

    if (
      value.method !== requested.method ||
      value.locationReference !==
        requested.locationReference ||
      value.windowReference !==
        requested.windowReference
    ) {
      return Object.freeze({
        outcome: "storage-failure",
      });
    }

    return Object.freeze({
      outcome: "found",
      value,
    });
  } catch {
    return Object.freeze({
      outcome: "storage-failure",
    });
  }
}
