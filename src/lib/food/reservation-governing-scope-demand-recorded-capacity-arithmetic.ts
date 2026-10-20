/**
 * FOOD-007T
 *
 * Pure reservation-demand arithmetic over canonical FOOD-007E selection
 * evidence and canonical FOOD-007L recorded-capacity arithmetic.
 *
 * This unit grants no reservation or capacity authority.
 */

import {
  validateFoodFulfillmentIntentVersion,
  validateFoodReservationRequestVersion,
  type FoodFulfillmentIntentVersion,
  type FoodReservationRequestVersion,
} from "./fulfillment-capacity-reservation-domain";

import {
  FOOD_RESERVATION_CAPACITY_SOURCE_SELECTION_REQUEST_KIND,
  type FoodReservationCapacitySourceSelectionRequest,
} from "./reservation-capacity-source-selection-request";

import {
  FOOD_RESERVATION_GOVERNING_SCOPE_RECORDED_CAPACITY_ARITHMETIC_KIND,
  type FoodReservationGoverningScopeRecordedCapacityArithmetic,
} from "./reservation-governing-scope-recorded-capacity-arithmetic";

export const FOOD_RESERVATION_GOVERNING_SCOPE_DEMAND_RECORDED_CAPACITY_ARITHMETIC_KIND =
  "reservation-governing-scope-demand-recorded-capacity-arithmetic" as const;

const SLOT_DEMAND_QUANTITY =
  1 as const;

export type FoodReservationGoverningScopeDemandRecordedCapacitySkuArithmetic =
  Readonly<{
    sku: Readonly<{
      id: string;
      version: number;
    }>;
    governingRevision: number;
    capacityUnits: number;
    recordedHeldQuantity: number;
    recordedCapacityDelta: number;
    demandQuantity: number;
    recordedDemandAdjustedCapacityDelta: number;
  }>;

export type FoodReservationGoverningScopeDemandRecordedCapacitySlotArithmetic =
  Readonly<{
    method:
      | "personal-delivery"
      | "meetup";
    locationReference: string;
    windowReference: string;
    governingRevision: number;
    capacityUnits: number;
    recordedHeldQuantity: number;
    recordedCapacityDelta: number;
    demandQuantity:
      typeof SLOT_DEMAND_QUANTITY;
    recordedDemandAdjustedCapacityDelta: number;
  }>;

export type FoodReservationGoverningScopeDemandRecordedCapacityArithmetic =
  Readonly<{
    kind:
      typeof FOOD_RESERVATION_GOVERNING_SCOPE_DEMAND_RECORDED_CAPACITY_ARITHMETIC_KIND;
    reservationRequest: Readonly<{
      id: string;
      version: number;
    }>;
    fulfillmentIntent: Readonly<{
      id: string;
      version: number;
    }>;
    skuArithmetic:
      readonly FoodReservationGoverningScopeDemandRecordedCapacitySkuArithmetic[];
    slotArithmetic:
      FoodReservationGoverningScopeDemandRecordedCapacitySlotArithmetic;
  }>;

export type FoodReservationGoverningScopeDemandRecordedCapacityArithmeticResult =
  | Readonly<{
      outcome: "derived";
      value:
        FoodReservationGoverningScopeDemandRecordedCapacityArithmetic;
    }>
  | Readonly<{
      outcome: "invalid";
    }>;

type PlainRecord =
  Record<string, unknown>;

type CapturedSkuSelection =
  Readonly<{
    sku: Readonly<{
      id: string;
      version: number;
    }>;
    revision: number;
  }>;

type CapturedSlotSelection =
  Readonly<{
    method:
      | "personal-delivery"
      | "meetup";
    locationReference: string;
    windowReference: string;
    revision: number;
  }>;

type CapturedSelection =
  Readonly<{
    request:
      FoodReservationRequestVersion;
    fulfillmentIntent:
      FoodFulfillmentIntentVersion;
    skuSelections:
      readonly CapturedSkuSelection[];
    slotSelection:
      CapturedSlotSelection;
  }>;

type CapturedSkuArithmetic =
  Readonly<{
    sku: Readonly<{
      id: string;
      version: number;
    }>;
    governingRevision: number;
    capacityUnits: number;
    recordedHeldQuantity: number;
    recordedCapacityDelta: number;
  }>;

