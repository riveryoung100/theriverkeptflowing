/**
 * FOOD-007U
 *
 * Pure synchronous governing-scope capacity admission evaluation.
 *
 * This unit assigns admission meaning only after strict correlation of
 * canonical FOOD-007E selection/demand context with canonical FOOD-007T
 * governing-scope demand-adjusted recorded-capacity evidence.
 *
 * It performs no persistence, mutation, acceptance or concurrency control.
 */

import {
  FOOD_RESERVATION_CAPACITY_SOURCE_SELECTION_REQUEST_KIND,
  type FoodReservationCapacitySourceSelectionRequest,
} from "./reservation-capacity-source-selection-request";
import {
  validateFoodFulfillmentIntentVersion,
  validateFoodReservationRequestVersion,
} from "./fulfillment-capacity-reservation-domain";
import {
  FOOD_RESERVATION_GOVERNING_SCOPE_DEMAND_RECORDED_CAPACITY_ARITHMETIC_KIND,
  type FoodReservationGoverningScopeDemandRecordedCapacityArithmetic,
} from "./reservation-governing-scope-demand-recorded-capacity-arithmetic";

export const FOOD_RESERVATION_GOVERNING_SCOPE_CAPACITY_ADMISSION_EVALUATION_KIND =
  "reservation-governing-scope-capacity-admission-evaluation" as const;

const POLICY_VERSION = 1 as const;
const SLOT_DEMAND_QUANTITY = 1 as const;

type SelectionRequest =
  FoodReservationCapacitySourceSelectionRequest;

type Arithmetic =
  FoodReservationGoverningScopeDemandRecordedCapacityArithmetic;

type SelectionSku =
  SelectionRequest["skuSelections"][number]["sku"];

type ReservationRequestId =
  SelectionRequest["request"]["id"];

type FulfillmentIntentId =
  SelectionRequest["fulfillmentIntent"]["id"];

type FulfillmentMethod =
  SelectionRequest["slotSelection"]["method"];

export type FoodReservationGoverningScopeCapacitySkuAdmission =
  Readonly<{
    sku: Readonly<{
      id: SelectionSku["id"];
      version: number;
    }>;
    governingRevision: number;
    recordedDemandAdjustedCapacityDelta: number;
    admissible: boolean;
  }>;

export type FoodReservationGoverningScopeCapacitySlotAdmission =
  Readonly<{
    method: FulfillmentMethod;
    locationReference: string;
    windowReference: string;
    governingRevision: number;
    recordedDemandAdjustedCapacityDelta: number;
    admissible: boolean;
  }>;

export type FoodReservationGoverningScopeCapacityAdmissionEvaluation =
  Readonly<{
    kind:
      typeof FOOD_RESERVATION_GOVERNING_SCOPE_CAPACITY_ADMISSION_EVALUATION_KIND;
    policyVersion: typeof POLICY_VERSION;
    reservationRequest: Readonly<{
      id: ReservationRequestId;
      version: number;
    }>;
    fulfillmentIntent: Readonly<{
      id: FulfillmentIntentId;
      version: number;
    }>;
    skuAdmissions:
      readonly FoodReservationGoverningScopeCapacitySkuAdmission[];
    slotAdmission:
      FoodReservationGoverningScopeCapacitySlotAdmission;
  }>;

export type FoodReservationGoverningScopeCapacityAdmissionEvaluationResult =
  | Readonly<{
      outcome: "admissible";
      value:
        FoodReservationGoverningScopeCapacityAdmissionEvaluation;
    }>
  | Readonly<{
      outcome: "insufficient-capacity";
      value:
        FoodReservationGoverningScopeCapacityAdmissionEvaluation;
    }>
  | Readonly<{
      outcome: "invalid";
    }>;

function requireCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new TypeError(message);
  }
}

/**
 * Capture caller input using own property descriptors only.
 *
 * In particular:
 * - caller object prototype must be exactly Object.prototype;
 * - caller array prototype must be exactly Array.prototype;
 * - accessors are rejected without invocation;
 * - caller array iterators are never consulted;
 * - sparse / extended arrays are rejected;
 * - cycles and unsupported values are rejected.
 */
