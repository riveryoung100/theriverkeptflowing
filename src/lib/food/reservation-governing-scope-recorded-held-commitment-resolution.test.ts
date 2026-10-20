import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";
import { parseFoodSkuId } from "./package-sku-domain";
import { createInitialFoodCartVersion, createInitialFoodMerchandiseQuoteVersion } from "./cart-quote-domain";
import { createInitialFoodFulfillmentIntentVersion, createInitialFoodReservationRequestVersion } from "./fulfillment-capacity-reservation-domain";
import { createInitialFoodPhysicalOrderVersion } from "./physical-order-domain";
import { deriveFoodReservationCapacityCommitmentScope, type FoodReservationCapacityCommitmentScope } from "./reservation-capacity-commitment-scope";

import {
  FOOD_RESERVATION_GOVERNING_SCOPE_RECORDED_HELD_COMMITMENT_RESOLUTION_KIND,
  resolveFoodReservationGoverningScopeRecordedHeldCommitments,
} from "./reservation-governing-scope-recorded-held-commitment-resolution";

const SKU_A =
  "food-sku:a";

const SKU_B =
  "food-sku:b";

const LOCATION =
  "food-location:main";

const WINDOW =
  "food-window:dinner";

type Call =
  Readonly<{
    sql: string;
    bound:
      readonly unknown[];
  }>;

type Failure =
  | "sku-a"
  | "sku-b"
  | "slot"
  | undefined;

class Database {
  readonly calls:
    Call[] =
    [];

  failure:
    Failure;

  prepare(
    sql: string,
  ) {
    return new Statement(
      this,
      sql,
    );
  }

  aggregate(
    sql: string,
    bound:
      readonly unknown[],
  ): number {
    if (
      /food_capacity_reservation_lines/i.test(
        sql,
      )
    ) {
      const skuId =
        bound[0];

      if (
        this.failure ===
          "sku-a" &&
        skuId ===
          SKU_A
      ) {
        return -1;
      }

      if (
        this.failure ===
          "sku-b" &&
        skuId ===
          SKU_B
      ) {
        return -1;
      }

      if (
        skuId ===
        SKU_A
      ) {
        return 7;
      }

      if (
        skuId ===
        SKU_B
      ) {
        return 4;
      }

      return 0;
    }

    if (
      /food_fulfillment_slot_reservations/i.test(
        sql,
      )
    ) {
      if (
        this.failure ===
        "slot"
      ) {
        return -1;
      }

      return 2;
    }

    throw new Error(
      "Unexpected FOOD-007R database query",
    );
  }
}

class Statement {
  constructor(
    private readonly database:
      Database,
    private readonly sql:
      string,
  ) {}

  bind(
    ...bound:
      readonly unknown[]
  ) {
    return new BoundStatement(
      this.database,
      this.sql,
      bound,
    );
  }
}

class BoundStatement {
  constructor(
    private readonly database:
      Database,
    private readonly sql:
      string,
    private readonly bound:
      readonly unknown[],
  ) {}

  async all<T>() {
    this.database.calls.push({
      sql:
        this.sql,
      bound:
        [...this.bound],
    });

    return {
      success: true,
      results: [
        {
          recorded_held_quantity:
            this.database.aggregate(
              this.sql,
              this.bound,
            ),
        },
      ] as T[],
    };
  }
}

