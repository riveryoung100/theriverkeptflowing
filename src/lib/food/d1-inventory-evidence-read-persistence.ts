/**
 * FOOD-006B
 *
 * Independent read-only enumeration of persisted physical-inventory
 * evidence. These APIs expose durable evidence; they do not establish
 * a complete point-in-time inventory snapshot or authoritative QOH.
 */

import { validateFoodVersion } from "./draft-domain";
import {
  parseFoodSkuId,
  type FoodSkuId,
} from "./package-sku-domain";
import {
  FOOD_PRODUCTION_BATCH_KIND,
  parseFoodProductionBatchId,
  validateFoodProductionBatchVersion,
  type FoodProductionBatchId,
  type FoodProductionBatchVersion,
} from "./production-batch-domain";
import {
  FOOD_PHYSICAL_INVENTORY_MOVEMENT_KIND,
  parseFoodPhysicalInventoryMovementId,
  validateFoodPhysicalInventoryMovement,
  type FoodPhysicalInventoryMovement,
  type FoodPhysicalInventoryMovementId,
} from "./physical-inventory-movement-domain";

type Primitive = string | number | null;

export interface FoodInventoryEvidenceReadD1Statement {
  bind(...values: Primitive[]): FoodInventoryEvidenceReadD1Statement;
  all(): Promise<unknown>;
}

export interface FoodInventoryEvidenceReadD1Database {
  prepare(sql: string): FoodInventoryEvidenceReadD1Statement;
}

export type FoodInventoryEvidenceReadFailure =
  | Readonly<{ outcome: "invalid" }>
  | Readonly<{ outcome: "storage-failure" }>;

export interface FoodProductionBatchEvidenceCursor {
  readonly id: FoodProductionBatchId;
  readonly version: number;
}

export interface FoodProductionBatchEvidenceReadOptions {
  readonly limit?: number;
  readonly after?: FoodProductionBatchEvidenceCursor;
}

export interface FoodPhysicalInventoryMovementEvidenceReadOptions {
  readonly limit?: number;
  readonly afterMovementId?: FoodPhysicalInventoryMovementId;
}

export type FoodInventoryEvidenceReadPage<T, C> =
  Readonly<{
    outcome: "success";
    items: readonly T[];
    nextCursor?: C;
  }>;

export type FoodProductionBatchEvidenceReadResult =
  | FoodInventoryEvidenceReadPage<
      FoodProductionBatchVersion,
      Readonly<FoodProductionBatchEvidenceCursor>
    >
  | FoodInventoryEvidenceReadFailure;

export type FoodPhysicalInventoryMovementEvidenceReadResult =
  | FoodInventoryEvidenceReadPage<
      FoodPhysicalInventoryMovement,
      FoodPhysicalInventoryMovementId
    >
  | FoodInventoryEvidenceReadFailure;

const invalid = (): FoodInventoryEvidenceReadFailure =>
  Object.freeze({
    outcome: "invalid" as const,
  });

const storageFailure = (): FoodInventoryEvidenceReadFailure =>
  Object.freeze({
    outcome: "storage-failure" as const,
  });

function record(
  value: unknown,
  allowed?: readonly string[],
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new TypeError("Expected record");
  }

  if (
    allowed &&
    Reflect.ownKeys(value).some(
      key =>
        typeof key !== "string" ||
        !allowed.includes(key),
    )
  ) {
    throw new TypeError("Unsupported record field");
  }

  return value as Record<string, unknown>;
}

function d1Rows(value: unknown): readonly unknown[] {
  const result =
    record(value);

  if (
    result.success !== true ||
    !Array.isArray(result.results)
  ) {
    throw new TypeError("Invalid D1 read result");
  }

  return result.results;
}

function pageLimit(value: unknown): number {
  if (value === undefined) {
    return 20;
  }

  const limit =
    validateFoodVersion(value);

  if (limit > 100) {
    throw new TypeError("Read limit cannot exceed 100");
  }

  return limit;
}

function exactSku(
  value: unknown,
): Readonly<{
  id: FoodSkuId;
  version: number;
}> {
  const input =
    record(
      value,
      ["id", "version"],
    );

  return Object.freeze({
    id: parseFoodSkuId(input.id),
    version: validateFoodVersion(input.version),
  });
}

function exactBatch(
  value: unknown,
): Readonly<{
  id: FoodProductionBatchId;
  version: number;
}> {
  const input =
    record(
      value,
      ["id", "version"],
    );

  return Object.freeze({
    id: parseFoodProductionBatchId(input.id),
    version: validateFoodVersion(input.version),
  });
}

function batchOptions(
  value: unknown,
): Readonly<{
  limit: number;
  after?: Readonly<FoodProductionBatchEvidenceCursor>;
}> {
  if (value === undefined) {
    return Object.freeze({
      limit: 20,
    });
  }

  const input =
    record(
      value,
      ["limit", "after"],
    );

  const limit =
    pageLimit(input.limit);

  if (input.after === undefined) {
    return Object.freeze({
      limit,
    });
  }

  const after =
    exactBatch(input.after);

  return Object.freeze({
    limit,
    after,
  });
}

