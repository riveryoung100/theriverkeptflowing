import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  readFoodDurableReservationAcceptanceEvidenceByExactAcceptance,
  type FoodExactDurableReservationAcceptanceEvidenceReadD1Database,
} from "./d1-exact-durable-reservation-acceptance-evidence-read";

const ACCEPTANCE_ID =
  "food-reservation-acceptance:007z";

const RESERVATION_ID =
  "reservation:007z";

const ORDER_ID =
  "food-physical-order:007z";

const REQUEST_ID =
  "food-reservation-request:007z";

const INTENT_ID =
  "food-fulfillment-intent:007z";

const SKU_ID =
  "food-sku:007z";

type Mode =
  | "normal"
  | "acceptance-missing"
  | "acceptance-duplicate"
  | "parent-missing"
  | "lines-missing"
  | "slot-missing"
  | "slot-duplicate"
  | "binding-missing"
  | "binding-duplicate"
  | "database-failure";

type Call =
  Readonly<{
    sql: string;
    bound: readonly unknown[];
  }>;

function capacityRequirements() {
  return [
    {
      sku: {
        id:
          SKU_ID,
        version:
          3,
      },
      quantity:
        2,
    },
  ];
}

function acceptanceRow() {
  return {
    reservation_id:
      RESERVATION_ID,
    acceptance_id:
      ACCEPTANCE_ID,
    acceptance_version:
      1,
    attribution:
      "food-007z-test",
    source_reference:
      "source:test",
    accepted_on:
      "2026-10-20",
  };
}

function parentRow() {
  return {
    reservation_id:
      RESERVATION_ID,
    order_id:
      ORDER_ID,
    order_version:
      4,
    reservation_request_id:
      REQUEST_ID,
    reservation_request_version:
      2,
    canonical_demand_json:
      JSON.stringify(
        capacityRequirements(),
      ),
    state:
      "held",
  };
}

function lineRow() {
  return {
    reservation_id:
      RESERVATION_ID,
    line_index:
      0,
    sku_id:
      SKU_ID,
    sku_version:
      3,
    capacity_revision:
      11,
    quantity:
      2,
  };
}

function slotRow() {
  return {
    reservation_id:
      RESERVATION_ID,
    method:
      "personal-delivery",
    location_reference:
      "location:test",
    window_reference:
      "window:test",
    capacity_revision:
      7,
    quantity:
      1,
  };
}

function bindingRow() {
  return {
    reservation_id:
      RESERVATION_ID,
    fulfillment_intent_id:
      INTENT_ID,
    fulfillment_intent_version:
      5,
  };
}

