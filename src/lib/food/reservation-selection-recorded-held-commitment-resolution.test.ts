import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  FOOD_RESERVATION_SELECTION_RECORDED_HELD_COMMITMENT_RESOLUTION_KIND,
  resolveFoodReservationSelectionRecordedHeldCommitments,
} from "./reservation-selection-recorded-held-commitment-resolution";

const SKU_A =
  "food-sku:007k-a";

const SKU_B =
  "food-sku:007k-b";

const LOCATION =
  "synthetic:location";

const WINDOW =
  "synthetic:window";

type Method =
  | "personal-delivery"
  | "meetup";

type Call =
  Readonly<{
    sql: string;
    bound: readonly unknown[];
  }>;

function resolution(
  method: Method =
    "personal-delivery",
) {
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
            id: SKU_A,
            version: 1,
          },
          revision: 2,
        },
        {
          sku: {
            id: SKU_B,
            version: 1,
          },
          revision: 3,
        },
      ],

      slotSelection: {
        method,
        locationReference:
          LOCATION,
        windowReference:
          WINDOW,
        revision: 4,
      },
    },

    skuSources: [
      {
        kind:
          "exact-sku-stocked-capacity-source",
        sku: {
          id: SKU_A,
          version: 1,
        },
        revision: 2,
        capacityUnits: 10,
        attribution:
          "synthetic:writer",
        sourceReference:
          "opaque:unverified",
      },
      {
        kind:
          "exact-sku-stocked-capacity-source",
        sku: {
          id: SKU_B,
          version: 1,
        },
        revision: 3,
        capacityUnits: 8,
        attribution:
          "synthetic:writer",
        sourceReference:
          "opaque:unverified",
      },
    ],

    slotSource: {
      kind:
        "fulfillment-slot-capacity-source",
      method,
      locationReference:
        LOCATION,
      windowReference:
        WINDOW,
      revision: 4,
      capacityUnits: 5,
      attribution:
        "synthetic:writer",
      sourceReference:
        "opaque:unverified",
    },
  };
}

class Database {
  readonly calls:
    Call[] = [];

  latestSkuARevision = 2;
  latestSkuBRevision = 3;
  latestSlotRevision = 4;

  latestSkuAMode:
    | "ok"
    | "not-found"
    | "malformed" =
    "ok";

  latestSlotMode:
    | "ok"
    | "not-found"
    | "malformed" =
    "ok";

  skuARecordedHeld = 2;
  skuBRecordedHeld = 1;
  slotRecordedHeld = 1;

  aggregateFailure:
    | "none"
    | "sku-a"
    | "sku-b"
    | "slot" =
    "none";

  prepare(
    sql: string,
  ) {
    return {
      bind:
        (...bound: unknown[]) => {
          this.calls.push(
            Object.freeze({
              sql,
              bound:
                Object.freeze([
                  ...bound,
                ]),
            }),
          );

          return {
            all:
              async <T>() => {
                return this.response(
                  sql,
                  bound,
                ) as T;
              },
          };
        },
    };
  }

  private response(
    sql: string,
    bound: readonly unknown[],
  ) {
    if (
      /FROM food_sku_capacity_sources/i.test(
        sql,
      )
    ) {
      const id =
        bound[0];

      if (
        id === SKU_A &&
        this.latestSkuAMode ===
          "not-found"
      ) {
        return {
          success: true,
          results: [],
        };
      }

      if (
        id === SKU_A &&
        this.latestSkuAMode ===
          "malformed"
      ) {
        return {
          success: true,
          results: [
            {
              bad: true,
            },
          ],
        };
      }

      const revision =
        id === SKU_A
          ? this.latestSkuARevision
          : this.latestSkuBRevision;

      const capacity =
        id === SKU_A
          ? 10
          : 8;

      return {
        success: true,
        results: [
          {
            sku_id:
              id,
            sku_version:
              bound[1],
            revision,
            capacity_units:
              capacity,
            attribution:
              "synthetic:writer",
            source_reference:
              "opaque:unverified",
          },
        ],
      };
    }

    if (
      /FROM food_fulfillment_slot_capacity_sources/i.test(
        sql,
      )
    ) {
      if (
        this.latestSlotMode ===
        "not-found"
      ) {
        return {
          success: true,
          results: [],
        };
      }

      if (
        this.latestSlotMode ===
        "malformed"
      ) {
        return {
          success: true,
          results: [
            {
              bad: true,
            },
          ],
        };
      }

      return {
        success: true,
        results: [
          {
            method:
              bound[0],
            location_reference:
              bound[1],
            window_reference:
              bound[2],
            revision:
              this.latestSlotRevision,
            capacity_units: 5,
            attribution:
              "synthetic:writer",
            source_reference:
              "opaque:unverified",
          },
        ],
      };
    }

    if (
      /FROM food_capacity_reservation_lines AS line/i.test(
        sql,
      )
    ) {
      const id =
        bound[0];

      if (
        (
          id === SKU_A &&
          this.aggregateFailure ===
            "sku-a"
        ) ||
        (
          id === SKU_B &&
          this.aggregateFailure ===
            "sku-b"
        )
      ) {
        return {
          success: true,
          results: [
            {
              recorded_held_quantity:
                "malformed",
            },
          ],
        };
      }

      return {
        success: true,
        results: [
          {
            recorded_held_quantity:
              id === SKU_A
                ? this.skuARecordedHeld
                : this.skuBRecordedHeld,
          },
        ],
      };
    }

    if (
      /FROM food_fulfillment_slot_reservations AS slot/i.test(
        sql,
      )
    ) {
      if (
        this.aggregateFailure ===
        "slot"
      ) {
        return {
          success: true,
          results: [
            {
              recorded_held_quantity:
                "malformed",
            },
          ],
        };
      }

      return {
        success: true,
        results: [
          {
            recorded_held_quantity:
              this.slotRecordedHeld,
          },
        ],
      };
    }

    throw new Error(
      `Unexpected SQL: ${sql}`,
    );
  }

