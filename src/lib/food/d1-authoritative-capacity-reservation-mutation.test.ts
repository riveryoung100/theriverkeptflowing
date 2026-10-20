import assert from "node:assert/strict";
import test from "node:test";
import {
  readFileSync,
} from "node:fs";

import {
  type FoodD1Database,
  type FoodD1Result,
  type FoodD1Statement,
} from "./d1-draft-persistence";
import {
  deriveFoodReservationHoldCommand,
  type FoodReservationHoldCommand,
} from "./reservation-hold-command";
import {
  createInitialFoodCartVersion,
  createInitialFoodMerchandiseQuoteVersion,
} from "./cart-quote-domain";
import {
  createInitialFoodFulfillmentIntentVersion,
  createInitialFoodReservationRequestVersion,
} from "./fulfillment-capacity-reservation-domain";
import {
  createInitialFoodPhysicalOrderVersion,
} from "./physical-order-domain";
import {
  executeFoodAuthoritativeCapacityReservationMutation,
  FOOD_AUTHORITATIVE_CAPACITY_RESERVATION_MUTATION_RECEIPT_KIND,
} from "./d1-authoritative-capacity-reservation-mutation";

type Primitive =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined;

type Mutable<T> =
  T extends Primitive
    ? T
    : T extends readonly (infer Item)[]
      ? Mutable<Item>[]
      : T extends object
        ? {
            -readonly [
              K in keyof T
            ]:
              Mutable<T[K]>;
          }
        : T;

type CapturedStatement =
  Readonly<{
    sql: string;
    values:
      readonly (
        | string
        | number
        | null
      )[];
  }>;

function mutableClone<T>(
  input: T,
): Mutable<T> {
  return structuredClone(
    input,
  ) as Mutable<T>;
}

function result(
  rows:
    readonly unknown[] = [],
  changes = 0,
): FoodD1Result {
  return {
    success: true,
    results: rows,
    meta: {
      changes,
    },
  };
}

function failureResult():
  FoodD1Result {
  return {
    success: false,
    results: [],
    meta: {
      changes: 0,
    },
  };
}

class ScriptedDatabase
implements FoodD1Database {
  readonly reads:
    (
      | FoodD1Result
      | Error
    )[] =
      [];

  readonly readCalls:
    CapturedStatement[] =
      [];

  readonly batches:
    CapturedStatement[][] =
      [];

  batchResponse:
    readonly FoodD1Result[] =
      [];

  batchError:
    Error |
    undefined;

  prepare(
    sql: string,
  ): FoodD1Statement {
    let values:
      (
        | string
        | number
        | null
      )[] =
        [];

    const readCalls =
      this.readCalls;

    const reads =
      this.reads;

    const statement:
      FoodD1Statement & {
        capture():
          CapturedStatement;
      } =
      {
        bind(
          ...input
        ) {
          values =
            [...input];

          return statement;
        },

        async all() {
          readCalls.push({
            sql,
            values:
              [...values],
          });

          const next =
            reads.shift();

          if (
            next instanceof
            Error
          ) {
            throw next;
          }

          if (
            next ===
            undefined
          ) {
            throw new Error(
              "Missing scripted read response",
            );
          }

          return next;
        },

        capture() {
          return {
            sql,
            values:
              [...values],
          };
        },
      };

    return statement;
  }

  async batch(
    statements:
      FoodD1Statement[],
  ): Promise<
    readonly FoodD1Result[]
  > {
    this.batches.push(
      statements.map(
        (statement) =>
          (
            statement as
              FoodD1Statement & {
                capture():
                  CapturedStatement;
              }
          ).capture(),
      ),
    );

    if (
      this.batchError
    ) {
      throw this.batchError;
    }

    return this.batchResponse;
  }
}

