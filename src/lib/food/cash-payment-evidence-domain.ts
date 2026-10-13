import { validateFoodVersion } from "./draft-domain";
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

declare const cashPaymentEvidenceIdBrand: unique symbol;

export type FoodCashPaymentEvidenceId = string & {
  readonly [cashPaymentEvidenceIdBrand]: true;
};

export type FoodCashPaymentEvidenceVersion = Readonly<{
  id: FoodCashPaymentEvidenceId;
  version: number;
  order: Readonly<{
    id: FoodPhysicalOrderId;
    version: number;
    merchandiseSubtotal: FoodMoney;
  }>;
  evidence: Readonly<{
    channel: "cash";
    cashReceiptReference: string;
    confirmationSourceReference: string;
    receivedAmount: FoodMoney;
  }>;
}>;

const PREFIX = "food-cash-payment-evidence:";
const MAX_LOCAL_ID = 200;
const MAX_REFERENCE = 500;

function record(
  value: unknown,
  allowed?: readonly string[],
): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new TypeError("Expected object");
  }

  const result = value as Record<string, unknown>;

  if (allowed !== undefined) {
    const own = Reflect.ownKeys(result);

    if (own.some((key) => typeof key !== "string")) {
      throw new TypeError("Unexpected symbol property");
    }

    for (const key of own as string[]) {
      if (!allowed.includes(key)) {
        throw new TypeError(`Unexpected field: ${key}`);
      }
    }
  }

  return result;
}

function text(
  value: unknown,
  label: string,
  maximum: number,
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
  const parsed = text(value, "cash payment evidence identity", MAX_LOCAL_ID);

  if (parsed.includes(":")) {
    throw new TypeError(
      "Cash payment evidence local identity cannot contain colon",
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

function moneyEqual(a: FoodMoney, b: FoodMoney): boolean {
  return (
    a.currency === b.currency &&
    a.minorUnits === b.minorUnits
  );
}

export function createFoodCashPaymentEvidenceId(
  local: string,
): FoodCashPaymentEvidenceId {
  return `${PREFIX}${localIdentity(local)}` as FoodCashPaymentEvidenceId;
}

export function parseFoodCashPaymentEvidenceId(
  value: unknown,
): FoodCashPaymentEvidenceId {
  if (
    typeof value !== "string" ||
    !value.startsWith(PREFIX)
  ) {
    throw new TypeError("Invalid cash payment evidence ID");
  }

  const local = value.slice(PREFIX.length);

  if (`${PREFIX}${localIdentity(local)}` !== value) {
    throw new TypeError("Invalid cash payment evidence ID");
  }

  return value as FoodCashPaymentEvidenceId;
}

function copyOrderSnapshot(
  value: unknown,
): FoodCashPaymentEvidenceVersion["order"] {
  const input = record(value, [
    "id",
    "version",
    "merchandiseSubtotal",
  ]);

  return Object.freeze({
    id: parseFoodPhysicalOrderId(input.id),
    version: validateFoodVersion(input.version),
    merchandiseSubtotal: copyMoney(input.merchandiseSubtotal),
  });
}

function copyEvidence(
  value: unknown,
): FoodCashPaymentEvidenceVersion["evidence"] {
  const input = record(value, [
    "channel",
    "cashReceiptReference",
    "confirmationSourceReference",
    "receivedAmount",
  ]);

  if (input.channel !== "cash") {
    throw new TypeError("Cash payment evidence channel must be cash");
  }

  return Object.freeze({
    channel: "cash" as const,
    cashReceiptReference: text(
      input.cashReceiptReference,
      "cash receipt reference",
      MAX_REFERENCE,
    ),
    confirmationSourceReference: text(
      input.confirmationSourceReference,
      "cash confirmation source reference",
      MAX_REFERENCE,
    ),
    receivedAmount: copyMoney(input.receivedAmount),
  });
}

export function validateFoodCashPaymentEvidenceVersion(
  value: unknown,
): FoodCashPaymentEvidenceVersion {
  const input = record(value, [
    "id",
    "version",
    "order",
    "evidence",
  ]);

  return Object.freeze({
    id: parseFoodCashPaymentEvidenceId(input.id),
    version: validateFoodVersion(input.version),
    order: copyOrderSnapshot(input.order),
    evidence: copyEvidence(input.evidence),
  });
}

export function validateFoodCashPaymentEvidenceAgainstOrder(
  value: unknown,
  orderInput: unknown,
): FoodCashPaymentEvidenceVersion {
  const evidence = validateFoodCashPaymentEvidenceVersion(value);
  const order = validateFoodPhysicalOrderVersion(orderInput);

  if (
    evidence.order.id !== order.id ||
    evidence.order.version !== order.version
  ) {
    throw new TypeError(
      "Cash payment evidence must bind exact physical order",
    );
  }

  if (
    !moneyEqual(
      evidence.order.merchandiseSubtotal,
      order.merchandiseSubtotal,
    )
  ) {
    throw new TypeError(
      "Cash payment evidence order subtotal snapshot mismatch",
    );
  }

  return evidence;
}

export function createInitialFoodCashPaymentEvidenceVersion(
  identity: Readonly<{
    id: FoodCashPaymentEvidenceId;
    version: number;
  }>,
  orderInput: FoodPhysicalOrderVersion,
  evidenceInput: Readonly<{
    channel: "cash";
    cashReceiptReference: string;
    confirmationSourceReference: string;
    receivedAmount: FoodMoney;
  }>,
): FoodCashPaymentEvidenceVersion {
  const version = validateFoodVersion(identity.version);

  if (version !== 1) {
    throw new TypeError(
      "Initial cash payment evidence version must be one",
    );
  }

  const order = validateFoodPhysicalOrderVersion(orderInput);

  return validateFoodCashPaymentEvidenceAgainstOrder(
    {
      id: parseFoodCashPaymentEvidenceId(identity.id),
      version,
      order: {
        id: order.id,
        version: order.version,
        merchandiseSubtotal: copyMoney(order.merchandiseSubtotal),
      },
      evidence: {
        channel: "cash",
        cashReceiptReference: evidenceInput.cashReceiptReference,
        confirmationSourceReference:
          evidenceInput.confirmationSourceReference,
        receivedAmount: copyMoney(evidenceInput.receivedAmount),
      },
    },
    order,
  );
}