type CapturedSlotArithmetic =
  Readonly<{
    method:
      | "personal-delivery"
      | "meetup";
    locationReference: string;
    windowReference: string;
    governingRevision: number;
    capacityUnits: number;
    recordedHeldQuantity: number;
    recordedCapacityDelta: number;
  }>;

type CapturedRecordedArithmetic =
  Readonly<{
    skuArithmetic:
      readonly CapturedSkuArithmetic[];
    slotArithmetic:
      CapturedSlotArithmetic;
  }>;

function capturePlainData(
  input: unknown,
  ancestors:
    Set<object> =
    new Set<object>(),
): unknown {
  if (
    input === null ||
    typeof input ===
      "string" ||
    typeof input ===
      "boolean"
  ) {
    return input;
  }

  if (
    typeof input ===
      "number"
  ) {
    if (
      !Number.isFinite(
        input,
      )
    ) {
      throw new TypeError(
        "Non-finite number",
      );
    }

    return input;
  }

  if (
    typeof input !==
      "object"
  ) {
    throw new TypeError(
      "Unsupported value",
    );
  }

  if (
    ancestors.has(
      input,
    )
  ) {
    throw new TypeError(
      "Cyclic data",
    );
  }

  const array =
    Array.isArray(
      input,
    );

  const prototype =
    Object.getPrototypeOf(
      input,
    );

  if (
    prototype !==
      null &&
    prototype !==
      (
        array
          ? Array.prototype
          : Object.prototype
      )
  ) {
    throw new TypeError(
      "Unexpected prototype",
    );
  }

  ancestors.add(
    input,
  );

  try {
    if (array) {
      const ownKeys =
        Reflect.ownKeys(
          input,
        );

      for (
        const key of
          ownKeys
      ) {
        if (
          typeof key !==
            "string"
        ) {
          throw new TypeError(
            "Unexpected array symbol",
          );
        }

        if (
          key ===
            "length"
        ) {
          continue;
        }

        if (
          !/^(0|[1-9][0-9]*)$/.test(
            key,
          )
        ) {
          throw new TypeError(
            "Unexpected array field",
          );
        }

        const index =
          Number(
            key,
          );

        if (
          !Number.isSafeInteger(
            index,
          ) ||
          index < 0 ||
          index >=
            input.length
        ) {
          throw new TypeError(
            "Unexpected array index",
          );
        }
      }

      const output:
        unknown[] =
        [];

      for (
        let index = 0;
        index <
          input.length;
        index += 1
      ) {
        const descriptor =
          Object.getOwnPropertyDescriptor(
            input,
            String(index),
          );

        if (
          !descriptor ||
          !(
            "value" in
              descriptor
          )
        ) {
          throw new TypeError(
            "Sparse/accessor array",
          );
        }

        output.push(
          capturePlainData(
            descriptor.value,
            ancestors,
          ),
        );
      }

      return output;
    }

    const ownKeys =
      Reflect.ownKeys(
        input,
      );

    const output:
      PlainRecord =
      {};

    for (
      const key of
        ownKeys
    ) {
      if (
        typeof key !==
          "string"
      ) {
        throw new TypeError(
          "Unexpected object symbol",
        );
      }

      const descriptor =
        Object.getOwnPropertyDescriptor(
          input,
          key,
        );

      if (
        !descriptor ||
        !(
          "value" in
            descriptor
        )
      ) {
        throw new TypeError(
          "Accessor field",
        );
      }

      output[key] =
        capturePlainData(
          descriptor.value,
          ancestors,
        );
    }

    return output;
  }
  finally {
    ancestors.delete(
      input,
    );
  }
}

function exactRecord(
  input: unknown,
  keys: readonly string[],
): PlainRecord {
  if (
    input === null ||
    typeof input !==
      "object" ||
    Array.isArray(
      input,
    )
  ) {
    throw new TypeError(
      "Expected record",
    );
  }

  const prototype =
    Object.getPrototypeOf(
      input,
    );

  if (
    prototype !==
      Object.prototype &&
    prototype !==
      null
  ) {
    throw new TypeError(
      "Unexpected record prototype",
    );
  }

  const ownKeys =
    Reflect.ownKeys(
      input,
    );

  if (
    ownKeys.length !==
      keys.length ||
    ownKeys.some(
      (key) =>
        typeof key !==
          "string" ||
        !keys.includes(
          key,
        ),
    )
  ) {
    throw new TypeError(
      "Unexpected record fields",
    );
  }

  const result:
    PlainRecord =
    {};

  for (
    const key of
      keys
  ) {
    const descriptor =
      Object.getOwnPropertyDescriptor(
        input,
        key,
      );

    if (
      !descriptor ||
      !(
        "value" in
          descriptor
      )
    ) {
      throw new TypeError(
        "Expected data field",
      );
    }

    result[key] =
      descriptor.value;
  }

  return result;
}

