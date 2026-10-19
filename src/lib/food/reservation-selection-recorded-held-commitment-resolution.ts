/**
 * FOOD-007K
 *
 * Compose FOOD-007I latest-recorded selection validation with FOOD-007J
 * exact-revision recorded-held commitment reads.
 *
 * This is read-time evidence composition only. It does not calculate remaining
 * capacity, reservable quantity, ATP, active commitments or acceptance.
 */

import type {
  FoodReservationCapacitySourceSelectionResolution,
} from "./reservation-capacity-source-selection-resolution";

import {
  validateFoodReservationCapacitySourceLatestRecordedSelection,
  type FoodReservationCapacitySourceLatestRecordedSelectionValidation,
  type FoodReservationCapacitySourceLatestRecordedSelectionValidationD1Database,
  type FoodReservationCapacitySourceLatestRecordedSelectionValidationResult,
} from "./reservation-capacity-source-latest-recorded-selection-validation";

import {
  readFoodExactRevisionRecordedHeldCapacityCommitment,
  type FoodExactRevisionRecordedHeldCapacityCommitmentReadD1Database,
} from "./d1-exact-revision-recorded-held-capacity-commitment-read";

export const FOOD_RESERVATION_SELECTION_RECORDED_HELD_COMMITMENT_RESOLUTION_KIND =
  "reservation-selection-recorded-held-commitment-resolution" as const;

export type FoodReservationSelectionRecordedHeldCommitmentResolutionD1Database =
  FoodReservationCapacitySourceLatestRecordedSelectionValidationD1Database &
  FoodExactRevisionRecordedHeldCapacityCommitmentReadD1Database;

export type FoodReservationSelectionRecordedHeldSkuCommitment =
  Readonly<{
    sku: Readonly<{
      id: string;
      version: number;
    }>;
    capacityRevision: number;
    recordedHeldQuantity: number;
  }>;

export type FoodReservationSelectionRecordedHeldSlotCommitment =
  Readonly<{
    method:
      | "personal-delivery"
      | "meetup";
    locationReference: string;
    windowReference: string;
    capacityRevision: number;
    recordedHeldQuantity: number;
  }>;

export type FoodReservationSelectionRecordedHeldCommitmentResolution =
  Readonly<{
    kind:
      typeof FOOD_RESERVATION_SELECTION_RECORDED_HELD_COMMITMENT_RESOLUTION_KIND;
    validation:
      FoodReservationCapacitySourceLatestRecordedSelectionValidation;
    skuCommitments:
      readonly FoodReservationSelectionRecordedHeldSkuCommitment[];
    slotCommitment:
      FoodReservationSelectionRecordedHeldSlotCommitment;
  }>;

type FoodReservationSelectionRecordedHeldCommitmentValidationFailure =
  Exclude<
    FoodReservationCapacitySourceLatestRecordedSelectionValidationResult,
    Readonly<{
      outcome: "validated";
    }>
  >;

export type FoodReservationSelectionRecordedHeldCommitmentResolutionResult =
  | Readonly<{
      outcome: "resolved";
      resolution:
        FoodReservationSelectionRecordedHeldCommitmentResolution;
    }>
  | FoodReservationSelectionRecordedHeldCommitmentValidationFailure;

function slotMethod(
  input: string,
):
  | "personal-delivery"
  | "meetup" {
  if (
    input !== "personal-delivery" &&
    input !== "meetup"
  ) {
    throw new TypeError(
      "Unexpected validated fulfillment method",
    );
  }

  return input;
}

function copyValidation(
  input:
    FoodReservationCapacitySourceLatestRecordedSelectionValidation,
):
  FoodReservationCapacitySourceLatestRecordedSelectionValidation {
  const skuObservations =
    input.skuObservations.map(
      (observation) =>
        Object.freeze({
          sku:
            Object.freeze({
              id:
                observation.sku.id,
              version:
                observation.sku.version,
            }),
          selectedRevision:
            observation.selectedRevision,
          observedHighestRecordedRevision:
            observation.observedHighestRecordedRevision,
        }),
    );

  return Object.freeze({
    kind:
      input.kind,
    skuObservations:
      Object.freeze(
        skuObservations,
      ),
    slotObservation:
      Object.freeze({
        method:
          input.slotObservation.method,
        locationReference:
          input.slotObservation.locationReference,
        windowReference:
          input.slotObservation.windowReference,
        selectedRevision:
          input.slotObservation.selectedRevision,
        observedHighestRecordedRevision:
          input.slotObservation.observedHighestRecordedRevision,
      }),
  });
}