function capture(
  input: unknown,
  ancestors: readonly object[] = [],
): unknown {
  if (
    input === null ||
    typeof input === "string" ||
    typeof input === "boolean"
  ) {
    return input;
  }

  if (
    typeof input === "number" &&
    Number.isFinite(input)
  ) {
    return input;
  }

  requireCondition(
    typeof input === "object",
    "Expected plain data",
  );

  requireCondition(
    !ancestors.includes(input),
    "Cycles are unsupported",
  );

  const array =
    Array.isArray(input);

  requireCondition(
    Object.getPrototypeOf(input) ===
      (array
        ? Array.prototype
        : Object.prototype),
    "Unexpected prototype",
  );

  const descriptors =
    Object.getOwnPropertyDescriptors(input);

  const keys =
    Reflect.ownKeys(descriptors);

  requireCondition(
    keys.every(
      (key) =>
        typeof key === "string",
    ),
    "Symbol property",
  );

  const nextAncestors =
    [...ancestors, input];

  if (array) {
    const lengthDescriptor =
      descriptors.length;

    requireCondition(
      Boolean(lengthDescriptor) &&
        "value" in lengthDescriptor,
      "Missing array length",
    );

    const length =
      lengthDescriptor.value;

    requireCondition(
      Number.isSafeInteger(length) &&
        length >= 0,
      "Invalid array length",
    );

    requireCondition(
      keys.length === length + 1,
      "Sparse or extended array",
    );

    const result: unknown[] = [];

    for (
      let index = 0;
      index < length;
      index += 1
    ) {
      const descriptor =
        descriptors[String(index)];

      requireCondition(
        Boolean(descriptor) &&
          "value" in descriptor,
        "Invalid array element",
      );

      result.push(
        capture(
          descriptor.value,
          nextAncestors,
        ),
      );
    }

    return result;
  }

  const result: Record<string, unknown> = {};

  for (const key of keys) {
    requireCondition(
      typeof key === "string",
      "Unexpected property key",
    );

    const descriptor =
      descriptors[key];

    requireCondition(
      Boolean(descriptor) &&
        "value" in descriptor,
      "Accessor property",
    );

    result[key] =
      capture(
        descriptor.value,
        nextAncestors,
      );
  }

  return result;
}

function record(
  input: unknown,
  message: string,
): Record<string, unknown> {
  requireCondition(
    input !== null &&
      typeof input === "object" &&
      !Array.isArray(input),
    message,
  );

  return input as Record<string, unknown>;
}

function array(
  input: unknown,
  message: string,
): unknown[] {
  requireCondition(
    Array.isArray(input),
    message,
  );

  return input;
}

function exactKeys(
  input: Record<string, unknown>,
  expected: readonly string[],
  message: string,
): void {
  const actual =
    Object.keys(input);

  requireCondition(
    actual.length === expected.length &&
      expected.every(
        (key) =>
          Object.hasOwn(input, key),
      ),
    message,
  );
}

function positiveSafeInteger(
  input: unknown,
  message: string,
): number {
  requireCondition(
    typeof input === "number" &&
      Number.isSafeInteger(input) &&
      input > 0,
    message,
  );

  return input;
}

function nonnegativeSafeInteger(
  input: unknown,
  message: string,
): number {
  requireCondition(
    typeof input === "number" &&
      Number.isSafeInteger(input) &&
      input >= 0,
    message,
  );

  return input;
}

function signedSafeInteger(
  input: unknown,
  message: string,
): number {
  requireCondition(
    typeof input === "number" &&
      Number.isSafeInteger(input),
    message,
  );

  return input;
}

function checkedDifference(
  left: number,
  right: number,
  message: string,
): number {
  const result =
    BigInt(left) - BigInt(right);

  requireCondition(
    result >= BigInt(Number.MIN_SAFE_INTEGER) &&
      result <= BigInt(Number.MAX_SAFE_INTEGER),
    message,
  );

  return Number(result);
}

