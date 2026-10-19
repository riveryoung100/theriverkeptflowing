import assert from "node:assert/strict";
import test from "node:test";

import {
  FOOD_RESERVATION_CAPACITY_SOURCE_LATEST_RECORDED_SELECTION_VALIDATION_KIND,
  validateFoodReservationCapacitySourceLatestRecordedSelection,
} from "./reservation-capacity-source-latest-recorded-selection-validation";

const SKU_ID = "food-sku:007g";

type ResponseMode =
  | "ok"
  | "not-found"
  | "storage-failure"
  | "malformed";

class Database {
  readonly sql: string[] = [];
  readonly binds: unknown[][] = [];

  reads = 0;

  skuRevision = 2;
  slotRevision = 4;

  skuMode: ResponseMode =
    "ok";

  slotMode: ResponseMode =
    "ok";

  prepare(sql: string) {
    this.sql.push(sql);

    return {
      bind: (...values: unknown[]) => {
        this.binds.push(values);

        return {
          all: async <T>() => {
            this.reads += 1;

            const sku =
              sql.includes(
                "food_sku_capacity_sources",
              );

            const mode =
              sku
                ? this.skuMode
                : this.slotMode;

            if (
              mode ===
              "storage-failure"
            ) {
              return {
                success: false,
                results: [],
              };
            }

            if (
              mode ===
              "not-found"
            ) {
              return {
                success: true,
                results: [],
              };
            }

            if (
              mode ===
              "malformed"
            ) {
              return {
                success: true,
                results: [
                  {
                    nonsense: true,
                  },
                ] as T[],
              };
            }

            if (sku) {
              return {
                success: true,
                results: [
                  {
                    sku_id:
                      values[0],
                    sku_version:
                      values[1],
                    revision:
                      this.skuRevision,
                    capacity_units: 20,
                    attribution:
                      "fixture",
                    source_reference:
                      "source:sku",
                  },
                ] as T[],
              };
            }

            return {
              success: true,
              results: [
                {
                  method:
                    values[0],
                  location_reference:
                    values[1],
                  window_reference:
                    values[2],
                  revision:
                    this.slotRevision,
                  capacity_units: 8,
                  attribution:
                    "fixture",
                  source_reference:
                    "source:slot",
                },
              ] as T[],
            };
          },
        };
      },
    };
  }
}

function resolution() {
  return {
    kind:
      "reservation-capacity-source-selection-resolution",

    selection: {
      kind:
        "reservation-capacity-source-selection-request",

      request: {},
      fulfillmentIntent: {},

      skuSelections: [
        {
          sku: {
            id: SKU_ID,
            version: 1,
          },
          revision: 2,
        },
      ],

      slotSelection: {
        method:
          "personal-delivery",
        locationReference:
          "location:food-007i",
        windowReference:
          "window:food-007i",
        revision: 4,
      },
    },

    skuSources: [
      {
        sku: {
          id: SKU_ID,
          version: 1,
        },
        revision: 2,
      },
    ],

    slotSource: {
      method:
        "personal-delivery",
      locationReference:
        "location:food-007i",
      windowReference:
        "window:food-007i",
      revision: 4,
    },
  };
}

test(
  "007I validates when each selected revision equals the individually observed highest recorded revision",
  async () => {
    const database =
      new Database();

    const result =
      await validateFoodReservationCapacitySourceLatestRecordedSelection(
        database as never,
        resolution() as never,
      );

    assert.equal(
      result.outcome,
      "validated",
    );

    if (
      result.outcome !==
      "validated"
    ) {
      throw new Error(
        "expected validated",
      );
    }

    assert.equal(
      result.validation.kind,
      FOOD_RESERVATION_CAPACITY_SOURCE_LATEST_RECORDED_SELECTION_VALIDATION_KIND,
    );

    assert.deepEqual(
      result.validation.skuObservations,
      [
        {
          sku: {
            id: SKU_ID,
            version: 1,
          },
          selectedRevision: 2,
          observedHighestRecordedRevision: 2,
        },
      ],
    );

    assert.deepEqual(
      result.validation.slotObservation,
      {
        method:
          "personal-delivery",
        locationReference:
          "location:food-007i",
        windowReference:
          "window:food-007i",
        selectedRevision: 4,
        observedHighestRecordedRevision: 4,
      },
    );

    assert.equal(
      database.reads,
      2,
    );

    assert.equal(
      Object.isFrozen(result),
      true,
    );

    assert.equal(
      Object.isFrozen(
        result.validation,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        result.validation.skuObservations,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        result.validation.slotObservation,
      ),
      true,
    );
  },
);

test(
  "007I fails fast when a later recorded SKU revision is observed",
  async () => {
    const database =
      new Database();

    database.skuRevision = 3;

    const result =
      await validateFoodReservationCapacitySourceLatestRecordedSelection(
        database as never,
        resolution() as never,
      );

    assert.equal(
      result.outcome,
      "later-recorded-revision",
    );

    if (
      result.outcome !==
      "later-recorded-revision"
    ) {
      throw new Error(
        "expected later-recorded-revision",
      );
    }

    assert.equal(
      result.target.scope,
      "sku",
    );

    assert.equal(
      result.observedHighestRecordedRevision,
      3,
    );

    assert.equal(
      database.reads,
      1,
    );
  },
);