function denseArray(
  input: unknown,
): readonly unknown[] {
  if (
    !Array.isArray(
      input,
    )
  ) {
    throw new TypeError(
      "Expected array",
    );
  }

  const ownKeys =
    Reflect.ownKeys(
      input,
    );

  for (
    const key of
      ownKeys
  ) {
    if (
      typeof key !==
        "string"
    ) {
      throw new TypeError(
        "Unexpected array symbol",
      );
    }

    if (
      key ===
        "length"
    ) {
      continue;
    }

    if (
      !/^(0|[1-9][0-9]*)$/.test(
        key,
      )
    ) {
      throw new TypeError(
        "Unexpected array field",
      );
    }

    const index =
      Number(
        key,
      );

    if (
      !Number.isSafeInteger(
        index,
      ) ||
      index < 0 ||
      index >=
        input.length
    ) {
      throw new TypeError(
        "Unexpected array index",
      );
    }
  }

  const output:
    unknown[] =
    [];

  for (
    let index = 0;
    index <
      input.length;
    index += 1
  ) {
    const descriptor =
      Object.getOwnPropertyDescriptor(
        input,
        String(index),
      );

    if (
      !descriptor ||
      !(
        "value" in
          descriptor
      )
    ) {
      throw new TypeError(
        "Sparse/accessor array",
      );
    }

    output.push(
      descriptor.value,
    );
  }

  return output;
}

function exactString(
  input: unknown,
): string {
  if (
    typeof input !==
      "string"
  ) {
    throw new TypeError(
      "Expected string",
    );
  }

  return input;
}

function positiveSafeInteger(
  input: unknown,
): number {
  if (
    typeof input !==
      "number" ||
    !Number.isSafeInteger(
      input,
    ) ||
    input < 1
  ) {
    throw new TypeError(
      "Expected positive safe integer",
    );
  }

  return input;
}

function nonnegativeSafeInteger(
  input: unknown,
): number {
  if (
    typeof input !==
      "number" ||
    !Number.isSafeInteger(
      input,
    ) ||
    input < 0
  ) {
    throw new TypeError(
      "Expected nonnegative safe integer",
    );
  }

  return input;
}

function signedSafeInteger(
  input: unknown,
): number {
  if (
    typeof input !==
      "number" ||
    !Number.isSafeInteger(
      input,
    )
  ) {
    throw new TypeError(
      "Expected signed safe integer",
    );
  }

  return input;
}

function method(
  input: unknown,
):
  | "personal-delivery"
  | "meetup" {
  if (
    input !==
      "personal-delivery" &&
    input !==
      "meetup"
  ) {
    throw new TypeError(
      "Unexpected fulfillment method",
    );
  }

  return input;
}

function checkedDifference(
  left: number,
  right: number,
): number {
  const result =
    BigInt(
      left,
    ) -
    BigInt(
      right,
    );

  if (
    result <
      BigInt(
        Number.MIN_SAFE_INTEGER,
      ) ||
    result >
      BigInt(
        Number.MAX_SAFE_INTEGER,
      )
  ) {
    throw new TypeError(
      "Arithmetic result outside safe integer range",
    );
  }

  return Number(
    result,
  );
}

