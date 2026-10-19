/**
 * FOOD-007P
 *
 * Pure structural commitment-scope derivation from a successful FOOD-007O
 * governing-source evaluation. No persistence or quantity arithmetic.
 */

import {
  evaluateFoodReservationCapacityGoverningSourcePolicy,
  type FoodReservationCapacityGoverningSourcePolicyEvaluation,
} from "./reservation-capacity-governing-source-policy";

export const FOOD_RESERVATION_CAPACITY_COMMITMENT_SCOPE_KIND =
  "reservation-capacity-commitment-scope" as const;

type GoverningSelection =
  FoodReservationCapacityGoverningSourcePolicyEvaluation["command"]["selection"];

type GoverningSku =
  GoverningSelection["skuSelections"][number]["sku"];

type GoverningSlot =
  GoverningSelection["slotSelection"];

export type FoodReservationCapacityCommitmentSkuScope =
  Readonly<{
    sku: GoverningSku;
    governingRevision: number;
  }>;

export type FoodReservationCapacityCommitmentSlotScope =
  Readonly<{
    method: GoverningSlot["method"];
    locationReference: string;
    windowReference: string;
    governingRevision: number;
  }>;

export type FoodReservationCapacityCommitmentScope =
  Readonly<{
    kind:
      typeof FOOD_RESERVATION_CAPACITY_COMMITMENT_SCOPE_KIND;
    policyVersion: 1;
    governing:
      FoodReservationCapacityGoverningSourcePolicyEvaluation;
    skuScopes:
      readonly FoodReservationCapacityCommitmentSkuScope[];
    slotScope:
      FoodReservationCapacityCommitmentSlotScope;
  }>;

export type FoodReservationCapacityCommitmentScopeResult =
  | Readonly<{
      outcome: "scoped";
      value: FoodReservationCapacityCommitmentScope;
    }>
  | Readonly<{
      outcome: "invalid";
    }>;

export function deriveFoodReservationCapacityCommitmentScope(
  input: unknown,
): FoodReservationCapacityCommitmentScopeResult {
  try {
    const governingResult =
      evaluateFoodReservationCapacityGoverningSourcePolicy(
        input,
      );

    if (
      governingResult.outcome !==
      "matches-policy"
    ) {
      return Object.freeze({
        outcome: "invalid",
      });
    }

    const governing =
      governingResult.value;

    const selections =
      governing.command.selection.skuSelections;

    const skuObservations =
      governing.observations.skuObservations;

    if (
      selections.length !==
      skuObservations.length
    ) {
      return Object.freeze({
        outcome: "invalid",
      });
    }

    const skuScopes =
      Object.freeze(
        selections.map(
          (selection, index) =>
            Object.freeze({
              sku:
                Object.freeze({
                  ...selection.sku,
                }),
              governingRevision:
                skuObservations[index]!
                  .observedHighestRecordedRevision,
            }),
        ),
      );

    const selectedSlot =
      governing.command.selection.slotSelection;

    const slotObservation =
      governing.observations.slotObservation;

    const slotScope =
      Object.freeze({
        method:
          selectedSlot.method,
        locationReference:
          selectedSlot.locationReference,
        windowReference:
          selectedSlot.windowReference,
        governingRevision:
          slotObservation.observedHighestRecordedRevision,
      });

    const value:
      FoodReservationCapacityCommitmentScope =
      Object.freeze({
        kind:
          FOOD_RESERVATION_CAPACITY_COMMITMENT_SCOPE_KIND,
        policyVersion:
          1,
        governing,
        skuScopes,
        slotScope,
      });

    return Object.freeze({
      outcome: "scoped",
      value,
    });
  }
  catch {
    return Object.freeze({
      outcome: "invalid",
    });
  }
}
