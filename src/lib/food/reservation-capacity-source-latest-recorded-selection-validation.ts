/**
 * FOOD-007I
 *
 * Validate only whether revisions already resolved by FOOD-007F equal the
 * highest structurally valid recorded revisions individually observed through
 * FOOD-007G and FOOD-007H.
 *
 * Equality here is not governing authority, eligibility, physical currentness,
 * remaining capacity, ATP, reservation acceptance, or a simultaneous snapshot.
 */

import type {
  FoodReservationCapacitySourceSelectionResolution,
} from "./reservation-capacity-source-selection-resolution";

import {
  readFoodLatestExactSkuStockedCapacitySourceRevision,
} from "./d1-latest-exact-sku-stocked-capacity-source-read";

import {
  readFoodLatestExactFulfillmentSlotCapacitySourceRevision,
} from "./d1-latest-exact-fulfillment-slot-capacity-source-read";

import type {
  FoodExactSkuStockedCapacitySourceReadD1Database,
} from "./d1-exact-sku-stocked-capacity-source-read";

import type {
  FoodExactFulfillmentSlotCapacitySourceReadD1Database,
} from "./d1-exact-fulfillment-slot-capacity-source-read";

export const FOOD_RESERVATION_CAPACITY_SOURCE_LATEST_RECORDED_SELECTION_VALIDATION_KIND =
  "reservation-capacity-source-latest-recorded-selection-validation" as const;

export type FoodReservationCapacitySourceLatestRecordedSelectionValidationD1Database =
  FoodExactSkuStockedCapacitySourceReadD1Database &
  FoodExactFulfillmentSlotCapacitySourceReadD1Database;

export type FoodReservationCapacitySourceLatestRecordedSkuObservation =
  Readonly<{
    sku: Readonly<{
      id: string;
      version: number;
    }>;
    selectedRevision: number;
    observedHighestRecordedRevision: number;
  }>;

export type FoodReservationCapacitySourceLatestRecordedSlotObservation =
  Readonly<{
    method: string;
    locationReference: string;
    windowReference: string;
    selectedRevision: number;
    observedHighestRecordedRevision: number;
  }>;

export type FoodReservationCapacitySourceLatestRecordedSelectionValidation =
  Readonly<{
    kind:
      typeof FOOD_RESERVATION_CAPACITY_SOURCE_LATEST_RECORDED_SELECTION_VALIDATION_KIND;
    skuObservations:
      readonly FoodReservationCapacitySourceLatestRecordedSkuObservation[];
    slotObservation:
      FoodReservationCapacitySourceLatestRecordedSlotObservation;
  }>;

export type FoodReservationCapacitySourceLatestRecordedTarget =
  | Readonly<{
      scope: "sku";
      index: number;
      sku: Readonly<{
        id: string;
        version: number;
      }>;
      selectedRevision: number;
    }>
  | Readonly<{
      scope: "slot";
      method: string;
      locationReference: string;
      windowReference: string;
      selectedRevision: number;
    }>;

export type FoodReservationCapacitySourceLatestRecordedSelectionValidationResult =
  | Readonly<{
      outcome: "validated";
      validation:
        FoodReservationCapacitySourceLatestRecordedSelectionValidation;
    }>
  | Readonly<{
      outcome: "later-recorded-revision";
      target:
        FoodReservationCapacitySourceLatestRecordedTarget;
      observedHighestRecordedRevision: number;
    }>
  | Readonly<{
      outcome: "not-found";
      target:
        FoodReservationCapacitySourceLatestRecordedTarget;
    }>
  | Readonly<{
      outcome: "invalid";
    }>
  | Readonly<{
      outcome: "storage-failure";
    }>;

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
    method: string;
    locationReference: string;
    windowReference: string;
    revision: number;
  }>;

type CapturedResolution =
  Readonly<{
    skuSelections: readonly CapturedSkuSelection[];
    slotSelection: CapturedSlotSelection;
  }>;