function commandFixture(
  skuCount = 2,
): FoodReservationHoldCommand {
  const skus =
    Array.from(
      {
        length:
          skuCount,
      },
      (
        _,
        index,
      ) => ({
        id:
          `food-sku:007v-${index + 1}`,
        version: 1,
        servingOffer: {
          offerId:
            `food-serving-offer:007v-${index + 1}`,
          version: 1,
        },
        package: {
          id:
            `food-package-definition:007v-${index + 1}`,
          version: 1,
        },
      }),
    );

  const cart =
    createInitialFoodCartVersion({
      id:
        "food-cart:007v",
      version: 1,
      lines:
        skus.map(
          (
            sku,
            index,
          ) => ({
            sku: {
              id:
                sku.id,
              version:
                sku.version,
            },
            quantity:
              index + 2,
          }),
        ),
    });

  const prices =
    skus.map(
      (
        sku,
        index,
      ) => ({
        id:
          `food-approved-commercial-price:007v-${index + 1}`,
        version: 1,
        sku: {
          id:
            sku.id,
          version:
            sku.version,
        },
        money: {
          currency: "USD",
          minorUnits:
            100 + index,
        },
        approval: {
          attribution:
            "synthetic:007v-owner",
          sourceReference:
            `synthetic:007v-price-${index + 1}`,
          approvedOn:
            "2026-10-20",
        },
      }),
    );

  const quote =
    createInitialFoodMerchandiseQuoteVersion(
      {
        id:
          "food-merchandise-quote:007v",
        version: 1,
      },
      cart,
      skus,
      prices,
    );

  const fulfillmentIntent =
    createInitialFoodFulfillmentIntentVersion(
      {
        id:
          "food-fulfillment-intent:007v",
        version: 1,
      },
      quote,
      {
        method:
          "personal-delivery",
        locationReference:
          "synthetic:007v-location",
        windowReference:
          "synthetic:007v-window",
      },
    );

  const request =
    createInitialFoodReservationRequestVersion(
      {
        id:
          "food-reservation-request:007v",
        version: 1,
      },
      quote,
      fulfillmentIntent,
    );

  const order =
    createInitialFoodPhysicalOrderVersion(
      {
        id:
          "food-physical-order:007v",
        version: 1,
      },
      quote,
      fulfillmentIntent,
      request,
    );

  const result =
    deriveFoodReservationHoldCommand({
      reservationId:
        "reservation:food-007v",
      order,
      quote,
      request,
      fulfillmentIntent,
      skuSelections:
        request.capacityRequirements.map(
          (
            line,
            index,
          ) => ({
            sku: {
              id:
                line.sku.id,
              version:
                line.sku.version,
            },
            revision:
              index + 7,
          }),
        ),
      slotSelection: {
        method:
          fulfillmentIntent.method,
        locationReference:
          fulfillmentIntent.locationReference,
        windowReference:
          fulfillmentIntent.windowReference,
        revision: 19,
      },
    });

  assert.equal(
    result.outcome,
    "candidate",
  );

  if (
    result.outcome !==
    "candidate"
  ) {
    throw new Error(
      "Expected canonical FOOD-007N candidate",
    );
  }

  return result.value;
}
function demandJson(
  command:
    FoodReservationHoldCommand,
): string {
  return JSON.stringify(
    command.selection
      .request
      .capacityRequirements
      .map(
        (line) => ({
          sku: {
            id:
              line.sku.id,
            version:
              line.sku.version,
          },
          quantity:
            line.quantity,
        }),
      ),
  );
}

function parentRow(
  command:
    FoodReservationHoldCommand,
) {
  return {
    reservation_id:
      command.reservationId,
    order_id:
      command.order.id,
    order_version:
      command.order.version,
    reservation_request_id:
      command.selection.request.id,
    reservation_request_version:
      command.selection.request.version,
    canonical_demand_json:
      demandJson(
        command,
      ),
    state:
      "held",
  };
}

function lineRows(
  command:
    FoodReservationHoldCommand,
) {
  return command.selection
    .request
    .capacityRequirements
    .map(
      (
        demand,
        index,
      ) => ({
        reservation_id:
          command.reservationId,
        line_index:
          index,
        sku_id:
          demand.sku.id,
        sku_version:
          demand.sku.version,
        capacity_revision:
          command.selection
            .skuSelections[
              index
            ]!.revision,
        quantity:
          demand.quantity,
      }),
    );
}

function slotRow(
  command:
    FoodReservationHoldCommand,
) {
  return {
    reservation_id:
      command.reservationId,
    method:
      command.selection
        .slotSelection.method,
    location_reference:
      command.selection
        .slotSelection
        .locationReference,
    window_reference:
      command.selection
        .slotSelection
        .windowReference,
    capacity_revision:
      command.selection
        .slotSelection.revision,
    quantity: 1,
  };
}

