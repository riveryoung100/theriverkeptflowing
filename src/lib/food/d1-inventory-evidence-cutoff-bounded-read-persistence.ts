/**
 * FOOD-006I
 *
 * Read-only persistence primitives over the FOOD-006H shared evidence ledger.
 *
 * This module can:
 *   1. acquire a global durable high-water evidence sequence; and
 *   2. enumerate exact-SKU ledger entries through an explicit cutoff.
 *
 * It does NOT establish:
 *   - manifest completeness,
 *   - a point-in-time inventory snapshot,
 *   - current quantity-on-hand,
 *   - availability,
 *   - reservation-aware capacity,
 *   - checkout/payment readiness,
 *   - fulfillment completion,
 *   - accounting or rewards authority.
 */

import { parseFoodSkuId } from "./package-sku-domain";
import { parseFoodProductionBatchId } from "./production-batch-domain";
import { parseFoodPhysicalInventoryMovementId } from "./physical-inventory-movement-domain";

const MAX_SAFE_INTEGER =
  Number.MAX_SAFE_INTEGER;

const DEFAULT_PAGE_LIMIT =
  20;

const MAX_PAGE_LIMIT =
  100;

export interface FoodInventoryEvidenceLedgerD1Result<
  T = Record<string, unknown>,
> {
  readonly success?: boolean;
  readonly results?: readonly T[];
}

export interface FoodInventoryEvidenceLedgerD1Statement {
  bind(
    ...values: readonly unknown[]
  ): FoodInventoryEvidenceLedgerD1Statement;

  all<T = Record<string, unknown>>():
    Promise<FoodInventoryEvidenceLedgerD1Result<T>>;
}

export interface FoodInventoryEvidenceLedgerD1Database {
  prepare(
    sql: string,
  ): FoodInventoryEvidenceLedgerD1Statement;
}

export interface FoodInventoryEvidenceExactSku {
  readonly id: string;
  readonly version: number;
}

export interface FoodInventoryEvidenceLedgerBatchEntry {
  readonly evidenceSequence: number;
  readonly evidenceKind: "production-batch";
  readonly sku: Readonly<{
    id: string;
    version: number;
  }>;
  readonly batch: Readonly<{
    id: string;
    version: number;
  }>;
}

export interface FoodInventoryEvidenceLedgerMovementEntry {
  readonly evidenceSequence: number;
  readonly evidenceKind: "physical-inventory-movement";
  readonly sku: Readonly<{
    id: string;
    version: number;
  }>;
  readonly batch: Readonly<{
    id: string;
    version: number;
  }>;
  readonly movementId: string;
}

export type FoodInventoryEvidenceLedgerEntry =
  | FoodInventoryEvidenceLedgerBatchEntry
  | FoodInventoryEvidenceLedgerMovementEntry;

export interface FoodInventoryEvidenceLedgerPage {
  readonly items:
    readonly FoodInventoryEvidenceLedgerEntry[];
  readonly nextCursor?: number;
}

export type FoodInventoryEvidenceCutoffResult =
  | Readonly<{
      outcome: "acquired";
      cutoff: number;
    }>
  | Readonly<{
      outcome: "storage-failure";
    }>;

export type FoodInventoryEvidenceLedgerPageResult =
  | Readonly<{
      outcome: "page";
      value: FoodInventoryEvidenceLedgerPage;
    }>
  | Readonly<{
      outcome: "invalid";
    }>
  | Readonly<{
      outcome: "storage-failure";
    }>;

export interface FoodInventoryEvidenceLedgerPageOptions {
  readonly cutoff: number;
  readonly after?: number;
  readonly limit?: number;
}

interface LedgerRow {
  readonly evidence_sequence?: unknown;
  readonly evidence_kind?: unknown;
  readonly sku_id?: unknown;
  readonly sku_version?: unknown;
  readonly batch_id?: unknown;
  readonly batch_version?: unknown;
  readonly movement_id?: unknown;
}

function storageFailure():
  FoodInventoryEvidenceCutoffResult {
  return Object.freeze({
    outcome:
      "storage-failure" as const,
  });
}

function pageStorageFailure():
  FoodInventoryEvidenceLedgerPageResult {
  return Object.freeze({
    outcome:
      "storage-failure" as const,
  });
}

function invalid():
  FoodInventoryEvidenceLedgerPageResult {
  return Object.freeze({
    outcome:
      "invalid" as const,
  });
}

function isObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value,
    )
  );
}

