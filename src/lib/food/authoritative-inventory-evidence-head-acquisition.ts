/**
 * FOOD-006N1: authoritative exact-SKU evidence head acquisition.
 * The bookmark is an opaque consistency anchor associated with the completed
 * primary head read. It grants no fixed snapshot or continued currentness.
 * Acquisition mechanics intentionally mirror FOOD-006N during Phase A;
 * shared extraction requires a separate review of validation failure ordering.
 */
import { parseFoodSkuId, type FoodSkuId } from "./package-sku-domain";
import { validateFoodVersion } from "./draft-domain";
import type {
  FoodAuthoritativeInventoryReadPointD1Database,
  FoodAuthoritativeInventoryReadPointD1Result,
} from "./authoritative-inventory-read-point-validation";

export interface FoodAuthoritativeInventoryEvidenceHeadAcquisitionRequest {
  readonly sku: Readonly<{ id: FoodSkuId; version: number }>;
}

export interface FoodAuthoritativeInventoryEvidenceHeadAcquisition {
  readonly sku: Readonly<{ id: FoodSkuId; version: number }>;
  readonly exactSkuEvidenceHead: number;
  readonly bookmark: string;
}

export type FoodAuthoritativeInventoryEvidenceHeadAcquisitionResult =
  | Readonly<{
      outcome: "acquired";
      value: FoodAuthoritativeInventoryEvidenceHeadAcquisition;
    }>
  | Readonly<{ outcome: "invalid" }>
  | Readonly<{ outcome: "storage-failure" }>;

function record(input: unknown, requiredKeys: readonly string[]): Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Expected object");
  }
  const value = input as Record<string, unknown>;
  const keys = Reflect.ownKeys(value);
  if (keys.length !== requiredKeys.length || keys.some(
    (key) => typeof key !== "string" || !requiredKeys.includes(key),
  )) {
    throw new TypeError("Invalid object shape");
  }
  return value;
}

function validateRequest(input: unknown): FoodAuthoritativeInventoryEvidenceHeadAcquisitionRequest {
  const outer = record(input, ["sku"]);
  const sku = record(outer.sku, ["id", "version"]);
  return Object.freeze({
    sku: Object.freeze({
      id: parseFoodSkuId(sku.id),
      version: validateFoodVersion(sku.version),
    }),
  });
}

interface EvidenceHeadRow {
  readonly evidence_head?: unknown;
}

function parseEvidenceHead(result: FoodAuthoritativeInventoryReadPointD1Result<EvidenceHeadRow>): number {
  if (result.success === false || !Array.isArray(result.results) || result.results.length !== 1) {
    throw new TypeError("Malformed evidence-head result");
  }
  const row = result.results[0];
  if (row === null || typeof row !== "object" || Array.isArray(row) ||
    !Object.prototype.hasOwnProperty.call(row, "evidence_head")) {
    throw new TypeError("Malformed evidence-head row");
  }
  const raw = row.evidence_head;
  // Preserve the existing acquisition parser, including own undefined as empty.
  if (raw === null || raw === undefined) return 0;
  if (typeof raw !== "number" || !Number.isSafeInteger(raw) || raw <= 0) {
    throw new TypeError("Invalid exact-SKU evidence head");
  }
  return raw;
}

export async function acquireFoodAuthoritativeInventoryEvidenceHead(
  database: FoodAuthoritativeInventoryReadPointD1Database,
  input: unknown,
): Promise<FoodAuthoritativeInventoryEvidenceHeadAcquisitionResult> {
  let request: FoodAuthoritativeInventoryEvidenceHeadAcquisitionRequest;
  try {
    request = validateRequest(input);
  }
  catch {
    return Object.freeze({ outcome: "invalid" as const });
  }

  try {
    const session = database.withSession("first-primary");
    // This exact-SKU head read must be the first executed query on the session.
    const result = await session.prepare([
      "SELECT MAX(evidence_sequence) AS evidence_head",
      "FROM food_inventory_evidence_sequence",
      "WHERE sku_id COLLATE BINARY = ?",
      "AND sku_version = ?",
    ].join(" ")).bind(request.sku.id, request.sku.version).all<EvidenceHeadRow>();
    const exactSkuEvidenceHead = parseEvidenceHead(result);
    const bookmark = session.getBookmark();
    if (typeof bookmark !== "string" || bookmark.length === 0) {
      return Object.freeze({ outcome: "storage-failure" as const });
    }
    return Object.freeze({
      outcome: "acquired" as const,
      value: Object.freeze({
        sku: Object.freeze({ id: request.sku.id, version: request.sku.version }),
        exactSkuEvidenceHead,
        bookmark,
      }),
    });
  }
  catch {
    return Object.freeze({ outcome: "storage-failure" as const });
  }
}