function queueFreshState(
  db:
    ScriptedDatabase,
  command:
    FoodReservationHoldCommand,
  options:
    Readonly<{
      skuCapacity?: number;
      skuHeld?: number;
      slotCapacity?: number;
      slotHeld?: number;
      changedSkuIndex?: number;
      changedSlot?: boolean;
    }> =
      {},
): void {
  db.reads.push(
    result([]),
  );

  const skuCapacity =
    options.skuCapacity ??
    20;

  const skuHeld =
    options.skuHeld ??
    0;

  for (
    let index = 0;
    index <
    command.selection
      .request
      .capacityRequirements
      .length;
    index += 1
  ) {
    const selected =
      command.selection
        .skuSelections[
          index
        ]!;

    db.reads.push(
      result([
        {
          revision:
            options.changedSkuIndex ===
              index
              ? selected.revision + 1
              : selected.revision,
          capacity_units:
            skuCapacity,
        },
      ]),
    );

    if (
      options.changedSkuIndex ===
      index
    ) {
      return;
    }

    db.reads.push(
      result([
        {
          recorded_held_quantity:
            skuHeld,
        },
      ]),
    );
  }

  db.reads.push(
    result([
      {
        revision:
          options.changedSlot
            ? command.selection
                .slotSelection
                .revision + 1
            : command.selection
                .slotSelection
                .revision,
        capacity_units:
          options.slotCapacity ??
          20,
      },
    ]),
  );

  if (
    options.changedSlot
  ) {
    return;
  }

  db.reads.push(
    result([
      {
        recorded_held_quantity:
          options.slotHeld ??
          0,
      },
    ]),
  );
}

function successfulBatch(
  command:
    FoodReservationHoldCommand,
): readonly FoodD1Result[] {
  return [
    result(
      [
        parentRow(
          command,
        ),
      ],
      1,
    ),
    ...lineRows(
      command,
    ).map(
      (row) =>
        result(
          [row],
          1,
        ),
    ),
    result(
      [
        slotRow(
          command,
        ),
      ],
      1,
    ),
  ];
}

function queueExactReplay(
  db:
    ScriptedDatabase,
  command:
    FoodReservationHoldCommand,
): void {
  db.reads.push(
    result([
      parentRow(
        command,
      ),
    ]),
  );

  db.reads.push(
    result(
      lineRows(
        command,
      ),
    ),
  );

  db.reads.push(
    result([
      slotRow(
        command,
      ),
    ]),
  );
}

function frozen(
  input: unknown,
): void {
  if (
    input !== null &&
    typeof input === "object"
  ) {
    assert.ok(
      Object.isFrozen(
        input,
      ),
    );

    for (
      const value of
      Object.values(
        input,
      )
    ) {
      frozen(
        value,
      );
    }
  }
}

test(
  "007V fresh admissible state creates one atomic parent/SKU/slot batch",
  async () => {
    const command =
      commandFixture(2);

    const db =
      new ScriptedDatabase();

    queueFreshState(
      db,
      command,
    );

    db.batchResponse =
      successfulBatch(
        command,
      );

    const resultValue =
      await executeFoodAuthoritativeCapacityReservationMutation(
        db,
        command,
      );

    assert.equal(
      resultValue.outcome,
      "created",
    );

    if (
      resultValue.outcome !==
      "created"
    ) {
      throw new Error(
        "Expected created",
      );
    }

    assert.equal(
      resultValue.value.kind,
      FOOD_AUTHORITATIVE_CAPACITY_RESERVATION_MUTATION_RECEIPT_KIND,
    );

    assert.equal(
      db.batches.length,
      1,
    );

    assert.equal(
      db.batches[0]!.length,
      4,
    );

    const parent =
      db.batches[0]![0]!;

    assert.match(
      parent.sql,
      /INSERT INTO food_capacity_reservations/,
    );

    assert.match(
      parent.sql,
      /CASE[\s\S]*WHEN[\s\S]*THEN 'held'[\s\S]*ELSE 'food-007v-guard-failed'/,
    );

    assert.match(
      parent.sql,
      /MAX\(latest\.revision\)/,
    );

    assert.match(
      parent.sql,
      /SUM\(line\.quantity\)/,
    );

    assert.match(
      parent.sql,
      /SUM\(slot\.quantity\)/,
    );

    assert.match(
      parent.sql,
      /RETURNING/,
    );

    assert.equal(
      db.batches[0]!
        .filter(
          (statement) =>
            /^\s*INSERT INTO food_capacity_reservation_lines\b/.test(
              statement.sql,
            ),
        )
        .length,
      2,
    );

    assert.match(
      db.batches[0]![3]!.sql,
      /food_fulfillment_slot_reservations/,
    );

    frozen(
      resultValue,
    );
  },
);

