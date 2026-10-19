/**
 * FOOD-007L
 *
 * Pure same-exact-revision arithmetic over canonical capacity-source evidence
 * and canonical recorded-held commitment evidence.
 */

import {
  validateFoodExactSkuStockedCapacitySourceRevision,
} from "./exact-sku-stocked-capacity-source-domain";

import {
  validateFoodFulfillmentSlotCapacitySourceRevision,
} from "./fulfillment-slot-capacity-source-domain";

import type {
  FoodReservationCapacitySourceSelectionResolution,
} from "./reservation-capacity-source-selection-resolution";

import {
  FOOD_RESERVATION_CAPACITY_SOURCE_LATEST_RECORDED_SELECTION_VALIDATION_KIND,
} from "./reservation-capacity-source-latest-recorded-selection-validation";

import {
  FOOD_RESERVATION_SELECTION_RECORDED_HELD_COMMITMENT_RESOLUTION_KIND,
  type FoodReservationSelectionRecordedHeldCommitmentResolution,
} from "./reservation-selection-recorded-held-commitment-resolution";

export const FOOD_RESERVATION_SELECTION_RECORDED_CAPACITY_ARITHMETIC_KIND =
  "reservation-selection-recorded-capacity-arithmetic" as const;

export type FoodReservationSelectionRecordedCapacitySkuArithmetic =
  Readonly<{
    sku: Readonly<{
      id: string;
      version: number;
    }>;
    capacityRevision: number;
    capacityUnits: number;
    recordedHeldQuantity: number;
    recordedCapacityDelta: number;
  }>;

export type FoodReservationSelectionRecordedCapacitySlotArithmetic =
  Readonly<{
    method:
      | "personal-delivery"
      | "meetup";
    locationReference: string;
    windowReference: string;
    capacityRevision: number;
    capacityUnits: number;
    recordedHeldQuantity: number;
    recordedCapacityDelta: number;
  }>;

export type FoodReservationSelectionRecordedCapacityArithmetic =
  Readonly<{
    kind:
      typeof FOOD_RESERVATION_SELECTION_RECORDED_CAPACITY_ARITHMETIC_KIND;
    skuArithmetic:
      readonly FoodReservationSelectionRecordedCapacitySkuArithmetic[];
    slotArithmetic:
      FoodReservationSelectionRecordedCapacitySlotArithmetic;
  }>;

export type FoodReservationSelectionRecordedCapacityArithmeticResult =
  | Readonly<{
      outcome: "derived";
      value:
        FoodReservationSelectionRecordedCapacityArithmetic;
    }>
  | Readonly<{
      outcome: "invalid";
    }>;

type PlainData =
  Record<string, unknown>;

type CapturedSkuSource =
  Readonly<{
    sku: Readonly<{
      id: string;
      version: number;
    }>;
    revision: number;
    capacityUnits: number;
  }>;

type CapturedSlotSource =
  Readonly<{
    method:
      | "personal-delivery"
      | "meetup";
    locationReference: string;
    windowReference: string;
    revision: number;
    capacityUnits: number;
  }>;

type CapturedSourceResolution =
  Readonly<{
    skuSources:
      readonly CapturedSkuSource[];
    slotSource:
      CapturedSlotSource;
  }>;

type CapturedSkuCommitment =
  Readonly<{
    sku: Readonly<{
      id: string;
      version: number;
    }>;
    capacityRevision: number;
    recordedHeldQuantity: number;
  }>;

type CapturedSlotCommitment =
  Readonly<{
    method:
      | "personal-delivery"
      | "meetup";
    locationReference: string;
    windowReference: string;
    capacityRevision: number;
    recordedHeldQuantity: number;
  }>;

type CapturedCommitmentResolution =
  Readonly<{
    skuCommitments:
      readonly CapturedSkuCommitment[];
    slotCommitment:
      CapturedSlotCommitment;
  }>;

function ownData(
  input: unknown,
  keys: readonly string[],
): PlainData {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new TypeError(
      "Expected plain data object",
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
      "Unexpected prototype",
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
      "Unexpected fields",
    );
  }

  const result:
    PlainData =
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
        "Expected own data field",
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

  const result:
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

    result.push(
      descriptor.value,
    );
  }

  return result;
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