function sameIdentity(
  left: Readonly<{
    id: string;
    version: number;
  }>,
  right: Readonly<{
    id: string;
    version: number;
  }>,
): boolean {
  return (
    left.id === right.id &&
    left.version === right.version
  );
}

function validateSelectionRequest(
  input: unknown,
): SelectionRequest {
  const root =
    record(
      capture(input),
      "Expected FOOD-007E selection request",
    );

  exactKeys(
    root,
    [
      "kind",
      "request",
      "fulfillmentIntent",
      "skuSelections",
      "slotSelection",
    ],
    "Unexpected FOOD-007E root fields",
  );

  requireCondition(
    root.kind ===
      FOOD_RESERVATION_CAPACITY_SOURCE_SELECTION_REQUEST_KIND,
    "Unexpected FOOD-007E kind",
  );

  const request =
    validateFoodReservationRequestVersion(
      root.request,
    );

  const fulfillmentIntent =
    validateFoodFulfillmentIntentVersion(
      root.fulfillmentIntent,
    );

  requireCondition(
    sameIdentity(
      request.fulfillmentIntent,
      fulfillmentIntent,
    ),
    "Request/intent identity mismatch",
  );

  requireCondition(
    sameIdentity(
      request.quote,
      fulfillmentIntent.quote,
    ),
    "Request/intent quote mismatch",
  );

  const rawSelections =
    array(
      root.skuSelections,
      "Expected SKU selections",
    );

  requireCondition(
    rawSelections.length ===
      request.capacityRequirements.length,
    "Selection/demand count mismatch",
  );

  const skuSelections =
    rawSelections.map(
      (
        rawSelection,
        index,
      ) => {
        const selection =
          record(
            rawSelection,
            "Expected SKU selection",
          );

        exactKeys(
          selection,
          [
            "sku",
            "revision",
          ],
          "Unexpected SKU selection fields",
        );

        const sku =
          record(
            selection.sku,
            "Expected selected SKU",
          );

        exactKeys(
          sku,
          [
            "id",
            "version",
          ],
          "Unexpected selected SKU fields",
        );

        const demand =
          request.capacityRequirements[index];

        requireCondition(
          Boolean(demand),
          "Missing request demand",
        );

        requireCondition(
          sku.id === demand.sku.id &&
            sku.version === demand.sku.version,
          "Selected SKU does not match demand order",
        );

        const revision =
          positiveSafeInteger(
            selection.revision,
            "Invalid selected SKU revision",
          );

        return Object.freeze({
          sku:
            Object.freeze({
              id:
                demand.sku.id,
              version:
                demand.sku.version,
            }),
          revision,
        });
      },
    );

  const rawSlot =
    record(
      root.slotSelection,
      "Expected slot selection",
    );

  exactKeys(
    rawSlot,
    [
      "method",
      "locationReference",
      "windowReference",
      "revision",
    ],
    "Unexpected slot selection fields",
  );

  requireCondition(
    rawSlot.method ===
      fulfillmentIntent.method,
    "Slot method mismatch",
  );

  requireCondition(
    rawSlot.locationReference ===
      fulfillmentIntent.locationReference,
    "Slot location mismatch",
  );

  requireCondition(
    rawSlot.windowReference ===
      fulfillmentIntent.windowReference,
    "Slot window mismatch",
  );

  const slotRevision =
    positiveSafeInteger(
      rawSlot.revision,
      "Invalid slot revision",
    );

  return Object.freeze({
    kind:
      FOOD_RESERVATION_CAPACITY_SOURCE_SELECTION_REQUEST_KIND,
    request,
    fulfillmentIntent,
    skuSelections:
      Object.freeze(
        skuSelections,
      ),
    slotSelection:
      Object.freeze({
        method:
          fulfillmentIntent.method,
        locationReference:
          fulfillmentIntent.locationReference,
        windowReference:
          fulfillmentIntent.windowReference,
        revision:
          slotRevision,
      }),
  });
}

