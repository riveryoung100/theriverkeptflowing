/**
 * FOOD-005O: authorized manual-fulfillment charge candidate.
 *
 * Purely derives exact charge authority from FOOD-005N policy truth plus
 * FOOD-005M positive approval truth. It does not create or mutate FOOD-005J,
 * does not prove assessment inclusion and does not create checkout/payment
 * readiness.
 */

import type {
  FoodMoney,
} from "./cost-pricing-domain";
import {
  validateFoodFulfillmentIntentVersion,
  type FoodFulfillmentIntentId,
  type FoodFulfillmentMethod,
} from "./fulfillment-capacity-reservation-domain";
import {
  validateFoodPhysicalOrderVersion,
  type FoodPhysicalOrderId,
} from "./physical-order-domain";
import {
  validateFoodManualFulfillmentApprovalAgainstSources,
  type FoodManualFulfillmentApprovalId,
} from "./manual-fulfillment-approval-domain";
import {
  validateFoodFulfillmentPolicyDecisionAgainstSources,
  type FoodFulfillmentPolicyDecisionId,
} from "./fulfillment-policy-decision-domain";

export const FOOD_AUTHORIZED_FULFILLMENT_CHARGE_KIND =
  "manual-fulfillment-approved-fee" as const;

export type FoodAuthorizedFulfillmentChargeKind =
  typeof FOOD_AUTHORIZED_FULFILLMENT_CHARGE_KIND;

export interface FoodAuthorizedFulfillmentChargeCandidate {
  readonly kind:
    FoodAuthorizedFulfillmentChargeKind;
  readonly order: Readonly<{
    id: FoodPhysicalOrderId;
    version: number;
  }>;
  readonly fulfillmentIntent: Readonly<{
    id: FoodFulfillmentIntentId;
    version: number;
    method: FoodFulfillmentMethod;
    locationReference: string;
    windowReference: string;
  }>;
  readonly policyDecision: Readonly<{
    id: FoodFulfillmentPolicyDecisionId;
    version: number;
    attribution: string;
    policyReference: string;
    decidedOn: string;
  }>;
  readonly manualApproval: Readonly<{
    id: FoodManualFulfillmentApprovalId;
    version: number;
    attribution: string;
    sourceReference: string;
    approvedOn: string;
  }>;
  readonly money: FoodMoney;
}

export function deriveFoodAuthorizedFulfillmentChargeCandidate(
  policyInput: unknown,
  approvalInput: unknown,
  orderInput: unknown,
  fulfillmentInput: unknown,
): FoodAuthorizedFulfillmentChargeCandidate {
  const order =
    validateFoodPhysicalOrderVersion(
      orderInput,
    );

  const fulfillment =
    validateFoodFulfillmentIntentVersion(
      fulfillmentInput,
    );

  const policy =
    validateFoodFulfillmentPolicyDecisionAgainstSources(
      policyInput,
      order,
      fulfillment,
    );

  const approval =
    validateFoodManualFulfillmentApprovalAgainstSources(
      approvalInput,
      order,
      fulfillment,
    );

  if (order.state !== "requested") {
    throw new TypeError(
      "Authorized fulfillment charge requires requested physical order",
    );
  }

  if (
    policy.manualApprovalRequirement !==
    "required"
  ) {
    throw new TypeError(
      "Authorized fulfillment charge requires manual approval policy",
    );
  }

  return Object.freeze({
    kind:
      FOOD_AUTHORIZED_FULFILLMENT_CHARGE_KIND,
    order: Object.freeze({
      id: order.id,
      version: order.version,
    }),
    fulfillmentIntent: Object.freeze({
      id: fulfillment.id,
      version: fulfillment.version,
      method: fulfillment.method,
      locationReference:
        fulfillment.locationReference,
      windowReference:
        fulfillment.windowReference,
    }),
    policyDecision: Object.freeze({
      id: policy.id,
      version: policy.version,
      attribution:
        policy.decision.attribution,
      policyReference:
        policy.decision.policyReference,
      decidedOn:
        policy.decision.decidedOn,
    }),
    manualApproval: Object.freeze({
      id: approval.id,
      version: approval.version,
      attribution:
        approval.approval.attribution,
      sourceReference:
        approval.approval.sourceReference,
      approvedOn:
        approval.approval.approvedOn,
    }),
    money: Object.freeze({
      currency:
        approval.approvedAdditionalFee.currency,
      minorUnits:
        approval.approvedAdditionalFee.minorUnits,
    }),
  });
}
