/** FOOD-007O: supplied-observation policy only; no mutation authority. */
import { deriveFoodReservationHoldCommand, type FoodReservationHoldCommand } from "./reservation-hold-command";
import { validateFoodVersion } from "./draft-domain";
import type { FoodReservationCapacitySourceLatestRecordedSkuObservation, FoodReservationCapacitySourceLatestRecordedSlotObservation } from "./reservation-capacity-source-latest-recorded-selection-validation";
export const FOOD_RESERVATION_CAPACITY_GOVERNING_SOURCE_POLICY_KIND = "reservation-capacity-governing-source-policy" as const;
type SkuObservation = Pick<FoodReservationCapacitySourceLatestRecordedSkuObservation, "sku" | "observedHighestRecordedRevision">;
type SlotObservation = Omit<FoodReservationCapacitySourceLatestRecordedSlotObservation, "selectedRevision">;
export type FoodReservationCapacityGoverningSourcePolicyEvaluation = Readonly<{
  kind: typeof FOOD_RESERVATION_CAPACITY_GOVERNING_SOURCE_POLICY_KIND;
  policyVersion: 1;
  command: FoodReservationHoldCommand;
  observations: Readonly<{ skuObservations: readonly SkuObservation[]; slotObservation: SlotObservation }>;
}>;
export type FoodReservationCapacityGoverningSourcePolicyResult =
  | Readonly<{ outcome: "matches-policy"; value: FoodReservationCapacityGoverningSourcePolicyEvaluation }>
  | Readonly<{ outcome: "does-not-match-policy"; value: FoodReservationCapacityGoverningSourcePolicyEvaluation }>
  | Readonly<{ outcome: "invalid" }>;
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

function exact(input: unknown, keys: readonly string[]): Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Expected object");
  const value = input as Record<string, unknown>;
  if (Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) throw new TypeError("Unexpected fields");
  return value;
}
export function evaluateFoodReservationCapacityGoverningSourcePolicy(input: unknown): FoodReservationCapacityGoverningSourcePolicyResult {
  try {
    const supplied = exact(capture(input), ["commandInput", "observations"]);
    const derived = deriveFoodReservationHoldCommand(supplied.commandInput);
    if (derived.outcome === "invalid") return Object.freeze({ outcome: "invalid" });
    const command = derived.value;
    const observations = exact(supplied.observations, ["skuObservations", "slotObservation"]);
    if (!Array.isArray(observations.skuObservations)) throw new TypeError("Expected array");
    const selections = command.selection.skuSelections;
    if (observations.skuObservations.length !== selections.length) throw new TypeError("Incomplete set");
    const byIdentity = new Map<string, SkuObservation>();
    const identity = (id: unknown, version: unknown) => JSON.stringify([id, version]);
    for (const entry of observations.skuObservations) {
      const observation = exact(entry, ["sku", "observedHighestRecordedRevision"]);
      const sku = exact(observation.sku, ["id", "version"]);
      const selected = selections.find(item => item.sku.id === sku.id && item.sku.version === sku.version);
      if (!selected) throw new TypeError("Unknown stream");
      const key = identity(sku.id, sku.version);
      if (byIdentity.has(key)) throw new TypeError("Duplicate stream");
      byIdentity.set(key, Object.freeze({ sku: Object.freeze({ ...selected.sku }), observedHighestRecordedRevision: validateFoodVersion(observation.observedHighestRecordedRevision) }));
    }
    const slot = exact(observations.slotObservation, ["method", "locationReference", "windowReference", "observedHighestRecordedRevision"]);
    const selectedSlot = command.selection.slotSelection;
    if (slot.method !== selectedSlot.method || slot.locationReference !== selectedSlot.locationReference || slot.windowReference !== selectedSlot.windowReference) throw new TypeError("Wrong slot");
    const slotObservation = Object.freeze({ method: selectedSlot.method, locationReference: selectedSlot.locationReference,
      windowReference: selectedSlot.windowReference, observedHighestRecordedRevision: validateFoodVersion(slot.observedHighestRecordedRevision) });
    const skuObservations = Object.freeze(selections.map(selected => {
      const observation = byIdentity.get(identity(selected.sku.id, selected.sku.version));
      if (!observation) throw new TypeError("Missing stream");
      return observation;
    }));
    // Complete structural validation precedes every policy decision.
    const matches = selections.every((selected, index) => selected.revision === skuObservations[index]!.observedHighestRecordedRevision) && selectedSlot.revision === slotObservation.observedHighestRecordedRevision;
    const value: FoodReservationCapacityGoverningSourcePolicyEvaluation = Object.freeze({ kind: FOOD_RESERVATION_CAPACITY_GOVERNING_SOURCE_POLICY_KIND,
      policyVersion: 1, command, observations: Object.freeze({ skuObservations, slotObservation }) });
    return matches ? Object.freeze({ outcome: "matches-policy", value }) : Object.freeze({ outcome: "does-not-match-policy", value });
  } catch { return Object.freeze({ outcome: "invalid" }); }
}
