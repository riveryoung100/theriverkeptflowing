/**
 * FOOD-006E
 *
 * Resolves one validated FOOD-006C manifest into the exact durable
 * production-batch and physical-movement evidence identified by it.
 *
 * This is evidence resolution only. It grants no completeness, balance,
 * current-QOH, availability, capacity, reservation, checkout, payment,
 * fulfillment, sale or mutation authority.
 */

import {
  validateFoodInventoryEvidenceManifest,
  type FoodInventoryEvidenceManifest,
} from "./inventory-evidence-provenance-domain";
import {
  readFoodPhysicalInventoryMovementByExactIdentity,
  readFoodProductionBatchByExactIdentity,
  type FoodInventoryEvidenceResolutionD1Database,
} from "./d1-inventory-evidence-resolution-persistence";
import type {
  FoodProductionBatchVersion,
} from "./production-batch-domain";
import type {
  FoodPhysicalInventoryMovement,
} from "./physical-inventory-movement-domain";

export const FOOD_RESOLVED_INVENTORY_EVIDENCE_KIND =
  "food-resolved-inventory-evidence" as const;

export interface FoodResolvedInventoryEvidenceBatch {
  readonly batch: FoodProductionBatchVersion;
  readonly movements: readonly FoodPhysicalInventoryMovement[];
}

export interface FoodResolvedInventoryEvidence {
  readonly kind:
    typeof FOOD_RESOLVED_INVENTORY_EVIDENCE_KIND;
  readonly manifest:
    FoodInventoryEvidenceManifest;
  readonly batches:
    readonly FoodResolvedInventoryEvidenceBatch[];
}

export type FoodInventoryEvidenceManifestResolutionResult =
  | Readonly<{
      outcome: "resolved";
      value: FoodResolvedInventoryEvidence;
    }>
  | Readonly<{
      outcome: "not-found";
    }>
  | Readonly<{
      outcome: "invalid";
    }>
  | Readonly<{
      outcome: "storage-failure";
    }>;

const invalid =
  (): FoodInventoryEvidenceManifestResolutionResult =>
    Object.freeze({
      outcome: "invalid" as const,
    });

const notFound =
  (): FoodInventoryEvidenceManifestResolutionResult =>
    Object.freeze({
      outcome: "not-found" as const,
    });

const storageFailure =
  (): FoodInventoryEvidenceManifestResolutionResult =>
    Object.freeze({
      outcome: "storage-failure" as const,
    });

function exactSku(
  left: Readonly<{
    id: string;
    version: number;
  }>,
  right: Readonly<{
    id: string;
    version: number;
  }>,
): boolean {
  return (
    left.id === right.id &&
    left.version === right.version
  );
}

function exactBatch(
  left: Readonly<{
    id: string;
    version: number;
  }>,
  right: Readonly<{
    id: string;
    version: number;
  }>,
): boolean {
  return (
    left.id === right.id &&
    left.version === right.version
  );
}

export async function resolveFoodInventoryEvidenceManifest(
  database: FoodInventoryEvidenceResolutionD1Database,
  manifestInput: unknown,
): Promise<FoodInventoryEvidenceManifestResolutionResult> {
  let manifest:
    FoodInventoryEvidenceManifest;

  try {
    manifest =
      validateFoodInventoryEvidenceManifest(
        manifestInput,
      );
  }
  catch {
    return invalid();
  }

  const resolved:
    FoodResolvedInventoryEvidenceBatch[] = [];

  for (const entry of manifest.batches) {
    const batchRead =
      await readFoodProductionBatchByExactIdentity(
        database,
        entry.batch,
      );

    if (batchRead.outcome === "not-found") {
      return notFound();
    }

    if (batchRead.outcome !== "found") {
      return storageFailure();
    }

    const batch =
      batchRead.value;

    if (
      !exactBatch(
        batch,
        entry.batch,
      ) ||
      !exactSku(
        batch.sku,
        manifest.sku,
      )
    ) {
      return storageFailure();
    }

    const movements:
      FoodPhysicalInventoryMovement[] = [];

    for (const movementId of entry.movementIds) {
      const movementRead =
        await readFoodPhysicalInventoryMovementByExactIdentity(
          database,
          {
            id:
              movementId,
          },
        );

      if (
        movementRead.outcome ===
        "not-found"
      ) {
        return notFound();
      }

      if (
        movementRead.outcome !==
        "found"
      ) {
        return storageFailure();
      }

      const movement =
        movementRead.value;

      if (
        movement.id !== movementId ||
        !exactBatch(
          movement.batch,
          entry.batch,
        ) ||
        !exactSku(
          movement.sku,
          manifest.sku,
        )
      ) {
        return storageFailure();
      }

      movements.push(
        movement,
      );
    }

    resolved.push(
      Object.freeze({
        batch,
        movements:
          Object.freeze(
            [...movements],
          ),
      }),
    );
  }

  return Object.freeze({
    outcome:
      "resolved" as const,
    value:
      Object.freeze({
        kind:
          FOOD_RESOLVED_INVENTORY_EVIDENCE_KIND,
        manifest,
        batches:
          Object.freeze(
            [...resolved],
          ),
      }),
  });
}
