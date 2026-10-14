import {
  serializeFoodFulfillmentSlotCapacitySourceRevision,
  validateFoodFulfillmentSlotCapacitySourceRevision,
  type FoodFulfillmentSlotCapacitySourceRevision,
} from "./fulfillment-slot-capacity-source-domain";

type FoodD1Primitive = string | number | null;

export interface FoodFulfillmentSlotCapacityD1Result {
  readonly success: boolean;
  readonly results?: readonly unknown[];
  readonly meta?: {
    readonly changes?: number;
  };
}

export interface FoodFulfillmentSlotCapacityD1Statement {
  bind(
    ...values: FoodD1Primitive[]
  ): FoodFulfillmentSlotCapacityD1Statement;

  all(): Promise<FoodFulfillmentSlotCapacityD1Result>;
}

export interface FoodFulfillmentSlotCapacityD1Database {
  prepare(
    sql: string,
  ): FoodFulfillmentSlotCapacityD1Statement;
}

export type FoodFulfillmentSlotCapacityPersistenceResult =
  | {
      readonly outcome: "created";
      readonly value: FoodFulfillmentSlotCapacitySourceRevision;
    }
  | {
      readonly outcome: "already-present";
      readonly value: FoodFulfillmentSlotCapacitySourceRevision;
    }
  | {
      readonly outcome: "conflict";
    }
  | {
      readonly outcome: "invalid";
    }
  | {
      readonly outcome: "storage-failure";
    };

interface StoredSlotCapacityRow {
  readonly method: string;
  readonly location_reference: string;
  readonly window_reference: string;
  readonly revision: number;
  readonly capacity_units: number;
  readonly attribution: string;
  readonly source_reference: string;
}

const SELECT_COLUMNS = `
method,
location_reference,
window_reference,
revision,
capacity_units,
attribution,
source_reference
`;

const EXACT_SQL = `
SELECT ${SELECT_COLUMNS}
FROM food_fulfillment_slot_capacity_sources
WHERE method = ?
  AND location_reference = ?
  AND window_reference = ?
  AND revision = ?
LIMIT 1
`;

const LATEST_SQL = `
SELECT ${SELECT_COLUMNS}
FROM food_fulfillment_slot_capacity_sources
WHERE method = ?
  AND location_reference = ?
  AND window_reference = ?
ORDER BY revision DESC
LIMIT 1
`;

const INSERT_SQL = `
INSERT INTO food_fulfillment_slot_capacity_sources (
  method,
  location_reference,
  window_reference,
  revision,
  capacity_units,
  attribution,
  source_reference
)
VALUES (?, ?, ?, ?, ?, ?, ?)
RETURNING ${SELECT_COLUMNS}
`;

function storedRow(
  input: unknown,
): FoodFulfillmentSlotCapacitySourceRevision {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input)
  ) {
    throw new TypeError("stored row is malformed");
  }

  const row =
    input as Partial<StoredSlotCapacityRow>;

  return validateFoodFulfillmentSlotCapacitySourceRevision({
    kind: "fulfillment-slot-capacity-source",
    method: row.method,
    locationReference: row.location_reference,
    windowReference: row.window_reference,
    revision: row.revision,
    capacityUnits: row.capacity_units,
    attribution: row.attribution,
    sourceReference: row.source_reference,
  });
}

function same(
  left: FoodFulfillmentSlotCapacitySourceRevision,
  right: FoodFulfillmentSlotCapacitySourceRevision,
): boolean {
  return (
    serializeFoodFulfillmentSlotCapacitySourceRevision(left) ===
    serializeFoodFulfillmentSlotCapacitySourceRevision(right)
  );
}

async function execute(
  statement: FoodFulfillmentSlotCapacityD1Statement,
): Promise<readonly unknown[] | null> {
  const result =
    await statement.all();

  if (
    !result ||
    result.success !== true ||
    !Array.isArray(result.results)
  ) {
    return null;
  }

  return result.results;
}

async function readExact(
  database: FoodFulfillmentSlotCapacityD1Database,
  value: FoodFulfillmentSlotCapacitySourceRevision,
): Promise<
  | FoodFulfillmentSlotCapacitySourceRevision
  | null
  | "storage-failure"
> {
  const rows =
    await execute(
      database
        .prepare(EXACT_SQL)
        .bind(
          value.method,
          value.locationReference,
          value.windowReference,
          value.revision,
        ),
    );

  if (rows === null || rows.length > 1) {
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
  database: FoodFulfillmentSlotCapacityD1Database,
  value: FoodFulfillmentSlotCapacitySourceRevision,
): Promise<
  | FoodFulfillmentSlotCapacitySourceRevision
  | null
  | "storage-failure"
> {
  const rows =
    await execute(
      database
        .prepare(LATEST_SQL)
        .bind(
          value.method,
          value.locationReference,
          value.windowReference,
        ),
    );

  if (rows === null || rows.length > 1) {
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

export async function appendFoodFulfillmentSlotCapacitySourceRevision(
  database: FoodFulfillmentSlotCapacityD1Database,
  input: unknown,
): Promise<FoodFulfillmentSlotCapacityPersistenceResult> {
  let value: FoodFulfillmentSlotCapacitySourceRevision;

  try {
    value =
      validateFoodFulfillmentSlotCapacitySourceRevision(
        input,
      );
  } catch {
    return {
      outcome: "invalid",
    };
  }

  try {
    const exact =
      await readExact(
        database,
        value,
      );

    if (exact === "storage-failure") {
      return {
        outcome: "storage-failure",
      };
    }

    if (exact !== null) {
      if (same(exact, value)) {
        return {
          outcome: "already-present",
          value: exact,
        };
      }

      return {
        outcome: "conflict",
      };
    }

    const latest =
      await readLatest(
        database,
        value,
      );

    if (latest === "storage-failure") {
      return {
        outcome: "storage-failure",
      };
    }

    if (value.revision === 1) {
      if (latest !== null) {
        return {
          outcome: "conflict",
        };
      }
    } else {
      if (
        latest === null ||
        latest.revision !== value.revision - 1
      ) {
        return {
          outcome: "conflict",
        };
      }
    }

    try {
      const rows =
        await execute(
          database
            .prepare(INSERT_SQL)
            .bind(
              value.method,
              value.locationReference,
              value.windowReference,
              value.revision,
              value.capacityUnits,
              value.attribution,
              value.sourceReference,
            ),
        );

      if (
        rows !== null &&
        rows.length === 1
      ) {
        let created: FoodFulfillmentSlotCapacitySourceRevision;

        try {
          created =
            storedRow(rows[0]);
        } catch {
          return {
            outcome: "storage-failure",
          };
        }

        if (!same(created, value)) {
          return {
            outcome: "storage-failure",
          };
        }

        return {
          outcome: "created",
          value: created,
        };
      }
    } catch {
      // A competing exact insert can race this write.
      // Resolve the durable state below.
    }

    const raced =
      await readExact(
        database,
        value,
      );

    if (raced === "storage-failure") {
      return {
        outcome: "storage-failure",
      };
    }

    if (raced === null) {
      return {
        outcome: "storage-failure",
      };
    }

    if (same(raced, value)) {
      return {
        outcome: "already-present",
        value: raced,
      };
    }

    return {
      outcome: "conflict",
    };
  } catch {
    return {
      outcome: "storage-failure",
    };
  }
}
