import assert from "node:assert/strict";
import test from "node:test";

import {
  appendFoodFulfillmentSlotCapacitySourceRevision,
  type FoodFulfillmentSlotCapacityD1Database,
  type FoodFulfillmentSlotCapacityD1Result,
  type FoodFulfillmentSlotCapacityD1Statement,
} from "./d1-fulfillment-slot-capacity-source-persistence";

import {
  FOOD_FULFILLMENT_SLOT_CAPACITY_SOURCE_KIND,
} from "./fulfillment-slot-capacity-source-domain";

interface Row {
  method: string;
  location_reference: string;
  window_reference: string;
  revision: number;
  capacity_units: number;
  attribution: string;
  source_reference: string;
}

function fixture(
  revision = 1,
  capacityUnits = 4,
) {
  return {
    kind: FOOD_FULFILLMENT_SLOT_CAPACITY_SOURCE_KIND,
    method: "personal-delivery" as const,
    locationReference: "service-area:big-spring",
    windowReference: "window:2026-10-15T17:00",
    revision,
    capacityUnits,
    attribution: "synthetic:test-admin",
    sourceReference: `synthetic:slot-policy:${revision}`,
  };
}

class MemoryStatement
implements FoodFulfillmentSlotCapacityD1Statement {
  private values: (string | number | null)[] = [];

  constructor(
    private readonly database: MemoryDatabase,
    private readonly sql: string,
  ) {}

  bind(
    ...values: (string | number | null)[]
  ): FoodFulfillmentSlotCapacityD1Statement {
    this.values = values;
    return this;
  }

  async all(): Promise<FoodFulfillmentSlotCapacityD1Result> {
    return this.database.execute(
      this.sql,
      this.values,
    );
  }
}

class MemoryDatabase
implements FoodFulfillmentSlotCapacityD1Database {
  readonly rows: Row[] = [];
  failNext = false;
  throwOnInsert = false;
  malformedNextRead = false;

  prepare(
    sql: string,
  ): FoodFulfillmentSlotCapacityD1Statement {
    return new MemoryStatement(
      this,
      sql,
    );
  }

  async execute(
    sql: string,
    values: readonly (string | number | null)[],
  ): Promise<FoodFulfillmentSlotCapacityD1Result> {
    if (this.failNext) {
      this.failNext = false;

      return {
        success: false,
        results: [],
      };
    }

    const normalized =
      sql.replace(/\s+/g, " ").trim();

    if (
      normalized.startsWith("SELECT") &&
      normalized.includes("revision = ?")
    ) {
      if (this.malformedNextRead) {
        this.malformedNextRead = false;

        return {
          success: true,
          results: [
            {
              broken: true,
            },
          ],
        };
      }

      const [
        method,
        locationReference,
        windowReference,
        revision,
      ] = values;

      return {
        success: true,
        results: this.rows.filter(
          (row) =>
            row.method === method &&
            row.location_reference === locationReference &&
            row.window_reference === windowReference &&
            row.revision === revision,
        ),
      };
    }

    if (
      normalized.startsWith("SELECT") &&
      normalized.includes("ORDER BY revision DESC")
    ) {
      const [
        method,
        locationReference,
        windowReference,
      ] = values;

      const rows =
        this.rows
          .filter(
            (row) =>
              row.method === method &&
              row.location_reference === locationReference &&
              row.window_reference === windowReference,
          )
          .sort(
            (left, right) =>
              right.revision - left.revision,
          );

      return {
        success: true,
        results: rows.slice(0, 1),
      };
    }

    if (normalized.startsWith("INSERT")) {
      if (this.throwOnInsert) {
        this.throwOnInsert = false;
        throw new Error("synthetic insert race");
      }

      const [
        method,
        locationReference,
        windowReference,
        revision,
        capacityUnits,
        attribution,
        sourceReference,
      ] = values;

      if (
        typeof method !== "string" ||
        typeof locationReference !== "string" ||
        typeof windowReference !== "string" ||
        typeof revision !== "number" ||
        typeof capacityUnits !== "number" ||
        typeof attribution !== "string" ||
        typeof sourceReference !== "string"
      ) {
        return {
          success: false,
          results: [],
        };
      }

      if (
        this.rows.some(
          (row) =>
            row.method === method &&
            row.location_reference === locationReference &&
            row.window_reference === windowReference &&
            row.revision === revision,
        )
      ) {
        throw new Error("synthetic unique conflict");
      }

      const row: Row = {
        method,
        location_reference: locationReference,
        window_reference: windowReference,
        revision,
        capacity_units: capacityUnits,
        attribution,
        source_reference: sourceReference,
      };

      this.rows.push(row);

      return {
        success: true,
        results: [row],
        meta: {
          changes: 1,
        },
      };
    }

    return {
      success: false,
      results: [],
    };
  }
}

