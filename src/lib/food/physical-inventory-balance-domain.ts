/** FOOD-005Z: recorded balance over an explicit supplied evidence set.
 * Completeness, physical truth, and a temporal cutoff are not established here.
 */
import { validateFoodProductionBatchVersion, type FoodProductionBatchId } from "./production-batch-domain";
import { validateFoodPhysicalInventoryMovement, type FoodPhysicalInventoryMovementId } from "./physical-inventory-movement-domain";
import type { FoodSkuId } from "./package-sku-domain";

export const FOOD_PRODUCTION_BATCH_RECORDED_PHYSICAL_BALANCE_KIND =
  "food-production-batch-recorded-physical-balance" as const;

export interface FoodProductionBatchRecordedPhysicalBalance {
  readonly kind: typeof FOOD_PRODUCTION_BATCH_RECORDED_PHYSICAL_BALANCE_KIND;
  readonly batch: Readonly<{ id: FoodProductionBatchId; version: number }>;
  readonly sku: Readonly<{ id: FoodSkuId; version: number }>;
  readonly recordedPackageBalance: number;
  readonly movementIds: readonly FoodPhysicalInventoryMovementId[];
}

export function projectFoodProductionBatchRecordedPhysicalBalance(
  batchInput: unknown,
  movementsInput: unknown,
): FoodProductionBatchRecordedPhysicalBalance {
  const batch = validateFoodProductionBatchVersion(batchInput);
  if (!Array.isArray(movementsInput)) throw new TypeError("Expected movement array");

  const ids = new Set<FoodPhysicalInventoryMovementId>();
  let balance = BigInt(batch.producedPackageCount);
  for (const input of movementsInput) {
    const movement = validateFoodPhysicalInventoryMovement(input);
    if (movement.batch.id !== batch.id || movement.batch.version !== batch.version) {
      throw new TypeError("Movement must bind exact batch");
    }
    if (movement.sku.id !== batch.sku.id || movement.sku.version !== batch.sku.version) {
      throw new TypeError("Movement must bind exact batch SKU");
    }
    if (ids.has(movement.id)) throw new TypeError("Duplicate movement identity");
    ids.add(movement.id);
    const count = BigInt(movement.packageCount);
    balance += movement.movementType === "adjustment-in" ? count : -count;
  }

  const maximum = BigInt(Number.MAX_SAFE_INTEGER);
  if (balance < -maximum || balance > maximum) {
    throw new TypeError("Recorded balance exceeds signed safe integer range");
  }
  return Object.freeze({
    kind: FOOD_PRODUCTION_BATCH_RECORDED_PHYSICAL_BALANCE_KIND,
    batch: Object.freeze({ id: batch.id, version: batch.version }),
    sku: Object.freeze({ id: batch.sku.id, version: batch.sku.version }),
    recordedPackageBalance: Number(balance),
    movementIds: Object.freeze([...ids].sort((left, right) => left < right ? -1 : left > right ? 1 : 0)),
  });
}
