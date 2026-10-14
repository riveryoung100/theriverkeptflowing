/**
 * FOOD-006G
 *
 * Persistence-facing orchestration only:
 *
 * caller manifest
 *   -> FOOD-006E exact persisted evidence resolution
 *   -> FOOD-006F pure recorded-balance composition.
 *
 * This service does not create current-QOH authority. Its successful
 * output remains recorded supplied-manifest evidence only.
 */

import {
  resolveFoodInventoryEvidenceManifest,
} from "./inventory-evidence-manifest-resolution";
import type {
  FoodInventoryEvidenceResolutionD1Database,
} from "./d1-inventory-evidence-resolution-persistence";
import {
  projectFoodResolvedInventoryEvidenceRecordedBalance,
  type FoodResolvedInventoryRecordedBalanceComposition,
} from "./resolved-inventory-balance-composition";

export type FoodPersistedInventoryRecordedBalanceResult =
  | Readonly<{
      outcome: "composed";
      value: FoodResolvedInventoryRecordedBalanceComposition;
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

const notFound =
  (): FoodPersistedInventoryRecordedBalanceResult =>
    Object.freeze({
      outcome: "not-found" as const,
    });

const invalid =
  (): FoodPersistedInventoryRecordedBalanceResult =>
    Object.freeze({
      outcome: "invalid" as const,
    });

const storageFailure =
  (): FoodPersistedInventoryRecordedBalanceResult =>
    Object.freeze({
      outcome: "storage-failure" as const,
    });

export async function composeFoodPersistedInventoryRecordedBalance(
  database: FoodInventoryEvidenceResolutionD1Database,
  manifestInput: unknown,
): Promise<FoodPersistedInventoryRecordedBalanceResult> {
  const resolved =
    await resolveFoodInventoryEvidenceManifest(
      database,
      manifestInput,
    );

  if (resolved.outcome === "invalid") {
    return invalid();
  }

  if (resolved.outcome === "not-found") {
    return notFound();
  }

  if (
    resolved.outcome ===
    "storage-failure"
  ) {
    return storageFailure();
  }

  try {
    return Object.freeze({
      outcome:
        "composed" as const,
      value:
        projectFoodResolvedInventoryEvidenceRecordedBalance(
          resolved.value,
        ),
    });
  }
  catch {
    return storageFailure();
  }
}