function scope(
  method:
    | "personal-delivery"
    | "meetup" =
      "personal-delivery",
) {
  const streams = {
    kind:
      "reservation-capacity-commitment-scope",
    skuScopes: [
      {
        sku: {
          id:
            SKU_B,
          version:
            1,
        },
        governingRevision:
          2,
      },
      {
        sku: {
          id:
            SKU_A,
          version:
            1,
        },
        governingRevision:
          3,
      },
    ],
    slotScope: {
      method,
      locationReference:
        LOCATION,
      windowReference:
        WINDOW,
      governingRevision:
        4,
    },
  };
  const skus = streams.skuScopes.map(({ sku }, index) => ({
    ...sku,
    servingOffer: { offerId: `food-serving-offer:007r-${index}`, version: 1 },
    package: { id: `food-package-definition:007r-${index}`, version: 1 },
  }));
  const cart = createInitialFoodCartVersion({
    id: "food-cart:007r", version: 1,
    lines: skus.map(sku => ({ sku: { id: sku.id, version: sku.version }, quantity: 2 })),
  });
  const prices = skus.map((sku, index) => ({
    id: `food-approved-commercial-price:007r-${index}`, version: 1,
    sku: { id: sku.id, version: sku.version }, money: { currency: "USD", minorUnits: 100 },
    approval: { attribution: "synthetic:owner", sourceReference: "synthetic:price", approvedOn: "2026-10-13" },
  }));
  const quote = createInitialFoodMerchandiseQuoteVersion({ id: "food-merchandise-quote:007r", version: 1 }, cart, skus, prices);
  const fulfillmentIntent = createInitialFoodFulfillmentIntentVersion(
    { id: "food-fulfillment-intent:007r", version: 1 }, quote,
    { method, locationReference: LOCATION, windowReference: WINDOW },
  );
  const request = createInitialFoodReservationRequestVersion({ id: "food-reservation-request:007r", version: 1 }, quote, fulfillmentIntent);
  const order = createInitialFoodPhysicalOrderVersion({ id: "food-physical-order:007r", version: 1 }, quote, fulfillmentIntent, request);
  const result = deriveFoodReservationCapacityCommitmentScope({
    commandInput: {
      reservationId: "opaque:007r", order, quote, request, fulfillmentIntent,
      skuSelections: streams.skuScopes.map(({ sku, governingRevision }) => ({ sku, revision: governingRevision })),
      slotSelection: { method, locationReference: LOCATION, windowReference: WINDOW, revision: 4 },
    },
    observations: {
      skuObservations: streams.skuScopes.map(({ sku, governingRevision }) => ({ sku, observedHighestRecordedRevision: governingRevision })),
      slotObservation: { method, locationReference: LOCATION, windowReference: WINDOW, observedHighestRecordedRevision: 4 },
    },
  });
  assert.equal(result.outcome, "scoped");
  if (result.outcome !== "scoped") throw new Error("Expected canonical FOOD-007P scope");
  // Mutable detached input permits the existing hostile-input and detachment tests.
  const canonical = structuredClone(result.value);
  return {
    ...canonical,
    skuScopes: canonical.skuScopes.map(entry => ({ ...entry, sku: { ...entry.sku } })),
    slotScope: { ...canonical.slotScope },
  } satisfies FoodReservationCapacityCommitmentScope;
}

test("007R accepts genuine five-key FOOD-007P output", async () => {
  const input: FoodReservationCapacityCommitmentScope = scope();
  assert.deepEqual(Object.keys(input).sort(), ["governing", "kind", "policyVersion", "skuScopes", "slotScope"]);
  const database = new Database();
  success(await resolveFoodReservationGoverningScopeRecordedHeldCommitments(database, input));
  assert.equal(database.calls.length, 3);
});