function objectRecord(
  input: unknown,
): object {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new TypeError("Expected object");
  }

  const prototype =
    Object.getPrototypeOf(input);

  if (
    prototype !== Object.prototype &&
    prototype !== null
  ) {
    throw new TypeError("Unexpected prototype");
  }

  return input;
}

function ownValue(
  input: unknown,
  key: string,
): unknown {
  const object =
    objectRecord(input);

  const descriptor =
    Object.getOwnPropertyDescriptor(
      object,
      key,
    );

  if (
    !descriptor ||
    !descriptor.enumerable ||
    !("value" in descriptor)
  ) {
    throw new TypeError(
      `Expected own data property: ${key}`,
    );
  }

  return descriptor.value;
}

function exactObject(
  input: unknown,
  keys: readonly string[],
): Readonly<Record<string, unknown>> {
  const object =
    objectRecord(input);

  const ownKeys =
    Reflect.ownKeys(object);

  if (
    ownKeys.some(
      (key) =>
        typeof key !== "string",
    )
  ) {
    throw new TypeError("Unexpected symbol property");
  }

  const names =
    ownKeys as string[];

  const expected =
    [...keys].sort();

  const actual =
    [...names].sort();

  if (
    expected.length !== actual.length ||
    expected.some(
      (key, index) =>
        key !== actual[index],
    )
  ) {
    throw new TypeError("Unexpected object shape");
  }

  const result:
    Record<string, unknown> =
    Object.create(null);

  for (const key of keys) {
    result[key] =
      ownValue(
        object,
        key,
      );
  }

  return Object.freeze(result);
}

function denseArray(
  input: unknown,
): readonly unknown[] {
  if (
    !Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Array.prototype
  ) {
    throw new TypeError("Expected array");
  }

  const ownKeys =
    Reflect.ownKeys(input);

  if (
    ownKeys.some(
      (key) =>
        typeof key !== "string",
    )
  ) {
    throw new TypeError("Unexpected array symbol");
  }

  const allowed =
    new Set<string>(["length"]);

  for (
    let index = 0;
    index < input.length;
    index += 1
  ) {
    allowed.add(String(index));

    if (
      !Object.prototype.hasOwnProperty.call(
        input,
        index,
      )
    ) {
      throw new TypeError("Sparse array");
    }

    const descriptor =
      Object.getOwnPropertyDescriptor(
        input,
        String(index),
      );

    if (
      !descriptor ||
      !descriptor.enumerable ||
      !("value" in descriptor)
    ) {
      throw new TypeError("Invalid array element");
    }
  }

  for (const key of ownKeys as string[]) {
    if (!allowed.has(key)) {
      throw new TypeError("Unexpected array property");
    }
  }

  return Object.freeze(
    Array.from(input),
  );
}

function reference(
  input: unknown,
): string {
  if (
    typeof input !== "string" ||
    input.length < 1 ||
    input.length > 512 ||
    input.trim() !== input
  ) {
    throw new TypeError("Invalid reference");
  }

  return input;
}

function positiveSafeInteger(
  input: unknown,
): number {
  if (
    typeof input !== "number" ||
    !Number.isSafeInteger(input) ||
    input < 1
  ) {
    throw new TypeError(
      "Expected positive safe integer",
    );
  }

  return input;
}

function fulfillmentMethod(
  input: unknown,
): string {
  if (
    input !== "personal-delivery" &&
    input !== "meetup"
  ) {
    throw new TypeError(
      "Invalid fulfillment method",
    );
  }

  return input;
}

function capturedSku(
  input: unknown,
): Readonly<{
  id: string;
  version: number;
}> {
  const value =
    exactObject(
      input,
      [
        "id",
        "version",
      ],
    );

  return Object.freeze({
    id:
      reference(value.id),
    version:
      positiveSafeInteger(
        value.version,
      ),
  });
}

function capturedSkuSelection(
  input: unknown,
): CapturedSkuSelection {
  const value =
    exactObject(
      input,
      [
        "sku",
        "revision",
      ],
    );

  return Object.freeze({
    sku:
      capturedSku(
        value.sku,
      ),
    revision:
      positiveSafeInteger(
        value.revision,
      ),
  });
}

