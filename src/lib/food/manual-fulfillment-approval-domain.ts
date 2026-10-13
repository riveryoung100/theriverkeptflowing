/**
 * FOOD-005M: exact manual fulfillment approval evidence.
 *
 * Records caller-supplied positive approval for the exact fulfillment terms of
 * one exact FOOD-005E physical-order version. It does not calculate service
 * area, distance or routing; does not mutate payable assessment; and does not
 * create checkout, payment, preparation, dispatch or fulfillment authority.
 */

import {
  validateFoodReviewDate,
  validateFoodVersion,
} from "./draft-domain";
import {
  validateFoodMoney,
  type FoodMoney,
} from "./cost-pricing-domain";
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

export type FoodManualFulfillmentApprovalId =
  string & {
    readonly __brand: "FoodManualFulfillmentApprovalId";
  };

export interface FoodManualFulfillmentApprovalVersion {
  readonly id: FoodManualFulfillmentApprovalId;
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
  readonly approvedAdditionalFee: FoodMoney;
  readonly approval: Readonly<{
    attribution: string;
    sourceReference: string;
    approvedOn: string;
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
    "manual fulfillment approval local identity",
  );

  if (text.includes(":")) {
    throw new TypeError(
      "Manual fulfillment approval local identity cannot contain colon",
    );
  }

  return text;
}

export function createFoodManualFulfillmentApprovalId(
  value: unknown,
): FoodManualFulfillmentApprovalId {
  return `food-manual-fulfillment-approval:${localIdentity(value)}` as FoodManualFulfillmentApprovalId;
}

export function parseFoodManualFulfillmentApprovalId(
  value: unknown,
): FoodManualFulfillmentApprovalId {
  const prefix =
    "food-manual-fulfillment-approval:";

  const text = boundedText(
    value,
    prefix.length + 128,
    "manual fulfillment approval identity",
  );

  if (!text.startsWith(prefix)) {
    throw new TypeError(
      "Wrong manual fulfillment approval identity prefix",
    );
  }

  return createFoodManualFulfillmentApprovalId(
    text.slice(prefix.length),
  );
}

export function validateFoodManualFulfillmentApprovalVersion(
  input: unknown,
): FoodManualFulfillmentApprovalVersion {
  const value = record(
    input,
    [
      "id",
      "version",
      "order",
      "fulfillmentIntent",
      "approvedAdditionalFee",
      "approval",
    ],
    "manual fulfillment approval",
  );

  const order = record(
    value.order,
    ["id", "version"],
    "manual fulfillment approval order reference",
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
    "manual fulfillment approval fulfillment snapshot",
  );

  const approval = record(
    value.approval,
    [
      "attribution",
      "sourceReference",
      "approvedOn",
    ],
    "manual fulfillment approval metadata",
  );

  const fee =
    validateFoodMoney(
      value.approvedAdditionalFee,
    );

  return Object.freeze({
    id:
      parseFoodManualFulfillmentApprovalId(
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
          "approved fulfillment location reference",
        ),
      windowReference:
        boundedText(
          fulfillment.windowReference,
          512,
          "approved fulfillment window reference",
        ),
    }),
    approvedAdditionalFee:
      Object.freeze({
        currency: fee.currency,
        minorUnits: fee.minorUnits,
      }),
    approval: Object.freeze({
      attribution:
        boundedText(
          approval.attribution,
          512,
          "manual fulfillment approval attribution",
        ),
      sourceReference:
        boundedText(
          approval.sourceReference,
          512,
          "manual fulfillment approval source reference",
        ),
      approvedOn:
        validateFoodReviewDate(
          approval.approvedOn,
        ),
    }),
  });
}

function assertExactSources(
  approval:
    FoodManualFulfillmentApprovalVersion,
  order:
    FoodPhysicalOrderVersion,
  fulfillment:
    ReturnType<
      typeof validateFoodFulfillmentIntentVersion
    >,
): void {
  if (
    approval.order.id !== order.id ||
    approval.order.version !== order.version
  ) {
    throw new TypeError(
      "Manual fulfillment approval physical order mismatch",
    );
  }

  if (
    approval.fulfillmentIntent.id !==
      fulfillment.id ||
    approval.fulfillmentIntent.version !==
      fulfillment.version
  ) {
    throw new TypeError(
      "Manual fulfillment approval intent mismatch",
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
    approval.fulfillmentIntent.method !==
      fulfillment.method ||
    approval.fulfillmentIntent.locationReference !==
      fulfillment.locationReference ||
    approval.fulfillmentIntent.windowReference !==
      fulfillment.windowReference
  ) {
    throw new TypeError(
      "Manual fulfillment approval snapshot mismatch",
    );
  }

  if (
    approval.approvedAdditionalFee.currency !==
      order.merchandiseSubtotal.currency
  ) {
    throw new TypeError(
      "Manual fulfillment approval fee currency mismatch",
    );
  }
}

export function validateFoodManualFulfillmentApprovalAgainstSources(
  input: unknown,
  orderInput: unknown,
  fulfillmentInput: unknown,
): FoodManualFulfillmentApprovalVersion {
  const approval =
    validateFoodManualFulfillmentApprovalVersion(
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
    approval,
    order,
    fulfillment,
  );

  return approval;
}

export function createInitialFoodManualFulfillmentApprovalVersion(
  identityInput: unknown,
  orderInput: unknown,
  fulfillmentInput: unknown,
  approvalInput: unknown,
): FoodManualFulfillmentApprovalVersion {
  const identity = record(
    identityInput,
    ["id", "version"],
    "manual fulfillment approval identity/version",
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
    approvalInput,
    [
      "approvedAdditionalFee",
      "attribution",
      "sourceReference",
      "approvedOn",
    ],
    "manual fulfillment approval input",
  );

  const value =
    validateFoodManualFulfillmentApprovalAgainstSources(
      {
        id:
          parseFoodManualFulfillmentApprovalId(
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
        approvedAdditionalFee:
          supplied.approvedAdditionalFee,
        approval: {
          attribution:
            supplied.attribution,
          sourceReference:
            supplied.sourceReference,
          approvedOn:
            supplied.approvedOn,
        },
      },
      order,
      fulfillment,
    );

  if (value.version !== 1) {
    throw new TypeError(
      "Initial manual fulfillment approval version must be one",
    );
  }

  return value;
}
