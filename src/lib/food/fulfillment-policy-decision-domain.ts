/**
 * FOOD-005N: exact fulfillment-policy manual-approval requirement.
 *
 * Records caller-supplied trusted-policy evidence declaring whether a separate
 * manual fulfillment approval is required for one exact physical-order /
 * fulfillment-intent snapshot.
 *
 * It does not calculate service area, radius, distance or routing. It does not
 * grant manual approval and does not create checkout/payment readiness.
 */

import {
  validateFoodReviewDate,
  validateFoodVersion,
} from "./draft-domain";
import {
  parseFoodFulfillmentIntentId,
  validateFoodFulfillmentIntentVersion,
  validateFoodFulfillmentMethod,
  type FoodFulfillmentIntentId,
  type FoodFulfillmentMethod,
} from "./fulfillment-capacity-reservation-domain";
import {
  parseFoodPhysicalOrderId,
  validateFoodPhysicalOrderVersion,
  type FoodPhysicalOrderId,
  type FoodPhysicalOrderVersion,
} from "./physical-order-domain";

export type FoodFulfillmentPolicyDecisionId =
  string & {
    readonly __brand: "FoodFulfillmentPolicyDecisionId";
  };

export const FOOD_MANUAL_APPROVAL_REQUIREMENTS =
  Object.freeze([
    "not-required",
    "required",
  ] as const);

export type FoodManualApprovalRequirement =
  (typeof FOOD_MANUAL_APPROVAL_REQUIREMENTS)[number];

export interface FoodFulfillmentPolicyDecisionVersion {
  readonly id: FoodFulfillmentPolicyDecisionId;
  readonly version: number;
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
  readonly manualApprovalRequirement:
    FoodManualApprovalRequirement;
  readonly decision: Readonly<{
    attribution: string;
    policyReference: string;
    decidedOn: string;
  }>;
}

function record(
  value: unknown,
  allowed: readonly string[],
  label: string,
): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new TypeError(`Invalid ${label}`);
  }

  if (
    Reflect.ownKeys(value).some(
      key =>
        typeof key !== "string" ||
        !allowed.includes(key),
    )
  ) {
    throw new TypeError(
      `Unsupported ${label} field`,
    );
  }

  return value as Record<string, unknown>;
}

function boundedText(
  value: unknown,
  maximum: number,
  label: string,
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximum ||
    value.trim() !== value
  ) {
    throw new TypeError(`Invalid ${label}`);
  }

  return value;
}

function localIdentity(
  value: unknown,
): string {
  const text = boundedText(
    value,
    128,
    "fulfillment policy decision local identity",
  );

  if (text.includes(":")) {
    throw new TypeError(
      "Fulfillment policy decision local identity cannot contain colon",
    );
  }

  return text;
}

export function createFoodFulfillmentPolicyDecisionId(
  value: unknown,
): FoodFulfillmentPolicyDecisionId {
  return `food-fulfillment-policy-decision:${localIdentity(value)}` as FoodFulfillmentPolicyDecisionId;
}

export function parseFoodFulfillmentPolicyDecisionId(
  value: unknown,
): FoodFulfillmentPolicyDecisionId {
  const prefix =
    "food-fulfillment-policy-decision:";

  const text = boundedText(
    value,
    prefix.length + 128,
    "fulfillment policy decision identity",
  );

  if (!text.startsWith(prefix)) {
    throw new TypeError(
      "Wrong fulfillment policy decision identity prefix",
    );
  }

  return createFoodFulfillmentPolicyDecisionId(
    text.slice(prefix.length),
  );
}

export function validateFoodManualApprovalRequirement(
  value: unknown,
): FoodManualApprovalRequirement {
  if (
    typeof value !== "string" ||
    !(
      FOOD_MANUAL_APPROVAL_REQUIREMENTS as readonly string[]
    ).includes(value)
  ) {
    throw new TypeError(
      "Invalid food manual approval requirement",
    );
  }

  return value as FoodManualApprovalRequirement;
}

