/**
 * FOOD-005K: exact payment reconciliation projection.
 */

import {
  validateFoodVersion,
} from "./draft-domain";
import {
  validateFoodMoney,
  type FoodMoney,
} from "./cost-pricing-domain";
import {
  parseFoodPhysicalOrderId,
  type FoodPhysicalOrderId,
} from "./physical-order-domain";
import {
  validateFoodPayableAssessmentVersion,
  type FoodPayableAssessmentId,
  type FoodPayableAssessmentVersion,
} from "./payable-assessment-domain";

export const FOOD_PAYMENT_RECONCILIATION_STATUSES =
  Object.freeze([
    "no-payment-due",
    "unpaid",
    "partially-paid",
    "paid-in-full",
    "overpaid",
  ] as const);

export type FoodPaymentReconciliationStatus =
  (typeof FOOD_PAYMENT_RECONCILIATION_STATUSES)[number];

export const FOOD_RECONCILIATION_SOURCE_KINDS =
  Object.freeze([
    "electronic-confirmation",
    "cash-evidence",
  ] as const);

export type FoodReconciliationSourceKind =
  (typeof FOOD_RECONCILIATION_SOURCE_KINDS)[number];

export type FoodNormalizedPaymentEvidence = Readonly<{
  sourceKind: FoodReconciliationSourceKind;
  sourceId: string;
  sourceVersion: number;
  order: Readonly<{
    id: FoodPhysicalOrderId;
    version: number;
    merchandiseSubtotal: FoodMoney;
  }>;
  amount: FoodMoney;
}>;

export type FoodPaymentReconciliation = Readonly<{
  assessment: Readonly<{
    id: FoodPayableAssessmentId;
    version: number;
  }>;
  order: Readonly<{
    id: FoodPhysicalOrderId;
    version: number;
    merchandiseSubtotal: FoodMoney;
  }>;
  evidence: readonly FoodNormalizedPaymentEvidence[];
  amountDue: FoodMoney;
  evidenceTotal: FoodMoney;
  remainingBalance: FoodMoney;
  overpaymentAmount: FoodMoney;
  status: FoodPaymentReconciliationStatus;
}>;

const MAX_TEXT = 512;
const MAX_EVIDENCE = 64;
const MAX_SAFE_MINOR_UNITS =
  BigInt(Number.MAX_SAFE_INTEGER);

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

  const result = value as Record<string, unknown>;
  const keys = Reflect.ownKeys(result);

  if (
    keys.some(
      (key) =>
        typeof key !== "string" ||
        !allowed.includes(key),
    )
  ) {
    throw new TypeError(`Unsupported ${label} field`);
  }

  return result;
}

function text(
  value: unknown,
  label: string,
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_TEXT ||
    value.trim() !== value
  ) {
    throw new TypeError(`Invalid ${label}`);
  }

  return value;
}

function copyMoney(value: unknown): FoodMoney {
  const valueMoney = validateFoodMoney(value);

  return Object.freeze({
    currency: valueMoney.currency,
    minorUnits: valueMoney.minorUnits,
  });
}

function sameMoney(
  left: FoodMoney,
  right: FoodMoney,
): boolean {
  return (
    left.currency === right.currency &&
    left.minorUnits === right.minorUnits
  );
}

function money(
  currency: string,
  minorUnits: bigint,
): FoodMoney {
  if (
    minorUnits < 0n ||
    minorUnits > MAX_SAFE_MINOR_UNITS
  ) {
    throw new TypeError(
      "Payment reconciliation arithmetic exceeds safe integer",
    );
  }

  return Object.freeze({
    currency,
    minorUnits: Number(minorUnits),
  });
}

function sourceKind(
  value: unknown,
): FoodReconciliationSourceKind {
  if (
    value !== "electronic-confirmation" &&
    value !== "cash-evidence"
  ) {
    throw new TypeError(
      "Invalid payment reconciliation source kind",
    );
  }

  return value;
}