test(
  "007V exact zero remaining SKU and slot capacity is admissible",
  async () => {
    const command =
      commandFixture(1);

    const demand =
      command.selection
        .request
        .capacityRequirements[0]!
        .quantity;

    const db =
      new ScriptedDatabase();

    queueFreshState(
      db,
      command,
      {
        skuCapacity:
          demand + 5,
        skuHeld: 5,
        slotCapacity: 4,
        slotHeld: 3,
      },
    );

    db.batchResponse =
      successfulBatch(
        command,
      );

    assert.equal(
      (
        await executeFoodAuthoritativeCapacityReservationMutation(
          db,
          command,
        )
      ).outcome,
      "created",
    );
  },
);

test(
  "007V negative SKU capacity fails before mutation",
  async () => {
    const command =
      commandFixture(1);

    const demand =
      command.selection
        .request
        .capacityRequirements[0]!
        .quantity;

    const db =
      new ScriptedDatabase();

    queueFreshState(
      db,
      command,
      {
        skuCapacity:
          demand + 4,
        skuHeld: 5,
      },
    );

    const outcome =
      await executeFoodAuthoritativeCapacityReservationMutation(
        db,
        command,
      );

    assert.equal(
      outcome.outcome,
      "insufficient-capacity",
    );

    assert.equal(
      db.batches.length,
      0,
    );
  },
);

test(
  "007V negative slot capacity fails before mutation",
  async () => {
    const command =
      commandFixture(1);

    const db =
      new ScriptedDatabase();

    queueFreshState(
      db,
      command,
      {
        slotCapacity: 3,
        slotHeld: 3,
      },
    );

    assert.equal(
      (
        await executeFoodAuthoritativeCapacityReservationMutation(
          db,
          command,
        )
      ).outcome,
      "insufficient-capacity",
    );

    assert.equal(
      db.batches.length,
      0,
    );
  },
);

test(
  "007V newer SKU source revision yields governing-source-mismatch",
  async () => {
    const command =
      commandFixture(2);

    const db =
      new ScriptedDatabase();

    queueFreshState(
      db,
      command,
      {
        changedSkuIndex: 1,
      },
    );

    assert.equal(
      (
        await executeFoodAuthoritativeCapacityReservationMutation(
          db,
          command,
        )
      ).outcome,
      "governing-source-mismatch",
    );

    assert.equal(
      db.batches.length,
      0,
    );
  },
);

test(
  "007V newer slot source revision yields governing-source-mismatch",
  async () => {
    const command =
      commandFixture(1);

    const db =
      new ScriptedDatabase();

    queueFreshState(
      db,
      command,
      {
        changedSlot: true,
      },
    );

    assert.equal(
      (
        await executeFoodAuthoritativeCapacityReservationMutation(
          db,
          command,
        )
      ).outcome,
      "governing-source-mismatch",
    );
  },
);

test(
  "007V exact durable replay returns already-present and performs no mutation",
  async () => {
    const command =
      commandFixture(2);

    const db =
      new ScriptedDatabase();

    queueExactReplay(
      db,
      command,
    );

    const replay =
      await executeFoodAuthoritativeCapacityReservationMutation(
        db,
        command,
      );

    assert.equal(
      replay.outcome,
      "already-present",
    );

    assert.equal(
      db.batches.length,
      0,
    );

    assert.equal(
      db.readCalls.length,
      3,
    );

    frozen(
      replay,
    );
  },
);

test(
  "007V exact replay does not reevaluate newer source or later capacity state",
  async () => {
    const command =
      commandFixture(1);

    const db =
      new ScriptedDatabase();

    queueExactReplay(
      db,
      command,
    );

    const replay =
      await executeFoodAuthoritativeCapacityReservationMutation(
        db,
        command,
      );

    assert.equal(
      replay.outcome,
      "already-present",
    );

    assert.equal(
      db.readCalls.some(
        (call) =>
          /food_sku_capacity_sources/.test(
            call.sql,
          ),
      ),
      false,
    );

    assert.equal(
      db.readCalls.some(
        (call) =>
          /recorded_held_quantity/.test(
            call.sql,
          ),
      ),
      false,
    );
  },
);

