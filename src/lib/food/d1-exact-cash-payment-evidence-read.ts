/**
 * FOOD-008F — Exact durable cash-payment-evidence read.
 *
 * Reads one historical evidence record by exact identity and version.
 * The returned record grants no payment, fulfillment, settlement,
 * dispatch, refund, or accounting authority.
 *
 * This module never writes to D1 or selects a latest/current version.
 */

import {
  parseFoodCashPaymentEvidenceId,
  validateFoodCashPaymentEvidenceVersion,
  type FoodCashPaymentEvidenceVersion,
} from "./cash-payment-evidence-domain";

export interface FoodExactCashPaymentEvidenceReadD1Database {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      all<T>(): Promise<{
        readonly success: boolean;
        readonly results?: T[];
      }>;
    };
  };
}

export type FoodExactCashPaymentEvidenceReadResult =
  | Readonly<{
      outcome: "found";
      value: FoodCashPaymentEvidenceVersion;
    }>
  | Readonly<{ outcome: "not-found" }>
  | Readonly<{ outcome: "invalid" }>
  | Readonly<{ outcome: "storage-failure" }>;

const COLUMNS = Object.freeze([
  "cash_evidence_id",
  "cash_evidence_version",
  "order_id",
  "order_version",
  "merchandise_subtotal_currency",
  "merchandise_subtotal_minor_units",
  "channel",
  "cash_receipt_reference",
  "confirmation_source_reference",
  "received_amount_currency",
  "received_amount_minor_units",
] as const);

const EXACT_SQL = `
SELECT ${COLUMNS.join(", ")}
FROM food_cash_payment_evidence
WHERE cash_evidence_id = ? AND cash_evidence_version = ?
LIMIT 2
`.trim();

/**
 * Capture only own data descriptors. Accessors, symbol keys,
 * inherited properties, and unusual prototypes are rejected.
 */
function ownDataRecord(
  input: unknown,
): Record<string, unknown> {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new TypeError("Expected plain durable record");
  }

  const prototype = Object.getPrototypeOf(input);
  if (
    prototype !== Object.prototype &&
    prototype !== null
  ) {
    throw new TypeError("Unexpected durable prototype");
  }

  const keys = Reflect.ownKeys(input);
  if (keys.some((key) => typeof key !== "string")) {
    throw new TypeError("Unexpected symbol key");
  }

  const descriptors = Object.getOwnPropertyDescriptors(input);
  const captured: Record<string, unknown> =
    Object.create(null) as Record<string, unknown>;

  for (const key of keys) {
    if (typeof key !== "string") {
      throw new TypeError("Unexpected key");
    }

    const descriptor = descriptors[key];
    if (
      !descriptor ||
      !Object.prototype.hasOwnProperty.call(descriptor, "value")
    ) {
      throw new TypeError("Accessor or missing data descriptor");
    }

    captured[key] = descriptor.value;
  }

  return captured;
}

function exactDurableRow(
  input: unknown,
): Record<(typeof COLUMNS)[number], unknown> {
  const captured = ownDataRecord(input);
  const keys = Object.keys(captured);

  if (
    keys.length !== COLUMNS.length ||
    keys.some((key) => !COLUMNS.includes(
      key as (typeof COLUMNS)[number],
    ))
  ) {
    throw new TypeError("Unexpected durable columns");
  }

  return captured as Record<(typeof COLUMNS)[number], unknown>;
}

/**
 * D1 permits additional metadata on its result envelope,
 * but success/results must be own data fields.
 */
function rowsFromResponse(
  input: unknown,
): readonly unknown[] {
  const envelope = ownDataRecord(input);

  if (
    envelope.success !== true ||
    !Array.isArray(envelope.results)
  ) {
    throw new TypeError("Malformed D1 envelope");
  }

  const results = envelope.results;

  if (Object.getPrototypeOf(results) !== Array.prototype) {
    throw new TypeError("Unexpected D1 results prototype");
  }

  const lengthDescriptor =
    Object.getOwnPropertyDescriptor(results, "length");

  const length = lengthDescriptor?.value;

  if (length !== 0 && length !== 1) {
    throw new TypeError("Unexpected exact-row count");
  }

  const keys = Reflect.ownKeys(results);
  const expected = length === 0
    ? ["length"]
    : ["0", "length"];

  if (
    keys.length !== expected.length ||
    keys.some((key) =>
      typeof key !== "string" ||
      !expected.includes(key)
    )
  ) {
    throw new TypeError("Unexpected D1 results structure");
  }

  if (length === 0) {
    return Object.freeze([]);
  }

  const first = Object.getOwnPropertyDescriptor(results, "0");

  if (
    !first ||
    !Object.prototype.hasOwnProperty.call(first, "value")
  ) {
    throw new TypeError("Malformed D1 row element");
  }

  return Object.freeze([first.value]);
}

