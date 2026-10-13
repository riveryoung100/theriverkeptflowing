/**
 * FOOD-005P: canonical FOOD-005O -> FOOD-005J charge-adjustment projection.
 *
 * This module says what exact adjustment should be supplied to FOOD-005J.
 * It does not construct or mutate a payable assessment and does not prove
 * that any assessment contains the projected adjustment.
 */

import {
  FOOD_AUTHORIZED_FULFILLMENT_CHARGE_KIND,
  type FoodAuthorizedFulfillmentChargeCandidate,
} from "./authorized-fulfillment-charge-candidate";
import type { FoodMoney } from "./cost-pricing-domain";

export const FOOD_AUTHORIZED_FULFILLMENT_CHARGE_DIRECTION =
  "charge" as const;

export interface FoodAuthorizedFulfillmentPayableChargeAdjustment {
  readonly direction:
    typeof FOOD_AUTHORIZED_FULFILLMENT_CHARGE_DIRECTION;
  readonly reference: string;
  readonly money: FoodMoney;
  readonly sourceReference: string;
}

function exactPositiveVersion(
  value: number,
  label: string,
): number {
  if (
    !Number.isSafeInteger(value) ||
    value < 1
  ) {
    throw new TypeError(
      `${label} version must be a positive safe integer`,
    );
  }

  return value;
}

function exactIdentityReference(
  id: string,
  version: number,
  label: string,
): string {
  if (
    typeof id !== "string" ||
    id.length === 0 ||
    id.trim() !== id
  ) {
    throw new TypeError(
      `${label} identity must be a nonempty canonical string`,
    );
  }

  return `${id}@v${exactPositiveVersion(
    version,
    label,
  )}`;
}

function exactMoney(
  money: FoodMoney,
): FoodMoney {
  if (
    typeof money !== "object" ||
    money === null
  ) {
    throw new TypeError(
      "Authorized fulfillment charge money is required",
    );
  }

  if (
    typeof money.currency !== "string" ||
    money.currency.length === 0
  ) {
    throw new TypeError(
      "Authorized fulfillment charge currency is required",
    );
  }

  if (
    !Number.isSafeInteger(
      money.minorUnits,
    ) ||
    money.minorUnits < 0
  ) {
    throw new TypeError(
      "Authorized fulfillment charge minor units must be a nonnegative safe integer",
    );
  }

  return Object.freeze({
    currency: money.currency,
    minorUnits: money.minorUnits,
  });
}

export function projectFoodAuthorizedFulfillmentChargeToPayableAdjustment(
  candidate: FoodAuthorizedFulfillmentChargeCandidate,
): FoodAuthorizedFulfillmentPayableChargeAdjustment {
  if (
    typeof candidate !== "object" ||
    candidate === null
  ) {
    throw new TypeError(
      "Trusted FOOD-005O authorized fulfillment charge candidate is required",
    );
  }

  if (
    candidate.kind !==
    FOOD_AUTHORIZED_FULFILLMENT_CHARGE_KIND
  ) {
    throw new TypeError(
      "Unexpected authorized fulfillment charge candidate kind",
    );
  }

  const reference =
    exactIdentityReference(
      candidate.manualApproval.id,
      candidate.manualApproval.version,
      "Manual fulfillment approval",
    );

  const sourceReference =
    exactIdentityReference(
      candidate.policyDecision.id,
      candidate.policyDecision.version,
      "Fulfillment policy decision",
    );

  return Object.freeze({
    direction:
      FOOD_AUTHORIZED_FULFILLMENT_CHARGE_DIRECTION,
    reference,
    money: exactMoney(candidate.money),
    sourceReference,
  });
}
