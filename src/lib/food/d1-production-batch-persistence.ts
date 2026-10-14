import { validateFoodProductionBatchVersion, type FoodProductionBatchVersion } from "./production-batch-domain";

type FoodD1Primitive = string | number | null;
export interface FoodProductionBatchD1Result {
  readonly success: boolean;
  readonly results?: readonly unknown[];
}
export interface FoodProductionBatchD1Statement {
  bind(...values: FoodD1Primitive[]): FoodProductionBatchD1Statement;
  all(): Promise<FoodProductionBatchD1Result>;
}
export interface FoodProductionBatchD1Database {
  prepare(sql: string): FoodProductionBatchD1Statement;
}
export type FoodProductionBatchPersistenceResult =
  | { readonly outcome: "created" | "already-present"; readonly value: FoodProductionBatchVersion }
  | { readonly outcome: "conflict" | "invalid" | "storage-failure" };

const COLUMNS = `batch_id, version, sku_id, sku_version, batch_code,
storage_mode, produced_package_count, prepared_on, frozen_on, attribution, source_reference`;
const EXACT_SQL = `SELECT ${COLUMNS} FROM food_production_batches
WHERE batch_id = ? AND version = ? LIMIT 1`;
const INSERT_SQL = `INSERT INTO food_production_batches (${COLUMNS})
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING ${COLUMNS}`;

function storedRow(input: unknown): FoodProductionBatchVersion {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new TypeError("Malformed stored batch");
  }
  const row = input as Record<string, unknown>;
  // Every selected column must exist, including the nullable date column.
  const columns = COLUMNS.split(",").map(column => column.trim());
  const keys = Reflect.ownKeys(row);
  if (keys.length !== columns.length || keys.some(key => typeof key !== "string" || !columns.includes(key))) {
    throw new TypeError("Malformed stored batch columns");
  }
  if (row.frozen_on !== null && typeof row.frozen_on !== "string") {
    throw new TypeError("Malformed stored frozen date");
  }
  return validateFoodProductionBatchVersion({
    kind: "food-production-batch",
    id: row.batch_id,
    version: row.version,
    sku: { id: row.sku_id, version: row.sku_version },
    batchCode: row.batch_code,
    storageMode: row.storage_mode,
    producedPackageCount: row.produced_package_count,
    preparedOn: row.prepared_on,
    ...(row.frozen_on === null ? {} : { frozenOn: row.frozen_on }),
    attribution: row.attribution,
    sourceReference: row.source_reference,
  });
}

function same(left: FoodProductionBatchVersion, right: FoodProductionBatchVersion): boolean {
  // W validation creates a deterministic complete canonical field order.
  return JSON.stringify(left) === JSON.stringify(right);
}

async function execute(statement: FoodProductionBatchD1Statement): Promise<readonly unknown[] | null> {
  const result = await statement.all();
  return result?.success === true && Array.isArray(result.results) ? result.results : null;
}

async function readExact(database: FoodProductionBatchD1Database, value: FoodProductionBatchVersion) {
  const rows = await execute(database.prepare(EXACT_SQL).bind(value.id, value.version));
  if (rows === null || rows.length > 1) throw new TypeError("Uncertain stored batch");
  if (rows.length === 0) return null;
  const stored = storedRow(rows[0]);
  if (stored.id !== value.id || stored.version !== value.version) throw new TypeError("Wrong stored identity");
  return stored;
}

export async function appendFoodProductionBatchVersion(
  database: FoodProductionBatchD1Database,
  input: unknown,
): Promise<FoodProductionBatchPersistenceResult> {
  let value: FoodProductionBatchVersion;
  try {
    value = validateFoodProductionBatchVersion(input);
    if (value.version !== 1) return { outcome: "invalid" };
  } catch {
    return { outcome: "invalid" };
  }
  try {
    const exact = await readExact(database, value);
    if (exact !== null) {
      return same(exact, value) ? { outcome: "already-present", value: exact } : { outcome: "conflict" };
    }
    let rows: readonly unknown[] | null = null;
    try {
      rows = await execute(database.prepare(INSERT_SQL).bind(
        value.id, value.version, value.sku.id, value.sku.version, value.batchCode,
        value.storageMode, value.producedPackageCount, value.preparedOn,
        value.frozenOn ?? null, value.attribution, value.sourceReference,
      ));
    } catch {
      // Resolve a competing exact insert through durable state below.
    }
    if (rows !== null && rows.length === 1) {
      const created = storedRow(rows[0]);
      return same(created, value) ? { outcome: "created", value: created } : { outcome: "storage-failure" };
    }
    if (rows !== null && rows.length > 1) return { outcome: "storage-failure" };
    const raced = await readExact(database, value);
    if (raced === null) return { outcome: "storage-failure" };
    return same(raced, value) ? { outcome: "already-present", value: raced } : { outcome: "conflict" };
  } catch {
    return { outcome: "storage-failure" };
  }
}
