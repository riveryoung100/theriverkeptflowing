/**
 * FOOD-008A — Authoritative Physical Order Version Persistence.
 *
 * Persists the exact FOOD-005E requested/cancelled lifecycle only.
 *
 * Durable physical-order history is not reservation acceptance, payment,
 * checkout readiness, preparation authority, dispatch authority,
 * fulfillment authority or completed-sale authority.
 */

import {
  validateFoodPhysicalOrderVersion,
  type FoodPhysicalOrderVersion,
} from "./physical-order-domain";

export interface FoodPhysicalOrderVersionPersistenceD1Result<T> {
  readonly success: boolean;
  readonly results?: T[];
}

export interface FoodPhysicalOrderVersionPersistenceD1BoundStatement {
  all<T>(): Promise<FoodPhysicalOrderVersionPersistenceD1Result<T>>;
}

export interface FoodPhysicalOrderVersionPersistenceD1Statement {
  bind(
    ...values: unknown[]
  ): FoodPhysicalOrderVersionPersistenceD1BoundStatement;
}

export interface FoodPhysicalOrderVersionPersistenceD1Database {
  prepare(
    sql: string,
  ): FoodPhysicalOrderVersionPersistenceD1Statement;
}

export type FoodPhysicalOrderVersionPersistenceResult =
  | Readonly<{
      outcome: "created";
      value: FoodPhysicalOrderVersion;
    }>
  | Readonly<{
      outcome: "already-present";
      value: FoodPhysicalOrderVersion;
    }>
  | Readonly<{
      outcome: "conflict";
    }>
  | Readonly<{
      outcome: "invalid";
    }>
  | Readonly<{
      outcome: "storage-failure";
    }>;

type StoredRow =
  Readonly<{
    order_id: unknown;
    order_version: unknown;
    state: unknown;
    snapshot_format_version: unknown;
    snapshot_json: unknown;
  }>;

type CapturedStoredOrder =
  Readonly<{
    value: FoodPhysicalOrderVersion;
    snapshotJson: string;
  }>;

const SNAPSHOT_FORMAT_VERSION =
  1 as const;

const COLUMNS = `
order_id,
order_version,
state,
snapshot_format_version,
snapshot_json
`.trim();

const EXACT_SQL = `
SELECT ${COLUMNS}
FROM food_physical_order_versions
WHERE order_id = ?
  AND order_version = ?
LIMIT 2
`.trim();

const LATEST_SQL = `
SELECT ${COLUMNS}
FROM food_physical_order_versions
WHERE order_id = ?
ORDER BY order_version DESC
LIMIT 1
`.trim();

const INSERT_SQL = `
INSERT INTO food_physical_order_versions (
  order_id,
  order_version,
  state,
  snapshot_format_version,
  snapshot_json
)
VALUES (?, ?, ?, ?, ?)
RETURNING ${COLUMNS}
`.trim();

function result<T extends FoodPhysicalOrderVersionPersistenceResult>(
  value: T,
): T {
  return Object.freeze(
    value,
  );
}

function strictRecord(
  input: unknown,
  expectedKeys: readonly string[],
  label: string,
): Record<string, unknown> {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input)
  ) {
    throw new TypeError(
      label,
    );
  }

  const prototype =
    Object.getPrototypeOf(
      input,
    );

  if (
    prototype !== Object.prototype &&
    prototype !== null
  ) {
    throw new TypeError(
      label,
    );
  }

  const keys =
    Reflect.ownKeys(
      input,
    );

  if (
    keys.length !== expectedKeys.length ||
    keys.some(
      (key) =>
        typeof key !== "string" ||
        !expectedKeys.includes(
          key,
        ),
    )
  ) {
    throw new TypeError(
      label,
    );
  }

  const descriptors =
    Object.getOwnPropertyDescriptors(
      input,
    );

  const captured =
    Object.create(
      null,
    ) as Record<string, unknown>;

  for (
    const key of expectedKeys
  ) {
    const descriptor =
      descriptors[key];

    if (
      descriptor === undefined ||
      !Object.prototype.hasOwnProperty.call(
        descriptor,
        "value",
      )
    ) {
      throw new TypeError(
        label,
      );
    }

    captured[key] =
      descriptor.value;
  }

  return captured;
}