  reservationCalls() {
    return this.calls.filter(
      (call) =>
        /food_capacity_reservation_lines|food_fulfillment_slot_reservations/i.test(
          call.sql,
        ),
    );
  }
}

function success(
  input:
    Awaited<
      ReturnType<
        typeof resolveFoodReservationSelectionRecordedHeldCommitments
      >
    >,
) {
  assert.equal(
    input.outcome,
    "resolved",
  );

  if (
    input.outcome !==
    "resolved"
  ) {
    throw new Error(
      "Expected resolved",
    );
  }

  return input.resolution;
}

for (
  const method of
    [
      "personal-delivery",
      "meetup",
    ] as const
) {
  test(
    `007K composes validated exact commitments for ${method}`,
    async () => {
      const database =
        new Database();

      const input =
        resolution(
          method,
        );

      const value =
        success(
          await resolveFoodReservationSelectionRecordedHeldCommitments(
            database as never,
            input as never,
          ),
        );

      assert.equal(
        value.kind,
        FOOD_RESERVATION_SELECTION_RECORDED_HELD_COMMITMENT_RESOLUTION_KIND,
      );

      assert.deepEqual(
        value.skuCommitments,
        [
          {
            sku: {
              id: SKU_A,
              version: 1,
            },
            capacityRevision: 2,
            recordedHeldQuantity: 2,
          },
          {
            sku: {
              id: SKU_B,
              version: 1,
            },
            capacityRevision: 3,
            recordedHeldQuantity: 1,
          },
        ],
      );

      assert.deepEqual(
        value.slotCommitment,
        {
          method,
          locationReference:
            LOCATION,
          windowReference:
            WINDOW,
          capacityRevision: 4,
          recordedHeldQuantity: 1,
        },
      );

      assert.deepEqual(
        value.validation.skuObservations,
        [
          {
            sku: {
              id: SKU_A,
              version: 1,
            },
            selectedRevision: 2,
            observedHighestRecordedRevision: 2,
          },
          {
            sku: {
              id: SKU_B,
              version: 1,
            },
            selectedRevision: 3,
            observedHighestRecordedRevision: 3,
          },
        ],
      );

      assert.deepEqual(
        value.validation.slotObservation,
        {
          method,
          locationReference:
            LOCATION,
          windowReference:
            WINDOW,
          selectedRevision: 4,
          observedHighestRecordedRevision: 4,
        },
      );

      assert.equal(
        database.calls.length,
        6,
      );

      assert.deepEqual(
        database.calls.map(
          (call) =>
            call.bound,
        ),
        [
          [
            SKU_A,
            1,
          ],
          [
            SKU_B,
            1,
          ],
          [
            method,
            LOCATION,
            WINDOW,
          ],
          [
            SKU_A,
            1,
            2,
          ],
          [
            SKU_B,
            1,
            3,
          ],
          [
            method,
            LOCATION,
            WINDOW,
            4,
          ],
        ],
      );

      assert.equal(
        database.reservationCalls().length,
        3,
      );

      assert.equal(
        Object.isFrozen(
          value,
        ),
        true,
      );

      assert.equal(
        Object.isFrozen(
          value.validation,
        ),
        true,
      );

      assert.equal(
        Object.isFrozen(
          value.validation.skuObservations,
        ),
        true,
      );

      assert.equal(
        Object.isFrozen(
          value.skuCommitments,
        ),
        true,
      );

      assert.equal(
        Object.isFrozen(
          value.skuCommitments[0],
        ),
        true,
      );

      assert.equal(
        Object.isFrozen(
          value.slotCommitment,
        ),
        true,
      );
    },
  );
}

test(
  "007K preserves FOOD-007I later-recorded-revision and performs no reservation reads",
  async () => {
    const database =
      new Database();

    database.latestSkuARevision =
      5;

    const result =
      await resolveFoodReservationSelectionRecordedHeldCommitments(
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
        "Expected later-recorded-revision",
      );
    }

    assert.equal(
      result.observedHighestRecordedRevision,
      5,
    );

    assert.equal(
      result.target.scope,
      "sku",
    );

    assert.equal(
      database.reservationCalls().length,
      0,
    );
  },
);