function hasOnlyKeys(
  record: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
): boolean {
  const allowed =
    new Set([
      ...required,
      ...optional,
    ]);

  const ownKeys =
    Reflect.ownKeys(
      record,
    );

  for (
    const key of ownKeys
  ) {
    if (
      typeof key !==
        "string" ||
      !allowed.has(
        key,
      )
    ) {
      return false;
    }
  }

  return required.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(
        record,
        key,
      ),
  );
}

function validateSafeInteger(
  value: unknown,
  minimum: number,
): number {
  if (
    typeof value !==
      "number" ||
    !Number.isSafeInteger(
      value,
    ) ||
    value <
      minimum ||
    value >
      MAX_SAFE_INTEGER
  ) {
    throw new TypeError(
      "Invalid safe integer",
    );
  }

  return value;
}

function validateSku(
  input: unknown,
): FoodInventoryEvidenceExactSku {
  if (
    !isObject(
      input,
    ) ||
    !hasOnlyKeys(
      input,
      [
        "id",
        "version",
      ],
    )
  ) {
    throw new TypeError(
      "Invalid exact SKU",
    );
  }

  return Object.freeze({
    id:
      parseFoodSkuId(
        input.id,
      ),
    version:
      validateSafeInteger(
        input.version,
        1,
      ),
  });
}

function validateOptions(
  input: unknown,
): Readonly<{
  cutoff: number;
  after: number;
  limit: number;
}> {
  if (
    !isObject(
      input,
    ) ||
    !hasOnlyKeys(
      input,
      [
        "cutoff",
      ],
      [
        "after",
        "limit",
      ],
    )
  ) {
    throw new TypeError(
      "Invalid page options",
    );
  }

  const cutoff =
    validateSafeInteger(
      input.cutoff,
      0,
    );

  const after =
    input.after ===
      undefined
      ? 0
      : validateSafeInteger(
          input.after,
          0,
        );

  const limit =
    input.limit ===
      undefined
      ? DEFAULT_PAGE_LIMIT
      : validateSafeInteger(
          input.limit,
          1,
        );

  if (
    limit >
      MAX_PAGE_LIMIT ||
    after >
      cutoff
  ) {
    throw new TypeError(
      "Invalid page options",
    );
  }

  return Object.freeze({
    cutoff,
    after,
    limit,
  });
}

function validateRow(
  rowInput: unknown,
  requestedSku: FoodInventoryEvidenceExactSku,
  after: number,
  cutoff: number,
  previousSequence: number,
): FoodInventoryEvidenceLedgerEntry {
  if (
    !isObject(
      rowInput,
    )
  ) {
    throw new TypeError(
      "Invalid ledger row",
    );
  }

  const row =
    rowInput as LedgerRow;

  const sequence =
    validateSafeInteger(
      row.evidence_sequence,
      1,
    );

  if (
    sequence <=
      after ||
    sequence >
      cutoff ||
    sequence <=
      previousSequence
  ) {
    throw new TypeError(
      "Ledger sequence disagreement",
    );
  }

  const skuId =
    parseFoodSkuId(
      row.sku_id,
    );

  const skuVersion =
    validateSafeInteger(
      row.sku_version,
      1,
    );

  if (
    skuId !==
      requestedSku.id ||
    skuVersion !==
      requestedSku.version
  ) {
    throw new TypeError(
      "Ledger SKU disagreement",
    );
  }

  const batchId =
    parseFoodProductionBatchId(
      row.batch_id,
    );

  const batchVersion =
    validateSafeInteger(
      row.batch_version,
      1,
    );

  if (
    row.evidence_kind ===
      "production-batch"
  ) {
    if (
      row.movement_id !==
        null &&
      row.movement_id !==
        undefined
    ) {
      throw new TypeError(
        "Batch ledger row cannot carry movement identity",
      );
    }

    return Object.freeze({
      evidenceSequence:
        sequence,
      evidenceKind:
        "production-batch" as const,
      sku:
        Object.freeze({
          id:
            skuId,
          version:
            skuVersion,
        }),
      batch:
        Object.freeze({
          id:
            batchId,
          version:
            batchVersion,
        }),
    });
  }

  if (
    row.evidence_kind ===
      "physical-inventory-movement"
  ) {
    const movementId =
      parseFoodPhysicalInventoryMovementId(
        row.movement_id,
      );

    return Object.freeze({
      evidenceSequence:
        sequence,
      evidenceKind:
        "physical-inventory-movement" as const,
      sku:
        Object.freeze({
          id:
            skuId,
          version:
            skuVersion,
        }),
      batch:
        Object.freeze({
          id:
            batchId,
          version:
            batchVersion,
        }),
      movementId,
    });
  }

  throw new TypeError(
    "Invalid evidence kind",
  );
}

