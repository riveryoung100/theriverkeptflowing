/** FOOD-007E: inert revision proposals; no existence, eligibility or acceptance authority. */
import { validateFoodVersion } from "./draft-domain";
import { parseFoodSkuId, type FoodSkuId } from "./package-sku-domain";
import {
  validateFoodReservationRequestAgainstSources,
  validateFoodFulfillmentIntentVersion,
  validateFoodFulfillmentMethod,
  type FoodReservationRequestVersion,
  type FoodFulfillmentIntentVersion,
  type FoodFulfillmentMethod,
} from "./fulfillment-capacity-reservation-domain";

export const FOOD_RESERVATION_CAPACITY_SOURCE_SELECTION_REQUEST_KIND =
  "reservation-capacity-source-selection-request" as const;

type SkuSelection = Readonly<{
  sku: Readonly<{ id: FoodSkuId; version: number }>;
  revision: number;
}>;

export type FoodReservationCapacitySourceSelectionRequest = Readonly<{
  kind: typeof FOOD_RESERVATION_CAPACITY_SOURCE_SELECTION_REQUEST_KIND;
  request: FoodReservationRequestVersion;
  fulfillmentIntent: FoodFulfillmentIntentVersion;
  skuSelections: readonly SkuSelection[];
  slotSelection: Readonly<{
    method: FoodFulfillmentMethod;
    locationReference: string;
    windowReference: string;
    revision: number;
  }>;
}>;

export type FoodReservationCapacitySourceSelectionRequestResult =
  | Readonly<{ outcome: "candidate"; value: FoodReservationCapacitySourceSelectionRequest }>
  | Readonly<{ outcome: "invalid" }>;

// Capture only plain own data before older upstream validators see snapshots.
// Arrays must be dense and contain only indices and their intrinsic length.
function capture(input: unknown, ancestors = new Set<object>()): unknown {
  if (input === null || typeof input === "string" || typeof input === "boolean" ||
    (typeof input === "number" && Number.isFinite(input))) return input;
  if (typeof input !== "object" || ancestors.has(input)) throw new TypeError("Invalid data");
  const array = Array.isArray(input);
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== null && prototype !== (array ? Array.prototype : Object.prototype)) {
    throw new TypeError("Unexpected prototype");
  }
  ancestors.add(input);
  try {
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some(key => typeof key !== "string")) throw new TypeError("Symbol field");
    if (array) {
      const length = descriptors.length?.value as unknown;
      if (typeof length !== "number" || keys.length !== length + 1) throw new TypeError("Invalid array");
      const result: unknown[] = [];
      for (let index = 0; index < length; index++) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || !("value" in descriptor)) throw new TypeError("Invalid element");
        result.push(capture(descriptor.value, ancestors));
      }
      return result;
    }
    const result: Record<string, unknown> = Object.create(null);
    for (const key of keys as string[]) {
      const descriptor = descriptors[key]!;
      if (!("value" in descriptor)) throw new TypeError("Accessor field");
      result[key] = capture(descriptor.value, ancestors);
    }
    return result;
  } finally {
    ancestors.delete(input);
  }
}

function exact(input: unknown, keys: readonly string[]): Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Expected object");
  const actual = Object.keys(input);
  if (actual.length !== keys.length || keys.some(key => !Object.hasOwn(input, key))) {
    throw new TypeError("Unexpected fields");
  }
  return input as Record<string, unknown>;
}

function reference(input: unknown): string {
  if (typeof input !== "string" || input.length < 1 || input.length > 512 || input.trim() !== input) {
    throw new TypeError("Invalid reference");
  }
  return input;
}

function skuKey(sku: Readonly<{ id: FoodSkuId; version: number }>): string {
  return JSON.stringify([sku.id, sku.version]);
}

export function deriveFoodReservationCapacitySourceSelectionRequest(
  input: unknown,
): FoodReservationCapacitySourceSelectionRequestResult {
  try {
    const supplied = exact(capture(input), ["request", "quote", "fulfillmentIntent", "skuSelections", "slotSelection"]);
    const request = validateFoodReservationRequestAgainstSources(
      supplied.request, supplied.quote, supplied.fulfillmentIntent,
    );
    const fulfillmentIntent = validateFoodFulfillmentIntentVersion(supplied.fulfillmentIntent);
    if (!Array.isArray(supplied.skuSelections) ||
      supplied.skuSelections.length !== request.capacityRequirements.length) throw new TypeError("Incomplete mapping");
    const selections = new Map<string, SkuSelection>();
    for (const entry of supplied.skuSelections) {
      const selection = exact(entry, ["sku", "revision"]);
      const identity = exact(selection.sku, ["id", "version"]);
      const sku = Object.freeze({ id: parseFoodSkuId(identity.id), version: validateFoodVersion(identity.version) });
      const key = skuKey(sku);
      if (selections.has(key)) throw new TypeError("Duplicate selection");
      selections.set(key, Object.freeze({ sku, revision: validateFoodVersion(selection.revision) }));
    }
    const skuSelections = Object.freeze(request.capacityRequirements.map(line => {
      const selection = selections.get(skuKey(line.sku));
      if (!selection) throw new TypeError("Missing exact selection");
      return selection;
    }));
    const slot = exact(supplied.slotSelection, ["method", "locationReference", "windowReference", "revision"]);
    const slotSelection = Object.freeze({
      method: validateFoodFulfillmentMethod(slot.method),
      locationReference: reference(slot.locationReference),
      windowReference: reference(slot.windowReference),
      revision: validateFoodVersion(slot.revision),
    });
    if (slotSelection.method !== fulfillmentIntent.method ||
      slotSelection.locationReference !== fulfillmentIntent.locationReference ||
      slotSelection.windowReference !== fulfillmentIntent.windowReference) throw new TypeError("Slot mismatch");
    return Object.freeze({
      outcome: "candidate",
      value: Object.freeze({
        kind: FOOD_RESERVATION_CAPACITY_SOURCE_SELECTION_REQUEST_KIND,
        request, fulfillmentIntent, skuSelections, slotSelection,
      }),
    });
  } catch {
    return Object.freeze({ outcome: "invalid" });
  }
}
