/**
 * FOOD-008G: append immutable historical payable-assessment assertions.
 * Does not authenticate assessor/policy provenance or establish current payable,
 * payment, checkout, settlement, refund, fulfillment or accounting authority.
 * Requires migration 0011 guards installed; no migration is executed here.
 */
import {
  validateFoodPayableAssessmentVersion,
  validateFoodPayableAssessmentAgainstOrder,
  reviseFoodPayableAssessmentVersion,
  type FoodPayableAssessmentVersion,
  type FoodPayableAssessmentId,
} from "./payable-assessment-domain";
import type { FoodMoney } from "./cost-pricing-domain";
import type { FoodPhysicalOrderVersion } from "./physical-order-domain";
import { readFoodPhysicalOrderVersionByExactIdentity } from "./d1-exact-physical-order-version-read";

export interface FoodPayableAssessmentPersistenceD1Database {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      all<T>(): Promise<{ readonly success: boolean; readonly results?: T[] }>;
    };
  };
}

export type FoodPayableAssessmentPersistenceResult =
  | Readonly<{ outcome: "created"; value: FoodPayableAssessmentVersion }>
  | Readonly<{ outcome: "already-present"; value: FoodPayableAssessmentVersion }>
  | Readonly<{ outcome: "conflict" }>
  | Readonly<{ outcome: "invalid" }>
  | Readonly<{ outcome: "storage-failure" }>;

const COLUMNS = [
  "assessment_id", "assessment_version", "order_id", "order_version",
  "snapshot_format_version", "snapshot_json",
] as const;
const EXACT_SQL = `
SELECT ${COLUMNS.join(", ")}
FROM food_payable_assessment_versions
WHERE assessment_id = ? AND assessment_version = ?
LIMIT 2
`.trim();
const INSERT_SQL = `
INSERT INTO food_payable_assessment_versions (${COLUMNS.join(", ")})
VALUES (?, ?, ?, ?, ?, ?)
RETURNING ${COLUMNS.join(", ")}
`.trim();

// Inspection can invoke proxy traps. Capture data descriptors only and catch
// errors at the caller/storage boundary; never promise universal proxy detection.
function record(input: unknown, expected?: readonly string[]): Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Expected assessment record");
  }
  const prototype = Object.getPrototypeOf(input);
  const keys = Reflect.ownKeys(input);
  if (
    (prototype !== Object.prototype && prototype !== null) ||
    keys.some(key => typeof key !== "string") ||
    (expected !== undefined && (keys.length !== expected.length ||
      keys.some(key => !expected.includes(key as string))))
  ) throw new TypeError("Unexpected record shape");
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

function array(input: unknown, maximum: number): readonly unknown[] {
  if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype) {
    throw new TypeError("Expected plain array");
  }
  const length = Object.getOwnPropertyDescriptor(input, "length")?.value;
  if (typeof length !== "number" || !Number.isSafeInteger(length) || length < 0 || length > maximum) {
    throw new TypeError("Invalid array length");
  }
  const keys = Reflect.ownKeys(input);
  const expected = new Set(["length", ...Array.from({ length }, (_, index) => String(index))]);
  if (keys.length !== expected.size || keys.some(key => typeof key !== "string" || !expected.has(key))) {
    throw new TypeError("Unexpected array fields");
  }
  const captured: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
    if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, "value")) {
      throw new TypeError("Expected dense own data slots");
    }
    captured.push(descriptor.value);
  }
  return captured;
}

function money(input: unknown): Record<string, unknown> {
  return record(input, ["currency", "minorUnits"]);
}

function candidate(input: unknown): FoodPayableAssessmentVersion {
  const root = record(input, ["id", "version", "order", "adjustments", "amountDue", "assessment"]);
  const order = record(root.order, ["id", "version", "merchandiseSubtotal"]);
  const metadata = record(root.assessment, ["attribution", "sourceReference", "assessedOn"]);
  const adjustments = array(root.adjustments, 32).map(item => {
    const adjustment = record(item, ["direction", "reference", "money", "sourceReference"]);
    return { ...adjustment, money: money(adjustment.money) };
  });
  // Only detached fixed-depth captures reach the business validator. Cyclic
  // objects in scalar positions fail its primitive checks, without recursion.
  const value = validateFoodPayableAssessmentVersion({
    id: root.id, version: root.version,
    order: { id: order.id, version: order.version, merchandiseSubtotal: money(order.merchandiseSubtotal) },
    adjustments, amountDue: money(root.amountDue), assessment: metadata,
  });
  if (value.order.version !== 1 && value.order.version !== 2) {
    throw new TypeError("Unsupported durable order version");
  }
  return value;
}