function canonicalSnapshot(
  value: FoodPhysicalOrderVersion,
): Readonly<{
  quote: FoodPhysicalOrderVersion["quote"];
  fulfillmentIntent: FoodPhysicalOrderVersion["fulfillmentIntent"];
  reservationRequest: FoodPhysicalOrderVersion["reservationRequest"];
  lines: FoodPhysicalOrderVersion["lines"];
  merchandiseSubtotal: FoodPhysicalOrderVersion["merchandiseSubtotal"];
}> {
  return Object.freeze({
    quote:
      value.quote,
    fulfillmentIntent:
      value.fulfillmentIntent,
    reservationRequest:
      value.reservationRequest,
    lines:
      value.lines,
    merchandiseSubtotal:
      value.merchandiseSubtotal,
  });
}

function canonicalSnapshotJson(
  value: FoodPhysicalOrderVersion,
): string {
  return JSON.stringify(
    canonicalSnapshot(
      value,
    ),
  );
}

function same(
  left: FoodPhysicalOrderVersion,
  right: FoodPhysicalOrderVersion,
): boolean {
  return (
    JSON.stringify(
      left,
    ) ===
    JSON.stringify(
      right,
    )
  );
}

function storedOrder(
  input: unknown,
): CapturedStoredOrder {
  const row =
    strictRecord(
      input,
      [
        "order_id",
        "order_version",
        "state",
        "snapshot_format_version",
        "snapshot_json",
      ],
      "Malformed durable physical-order row",
    );

  if (
    row.snapshot_format_version !==
    SNAPSHOT_FORMAT_VERSION
  ) {
    throw new TypeError(
      "Unsupported physical-order snapshot format",
    );
  }

  if (
    typeof row.snapshot_json !==
      "string" ||
    row.snapshot_json.length < 2
  ) {
    throw new TypeError(
      "Malformed physical-order snapshot JSON",
    );
  }

  const parsed =
    JSON.parse(
      row.snapshot_json,
    ) as unknown;

  const snapshot =
    strictRecord(
      parsed,
      [
        "quote",
        "fulfillmentIntent",
        "reservationRequest",
        "lines",
        "merchandiseSubtotal",
      ],
      "Malformed physical-order snapshot payload",
    );

  const value =
    validateFoodPhysicalOrderVersion({
      id:
        row.order_id,
      version:
        row.order_version,
      state:
        row.state,
      quote:
        snapshot.quote,
      fulfillmentIntent:
        snapshot.fulfillmentIntent,
      reservationRequest:
        snapshot.reservationRequest,
      lines:
        snapshot.lines,
      merchandiseSubtotal:
        snapshot.merchandiseSubtotal,
    });

  if (
    (
      value.version === 1 &&
      value.state !== "requested"
    ) ||
    (
      value.version === 2 &&
      value.state !== "cancelled"
    ) ||
    (
      value.version !== 1 &&
      value.version !== 2
    )
  ) {
    throw new TypeError(
      "Stored physical-order lifecycle violates FOOD-005E persistence rules",
    );
  }

  const canonical =
    canonicalSnapshotJson(
      value,
    );

  if (
    canonical !==
    row.snapshot_json
  ) {
    throw new TypeError(
      "Stored physical-order snapshot is not canonical",
    );
  }

  return Object.freeze({
    value,
    snapshotJson:
      canonical,
  });
}

async function execute<T>(
  statement:
    FoodPhysicalOrderVersionPersistenceD1BoundStatement,
): Promise<readonly T[]> {
  const response =
    await statement.all<T>();

  if (
    typeof response !== "object" ||
    response === null ||
    response.success !== true ||
    !Array.isArray(
      response.results,
    )
  ) {
    throw new TypeError(
      "Uncertain physical-order storage result",
    );
  }

  return response.results;
}

async function readExact(
  database:
    FoodPhysicalOrderVersionPersistenceD1Database,
  orderId: FoodPhysicalOrderVersion["id"],
  orderVersion: number,
): Promise<CapturedStoredOrder | null> {
  const rows =
    await execute<StoredRow>(
      database
        .prepare(
          EXACT_SQL,
        )
        .bind(
          orderId,
          orderVersion,
        ),
    );

  if (
    rows.length > 1
  ) {
    throw new TypeError(
      "Unexpected exact physical-order row count",
    );
  }

  if (
    rows.length === 0
  ) {
    return null;
  }

  const stored =
    storedOrder(
      rows[0],
    );

  if (
    stored.value.id !== orderId ||
    stored.value.version !== orderVersion
  ) {
    throw new TypeError(
      "Wrong exact physical-order identity",
    );
  }

  return stored;
}

