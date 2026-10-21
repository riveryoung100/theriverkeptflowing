/**
 * FOOD-008B: Exact Authoritative Physical Order Version Read.
 * Found means only that this exact FOOD-005E version was durably recorded
 * and authenticated. It grants no reservation acceptance, checkout permission,
 * payment readiness/authorization/capture/paid-in-full, preparation, dispatch,
 * fulfillment, completed order/sale, inventory/capacity availability, refund,
 * reservation release, accounting or rewards authority.
 * A cancelled version is historical truth only; cancellation implies none
 * of refund, payment reversal, release, inventory or capacity restoration.
 */
import {
  parseFoodPhysicalOrderId,
  validateFoodPhysicalOrderVersion,
  type FoodPhysicalOrderVersion,
} from "./physical-order-domain";

export interface FoodExactPhysicalOrderVersionReadD1Database {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      all<T>(): Promise<{ readonly success: boolean; readonly results?: T[] }>;
    };
  };
}

export type FoodExactPhysicalOrderVersionReadResult =
  | Readonly<{ outcome: "found"; value: FoodPhysicalOrderVersion }>
  | Readonly<{ outcome: "not-found" }>
  | Readonly<{ outcome: "storage-failure" }>
  | Readonly<{ outcome: "invalid" }>;

const EXACT_SQL = `
SELECT
  order_id,
  order_version,
  state,
  snapshot_format_version,
  snapshot_json
FROM food_physical_order_versions
WHERE order_id = ?
  AND order_version = ?
LIMIT 2
`.trim();

function strictRecord(input: unknown, expected: readonly string[]): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new TypeError("Malformed durable record");
  }
  const prototype = Object.getPrototypeOf(input);
  const keys = Reflect.ownKeys(input);
  if (
    (prototype !== Object.prototype && prototype !== null) ||
    keys.length !== expected.length ||
    keys.some(key => typeof key !== "string" || !expected.includes(key))
  ) {
    throw new TypeError("Noncanonical durable record");
  }
  const captured = Object.create(null) as Record<string, unknown>;
  for (const key of expected) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, "value")) {
      throw new TypeError("Durable field must be own data");
    }
    captured[key] = descriptor.value;
  }
  return captured;
}

function rowsFromResponse(input: unknown): readonly unknown[] {
  // D1 may include metadata. Inspect every envelope property without invoking
  // accessors, but consume only the required own success/results data fields.
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new TypeError("Malformed D1 response");
  }
  const keys = Reflect.ownKeys(input);
  if (keys.some(key => typeof key !== "string")) {
    throw new TypeError("Malformed D1 response keys");
  }
  const envelope = strictRecord(input, keys as string[]);
  if (envelope.success !== true || !Array.isArray(envelope.results)) {
    throw new TypeError("Uncertain D1 response");
  }
  const rows = envelope.results;
  // Capture cardinality and the sole row without evaluating array accessors.
  const length = Object.getOwnPropertyDescriptor(rows, "length")?.value;
  if (length === 0) return [];
  if (length !== 1) throw new TypeError("Unexpected exact row count");
  const descriptor = Object.getOwnPropertyDescriptor(rows, "0");
  if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, "value")) {
    throw new TypeError("Malformed result row slot");
  }
  return [descriptor.value];
}

export async function readFoodPhysicalOrderVersionByExactIdentity(
  database: FoodExactPhysicalOrderVersionReadD1Database,
  orderId: unknown,
  orderVersion: unknown,
): Promise<FoodExactPhysicalOrderVersionReadResult> {
  let canonicalId: ReturnType<typeof parseFoodPhysicalOrderId>;
  try {
    canonicalId = parseFoodPhysicalOrderId(orderId);
    if (
      canonicalId !== orderId ||
      typeof orderVersion !== "number" ||
      !Number.isFinite(orderVersion) ||
      !Number.isSafeInteger(orderVersion) ||
      (orderVersion !== 1 && orderVersion !== 2)
    ) {
      throw new TypeError("Invalid exact lookup");
    }
  }
  catch {
    return Object.freeze({ outcome: "invalid" });
  }

  try {
    const response = await database.prepare(EXACT_SQL).bind(canonicalId, orderVersion).all<unknown>();
    const rows = rowsFromResponse(response);
    if (rows.length === 0) return Object.freeze({ outcome: "not-found" });
    const row = strictRecord(rows[0], [
      "order_id", "order_version", "state", "snapshot_format_version", "snapshot_json",
    ]);
    if (
      row.order_id !== canonicalId || row.order_version !== orderVersion ||
      row.snapshot_format_version !== 1 || typeof row.snapshot_json !== "string"
    ) {
      throw new TypeError("Wrong durable coordinates or format");
    }
    const snapshot = strictRecord(JSON.parse(row.snapshot_json), [
      "quote", "fulfillmentIntent", "reservationRequest", "lines", "merchandiseSubtotal",
    ]);
    const value = validateFoodPhysicalOrderVersion({
      id: row.order_id,
      version: row.order_version,
      state: row.state,
      quote: snapshot.quote,
      fulfillmentIntent: snapshot.fulfillmentIntent,
      reservationRequest: snapshot.reservationRequest,
      lines: snapshot.lines,
      merchandiseSubtotal: snapshot.merchandiseSubtotal,
    });
    if (
      (value.version === 1 && value.state !== "requested") ||
      (value.version === 2 && value.state !== "cancelled")
    ) {
      throw new TypeError("Incompatible durable lifecycle");
    }
    const canonicalSnapshotJson = JSON.stringify({
      quote: value.quote,
      fulfillmentIntent: value.fulfillmentIntent,
      reservationRequest: value.reservationRequest,
      lines: value.lines,
      merchandiseSubtotal: value.merchandiseSubtotal,
    });
    if (canonicalSnapshotJson !== row.snapshot_json) {
      throw new TypeError("Noncanonical durable snapshot text");
    }
    return Object.freeze({ outcome: "found", value });
  }
  catch {
    return Object.freeze({ outcome: "storage-failure" });
  }
}
