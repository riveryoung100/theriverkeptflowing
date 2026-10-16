/**
 * FOOD-007B D1 immutable exact-SKU stocked capacity-source persistence.
 *
 * The database history is evidence of stored capacity-source assertions.
 * It does not establish current physical QOH, physical truth, reservable
 * quantity, ATP, availability, orderability or reservation authority.
 */

import {
  deriveFoodExactSkuStockedCapacitySourceRevisionFromCandidate,
  serializeFoodExactSkuStockedCapacitySourceRevision,
  validateFoodExactSkuStockedCapacitySourceRevision,
  type FoodExactSkuStockedCapacitySourceRevision,
} from "./exact-sku-stocked-capacity-source-domain";

export interface FoodExactSkuStockedCapacityD1Result<
  T = unknown,
> {
  readonly success?: boolean;
  readonly results?: readonly T[];
}

export interface FoodExactSkuStockedCapacityD1Statement {
  bind(
    ...values: readonly (string | number)[]
  ): FoodExactSkuStockedCapacityD1Statement;

  all<T = Record<string, unknown>>():
    Promise<FoodExactSkuStockedCapacityD1Result<T>>;
}

export interface FoodExactSkuStockedCapacityD1Database {
  prepare(
    sql: string,
  ): FoodExactSkuStockedCapacityD1Statement;
}

export type FoodExactSkuStockedCapacityPersistenceResult =
  | Readonly<{
      outcome: "invalid";
    }>
  | Readonly<{
      outcome: "created";
      value: FoodExactSkuStockedCapacitySourceRevision;
    }>
  | Readonly<{
      outcome: "already-present";
      value: FoodExactSkuStockedCapacitySourceRevision;
    }>
  | Readonly<{
      outcome: "conflict";
    }>
  | Readonly<{
      outcome: "storage-failure";
    }>;

type StoredRow = Readonly<{
  sku_id: unknown;
  sku_version: unknown;
  revision: unknown;
  capacity_units: unknown;
  attribution: unknown;
  source_reference: unknown;
}>;

const SELECT_COLUMNS = `
sku_id,
sku_version,
revision,
capacity_units,
attribution,
source_reference
`.trim();

const EXACT_SQL = `
SELECT ${SELECT_COLUMNS}
FROM food_sku_capacity_sources
WHERE sku_id = ?
  AND sku_version = ?
  AND revision = ?
LIMIT 2
`.trim();

const LATEST_SQL = `
SELECT ${SELECT_COLUMNS}
FROM food_sku_capacity_sources
WHERE sku_id = ?
  AND sku_version = ?
ORDER BY revision DESC
LIMIT 2
`.trim();

const INSERT_SQL = `
INSERT INTO food_sku_capacity_sources (
  sku_id,
  sku_version,
  revision,
  capacity_units,
  attribution,
  source_reference
)
VALUES (?, ?, ?, ?, ?, ?)
RETURNING ${SELECT_COLUMNS}
`.trim();

function freezeResult<
  T extends FoodExactSkuStockedCapacityPersistenceResult,
>(
  value: T,
): T {
  return Object.freeze(value);
}

function storedRow(
  input: unknown,
): FoodExactSkuStockedCapacitySourceRevision {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new TypeError(
      "stored capacity source row must be an object",
    );
  }

  const row =
    input as Partial<StoredRow>;

  return validateFoodExactSkuStockedCapacitySourceRevision({
    kind:
      "exact-sku-stocked-capacity-source",

    sku: {
      id: row.sku_id,
      version: row.sku_version,
    },

    revision: row.revision,
    capacityUnits: row.capacity_units,
    attribution: row.attribution,
    sourceReference: row.source_reference,
  });
}

function same(
  left: FoodExactSkuStockedCapacitySourceRevision,
  right: FoodExactSkuStockedCapacitySourceRevision,
): boolean {
  return (
    serializeFoodExactSkuStockedCapacitySourceRevision(
      left,
    ) ===
    serializeFoodExactSkuStockedCapacitySourceRevision(
      right,
    )
  );
}

async function execute(
  statement: FoodExactSkuStockedCapacityD1Statement,
): Promise<readonly unknown[] | null> {
  try {
    const result =
      await statement.all<unknown>();

    if (
      result === null ||
      typeof result !== "object" ||
      result.success === false ||
      !Array.isArray(result.results)
    ) {
      return null;
    }

    return result.results;
  } catch {
    return null;
  }
}

