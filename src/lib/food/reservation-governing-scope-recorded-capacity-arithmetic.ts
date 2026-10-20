/** FOOD-007S: pure arithmetic over supplied governing-scope evidence. */
import type { FoodReservationCapacitySourceSelectionResolution } from "./reservation-capacity-source-selection-resolution";
import { FOOD_RESERVATION_CAPACITY_COMMITMENT_SCOPE_KIND, type FoodReservationCapacityCommitmentScope } from "./reservation-capacity-commitment-scope";
import { FOOD_RESERVATION_GOVERNING_SCOPE_RECORDED_HELD_COMMITMENT_RESOLUTION_KIND, type FoodReservationGoverningScopeRecordedHeldCommitmentResolution } from "./reservation-governing-scope-recorded-held-commitment-resolution";
import { FOOD_RESERVATION_CAPACITY_GOVERNING_SOURCE_POLICY_KIND } from "./reservation-capacity-governing-source-policy";
import { FOOD_RESERVATION_HOLD_COMMAND_KIND } from "./reservation-hold-command";
import { FOOD_RESERVATION_CAPACITY_SOURCE_SELECTION_REQUEST_KIND } from "./reservation-capacity-source-selection-request";
import { validateFoodExactSkuStockedCapacitySourceRevision } from "./exact-sku-stocked-capacity-source-domain";
import { validateFoodFulfillmentSlotCapacitySourceRevision } from "./fulfillment-slot-capacity-source-domain";
import { validateFoodReservationRequestVersion, validateFoodFulfillmentIntentVersion } from "./fulfillment-capacity-reservation-domain";
import { parseFoodSkuId } from "./package-sku-domain";
import { parseFoodPhysicalOrderId } from "./physical-order-domain";

export const FOOD_RESERVATION_GOVERNING_SCOPE_RECORDED_CAPACITY_ARITHMETIC_KIND =
  "reservation-governing-scope-recorded-capacity-arithmetic" as const;

export type FoodReservationGoverningScopeRecordedCapacitySkuArithmetic = Readonly<{
  sku: Readonly<{ id: string; version: number }>;
  governingRevision: number;
  capacityUnits: number;
  recordedHeldQuantity: number;
  recordedCapacityDelta: number;
}>;
export type FoodReservationGoverningScopeRecordedCapacitySlotArithmetic = Readonly<{
  method: "personal-delivery" | "meetup";
  locationReference: string;
  windowReference: string;
  governingRevision: number;
  capacityUnits: number;
  recordedHeldQuantity: number;
  recordedCapacityDelta: number;
}>;
export type FoodReservationGoverningScopeRecordedCapacityArithmetic = Readonly<{
  kind: typeof FOOD_RESERVATION_GOVERNING_SCOPE_RECORDED_CAPACITY_ARITHMETIC_KIND;
  skuArithmetic: readonly FoodReservationGoverningScopeRecordedCapacitySkuArithmetic[];
  slotArithmetic: FoodReservationGoverningScopeRecordedCapacitySlotArithmetic;
}>;
export type FoodReservationGoverningScopeRecordedCapacityArithmeticResult =
  | Readonly<{ outcome: "derived"; value: FoodReservationGoverningScopeRecordedCapacityArithmetic }>
  | Readonly<{ outcome: "invalid" }>;

type Data = Record<string, unknown>;
type Sku = Readonly<{ id: string; version: number }>;
type Slot = Readonly<{ method: "personal-delivery" | "meetup"; locationReference: string; windowReference: string }>;

function requireCondition(condition: unknown): asserts condition {
  if (!condition) throw new TypeError("Invalid governing-scope evidence");
}

// Capture descriptors into owned ordinary containers before any domain validator
// or correlation reads caller fields. Never consult a caller array iterator.
function capture(input: unknown, ancestors: readonly object[] = []): unknown {
  if (input === null || typeof input === "string" || typeof input === "boolean") return input;
  if (typeof input === "number") {
    requireCondition(Number.isFinite(input));
    return input;
  }
  requireCondition(typeof input === "object" && !ancestors.includes(input));
  const array = Array.isArray(input);
  requireCondition(Object.getPrototypeOf(input) === (array ? Array.prototype : Object.prototype));
  const keys = Reflect.ownKeys(input);
  requireCondition(keys.every(key => typeof key === "string"));
  const path = [...ancestors, input];
  if (array) {
    const lengthDescriptor = Object.getOwnPropertyDescriptor(input, "length");
    requireCondition(lengthDescriptor && "value" in lengthDescriptor);
    const length: unknown = lengthDescriptor.value;
    requireCondition(typeof length === "number" && Number.isSafeInteger(length) && length >= 0 && keys.length === length + 1);
    const result: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
      requireCondition(descriptor && "value" in descriptor);
      result.push(capture(descriptor.value, path));
    }
    return result;
  }
  const entries: [string, unknown][] = [];
  for (const key of keys) {
    requireCondition(typeof key === "string");
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    requireCondition(descriptor && "value" in descriptor);
    entries.push([key, capture(descriptor.value, path)]);
  }
  return Object.fromEntries(entries);
}