class Database
implements
  FoodExactDurableReservationAcceptanceEvidenceReadD1Database {
  readonly calls:
    Call[] =
      [];

  mode:
    Mode =
      "normal";

  acceptance:
    unknown =
      acceptanceRow();

  parent:
    unknown =
      parentRow();

  lines:
    unknown[] =
      [
        lineRow(),
      ];

  slot:
    unknown =
      slotRow();

  binding:
    unknown =
      bindingRow();

  prepare(
    sql: string,
  ) {
    return {
      bind:
        (
          ...bound: unknown[]
        ) => ({
          all:
            async <T>() => {
              this.calls.push(
                Object.freeze({
                  sql,
                  bound:
                    Object.freeze(
                      [
                        ...bound,
                      ],
                    ),
                }),
              );

              if (
                this.mode ===
                "database-failure"
              ) {
                throw new Error(
                  "database failure",
                );
              }

              let rows:
                unknown[];

              if (
                sql.includes(
                  "FROM food_reservation_acceptance_evidence",
                )
              ) {
                if (
                  this.mode ===
                  "acceptance-missing"
                ) {
                  rows =
                    [];
                }
                else if (
                  this.mode ===
                  "acceptance-duplicate"
                ) {
                  rows =
                    [
                      this.acceptance,
                      this.acceptance,
                    ];
                }
                else {
                  rows =
                    [
                      this.acceptance,
                    ];
                }
              }
              else if (
                sql.includes(
                  "FROM food_capacity_reservations",
                )
              ) {
                rows =
                  this.mode ===
                  "parent-missing"
                    ? []
                    : [
                        this.parent,
                      ];
              }
              else if (
                sql.includes(
                  "FROM food_capacity_reservation_lines",
                )
              ) {
                rows =
                  this.mode ===
                  "lines-missing"
                    ? []
                    : this.lines;
              }
              else if (
                sql.includes(
                  "FROM food_fulfillment_slot_reservations",
                )
              ) {
                if (
                  this.mode ===
                  "slot-missing"
                ) {
                  rows =
                    [];
                }
                else if (
                  this.mode ===
                  "slot-duplicate"
                ) {
                  rows =
                    [
                      this.slot,
                      this.slot,
                    ];
                }
                else {
                  rows =
                    [
                      this.slot,
                    ];
                }
              }
              else if (
                sql.includes(
                  "FROM food_capacity_reservation_fulfillment_intents",
                )
              ) {
                if (
                  this.mode ===
                  "binding-missing"
                ) {
                  rows =
                    [];
                }
                else if (
                  this.mode ===
                  "binding-duplicate"
                ) {
                  rows =
                    [
                      this.binding,
                      this.binding,
                    ];
                }
                else {
                  rows =
                    [
                      this.binding,
                    ];
                }
              }
              else {
                throw new Error(
                  `Unexpected SQL: ${sql}`,
                );
              }

              return {
                success:
                  true,
                results:
                  rows as T[],
              };
            },
        }),
    };
  }
}

test(
  "007Z reads and reconstructs exact durable acceptance evidence",
  async () => {
    const database =
      new Database();

    const result =
      await readFoodDurableReservationAcceptanceEvidenceByExactAcceptance(
        database,
        ACCEPTANCE_ID,
        1,
      );

    assert.equal(
      result.outcome,
      "found",
    );

    if (
      result.outcome !==
      "found"
    ) {
      return;
    }

    assert.equal(
      result.value.kind,
      "durable-reservation-acceptance-evidence",
    );

    assert.equal(
      result.value.reservationId,
      RESERVATION_ID,
    );

    assert.deepEqual(
      result.value.acceptance,
      {
        id:
          ACCEPTANCE_ID,
        version:
          1,
        order: {
          id:
            ORDER_ID,
          version:
            4,
        },
        reservationRequest: {
          id:
            REQUEST_ID,
          version:
            2,
        },
        fulfillmentIntent: {
          id:
            INTENT_ID,
          version:
            5,
          method:
            "personal-delivery",
          locationReference:
            "location:test",
          windowReference:
            "window:test",
        },
        capacityRequirements:
          capacityRequirements(),
        acceptance: {
          attribution:
            "food-007z-test",
          sourceReference:
            "source:test",
          acceptedOn:
            "2026-10-20",
        },
      },
    );

    assert.equal(
      database.calls.length,
      5,
    );

    assert.deepEqual(
      database.calls[0]!.bound,
      [
        ACCEPTANCE_ID,
        1,
      ],
    );

    assert.deepEqual(
      database.calls
        .slice(
          1,
        )
        .map(
          (
            call,
          ) =>
            call.bound,
        ),
      [
        [
          RESERVATION_ID,
        ],
        [
          RESERVATION_ID,
        ],
        [
          RESERVATION_ID,
        ],
        [
          RESERVATION_ID,
        ],
      ],
    );

    assert.equal(
      Object.isFrozen(
        result,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        result.value,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        result.value.acceptance,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        result.value.acceptance.capacityRequirements,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        result.value.acceptance.capacityRequirements[0],
      ),
      true,
    );
  },
);