function json(value: FoodPayableAssessmentVersion): string {
  const copyMoney = (amount: FoodMoney) => ({ currency: amount.currency, minorUnits: amount.minorUnits });
  return JSON.stringify({
    id: value.id, version: value.version,
    order: { id: value.order.id, version: value.order.version, merchandiseSubtotal: copyMoney(value.order.merchandiseSubtotal) },
    adjustments: value.adjustments.map(adjustment => ({
      direction: adjustment.direction, reference: adjustment.reference,
      money: copyMoney(adjustment.money), sourceReference: adjustment.sourceReference,
    })),
    amountDue: copyMoney(value.amountDue),
    assessment: {
      attribution: value.assessment.attribution, sourceReference: value.assessment.sourceReference,
      assessedOn: value.assessment.assessedOn,
    },
  });
}

function rows(input: unknown): readonly unknown[] {
  const envelope = record(input);
  if (envelope.success !== true) throw new TypeError("Uncertain D1 response");
  return array(envelope.results, 1);
}

function stored(input: unknown, id: FoodPayableAssessmentId, version: number): FoodPayableAssessmentVersion {
  const row = record(input, COLUMNS);
  if (row.assessment_id !== id || row.assessment_version !== version ||
    row.snapshot_format_version !== 1 || typeof row.snapshot_json !== "string") {
    throw new TypeError("Wrong durable coordinates or format");
  }
  const value = candidate(JSON.parse(row.snapshot_json));
  if (value.id !== row.assessment_id || value.version !== row.assessment_version ||
    value.order.id !== row.order_id || value.order.version !== row.order_version ||
    json(value) !== row.snapshot_json) {
    throw new TypeError("Noncanonical durable snapshot");
  }
  return value;
}

async function readExact(
  database: FoodPayableAssessmentPersistenceD1Database,
  id: FoodPayableAssessmentId,
  version: number,
): Promise<FoodPayableAssessmentVersion | null> {
  const response = await database.prepare(EXACT_SQL).bind(id, version).all<unknown>();
  const result = rows(response);
  return result.length === 0 ? null : stored(result[0], id, version);
}

function classify(
  existing: FoodPayableAssessmentVersion,
  text: string,
  order: FoodPhysicalOrderVersion,
): FoodPayableAssessmentPersistenceResult {
  // Divergence rejects without granting authority to a different order record.
  if (json(existing) !== text) return Object.freeze({ outcome: "conflict" });
  const value = validateFoodPayableAssessmentAgainstOrder(existing, order);
  return Object.freeze({ outcome: "already-present", value });
}

export async function appendFoodPayableAssessment(
  database: FoodPayableAssessmentPersistenceD1Database,
  input: unknown,
): Promise<FoodPayableAssessmentPersistenceResult> {
  let requested: FoodPayableAssessmentVersion;
  let text: string;
  try {
    requested = candidate(input);
    text = json(requested);
  }
  catch {
    return Object.freeze({ outcome: "invalid" });
  }
  try {
    const found = await readFoodPhysicalOrderVersionByExactIdentity(database, requested.order.id, requested.order.version);
    if (found.outcome === "storage-failure") return Object.freeze({ outcome: "storage-failure" });
    if (found.outcome !== "found") return Object.freeze({ outcome: "invalid" });
    const order = found.value;
    try {
      requested = validateFoodPayableAssessmentAgainstOrder(requested, order);
    }
    catch {
      return Object.freeze({ outcome: "invalid" });
    }
    const existing = await readExact(database, requested.id, requested.version);
    if (existing !== null) return classify(existing, text, order);
    if (requested.version > 1) {
      const previous = await readExact(database, requested.id, requested.version - 1);
      if (previous === null || previous.order.id !== order.id || previous.order.version !== order.version) {
        return Object.freeze({ outcome: "conflict" });
      }
      // Same-order subtotal contradictions are corrupt stored history.
      validateFoodPayableAssessmentAgainstOrder(previous, order);
      const revised = reviseFoodPayableAssessmentVersion(
        previous, { id: requested.id, version: requested.version }, order,
        requested.adjustments, requested.assessment,
      );
      if (json(revised) !== text) return Object.freeze({ outcome: "conflict" });
    }
    try {
      const response = await database.prepare(INSERT_SQL).bind(
        requested.id, requested.version, requested.order.id, requested.order.version, 1, text,
      ).all<unknown>();
      const returned = rows(response);
      if (returned.length === 1) {
        const inserted = stored(returned[0], requested.id, requested.version);
        if (json(inserted) === text) {
          const value = validateFoodPayableAssessmentAgainstOrder(inserted, order);
          return Object.freeze({ outcome: "created", value });
        }
      }
    }
    catch {
      // Completion is uncertain, including prepare/bind/all/response failures.
      // One exact reread below; never attempt a second mutation.
    }
    const recovered = await readExact(database, requested.id, requested.version);
    return recovered === null
      ? Object.freeze({ outcome: "storage-failure" })
      : classify(recovered, text, order);
  }
  catch {
    return Object.freeze({ outcome: "storage-failure" });
  }
}