function captureSelection(
  input:
    FoodReservationCapacitySourceSelectionRequest,
): CapturedSelection {
  const captured =
    capturePlainData(
      input,
    );

  const root =
    exactRecord(
      captured,
      [
        "kind",
        "request",
        "fulfillmentIntent",
        "skuSelections",
        "slotSelection",
      ],
    );

  if (
    root.kind !==
      FOOD_RESERVATION_CAPACITY_SOURCE_SELECTION_REQUEST_KIND
  ) {
    throw new TypeError(
      "Unexpected selection kind",
    );
  }

  const request =
    validateFoodReservationRequestVersion(
      root.request,
    );

  const fulfillmentIntent =
    validateFoodFulfillmentIntentVersion(
      root.fulfillmentIntent,
    );

  if (
    request.fulfillmentIntent.id !==
      fulfillmentIntent.id ||
    request.fulfillmentIntent.version !==
      fulfillmentIntent.version ||
    request.quote.id !==
      fulfillmentIntent.quote.id ||
    request.quote.version !==
      fulfillmentIntent.quote.version
  ) {
    throw new TypeError(
      "Request/fulfillment linkage mismatch",
    );
  }

  const selections =
    denseArray(
      root.skuSelections,
    );

  if (
    selections.length !==
      request.capacityRequirements.length
  ) {
    throw new TypeError(
      "Selection/request demand count mismatch",
    );
  }

  const skuSelections:
    CapturedSkuSelection[] =
    [];

  for (
    let index = 0;
    index <
      selections.length;
    index += 1
  ) {
    const requirement =
      request.capacityRequirements[index];

    if (
      requirement ===
        undefined
    ) {
      throw new TypeError(
        "Missing request demand line",
      );
    }

    const selection =
      exactRecord(
        selections[index],
        [
          "sku",
          "revision",
        ],
      );

    const sku =
      exactRecord(
        selection.sku,
        [
          "id",
          "version",
        ],
      );

    const id =
      exactString(
        sku.id,
      );

    const version =
      positiveSafeInteger(
        sku.version,
      );

    if (
      id !==
        requirement.sku.id ||
      version !==
        requirement.sku.version
    ) {
      throw new TypeError(
        "Selection/request SKU mismatch",
      );
    }

    skuSelections.push(
      Object.freeze({
        sku:
          Object.freeze({
            id,
            version,
          }),
        revision:
          positiveSafeInteger(
            selection.revision,
          ),
      }),
    );
  }

  const slot =
    exactRecord(
      root.slotSelection,
      [
        "method",
        "locationReference",
        "windowReference",
        "revision",
      ],
    );

  const slotSelection:
    CapturedSlotSelection =
    Object.freeze({
      method:
        method(
          slot.method,
        ),
      locationReference:
        exactString(
          slot.locationReference,
        ),
      windowReference:
        exactString(
          slot.windowReference,
        ),
      revision:
        positiveSafeInteger(
          slot.revision,
        ),
    });

  if (
    slotSelection.method !==
      fulfillmentIntent.method ||
    slotSelection.locationReference !==
      fulfillmentIntent.locationReference ||
    slotSelection.windowReference !==
      fulfillmentIntent.windowReference
  ) {
    throw new TypeError(
      "Selection/fulfillment slot mismatch",
    );
  }

  return Object.freeze({
    request,
    fulfillmentIntent,
    skuSelections:
      Object.freeze(
        skuSelections,
      ),
    slotSelection,
  });
}