function validateArithmetic(
  input: unknown,
  selection: SelectionRequest,
): Arithmetic {
  const root =
    record(
      capture(input),
      "Expected FOOD-007T arithmetic",
    );

  exactKeys(
    root,
    [
      "kind",
      "reservationRequest",
      "fulfillmentIntent",
      "skuArithmetic",
      "slotArithmetic",
    ],
    "Unexpected FOOD-007T root fields",
  );

  requireCondition(
    root.kind ===
      FOOD_RESERVATION_GOVERNING_SCOPE_DEMAND_RECORDED_CAPACITY_ARITHMETIC_KIND,
    "Unexpected FOOD-007T kind",
  );

  const requestIdentity =
    record(
      root.reservationRequest,
      "Expected reservation-request identity",
    );

  exactKeys(
    requestIdentity,
    [
      "id",
      "version",
    ],
    "Unexpected reservation-request identity fields",
  );

  requireCondition(
    requestIdentity.id ===
      selection.request.id &&
      requestIdentity.version ===
        selection.request.version,
    "FOOD-007E/FOOD-007T request mismatch",
  );

  const intentIdentity =
    record(
      root.fulfillmentIntent,
      "Expected fulfillment-intent identity",
    );

  exactKeys(
    intentIdentity,
    [
      "id",
      "version",
    ],
    "Unexpected fulfillment-intent identity fields",
  );

  requireCondition(
    intentIdentity.id ===
      selection.fulfillmentIntent.id &&
      intentIdentity.version ===
        selection.fulfillmentIntent.version,
    "FOOD-007E/FOOD-007T intent mismatch",
  );

  const rawSkuArithmetic =
    array(
      root.skuArithmetic,
      "Expected SKU arithmetic",
    );

  requireCondition(
    rawSkuArithmetic.length ===
      selection.request.capacityRequirements.length &&
      rawSkuArithmetic.length ===
        selection.skuSelections.length,
    "FOOD-007E/FOOD-007T SKU count mismatch",
  );

  const skuArithmetic =
    rawSkuArithmetic.map(
      (
        rawEntry,
        index,
      ) => {
        const entry =
          record(
            rawEntry,
            "Expected SKU arithmetic entry",
          );

        exactKeys(
          entry,
          [
            "sku",
            "governingRevision",
            "capacityUnits",
            "recordedHeldQuantity",
            "recordedCapacityDelta",
            "demandQuantity",
            "recordedDemandAdjustedCapacityDelta",
          ],
          "Unexpected SKU arithmetic fields",
        );

        const rawSku =
          record(
            entry.sku,
            "Expected arithmetic SKU",
          );

        exactKeys(
          rawSku,
          [
            "id",
            "version",
          ],
          "Unexpected arithmetic SKU fields",
        );

        const demand =
          selection.request.capacityRequirements[index];

        const selected =
          selection.skuSelections[index];

        requireCondition(
          Boolean(demand) &&
            Boolean(selected),
          "Missing correlated SKU",
        );

        requireCondition(
          rawSku.id ===
            demand.sku.id &&
            rawSku.version ===
              demand.sku.version &&
            rawSku.id ===
              selected.sku.id &&
            rawSku.version ===
              selected.sku.version,
          "FOOD-007E/FOOD-007T SKU mismatch",
        );

        const governingRevision =
          positiveSafeInteger(
            entry.governingRevision,
            "Invalid governingRevision",
          );

        requireCondition(
          governingRevision ===
            selected.revision,
          "Selected revision/governingRevision mismatch",
        );

        const capacityUnits =
          nonnegativeSafeInteger(
            entry.capacityUnits,
            "Invalid capacityUnits",
          );

        const recordedHeldQuantity =
          nonnegativeSafeInteger(
            entry.recordedHeldQuantity,
            "Invalid recordedHeldQuantity",
          );

        const recordedCapacityDelta =
          signedSafeInteger(
            entry.recordedCapacityDelta,
            "Invalid recordedCapacityDelta",
          );

        const expectedRecordedCapacityDelta =
          checkedDifference(
            capacityUnits,
            recordedHeldQuantity,
            "recordedCapacityDelta overflow",
          );

        requireCondition(
          recordedCapacityDelta ===
            expectedRecordedCapacityDelta,
          "Invalid recordedCapacityDelta identity",
        );

        const demandQuantity =
          positiveSafeInteger(
            entry.demandQuantity,
            "Invalid demandQuantity",
          );

        requireCondition(
          demandQuantity ===
            demand.quantity,
          "FOOD-007E/FOOD-007T demand mismatch",
        );

        const recordedDemandAdjustedCapacityDelta =
          signedSafeInteger(
            entry.recordedDemandAdjustedCapacityDelta,
            "Invalid recordedDemandAdjustedCapacityDelta",
          );

        const expectedAdjusted =
          checkedDifference(
            recordedCapacityDelta,
            demandQuantity,
            "Demand-adjusted delta overflow",
          );

        requireCondition(
          recordedDemandAdjustedCapacityDelta ===
            expectedAdjusted,
          "Invalid demand-adjusted arithmetic identity",
        );

        return Object.freeze({
          sku:
            Object.freeze({
              id:
                selected.sku.id,
              version:
                selected.sku.version,
            }),
          governingRevision,
          capacityUnits,
          recordedHeldQuantity,
          recordedCapacityDelta,
          demandQuantity,
          recordedDemandAdjustedCapacityDelta,
        });
      },
    );

  const rawSlot =
    record(
      root.slotArithmetic,
      "Expected slot arithmetic",
    );

  exactKeys(
    rawSlot,
    [
      "method",
      "locationReference",
      "windowReference",
      "governingRevision",
      "capacityUnits",
      "recordedHeldQuantity",
      "recordedCapacityDelta",
      "demandQuantity",
      "recordedDemandAdjustedCapacityDelta",
    ],
    "Unexpected slot arithmetic fields",
  );

  requireCondition(
    rawSlot.method ===
      selection.slotSelection.method,
    "FOOD-007E/FOOD-007T slot method mismatch",
  );

  requireCondition(
    rawSlot.locationReference ===
      selection.slotSelection.locationReference,
    "FOOD-007E/FOOD-007T slot location mismatch",
  );

  requireCondition(
    rawSlot.windowReference ===
      selection.slotSelection.windowReference,
    "FOOD-007E/FOOD-007T slot window mismatch",
  );

  const slotGoverningRevision =
    positiveSafeInteger(
      rawSlot.governingRevision,
      "Invalid slot governingRevision",
    );

  requireCondition(
    slotGoverningRevision ===
      selection.slotSelection.revision,
    "Selected slot revision/governingRevision mismatch",
  );

  const slotCapacityUnits =
    nonnegativeSafeInteger(
      rawSlot.capacityUnits,
      "Invalid slot capacityUnits",
    );

  const slotRecordedHeldQuantity =
    nonnegativeSafeInteger(
      rawSlot.recordedHeldQuantity,
      "Invalid slot recordedHeldQuantity",
    );

  const slotRecordedCapacityDelta =
    signedSafeInteger(
      rawSlot.recordedCapacityDelta,
      "Invalid slot recordedCapacityDelta",
    );

  const expectedSlotRecordedCapacityDelta =
    checkedDifference(
      slotCapacityUnits,
      slotRecordedHeldQuantity,
      "Slot recordedCapacityDelta overflow",
    );

  requireCondition(
    slotRecordedCapacityDelta ===
      expectedSlotRecordedCapacityDelta,
    "Invalid slot recordedCapacityDelta identity",
  );

  const slotDemandQuantity =
    positiveSafeInteger(
      rawSlot.demandQuantity,
      "Invalid slot demandQuantity",
    );

  requireCondition(
    slotDemandQuantity ===
      SLOT_DEMAND_QUANTITY,
    "Slot demandQuantity must equal 1",
  );

  const slotAdjusted =
    signedSafeInteger(
      rawSlot.recordedDemandAdjustedCapacityDelta,
      "Invalid slot recordedDemandAdjustedCapacityDelta",
    );

  const expectedSlotAdjusted =
    checkedDifference(
      slotRecordedCapacityDelta,
      SLOT_DEMAND_QUANTITY,
      "Slot demand-adjusted delta overflow",
    );

  requireCondition(
    slotAdjusted ===
      expectedSlotAdjusted,
    "Invalid slot demand-adjusted arithmetic identity",
  );

  return Object.freeze({
    kind:
      FOOD_RESERVATION_GOVERNING_SCOPE_DEMAND_RECORDED_CAPACITY_ARITHMETIC_KIND,
    reservationRequest:
      Object.freeze({
        id:
          selection.request.id,
        version:
          selection.request.version,
      }),
    fulfillmentIntent:
      Object.freeze({
        id:
          selection.fulfillmentIntent.id,
        version:
          selection.fulfillmentIntent.version,
      }),
    skuArithmetic:
      Object.freeze(
        skuArithmetic,
      ),
    slotArithmetic:
      Object.freeze({
        method:
          selection.slotSelection.method,
        locationReference:
          selection.slotSelection.locationReference,
        windowReference:
          selection.slotSelection.windowReference,
        governingRevision:
          slotGoverningRevision,
        capacityUnits:
          slotCapacityUnits,
        recordedHeldQuantity:
          slotRecordedHeldQuantity,
        recordedCapacityDelta:
          slotRecordedCapacityDelta,
        demandQuantity:
          SLOT_DEMAND_QUANTITY,
        recordedDemandAdjustedCapacityDelta:
          slotAdjusted,
      }),
  });
}