for (const [name, corrupt] of [
  ["missing policyVersion", (input: Record<string, unknown>) => { Reflect.deleteProperty(input, "policyVersion"); }],
  ["missing governing", (input: Record<string, unknown>) => { Reflect.deleteProperty(input, "governing"); }],
  ["wrong policyVersion", (input: Record<string, unknown>) => { input.policyVersion = 2; }],
  ["nonliteral policyVersion", (input: Record<string, unknown>) => { input.policyVersion = "1"; }],
  ["nonobject governing", (input: Record<string, unknown>) => { input.governing = "governing"; }],
  ["incomplete governing", (input: Record<string, unknown>) => { input.governing = {}; }],
  ["wrong governing kind", (input: Record<string, unknown>) => { (input.governing as Record<string, unknown>).kind = "wrong"; }],
  ["wrong governing policyVersion", (input: Record<string, unknown>) => { (input.governing as Record<string, unknown>).policyVersion = 2; }],
  ["governing accessor", (input: Record<string, unknown>) => {
    Object.defineProperty(input.governing, "command", { enumerable: true, get() { throw new Error("Getter must not run"); } });
  }],
  ["inconsistent governing revision", (input: Record<string, unknown>) => {
    const value = input as unknown as ReturnType<typeof scope>;
    value.skuScopes[0]!.governingRevision = 99;
  }],
] as const) {
  test(`007R rejects ${name} before any database read`, async () => {
    const input = scope();
    corrupt(input);
    const database = new Database();
    assert.deepEqual(await resolveFoodReservationGoverningScopeRecordedHeldCommitments(database, input), { outcome: "invalid" });
    assert.equal(database.calls.length, 0);
  });
}