function captureRecordedArithmetic(
  input:
    FoodReservationGoverningScopeRecordedCapacityArithmetic,
): CapturedRecordedArithmetic {
  const captured =
    capturePlainData(
      input,
    );

  const root =
    exactRecord(
      captured,
      [
        "kind",
        "skuArithmetic",
        "slotArithmetic",
      ],
    );

  if (
    root.kind !==
      FOOD_RESERVATION_GOVERNING_SCOPE_RECORDED_CAPACITY_ARITHMETIC_KIND
  ) {
    throw new TypeError(
      "Unexpected recorded arithmetic kind",
    );
  }

  const rawSkuArithmetic =
    denseArray(
      root.skuArithmetic,
    );

  const skuArithmetic:
    CapturedSkuArithmetic[] =
    [];

  for (
    const raw of
      rawSkuArithmetic
  ) {
    const value =
      exactRecord(
        raw,
        [
          "sku",
          "governingRevision",
          "capacityUnits",
          "recordedHeldQuantity",
          "recordedCapacityDelta",
        ],
      );

    const rawSku =
      exactRecord(
        value.sku,
        [
          "id",
          "version",
        ],
      );

    const capacityUnits =
      nonnegativeSafeInteger(
        value.capacityUnits,
      );

    const recordedHeldQuantity =
      nonnegativeSafeInteger(
        value.recordedHeldQuantity,
      );

    const recordedCapacityDelta =
      signedSafeInteger(
        value.recordedCapacityDelta,
      );

    if (
      checkedDifference(
        capacityUnits,
        recordedHeldQuantity,
      ) !==
        recordedCapacityDelta
    ) {
      throw new TypeError(
        "Inconsistent recorded SKU arithmetic",
      );
    }

    skuArithmetic.push(
      Object.freeze({
        sku:
          Object.freeze({
            id:
              exactString(
                rawSku.id,
              ),
            version:
              positiveSafeInteger(
                rawSku.version,
              ),
          }),
        governingRevision:
          positiveSafeInteger(
            value.governingRevision,
          ),
        capacityUnits,
        recordedHeldQuantity,
        recordedCapacityDelta,
      }),
    );
  }

  const rawSlot =
    exactRecord(
      root.slotArithmetic,
      [
        "method",
        "locationReference",
        "windowReference",
        "governingRevision",
        "capacityUnits",
        "recordedHeldQuantity",
        "recordedCapacityDelta",
      ],
    );

  const slotCapacityUnits =
    nonnegativeSafeInteger(
      rawSlot.capacityUnits,
    );

  const slotRecordedHeldQuantity =
    nonnegativeSafeInteger(
      rawSlot.recordedHeldQuantity,
    );

  const slotRecordedCapacityDelta =
    signedSafeInteger(
      rawSlot.recordedCapacityDelta,
    );

  if (
    checkedDifference(
      slotCapacityUnits,
      slotRecordedHeldQuantity,
    ) !==
      slotRecordedCapacityDelta
  ) {
    throw new TypeError(
      "Inconsistent recorded slot arithmetic",
    );
  }

  return Object.freeze({
    skuArithmetic:
      Object.freeze(
        skuArithmetic,
      ),
    slotArithmetic:
      Object.freeze({
        method:
          method(
            rawSlot.method,
          ),
        locationReference:
          exactString(
            rawSlot.locationReference,
          ),
        windowReference:
          exactString(
            rawSlot.windowReference,
          ),
        governingRevision:
          positiveSafeInteger(
            rawSlot.governingRevision,
          ),
        capacityUnits:
          slotCapacityUnits,
        recordedHeldQuantity:
          slotRecordedHeldQuantity,
        recordedCapacityDelta:
          slotRecordedCapacityDelta,
      }),
  });
}

function requireCanonicalCondition(condition: unknown): asserts condition {
  if (!condition) throw new TypeError("Invalid governing-scope evidence");
}

function captureCanonicalInput(input: unknown, ancestors: readonly object[] = []): unknown {
  if (input === null || typeof input === "string" || typeof input === "boolean") return input;
  if (typeof input === "number") {
    requireCanonicalCondition(Number.isFinite(input));
    return input;
  }
  requireCanonicalCondition(typeof input === "object" && !ancestors.includes(input));
  const array = Array.isArray(input);
  requireCanonicalCondition(Object.getPrototypeOf(input) === (array ? Array.prototype : Object.prototype));
  const keys = Reflect.ownKeys(input);
  requireCanonicalCondition(keys.every(key => typeof key === "string"));
  const path = [...ancestors, input];
  if (array) {
    const lengthDescriptor = Object.getOwnPropertyDescriptor(input, "length");
    requireCanonicalCondition(lengthDescriptor && "value" in lengthDescriptor);
    const length: unknown = lengthDescriptor.value;
    requireCanonicalCondition(typeof length === "number" && Number.isSafeInteger(length) && length >= 0 && keys.length === length + 1);
    const result: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
      requireCanonicalCondition(descriptor && "value" in descriptor);
      result.push(captureCanonicalInput(descriptor.value, path));
    }
    return result;
  }
  const entries: [string, unknown][] = [];
  for (const key of keys) {
    requireCanonicalCondition(typeof key === "string");
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    requireCanonicalCondition(descriptor && "value" in descriptor);
    entries.push([key, captureCanonicalInput(descriptor.value, path)]);
  }
  return Object.fromEntries(entries);
}