function arithmeticDelta(
  capacityUnits: number,
  recordedHeldQuantity: number,
): number {
  const result =
    BigInt(
      capacityUnits,
    ) -
    BigInt(
      recordedHeldQuantity,
    );

  const minimum =
    BigInt(
      Number.MIN_SAFE_INTEGER,
    );

  const maximum =
    BigInt(
      Number.MAX_SAFE_INTEGER,
    );

  if (
    result <
      minimum ||
    result >
      maximum
  ) {
    throw new TypeError(
      "Arithmetic result exceeds safe integer range",
    );
  }

  return Number(
    result,
  );
}

function captureSourceResolution(
  input: unknown,
): CapturedSourceResolution {
  const root =
    ownData(
      input,
      [
        "kind",
        "selection",
        "skuSources",
        "slotSource",
      ],
    );

  if (
    root.kind !==
    "reservation-capacity-source-selection-resolution"
  ) {
    throw new TypeError(
      "Unexpected source resolution kind",
    );
  }

  const selection =
    ownData(
      root.selection,
      [
        "kind",
        "request",
        "fulfillmentIntent",
        "skuSelections",
        "slotSelection",
      ],
    );

  if (
    selection.kind !==
    "reservation-capacity-source-selection-request"
  ) {
    throw new TypeError(
      "Unexpected selection kind",
    );
  }

  const skuSelections =
    denseArray(
      selection.skuSelections,
    );

  const rawSources =
    denseArray(
      root.skuSources,
    );

  if (
    skuSelections.length !==
    rawSources.length
  ) {
    throw new TypeError(
      "SKU source count mismatch",
    );
  }

  const skuSources:
    CapturedSkuSource[] =
    [];

  for (
    let index = 0;
    index <
      rawSources.length;
    index += 1
  ) {
    const source =
      validateFoodExactSkuStockedCapacitySourceRevision(
        rawSources[index],
      );

    const selected =
      ownData(
        skuSelections[index],
        [
          "sku",
          "revision",
        ],
      );

    const selectedSku =
      ownData(
        selected.sku,
        [
          "id",
          "version",
        ],
      );

    if (
      exactString(
        selectedSku.id,
      ) !==
        source.sku.id ||
      positiveSafeInteger(
        selectedSku.version,
      ) !==
        source.sku.version ||
      positiveSafeInteger(
        selected.revision,
      ) !==
        source.revision
    ) {
      throw new TypeError(
        "SKU selection/source mismatch",
      );
    }

    skuSources.push(
      Object.freeze({
        sku:
          Object.freeze({
            id:
              source.sku.id,
            version:
              source.sku.version,
          }),
        revision:
          source.revision,
        capacityUnits:
          source.capacityUnits,
      }),
    );
  }

  const slotSource =
    validateFoodFulfillmentSlotCapacitySourceRevision(
      root.slotSource,
    );

  const slotSelection =
    ownData(
      selection.slotSelection,
      [
        "method",
        "locationReference",
        "windowReference",
        "revision",
      ],
    );

  if (
    method(
      slotSelection.method,
    ) !==
      slotSource.method ||
    exactString(
      slotSelection.locationReference,
    ) !==
      slotSource.locationReference ||
    exactString(
      slotSelection.windowReference,
    ) !==
      slotSource.windowReference ||
    positiveSafeInteger(
      slotSelection.revision,
    ) !==
      slotSource.revision
  ) {
    throw new TypeError(
      "Slot selection/source mismatch",
    );
  }

  return Object.freeze({
    skuSources:
      Object.freeze(
        skuSources,
      ),
    slotSource:
      Object.freeze({
        method:
          slotSource.method,
        locationReference:
          slotSource.locationReference,
        windowReference:
          slotSource.windowReference,
        revision:
          slotSource.revision,
        capacityUnits:
          slotSource.capacityUnits,
      }),
  });
}

