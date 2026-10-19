/** FOOD-007N: structural hold intent only; no permission or persisted outcome. */
import {
  deriveFoodReservationCapacitySourceSelectionRequest,
  type FoodReservationCapacitySourceSelectionRequest,
} from "./reservation-capacity-source-selection-request";
import {
  validateFoodPhysicalOrderAgainstSources,
  type FoodPhysicalOrderId,
} from "./physical-order-domain";

export const FOOD_RESERVATION_HOLD_COMMAND_KIND = "reservation-hold-command" as const;

export type FoodCapacityReservationId = string & { readonly __brand: "FoodCapacityReservationId" };

export type FoodReservationHoldCommand = Readonly<{
  kind: typeof FOOD_RESERVATION_HOLD_COMMAND_KIND;
  reservationId: FoodCapacityReservationId;
  order: Readonly<{ id: FoodPhysicalOrderId; version: number }>;
  selection: FoodReservationCapacitySourceSelectionRequest;
}>;

export type FoodReservationHoldCommandResult =
  | Readonly<{ outcome: "candidate"; value: FoodReservationHoldCommand }>
  | Readonly<{ outcome: "invalid" }>;

// Capture the order as well as the proposal before older canonical validators
// inspect them. Read descriptors only; never invoke caller getters or hooks.
function capture(input: unknown, ancestors = new Set<object>()): unknown {
  if (input === null || typeof input === "string" || typeof input === "boolean" ||
    (typeof input === "number" && Number.isFinite(input))) return input;
  if (typeof input !== "object" || ancestors.has(input)) throw new TypeError("Invalid plain data");
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
      const length: unknown = descriptors.length?.value;
      if (typeof length !== "number" || keys.length !== length + 1) throw new TypeError("Invalid array");
      const result: unknown[] = [];
      for (let index = 0; index < length; index++) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || !("value" in descriptor)) throw new TypeError("Invalid array element");
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

function reservationId(input: unknown): FoodCapacityReservationId {
  if (typeof input !== "string") throw new TypeError("Expected reservation identity text");
  // Mirror 0003's length(TEXT) bounds: Unicode code points before the first NUL.
  // Preserve opaque input exactly; impose no prefix, padding or generation rule.
  const length = Array.from(input.split("\0", 1)[0]!).length;
  if (length < 1 || length > 512) throw new TypeError("Invalid reservation identity length");
  return input as FoodCapacityReservationId;
}

export function deriveFoodReservationHoldCommand(input: unknown): FoodReservationHoldCommandResult {
  try {
    const captured = capture(input);
    if (captured === null || typeof captured !== "object" || Array.isArray(captured)) {
      throw new TypeError("Expected command input");
    }
    const supplied = captured as Record<string, unknown>;
    const keys = ["reservationId", "order", "quote", "request", "fulfillmentIntent", "skuSelections", "slotSelection"];
    if (Object.keys(supplied).length !== keys.length || keys.some(key => !Object.hasOwn(supplied, key))) {
      throw new TypeError("Unexpected command fields");
    }
    const id = reservationId(supplied.reservationId);
    const selection = deriveFoodReservationCapacitySourceSelectionRequest({
      quote: supplied.quote,
      request: supplied.request,
      fulfillmentIntent: supplied.fulfillmentIntent,
      skuSelections: supplied.skuSelections,
      slotSelection: supplied.slotSelection,
    });
    if (selection.outcome === "invalid") return Object.freeze({ outcome: "invalid" });
    const order = validateFoodPhysicalOrderAgainstSources(
      supplied.order, supplied.quote, selection.value.fulfillmentIntent, selection.value.request,
    );
    return Object.freeze({
      outcome: "candidate",
      value: Object.freeze({
        kind: FOOD_RESERVATION_HOLD_COMMAND_KIND,
        reservationId: id,
        order: Object.freeze({ id: order.id, version: order.version }),
        selection: selection.value,
      }),
    });
  } catch {
    return Object.freeze({ outcome: "invalid" });
  }
}