function capturedSlotSelection(
  input: unknown,
): CapturedSlotSelection {
  const value =
    exactObject(
      input,
      [
        "method",
        "locationReference",
        "windowReference",
        "revision",
      ],
    );

  return Object.freeze({
    method:
      fulfillmentMethod(
        value.method,
      ),
    locationReference:
      reference(
        value.locationReference,
      ),
    windowReference:
      reference(
        value.windowReference,
      ),
    revision:
      positiveSafeInteger(
        value.revision,
      ),
  });
}

function captureResolution(
  input: unknown,
): CapturedResolution {
  const root =
    exactObject(
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
    throw new TypeError("Unexpected resolution kind");
  }

  const selection =
    exactObject(
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
    throw new TypeError("Unexpected selection kind");
  }

  const rawSkuSelections =
    denseArray(
      selection.skuSelections,
    );

  const rawSkuSources =
    denseArray(
      root.skuSources,
    );

  if (
    rawSkuSelections.length !==
    rawSkuSources.length
  ) {
    throw new TypeError(
      "Resolved SKU source count mismatch",
    );
  }

  const skuSelections =
    rawSkuSelections.map(
      (input) =>
        capturedSkuSelection(
          input,
        ),
    );

  for (
    let index = 0;
    index < skuSelections.length;
    index += 1
  ) {
    const source =
      rawSkuSources[index];

    const sourceSku =
      capturedSku(
        ownValue(
          source,
          "sku",
        ),
      );

    const sourceRevision =
      positiveSafeInteger(
        ownValue(
          source,
          "revision",
        ),
      );

    const selectionValue =
      skuSelections[index];

    if (
      sourceSku.id !==
        selectionValue?.sku.id ||
      sourceSku.version !==
        selectionValue.sku.version ||
      sourceRevision !==
        selectionValue.revision
    ) {
      throw new TypeError(
        "Resolved SKU source binding mismatch",
      );
    }
  }

  const slotSelection =
    capturedSlotSelection(
      selection.slotSelection,
    );

  const slotSource =
    root.slotSource;

  const sourceMethod =
    fulfillmentMethod(
      ownValue(
        slotSource,
        "method",
      ),
    );

  const sourceLocation =
    reference(
      ownValue(
        slotSource,
        "locationReference",
      ),
    );

  const sourceWindow =
    reference(
      ownValue(
        slotSource,
        "windowReference",
      ),
    );

  const sourceRevision =
    positiveSafeInteger(
      ownValue(
        slotSource,
        "revision",
      ),
    );

  if (
    sourceMethod !==
      slotSelection.method ||
    sourceLocation !==
      slotSelection.locationReference ||
    sourceWindow !==
      slotSelection.windowReference ||
    sourceRevision !==
      slotSelection.revision
  ) {
    throw new TypeError(
      "Resolved slot source binding mismatch",
    );
  }

  return Object.freeze({
    skuSelections:
      Object.freeze(
        skuSelections,
      ),
    slotSelection,
  });
}

function skuTarget(
  index: number,
  selection:
    CapturedSkuSelection,
): Extract<
  FoodReservationCapacitySourceLatestRecordedTarget,
  { scope: "sku" }
> {
  return Object.freeze({
    scope: "sku",
    index,
    sku:
      Object.freeze({
        id:
          selection.sku.id,
        version:
          selection.sku.version,
      }),
    selectedRevision:
      selection.revision,
  });
}

function slotTarget(
  selection:
    CapturedSlotSelection,
): Extract<
  FoodReservationCapacitySourceLatestRecordedTarget,
  { scope: "slot" }
> {
  return Object.freeze({
    scope: "slot",
    method:
      selection.method,
    locationReference:
      selection.locationReference,
    windowReference:
      selection.windowReference,
    selectedRevision:
      selection.revision,
  });
}

