/**
 * FOOD-006N
 *
 * Establishes an authoritative exact-SKU evidence read point.
 *
 * The exact-SKU evidence-head query is intentionally the first query on a
 * first-primary D1 session. The returned token proves only the database
 * generation observed at that read point.
 *
 * It does not establish:
 * - a fixed database snapshot,
 * - continued currentness after return,
 * - current QOH by itself,
 * - physical-world reconciliation,
 * - availability,
 * - capacity,
 * - checkout readiness,
 * - payment readiness,
 * - fulfillment,
 * - accounting,
 * - rewards authority.
 */

import {
  parseFoodSkuId,
  type FoodSkuId,
} from "./package-sku-domain";
import { validateFoodVersion } from "./draft-domain";

export const FOOD_AUTHORITATIVE_INVENTORY_READ_POINT_KIND =
  "food-authoritative-inventory-read-point" as const;

export interface FoodAuthoritativeInventoryReadPointD1Result<
  T = Record<string, unknown>,
> {
  readonly success?: boolean;
  readonly results?: readonly T[];
}

export interface FoodAuthoritativeInventoryReadPointD1Statement {
  bind(
    ...values: readonly unknown[]
  ): FoodAuthoritativeInventoryReadPointD1Statement;

  all<T = Record<string, unknown>>():
    Promise<FoodAuthoritativeInventoryReadPointD1Result<T>>;
}

export interface FoodAuthoritativeInventoryReadPointD1Session {
  prepare(
    sql: string,
  ): FoodAuthoritativeInventoryReadPointD1Statement;

  getBookmark(): string | null;
}

export interface FoodAuthoritativeInventoryReadPointD1Database {
  withSession(
    constraintOrBookmark?: string,
  ): FoodAuthoritativeInventoryReadPointD1Session;
}

export interface FoodAuthoritativeInventoryReadPointRequest {
  readonly sku: Readonly<{
    id: FoodSkuId;
    version: number;
  }>;

  readonly composedCutoff: number;
}

export interface FoodAuthoritativeInventoryGenerationToken {
  readonly sku: Readonly<{
    id: FoodSkuId;
    version: number;
  }>;

  readonly composedCutoff: number;
  readonly exactSkuEvidenceHead: number;
  readonly bookmark: string;
}

export interface FoodAuthoritativeInventoryReadPoint {
  readonly kind:
    typeof FOOD_AUTHORITATIVE_INVENTORY_READ_POINT_KIND;

  readonly sku: Readonly<{
    id: FoodSkuId;
    version: number;
  }>;

  readonly composedCutoff: number;
  readonly exactSkuEvidenceHead: number;

  readonly consistencyToken:
    FoodAuthoritativeInventoryGenerationToken;
}

export type FoodAuthoritativeInventoryReadPointValidationResult =
  | Readonly<{
      outcome: "success";
      value: FoodAuthoritativeInventoryReadPoint;
    }>
  | Readonly<{
      outcome: "stale";
      exactSkuEvidenceHead: number;
    }>
  | Readonly<{
      outcome: "invalid";
    }>
  | Readonly<{
      outcome: "storage-failure";
    }>;

interface EvidenceHeadRow {
  readonly evidence_head?: unknown;
}

function record(
  input: unknown,
  requiredKeys: readonly string[],
): Record<string, unknown> {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new TypeError("Expected object");
  }

  const value =
    input as Record<string, unknown>;

  const keys =
    Reflect.ownKeys(value);

  if (
    keys.length !== requiredKeys.length ||
    keys.some(
      (key) =>
        typeof key !== "string" ||
        !requiredKeys.includes(key),
    )
  ) {
    throw new TypeError("Invalid object shape");
  }

  return value;
}

function nonNegativeSafeInteger(
  input: unknown,
): number {
  if (
    typeof input !== "number" ||
    !Number.isSafeInteger(input) ||
    input < 0
  ) {
    throw new TypeError(
      "Expected nonnegative safe integer",
    );
  }

  return input;
}

function validateRequest(
  input: unknown,
): FoodAuthoritativeInventoryReadPointRequest {
  const outer =
    record(
      input,
      [
        "sku",
        "composedCutoff",
      ],
    );

  const skuInput =
    record(
      outer.sku,
      [
        "id",
        "version",
      ],
    );

  return Object.freeze({
    sku:
      Object.freeze({
        id:
          parseFoodSkuId(
            skuInput.id,
          ),

        version:
          validateFoodVersion(
            skuInput.version,
          ),
      }),

    composedCutoff:
      nonNegativeSafeInteger(
        outer.composedCutoff,
      ),
  });
}