function movementOptions(
  value: unknown,
): Readonly<{
  limit: number;
  afterMovementId?: FoodPhysicalInventoryMovementId;
}> {
  if (value === undefined) {
    return Object.freeze({
      limit: 20,
    });
  }

  const input =
    record(
      value,
      ["limit", "afterMovementId"],
    );

  const limit =
    pageLimit(input.limit);

  if (input.afterMovementId === undefined) {
    return Object.freeze({
      limit,
    });
  }

  return Object.freeze({
    limit,
    afterMovementId:
      parseFoodPhysicalInventoryMovementId(
        input.afterMovementId,
      ),
  });
}

function reconstructBatch(
  input: unknown,
): FoodProductionBatchVersion {
  const row =
    record(
      input,
      [
        "batch_id",
        "version",
        "sku_id",
        "sku_version",
        "batch_code",
        "storage_mode",
        "produced_package_count",
        "prepared_on",
        "frozen_on",
        "attribution",
        "source_reference",
      ],
    );

  const value: Record<string, unknown> = {
    kind: FOOD_PRODUCTION_BATCH_KIND,
    id: row.batch_id,
    version: row.version,
    sku: {
      id: row.sku_id,
      version: row.sku_version,
    },
    batchCode: row.batch_code,
    storageMode: row.storage_mode,
    producedPackageCount:
      row.produced_package_count,
    preparedOn: row.prepared_on,
    attribution: row.attribution,
    sourceReference:
      row.source_reference,
  };

  if (row.frozen_on !== null) {
    value.frozenOn =
      row.frozen_on;
  }

  return validateFoodProductionBatchVersion(
    value,
  );
}