function reconstruct(
  rowInput: unknown,
  requestedId: string,
  requestedVersion: number,
): FoodCashPaymentEvidenceVersion {
  const row = exactDurableRow(rowInput);

  if (
    row.cash_evidence_id !== requestedId ||
    row.cash_evidence_version !== requestedVersion
  ) {
    throw new TypeError("Durable identity mismatch");
  }

  const value = validateFoodCashPaymentEvidenceVersion({
    id: row.cash_evidence_id,
    version: row.cash_evidence_version,
    order: {
      id: row.order_id,
      version: row.order_version,
      merchandiseSubtotal: {
        currency: row.merchandise_subtotal_currency,
        minorUnits: row.merchandise_subtotal_minor_units,
      },
    },
    evidence: {
      channel: row.channel,
      cashReceiptReference: row.cash_receipt_reference,
      confirmationSourceReference:
        row.confirmation_source_reference,
      receivedAmount: {
        currency: row.received_amount_currency,
        minorUnits: row.received_amount_minor_units,
      },
    },
  });

  if (
    value.id !== row.cash_evidence_id ||
    value.version !== row.cash_evidence_version ||
    value.order.id !== row.order_id ||
    value.order.version !== row.order_version ||
    value.order.merchandiseSubtotal.currency !==
      row.merchandise_subtotal_currency ||
    value.order.merchandiseSubtotal.minorUnits !==
      row.merchandise_subtotal_minor_units ||
    value.evidence.channel !== row.channel ||
    value.evidence.cashReceiptReference !==
      row.cash_receipt_reference ||
    value.evidence.confirmationSourceReference !==
      row.confirmation_source_reference ||
    value.evidence.receivedAmount.currency !==
      row.received_amount_currency ||
    value.evidence.receivedAmount.minorUnits !==
      row.received_amount_minor_units
  ) {
    throw new TypeError("Noncanonical durable evidence");
  }

  if (
    value.version !== 1 ||
    (value.order.version !== 1 && value.order.version !== 2)
  ) {
    throw new TypeError("Unsupported historical version");
  }

  // Freeze reconstructed owned values, never the database row.
  Object.freeze(value.order.merchandiseSubtotal);
  Object.freeze(value.order);
  Object.freeze(value.evidence.receivedAmount);
  Object.freeze(value.evidence);
  return Object.freeze(value);
}

/**
 * A single exact historical read.
 *
 * Invalid input cannot trigger a query.
 * Bad stored state or uncertain D1 responses never become "not-found".
 */
export async function readFoodCashPaymentEvidenceByExactIdentity(
  database: FoodExactCashPaymentEvidenceReadD1Database,
  cashEvidenceId: unknown,
  cashEvidenceVersion: unknown,
): Promise<FoodExactCashPaymentEvidenceReadResult> {
  let id: string;
  let version: number;

  try {
    const parsed = parseFoodCashPaymentEvidenceId(cashEvidenceId);

    if (
      parsed !== cashEvidenceId ||
      typeof cashEvidenceVersion !== "number" ||
      !Number.isSafeInteger(cashEvidenceVersion) ||
      cashEvidenceVersion !== 1
    ) {
      throw new TypeError("Invalid exact evidence identity");
    }

    id = parsed;
    version = cashEvidenceVersion;
  } catch {
    return Object.freeze({ outcome: "invalid" });
  }

  try {
    const response = await database
      .prepare(EXACT_SQL)
      .bind(id, version)
      .all<unknown>();

    const rows = rowsFromResponse(response);

    if (rows.length === 0) {
      return Object.freeze({ outcome: "not-found" });
    }

    const value = reconstruct(rows[0], id, version);

    return Object.freeze({
      outcome: "found",
      value,
    });
  } catch {
    return Object.freeze({ outcome: "storage-failure" });
  }
}