function copyEvidence(
  value: unknown,
  assessment: FoodPayableAssessmentVersion,
): FoodNormalizedPaymentEvidence {
  const input = record(
    value,
    [
      "sourceKind",
      "sourceId",
      "sourceVersion",
      "order",
      "amount",
    ],
    "normalized payment evidence",
  );

  const orderInput = record(
    input.order,
    [
      "id",
      "version",
      "merchandiseSubtotal",
    ],
    "normalized payment evidence order",
  );

  const order = Object.freeze({
    id: parseFoodPhysicalOrderId(orderInput.id),
    version: validateFoodVersion(orderInput.version),
    merchandiseSubtotal: copyMoney(
      orderInput.merchandiseSubtotal,
    ),
  });

  if (
    order.id !== assessment.order.id ||
    order.version !== assessment.order.version
  ) {
    throw new TypeError(
      "Payment evidence must bind exact assessment physical order",
    );
  }

  if (
    !sameMoney(
      order.merchandiseSubtotal,
      assessment.order.merchandiseSubtotal,
    )
  ) {
    throw new TypeError(
      "Payment evidence merchandise subtotal snapshot mismatch",
    );
  }

  const amount = copyMoney(input.amount);

  if (
    amount.currency !==
    assessment.amountDue.currency
  ) {
    throw new TypeError(
      "Payment evidence currency mismatch",
    );
  }

  return Object.freeze({
    sourceKind: sourceKind(input.sourceKind),
    sourceId: text(
      input.sourceId,
      "payment evidence source ID",
    ),
    sourceVersion: validateFoodVersion(
      input.sourceVersion,
    ),
    order,
    amount,
  });
}

export function validateFoodNormalizedPaymentEvidence(
  value: unknown,
  assessmentInput: unknown,
): FoodNormalizedPaymentEvidence {
  const assessment =
    validateFoodPayableAssessmentVersion(
      assessmentInput,
    );

  return copyEvidence(value, assessment);
}

export function deriveFoodPaymentReconciliation(
  assessmentInput: unknown,
  evidenceInput: unknown,
): FoodPaymentReconciliation {
  const assessment =
    validateFoodPayableAssessmentVersion(
      assessmentInput,
    );

  if (
    !Array.isArray(evidenceInput) ||
    evidenceInput.length > MAX_EVIDENCE
  ) {
    throw new TypeError(
      "Invalid payment reconciliation evidence collection",
    );
  }

  const evidence: FoodNormalizedPaymentEvidence[] = [];
  const seen = new Set<string>();
  let total = 0n;

  for (
    let index = 0;
    index < evidenceInput.length;
    index += 1
  ) {
    if (!(index in evidenceInput)) {
      throw new TypeError(
        "Sparse payment reconciliation evidence is unsupported",
      );
    }

    const item = copyEvidence(
      evidenceInput[index],
      assessment,
    );

    const key =
      `${item.sourceKind}:${item.sourceId}@${item.sourceVersion}`;

    if (seen.has(key)) {
      throw new TypeError(
        "Duplicate payment evidence source identity/version",
      );
    }

    seen.add(key);

    total += BigInt(item.amount.minorUnits);

    if (total > MAX_SAFE_MINOR_UNITS) {
      throw new TypeError(
        "Payment reconciliation evidence total exceeds safe integer",
      );
    }

    evidence.push(item);
  }

  const due =
    BigInt(assessment.amountDue.minorUnits);

  let status: FoodPaymentReconciliationStatus;

  if (due === 0n && total === 0n) {
    status = "no-payment-due";
  }
  else if (total === 0n) {
    status = "unpaid";
  }
  else if (total < due) {
    status = "partially-paid";
  }
  else if (total === due) {
    status = "paid-in-full";
  }
  else {
    status = "overpaid";
  }

  const remaining =
    due > total ? due - total : 0n;

  const overpayment =
    total > due ? total - due : 0n;

  return Object.freeze({
    assessment: Object.freeze({
      id: assessment.id,
      version: assessment.version,
    }),
    order: Object.freeze({
      id: assessment.order.id,
      version: assessment.order.version,
      merchandiseSubtotal: copyMoney(
        assessment.order.merchandiseSubtotal,
      ),
    }),
    evidence: Object.freeze(evidence),
    amountDue: copyMoney(assessment.amountDue),
    evidenceTotal: money(
      assessment.amountDue.currency,
      total,
    ),
    remainingBalance: money(
      assessment.amountDue.currency,
      remaining,
    ),
    overpaymentAmount: money(
      assessment.amountDue.currency,
      overpayment,
    ),
    status,
  });
}
