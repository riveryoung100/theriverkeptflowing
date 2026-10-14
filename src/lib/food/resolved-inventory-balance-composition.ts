/**
 * FOOD-006F
 *
 * Pure composition over already-resolved FOOD-006E evidence.
 *
 * This module performs no persistence access. It projects each exact
 * resolved batch through FOOD-005Z and then aggregates the resulting
 * exact batch balances through FOOD-006A.
 *
 * The result is recorded supplied-manifest evidence only. It does not
 * establish evidence completeness, a database cutoff, current QOH,
 * availability, capacity, reservation, checkout, payment, fulfillment,
 * sale, accounting or rewards authority.
 */

import {
  FOOD_RESOLVED_INVENTORY_EVIDENCE_KIND,
  type FoodResolvedInventoryEvidence,
} from "./inventory-evidence-manifest-resolution";
import {
  validateFoodInventoryEvidenceManifest,
  type FoodInventoryEvidenceManifest,
} from "./inventory-evidence-provenance-domain";
import {
  projectFoodProductionBatchRecordedPhysicalBalance,
  type FoodProductionBatchRecordedPhysicalBalance,
} from "./physical-inventory-balance-domain";
import {
  projectFoodSkuRecordedPhysicalBalance,
  type FoodSkuRecordedPhysicalBalance,
} from "./sku-physical-inventory-balance-domain";

export const FOOD_RESOLVED_INVENTORY_RECORDED_BALANCE_COMPOSITION_KIND =
  "food-resolved-inventory-recorded-balance-composition" as const;

export interface FoodResolvedInventoryRecordedBalanceComposition {
  readonly kind:
    typeof FOOD_RESOLVED_INVENTORY_RECORDED_BALANCE_COMPOSITION_KIND;

  readonly manifest:
    FoodInventoryEvidenceManifest;

  readonly batchBalances:
    readonly FoodProductionBatchRecordedPhysicalBalance[];

  readonly skuBalance:
    FoodSkuRecordedPhysicalBalance;
}

function record(
  input: unknown,
  keys: readonly string[],
): Record<string, unknown> {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new TypeError(
      "Invalid resolved inventory evidence",
    );
  }

  const own =
    Reflect.ownKeys(input);

  if (
    own.length !== keys.length ||
    own.some(
      key =>
        typeof key !== "string" ||
        !keys.includes(key),
    )
  ) {
    throw new TypeError(
      "Invalid resolved inventory evidence shape",
    );
  }

  return input as Record<string, unknown>;
}

function exactReference(
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

function sameStrings(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every(
      (value, index) =>
        value === right[index],
    )
  );
}

export function projectFoodResolvedInventoryEvidenceRecordedBalance(
  input: unknown,
): FoodResolvedInventoryRecordedBalanceComposition {
  const outer =
    record(
      input,
      [
        "kind",
        "manifest",
        "batches",
      ],
    );

  if (
    outer.kind !==
    FOOD_RESOLVED_INVENTORY_EVIDENCE_KIND
  ) {
    throw new TypeError(
      "Invalid resolved inventory evidence kind",
    );
  }

  const manifest =
    validateFoodInventoryEvidenceManifest(
      outer.manifest,
    );

  if (!Array.isArray(outer.batches)) {
    throw new TypeError(
      "Resolved evidence batches must be an array",
    );
  }

  if (
    outer.batches.length !==
    manifest.batches.length
  ) {
    throw new TypeError(
      "Resolved evidence batch count differs from manifest",
    );
  }

  const batchBalances:
    FoodProductionBatchRecordedPhysicalBalance[] = [];

  for (
    let index = 0;
    index < manifest.batches.length;
    index += 1
  ) {
    const manifestEntry =
      manifest.batches[index]!;

    const resolvedEntry =
      record(
        outer.batches[index],
        [
          "batch",
          "movements",
        ],
      );

    if (!Array.isArray(resolvedEntry.movements)) {
      throw new TypeError(
        "Resolved movements must be an array",
      );
    }

    const balance =
      projectFoodProductionBatchRecordedPhysicalBalance(
        resolvedEntry.batch,
        resolvedEntry.movements,
      );

    if (
      !exactReference(
        balance.batch,
        manifestEntry.batch,
      )
    ) {
      throw new TypeError(
        "Resolved batch differs from manifest",
      );
    }

    if (
      !exactReference(
        balance.sku,
        manifest.sku,
      )
    ) {
      throw new TypeError(
        "Resolved batch SKU differs from manifest",
      );
    }

    if (
      !sameStrings(
        balance.movementIds,
        manifestEntry.movementIds,
      )
    ) {
      throw new TypeError(
        "Resolved movement identities differ from manifest",
      );
    }

    batchBalances.push(
      balance,
    );
  }

  const skuBalance =
    projectFoodSkuRecordedPhysicalBalance(
      manifest.sku,
      batchBalances,
    );

  return Object.freeze({
    kind:
      FOOD_RESOLVED_INVENTORY_RECORDED_BALANCE_COMPOSITION_KIND,

    manifest,

    batchBalances:
      Object.freeze(
        [...batchBalances],
      ),

    skuBalance,
  });
}

/**
 * Compile-time declaration only: the normal producer of this function's
 * input is FOOD-006E's FoodResolvedInventoryEvidence.
 */
export type FoodResolvedInventoryBalanceCompositionInput =
  FoodResolvedInventoryEvidence;