function record(input: unknown, keys: readonly string[]): Data {
  requireCondition(input !== null && typeof input === "object" && !Array.isArray(input));
  const actual = Object.keys(input);
  requireCondition(actual.length === keys.length && keys.every(key => Object.hasOwn(input, key)));
  return input as Data;
}
function list(input: unknown): unknown[] {
  requireCondition(Array.isArray(input));
  return input;
}
function integer(input: unknown, minimum: number): number {
  requireCondition(typeof input === "number" && Number.isSafeInteger(input) && input >= minimum);
  return input;
}
function text(input: unknown): string {
  requireCondition(typeof input === "string" && input.length > 0 && input.length <= 512 && input.trim() === input);
  return input;
}
function sku(input: unknown): Sku {
  const value = record(input, ["id", "version"]);
  return { id: parseFoodSkuId(value.id), version: integer(value.version, 1) };
}
function slot(value: Data): Slot {
  requireCondition(value.method === "personal-delivery" || value.method === "meetup");
  return { method: value.method, locationReference: text(value.locationReference), windowReference: text(value.windowReference) };
}
function sameSku(left: Sku, right: Sku): boolean {
  return left.id === right.id && left.version === right.version;
}
function sameSlot(left: Slot, right: Slot): boolean {
  return left.method === right.method && left.locationReference === right.locationReference && left.windowReference === right.windowReference;
}
// Captured values have no caller behavior; key insertion order is immaterial.
function equal(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object") return false;
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  const a = left as Data;
  const b = right as Data;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && equal(a[key], b[key]));
}
function selection(input: unknown) {
  const root = record(input, ["kind", "request", "fulfillmentIntent", "skuSelections", "slotSelection"]);
  requireCondition(root.kind === FOOD_RESERVATION_CAPACITY_SOURCE_SELECTION_REQUEST_KIND);
  const request = validateFoodReservationRequestVersion(root.request);
  const intent = validateFoodFulfillmentIntentVersion(root.fulfillmentIntent);
  requireCondition(request.fulfillmentIntent.id === intent.id && request.fulfillmentIntent.version === intent.version &&
    request.quote.id === intent.quote.id && request.quote.version === intent.quote.version);
  const selected = list(root.skuSelections).map(raw => {
    const value = record(raw, ["sku", "revision"]);
    return { sku: sku(value.sku), revision: integer(value.revision, 1) };
  });
  requireCondition(selected.length === request.capacityRequirements.length && selected.length > 0);
  for (let index = 0; index < selected.length; index += 1) {
    requireCondition(sameSku(selected[index]!.sku, request.capacityRequirements[index]!.sku));
  }
  const rawSlot = record(root.slotSelection, ["method", "locationReference", "windowReference", "revision"]);
  const selectedSlot = { ...slot(rawSlot), revision: integer(rawSlot.revision, 1) };
  requireCondition(sameSlot(selectedSlot, intent));
  return { request, fulfillmentIntent: intent, skuSelections: selected, slotSelection: selectedSlot };
}
function difference(capacityUnits: number, recordedHeldQuantity: number): number {
  const delta = BigInt(capacityUnits) - BigInt(recordedHeldQuantity);
  requireCondition(delta >= BigInt(Number.MIN_SAFE_INTEGER) && delta <= BigInt(Number.MAX_SAFE_INTEGER));
  return Number(delta);
}