test(
  "007I reports a later recorded slot revision only after SKU validation succeeds",
  async () => {
    const database =
      new Database();

    database.slotRevision = 5;

    const result =
      await validateFoodReservationCapacitySourceLatestRecordedSelection(
        database as never,
        resolution() as never,
      );

    assert.equal(
      result.outcome,
      "later-recorded-revision",
    );

    if (
      result.outcome !==
      "later-recorded-revision"
    ) {
      throw new Error(
        "expected later-recorded-revision",
      );
    }

    assert.equal(
      result.target.scope,
      "slot",
    );

    assert.equal(
      result.observedHighestRecordedRevision,
      5,
    );

    assert.equal(
      database.reads,
      2,
    );
  },
);

test(
  "007I fails closed when observed highest recorded revision is below an already resolved selected revision",
  async () => {
    const database =
      new Database();

    database.skuRevision = 1;

    const result =
      await validateFoodReservationCapacitySourceLatestRecordedSelection(
        database as never,
        resolution() as never,
      );

    assert.deepEqual(
      result,
      {
        outcome:
          "storage-failure",
      },
    );

    assert.equal(
      database.reads,
      1,
    );
  },
);

test(
  "007I preserves latest-reader not-found without inventing availability meaning",
  async () => {
    const database =
      new Database();

    database.skuMode =
      "not-found";

    const result =
      await validateFoodReservationCapacitySourceLatestRecordedSelection(
        database as never,
        resolution() as never,
      );

    assert.equal(
      result.outcome,
      "not-found",
    );

    if (
      result.outcome !==
      "not-found"
    ) {
      throw new Error(
        "expected not-found",
      );
    }

    assert.equal(
      result.target.scope,
      "sku",
    );

    assert.equal(
      database.reads,
      1,
    );
  },
);

test(
  "007I preserves latest-reader storage failure and does not continue",
  async () => {
    const database =
      new Database();

    database.skuMode =
      "malformed";

    const result =
      await validateFoodReservationCapacitySourceLatestRecordedSelection(
        database as never,
        resolution() as never,
      );

    assert.deepEqual(
      result,
      {
        outcome:
          "storage-failure",
      },
    );

    assert.equal(
      database.reads,
      1,
    );
  },
);

test(
  "007I rejects an internally misbound 007F resolution before database access",
  async () => {
    const database =
      new Database();

    const input =
      resolution();

    input.skuSources[0]!.revision =
      9;

    const result =
      await validateFoodReservationCapacitySourceLatestRecordedSelection(
        database as never,
        input as never,
      );

    assert.deepEqual(
      result,
      {
        outcome:
          "invalid",
      },
    );

    assert.equal(
      database.reads,
      0,
    );
  },
);

test(
  "007I rejects unexpected root shape before database access",
  async () => {
    const database =
      new Database();

    const input = {
      ...resolution(),
      governing: true,
    };

    const result =
      await validateFoodReservationCapacitySourceLatestRecordedSelection(
        database as never,
        input as never,
      );

    assert.deepEqual(
      result,
      {
        outcome:
          "invalid",
      },
    );

    assert.equal(
      database.reads,
      0,
    );
  },
);

test(
  "007I rejects accessors without invoking them",
  async () => {
    const database =
      new Database();

    let calls = 0;

    const input =
      resolution();

    Object.defineProperty(
      input,
      "kind",
      {
        enumerable: true,
        get() {
          calls += 1;

          return "reservation-capacity-source-selection-resolution";
        },
      },
    );

    const result =
      await validateFoodReservationCapacitySourceLatestRecordedSelection(
        database as never,
        input as never,
      );

    assert.equal(
      result.outcome,
      "invalid",
    );

    assert.equal(
      calls,
      0,
    );

    assert.equal(
      database.reads,
      0,
    );
  },
);

test(
  "007I uses only FOOD-007G and FOOD-007H latest-recorded capacity-source reads",
  async () => {
    const database =
      new Database();

    const result =
      await validateFoodReservationCapacitySourceLatestRecordedSelection(
        database as never,
        resolution() as never,
      );

    assert.equal(
      result.outcome,
      "validated",
    );

    assert.equal(
      database.sql.length,
      2,
    );

    assert.match(
      database.sql[0]!,
      /FROM food_sku_capacity_sources/,
    );

    assert.match(
      database.sql[0]!,
      /ORDER BY revision DESC/,
    );

    assert.match(
      database.sql[0]!,
      /LIMIT 1/,
    );

    assert.match(
      database.sql[1]!,
      /FROM food_fulfillment_slot_capacity_sources/,
    );

    assert.match(
      database.sql[1]!,
      /ORDER BY revision DESC/,
    );

    assert.match(
      database.sql[1]!,
      /LIMIT 1/,
    );

    const joined =
      database.sql.join(" ");

    assert.doesNotMatch(
      joined,
      /food_capacity_reservations|food_capacity_reservation_lines|food_fulfillment_slot_reservations/i,
    );

    assert.doesNotMatch(
      joined,
      /\bINSERT\b|\bUPDATE\b|\bDELETE\b/i,
    );
  },
);

test(
  "007I result surface contains no governing eligibility remaining reservable ATP or acceptance claim",
  async () => {
    const database =
      new Database();

    const result =
      await validateFoodReservationCapacitySourceLatestRecordedSelection(
        database as never,
        resolution() as never,
      );

    assert.equal(
      result.outcome,
      "validated",
    );

    const text =
      JSON.stringify(
        result,
      );

    for (
      const forbidden of
        [
          "governing",
          "eligible",
          "trusted",
          "current",
          "fresh",
          "available",
          "remaining",
          "reservable",
          "atp",
          "accepted",
          "held",
          "orderable",
          "checkoutReady",
          "paymentReady",
        ]
    ) {
      assert.equal(
        text.toLowerCase().includes(
          `"${forbidden.toLowerCase()}"`,
        ),
        false,
        forbidden,
      );
    }
  },
);