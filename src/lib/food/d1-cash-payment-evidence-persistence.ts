/**
 * FOOD-008E: immutable durable FOOD-005I cash payment evidence.
 * Records one canonical cash receipt assertion against an exact
 * authenticated physical-order version.
 *
 * Does not authenticate the collector, receipt provenance or source
 * reference; establish paid-in-full, settlement, reservation,
 * readiness, preparation, dispatch, fulfillment, completed sale,
 * accounting, refunds or rewards.
 *
 * Global receipt-reference uniqueness is not established.
 * Exact order authentication is an application boundary.
 * Migration 0010 is declarative only in this development unit.
 */
import {
  validateFoodCashPaymentEvidenceVersion,
  validateFoodCashPaymentEvidenceAgainstOrder,
  type FoodCashPaymentEvidenceVersion,
} from "./cash-payment-evidence-domain";
import { readFoodPhysicalOrderVersionByExactIdentity } from "./d1-exact-physical-order-version-read";
import type { FoodPhysicalOrderVersion } from "./physical-order-domain";

export interface FoodCashPaymentEvidencePersistenceD1Database {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      all<T>(): Promise<{ readonly success: boolean; readonly results?: T[] }>;
    };
  };
}

export type FoodCashPaymentEvidencePersistenceResult =
  | Readonly<{ outcome: "created"; value: FoodCashPaymentEvidenceVersion }>
  | Readonly<{ outcome: "already-present"; value: FoodCashPaymentEvidenceVersion }>
  | Readonly<{ outcome: "conflict" }>
  | Readonly<{ outcome: "invalid" }>
  | Readonly<{ outcome: "storage-failure" }>;

const COLUMNS = [
  "cash_evidence_id", "cash_evidence_version", "order_id", "order_version",
  "merchandise_subtotal_currency", "merchandise_subtotal_minor_units",
  "channel", "cash_receipt_reference",
  "confirmation_source_reference", "received_amount_currency",
  "received_amount_minor_units",
] as const;

const EXACT_SQL = `
SELECT ${COLUMNS.join(", ")}
FROM food_cash_payment_evidence
WHERE cash_evidence_id = ? AND cash_evidence_version = ?
LIMIT 2
`.trim();

const INSERT_SQL = `
INSERT INTO food_cash_payment_evidence (${COLUMNS.join(", ")})
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
RETURNING ${COLUMNS.join(", ")}
`.trim();

function strictRecord(input: unknown, expected?: readonly string[]): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new TypeError("Expected plain record");
  }
  const prototype = Object.getPrototypeOf(input);
  const keys = Reflect.ownKeys(input);
  if (
    (prototype !== Object.prototype && prototype !== null) ||
    keys.some(key => typeof key !== "string") ||
    (expected !== undefined && (
      keys.length !== expected.length || keys.some(key => !expected.includes(key as string))
    ))
  ) {
    throw new TypeError("Noncanonical record shape");
  }
  const captured = Object.create(null) as Record<string, unknown>;
  for (const key of keys as string[]) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, "value")) {
      throw new TypeError("Expected own data field");
    }
    captured[key] = descriptor.value;
  }
  return captured;
}

function values(value: FoodCashPaymentEvidenceVersion): readonly (string | number)[] {
  return [
    value.id, value.version, value.order.id, value.order.version,
    value.order.merchandiseSubtotal.currency, value.order.merchandiseSubtotal.minorUnits,
    value.evidence.channel, value.evidence.cashReceiptReference, value.evidence.confirmationSourceReference,
    value.evidence.receivedAmount.currency, value.evidence.receivedAmount.minorUnits,
  ];
}

function candidate(input: unknown): FoodCashPaymentEvidenceVersion {
  const root = strictRecord(input, ["id", "version", "order", "evidence"]);
  const order = strictRecord(root.order, ["id", "version", "merchandiseSubtotal"]);
  const evidence = strictRecord(root.evidence, [
    "channel", "cashReceiptReference", "confirmationSourceReference", "receivedAmount",
  ]);
  const subtotal = strictRecord(order.merchandiseSubtotal, ["currency", "minorUnits"]);
  const amount = strictRecord(evidence.receivedAmount, ["currency", "minorUnits"]);
  const captured = {
    id: root.id,
    version: root.version,
    order: { id: order.id, version: order.version, merchandiseSubtotal: subtotal },
    evidence: { ...evidence, receivedAmount: amount },
  };
  const canonical = validateFoodCashPaymentEvidenceVersion(captured);
  const original = [
    root.id, root.version, order.id, order.version, subtotal.currency, subtotal.minorUnits,
    evidence.channel, evidence.cashReceiptReference,
    evidence.confirmationSourceReference, amount.currency, amount.minorUnits,
  ];
  if (canonical.version !== 1 || values(canonical).some((value, index) => value !== original[index])) {
    throw new TypeError("Unsupported or noncanonical cash payment evidence");
  }
  return canonical;
}