test(
  "007K preserves FOOD-007I not-found and performs no reservation reads",
  async () => {
    const database =
      new Database();

    database.latestSkuAMode =
      "not-found";

    const result =
      await resolveFoodReservationSelectionRecordedHeldCommitments(
        database as never,
        resolution() as never,
      );

    assert.equal(
      result.outcome,
      "not-found",
    );

    assert.equal(
      database.reservationCalls().length,
      0,
    );
  },
);

test(
  "007K preserves FOOD-007I storage failure and performs no reservation reads",
  async () => {
    const database =
      new Database();

    database.latestSkuAMode =
      "malformed";

    const result =
      await resolveFoodReservationSelectionRecordedHeldCommitments(
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
      database.reservationCalls().length,
      0,
    );
  },
);

test(
  "007K preserves FOOD-007I invalid and performs zero database reads",
  async () => {
    const database =
      new Database();

    const result =
      await resolveFoodReservationSelectionRecordedHeldCommitments(
        database as never,
        {
          kind:
            "not-a-resolution",
        } as never,
      );

    assert.deepEqual(
      result,
      {
        outcome:
          "invalid",
      },
    );

    assert.equal(
      database.calls.length,
      0,
    );
  },
);

test(
  "007K fails closed on first SKU recorded-held read failure",
  async () => {
    const database =
      new Database();

    database.aggregateFailure =
      "sku-a";

    const result =
      await resolveFoodReservationSelectionRecordedHeldCommitments(
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
      database.reservationCalls().length,
      1,
    );

    assert.match(
      database.reservationCalls()[0]!.sql,
      /food_capacity_reservation_lines/,
    );
  },
);

test(
  "007K fails closed on second SKU recorded-held read failure without slot commitment read",
  async () => {
    const database =
      new Database();

    database.aggregateFailure =
      "sku-b";

    const result =
      await resolveFoodReservationSelectionRecordedHeldCommitments(
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
      database.reservationCalls().length,
      2,
    );

    assert.equal(
      database.reservationCalls().some(
        (call) =>
          /food_fulfillment_slot_reservations/i.test(
            call.sql,
          ),
      ),
      false,
    );
  },
);

test(
  "007K fails closed when exact slot recorded-held read fails",
  async () => {
    const database =
      new Database();

    database.aggregateFailure =
      "slot";

    const result =
      await resolveFoodReservationSelectionRecordedHeldCommitments(
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
      database.reservationCalls().length,
      3,
    );
  },
);

test(
  "007K detached success does not change when caller resolution is later mutated",
  async () => {
    const database =
      new Database();

    const input =
      resolution();

    const result =
      await resolveFoodReservationSelectionRecordedHeldCommitments(
        database as never,
        input as never,
      );

    const value =
      success(
        result,
      );

    input.selection.skuSelections[0]!.sku.id =
      "food-sku:mutated";

    input.selection.skuSelections[0]!.revision =
      99;

    input.selection.slotSelection.locationReference =
      "mutated:location";

    assert.equal(
      value.skuCommitments[0]!.sku.id,
      SKU_A,
    );

    assert.equal(
      value.skuCommitments[0]!.capacityRevision,
      2,
    );

    assert.equal(
      value.slotCommitment.locationReference,
      LOCATION,
    );
  },
);

test(
  "007K resolved surface carries evidence only and no remaining reservable ATP active governing or acceptance authority",
  async () => {
    const database =
      new Database();

    const value =
      success(
        await resolveFoodReservationSelectionRecordedHeldCommitments(
          database as never,
          resolution() as never,
        ),
      );

    const serialized =
      JSON.stringify(
        value,
      ).toLowerCase();

    for (
      const forbidden of
        [
          '"remaining"',
          '"reservable"',
          '"atp"',
          '"active"',
          '"governing"',
          '"eligible"',
          '"accepted"',
          '"acceptance"',
          '"available"',
          '"orderable"',
          '"checkoutready"',
          '"paymentready"',
          '"quantityonhand"',
          '"capacityunits"',
        ]
    ) {
      assert.equal(
        serialized.includes(
          forbidden,
        ),
        false,
        forbidden,
      );
    }
  },
);

test(
  "007K source composes canonical 007I and 007J without direct SQL writes arithmetic or acceptance construction",
  () => {
    const source =
      readFileSync(
        new URL(
          "./reservation-selection-recorded-held-commitment-resolution.ts",
          import.meta.url,
        ),
        "utf8",
      );

    assert.match(
      source,
      /validateFoodReservationCapacitySourceLatestRecordedSelection/,
    );

    assert.match(
      source,
      /readFoodExactRevisionRecordedHeldCapacityCommitment/,
    );

    assert.doesNotMatch(
      source,
      /\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bUPSERT\b/i,
    );

    assert.doesNotMatch(
      source,
      /capacityUnits\s*[-+]|recordedHeldQuantity\s*[-+]|remainingCapacity|reservableQuantity|availableToPromise/i,
    );

    assert.doesNotMatch(
      source,
      /createFoodReservationAcceptance|createInitialFoodReservationAcceptance|Date\.now|new Date|process\.env|fetch\s*\(|Math\.random|randomUUID/,
    );
  },
);