export function deriveFoodReservationGoverningScopeDemandRecordedCapacityArithmetic(
  selectionRequest:
    FoodReservationCapacitySourceSelectionRequest,
  recordedCapacityArithmetic:
    FoodReservationGoverningScopeRecordedCapacityArithmetic,
): FoodReservationGoverningScopeDemandRecordedCapacityArithmeticResult {
  /*
   * FOOD-007T hardened trust boundary:
   * clone both caller-owned artifacts through 007S descriptor capture
   * before any legacy 007M-derived validator/correlation logic can read them.
   */
  try {
    selectionRequest =
      captureCanonicalInput(
        selectionRequest,
      ) as FoodReservationCapacitySourceSelectionRequest;

    recordedCapacityArithmetic =
      captureCanonicalInput(
        recordedCapacityArithmetic,
      ) as FoodReservationGoverningScopeRecordedCapacityArithmetic;
  }
  catch {
    return Object.freeze({
      outcome: "invalid",
    });
  }
  let selection:
    CapturedSelection;

  let arithmetic:
    CapturedRecordedArithmetic;

  try {
    selection =
      captureSelection(
        selectionRequest,
      );

    arithmetic =
      captureRecordedArithmetic(
        recordedCapacityArithmetic,
      );
  }
  catch {
    return Object.freeze({
      outcome:
        "invalid",
    });
  }

  if (
    selection.skuSelections.length !==
      arithmetic.skuArithmetic.length ||
    selection.request.capacityRequirements.length !==
      arithmetic.skuArithmetic.length
  ) {
    return Object.freeze({
      outcome:
        "invalid",
    });
  }

  try {
    const skuArithmetic:
      FoodReservationGoverningScopeDemandRecordedCapacitySkuArithmetic[] =
      [];

    for (
      let index = 0;
      index <
        arithmetic.skuArithmetic.length;
      index += 1
    ) {
      const demand =
        selection.request.capacityRequirements[index];

      const selected =
        selection.skuSelections[index];

      const recorded =
        arithmetic.skuArithmetic[index];

      if (
        demand ===
          undefined ||
        selected ===
          undefined ||
        recorded ===
          undefined
      ) {
        return Object.freeze({
          outcome:
            "invalid",
        });
      }

      if (
        demand.sku.id !==
          selected.sku.id ||
        demand.sku.version !==
          selected.sku.version ||
        recorded.sku.id !==
          selected.sku.id ||
        recorded.sku.version !==
          selected.sku.version ||
        recorded.governingRevision !==
          selected.revision
      ) {
        return Object.freeze({
          outcome:
            "invalid",
        });
      }

      const demandQuantity =
        positiveSafeInteger(
          demand.quantity,
        );

      skuArithmetic.push(
        Object.freeze({
          sku:
            Object.freeze({
              id:
                recorded.sku.id,
              version:
                recorded.sku.version,
            }),
          governingRevision:
            recorded.governingRevision,
          capacityUnits:
            recorded.capacityUnits,
          recordedHeldQuantity:
            recorded.recordedHeldQuantity,
          recordedCapacityDelta:
            recorded.recordedCapacityDelta,
          demandQuantity,
          recordedDemandAdjustedCapacityDelta:
            checkedDifference(
              recorded.recordedCapacityDelta,
              demandQuantity,
            ),
        }),
      );
    }

    const selectedSlot =
      selection.slotSelection;

    const recordedSlot =
      arithmetic.slotArithmetic;

    if (
      selectedSlot.method !==
        recordedSlot.method ||
      selectedSlot.locationReference !==
        recordedSlot.locationReference ||
      selectedSlot.windowReference !==
        recordedSlot.windowReference ||
      selectedSlot.revision !==
        recordedSlot.governingRevision
    ) {
      return Object.freeze({
        outcome:
          "invalid",
      });
    }

    const value:
      FoodReservationGoverningScopeDemandRecordedCapacityArithmetic =
      Object.freeze({
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
              recordedSlot.method,
            locationReference:
              recordedSlot.locationReference,
            windowReference:
              recordedSlot.windowReference,
            governingRevision:
              recordedSlot.governingRevision,
            capacityUnits:
              recordedSlot.capacityUnits,
            recordedHeldQuantity:
              recordedSlot.recordedHeldQuantity,
            recordedCapacityDelta:
              recordedSlot.recordedCapacityDelta,
            demandQuantity:
              SLOT_DEMAND_QUANTITY,
            recordedDemandAdjustedCapacityDelta:
              checkedDifference(
                recordedSlot.recordedCapacityDelta,
                SLOT_DEMAND_QUANTITY,
              ),
          }),
      });

    return Object.freeze({
      outcome:
        "derived",
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