function invalid():
  FoodAuthoritativeInventoryReadPointValidationResult {
  return Object.freeze({
    outcome:
      "invalid" as const,
  });
}

function storageFailure():
  FoodAuthoritativeInventoryReadPointValidationResult {
  return Object.freeze({
    outcome:
      "storage-failure" as const,
  });
}

function stale(
  exactSkuEvidenceHead: number,
): FoodAuthoritativeInventoryReadPointValidationResult {
  return Object.freeze({
    outcome:
      "stale" as const,

    exactSkuEvidenceHead,
  });
}

function parseEvidenceHead(
  result:
    FoodAuthoritativeInventoryReadPointD1Result<
      EvidenceHeadRow
    >,
): number {
  if (
    result.success === false ||
    !Array.isArray(
      result.results,
    ) ||
    result.results.length !== 1
  ) {
    throw new TypeError(
      "Malformed evidence-head result",
    );
  }

  const row =
    result.results[0];

  if (
    row === null ||
    typeof row !== "object" ||
    Array.isArray(row) ||
    !Object.prototype.hasOwnProperty.call(
      row,
      "evidence_head",
    )
  ) {
    throw new TypeError(
      "Malformed evidence-head row",
    );
  }

  const raw =
    row.evidence_head;

  if (
    raw === null ||
    raw === undefined
  ) {
    return 0;
  }

  if (
    typeof raw !== "number" ||
    !Number.isSafeInteger(raw) ||
    raw <= 0
  ) {
    throw new TypeError(
      "Invalid exact-SKU evidence head",
    );
  }

  return raw;
}

function success(
  request:
    FoodAuthoritativeInventoryReadPointRequest,

  exactSkuEvidenceHead: number,
  bookmark: string,
): FoodAuthoritativeInventoryReadPointValidationResult {
  const sku =
    Object.freeze({
      id:
        request.sku.id,

      version:
        request.sku.version,
    });

  const tokenSku =
    Object.freeze({
      id:
        request.sku.id,

      version:
        request.sku.version,
    });

  const consistencyToken:
    FoodAuthoritativeInventoryGenerationToken =
    Object.freeze({
      sku:
        tokenSku,

      composedCutoff:
        request.composedCutoff,

      exactSkuEvidenceHead,

      bookmark,
    });

  const value:
    FoodAuthoritativeInventoryReadPoint =
    Object.freeze({
      kind:
        FOOD_AUTHORITATIVE_INVENTORY_READ_POINT_KIND,

      sku,

      composedCutoff:
        request.composedCutoff,

      exactSkuEvidenceHead,

      consistencyToken,
    });

  return Object.freeze({
    outcome:
      "success" as const,

    value,
  });
}

export async function validateFoodInventoryAtAuthoritativeReadPoint(
  database:
    FoodAuthoritativeInventoryReadPointD1Database,

  input: unknown,
): Promise<
  FoodAuthoritativeInventoryReadPointValidationResult
> {
  let request:
    FoodAuthoritativeInventoryReadPointRequest;

  try {
    request =
      validateRequest(
        input,
      );
  }
  catch {
    return invalid();
  }

  try {
    /*
     * Critical invariant:
     *
     * This exact-SKU head read must be the first executed query on this
     * first-primary session. We intentionally perform no earlier query
     * through this session.
     */
    const session =
      database.withSession(
        "first-primary",
      );

    const statement =
      session.prepare(
        [
          "SELECT MAX(evidence_sequence) AS evidence_head",
          "FROM food_inventory_evidence_sequence",
          "WHERE sku_id COLLATE BINARY = ?",
          "AND sku_version = ?",
        ].join(" "),
      );

    const result =
      await statement
        .bind(
          request.sku.id,
          request.sku.version,
        )
        .all<EvidenceHeadRow>();

    const exactSkuEvidenceHead =
      parseEvidenceHead(
        result,
      );

    if (
      exactSkuEvidenceHead >
      request.composedCutoff
    ) {
      return stale(
        exactSkuEvidenceHead,
      );
    }

    /*
     * The bookmark is read only after the authoritative head query.
     * It is an opaque consistency token, not a fixed-snapshot claim.
     */
    const bookmark =
      session.getBookmark();

    if (
      typeof bookmark !== "string" ||
      bookmark.length === 0
    ) {
      return storageFailure();
    }

    return success(
      request,
      exactSkuEvidenceHead,
      bookmark,
    );
  }
  catch {
    return storageFailure();
  }
}