function captureCommitmentResolution(
  input: unknown,
): CapturedCommitmentResolution {
  const root =
    ownData(
      input,
      [
        "kind",
        "validation",
        "skuCommitments",
        "slotCommitment",
      ],
    );

  if (
    root.kind !==
    FOOD_RESERVATION_SELECTION_RECORDED_HELD_COMMITMENT_RESOLUTION_KIND
  ) {
    throw new TypeError(
      "Unexpected commitment resolution kind",
    );
  }

  const validation =
    ownData(
      root.validation,
      [
        "kind",
        "skuObservations",
        "slotObservation",
      ],
    );

  if (
    validation.kind !==
    FOOD_RESERVATION_CAPACITY_SOURCE_LATEST_RECORDED_SELECTION_VALIDATION_KIND
  ) {
    throw new TypeError(
      "Unexpected validation kind",
    );
  }

  const commitments =
    denseArray(
      root.skuCommitments,
    );

  const observations =
    denseArray(
      validation.skuObservations,
    );

  if (
    commitments.length !==
    observations.length
  ) {
    throw new TypeError(
      "SKU commitment/validation count mismatch",
    );
  }

  const skuCommitments:
    CapturedSkuCommitment[] =
    [];

  for (
    let index = 0;
    index <
      commitments.length;
    index += 1
  ) {
    const commitment =
      ownData(
        commitments[index],
        [
          "sku",
          "capacityRevision",
          "recordedHeldQuantity",
        ],
      );

    const commitmentSku =
      ownData(
        commitment.sku,
        [
          "id",
          "version",
        ],
      );

    const observation =
      ownData(
        observations[index],
        [
          "sku",
          "selectedRevision",
          "observedHighestRecordedRevision",
        ],
      );

    const observationSku =
      ownData(
        observation.sku,
        [
          "id",
          "version",
        ],
      );

    const commitmentId =
      exactString(
        commitmentSku.id,
      );

    const commitmentVersion =
      positiveSafeInteger(
        commitmentSku.version,
      );

    const capacityRevision =
      positiveSafeInteger(
        commitment.capacityRevision,
      );

    const selectedRevision =
      positiveSafeInteger(
        observation.selectedRevision,
      );

    const observedRevision =
      positiveSafeInteger(
        observation.observedHighestRecordedRevision,
      );

    if (
      commitmentId !==
        exactString(
          observationSku.id,
        ) ||
      commitmentVersion !==
        positiveSafeInteger(
          observationSku.version,
        ) ||
      capacityRevision !==
        selectedRevision ||
      selectedRevision !==
        observedRevision
    ) {
      throw new TypeError(
        "SKU commitment/validation mismatch",
      );
    }

    skuCommitments.push(
      Object.freeze({
        sku:
          Object.freeze({
            id:
              commitmentId,
            version:
              commitmentVersion,
          }),
        capacityRevision,
        recordedHeldQuantity:
          nonnegativeSafeInteger(
            commitment.recordedHeldQuantity,
          ),
      }),
    );
  }

  const slotCommitment =
    ownData(
      root.slotCommitment,
      [
        "method",
        "locationReference",
        "windowReference",
        "capacityRevision",
        "recordedHeldQuantity",
      ],
    );

  const slotObservation =
    ownData(
      validation.slotObservation,
      [
        "method",
        "locationReference",
        "windowReference",
        "selectedRevision",
        "observedHighestRecordedRevision",
      ],
    );

  const slotMethod =
    method(
      slotCommitment.method,
    );

  const locationReference =
    exactString(
      slotCommitment.locationReference,
    );

  const windowReference =
    exactString(
      slotCommitment.windowReference,
    );

  const capacityRevision =
    positiveSafeInteger(
      slotCommitment.capacityRevision,
    );

  const selectedRevision =
    positiveSafeInteger(
      slotObservation.selectedRevision,
    );

  const observedRevision =
    positiveSafeInteger(
      slotObservation.observedHighestRecordedRevision,
    );

  if (
    slotMethod !==
      method(
        slotObservation.method,
      ) ||
    locationReference !==
      exactString(
        slotObservation.locationReference,
      ) ||
    windowReference !==
      exactString(
        slotObservation.windowReference,
      ) ||
    capacityRevision !==
      selectedRevision ||
    selectedRevision !==
      observedRevision
  ) {
    throw new TypeError(
      "Slot commitment/validation mismatch",
    );
  }

  return Object.freeze({
    skuCommitments:
      Object.freeze(
        skuCommitments,
      ),
    slotCommitment:
      Object.freeze({
        method:
          slotMethod,
        locationReference,
        windowReference,
        capacityRevision,
        recordedHeldQuantity:
          nonnegativeSafeInteger(
            slotCommitment.recordedHeldQuantity,
          ),
      }),
  });
}

