/**
 * FOOD-006K
 *
 * Pure lossless grouping of one complete-through-cutoff FOOD-006J
 * ledger enumeration.
 *
 * This shape exists specifically so one exact production batch can later
 * be resolved and composed exactly once with all of its physical movements,
 * regardless of FOOD-006C manifest cardinality.
 *
 * No persistence. No balance composition. No current-QOH authority.
 */

import type {
  FoodInventoryEvidenceCutoffExhaustion,
} from "./inventory-evidence-cutoff-exhaustion-service";

import type {
  FoodInventoryEvidenceLedgerEntry,
} from "./d1-inventory-evidence-cutoff-bounded-read-persistence";

export interface FoodGroupedInventoryEvidenceMovement {
  readonly evidenceSequence: number;
  readonly movementId: string;
}

export interface FoodGroupedInventoryEvidenceBatch {
  readonly productionBatchEvidenceSequence: number;
  readonly batch: Readonly<{
    id: string;
    version: number;
  }>;
  readonly movements:
    readonly FoodGroupedInventoryEvidenceMovement[];
}

export interface FoodLosslessGroupedInventoryEvidence {
  readonly sku: Readonly<{
    id: string;
    version: number;
  }>;
  readonly cutoff: number;
  readonly batches:
    readonly FoodGroupedInventoryEvidenceBatch[];
}

interface MutableBatchGroup {
  productionBatchEvidenceSequence: number;
  batch: {
    id: string;
    version: number;
  };
  movements:
    FoodGroupedInventoryEvidenceMovement[];
}

function batchKey(
  id: string,
  version: number,
): string {
  return JSON.stringify([
    id,
    version,
  ]);
}

function compareText(
  left: string,
  right: string,
): number {
  return (
    left <
      right
      ? -1
      : left >
          right
        ? 1
        : 0
  );
}

function compareBatch(
  left: MutableBatchGroup,
  right: MutableBatchGroup,
): number {
  const byId =
    compareText(
      left.batch.id,
      right.batch.id,
    );

  if (
    byId !==
      0
  ) {
    return byId;
  }

  return (
    left.batch.version -
    right.batch.version
  );
}

function assertSafePositiveInteger(
  value: number,
  label: string,
): void {
  if (
    !Number.isSafeInteger(
      value,
    ) ||
    value <
      1
  ) {
    throw new TypeError(
      `Invalid ${label}`,
    );
  }
}

function validateSharedEntry(
  entry: FoodInventoryEvidenceLedgerEntry,
  input: FoodInventoryEvidenceCutoffExhaustion,
  previousSequence: number,
): number {
  assertSafePositiveInteger(
    entry.evidenceSequence,
    "evidence sequence",
  );

  if (
    entry.evidenceSequence <=
      previousSequence ||
    entry.evidenceSequence >
      input.cutoff
  ) {
    throw new TypeError(
      "Inventory evidence sequence is not strictly increasing through cutoff",
    );
  }

  if (
    entry.sku.id !==
      input.sku.id ||
    entry.sku.version !==
      input.sku.version
  ) {
    throw new TypeError(
      "Inventory evidence SKU mismatch",
    );
  }

  return entry.evidenceSequence;
}

export function groupFoodInventoryEvidenceCompleteThroughCutoff(
  input: FoodInventoryEvidenceCutoffExhaustion,
): FoodLosslessGroupedInventoryEvidence {
  if (
    !Number.isSafeInteger(
      input.cutoff,
    ) ||
    input.cutoff <
      0
  ) {
    throw new TypeError(
      "Invalid inventory evidence cutoff",
    );
  }

  if (
    typeof input.sku.id !==
      "string" ||
    input.sku.id.length ===
      0 ||
    !Number.isSafeInteger(
      input.sku.version,
    ) ||
    input.sku.version <
      1
  ) {
    throw new TypeError(
      "Invalid exact inventory SKU",
    );
  }

  if (
    !Array.isArray(
      input.entries,
    )
  ) {
    throw new TypeError(
      "Inventory evidence entries must be an array",
    );
  }

  const groups =
    new Map<
      string,
      MutableBatchGroup
    >();

  const movementIds =
    new Set<string>();

  const deferredMovements:
    Array<
      Readonly<{
        entry: Extract<
          FoodInventoryEvidenceLedgerEntry,
          {
            evidenceKind:
              "physical-inventory-movement";
          }
        >;
      }>
    > =
      [];

  let previousSequence =
    0;

  for (
    const entry of
      input.entries
  ) {
    previousSequence =
      validateSharedEntry(
        entry,
        input,
        previousSequence,
      );

    if (
      entry.evidenceKind ===
        "production-batch"
    ) {
      const key =
        batchKey(
          entry.batch.id,
          entry.batch.version,
        );

      if (
        groups.has(
          key,
        )
      ) {
        throw new TypeError(
          "Duplicate exact production batch ledger identity",
        );
      }

      groups.set(
        key,
        {
          productionBatchEvidenceSequence:
            entry.evidenceSequence,
          batch: {
            id:
              entry.batch.id,
            version:
              entry.batch.version,
          },
          movements:
            [],
        },
      );

      continue;
    }

    if (
      movementIds.has(
        entry.movementId,
      )
    ) {
      throw new TypeError(
        "Duplicate physical inventory movement ledger identity",
      );
    }

    movementIds.add(
      entry.movementId,
    );

    deferredMovements.push(
      Object.freeze({
        entry,
      }),
    );
  }

  for (
    const {
      entry,
    } of
      deferredMovements
  ) {
    const key =
      batchKey(
        entry.batch.id,
        entry.batch.version,
      );

    const group =
      groups.get(
        key,
      );

    if (
      group ===
        undefined
    ) {
      throw new TypeError(
        "Physical inventory movement lacks production batch ledger evidence",
      );
    }

    group.movements.push(
      Object.freeze({
        evidenceSequence:
          entry.evidenceSequence,
        movementId:
          entry.movementId,
      }),
    );
  }

  const orderedGroups =
    [...groups.values()]
      .sort(
        compareBatch,
      )
      .map(
        (
          group,
        ): FoodGroupedInventoryEvidenceBatch =>
          Object.freeze({
            productionBatchEvidenceSequence:
              group.productionBatchEvidenceSequence,
            batch:
              Object.freeze({
                id:
                  group.batch.id,
                version:
                  group.batch.version,
              }),
            movements:
              Object.freeze(
                [...group.movements]
                  .sort(
                    (
                      left,
                      right,
                    ) =>
                      left.evidenceSequence -
                      right.evidenceSequence,
                  )
                  .map(
                    (
                      movement,
                    ) =>
                      Object.freeze({
                        evidenceSequence:
                          movement.evidenceSequence,
                        movementId:
                          movement.movementId,
                      }),
                  ),
              ),
          }),
      );

  return Object.freeze({
    sku:
      Object.freeze({
        id:
          input.sku.id,
        version:
          input.sku.version,
      }),
    cutoff:
      input.cutoff,
    batches:
      Object.freeze(
        orderedGroups,
      ),
  });
}