export async function acquireFoodInventoryEvidenceCutoff(
  database: FoodInventoryEvidenceLedgerD1Database,
): Promise<FoodInventoryEvidenceCutoffResult> {
  try {
    const statement =
      database.prepare(
        "SELECT MAX(evidence_sequence) AS evidence_cutoff FROM food_inventory_evidence_sequence",
      );

    const result =
      await statement
        .bind()
        .all<Record<string, unknown>>();

    if (
      result.success ===
        false ||
      !Array.isArray(
        result.results,
      ) ||
      result.results.length !==
        1
    ) {
      return storageFailure();
    }

    const row =
      result.results[0];

    if (
      !isObject(
        row,
      ) ||
      !Object.prototype.hasOwnProperty.call(
        row,
        "evidence_cutoff",
      )
    ) {
      return storageFailure();
    }

    const raw =
      row.evidence_cutoff;

    if (
      raw ===
        null
    ) {
      return Object.freeze({
        outcome:
          "acquired" as const,
        cutoff:
          0,
      });
    }

    const cutoff =
      validateSafeInteger(
        raw,
        1,
      );

    return Object.freeze({
      outcome:
        "acquired" as const,
      cutoff,
    });
  }
  catch {
    return storageFailure();
  }
}

export async function listFoodInventoryEvidenceLedgerByExactSkuThroughCutoff(
  database: FoodInventoryEvidenceLedgerD1Database,
  skuInput: unknown,
  optionsInput: unknown,
): Promise<FoodInventoryEvidenceLedgerPageResult> {
  let sku:
    FoodInventoryEvidenceExactSku;

  let options:
    Readonly<{
      cutoff: number;
      after: number;
      limit: number;
    }>;

  try {
    sku =
      validateSku(
        skuInput,
      );

    options =
      validateOptions(
        optionsInput,
      );
  }
  catch {
    return invalid();
  }

  if (
    options.cutoff ===
      0
  ) {
    return Object.freeze({
      outcome:
        "page" as const,
      value:
        Object.freeze({
          items:
            Object.freeze(
              [],
            ),
        }),
    });
  }

  try {
    const statement =
      database.prepare(
        [
          "SELECT",
          "evidence_sequence,",
          "evidence_kind,",
          "sku_id,",
          "sku_version,",
          "batch_id,",
          "batch_version,",
          "movement_id",
          "FROM food_inventory_evidence_sequence",
          "WHERE sku_id = ?",
          "AND sku_version = ?",
          "AND evidence_sequence > ?",
          "AND evidence_sequence <= ?",
          "ORDER BY evidence_sequence ASC",
          "LIMIT ?",
        ].join(" "),
      );

    const result =
      await statement
        .bind(
          sku.id,
          sku.version,
          options.after,
          options.cutoff,
          options.limit +
            1,
        )
        .all<LedgerRow>();

    if (
      result.success ===
        false ||
      !Array.isArray(
        result.results,
      )
    ) {
      return pageStorageFailure();
    }

    if (
      result.results.length >
        options.limit +
          1
    ) {
      return pageStorageFailure();
    }

    const decoded:
      FoodInventoryEvidenceLedgerEntry[] =
        [];

    let previousSequence =
      options.after;

    for (
      const row of
        result.results
    ) {
      const item =
        validateRow(
          row,
          sku,
          options.after,
          options.cutoff,
          previousSequence,
        );

      decoded.push(
        item,
      );

      previousSequence =
        item.evidenceSequence;
    }

    const hasMore =
      decoded.length >
        options.limit;

    const items =
      Object.freeze(
        decoded.slice(
          0,
          options.limit,
        ),
      );

    if (
      hasMore &&
      items.length ===
        0
    ) {
      return pageStorageFailure();
    }

    const nextCursor =
      hasMore
        ? items[
            items.length -
              1
          ]?.evidenceSequence
        : undefined;

    if (
      hasMore &&
      nextCursor ===
        undefined
    ) {
      return pageStorageFailure();
    }

    const value =
      Object.freeze({
        items,
        ...(
          nextCursor ===
            undefined
            ? {}
            : {
                nextCursor,
              }
        ),
      });

    return Object.freeze({
      outcome:
        "page" as const,
      value,
    });
  }
  catch {
    return pageStorageFailure();
  }
}