export async function validateFoodReservationCapacitySourceLatestRecordedSelection(
  database:
    FoodReservationCapacitySourceLatestRecordedSelectionValidationD1Database,
  input:
    FoodReservationCapacitySourceSelectionResolution,
): Promise<
  FoodReservationCapacitySourceLatestRecordedSelectionValidationResult
> {
  let captured:
    CapturedResolution;

  try {
    captured =
      captureResolution(
        input,
      );
  }
  catch {
    return Object.freeze({
      outcome: "invalid",
    });
  }

  const skuObservations:
    FoodReservationCapacitySourceLatestRecordedSkuObservation[] =
    [];

  for (
    let index = 0;
    index < captured.skuSelections.length;
    index += 1
  ) {
    const selection =
      captured.skuSelections[index];

    if (!selection) {
      return Object.freeze({
        outcome:
          "invalid",
      });
    }

    const target =
      skuTarget(
        index,
        selection,
      );

    const result =
      await readFoodLatestExactSkuStockedCapacitySourceRevision(
        database,
        {
          sku: {
            id:
              selection.sku.id,
            version:
              selection.sku.version,
          },
        },
      );

    switch (result.outcome) {
      case "invalid":
        return Object.freeze({
          outcome: "invalid",
        });

      case "not-found":
        return Object.freeze({
          outcome:
            "not-found",
          target,
        });

      case "storage-failure":
        return Object.freeze({
          outcome:
            "storage-failure",
        });

      case "found":
        break;
    }

    const observed =
      result.value.revision;

    if (
      observed <
      selection.revision
    ) {
      return Object.freeze({
        outcome:
          "storage-failure",
      });
    }

    if (
      observed >
      selection.revision
    ) {
      return Object.freeze({
        outcome:
          "later-recorded-revision",
        target,
        observedHighestRecordedRevision:
          observed,
      });
    }

    skuObservations.push(
      Object.freeze({
        sku:
          Object.freeze({
            id:
              selection.sku.id,
            version:
              selection.sku.version,
          }),
        selectedRevision:
          selection.revision,
        observedHighestRecordedRevision:
          observed,
      }),
    );
  }

  const slot =
    captured.slotSelection;

  const slotResult =
    await readFoodLatestExactFulfillmentSlotCapacitySourceRevision(
      database,
      {
        method:
          slot.method,
        locationReference:
          slot.locationReference,
        windowReference:
          slot.windowReference,
      },
    );

  const target =
    slotTarget(
      slot,
    );

  switch (slotResult.outcome) {
    case "invalid":
      return Object.freeze({
        outcome: "invalid",
      });

    case "not-found":
      return Object.freeze({
        outcome:
          "not-found",
        target,
      });

    case "storage-failure":
      return Object.freeze({
        outcome:
          "storage-failure",
      });

    case "found":
      break;
  }

  const observedSlotRevision =
    slotResult.value.revision;

  if (
    observedSlotRevision <
    slot.revision
  ) {
    return Object.freeze({
      outcome:
        "storage-failure",
    });
  }

  if (
    observedSlotRevision >
    slot.revision
  ) {
    return Object.freeze({
      outcome:
        "later-recorded-revision",
      target,
      observedHighestRecordedRevision:
        observedSlotRevision,
    });
  }

  const slotObservation =
    Object.freeze({
      method:
        slot.method,
      locationReference:
        slot.locationReference,
      windowReference:
        slot.windowReference,
      selectedRevision:
        slot.revision,
      observedHighestRecordedRevision:
        observedSlotRevision,
    });

  const validation:
    FoodReservationCapacitySourceLatestRecordedSelectionValidation =
    Object.freeze({
      kind:
        FOOD_RESERVATION_CAPACITY_SOURCE_LATEST_RECORDED_SELECTION_VALIDATION_KIND,
      skuObservations:
        Object.freeze(
          skuObservations,
        ),
      slotObservation,
    });

  return Object.freeze({
    outcome: "validated",
    validation,
  });
}