function reconstructMovement(
  input: unknown,
): FoodPhysicalInventoryMovement {
  const row =
    record(
      input,
      [
        "movement_id",
        "batch_id",
        "batch_version",
        "sku_id",
        "sku_version",
        "movement_type",
        "package_count",
        "occurred_on",
        "attribution",
        "source_reference",
      ],
    );

  return validateFoodPhysicalInventoryMovement({
    kind:
      FOOD_PHYSICAL_INVENTORY_MOVEMENT_KIND,
    id: row.movement_id,
    batch: {
      id: row.batch_id,
      version: row.batch_version,
    },
    sku: {
      id: row.sku_id,
      version: row.sku_version,
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

function batchRowIdentity(
  input: unknown,
): Readonly<{
  id: FoodProductionBatchId;
  version: number;
  skuId: FoodSkuId;
  skuVersion: number;
}> {
  const row =
    record(input);

  return Object.freeze({
    id: parseFoodProductionBatchId(
      row.batch_id,
    ),
    version: validateFoodVersion(
      row.version,
    ),
    skuId: parseFoodSkuId(
      row.sku_id,
    ),
    skuVersion: validateFoodVersion(
      row.sku_version,
    ),
  });
}

function movementRowIdentity(
  input: unknown,
): Readonly<{
  id: FoodPhysicalInventoryMovementId;
  batchId: FoodProductionBatchId;
  batchVersion: number;
}> {
  const row =
    record(input);

  return Object.freeze({
    id:
      parseFoodPhysicalInventoryMovementId(
        row.movement_id,
      ),
    batchId:
      parseFoodProductionBatchId(
        row.batch_id,
      ),
    batchVersion:
      validateFoodVersion(
        row.batch_version,
      ),
  });
}

function compareBatchCursor(
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

function success<T, C>(
  items: readonly T[],
  nextCursor?: C,
): FoodInventoryEvidenceReadPage<T, C> {
  const page =
    nextCursor === undefined
      ? {
          outcome: "success" as const,
          items: Object.freeze([...items]),
        }
      : {
          outcome: "success" as const,
          items: Object.freeze([...items]),
          nextCursor,
        };

  return Object.freeze(page);
}

export async function listFoodProductionBatchesByExactSku(
  database: FoodInventoryEvidenceReadD1Database,
  skuInput: unknown,
  optionsInput?: unknown,
): Promise<FoodProductionBatchEvidenceReadResult> {
  let sku: Readonly<{
    id: FoodSkuId;
    version: number;
  }>;

  let options: ReturnType<typeof batchOptions>;

  try {
    const db =
      record(database as unknown);

    if (typeof db.prepare !== "function") {
      throw new TypeError("Database unavailable");
    }

    sku =
      exactSku(skuInput);

    options =
      batchOptions(optionsInput);
  } catch {
    return invalid();
  }

  const after =
    options.after;

  const afterId =
    after?.id ?? "";

  const afterVersion =
    after?.version ?? 0;

  const sql =
    "SELECT batch_id, version, sku_id, sku_version, batch_code, storage_mode, produced_package_count, prepared_on, frozen_on, attribution, source_reference " +
    "FROM food_production_batches " +
    "WHERE sku_id = ? AND sku_version = ? " +
    "AND (batch_id COLLATE BINARY > ? OR (batch_id = ? AND version > ?)) " +
    "ORDER BY batch_id COLLATE BINARY ASC, version ASC LIMIT ?";

  try {
    const rows =
      d1Rows(
        await database
          .prepare(sql)
          .bind(
            sku.id,
            sku.version,
            afterId,
            afterId,
            afterVersion,
            options.limit + 1,
          )
          .all(),
      );

    if (rows.length > options.limit + 1) {
      throw new TypeError("Too many durable rows");
    }

    const items: FoodProductionBatchVersion[] = [];

    let previous:
      | Readonly<{
          id: FoodProductionBatchId;
          version: number;
        }>
      | undefined =
      after;

    for (let index = 0; index < rows.length; index++) {
      const identity =
        batchRowIdentity(
          rows[index],
        );

      if (
        identity.skuId !== sku.id ||
        identity.skuVersion !== sku.version
      ) {
        throw new TypeError(
          "Durable batch selector mismatch",
        );
      }

      if (
        previous &&
        compareBatchCursor(
          identity,
          previous,
        ) <= 0
      ) {
        throw new TypeError(
          "Durable batch order is not strictly increasing",
        );
      }

      previous =
        Object.freeze({
          id: identity.id,
          version: identity.version,
        });

      if (index < options.limit) {
        const snapshot =
          reconstructBatch(
            rows[index],
          );

        if (
          snapshot.id !== identity.id ||
          snapshot.version !== identity.version ||
          snapshot.sku.id !== sku.id ||
          snapshot.sku.version !== sku.version
        ) {
          throw new TypeError(
            "Canonical batch reconstruction mismatch",
          );
        }

        items.push(snapshot);
      }
    }

    if (rows.length <= options.limit) {
      return success(items);
    }

    const last =
      items[items.length - 1];

    if (!last) {
      throw new TypeError(
        "Continuation requires returned item",
      );
    }

    return success(
      items,
      Object.freeze({
        id: last.id,
        version: last.version,
      }),
    );
  } catch {
    return storageFailure();
  }
}

export async function listFoodPhysicalInventoryMovementsByExactBatch(
  database: FoodInventoryEvidenceReadD1Database,
  batchInput: unknown,
  optionsInput?: unknown,
): Promise<FoodPhysicalInventoryMovementEvidenceReadResult> {
  let batch: Readonly<{
    id: FoodProductionBatchId;
    version: number;
  }>;

  let options: ReturnType<typeof movementOptions>;

  try {
    const db =
      record(database as unknown);

    if (typeof db.prepare !== "function") {
      throw new TypeError("Database unavailable");
    }

    batch =
      exactBatch(batchInput);

    options =
      movementOptions(optionsInput);
  } catch {
    return invalid();
  }

  const afterMovementId =
    options.afterMovementId ?? "";

  const sql =
    "SELECT movement_id, batch_id, batch_version, sku_id, sku_version, movement_type, package_count, occurred_on, attribution, source_reference " +
    "FROM food_physical_inventory_movements " +
    "WHERE batch_id = ? AND batch_version = ? " +
    "AND movement_id COLLATE BINARY > ? " +
    "ORDER BY movement_id COLLATE BINARY ASC LIMIT ?";

  try {
    const rows =
      d1Rows(
        await database
          .prepare(sql)
          .bind(
            batch.id,
            batch.version,
            afterMovementId,
            options.limit + 1,
          )
          .all(),
      );

    if (rows.length > options.limit + 1) {
      throw new TypeError("Too many durable rows");
    }

    const items: FoodPhysicalInventoryMovement[] = [];

    let previous =
      options.afterMovementId;

    for (let index = 0; index < rows.length; index++) {
      const identity =
        movementRowIdentity(
          rows[index],
        );

      if (
        identity.batchId !== batch.id ||
        identity.batchVersion !== batch.version
      ) {
        throw new TypeError(
          "Durable movement selector mismatch",
        );
      }

      if (
        previous !== undefined &&
        identity.id <= previous
      ) {
        throw new TypeError(
          "Durable movement order is not strictly increasing",
        );
      }

      previous =
        identity.id;

      if (index < options.limit) {
        const snapshot =
          reconstructMovement(
            rows[index],
          );

        if (
          snapshot.id !== identity.id ||
          snapshot.batch.id !== batch.id ||
          snapshot.batch.version !== batch.version
        ) {
          throw new TypeError(
            "Canonical movement reconstruction mismatch",
          );
        }

        items.push(snapshot);
      }
    }

    if (rows.length <= options.limit) {
      return success(items);
    }

    const last =
      items[items.length - 1];

    if (!last) {
      throw new TypeError(
        "Continuation requires returned movement",
      );
    }

    return success(
      items,
      last.id,
    );
  } catch {
    return storageFailure();
  }
}
