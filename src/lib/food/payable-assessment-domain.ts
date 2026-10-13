/**
 * FOOD-005J: exact-order payable assessment.
 *
 * This domain performs exact local money arithmetic over caller-supplied
 * commercial adjustments. It does not decide tax, fees, discounts, checkout
 * readiness, payment status, fulfillment, inventory or accounting truth.
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
  parseFoodPhysicalOrderId,
  validateFoodPhysicalOrderVersion,
  type FoodPhysicalOrderId,
  type FoodPhysicalOrderVersion,
} from "./physical-order-domain";

declare const payableAssessmentIdBrand: unique symbol;

export type FoodPayableAssessmentId = string & {
  readonly [payableAssessmentIdBrand]: true;
};

export type FoodPayableAdjustment = Readonly<{
  direction: "charge" | "credit";
  reference: string;
  money: FoodMoney;
  sourceReference: string;
}>;

export type FoodPayableAssessmentVersion = Readonly<{
  id: FoodPayableAssessmentId;
  version: number;
  order: Readonly<{
    id: FoodPhysicalOrderId;
    version: number;
    merchandiseSubtotal: FoodMoney;
  }>;
  adjustments: readonly FoodPayableAdjustment[];
  amountDue: FoodMoney;
  assessment: Readonly<{
    attribution: string;
    sourceReference: string;
    assessedOn: string;
  }>;
}>;

const PREFIX = "food-payable-assessment:";
const MAX_LOCAL_ID = 200;
const MAX_TEXT = 512;
const MAX_ADJUSTMENTS = 32;

function record(
  value: unknown,
  allowed: readonly string[],
): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new TypeError("Expected payable assessment object");
  }

  const result = value as Record<string, unknown>;
  const keys = Reflect.ownKeys(result);

  if (
    keys.some(
      (key) =>
        typeof key !== "string" ||
        !allowed.includes(key),
    )
  ) {
    throw new TypeError("Unsupported payable assessment field");
  }

  return result;
}

function text(
  value: unknown,
  label: string,
  maximum = MAX_TEXT,
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

function localIdentity(value: unknown): string {
  const parsed = text(
    value,
    "payable assessment local identity",
    MAX_LOCAL_ID,
  );

  if (parsed.includes(":")) {
    throw new TypeError(
      "Payable assessment local identity cannot contain colon",
    );
  }

  return parsed;
}

function copyMoney(value: unknown): FoodMoney {
  const money = validateFoodMoney(value);

  return Object.freeze({
    currency: money.currency,
    minorUnits: money.minorUnits,
  });
}

function sameMoney(a: FoodMoney, b: FoodMoney): boolean {
  return (
    a.currency === b.currency &&
    a.minorUnits === b.minorUnits
  );
}

function safeAdd(a: number, b: number): number {
  const result = a + b;

  if (!Number.isSafeInteger(result)) {
    throw new TypeError("Unsafe payable assessment arithmetic");
  }

  return result;
}

function copyOrder(
  value: unknown,
): FoodPayableAssessmentVersion["order"] {
  const input = record(value, [
    "id",
    "version",
    "merchandiseSubtotal",
  ]);

  return Object.freeze({
    id: parseFoodPhysicalOrderId(input.id),
    version: validateFoodVersion(input.version),
    merchandiseSubtotal: copyMoney(
      input.merchandiseSubtotal,
    ),
  });
}

function copyAdjustments(
  value: unknown,
  currency: string,
): readonly FoodPayableAdjustment[] {
  if (
    !Array.isArray(value) ||
    value.length > MAX_ADJUSTMENTS
  ) {
    throw new TypeError("Invalid payable adjustments");
  }

  const seen = new Set<string>();
  const result: FoodPayableAdjustment[] = [];

  for (let index = 0; index < value.length; index += 1) {
    if (!(index in value)) {
      throw new TypeError("Sparse payable adjustments are unsupported");
    }

    const input = record(value[index], [
      "direction",
      "reference",
      "money",
      "sourceReference",
    ]);

    if (
      input.direction !== "charge" &&
      input.direction !== "credit"
    ) {
      throw new TypeError("Invalid payable adjustment direction");
    }

    const reference = text(
      input.reference,
      "payable adjustment reference",
    );

    if (seen.has(reference)) {
      throw new TypeError(
        "Duplicate payable adjustment reference",
      );
    }

    seen.add(reference);

    const money = copyMoney(input.money);

    if (money.currency !== currency) {
      throw new TypeError(
        "Payable adjustment currency mismatch",
      );
    }

    result.push(
      Object.freeze({
        direction: input.direction,
        reference,
        money,
        sourceReference: text(
          input.sourceReference,
          "payable adjustment source reference",
        ),
      }),
    );
  }

  return Object.freeze(result);
}

function copyAssessment(
  value: unknown,
): FoodPayableAssessmentVersion["assessment"] {
  const input = record(value, [
    "attribution",
    "sourceReference",
    "assessedOn",
  ]);

  return Object.freeze({
    attribution: text(
      input.attribution,
      "payable assessment attribution",
    ),
    sourceReference: text(
      input.sourceReference,
      "payable assessment source reference",
    ),
    assessedOn: validateFoodReviewDate(input.assessedOn),
  });
}

function deriveAmountDue(
  merchandiseSubtotal: FoodMoney,
  adjustments: readonly FoodPayableAdjustment[],
): FoodMoney {
  let gross = merchandiseSubtotal.minorUnits;
  let credits = 0;

  for (const adjustment of adjustments) {
    if (adjustment.direction === "charge") {
      gross = safeAdd(
        gross,
        adjustment.money.minorUnits,
      );
    }
    else {
      credits = safeAdd(
        credits,
        adjustment.money.minorUnits,
      );
    }
  }

  if (credits > gross) {
    throw new TypeError(
      "Payable credits cannot exceed subtotal plus charges",
    );
  }

  return Object.freeze({
    currency: merchandiseSubtotal.currency,
    minorUnits: gross - credits,
  });
}

export function createFoodPayableAssessmentId(
  local: string,
): FoodPayableAssessmentId {
  return `${PREFIX}${localIdentity(local)}` as FoodPayableAssessmentId;
}

export function parseFoodPayableAssessmentId(
  value: unknown,
): FoodPayableAssessmentId {
  if (
    typeof value !== "string" ||
    !value.startsWith(PREFIX)
  ) {
    throw new TypeError("Invalid payable assessment ID");
  }

  const local = value.slice(PREFIX.length);

  if (`${PREFIX}${localIdentity(local)}` !== value) {
    throw new TypeError("Invalid payable assessment ID");
  }

  return value as FoodPayableAssessmentId;
}

export function validateFoodPayableAssessmentVersion(
  value: unknown,
): FoodPayableAssessmentVersion {
  const input = record(value, [
    "id",
    "version",
    "order",
    "adjustments",
    "amountDue",
    "assessment",
  ]);

  const order = copyOrder(input.order);

  const adjustments = copyAdjustments(
    input.adjustments,
    order.merchandiseSubtotal.currency,
  );

  const expectedAmountDue = deriveAmountDue(
    order.merchandiseSubtotal,
    adjustments,
  );

  const amountDue = copyMoney(input.amountDue);

  if (!sameMoney(expectedAmountDue, amountDue)) {
    throw new TypeError(
      "Payable assessment amountDue does not match exact arithmetic",
    );
  }

  return Object.freeze({
    id: parseFoodPayableAssessmentId(input.id),
    version: validateFoodVersion(input.version),
    order,
    adjustments,
    amountDue,
    assessment: copyAssessment(input.assessment),
  });
}

export function validateFoodPayableAssessmentAgainstOrder(
  value: unknown,
  orderInput: unknown,
): FoodPayableAssessmentVersion {
  const assessment =
    validateFoodPayableAssessmentVersion(value);

  const order =
    validateFoodPhysicalOrderVersion(orderInput);

  if (
    assessment.order.id !== order.id ||
    assessment.order.version !== order.version
  ) {
    throw new TypeError(
      "Payable assessment must bind exact physical order",
    );
  }

  if (
    !sameMoney(
      assessment.order.merchandiseSubtotal,
      order.merchandiseSubtotal,
    )
  ) {
    throw new TypeError(
      "Payable assessment merchandise subtotal snapshot mismatch",
    );
  }

  return assessment;
}

function build(
  identity: Readonly<{
    id: FoodPayableAssessmentId;
    version: number;
  }>,
  orderInput: FoodPhysicalOrderVersion,
  adjustmentsInput: readonly unknown[],
  assessmentInput: Readonly<{
    attribution: string;
    sourceReference: string;
    assessedOn: string;
  }>,
): FoodPayableAssessmentVersion {
  const order =
    validateFoodPhysicalOrderVersion(orderInput);

  const adjustments = copyAdjustments(
    adjustmentsInput,
    order.merchandiseSubtotal.currency,
  );

  const amountDue = deriveAmountDue(
    order.merchandiseSubtotal,
    adjustments,
  );

  return validateFoodPayableAssessmentAgainstOrder(
    {
      id: parseFoodPayableAssessmentId(identity.id),
      version: validateFoodVersion(identity.version),
      order: {
        id: order.id,
        version: order.version,
        merchandiseSubtotal: copyMoney(
          order.merchandiseSubtotal,
        ),
      },
      adjustments,
      amountDue,
      assessment: assessmentInput,
    },
    order,
  );
}

export function createInitialFoodPayableAssessmentVersion(
  identity: Readonly<{
    id: FoodPayableAssessmentId;
    version: number;
  }>,
  orderInput: FoodPhysicalOrderVersion,
  adjustmentsInput: readonly unknown[],
  assessmentInput: Readonly<{
    attribution: string;
    sourceReference: string;
    assessedOn: string;
  }>,
): FoodPayableAssessmentVersion {
  const version = validateFoodVersion(identity.version);

  if (version !== 1) {
    throw new TypeError(
      "Initial payable assessment version must be one",
    );
  }

  return build(
    {
      id: parseFoodPayableAssessmentId(identity.id),
      version,
    },
    orderInput,
    adjustmentsInput,
    assessmentInput,
  );
}

export function reviseFoodPayableAssessmentVersion(
  previousInput: unknown,
  identity: Readonly<{
    id: FoodPayableAssessmentId;
    version: number;
  }>,
  orderInput: FoodPhysicalOrderVersion,
  adjustmentsInput: readonly unknown[],
  assessmentInput: Readonly<{
    attribution: string;
    sourceReference: string;
    assessedOn: string;
  }>,
): FoodPayableAssessmentVersion {
  const previous =
    validateFoodPayableAssessmentVersion(previousInput);

  const nextVersion = validateFoodVersion(identity.version);

  if (
    previous.id !==
    parseFoodPayableAssessmentId(identity.id)
  ) {
    throw new TypeError(
      "Payable assessment identity drift",
    );
  }

  if (
    previous.version === Number.MAX_SAFE_INTEGER ||
    nextVersion !== previous.version + 1
  ) {
    throw new TypeError(
      "Payable assessment revision must be consecutive",
    );
  }

  const order =
    validateFoodPhysicalOrderVersion(orderInput);

  if (
    previous.order.id !== order.id ||
    previous.order.version !== order.version
  ) {
    throw new TypeError(
      "Payable assessment order binding drift",
    );
  }

  return build(
    {
      id: previous.id,
      version: nextVersion,
    },
    order,
    adjustmentsInput,
    assessmentInput,
  );
}
