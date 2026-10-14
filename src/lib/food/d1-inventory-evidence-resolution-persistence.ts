import {
  FOOD_PRODUCTION_BATCH_KIND,
  parseFoodProductionBatchId,
  validateFoodProductionBatchVersion,
  type FoodProductionBatchId,
  type FoodProductionBatchVersion,
} from "./production-batch-domain";
import {
  validateFoodVersion,
} from "./draft-domain";
import {
  parseFoodPhysicalInventoryMovementId,
  validateFoodPhysicalInventoryMovement,
  type FoodPhysicalInventoryMovement,
  type FoodPhysicalInventoryMovementId,
} from "./physical-inventory-movement-domain";

type Primitive =
  | string
  | number
  | null;

export interface FoodInventoryEvidenceResolutionD1Statement {
  bind(
    ...values: Primitive[]
  ): FoodInventoryEvidenceResolutionD1Statement;
  all(): Promise<unknown>;
}

export interface FoodInventoryEvidenceResolutionD1Database {
  prepare(
    sql: string,
  ): FoodInventoryEvidenceResolutionD1Statement;
}

export type FoodExactInventoryEvidenceReadResult<T> =
  | Readonly<{
      outcome: "found";
      value: T;
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
  <T>():
    FoodExactInventoryEvidenceReadResult<T> =>
    Object.freeze({
      outcome: "invalid" as const,
    });

const notFound =
  <T>():
    FoodExactInventoryEvidenceReadResult<T> =>
    Object.freeze({
      outcome: "not-found" as const,
    });

const storageFailure =
  <T>():
    FoodExactInventoryEvidenceReadResult<T> =>
    Object.freeze({
      outcome: "storage-failure" as const,
    });

const found =
  <T extends object>(
    value: T,
  ):
    FoodExactInventoryEvidenceReadResult<T> =>
    Object.freeze({
      outcome: "found" as const,
      value,
    });

function record(
  value: unknown,
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new TypeError(
      "Invalid durable row",
    );
  }

  return value as Record<string, unknown>;
}

function exactRows(
  result: unknown,
): readonly unknown[] {
  const outer =
    record(result);

  if (
    outer.success !== true ||
    !Array.isArray(outer.results)
  ) {
    throw new TypeError(
      "Invalid D1 read result",
    );
  }

  if (outer.results.length > 1) {
    throw new TypeError(
      "Ambiguous exact durable read",
    );
  }

  return outer.results;
}

function reconstructBatch(
  input: unknown,
): FoodProductionBatchVersion {
  const row =
    record(input);

  return validateFoodProductionBatchVersion({
    kind:
      FOOD_PRODUCTION_BATCH_KIND,
    id:
      row.batch_id,
    version:
      row.version,
    sku: {
      id:
        row.sku_id,
      version:
        row.sku_version,
    },
    batchCode:
      row.batch_code,
    storageMode:
      row.storage_mode,
    producedPackageCount:
      row.produced_package_count,
    preparedOn:
      row.prepared_on,
    ...(row.frozen_on === null
      ? {}
      : {
          frozenOn:
            row.frozen_on,
        }),
    attribution:
      row.attribution,
    sourceReference:
      row.source_reference,
  });
}

function reconstructMovement(
  input: unknown,
): FoodPhysicalInventoryMovement {
  const row =
    record(input);

  return validateFoodPhysicalInventoryMovement({
    kind:
      "food-physical-inventory-movement",
    id:
      row.movement_id,
    batch: {
      id:
        row.batch_id,
      version:
        row.batch_version,
    },
    sku: {
      id:
        row.sku_id,
      version:
        row.sku_version,
    },
    movementType:
      row.movement_type,
    packageCount:
      row.package_count,
    occurredOn:
      row.occurred_on,
    attribution:
      row.attribution,
    sourceReference:
      row.source_reference,
  });
}

export async function readFoodProductionBatchByExactIdentity(
  database: FoodInventoryEvidenceResolutionD1Database,
  identityInput: unknown,
): Promise<
  FoodExactInventoryEvidenceReadResult<
    FoodProductionBatchVersion
  >
> {
  let id: FoodProductionBatchId;
  let version: number;

  try {
    if (
      !identityInput ||
      typeof identityInput !== "object" ||
      Array.isArray(identityInput)
    ) {
      return invalid();
    }

    const keys =
      Reflect.ownKeys(identityInput);

    if (
      keys.length !== 2 ||
      !keys.includes("id") ||
      !keys.includes("version")
    ) {
      return invalid();
    }

    const identity =
      identityInput as Record<
        string,
        unknown
      >;

    id =
      parseFoodProductionBatchId(
        identity.id,
      );

    version =
      validateFoodVersion(
        identity.version,
      );
  }
  catch {
    return invalid();
  }

  try {
    const rows =
      exactRows(
        await database
          .prepare(
            "SELECT batch_id, version, sku_id, sku_version, batch_code, storage_mode, produced_package_count, prepared_on, frozen_on, attribution, source_reference " +
            "FROM food_production_batches " +
            "WHERE batch_id = ? AND version = ? LIMIT 2",
          )
          .bind(
            id,
            version,
          )
          .all(),
      );

    if (rows.length === 0) {
      return notFound();
    }

    const batch =
      reconstructBatch(
        rows[0],
      );

    if (
      batch.id !== id ||
      batch.version !== version
    ) {
      return storageFailure();
    }

    return found(batch);
  }
  catch {
    return storageFailure();
  }
}

export async function readFoodPhysicalInventoryMovementByExactIdentity(
  database: FoodInventoryEvidenceResolutionD1Database,
  identityInput: unknown,
): Promise<
  FoodExactInventoryEvidenceReadResult<
    FoodPhysicalInventoryMovement
  >
> {
  let id:
    FoodPhysicalInventoryMovementId;

  try {
    if (
      !identityInput ||
      typeof identityInput !== "object" ||
      Array.isArray(identityInput)
    ) {
      return invalid();
    }

    const keys =
      Reflect.ownKeys(identityInput);

    if (
      keys.length !== 1 ||
      !keys.includes("id")
    ) {
      return invalid();
    }

    const identity =
      identityInput as Record<
        string,
        unknown
      >;

    id =
      parseFoodPhysicalInventoryMovementId(
        identity.id,
      );
  }
  catch {
    return invalid();
  }

  try {
    const rows =
      exactRows(
        await database
          .prepare(
            "SELECT movement_id, batch_id, batch_version, sku_id, sku_version, movement_type, package_count, occurred_on, attribution, source_reference " +
            "FROM food_physical_inventory_movements " +
            "WHERE movement_id = ? LIMIT 2",
          )
          .bind(id)
          .all(),
      );

    if (rows.length === 0) {
      return notFound();
    }

    const movement =
      reconstructMovement(
        rows[0],
      );

    if (movement.id !== id) {
      return storageFailure();
    }

    return found(movement);
  }
  catch {
    return storageFailure();
  }
}