function storageFailure():
  Readonly<{
    outcome: "storage-failure";
  }> {
  return Object.freeze({
    outcome:
      "storage-failure",
  });
}

export async function resolveFoodReservationSelectionRecordedHeldCommitments(
  database:
    FoodReservationSelectionRecordedHeldCommitmentResolutionD1Database,
  input:
    FoodReservationCapacitySourceSelectionResolution,
): Promise<
  FoodReservationSelectionRecordedHeldCommitmentResolutionResult
> {
  const latest =
    await validateFoodReservationCapacitySourceLatestRecordedSelection(
      database,
      input,
    );

  if (
    latest.outcome !==
    "validated"
  ) {
    return latest;
  }

  const validation =
    latest.validation;

  const skuCommitments:
    FoodReservationSelectionRecordedHeldSkuCommitment[] =
    [];

  for (
    const observation of
      validation.skuObservations
  ) {
    if (
      observation.selectedRevision !==
      observation.observedHighestRecordedRevision
    ) {
      return storageFailure();
    }

    const read =
      await readFoodExactRevisionRecordedHeldCapacityCommitment(
        database,
        {
          scope: "sku",
          sku: {
            id:
              observation.sku.id,
            version:
              observation.sku.version,
          },
          capacityRevision:
            observation.selectedRevision,
        },
      );

    if (
      read.outcome !==
      "read"
    ) {
      return storageFailure();
    }

    if (
      read.value.scope !==
        "sku" ||
      read.value.selector.sku.id !==
        observation.sku.id ||
      read.value.selector.sku.version !==
        observation.sku.version ||
      read.value.selector.capacityRevision !==
        observation.selectedRevision
    ) {
      return storageFailure();
    }

    skuCommitments.push(
      Object.freeze({
        sku:
          Object.freeze({
            id:
              observation.sku.id,
            version:
              observation.sku.version,
          }),
        capacityRevision:
          observation.selectedRevision,
        recordedHeldQuantity:
          read.value.recordedHeldQuantity,
      }),
    );
  }

  const slot =
    validation.slotObservation;

  if (
    slot.selectedRevision !==
    slot.observedHighestRecordedRevision
  ) {
    return storageFailure();
  }

  let method:
    | "personal-delivery"
    | "meetup";

  try {
    method =
      slotMethod(
        slot.method,
      );
  }
  catch {
    return storageFailure();
  }

  const slotRead =
    await readFoodExactRevisionRecordedHeldCapacityCommitment(
      database,
      {
        scope: "slot",
        method,
        locationReference:
          slot.locationReference,
        windowReference:
          slot.windowReference,
        capacityRevision:
          slot.selectedRevision,
      },
    );

  if (
    slotRead.outcome !==
    "read"
  ) {
    return storageFailure();
  }

  if (
    slotRead.value.scope !==
      "slot" ||
    slotRead.value.selector.method !==
      method ||
    slotRead.value.selector.locationReference !==
      slot.locationReference ||
    slotRead.value.selector.windowReference !==
      slot.windowReference ||
    slotRead.value.selector.capacityRevision !==
      slot.selectedRevision
  ) {
    return storageFailure();
  }

  const resolution:
    FoodReservationSelectionRecordedHeldCommitmentResolution =
    Object.freeze({
      kind:
        FOOD_RESERVATION_SELECTION_RECORDED_HELD_COMMITMENT_RESOLUTION_KIND,
      validation:
        copyValidation(
          validation,
        ),
      skuCommitments:
        Object.freeze(
          skuCommitments,
        ),
      slotCommitment:
        Object.freeze({
          method,
          locationReference:
            slot.locationReference,
          windowReference:
            slot.windowReference,
          capacityRevision:
            slot.selectedRevision,
          recordedHeldQuantity:
            slotRead.value.recordedHeldQuantity,
        }),
    });

  return Object.freeze({
    outcome:
      "resolved",
    resolution,
  });
}