export function deriveFoodReservationGoverningScopeRecordedCapacityArithmetic(
  capacitySourceResolution: FoodReservationCapacitySourceSelectionResolution,
  commitmentScope: FoodReservationCapacityCommitmentScope,
  recordedHeldCommitmentResolution: FoodReservationGoverningScopeRecordedHeldCommitmentResolution,
): FoodReservationGoverningScopeRecordedCapacityArithmeticResult {
  try {
    // All three complete graphs are captured before structural correlation.
    const capturedF = capture(capacitySourceResolution);
    const capturedP = capture(commitmentScope);
    const capturedR = capture(recordedHeldCommitmentResolution);
    const f = record(capturedF, ["kind", "selection", "skuSources", "slotSource"]);
    const p = record(capturedP, ["kind", "policyVersion", "governing", "skuScopes", "slotScope"]);
    const r = record(capturedR, ["kind", "skuCommitments", "slotCommitment"]);
    requireCondition(f.kind === "reservation-capacity-source-selection-resolution" &&
      p.kind === FOOD_RESERVATION_CAPACITY_COMMITMENT_SCOPE_KIND && p.policyVersion === 1 &&
      r.kind === FOOD_RESERVATION_GOVERNING_SCOPE_RECORDED_HELD_COMMITMENT_RESOLUTION_KIND);
    const governing = record(p.governing, ["kind", "policyVersion", "command", "observations"]);
    requireCondition(governing.kind === FOOD_RESERVATION_CAPACITY_GOVERNING_SOURCE_POLICY_KIND && governing.policyVersion === 1);
    const command = record(governing.command, ["kind", "reservationId", "order", "selection"]);
    requireCondition(command.kind === FOOD_RESERVATION_HOLD_COMMAND_KIND && typeof command.reservationId === "string");
    const identityLength = Array.from(command.reservationId.split("\0", 1)[0]!).length;
    requireCondition(identityLength >= 1 && identityLength <= 512);
    const order = record(command.order, ["id", "version"]);
    parseFoodPhysicalOrderId(order.id);
    integer(order.version, 1);
    const selected = selection(f.selection);
    const governed = selection(command.selection);
    requireCondition(equal(selected, governed));
    const observations = record(governing.observations, ["skuObservations", "slotObservation"]);
    const observedSkus = list(observations.skuObservations);
    const scopes = list(p.skuScopes);
    const held = list(r.skuCommitments);
    const sources = list(f.skuSources).map(validateFoodExactSkuStockedCapacitySourceRevision);
    requireCondition(scopes.length === selected.skuSelections.length && scopes.length === sources.length &&
      scopes.length === held.length && scopes.length === observedSkus.length);
    const aligned = scopes.map((raw, index) => {
      const scope = record(raw, ["sku", "governingRevision"]);
      const identity = sku(scope.sku);
      const revision = integer(scope.governingRevision, 1);
      const commitment = record(held[index], ["sku", "governingRevision", "recordedHeldQuantity"]);
      const observation = record(observedSkus[index], ["sku", "observedHighestRecordedRevision"]);
      const source = sources[index]!;
      const selectedSku = selected.skuSelections[index]!;
      requireCondition([source.sku, selectedSku.sku, sku(commitment.sku), sku(observation.sku)].every(other => sameSku(identity, other)));
      requireCondition(source.revision === revision && selectedSku.revision === revision &&
        integer(commitment.governingRevision, 1) === revision && integer(observation.observedHighestRecordedRevision, 1) === revision);
      return { sku: identity, governingRevision: revision, capacityUnits: integer(source.capacityUnits, 0), recordedHeldQuantity: integer(commitment.recordedHeldQuantity, 0) };
    });
    const scopeSlot = record(p.slotScope, ["method", "locationReference", "windowReference", "governingRevision"]);
    const heldSlot = record(r.slotCommitment, ["method", "locationReference", "windowReference", "governingRevision", "recordedHeldQuantity"]);
    const observedSlot = record(observations.slotObservation, ["method", "locationReference", "windowReference", "observedHighestRecordedRevision"]);
    const sourceSlot = validateFoodFulfillmentSlotCapacitySourceRevision(f.slotSource);
    const slotIdentity = slot(scopeSlot);
    const governingRevision = integer(scopeSlot.governingRevision, 1);
    requireCondition([slot(heldSlot), slot(observedSlot), sourceSlot, selected.slotSelection].every(other => sameSlot(slotIdentity, other)));
    requireCondition(sourceSlot.revision === governingRevision && selected.slotSelection.revision === governingRevision &&
      integer(heldSlot.governingRevision, 1) === governingRevision && integer(observedSlot.observedHighestRecordedRevision, 1) === governingRevision);
    const capacityUnits = integer(sourceSlot.capacityUnits, 0);
    const recordedHeldQuantity = integer(heldSlot.recordedHeldQuantity, 0);
    // Every input and stream is validated before the first subtraction.
    const value: FoodReservationGoverningScopeRecordedCapacityArithmetic = Object.freeze({
      kind: FOOD_RESERVATION_GOVERNING_SCOPE_RECORDED_CAPACITY_ARITHMETIC_KIND,
      skuArithmetic: Object.freeze(aligned.map(entry => Object.freeze({
        ...entry, sku: Object.freeze({ ...entry.sku }),
        recordedCapacityDelta: difference(entry.capacityUnits, entry.recordedHeldQuantity),
      }))),
      slotArithmetic: Object.freeze({ ...slotIdentity, governingRevision, capacityUnits, recordedHeldQuantity,
        recordedCapacityDelta: difference(capacityUnits, recordedHeldQuantity) }),
    });
    return Object.freeze({ outcome: "derived", value });
  } catch {
    return Object.freeze({ outcome: "invalid" });
  }
}
