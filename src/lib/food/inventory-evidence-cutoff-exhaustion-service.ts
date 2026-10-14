/**
 * FOOD-006J
 *
 * Complete-through-cutoff exact-SKU ledger enumeration.
 *
 * This service acquires one FOOD-006I cutoff and exhausts every
 * exact-SKU ledger page through that same fixed cutoff.
 *
 * It deliberately does NOT construct a FOOD-006C manifest because
 * FOOD-006C has finite batch and per-batch movement cardinality limits
 * that a complete FOOD-006I ledger enumeration can legitimately exceed.
 *
 * This result proves enumeration exhaustion through one fixed ledger
 * cutoff only. It is not current quantity-on-hand or operational authority.
 */

import {
  acquireFoodInventoryEvidenceCutoff,
  listFoodInventoryEvidenceLedgerByExactSkuThroughCutoff,
  type FoodInventoryEvidenceExactSku,
  type FoodInventoryEvidenceLedgerD1Database,
  type FoodInventoryEvidenceLedgerEntry,
} from "./d1-inventory-evidence-cutoff-bounded-read-persistence";

const PAGE_LIMIT =
  100;

export interface FoodInventoryEvidenceCutoffExhaustion {
  readonly sku: Readonly<{
    id: string;
    version: number;
  }>;
  readonly cutoff: number;
  readonly entries:
    readonly FoodInventoryEvidenceLedgerEntry[];
}

export type FoodInventoryEvidenceCutoffExhaustionResult =
  | Readonly<{
      outcome: "exhausted";
      value: FoodInventoryEvidenceCutoffExhaustion;
    }>
  | Readonly<{
      outcome: "invalid";
    }>
  | Readonly<{
      outcome: "storage-failure";
    }>;

function invalid():
  FoodInventoryEvidenceCutoffExhaustionResult {
  return Object.freeze({
    outcome:
      "invalid" as const,
  });
}

function storageFailure():
  FoodInventoryEvidenceCutoffExhaustionResult {
  return Object.freeze({
    outcome:
      "storage-failure" as const,
  });
}

function frozenEntry(
  entry: FoodInventoryEvidenceLedgerEntry,
): FoodInventoryEvidenceLedgerEntry {
  if (
    entry.evidenceKind ===
      "production-batch"
  ) {
    return Object.freeze({
      evidenceSequence:
        entry.evidenceSequence,
      evidenceKind:
        "production-batch" as const,
      sku:
        Object.freeze({
          id:
            entry.sku.id,
          version:
            entry.sku.version,
        }),
      batch:
        Object.freeze({
          id:
            entry.batch.id,
          version:
            entry.batch.version,
        }),
    });
  }

  return Object.freeze({
    evidenceSequence:
      entry.evidenceSequence,
    evidenceKind:
      "physical-inventory-movement" as const,
    sku:
      Object.freeze({
        id:
          entry.sku.id,
        version:
          entry.sku.version,
      }),
    batch:
      Object.freeze({
        id:
          entry.batch.id,
        version:
          entry.batch.version,
      }),
    movementId:
      entry.movementId,
  });
}

function frozenSuccess(
  sku: FoodInventoryEvidenceExactSku,
  cutoff: number,
  entries: readonly FoodInventoryEvidenceLedgerEntry[],
): FoodInventoryEvidenceCutoffExhaustionResult {
  return Object.freeze({
    outcome:
      "exhausted" as const,
    value:
      Object.freeze({
        sku:
          Object.freeze({
            id:
              sku.id,
            version:
              sku.version,
          }),
        cutoff,
        entries:
          Object.freeze(
            entries.map(
              frozenEntry,
            ),
          ),
      }),
  });
}

export async function exhaustFoodInventoryEvidenceByExactSkuThroughCutoff(
  database: FoodInventoryEvidenceLedgerD1Database,
  skuInput: unknown,
): Promise<FoodInventoryEvidenceCutoffExhaustionResult> {
  /*
   * Validation ownership remains with FOOD-006I. We intentionally perform
   * one zero-cutoff read first because FOOD-006I validates exact SKU input
   * before its zero-cutoff short circuit and performs no storage access.
   */
  const validation =
    await listFoodInventoryEvidenceLedgerByExactSkuThroughCutoff(
      database,
      skuInput,
      {
        cutoff:
          0,
      },
    );

  if (
    validation.outcome ===
      "invalid"
  ) {
    return invalid();
  }

  if (
    validation.outcome !==
      "page"
  ) {
    return storageFailure();
  }

  const sku =
    skuInput as FoodInventoryEvidenceExactSku;

  const cutoffResult =
    await acquireFoodInventoryEvidenceCutoff(
      database,
    );

  if (
    cutoffResult.outcome !==
      "acquired"
  ) {
    return storageFailure();
  }

  const cutoff =
    cutoffResult.cutoff;

  if (
    cutoff ===
      0
  ) {
    return frozenSuccess(
      sku,
      cutoff,
      [],
    );
  }

  const entries:
    FoodInventoryEvidenceLedgerEntry[] =
      [];

  let after =
    0;

  let previousSequence =
    0;

  while (true) {
    const pageResult =
      await listFoodInventoryEvidenceLedgerByExactSkuThroughCutoff(
        database,
        sku,
        {
          cutoff,
          after,
          limit:
            PAGE_LIMIT,
        },
      );

    if (
      pageResult.outcome ===
        "invalid"
    ) {
      return invalid();
    }

    if (
      pageResult.outcome !==
        "page"
    ) {
      return storageFailure();
    }

    const page =
      pageResult.value;

    for (
      const entry of
        page.items
    ) {
      if (
        entry.evidenceSequence <=
          previousSequence ||
        entry.evidenceSequence <=
          after ||
        entry.evidenceSequence >
          cutoff
      ) {
        return storageFailure();
      }

      entries.push(
        frozenEntry(
          entry,
        ),
      );

      previousSequence =
        entry.evidenceSequence;
    }

    if (
      page.nextCursor ===
        undefined
    ) {
      return frozenSuccess(
        sku,
        cutoff,
        entries,
      );
    }

    if (
      page.items.length ===
        0 ||
      !Number.isSafeInteger(
        page.nextCursor,
      ) ||
      page.nextCursor <=
        after ||
      page.nextCursor !==
        previousSequence ||
      page.nextCursor >
        cutoff
    ) {
      return storageFailure();
    }

    after =
      page.nextCursor;
  }
}