test(
  "007Z returns not-found from exact acceptance identity/version only",
  async () => {
    const database =
      new Database();

    database.mode =
      "acceptance-missing";

    const result =
      await readFoodDurableReservationAcceptanceEvidenceByExactAcceptance(
        database,
        ACCEPTANCE_ID,
        2,
      );

    assert.deepEqual(
      result,
      {
        outcome:
          "not-found",
      },
    );

    assert.equal(
      database.calls.length,
      1,
    );

    assert.deepEqual(
      database.calls[0]!.bound,
      [
        ACCEPTANCE_ID,
        2,
      ],
    );

    assert.doesNotMatch(
      database.calls[0]!.sql,
      /ORDER\s+BY|MAX\s*\(|latest|current/i,
    );
  },
);

test(
  "007Z rejects malformed acceptance identity before database access",
  async () => {
    const database =
      new Database();

    const result =
      await readFoodDurableReservationAcceptanceEvidenceByExactAcceptance(
        database,
        "wrong-prefix:007z",
        1,
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
  "007Z rejects malformed acceptance version before database access",
  async () => {
    for (
      const version of
      [
        0,
        -1,
        1.5,
        Number.NaN,
        Number.POSITIVE_INFINITY,
        Number.MAX_SAFE_INTEGER + 1,
        "1",
        null,
      ]
    ) {
      const database =
        new Database();

      const result =
        await readFoodDurableReservationAcceptanceEvidenceByExactAcceptance(
          database,
          ACCEPTANCE_ID,
          version,
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
    }
  },
);

test(
  "007Z rejects hostile non-string identity without invoking coercion hooks",
  async () => {
    const database =
      new Database();

    let calls =
      0;

    const hostile =
      Object.create(
        null,
      ) as {
        toString?: () => string;
      };

    Object.defineProperty(
      hostile,
      "toString",
      {
        enumerable:
          true,
        get() {
          calls +=
            1;

          return () =>
            ACCEPTANCE_ID;
        },
      },
    );

    const result =
      await readFoodDurableReservationAcceptanceEvidenceByExactAcceptance(
        database,
        hostile,
        1,
      );

    assert.deepEqual(
      result,
      {
        outcome:
          "invalid",
      },
    );

    assert.equal(
      calls,
      0,
    );

    assert.equal(
      database.calls.length,
      0,
    );
  },
);

test(
  "007Z duplicate exact acceptance rows are storage-failure",
  async () => {
    const database =
      new Database();

    database.mode =
      "acceptance-duplicate";

    const result =
      await readFoodDurableReservationAcceptanceEvidenceByExactAcceptance(
        database,
        ACCEPTANCE_ID,
        1,
      );

    assert.deepEqual(
      result,
      {
        outcome:
          "storage-failure",
      },
    );
  },
);

test(
  "007Z acceptance without authoritative reservation parent is storage-failure",
  async () => {
    const database =
      new Database();

    database.mode =
      "parent-missing";

    const result =
      await readFoodDurableReservationAcceptanceEvidenceByExactAcceptance(
        database,
        ACCEPTANCE_ID,
        1,
      );

    assert.deepEqual(
      result,
      {
        outcome:
          "storage-failure",
      },
    );
  },
);

test(
  "007Z missing authoritative reservation lines are storage-failure",
  async () => {
    const database =
      new Database();

    database.mode =
      "lines-missing";

    const result =
      await readFoodDurableReservationAcceptanceEvidenceByExactAcceptance(
        database,
        ACCEPTANCE_ID,
        1,
      );

    assert.deepEqual(
      result,
      {
        outcome:
          "storage-failure",
      },
    );
  },
);

test(
  "007Z rejects malformed persisted line order without sorting or repair",
  async () => {
    const database =
      new Database();

    database.lines =
      [
        {
          ...lineRow(),
          line_index:
            1,
        },
      ];

    const result =
      await readFoodDurableReservationAcceptanceEvidenceByExactAcceptance(
        database,
        ACCEPTANCE_ID,
        1,
      );

    assert.deepEqual(
      result,
      {
        outcome:
          "storage-failure",
      },
    );
  },
);

test(
  "007Z rejects canonical demand that differs from persisted line sequence",
  async () => {
    const database =
      new Database();

    database.parent =
      {
        ...parentRow(),
        canonical_demand_json:
          JSON.stringify([
            {
              sku: {
                id:
                  SKU_ID,
                version:
                  3,
              },
              quantity:
                3,
            },
          ]),
      };

    const result =
      await readFoodDurableReservationAcceptanceEvidenceByExactAcceptance(
        database,
        ACCEPTANCE_ID,
        1,
      );

    assert.deepEqual(
      result,
      {
        outcome:
          "storage-failure",
      },
    );
  },
);

test(
  "007Z requires exactly one durable slot row",
  async () => {
    for (
      const mode of
      [
        "slot-missing",
        "slot-duplicate",
      ] as const
    ) {
      const database =
        new Database();

      database.mode =
        mode;

      const result =
        await readFoodDurableReservationAcceptanceEvidenceByExactAcceptance(
          database,
          ACCEPTANCE_ID,
          1,
        );

      assert.deepEqual(
        result,
        {
          outcome:
            "storage-failure",
        },
      );
    }
  },
);

test(
  "007Z requires exactly one durable fulfillment-intent binding",
  async () => {
    for (
      const mode of
      [
        "binding-missing",
        "binding-duplicate",
      ] as const
    ) {
      const database =
        new Database();

      database.mode =
        mode;

      const result =
        await readFoodDurableReservationAcceptanceEvidenceByExactAcceptance(
          database,
          ACCEPTANCE_ID,
          1,
        );

      assert.deepEqual(
        result,
        {
          outcome:
            "storage-failure",
        },
      );
    }
  },
);

test(
  "007Z rejects malformed durable acceptance metadata",
  async () => {
    const database =
      new Database();

    database.acceptance =
      {
        ...acceptanceRow(),
        accepted_on:
          "not-a-date",
      };

    const result =
      await readFoodDurableReservationAcceptanceEvidenceByExactAcceptance(
        database,
        ACCEPTANCE_ID,
        1,
      );

    assert.deepEqual(
      result,
      {
        outcome:
          "storage-failure",
      },
    );
  },
);

test(
  "007Z converts D1 read failures into storage-failure",
  async () => {
    const database =
      new Database();

    database.mode =
      "database-failure";

    const result =
      await readFoodDurableReservationAcceptanceEvidenceByExactAcceptance(
        database,
        ACCEPTANCE_ID,
        1,
      );

    assert.deepEqual(
      result,
      {
        outcome:
          "storage-failure",
      },
    );
  },
);

test(
  "007Z SQL is exact and read-only and source grants no mutation path",
  async () => {
    const database =
      new Database();

    const result =
      await readFoodDurableReservationAcceptanceEvidenceByExactAcceptance(
        database,
        ACCEPTANCE_ID,
        1,
      );

    assert.equal(
      result.outcome,
      "found",
    );

    const sql =
      database.calls
        .map(
          (
            call,
          ) =>
            call.sql,
        )
        .join(
          "\n",
        );

    assert.match(
      sql,
      /food_reservation_acceptance_evidence/,
    );

    assert.match(
      sql,
      /acceptance_id\s*=\s*\?/,
    );

    assert.match(
      sql,
      /acceptance_version\s*=\s*\?/,
    );

    assert.match(
      sql,
      /ORDER BY line_index ASC/,
    );

    assert.doesNotMatch(
      sql,
      /\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bUPSERT\b/i,
    );

    const source =
      readFileSync(
        new URL(
          "./d1-exact-durable-reservation-acceptance-evidence-read.ts",
          import.meta.url,
        ),
        "utf8",
      );

    assert.doesNotMatch(
      source,
      /database\.batch|Date\.now|new Date|randomUUID|Math\.random|fetch\s*\(|Stripe|Square|PayPal|wrangler/i,
    );

    assert.doesNotMatch(
      source,
      /persistFoodDurableReservationAcceptanceEvidence\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /executeFoodAuthoritativeCapacityReservationMutation\s*\(/,
    );
  },
);