function stored(input: unknown, id: string, version: number): FoodCashPaymentEvidenceVersion {
  const row = strictRecord(input, COLUMNS);
  if (row.cash_evidence_id !== id || row.cash_evidence_version !== version) {
    throw new TypeError("Wrong durable cash evidence coordinates");
  }
  const canonical = candidate({
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
      confirmationSourceReference: row.confirmation_source_reference,
      receivedAmount: {
        currency: row.received_amount_currency,
        minorUnits: row.received_amount_minor_units,
      },
    },
  });
  if (
    (canonical.order.version !== 1 && canonical.order.version !== 2) ||
    values(canonical).some((value, index) => value !== row[COLUMNS[index]!])
  ) {
    throw new TypeError("Noncanonical durable values");
  }
  return canonical;
}

function rowsFromResponse(input: unknown): readonly unknown[] {
  // D1 metadata may accompany the required own success/results data fields.
  const envelope = strictRecord(input);
  if (envelope.success !== true || !Array.isArray(envelope.results)) {
    throw new TypeError("Uncertain D1 response");
  }
  const rows = envelope.results;
  if (Object.getPrototypeOf(rows) !== Array.prototype) {
    throw new TypeError("Unexpected result array prototype");
  }
  const length = Object.getOwnPropertyDescriptor(rows, "length")?.value;
  if (length !== 0 && length !== 1) throw new TypeError("Unexpected exact row count");
  const keys = Reflect.ownKeys(rows);
  if (keys.length !== length + 1 || keys.some(key => key !== "length" && key !== "0")) {
    throw new TypeError("Malformed result array shape");
  }
  if (length === 0) return [];
  const descriptor = Object.getOwnPropertyDescriptor(rows, "0");
  if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, "value")) {
    throw new TypeError("Expected own result row");
  }
  return [descriptor.value];
}

async function readExact(
  database: FoodCashPaymentEvidencePersistenceD1Database,
  requested: FoodCashPaymentEvidenceVersion,
): Promise<FoodCashPaymentEvidenceVersion | null> {
  const response = await database.prepare(EXACT_SQL).bind(requested.id, requested.version).all<unknown>();
  const rows = rowsFromResponse(response);
  return rows.length === 0 ? null : stored(rows[0], requested.id, requested.version);
}

function same(left: FoodCashPaymentEvidenceVersion, right: FoodCashPaymentEvidenceVersion): boolean {
  const rightValues = values(right);
  return values(left).every((value, index) => value === rightValues[index]);
}

function classify(
  existing: FoodCashPaymentEvidenceVersion,
  requested: FoodCashPaymentEvidenceVersion,
  order: FoodPhysicalOrderVersion,
): FoodCashPaymentEvidencePersistenceResult {
  // A canonical divergent row is enough to reject, not to claim payment truth.
  if (!same(existing, requested)) return Object.freeze({ outcome: "conflict" });
  const value = validateFoodCashPaymentEvidenceAgainstOrder(existing, order);
  return Object.freeze({ outcome: "already-present", value });
}

export async function appendFoodCashPaymentEvidence(
  database: FoodCashPaymentEvidencePersistenceD1Database,
  input: unknown,
): Promise<FoodCashPaymentEvidencePersistenceResult> {
  let requested: FoodCashPaymentEvidenceVersion;
  try {
    requested = candidate(input);
  }
  catch {
    return Object.freeze({ outcome: "invalid" });
  }

  try {
    const orderResult = await readFoodPhysicalOrderVersionByExactIdentity(
      database, requested.order.id, requested.order.version,
    );
    if (orderResult.outcome === "not-found") return Object.freeze({ outcome: "invalid" });
    if (orderResult.outcome === "invalid") return Object.freeze({ outcome: "invalid" });
    if (orderResult.outcome === "storage-failure") return Object.freeze({ outcome: "storage-failure" });
    const order = orderResult.value;
    try {
      requested = validateFoodCashPaymentEvidenceAgainstOrder(requested, order);
    }
    catch {
      return Object.freeze({ outcome: "invalid" });
    }
    const existing = await readExact(database, requested);
    if (existing !== null) return classify(existing, requested, order);

    try {
      const response = await database.prepare(INSERT_SQL).bind(...values(requested)).all<unknown>();
      const rows = rowsFromResponse(response);
      if (rows.length === 1) {
        const inserted = stored(rows[0], requested.id, requested.version);
        if (same(inserted, requested)) {
          const value = validateFoodCashPaymentEvidenceAgainstOrder(inserted, order);
          return Object.freeze({ outcome: "created", value });
        }
      }
    }
    catch {
      // An uncertain insert may have committed. Recover by exact identity once.
    }
    const recovered = await readExact(database, requested);
    return recovered === null
      ? Object.freeze({ outcome: "storage-failure" })
      : classify(recovered, requested, order);
  }
  catch {
    return Object.freeze({ outcome: "storage-failure" });
  }
}
