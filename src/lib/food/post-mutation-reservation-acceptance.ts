/** FOOD-007W: pure composition of reservation and acceptance evidence. */
import type {
  FoodAuthoritativeCapacityReservationMutationReceipt,
  FoodAuthoritativeCapacityReservationMutationResult,
} from "./d1-authoritative-capacity-reservation-mutation";
import {
  FOOD_RESERVATION_HOLD_COMMAND_KIND,
  type FoodCapacityReservationId,
  type FoodReservationHoldCommand,
} from "./reservation-hold-command";
import {
  FOOD_RESERVATION_CAPACITY_SOURCE_SELECTION_REQUEST_KIND,
} from "./reservation-capacity-source-selection-request";
import {
  validateFoodFulfillmentIntentVersion,
  validateFoodReservationRequestVersion,
} from "./fulfillment-capacity-reservation-domain";
import {
  parseFoodPhysicalOrderId,
  validateFoodPhysicalOrderVersion,
  type FoodPhysicalOrderVersion,
} from "./physical-order-domain";
import { parseFoodSkuId } from "./package-sku-domain";
import { validateFoodVersion } from "./draft-domain";
import {
  createInitialFoodReservationAcceptanceVersion,
  type FoodReservationAcceptanceVersion,
} from "./reservation-acceptance-domain";

export const FOOD_POST_MUTATION_RESERVATION_ACCEPTANCE_KIND =
  "post-mutation-reservation-acceptance" as const;

export type FoodPostMutationReservationAcceptance = Readonly<{
  kind: typeof FOOD_POST_MUTATION_RESERVATION_ACCEPTANCE_KIND;
  reservationOutcome: "created" | "already-present";
  reservation: FoodAuthoritativeCapacityReservationMutationReceipt;
  acceptance: FoodReservationAcceptanceVersion;
}>;

export type FoodPostMutationReservationAcceptanceResult =
  | Readonly<{ outcome: "accepted"; value: FoodPostMutationReservationAcceptance }>
  | Readonly<{
    outcome: "reservation-not-established";
    reservationOutcome: "governing-source-mismatch" | "insufficient-capacity" | "conflict" | "storage-failure";
  }>
  | Readonly<{ outcome: "invalid" }>;

function requireCondition(condition: unknown): asserts condition {
  if (!condition) throw new TypeError("Invalid reservation acceptance composition");
}

// Inspect descriptors before reading values or using any caller array methods.
function capture(input: unknown, ancestors = new Set<object>()): unknown {
  if (input === null || typeof input === "string" || typeof input === "boolean" ||
    (typeof input === "number" && Number.isFinite(input))) return input;
  requireCondition(typeof input === "object" && !ancestors.has(input));
  const array = Array.isArray(input);
  requireCondition(Object.getPrototypeOf(input) === (array ? Array.prototype : Object.prototype));
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const keys = Reflect.ownKeys(descriptors);
  requireCondition(keys.every(key => typeof key === "string"));
  ancestors.add(input);
  try {
    if (array) {
      const length: unknown = descriptors.length?.value;
      requireCondition(typeof length === "number" && Number.isSafeInteger(length) && length >= 0);
      requireCondition(keys.length === length + 1);
      const result: unknown[] = [];
      for (let index = 0; index < length; index++) {
        const descriptor = descriptors[String(index)];
        requireCondition(descriptor && "value" in descriptor);
        result.push(capture(descriptor.value, ancestors));
      }
      return result;
    }
    const result: Record<string, unknown> = {};
    for (const key of keys) {
      requireCondition(typeof key === "string");
      const descriptor = descriptors[key];
      requireCondition(descriptor && "value" in descriptor);
      Object.defineProperty(result, key, {
        value: capture(descriptor.value, ancestors), enumerable: true,
      });
    }
    return result;
  } finally {
    ancestors.delete(input);
  }
}

function record(input: unknown, keys: readonly string[]): Record<string, unknown> {
  requireCondition(input !== null && typeof input === "object" && !Array.isArray(input));
  requireCondition(Object.keys(input).length === keys.length && keys.every(key => Object.hasOwn(input, key)));
  return input as Record<string, unknown>;
}

function positiveInteger(input: unknown): number {
  requireCondition(typeof input === "number" && Number.isSafeInteger(input) && input > 0);
  return input;
}

// Both operands have already been captured or constructed locally. This compares
// exact structure, including array order, without normalizing evidence.
function same(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object" ||
    Array.isArray(left) !== Array.isArray(right)) return false;
  const a = Object.getOwnPropertyDescriptors(left);
  const b = Object.getOwnPropertyDescriptors(right);
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key =>
    Object.hasOwn(b, key) && same(a[key]!.value, b[key]!.value));
}

