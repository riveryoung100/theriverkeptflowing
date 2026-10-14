/**
 * FOOD-006A
 *
 * Pure exact-SKU aggregation of explicitly supplied canonical
 * production-batch recorded physical balance snapshots.
 *
 * This is recorded evidence aggregation only. It does not establish
 * authoritative current quantity-on-hand, availability, capacity,
 * reservation state, fulfillment, or trusted inventory authority.
 */

import { validateFoodVersion } from "./draft-domain";
import {
  parseFoodSkuId,
  type FoodSkuId,
} from "./package-sku-domain";
import {
  parseFoodProductionBatchId,
  type FoodProductionBatchId,
} from "./production-batch-domain";
import {
  FOOD_PRODUCTION_BATCH_RECORDED_PHYSICAL_BALANCE_KIND,
} from "./physical-inventory-balance-domain";

export const FOOD_SKU_RECORDED_PHYSICAL_BALANCE_KIND =
  "food-sku-recorded-physical-balance" as const;

export interface FoodSkuRecordedPhysicalBalance {
  readonly kind: typeof FOOD_SKU_RECORDED_PHYSICAL_BALANCE_KIND;
  readonly sku: Readonly<{
    id: FoodSkuId;
    version: number;
  }>;
  readonly recordedPackageBalance: number;
  readonly batchReferences: readonly Readonly<{
    id: FoodProductionBatchId;
    version: number;
  }>[];
}

type CanonicalBatchBalance = Readonly<{
  kind: typeof FOOD_PRODUCTION_BATCH_RECORDED_PHYSICAL_BALANCE_KIND;
  batch: Readonly<{
    id: FoodProductionBatchId;
    version: number;
  }>;
  sku: Readonly<{
    id: FoodSkuId;
    version: number;
  }>;
  recordedPackageBalance: number;
  movementIds: readonly string[];
}>;

function record(
  value: unknown,
  allowed: readonly string[],
  label: string,
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new TypeError(`Expected ${label} record`);
  }

  if (
    Reflect.ownKeys(value).some(
      key =>
        typeof key !== "string" ||
        !allowed.includes(key),
    )
  ) {
    throw new TypeError(`Unsupported ${label} field`);
  }

  return value as Record<string, unknown>;
}

function signedSafeInteger(
  value: unknown,
  label: string,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value)
  ) {
    throw new TypeError(`${label} must be a safe integer`);
  }

  return value;
}

function validateCanonicalBatchBalance(
  input: unknown,
): CanonicalBatchBalance {
  const value =
    record(
      input,
      [
        "kind",
        "batch",
        "sku",
        "recordedPackageBalance",
        "movementIds",
      ],
      "batch recorded physical balance",
    );

  if (
    value.kind !==
    FOOD_PRODUCTION_BATCH_RECORDED_PHYSICAL_BALANCE_KIND
  ) {
    throw new TypeError(
      "Wrong batch recorded physical balance kind",
    );
  }

  const batch =
    record(
      value.batch,
      ["id", "version"],
      "batch reference",
    );

  const sku =
    record(
      value.sku,
      ["id", "version"],
      "SKU reference",
    );

  if (!Array.isArray(value.movementIds)) {
    throw new TypeError(
      "Batch balance movementIds must be an array",
    );
  }

  for (const movementId of value.movementIds) {
    if (
      typeof movementId !== "string" ||
      movementId.length === 0 ||
      movementId.trim() !== movementId
    ) {
      throw new TypeError(
        "Batch balance movement identity is invalid",
      );
    }
  }

  const movementIds =
    Object.freeze([...value.movementIds]);

  return Object.freeze({
    kind:
      FOOD_PRODUCTION_BATCH_RECORDED_PHYSICAL_BALANCE_KIND,
    batch: Object.freeze({
      id: parseFoodProductionBatchId(batch.id),
      version: validateFoodVersion(batch.version),
    }),
    sku: Object.freeze({
      id: parseFoodSkuId(sku.id),
      version: validateFoodVersion(sku.version),
    }),
    recordedPackageBalance:
      signedSafeInteger(
        value.recordedPackageBalance,
        "Recorded package balance",
      ),
    movementIds,
  });
}

function compareBatchReference(
  left: Readonly<{
    id: FoodProductionBatchId;
    version: number;
  }>,
  right: Readonly<{
    id: FoodProductionBatchId;
    version: number;
  }>,
): number {
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return left.version - right.version;
}

export function projectFoodSkuRecordedPhysicalBalance(
  skuInput: unknown,
  batchBalancesInput: unknown,
): FoodSkuRecordedPhysicalBalance {
  const sku =
    record(
      skuInput,
      ["id", "version"],
      "SKU reference",
    );

  const canonicalSku =
    Object.freeze({
      id: parseFoodSkuId(sku.id),
      version: validateFoodVersion(sku.version),
    });

  if (!Array.isArray(batchBalancesInput)) {
    throw new TypeError(
      "Expected batch recorded physical balance array",
    );
  }

  let total = 0n;

  const batchReferences: Array<
    Readonly<{
      id: FoodProductionBatchId;
      version: number;
    }>
  > = [];

  const exactBatchIdentities =
    new Set<string>();

  for (const candidate of batchBalancesInput) {
    const balance =
      validateCanonicalBatchBalance(candidate);

    if (
      balance.sku.id !== canonicalSku.id ||
      balance.sku.version !== canonicalSku.version
    ) {
      throw new TypeError(
        "Batch balance must bind exact SKU",
      );
    }

    const exactBatchIdentity =
      `${balance.batch.id}@${balance.batch.version}`;

    if (
      exactBatchIdentities.has(exactBatchIdentity)
    ) {
      throw new TypeError(
        "Duplicate exact batch identity",
      );
    }

    exactBatchIdentities.add(exactBatchIdentity);

    total +=
      BigInt(balance.recordedPackageBalance);

    batchReferences.push(
      Object.freeze({
        id: balance.batch.id,
        version: balance.batch.version,
      }),
    );
  }

  const minimum =
    -BigInt(Number.MAX_SAFE_INTEGER);

  const maximum =
    BigInt(Number.MAX_SAFE_INTEGER);

  if (
    total < minimum ||
    total > maximum
  ) {
    throw new TypeError(
      "SKU recorded balance exceeds signed safe integer range",
    );
  }

  batchReferences.sort(compareBatchReference);

  return Object.freeze({
    kind:
      FOOD_SKU_RECORDED_PHYSICAL_BALANCE_KIND,
    sku: Object.freeze({
      id: canonicalSku.id,
      version: canonicalSku.version,
    }),
    recordedPackageBalance: Number(total),
    batchReferences:
      Object.freeze([...batchReferences]),
  });
}