export function evaluateFoodReservationGoverningScopeCapacityAdmission(
  selectionRequest:
    FoodReservationCapacitySourceSelectionRequest,
  arithmetic:
    FoodReservationGoverningScopeDemandRecordedCapacityArithmetic,
): FoodReservationGoverningScopeCapacityAdmissionEvaluationResult {
  try {
    const selection =
      validateSelectionRequest(
        selectionRequest,
      );

    const validatedArithmetic =
      validateArithmetic(
        arithmetic,
        selection,
      );

    const skuAdmissions =
      Object.freeze(
        validatedArithmetic.skuArithmetic.map(
          (entry, index) =>
            Object.freeze({
              sku:
                Object.freeze({
                  id:
                    selection.skuSelections[index]!.sku.id,
                  version:
                    selection.skuSelections[index]!.sku.version,
                }),
              governingRevision:
                entry.governingRevision,
              recordedDemandAdjustedCapacityDelta:
                entry.recordedDemandAdjustedCapacityDelta,
              admissible:
                entry.recordedDemandAdjustedCapacityDelta >=
                0,
            }),
        ),
      );

    const slotAdmission =
      Object.freeze({
        method:
          validatedArithmetic.slotArithmetic.method,
        locationReference:
          validatedArithmetic.slotArithmetic.locationReference,
        windowReference:
          validatedArithmetic.slotArithmetic.windowReference,
        governingRevision:
          validatedArithmetic.slotArithmetic.governingRevision,
        recordedDemandAdjustedCapacityDelta:
          validatedArithmetic.slotArithmetic
            .recordedDemandAdjustedCapacityDelta,
        admissible:
          validatedArithmetic.slotArithmetic
            .recordedDemandAdjustedCapacityDelta >=
          0,
      });

    const value:
      FoodReservationGoverningScopeCapacityAdmissionEvaluation =
      Object.freeze({
        kind:
          FOOD_RESERVATION_GOVERNING_SCOPE_CAPACITY_ADMISSION_EVALUATION_KIND,
        policyVersion:
          POLICY_VERSION,
        reservationRequest:
          Object.freeze({
            id:
              selection.request.id,
            version:
              selection.request.version,
          }),
        fulfillmentIntent:
          Object.freeze({
            id:
              selection.fulfillmentIntent.id,
            version:
              selection.fulfillmentIntent.version,
          }),
        skuAdmissions,
        slotAdmission,
      });

    const admissible =
      skuAdmissions.every(
        (entry) =>
          entry.admissible,
      ) &&
      slotAdmission.admissible;

    if (admissible) {
      return Object.freeze({
        outcome:
          "admissible",
        value,
      });
    }

    return Object.freeze({
      outcome:
        "insufficient-capacity",
      value,
    });
  }
  catch {
    return Object.freeze({
      outcome:
        "invalid",
    });
  }
}