function success(
  input:
    Awaited<
      ReturnType<
        typeof resolveFoodReservationGoverningScopeRecordedHeldCommitments
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
      "Expected FOOD-007R resolved result",
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
    `007R composes governing-scope recorded-held commitments for ${method}`,
    async () => {
      const database =
        new Database();

      const value =
        success(
          await resolveFoodReservationGoverningScopeRecordedHeldCommitments(
            database,
            scope(
              method,
            ),
          ),
        );

      assert.equal(
        value.kind,
        FOOD_RESERVATION_GOVERNING_SCOPE_RECORDED_HELD_COMMITMENT_RESOLUTION_KIND,
      );

      assert.deepEqual(
        value.skuCommitments,
        [
          {
            sku: {
              id:
                SKU_B,
              version:
                1,
            },
            governingRevision:
              2,
            recordedHeldQuantity:
              4,
          },
          {
            sku: {
              id:
                SKU_A,
              version:
                1,
            },
            governingRevision:
              3,
            recordedHeldQuantity:
              7,
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
          governingRevision:
            4,
          recordedHeldQuantity:
            2,
        },
      );

      assert.equal(
        database.calls.length,
        3,
      );

      assert.deepEqual(
        database.calls.map(
          (call) =>
            call.bound,
        ),
        [
          [
            SKU_B,
            1,
            2,
          ],
          [
            SKU_A,
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

      assert.match(
        database.calls[0]!.sql,
        /food_capacity_reservation_lines/i,
      );

      assert.match(
        database.calls[1]!.sql,
        /food_capacity_reservation_lines/i,
      );

      assert.match(
        database.calls[2]!.sql,
        /food_fulfillment_slot_reservations/i,
      );

      for (
        const call of
        database.calls
      ) {
        assert.match(
          call.sql,
          /capacity_revision\s*<=\s*\?/i,
        );

        assert.match(
          call.sql,
          /reservation\.state\s*=\s*'held'/i,
        );
      }

      assert.equal(
        Object.isFrozen(
          value,
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
          value.skuCommitments[0]!.sku,
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
  "007R preserves FOOD-007P SKU scope order without sorting",
  async () => {
    const database =
      new Database();

    const value =
      success(
        await resolveFoodReservationGoverningScopeRecordedHeldCommitments(
          database,
          scope(),
        ),
      );

    assert.equal(
      value.skuCommitments[0]!.sku.id,
      SKU_B,
    );

    assert.equal(
      value.skuCommitments[1]!.sku.id,
      SKU_A,
    );

    assert.deepEqual(
      database.calls.map(
        (call) =>
          call.bound[0],
      ),
      [
        SKU_B,
        SKU_A,
        "personal-delivery",
      ],
    );
  },
);

test(
  "007R rejects malformed governing commitment scope before any database read",
  async () => {
    const database =
      new Database();

    const result =
      await resolveFoodReservationGoverningScopeRecordedHeldCommitments(
        database,
        {
          kind:
            "not-a-commitment-scope",
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
  "007R rejects accessor-bearing input before any database read",
  async () => {
    const database =
      new Database();

    const input =
      scope();

    Object.defineProperty(
      input,
      "kind",
      {
        enumerable:
          true,
        configurable:
          true,
        get() {
          return "reservation-capacity-commitment-scope";
        },
      },
    );

    const result =
      await resolveFoodReservationGoverningScopeRecordedHeldCommitments(
        database,
        input,
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
  "007R rejects symbol-bearing input before any database read",
  async () => {
    const database =
      new Database();

    const input =
      scope();

    Object.defineProperty(
      input,
      Symbol(
        "unsupported",
      ),
      {
        value:
          true,
        enumerable:
          true,
      },
    );

    const result =
      await resolveFoodReservationGoverningScopeRecordedHeldCommitments(
        database,
        input,
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
  "007R rejects sparse SKU scope arrays before any database read",
  async () => {
    const database =
      new Database();

    const input =
      scope();

    const sparse =
      new Array(
        2,
      );

    sparse[1] =
      input.skuScopes[1];

    Object.defineProperty(
      input,
      "skuScopes",
      {
        value:
          sparse,
        enumerable:
          true,
        configurable:
          true,
        writable:
          true,
      },
    );

    const result =
      await resolveFoodReservationGoverningScopeRecordedHeldCommitments(
        database,
        input,
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

for (const prototypeKind of ["custom", "null", "subclass"] as const) {
  test(`007R rejects ${prototypeKind} SKU array prototype before inherited iterator lookup`, async () => {
    const input = scope();
    const database = new Database();
    let getterCalls = 0;
    class CustomArray extends Array {}
    const prototype = prototypeKind === "null"
      ? null
      : prototypeKind === "subclass"
        ? CustomArray.prototype
        : Object.create(Array.prototype);

    if (prototype !== null) {
      Object.defineProperty(prototype, Symbol.iterator, {
        get() {
          getterCalls += 1;
          return Array.prototype[Symbol.iterator];
        },
      });
    }
    Object.setPrototypeOf(input.skuScopes, prototype);
    assert.equal(Array.isArray(input.skuScopes), true);
    assert.notEqual(Object.getPrototypeOf(input.skuScopes), Array.prototype);

    const result = await resolveFoodReservationGoverningScopeRecordedHeldCommitments(database, input);
    assert.deepEqual(result, { outcome: "invalid" });
    assert.equal(getterCalls, 0);
    assert.equal(database.calls.length, 0);
  });
}

test(
  "007R fails closed on first SKU recorded-held read failure",
  async () => {
    const database =
      new Database();

    database.failure =
      "sku-b";

    const result =
      await resolveFoodReservationGoverningScopeRecordedHeldCommitments(
        database,
        scope(),
      );

    assert.deepEqual(
      result,
      {
        outcome:
          "storage-failure",
      },
    );

    assert.equal(
      database.calls.length,
      1,
    );

    assert.match(
      database.calls[0]!.sql,
      /food_capacity_reservation_lines/i,
    );
  },
);

test(
  "007R fails closed on second SKU read without reading the slot",
  async () => {
    const database =
      new Database();

    database.failure =
      "sku-a";

    const result =
      await resolveFoodReservationGoverningScopeRecordedHeldCommitments(
        database,
        scope(),
      );

    assert.deepEqual(
      result,
      {
        outcome:
          "storage-failure",
      },
    );

    assert.equal(
      database.calls.length,
      2,
    );

    assert.equal(
      database.calls.some(
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
  "007R fails closed when slot recorded-held read fails",
  async () => {
    const database =
      new Database();

    database.failure =
      "slot";

    const result =
      await resolveFoodReservationGoverningScopeRecordedHeldCommitments(
        database,
        scope(),
      );

    assert.deepEqual(
      result,
      {
        outcome:
          "storage-failure",
      },
    );

    assert.equal(
      database.calls.length,
      3,
    );

    assert.match(
      database.calls[2]!.sql,
      /food_fulfillment_slot_reservations/i,
    );
  },
);

test(
  "007R returned evidence is detached from caller-owned scope",
  async () => {
    const database =
      new Database();

    const input =
      scope();

    const value =
      success(
        await resolveFoodReservationGoverningScopeRecordedHeldCommitments(
          database,
          input,
        ),
      );

    input.skuScopes[0]!.sku.id =
      parseFoodSkuId("food-sku:mutated");

    input.skuScopes[0]!.governingRevision =
      99;

    input.slotScope.locationReference =
      "food-location:mutated";

    input.slotScope.governingRevision =
      99;

    assert.equal(
      value.skuCommitments[0]!.sku.id,
      SKU_B,
    );

    assert.equal(
      value.skuCommitments[0]!.governingRevision,
      2,
    );

    assert.equal(
      value.slotCommitment.locationReference,
      LOCATION,
    );

    assert.equal(
      value.slotCommitment.governingRevision,
      4,
    );
  },
);

test(
  "007R resolved surface carries cumulative evidence without capacity or admission authority",
  async () => {
    const database =
      new Database();

    const value =
      success(
        await resolveFoodReservationGoverningScopeRecordedHeldCommitments(
          database,
          scope(),
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
          '"eligible"',
          '"accepted"',
          '"acceptance"',
          '"available"',
          '"orderable"',
          '"checkoutready"',
          '"paymentready"',
          '"quantityonhand"',
          '"capacityunits"',
          '"sufficient"',
          '"insufficient"',
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

    assert.match(
      serialized,
      /"governingrevision"/,
    );

    assert.match(
      serialized,
      /"recordedheldquantity"/,
    );
  },
);

test(
  "007R source delegates to FOOD-007Q without direct persistence arithmetic concurrency or acceptance",
  () => {
    const source =
      readFileSync(
        new URL(
          "./reservation-governing-scope-recorded-held-commitment-resolution.ts",
          import.meta.url,
        ),
        "utf8",
      );

    assert.match(
      source,
      /readFoodGoverningScopeRecordedHeldCapacityCommitment/,
    );

    assert.match(
      source,
      /FoodReservationCapacityCommitmentScope/,
    );

    assert.match(
      source,
      /governingRevision/,
    );

    assert.match(
      source,
      /scope:\s*"slot"/,
    );

    assert.doesNotMatch(
      source,
      /readFoodExactRevisionRecordedHeldCapacityCommitment/,
    );

    assert.doesNotMatch(
      source,
      /\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bUPSERT\b/i,
    );

    assert.doesNotMatch(
      source,
      /Promise\.all/,
    );

    assert.doesNotMatch(
      source,
      /capacityRevision/,
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

test(
  "007R specification is locked to canonical FOOD-007Q slot selector vocabulary",
  () => {
    const parsed =
      JSON.parse(
        readFileSync(
          new URL(
            "../../../.river-dev/specifications/food-007r-reservation-governing-scope-recorded-held-commitment-resolution.json",
            import.meta.url,
          ),
          "utf8",
        ),
      ) as {
        id: string;
        selectorMapping: {
          sku: {
            scope: string;
          };
          slot: {
            scope: string;
          };
        };
        plannedApi: {
          function: string;
        };
        cumulativeSemantics: {
          lowerLevelRule: string;
        };
      };

    assert.equal(
      parsed.id,
      "FOOD-007R",
    );

    assert.equal(
      parsed.selectorMapping.sku.scope,
      "sku",
    );

    assert.equal(
      parsed.selectorMapping.slot.scope,
      "slot",
    );

    assert.equal(
      parsed.plannedApi.function,
      "resolveFoodReservationGoverningScopeRecordedHeldCommitments",
    );

    assert.equal(
      parsed.cumulativeSemantics.lowerLevelRule,
      "FOOD-007Q reads capacity_revision <= governingRevision.",
    );
  },
);