test(
  "007V divergent reservation parent returns conflict",
  async () => {
    const command =
      commandFixture();

    const db =
      new ScriptedDatabase();

    db.reads.push(
      result([
        {
          ...parentRow(
            command,
          ),
          order_version: 2,
        },
      ]),
    );

    assert.equal(
      (
        await executeFoodAuthoritativeCapacityReservationMutation(
          db,
          command,
        )
      ).outcome,
      "conflict",
    );
  },
);

test(
  "007V missing SKU child under matching durable parent fails closed",
  async () => {
    const command =
      commandFixture(2);

    const db =
      new ScriptedDatabase();

    db.reads.push(
      result([
        parentRow(
          command,
        ),
      ]),
    );

    db.reads.push(
      result(
        lineRows(
          command,
        ).slice(
          0,
          1,
        ),
      ),
    );

    assert.equal(
      (
        await executeFoodAuthoritativeCapacityReservationMutation(
          db,
          command,
        )
      ).outcome,
      "storage-failure",
    );
  },
);

test(
  "007V divergent SKU child returns conflict",
  async () => {
    const command =
      commandFixture(1);

    const lines =
      lineRows(
        command,
      );

    const db =
      new ScriptedDatabase();

    db.reads.push(
      result([
        parentRow(
          command,
        ),
      ]),
    );

    db.reads.push(
      result([
        {
          ...lines[0]!,
          quantity:
            lines[0]!.quantity +
            1,
        },
      ]),
    );

    assert.equal(
      (
        await executeFoodAuthoritativeCapacityReservationMutation(
          db,
          command,
        )
      ).outcome,
      "conflict",
    );
  },
);

test(
  "007V missing slot child under otherwise complete durable replay fails closed",
  async () => {
    const command =
      commandFixture(1);

    const db =
      new ScriptedDatabase();

    db.reads.push(
      result([
        parentRow(
          command,
        ),
      ]),
    );

    db.reads.push(
      result(
        lineRows(
          command,
        ),
      ),
    );

    db.reads.push(
      result([]),
    );

    assert.equal(
      (
        await executeFoodAuthoritativeCapacityReservationMutation(
          db,
          command,
        )
      ).outcome,
      "storage-failure",
    );
  },
);

test(
  "007V divergent slot replay returns conflict",
  async () => {
    const command =
      commandFixture(1);

    const db =
      new ScriptedDatabase();

    db.reads.push(
      result([
        parentRow(
          command,
        ),
      ]),
    );

    db.reads.push(
      result(
        lineRows(
          command,
        ),
      ),
    );

    db.reads.push(
      result([
        {
          ...slotRow(
            command,
          ),
          window_reference:
            "synthetic:different-window",
        },
      ]),
    );

    assert.equal(
      (
        await executeFoodAuthoritativeCapacityReservationMutation(
          db,
          command,
        )
      ).outcome,
      "conflict",
    );
  },
);

test(
  "007V uncertain batch followed by exact durable winner resolves already-present without a second mutation attempt",
  async () => {
    const command =
      commandFixture(1);

    const db =
      new ScriptedDatabase();

    queueFreshState(
      db,
      command,
    );

    queueExactReplay(
      db,
      command,
    );

    db.batchError =
      new Error(
        "synthetic batch uncertainty",
      );

    const outcome =
      await executeFoodAuthoritativeCapacityReservationMutation(
        db,
        command,
      );

    assert.equal(
      outcome.outcome,
      "already-present",
    );

    assert.equal(
      db.batches.length,
      1,
    );
  },
);

test(
  "007V uncertain batch followed by newer source resolves governing-source-mismatch",
  async () => {
    const command =
      commandFixture(1);

    const db =
      new ScriptedDatabase();

    queueFreshState(
      db,
      command,
    );

    db.reads.push(
      result([]),
    );

    queueFreshState(
      db,
      command,
      {
        changedSkuIndex: 0,
      },
    );

    /*
     * queueFreshState includes a replay-parent absence as its first row.
     * Recovery already consumed the explicit parent absence above.
     * Remove that duplicate.
     */
    const duplicate =
      db.reads[
        db.reads.length -
        2
      ];

    void duplicate;

    /*
     * Rebuild the recovery tail explicitly to keep sequencing obvious.
     */
    db.reads.splice(
      db.reads.length - 2,
      2,
    );

    db.reads.push(
      result([
        {
          revision:
            command.selection
              .skuSelections[0]!
              .revision + 1,
          capacity_units: 20,
        },
      ]),
    );

    db.batchError =
      new Error(
        "synthetic race",
      );

    const outcome =
      await executeFoodAuthoritativeCapacityReservationMutation(
        db,
        command,
      );

    assert.equal(
      outcome.outcome,
      "governing-source-mismatch",
    );

    assert.equal(
      db.batches.length,
      1,
    );
  },
);