async function readExact(
  database: FoodExactSkuStockedCapacityD1Database,
  value: FoodExactSkuStockedCapacitySourceRevision,
): Promise<
  | FoodExactSkuStockedCapacitySourceRevision
  | null
  | "storage-failure"
> {
  const rows =
    await execute(
      database
        .prepare(EXACT_SQL)
        .bind(
          value.sku.id,
          value.sku.version,
          value.revision,
        ),
    );

  if (
    rows === null ||
    rows.length > 1
  ) {
    return "storage-failure";
  }

  if (rows.length === 0) {
    return null;
  }

  try {
    return storedRow(rows[0]);
  } catch {
    return "storage-failure";
  }
}

async function readLatest(
  database: FoodExactSkuStockedCapacityD1Database,
  value: FoodExactSkuStockedCapacitySourceRevision,
): Promise<
  | FoodExactSkuStockedCapacitySourceRevision
  | null
  | "storage-failure"
> {
  const rows =
    await execute(
      database
        .prepare(LATEST_SQL)
        .bind(
          value.sku.id,
          value.sku.version,
        ),
    );

  if (
    rows === null ||
    rows.length > 1
  ) {
    return "storage-failure";
  }

  if (rows.length === 0) {
    return null;
  }

  try {
    return storedRow(rows[0]);
  } catch {
    return "storage-failure";
  }
}

async function attemptInsert(
  database: FoodExactSkuStockedCapacityD1Database,
  value: FoodExactSkuStockedCapacitySourceRevision,
): Promise<
  | FoodExactSkuStockedCapacitySourceRevision
  | "insert-failure"
  | "storage-failure"
> {
  let result: FoodExactSkuStockedCapacityD1Result<unknown>;

  try {
    result =
      await database
        .prepare(INSERT_SQL)
        .bind(
          value.sku.id,
          value.sku.version,
          value.revision,
          value.capacityUnits,
          value.attribution,
          value.sourceReference,
        )
        .all<unknown>();
  } catch {
    return "insert-failure";
  }

  if (
    result === null ||
    typeof result !== "object" ||
    result.success === false ||
    !Array.isArray(result.results) ||
    result.results.length !== 1
  ) {
    return "storage-failure";
  }

  try {
    return storedRow(
      result.results[0],
    );
  } catch {
    return "storage-failure";
  }
}

export async function appendFoodExactSkuStockedCapacitySourceRevision(
  database: FoodExactSkuStockedCapacityD1Database,
  input: unknown,
): Promise<FoodExactSkuStockedCapacityPersistenceResult> {
  let value:
    FoodExactSkuStockedCapacitySourceRevision;

  try {
    value =
      deriveFoodExactSkuStockedCapacitySourceRevisionFromCandidate(
        input,
      );
  } catch {
    return freezeResult({
      outcome: "invalid",
    });
  }

  try {
    const exact =
      await readExact(
        database,
        value,
      );

    if (
      exact ===
      "storage-failure"
    ) {
      return freezeResult({
        outcome: "storage-failure",
      });
    }

    if (exact !== null) {
      if (same(exact, value)) {
        return freezeResult({
          outcome: "already-present",
          value: exact,
        });
      }

      return freezeResult({
        outcome: "conflict",
      });
    }

    const latest =
      await readLatest(
        database,
        value,
      );

    if (
      latest ===
      "storage-failure"
    ) {
      return freezeResult({
        outcome: "storage-failure",
      });
    }

    if (value.revision === 1) {
      if (latest !== null) {
        return freezeResult({
          outcome: "conflict",
        });
      }
    } else {
      if (
        latest === null ||
        latest.revision !==
          value.revision - 1
      ) {
        return freezeResult({
          outcome: "conflict",
        });
      }
    }

    const inserted =
      await attemptInsert(
        database,
        value,
      );

    if (
      inserted ===
      "storage-failure"
    ) {
      return freezeResult({
        outcome: "storage-failure",
      });
    }

    if (
      inserted !==
      "insert-failure"
    ) {
      if (!same(inserted, value)) {
        return freezeResult({
          outcome: "storage-failure",
        });
      }

      return freezeResult({
        outcome: "created",
        value: inserted,
      });
    }

    const raced =
      await readExact(
        database,
        value,
      );

    if (
      raced ===
      "storage-failure" ||
      raced === null
    ) {
      return freezeResult({
        outcome: "storage-failure",
      });
    }

    if (same(raced, value)) {
      return freezeResult({
        outcome: "already-present",
        value: raced,
      });
    }

    return freezeResult({
      outcome: "conflict",
    });
  } catch {
    return freezeResult({
      outcome: "storage-failure",
    });
  }
}
