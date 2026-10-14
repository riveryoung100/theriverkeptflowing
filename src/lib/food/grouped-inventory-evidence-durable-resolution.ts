/**
 * FOOD-006L
 *
 * Durable exact resolution of FOOD-006K lossless grouped evidence.
 *
 * Reuses the existing FOOD-006E exact persistence primitives.
 * Performs no balance composition and grants no current-QOH authority.
 */

import type {
  FoodLosslessGroupedInventoryEvidence,
} from "./lossless-inventory-evidence-grouping";

import {
  readFoodProductionBatchByExactIdentity,
  readFoodPhysicalInventoryMovementByExactIdentity,
  type FoodInventoryEvidenceResolutionD1Database,
} from "./d1-inventory-evidence-resolution-persistence";

import type {
  FoodProductionBatchVersion,
} from "./production-batch-domain";

import type {
  FoodPhysicalInventoryMovement,
} from "./physical-inventory-movement-domain";

export type FoodGroupedInventoryEvidenceResolutionFailure =
  Readonly<{
    outcome:
      | "invalid"
      | "not-found"
      | "storage-failure";
  }>;

export interface FoodResolvedGroupedInventoryEvidenceMovement {
  readonly evidenceSequence: number;
  readonly movement:
    FoodPhysicalInventoryMovement;
}

export interface FoodResolvedGroupedInventoryEvidenceBatch {
  readonly productionBatchEvidenceSequence: number;
  readonly batch:
    FoodProductionBatchVersion;
  readonly movements:
    readonly FoodResolvedGroupedInventoryEvidenceMovement[];
}

export interface FoodResolvedGroupedInventoryEvidence {
  readonly outcome:
    "success";
  readonly sku: Readonly<{
    id: string;
    version: number;
  }>;
  readonly cutoff: number;
  readonly batches:
    readonly FoodResolvedGroupedInventoryEvidenceBatch[];
}

export type FoodGroupedInventoryEvidenceResolutionResult =
  | FoodResolvedGroupedInventoryEvidence
  | FoodGroupedInventoryEvidenceResolutionFailure;

const failure = (
  outcome:
    | "invalid"
    | "not-found"
    | "storage-failure",
): FoodGroupedInventoryEvidenceResolutionFailure =>
  Object.freeze({
    outcome,
  });

const sameReference = (
  left: unknown,
  right: Readonly<{
    id: string;
    version: number;
  }>,
): boolean => {
  if (
    !left ||
    typeof left !==
      "object" ||
    Array.isArray(
      left,
    )
  ) {
    return false;
  }

  const value =
    left as Record<
      string,
      unknown
    >;

  return (
    value.id ===
      right.id &&
    value.version ===
      right.version
  );
};

export async function resolveFoodGroupedInventoryEvidenceDurably(
  database: FoodInventoryEvidenceResolutionD1Database,
  grouped: FoodLosslessGroupedInventoryEvidence,
): Promise<FoodGroupedInventoryEvidenceResolutionResult> {
  const resolvedBatches:
    FoodResolvedGroupedInventoryEvidenceBatch[] =
      [];

  for (
    const groupedBatch of
      grouped.batches
  ) {
    const batchResult =
      await readFoodProductionBatchByExactIdentity(
        database,
        {
          id:
            groupedBatch.batch.id,
          version:
            groupedBatch.batch.version,
        },
      );

    if (
      batchResult.outcome !==
      "found"
    ) {
      return failure(
        batchResult.outcome,
      );
    }

    const durableBatch =
      batchResult.value;

    if (
      durableBatch.id !==
        groupedBatch.batch.id ||
      durableBatch.version !==
        groupedBatch.batch.version ||
      !sameReference(
        durableBatch.sku,
        grouped.sku,
      )
    ) {
      return failure(
        "storage-failure",
      );
    }

    const resolvedMovements:
      FoodResolvedGroupedInventoryEvidenceMovement[] =
        [];

    for (
      const groupedMovement of
        groupedBatch.movements
    ) {
      const movementResult =
        await readFoodPhysicalInventoryMovementByExactIdentity(
          database,
          {
            id:
              groupedMovement.movementId,
          },
        );

      if (
        movementResult.outcome !==
        "found"
      ) {
        return failure(
          movementResult.outcome,
        );
      }

      const durableMovement =
        movementResult.value;

      if (
        durableMovement.id !==
          groupedMovement.movementId ||
        !sameReference(
          durableMovement.batch,
          groupedBatch.batch,
        ) ||
        !sameReference(
          durableMovement.sku,
          grouped.sku,
        )
      ) {
        return failure(
          "storage-failure",
        );
      }

      resolvedMovements.push(
        Object.freeze({
          evidenceSequence:
            groupedMovement.evidenceSequence,
          movement:
            durableMovement,
        }),
      );
    }

    resolvedBatches.push(
      Object.freeze({
        productionBatchEvidenceSequence:
          groupedBatch.productionBatchEvidenceSequence,
        batch:
          durableBatch,
        movements:
          Object.freeze([
            ...resolvedMovements,
          ]),
      }),
    );
  }

  return Object.freeze({
    outcome:
      "success" as const,
    sku:
      Object.freeze({
        id:
          grouped.sku.id,
        version:
          grouped.sku.version,
      }),
    cutoff:
      grouped.cutoff,
    batches:
      Object.freeze([
        ...resolvedBatches,
      ]),
  });
}
