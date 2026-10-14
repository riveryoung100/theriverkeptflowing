/** FOOD-006M: pure recorded balance over successful durable grouped evidence.
 * Retained cutoff provenance does not prove truthful capture of physical events,
 * evidence after cutoff, authoritative current QOH, availability, capacity,
 * checkout, payment, fulfillment, accounting or rewards authority.
 */
import { parseFoodSkuId, type FoodSkuId } from "./package-sku-domain";
import { validateFoodVersion } from "./draft-domain";
import { validateFoodProductionBatchVersion, type FoodProductionBatchId } from "./production-batch-domain";
import { parseFoodPhysicalInventoryMovementId, type FoodPhysicalInventoryMovementId } from "./physical-inventory-movement-domain";
import { projectFoodProductionBatchRecordedPhysicalBalance, type FoodProductionBatchRecordedPhysicalBalance } from "./physical-inventory-balance-domain";
import { projectFoodSkuRecordedPhysicalBalance, type FoodSkuRecordedPhysicalBalance } from "./sku-physical-inventory-balance-domain";

export const FOOD_LOSSLESS_GROUPED_INVENTORY_RECORDED_BALANCE_KIND =
  "food-lossless-grouped-inventory-recorded-balance" as const;

export interface FoodLosslessRecordedBalanceMovementProvenance {
  readonly evidenceSequence: number;
  readonly movementId: FoodPhysicalInventoryMovementId;
}

export interface FoodLosslessRecordedBalanceBatchComposition {
  readonly productionBatchEvidenceSequence: number;
  readonly batch: Readonly<{ id: FoodProductionBatchId; version: number }>;
  readonly movements: readonly FoodLosslessRecordedBalanceMovementProvenance[];
  readonly recordedBalance: FoodProductionBatchRecordedPhysicalBalance;
}

export interface FoodLosslessGroupedInventoryRecordedBalanceComposition {
  readonly kind: typeof FOOD_LOSSLESS_GROUPED_INVENTORY_RECORDED_BALANCE_KIND;
  readonly sku: Readonly<{ id: FoodSkuId; version: number }>;
  readonly cutoff: number;
  readonly batches: readonly FoodLosslessRecordedBalanceBatchComposition[];
  readonly skuBalance: FoodSkuRecordedPhysicalBalance;
}

function record(input: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Expected resolved grouped evidence record");
  }
  const own = Reflect.ownKeys(input);
  if (own.length !== keys.length || own.some(key => typeof key !== "string" || !keys.includes(key))) {
    throw new TypeError("Invalid resolved grouped evidence shape");
  }
  return input as Record<string, unknown>;
}

function safeInteger(input: unknown, minimum: number): number {
  if (typeof input !== "number" || !Number.isSafeInteger(input) || input < minimum) {
    throw new TypeError("Invalid evidence safe integer");
  }
  return input;
}

export function projectFoodLosslessGroupedInventoryRecordedBalance(
  input: unknown,
): FoodLosslessGroupedInventoryRecordedBalanceComposition {
  const outer = record(input, ["outcome", "sku", "cutoff", "batches"]);
  if (outer.outcome !== "success") throw new TypeError("Expected successful durable grouped evidence");
  const skuInput = record(outer.sku, ["id", "version"]);
  const sku = Object.freeze({ id: parseFoodSkuId(skuInput.id), version: validateFoodVersion(skuInput.version) });
  const cutoff = safeInteger(outer.cutoff, 0);
  if (!Array.isArray(outer.batches)) throw new TypeError("Expected resolved batch array");
  if (cutoff === 0 && outer.batches.length !== 0) throw new TypeError("Zero cutoff requires empty batches");

  const sequences = new Set<number>();
  const batchKeys = new Set<string>();
  const movementIds = new Set<FoodPhysicalInventoryMovementId>();
  const sequence = (value: unknown): number => {
    const result = safeInteger(value, 1);
    if (result > cutoff || sequences.has(result)) throw new TypeError("Invalid or duplicate evidence sequence through cutoff");
    sequences.add(result);
    return result;
  };

  const batches: FoodLosslessRecordedBalanceBatchComposition[] = [];
  for (const candidate of outer.batches) {
    const group = record(candidate, ["productionBatchEvidenceSequence", "batch", "movements"]);
    const productionBatchEvidenceSequence = sequence(group.productionBatchEvidenceSequence);
    const batch = validateFoodProductionBatchVersion(group.batch);
    const key = JSON.stringify([batch.id, batch.version]);
    if (batchKeys.has(key)) throw new TypeError("Duplicate exact batch identity");
    batchKeys.add(key);
    if (!Array.isArray(group.movements)) throw new TypeError("Expected resolved movement array");
    const entries = group.movements.map(value => {
      const entry = record(value, ["evidenceSequence", "movement"]);
      return { evidenceSequence: sequence(entry.evidenceSequence), movement: entry.movement };
    });
    const recordedBalance = projectFoodProductionBatchRecordedPhysicalBalance(
      batch, entries.map(entry => entry.movement),
    );
    if (recordedBalance.batch.id !== batch.id || recordedBalance.batch.version !== batch.version ||
        recordedBalance.sku.id !== sku.id || recordedBalance.sku.version !== sku.version) {
      throw new TypeError("Recorded balance must bind exact batch and SKU");
    }
    const movements = entries.map(entry => {
      // Full durable movement validation has already succeeded through 005Z.
      const movementId = parseFoodPhysicalInventoryMovementId(
        (entry.movement as { readonly id: unknown }).id,
      );
      if (movementIds.has(movementId)) throw new TypeError("Duplicate global movement identity");
      movementIds.add(movementId);
      return Object.freeze({ evidenceSequence: entry.evidenceSequence, movementId });
    }).sort((left, right) => left.evidenceSequence - right.evidenceSequence);
    batches.push(Object.freeze({
      productionBatchEvidenceSequence,
      batch: Object.freeze({ id: recordedBalance.batch.id, version: recordedBalance.batch.version }),
      movements: Object.freeze(movements),
      recordedBalance,
    }));
  }
  batches.sort((left, right) => left.batch.id < right.batch.id ? -1 : left.batch.id > right.batch.id ? 1 : left.batch.version - right.batch.version);
  const skuBalance = projectFoodSkuRecordedPhysicalBalance(sku, batches.map(batch => batch.recordedBalance));
  return Object.freeze({
    kind: FOOD_LOSSLESS_GROUPED_INVENTORY_RECORDED_BALANCE_KIND,
    sku, cutoff, batches: Object.freeze(batches), skuBalance,
  });
}