test(
  "initial slot capacity revision creates and exact retry is already-present",
  async () => {
    const database =
      new MemoryDatabase();

    const first =
      await appendFoodFulfillmentSlotCapacitySourceRevision(
        database,
        fixture(),
      );

    assert.equal(
      first.outcome,
      "created",
    );

    assert.equal(
      database.rows.length,
      1,
    );

    const retry =
      await appendFoodFulfillmentSlotCapacitySourceRevision(
        database,
        fixture(),
      );

    assert.equal(
      retry.outcome,
      "already-present",
    );

    assert.equal(
      database.rows.length,
      1,
    );
  },
);

test(
  "same identity revision with different payload conflicts",
  async () => {
    const database =
      new MemoryDatabase();

    await appendFoodFulfillmentSlotCapacitySourceRevision(
      database,
      fixture(),
    );

    const result =
      await appendFoodFulfillmentSlotCapacitySourceRevision(
        database,
        fixture(1, 9),
      );

    assert.equal(
      result.outcome,
      "conflict",
    );
  },
);

test(
  "revisions are strictly consecutive and stale or skipped revisions conflict",
  async () => {
    const database =
      new MemoryDatabase();

    assert.equal(
      (
        await appendFoodFulfillmentSlotCapacitySourceRevision(
          database,
          fixture(2),
        )
      ).outcome,
      "conflict",
    );

    assert.equal(
      (
        await appendFoodFulfillmentSlotCapacitySourceRevision(
          database,
          fixture(1),
        )
      ).outcome,
      "created",
    );

    assert.equal(
      (
        await appendFoodFulfillmentSlotCapacitySourceRevision(
          database,
          fixture(3),
        )
      ).outcome,
      "conflict",
    );

    assert.equal(
      (
        await appendFoodFulfillmentSlotCapacitySourceRevision(
          database,
          fixture(2),
        )
      ).outcome,
      "created",
    );

    assert.equal(
      (
        await appendFoodFulfillmentSlotCapacitySourceRevision(
          database,
          fixture(1),
        )
      ).outcome,
      "already-present",
    );
  },
);

test(
  "malformed input is invalid without database writes",
  async () => {
    const database =
      new MemoryDatabase();

    const result =
      await appendFoodFulfillmentSlotCapacitySourceRevision(
        database,
        {
          ...fixture(),
          capacityUnits: -1,
        },
      );

    assert.equal(
      result.outcome,
      "invalid",
    );

    assert.equal(
      database.rows.length,
      0,
    );
  },
);

test(
  "storage failures and malformed stored rows fail closed",
  async () => {
    const failure =
      new MemoryDatabase();

    failure.failNext = true;

    assert.equal(
      (
        await appendFoodFulfillmentSlotCapacitySourceRevision(
          failure,
          fixture(),
        )
      ).outcome,
      "storage-failure",
    );

    const malformed =
      new MemoryDatabase();

    malformed.malformedNextRead = true;

    assert.equal(
      (
        await appendFoodFulfillmentSlotCapacitySourceRevision(
          malformed,
          fixture(),
        )
      ).outcome,
      "storage-failure",
    );
  },
);

test(
  "insert race resolves through exact durable row rather than inventing created",
  async () => {
    const database =
      new MemoryDatabase();

    const value =
      fixture();

    database.rows.push({
      method: value.method,
      location_reference: value.locationReference,
      window_reference: value.windowReference,
      revision: value.revision,
      capacity_units: value.capacityUnits,
      attribution: value.attribution,
      source_reference: value.sourceReference,
    });

    const result =
      await appendFoodFulfillmentSlotCapacitySourceRevision(
        database,
        value,
      );

    assert.equal(
      result.outcome,
      "already-present",
    );
  },
);

test(
  "persistence targets only slot-capacity source table and grants no downstream authority",
  async () => {
    const {
      readFile,
    } = await import("node:fs/promises");

    const source = await readFile(
      new URL(
        "./d1-fulfillment-slot-capacity-source-persistence.ts",
        import.meta.url,
      ),
      "utf8",
    );

    assert.match(
      source,
      /food_fulfillment_slot_capacity_sources/,
    );

    assert.doesNotMatch(
      source,
      /food_sku_capacity_sources|food_capacity_reservations|food_capacity_reservation_lines|food_fulfillment_slot_reservations|quantityOnHand|inventoryMovement|checkoutReady|paymentReady|Stripe|Square|PayPal|fetch\s*\(|process\.env/i,
    );
  },
);