test(
  "007V uncertain batch followed by clear capacity shortage resolves insufficient-capacity",
  async () => {
    const command =
      commandFixture(1);

    const db =
      new ScriptedDatabase();

    queueFreshState(
      db,
      command,
    );

    db.reads.push(
      result([]),
    );

    const selected =
      command.selection
        .skuSelections[0]!;

    db.reads.push(
      result([
        {
          revision:
            selected.revision,
          capacity_units: 2,
        },
      ]),
    );

    db.reads.push(
      result([
        {
          recorded_held_quantity:
            2,
        },
      ]),
    );

    db.batchError =
      new Error(
        "synthetic race",
      );

    assert.equal(
      (
        await executeFoodAuthoritativeCapacityReservationMutation(
          db,
          command,
        )
      ).outcome,
      "insufficient-capacity",
    );

    assert.equal(
      db.batches.length,
      1,
    );
  },
);

test(
  "007V malformed batch witnesses recover through replay instead of claiming created",
  async () => {
    const command =
      commandFixture(1);

    const db =
      new ScriptedDatabase();

    queueFreshState(
      db,
      command,
    );

    db.batchResponse =
      [
        failureResult(),
      ];

    queueExactReplay(
      db,
      command,
    );

    const resultValue =
      await executeFoodAuthoritativeCapacityReservationMutation(
        db,
        command,
      );

    assert.equal(
      resultValue.outcome,
      "already-present",
    );

    assert.equal(
      db.batches.length,
      1,
    );
  },
);

test(
  "007V invalid commands fail before any database access",
  async () => {
    for (
      const bad of
      [
        null,
        undefined,
        [],
        {},
        true,
        1,
        "command",
      ]
    ) {
      const db =
        new ScriptedDatabase();

      const outcome =
        await Reflect.apply(
          executeFoodAuthoritativeCapacityReservationMutation,
          undefined,
          [
            db,
            bad,
          ],
        );

      assert.equal(
        outcome.outcome,
        "invalid",
      );

      assert.equal(
        db.readCalls.length,
        0,
      );

      assert.equal(
        db.batches.length,
        0,
      );
    }
  },
);

test(
  "007V command accessors are rejected without invocation",
  async () => {
    const command =
      mutableClone(
        commandFixture(),
      );

    let calls = 0;

    Object.defineProperty(
      command,
      "reservationId",
      {
        configurable: true,
        get() {
          calls +=
            1;

          return "reservation:secret";
        },
      },
    );

    const db =
      new ScriptedDatabase();

    const outcome =
      await executeFoodAuthoritativeCapacityReservationMutation(
        db,
        command as FoodReservationHoldCommand,
      );

    assert.equal(
      outcome.outcome,
      "invalid",
    );

    assert.equal(
      calls,
      0,
    );
  },
);

test(
  "007V custom caller array prototype is rejected before inherited iterator access",
  async () => {
    const command =
      mutableClone(
        commandFixture(),
      );

    let getterCalls = 0;

    const prototype =
      Object.create(
        Array.prototype,
      );

    Object.defineProperty(
      prototype,
      Symbol.iterator,
      {
        configurable: true,
        get() {
          getterCalls +=
            1;

          return Array.prototype[
            Symbol.iterator
          ];
        },
      },
    );

    Object.setPrototypeOf(
      command.selection
        .skuSelections,
      prototype,
    );

    const db =
      new ScriptedDatabase();

    const outcome =
      await executeFoodAuthoritativeCapacityReservationMutation(
        db,
        command as FoodReservationHoldCommand,
      );

    assert.equal(
      outcome.outcome,
      "invalid",
    );

    assert.equal(
      getterCalls,
      0,
    );
  },
);