export function validateFoodFulfillmentPolicyDecisionVersion(
  input: unknown,
): FoodFulfillmentPolicyDecisionVersion {
  const value = record(
    input,
    [
      "id",
      "version",
      "order",
      "fulfillmentIntent",
      "manualApprovalRequirement",
      "decision",
    ],
    "fulfillment policy decision",
  );

  const order = record(
    value.order,
    ["id", "version"],
    "fulfillment policy decision order reference",
  );

  const fulfillment = record(
    value.fulfillmentIntent,
    [
      "id",
      "version",
      "method",
      "locationReference",
      "windowReference",
    ],
    "fulfillment policy decision fulfillment snapshot",
  );

  const decision = record(
    value.decision,
    [
      "attribution",
      "policyReference",
      "decidedOn",
    ],
    "fulfillment policy decision metadata",
  );

  return Object.freeze({
    id:
      parseFoodFulfillmentPolicyDecisionId(
        value.id,
      ),
    version:
      validateFoodVersion(
        value.version,
      ),
    order: Object.freeze({
      id:
        parseFoodPhysicalOrderId(
          order.id,
        ),
      version:
        validateFoodVersion(
          order.version,
        ),
    }),
    fulfillmentIntent: Object.freeze({
      id:
        parseFoodFulfillmentIntentId(
          fulfillment.id,
        ),
      version:
        validateFoodVersion(
          fulfillment.version,
        ),
      method:
        validateFoodFulfillmentMethod(
          fulfillment.method,
        ),
      locationReference:
        boundedText(
          fulfillment.locationReference,
          512,
          "policy fulfillment location reference",
        ),
      windowReference:
        boundedText(
          fulfillment.windowReference,
          512,
          "policy fulfillment window reference",
        ),
    }),
    manualApprovalRequirement:
      validateFoodManualApprovalRequirement(
        value.manualApprovalRequirement,
      ),
    decision: Object.freeze({
      attribution:
        boundedText(
          decision.attribution,
          512,
          "fulfillment policy decision attribution",
        ),
      policyReference:
        boundedText(
          decision.policyReference,
          512,
          "fulfillment policy reference",
        ),
      decidedOn:
        validateFoodReviewDate(
          decision.decidedOn,
        ),
    }),
  });
}

function assertExactSources(
  decision:
    FoodFulfillmentPolicyDecisionVersion,
  order:
    FoodPhysicalOrderVersion,
  fulfillment:
    ReturnType<
      typeof validateFoodFulfillmentIntentVersion
    >,
): void {
  if (
    decision.order.id !== order.id ||
    decision.order.version !== order.version
  ) {
    throw new TypeError(
      "Fulfillment policy decision physical order mismatch",
    );
  }

  if (
    decision.fulfillmentIntent.id !==
      fulfillment.id ||
    decision.fulfillmentIntent.version !==
      fulfillment.version
  ) {
    throw new TypeError(
      "Fulfillment policy decision intent mismatch",
    );
  }

  if (
    order.fulfillmentIntent.id !==
      fulfillment.id ||
    order.fulfillmentIntent.version !==
      fulfillment.version
  ) {
    throw new TypeError(
      "Physical order fulfillment intent mismatch",
    );
  }

  if (
    decision.fulfillmentIntent.method !==
      fulfillment.method ||
    decision.fulfillmentIntent.locationReference !==
      fulfillment.locationReference ||
    decision.fulfillmentIntent.windowReference !==
      fulfillment.windowReference
  ) {
    throw new TypeError(
      "Fulfillment policy decision snapshot mismatch",
    );
  }
}

export function validateFoodFulfillmentPolicyDecisionAgainstSources(
  input: unknown,
  orderInput: unknown,
  fulfillmentInput: unknown,
): FoodFulfillmentPolicyDecisionVersion {
  const decision =
    validateFoodFulfillmentPolicyDecisionVersion(
      input,
    );

  const order =
    validateFoodPhysicalOrderVersion(
      orderInput,
    );

  const fulfillment =
    validateFoodFulfillmentIntentVersion(
      fulfillmentInput,
    );

  assertExactSources(
    decision,
    order,
    fulfillment,
  );

  return decision;
}

export function createInitialFoodFulfillmentPolicyDecisionVersion(
  identityInput: unknown,
  orderInput: unknown,
  fulfillmentInput: unknown,
  decisionInput: unknown,
): FoodFulfillmentPolicyDecisionVersion {
  const identity = record(
    identityInput,
    ["id", "version"],
    "fulfillment policy decision identity/version",
  );

  const order =
    validateFoodPhysicalOrderVersion(
      orderInput,
    );

  const fulfillment =
    validateFoodFulfillmentIntentVersion(
      fulfillmentInput,
    );

  const supplied = record(
    decisionInput,
    [
      "manualApprovalRequirement",
      "attribution",
      "policyReference",
      "decidedOn",
    ],
    "fulfillment policy decision input",
  );

  const value =
    validateFoodFulfillmentPolicyDecisionAgainstSources(
      {
        id:
          parseFoodFulfillmentPolicyDecisionId(
            identity.id,
          ),
        version:
          validateFoodVersion(
            identity.version,
          ),
        order: {
          id: order.id,
          version: order.version,
        },
        fulfillmentIntent: {
          id: fulfillment.id,
          version: fulfillment.version,
          method: fulfillment.method,
          locationReference:
            fulfillment.locationReference,
          windowReference:
            fulfillment.windowReference,
        },
        manualApprovalRequirement:
          supplied.manualApprovalRequirement,
        decision: {
          attribution:
            supplied.attribution,
          policyReference:
            supplied.policyReference,
          decidedOn:
            supplied.decidedOn,
        },
      },
      order,
      fulfillment,
    );

  if (value.version !== 1) {
    throw new TypeError(
      "Initial fulfillment policy decision version must be one",
    );
  }

  return value;
}