export function deriveFoodReservationSelectionRecordedCapacityArithmetic(
  capacitySourceResolution:
    FoodReservationCapacitySourceSelectionResolution,
  recordedHeldCommitmentResolution:
    FoodReservationSelectionRecordedHeldCommitmentResolution,
): FoodReservationSelectionRecordedCapacityArithmeticResult {
  let sources:
    CapturedSourceResolution;

  let commitments:
    CapturedCommitmentResolution;

  try {
    sources =
      captureSourceResolution(
        capacitySourceResolution,
      );

    commitments =
      captureCommitmentResolution(
        recordedHeldCommitmentResolution,
      );
  }
  catch {
    return Object.freeze({
      outcome:
        "invalid",
    });
  }

  if (
    sources.skuSources.length !==
    commitments.skuCommitments.length
  ) {
    return Object.freeze({
      outcome:
        "invalid",
    });
  }

  const skuArithmetic:
    FoodReservationSelectionRecordedCapacitySkuArithmetic[] =
    [];

  try {
    for (
      let index = 0;
      index <
        sources.skuSources.length;
      index += 1
    ) {
      const source =
        sources.skuSources[index];

      const commitment =
        commitments.skuCommitments[index];

      if (
        source ===
          undefined ||
        commitment ===
          undefined ||
        source.sku.id !==
          commitment.sku.id ||
        source.sku.version !==
          commitment.sku.version ||
        source.revision !==
          commitment.capacityRevision
      ) {
        return Object.freeze({
          outcome:
            "invalid",
        });
      }

      skuArithmetic.push(
        Object.freeze({
          sku:
            Object.freeze({
              id:
                source.sku.id,
              version:
                source.sku.version,
            }),
          capacityRevision:
            source.revision,
          capacityUnits:
            source.capacityUnits,
          recordedHeldQuantity:
            commitment.recordedHeldQuantity,
          recordedCapacityDelta:
            arithmeticDelta(
              source.capacityUnits,
              commitment.recordedHeldQuantity,
            ),
        }),
      );
    }

    const sourceSlot =
      sources.slotSource;

    const commitmentSlot =
      commitments.slotCommitment;

    if (
      sourceSlot.method !==
        commitmentSlot.method ||
      sourceSlot.locationReference !==
        commitmentSlot.locationReference ||
      sourceSlot.windowReference !==
        commitmentSlot.windowReference ||
      sourceSlot.revision !==
        commitmentSlot.capacityRevision
    ) {
      return Object.freeze({
        outcome:
          "invalid",
      });
    }

    const value:
      FoodReservationSelectionRecordedCapacityArithmetic =
      Object.freeze({
        kind:
          FOOD_RESERVATION_SELECTION_RECORDED_CAPACITY_ARITHMETIC_KIND,
        skuArithmetic:
          Object.freeze(
            skuArithmetic,
          ),
        slotArithmetic:
          Object.freeze({
            method:
              sourceSlot.method,
            locationReference:
              sourceSlot.locationReference,
            windowReference:
              sourceSlot.windowReference,
            capacityRevision:
              sourceSlot.revision,
            capacityUnits:
              sourceSlot.capacityUnits,
            recordedHeldQuantity:
              commitmentSlot.recordedHeldQuantity,
            recordedCapacityDelta:
              arithmeticDelta(
                sourceSlot.capacityUnits,
                commitmentSlot.recordedHeldQuantity,
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