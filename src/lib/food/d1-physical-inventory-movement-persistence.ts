import {
  validateFoodPhysicalInventoryMovement,
  type FoodPhysicalInventoryMovement,
} from "./physical-inventory-movement-domain";
import {
  validateFoodProductionBatchVersion,
  type FoodProductionBatchVersion,
} from "./production-batch-domain";

type FoodD1Primitive = string | number | null;
export interface FoodPhysicalInventoryMovementD1Result {
  readonly success: boolean;
  readonly results?: readonly unknown[];
}
export interface FoodPhysicalInventoryMovementD1Statement {
  bind(...values: FoodD1Primitive[]): FoodPhysicalInventoryMovementD1Statement;
  all(): Promise<FoodPhysicalInventoryMovementD1Result>;
}
export interface FoodPhysicalInventoryMovementD1Database {
  prepare(sql: string): FoodPhysicalInventoryMovementD1Statement;
}
export type FoodPhysicalInventoryMovementPersistenceResult =
  | { readonly outcome: "created"; readonly value: FoodPhysicalInventoryMovement }
  | { readonly outcome: "already-present"; readonly value: FoodPhysicalInventoryMovement }
  | { readonly outcome: "conflict" }
  | { readonly outcome: "invalid" }
  | { readonly outcome: "storage-failure" };

const MOVEMENT_COLUMNS = `movement_id, batch_id, batch_version, sku_id, sku_version,
movement_type, package_count, occurred_on, attribution, source_reference`;
const BATCH_COLUMNS = `batch_id, version, sku_id, sku_version, batch_code,
storage_mode, produced_package_count, prepared_on, frozen_on, attribution, source_reference`;
const EXACT_MOVEMENT_SQL = `SELECT ${MOVEMENT_COLUMNS} FROM food_physical_inventory_movements
WHERE movement_id = ? LIMIT 1`;
const EXACT_BATCH_SQL = `SELECT ${BATCH_COLUMNS} FROM food_production_batches
WHERE batch_id = ? AND version = ? LIMIT 1`;
const INSERT_SQL = `INSERT INTO food_physical_inventory_movements (${MOVEMENT_COLUMNS})
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING ${MOVEMENT_COLUMNS}`;

function row(input: unknown, columns: string): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new TypeError("Malformed stored row");
  }
  const expected = columns.split(",").map(column => column.trim());
  const keys = Reflect.ownKeys(input);
  if (keys.length !== expected.length || keys.some(key => typeof key !== "string" || !expected.includes(key))) {
    throw new TypeError("Malformed stored columns");
  }
  return input as Record<string, unknown>;
}

function storedMovement(input: unknown): FoodPhysicalInventoryMovement {
  const stored = row(input, MOVEMENT_COLUMNS);
  return validateFoodPhysicalInventoryMovement({
    kind: "food-physical-inventory-movement",
    id: stored.movement_id,
    batch: { id: stored.batch_id, version: stored.batch_version },
    sku: { id: stored.sku_id, version: stored.sku_version },
    movementType: stored.movement_type,
    packageCount: stored.package_count,
    occurredOn: stored.occurred_on,
    attribution: stored.attribution,
    sourceReference: stored.source_reference,
  });
}

function storedBatch(input: unknown): FoodProductionBatchVersion {
  const stored = row(input, BATCH_COLUMNS);
  if (stored.frozen_on !== null && typeof stored.frozen_on !== "string") {
    throw new TypeError("Malformed stored frozen date");
  }
  return validateFoodProductionBatchVersion({
    kind: "food-production-batch",
    id: stored.batch_id,
    version: stored.version,
    sku: { id: stored.sku_id, version: stored.sku_version },
    batchCode: stored.batch_code,
    storageMode: stored.storage_mode,
    producedPackageCount: stored.produced_package_count,
    preparedOn: stored.prepared_on,
    ...(stored.frozen_on === null ? {} : { frozenOn: stored.frozen_on }),
    attribution: stored.attribution,
    sourceReference: stored.source_reference,
  });
}

async function execute(statement: FoodPhysicalInventoryMovementD1Statement): Promise<readonly unknown[]> {
  const result = await statement.all();
  if (result?.success !== true || !Array.isArray(result.results)) {
    throw new TypeError("Uncertain storage result");
  }
  return result.results;
}

async function readMovement(
  database: FoodPhysicalInventoryMovementD1Database,
  value: FoodPhysicalInventoryMovement,
): Promise<FoodPhysicalInventoryMovement | null> {
  const rows = await execute(database.prepare(EXACT_MOVEMENT_SQL).bind(value.id));
  if (rows.length > 1) throw new TypeError("Unexpected exact movement count");
  if (rows.length === 0) return null;
  const stored = storedMovement(rows[0]);
  if (stored.id !== value.id) throw new TypeError("Wrong stored movement identity");
  return stored;
}

async function readBatch(
  database: FoodPhysicalInventoryMovementD1Database,
  value: FoodPhysicalInventoryMovement,
): Promise<FoodProductionBatchVersion | null> {
  const rows = await execute(database.prepare(EXACT_BATCH_SQL).bind(value.batch.id, value.batch.version));
  if (rows.length > 1) throw new TypeError("Unexpected exact batch count");
  if (rows.length === 0) return null;
  const stored = storedBatch(rows[0]);
  if (stored.id !== value.batch.id || stored.version !== value.batch.version) {
    throw new TypeError("Wrong stored batch identity");
  }
  return stored;
}

function existingResult(
  stored: FoodPhysicalInventoryMovement,
  requested: FoodPhysicalInventoryMovement,
): FoodPhysicalInventoryMovementPersistenceResult {
  // Canonical validators detach and establish deterministic complete field order.
  return JSON.stringify(stored) === JSON.stringify(requested)
    ? { outcome: "already-present", value: stored }
    : { outcome: "conflict" };
}

export async function appendFoodPhysicalInventoryMovement(
  database: FoodPhysicalInventoryMovementD1Database,
  input: unknown,
): Promise<FoodPhysicalInventoryMovementPersistenceResult> {
  let value: FoodPhysicalInventoryMovement;
  try {
    value = validateFoodPhysicalInventoryMovement(input);
  } catch {
    return { outcome: "invalid" };
  }
  try {
    // Exact durable identity takes precedence over the new-entry batch checks.
    const existing = await readMovement(database, value);
    if (existing !== null) return existingResult(existing, value);

    const batch = await readBatch(database, value);
    if (batch === null || batch.sku.id !== value.sku.id || batch.sku.version !== value.sku.version) {
      return { outcome: "invalid" };
    }

    let rows: readonly unknown[];
    try {
      rows = await execute(database.prepare(INSERT_SQL).bind(
        value.id, value.batch.id, value.batch.version, value.sku.id, value.sku.version,
        value.movementType, value.packageCount, value.occurredOn, value.attribution, value.sourceReference,
      ));
    } catch {
      // After an insert exception, only exact durable movement evidence decides retry classification.
      const raced = await readMovement(database, value);
      return raced === null ? { outcome: "storage-failure" } : existingResult(raced, value);
    }
    if (rows.length !== 1) return { outcome: "storage-failure" };
    const created = storedMovement(rows[0]);
    if (JSON.stringify(created) !== JSON.stringify(value)) return { outcome: "storage-failure" };
    return { outcome: "created", value: created };
  } catch {
    return { outcome: "storage-failure" };
  }
}