async function readLatest(
  database:
    FoodPhysicalOrderVersionPersistenceD1Database,
  orderId: FoodPhysicalOrderVersion["id"],
): Promise<CapturedStoredOrder | null> {
  const rows =
    await execute<StoredRow>(
      database
        .prepare(
          LATEST_SQL,
        )
        .bind(
          orderId,
        ),
    );

  if (
    rows.length > 1
  ) {
    throw new TypeError(
      "Unexpected latest physical-order row count",
    );
  }

  if (
    rows.length === 0
  ) {
    return null;
  }

  const stored =
    storedOrder(
      rows[0],
    );

  if (
    stored.value.id !==
    orderId
  ) {
    throw new TypeError(
      "Wrong latest physical-order identity",
    );
  }

  return stored;
}

function existingResult(
  stored: CapturedStoredOrder,
  requested: FoodPhysicalOrderVersion,
): FoodPhysicalOrderVersionPersistenceResult {
  return same(
    stored.value,
    requested,
  )
    ? result({
        outcome:
          "already-present",
        value:
          stored.value,
      })
    : result({
        outcome:
          "conflict",
      });
}

export async function appendFoodPhysicalOrderVersion(
  database:
    FoodPhysicalOrderVersionPersistenceD1Database,
  input: unknown,
): Promise<FoodPhysicalOrderVersionPersistenceResult> {
  let value:
    FoodPhysicalOrderVersion;

  let snapshotJson:
    string;

  try {
    value =
      validateFoodPhysicalOrderVersion(
        input,
      );

    snapshotJson =
      canonicalSnapshotJson(
        value,
      );
  }
  catch {
    return result({
      outcome:
        "invalid",
    });
  }

  try {
    /*
     * Exact durable identity has precedence over lifecycle checks so an exact
     * idempotent replay remains replayable even after later history exists.
     */
    const exact =
      await readExact(
        database,
        value.id,
        value.version,
      );

    if (
      exact !== null
    ) {
      return existingResult(
        exact,
        value,
      );
    }

    if (
      value.version === 1
    ) {
      if (
        value.state !==
        "requested"
      ) {
        return result({
          outcome:
            "conflict",
        });
      }

      const latest =
        await readLatest(
          database,
          value.id,
        );

      if (
        latest !== null
      ) {
        return result({
          outcome:
            "conflict",
        });
      }
    }
    else if (
      value.version === 2
    ) {
      if (
        value.state !==
        "cancelled"
      ) {
        return result({
          outcome:
            "conflict",
        });
      }

      const predecessor =
        await readExact(
          database,
          value.id,
          1,
        );

      if (
        predecessor === null ||
        predecessor.value.state !==
          "requested" ||
        predecessor.snapshotJson !==
          snapshotJson
      ) {
        return result({
          outcome:
            "conflict",
        });
      }
    }
    else {
      return result({
        outcome:
          "conflict",
      });
    }

    try {
      const rows =
        await execute<StoredRow>(
          database
            .prepare(
              INSERT_SQL,
            )
            .bind(
              value.id,
              value.version,
              value.state,
              SNAPSHOT_FORMAT_VERSION,
              snapshotJson,
            ),
        );

      if (
        rows.length !== 1
      ) {
        return result({
          outcome:
            "storage-failure",
        });
      }

      const created =
        storedOrder(
          rows[0],
        );

      if (
        created.value.id !==
          value.id ||
        created.value.version !==
          value.version ||
        created.snapshotJson !==
          snapshotJson ||
        !same(
          created.value,
          value,
        )
      ) {
        return result({
          outcome:
            "storage-failure",
        });
      }

      return result({
        outcome:
          "created",
        value:
          created.value,
      });
    }
    catch {
      /*
       * A concurrent exact insert can race this one. Do not retry the write.
       * Exact durable state decides whether the race was an idempotent replay,
       * a divergent conflict, or an unclassifiable storage failure.
       */
      const raced =
        await readExact(
          database,
          value.id,
          value.version,
        );

      if (
        raced === null
      ) {
        return result({
          outcome:
            "storage-failure",
        });
      }

      return existingResult(
        raced,
        value,
      );
    }
  }
  catch {
    return result({
      outcome:
        "storage-failure",
    });
  }
}