test(
  "007V source keeps acceptance/payment/inventory/migration authority outside this unit",
  () => {
    const source =
      readFileSync(
        new URL(
          "./d1-authoritative-capacity-reservation-mutation.ts",
          import.meta.url,
        ),
        "utf8",
      );

    const spec =
      JSON.parse(
        readFileSync(
          new URL(
            "../../../.river-dev/specifications/food-007v-authoritative-capacity-reservation-mutation.json",
            import.meta.url,
          ),
          "utf8",
        ),
      ) as {
        id: string;
        replayPolicy: {
          exactOutcome:
            string;
          noWriteOnReplay:
            boolean;
        };
        atomicMutation: {
          allOrNothing:
            boolean;
          partialWriteForbidden:
            boolean;
        };
        acceptanceBoundary: {
          createsFood005L:
            boolean;
        };
        migrationBoundary: {
          food007vExecutesMigrations:
            boolean;
          productionAuthority:
            boolean;
        };
      };

    assert.equal(
      spec.id,
      "FOOD-007V",
    );

    assert.equal(
      spec.replayPolicy
        .exactOutcome,
      "already-present",
    );

    assert.equal(
      spec.replayPolicy
        .noWriteOnReplay,
      true,
    );

    assert.equal(
      spec.atomicMutation
        .allOrNothing,
      true,
    );

    assert.equal(
      spec.atomicMutation
        .partialWriteForbidden,
      true,
    );

    assert.equal(
      spec.acceptanceBoundary
        .createsFood005L,
      false,
    );

    assert.equal(
      spec.migrationBoundary
        .food007vExecutesMigrations,
      false,
    );

    assert.equal(
      spec.migrationBoundary
        .productionAuthority,
      false,
    );

    assert.doesNotMatch(
      source,
      /reservation-acceptance-domain|FoodReservationAcceptanceVersion|createInitialFoodReservationAcceptanceVersion/,
    );

    assert.doesNotMatch(
      source,
      /process\.env|globalThis|fetch\(|wrangler|cloudflare:workers/,
    );

    assert.doesNotMatch(
      source,
      /physical-inventory-movement|production-batch-persistence/,
    );

    assert.doesNotMatch(
      source,
      /CREATE TABLE|ALTER TABLE|DROP TABLE/,
    );
  },
);

test(
  "007V guarded parent SQL uses bound values and cannot silently authorize a failed guard",
  async () => {
    const command =
      commandFixture(2);

    const db =
      new ScriptedDatabase();

    queueFreshState(
      db,
      command,
    );

    db.batchResponse =
      successfulBatch(
        command,
      );

    await executeFoodAuthoritativeCapacityReservationMutation(
      db,
      command,
    );

    const parent =
      db.batches[0]![0]!;

    assert.match(
      parent.sql,
      /CASE/,
    );

    assert.match(
      parent.sql,
      /food-007v-guard-failed/,
    );

    assert.match(
      parent.sql,
      /source\.revision = \(\s*SELECT MAX\(latest\.revision\)/,
    );

    assert.match(
      parent.sql,
      /line\.capacity_revision <= source\.revision/,
    );

    assert.match(
      parent.sql,
      /slot\.capacity_revision <= source\.revision/,
    );

    assert.doesNotMatch(
      parent.sql,
      /food-sku:007v-/,
    );

    assert.ok(
      parent.values.includes(
        "food-sku:007v-1",
      ),
    );

    assert.ok(
      parent.values.includes(
        "synthetic:007v-location",
      ),
    );
  },
);

test(
  "007V created receipt is detached from caller mutation",
  async () => {
    const command =
      mutableClone(
        commandFixture(1),
      );

    const db =
      new ScriptedDatabase();

    queueFreshState(
      db,
      command as FoodReservationHoldCommand,
    );

    db.batchResponse =
      successfulBatch(
        command as FoodReservationHoldCommand,
      );

    const outcome =
      await executeFoodAuthoritativeCapacityReservationMutation(
        db,
        command as FoodReservationHoldCommand,
      );

    assert.equal(
      outcome.outcome,
      "created",
    );

    if (
      outcome.outcome !==
      "created"
    ) {
      throw new Error(
        "Expected created",
      );
    }

    const before =
      structuredClone(
        outcome.value,
      );

    command.selection
      .skuSelections[0]!
      .revision =
      999;

    command.selection
      .request
      .capacityRequirements[0]!
      .quantity =
      999;

    command.selection
      .fulfillmentIntent
      .locationReference =
      "changed";

    assert.deepEqual(
      outcome.value,
      before,
    );

    frozen(
      outcome,
    );
  },
);
