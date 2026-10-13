/**
 * FOOD-005Q: exact authorized fulfillment charge inclusion evidence.
 *
 * This domain proves one exact FOOD-005J assessment contains the canonical
 * FOOD-005P adjustment rederived from trusted FOOD-005O authority.
 *
 * It does not select an assessment and grants no checkout/payment,
 * reservation, inventory, fulfillment, sale, accounting or rewards authority.
 */

import type {
  FoodAuthorizedFulfillmentChargeCandidate,
} from "./authorized-fulfillment-charge-candidate";

import {
  projectFoodAuthorizedFulfillmentChargeToPayableAdjustment,
  type FoodAuthorizedFulfillmentPayableChargeAdjustment,
} from "./authorized-fulfillment-charge-adjustment";

import {
  validateFoodPayableAssessmentAgainstOrder,
} from "./payable-assessment-domain";

import {
  validateFoodPhysicalOrderVersion,
} from "./physical-order-domain";

export const FOOD_AUTHORIZED_FULFILLMENT_CHARGE_ASSESSMENT_INCLUSION_KIND =
  "authorized-fulfillment-charge-assessment-inclusion" as const;

export interface FoodAuthorizedFulfillmentChargeAssessmentInclusion {
  readonly kind:
    typeof FOOD_AUTHORIZED_FULFILLMENT_CHARGE_ASSESSMENT_INCLUSION_KIND;

  readonly order: {
    readonly id: string;
    readonly version: number;
  };

  readonly payableAssessment: {
    readonly id: string;
    readonly version: number;
  };

  readonly adjustment:
    FoodAuthorizedFulfillmentPayableChargeAdjustment;
}

function exactAdjustmentMatch(
  actual: {
    readonly direction: string;
    readonly reference: string;
    readonly money: {
      readonly currency: string;
      readonly minorUnits: number;
    };
    readonly sourceReference: string;
  },
  expected:
    FoodAuthorizedFulfillmentPayableChargeAdjustment,
): boolean {
  return (
    actual.direction === expected.direction &&
    actual.reference === expected.reference &&
    actual.sourceReference === expected.sourceReference &&
    actual.money.currency === expected.money.currency &&
    actual.money.minorUnits === expected.money.minorUnits
  );
}

function freezeAdjustment(
  adjustment:
    FoodAuthorizedFulfillmentPayableChargeAdjustment,
): FoodAuthorizedFulfillmentPayableChargeAdjustment {
  return Object.freeze({
    direction: adjustment.direction,
    reference: adjustment.reference,
    money: Object.freeze({
      currency: adjustment.money.currency,
      minorUnits: adjustment.money.minorUnits,
    }),
    sourceReference:
      adjustment.sourceReference,
  });
}

export function validateFoodAuthorizedFulfillmentChargeAssessmentInclusion(
  candidate:
    FoodAuthorizedFulfillmentChargeCandidate,
  assessmentInput: unknown,
  orderInput: unknown,
): FoodAuthorizedFulfillmentChargeAssessmentInclusion {
  const order =
    validateFoodPhysicalOrderVersion(
      orderInput,
    );

  if (
    candidate.order.id !== order.id ||
    candidate.order.version !== order.version
  ) {
    throw new TypeError(
      "Authorized fulfillment charge candidate and physical order must bind the same exact order version",
    );
  }

  const assessment =
    validateFoodPayableAssessmentAgainstOrder(
      assessmentInput,
      order,
    );

  const expectedAdjustment =
    projectFoodAuthorizedFulfillmentChargeToPayableAdjustment(
      candidate,
    );

  const matches =
    assessment.adjustments.filter(
      (adjustment) =>
        exactAdjustmentMatch(
          adjustment,
          expectedAdjustment,
        ),
    );

  if (matches.length === 0) {
    throw new TypeError(
      "Payable assessment does not contain the exact authorized fulfillment charge adjustment",
    );
  }

  if (matches.length !== 1) {
    throw new TypeError(
      "Payable assessment must contain exactly one authorized fulfillment charge adjustment",
    );
  }

  return Object.freeze({
    kind:
      FOOD_AUTHORIZED_FULFILLMENT_CHARGE_ASSESSMENT_INCLUSION_KIND,

    order: Object.freeze({
      id: order.id,
      version: order.version,
    }),

    payableAssessment: Object.freeze({
      id: assessment.id,
      version: assessment.version,
    }),

    adjustment:
      freezeAdjustment(
        expectedAdjustment,
      ),
  });
}