function validateCommand(input: unknown): FoodReservationHoldCommand {
  const root = record(input, ["kind", "reservationId", "order", "selection"]);
  requireCondition(root.kind === FOOD_RESERVATION_HOLD_COMMAND_KIND);
  requireCondition(typeof root.reservationId === "string");
  const length = Array.from(root.reservationId.split("\0", 1)[0]!).length;
  requireCondition(length >= 1 && length <= 512);
  const order = record(root.order, ["id", "version"]);
  const selection = record(root.selection, ["kind", "request", "fulfillmentIntent", "skuSelections", "slotSelection"]);
  requireCondition(selection.kind === FOOD_RESERVATION_CAPACITY_SOURCE_SELECTION_REQUEST_KIND);
  const request = validateFoodReservationRequestVersion(selection.request);
  const fulfillmentIntent = validateFoodFulfillmentIntentVersion(selection.fulfillmentIntent);
  requireCondition(same(request.fulfillmentIntent, { id: fulfillmentIntent.id, version: fulfillmentIntent.version }));
  requireCondition(same(request.quote, fulfillmentIntent.quote));
  requireCondition(Array.isArray(selection.skuSelections));
  requireCondition(selection.skuSelections.length === request.capacityRequirements.length);
  const skuSelections = selection.skuSelections.map((input: unknown, index: number) => {
    const selected = record(input, ["sku", "revision"]);
    const rawSku = record(selected.sku, ["id", "version"]);
    const sku = Object.freeze({ id: parseFoodSkuId(rawSku.id), version: validateFoodVersion(rawSku.version) });
    requireCondition(same(sku, request.capacityRequirements[index]!.sku));
    return Object.freeze({ sku, revision: positiveInteger(selected.revision) });
  });
  const slot = record(selection.slotSelection, ["method", "locationReference", "windowReference", "revision"]);
  requireCondition(slot.method === fulfillmentIntent.method &&
    slot.locationReference === fulfillmentIntent.locationReference && slot.windowReference === fulfillmentIntent.windowReference);
  return Object.freeze({
    kind: FOOD_RESERVATION_HOLD_COMMAND_KIND,
    reservationId: root.reservationId as FoodCapacityReservationId,
    order: Object.freeze({ id: parseFoodPhysicalOrderId(order.id), version: validateFoodVersion(order.version) }),
    selection: Object.freeze({
      kind: FOOD_RESERVATION_CAPACITY_SOURCE_SELECTION_REQUEST_KIND,
      request, fulfillmentIntent, skuSelections: Object.freeze(skuSelections),
      slotSelection: Object.freeze({
        method: fulfillmentIntent.method, locationReference: fulfillmentIntent.locationReference,
        windowReference: fulfillmentIntent.windowReference, revision: positiveInteger(slot.revision),
      }),
    }),
  });
}

function expectedReceipt(command: FoodReservationHoldCommand): FoodAuthoritativeCapacityReservationMutationReceipt {
  const { request, fulfillmentIntent, skuSelections, slotSelection } = command.selection;
  return Object.freeze({
    kind: "authoritative-capacity-reservation-mutation-receipt",
    reservationId: command.reservationId,
    order: Object.freeze({ ...command.order }),
    reservationRequest: Object.freeze({ id: request.id, version: request.version }),
    fulfillmentIntent: Object.freeze({ id: fulfillmentIntent.id, version: fulfillmentIntent.version }),
    skuClaims: Object.freeze(request.capacityRequirements.map((line, index) => Object.freeze({
      sku: Object.freeze({ ...line.sku }), capacityRevision: skuSelections[index]!.revision, quantity: line.quantity,
    }))),
    slotClaim: Object.freeze({
      method: slotSelection.method, locationReference: slotSelection.locationReference,
      windowReference: slotSelection.windowReference, capacityRevision: slotSelection.revision, quantity: 1,
    }),
  });
}

export function deriveFoodPostMutationReservationAcceptance(
  command: FoodReservationHoldCommand,
  mutationResult: FoodAuthoritativeCapacityReservationMutationResult,
  order: FoodPhysicalOrderVersion,
  identityInput: unknown,
  acceptanceInput: unknown,
): FoodPostMutationReservationAcceptanceResult {
  try {
    const capturedCommand = capture(command);
    const capturedMutation = capture(mutationResult);
    const capturedOrder = capture(order);
    const identity = capture(identityInput);
    const metadata = capture(acceptanceInput);
    const canonical = validateCommand(capturedCommand);
    const exactOrder = validateFoodPhysicalOrderVersion(capturedOrder);
    requireCondition(same(canonical.order, { id: exactOrder.id, version: exactOrder.version }));
    const result = record(capturedMutation,
      Object.hasOwn(recordOutcome(capturedMutation), "value") ? ["outcome", "value"] : ["outcome"]);
    switch (result.outcome) {
      case "invalid":
        requireCondition(!Object.hasOwn(result, "value"));
        return Object.freeze({ outcome: "invalid" });
      case "governing-source-mismatch":
      case "insufficient-capacity":
      case "conflict":
      case "storage-failure":
        requireCondition(!Object.hasOwn(result, "value"));
        return Object.freeze({ outcome: "reservation-not-established", reservationOutcome: result.outcome });
      case "created":
      case "already-present": {
        const reservation = expectedReceipt(canonical);
        requireCondition(same(result.value, reservation));
        const { request, fulfillmentIntent } = canonical.selection;
        requireCondition(same(exactOrder.quote, request.quote));
        requireCondition(same(exactOrder.fulfillmentIntent, {
          id: fulfillmentIntent.id, version: fulfillmentIntent.version, method: fulfillmentIntent.method,
          locationReference: fulfillmentIntent.locationReference, windowReference: fulfillmentIntent.windowReference,
        }));
        requireCondition(same(exactOrder.reservationRequest, {
          id: request.id, version: request.version, capacityRequirements: request.capacityRequirements,
        }));
        const acceptance = createInitialFoodReservationAcceptanceVersion(
          identity, exactOrder, request, fulfillmentIntent, metadata,
        );
        return Object.freeze({
          outcome: "accepted",
          value: Object.freeze({
            kind: FOOD_POST_MUTATION_RESERVATION_ACCEPTANCE_KIND,
            reservationOutcome: result.outcome, reservation, acceptance,
          }),
        });
      }
      default: return Object.freeze({ outcome: "invalid" });
    }
  } catch {
    return Object.freeze({ outcome: "invalid" });
  }
}

function recordOutcome(input: unknown): object {
  requireCondition(input !== null && typeof input === "object" && !Array.isArray(input));
  return input;
}
