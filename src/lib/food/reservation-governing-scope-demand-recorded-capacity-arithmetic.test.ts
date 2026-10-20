import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  FOOD_RESERVATION_GOVERNING_SCOPE_DEMAND_RECORDED_CAPACITY_ARITHMETIC_KIND,
  deriveFoodReservationGoverningScopeDemandRecordedCapacityArithmetic,
} from "./reservation-governing-scope-demand-recorded-capacity-arithmetic";

const SKU_A =
  parseFoodSkuId("food-sku:007m-a");

const SKU_B =
  parseFoodSkuId("food-sku:007m-b");

const SKU_C =
  parseFoodSkuId("food-sku:007m-c");

const REQUEST_ID =
  parseFoodReservationRequestId("food-reservation-request:007m");

const QUOTE_ID =
  parseFoodMerchandiseQuoteId("food-merchandise-quote:007m");

const INTENT_ID =
  parseFoodFulfillmentIntentId("food-fulfillment-intent:007m");

const LOCATION =
  "synthetic:location";

const WINDOW =
  "synthetic:window";

import { parseFoodMerchandiseQuoteId } from "./cart-quote-domain";
import {
  createFoodFulfillmentIntentId,
  parseFoodFulfillmentIntentId,
  parseFoodReservationRequestId,
} from "./fulfillment-capacity-reservation-domain";
import { parseFoodSkuId } from "./package-sku-domain";
import type { FoodReservationCapacitySourceSelectionRequest } from "./reservation-capacity-source-selection-request";
import type { FoodReservationGoverningScopeRecordedCapacityArithmetic } from "./reservation-governing-scope-recorded-capacity-arithmetic";

function selectionRequest() {
  return {
    kind:
      "reservation-capacity-source-selection-request",

    request: {
      id:
        REQUEST_ID,
      version: 1,
      quote: {
        id:
          QUOTE_ID,
        version: 1,
      },
      fulfillmentIntent: {
        id:
          INTENT_ID,
        version: 1,
      },
      capacityRequirements: [
        {
          sku: {
            id:
              SKU_A,
            version: 1,
          },
          quantity: 4,
        },
        {
          sku: {
            id:
              SKU_B,
            version: 1,
          },
          quantity: 3,
        },
        {
          sku: {
            id:
              SKU_C,
            version: 1,
          },
          quantity: 3,
        },
      ],
    },

    fulfillmentIntent: {
      id:
        INTENT_ID,
      version: 1,
      quote: {
        id:
          QUOTE_ID,
        version: 1,
      },
      method:
        "personal-delivery",
      locationReference:
        LOCATION,
      windowReference:
        WINDOW,
    },

    skuSelections: [
      {
        sku: {
          id:
            SKU_A,
          version: 1,
        },
        revision: 2,
      },
      {
        sku: {
          id:
            SKU_B,
          version: 1,
        },
        revision: 3,
      },
      {
        sku: {
          id:
            SKU_C,
          version: 1,
        },
        revision: 4,
      },
    ],

    slotSelection: {
      method:
        "personal-delivery",
      locationReference:
        LOCATION,
      windowReference:
        WINDOW,
      revision: 5,
    },
  } satisfies FoodReservationCapacitySourceSelectionRequest;
}

function recordedArithmetic() {
  return {
    kind:
      "reservation-governing-scope-recorded-capacity-arithmetic",

    skuArithmetic: [
      {
        sku: {
          id:
            SKU_A,
          version: 1,
        },
        governingRevision: 2,
        capacityUnits: 10,
        recordedHeldQuantity: 3,
        recordedCapacityDelta: 7,
      },
      {
        sku: {
          id:
            SKU_B,
          version: 1,
        },
        governingRevision: 3,
        capacityUnits: 5,
        recordedHeldQuantity: 2,
        recordedCapacityDelta: 3,
      },
      {
        sku: {
          id:
            SKU_C,
          version: 1,
        },
        governingRevision: 4,
        capacityUnits: 2,
        recordedHeldQuantity: 1,
        recordedCapacityDelta: 1,
      },
    ],

    slotArithmetic: {
      method:
        "personal-delivery",
      locationReference:
        LOCATION,
      windowReference:
        WINDOW,
      governingRevision: 5,
      capacityUnits: 2,
      recordedHeldQuantity: 1,
      recordedCapacityDelta: 1,
    },
  } satisfies FoodReservationGoverningScopeRecordedCapacityArithmetic;
}

function derived(
  input:
    ReturnType<
      typeof deriveFoodReservationGoverningScopeDemandRecordedCapacityArithmetic
    >,
) {
  assert.equal(
    input.outcome,
    "derived",
  );

  if (
    input.outcome !==
      "derived"
  ) {
    throw new Error(
      "Expected derived",
    );
  }

  return input.value;
}

test(
  "007M derives positive zero and negative demand-adjusted arithmetic without assigning capacity authority",
  () => {
    const value =
      derived(
        deriveFoodReservationGoverningScopeDemandRecordedCapacityArithmetic(
          selectionRequest(),
          recordedArithmetic(),
        ),
      );

    assert.equal(
      value.kind,
      FOOD_RESERVATION_GOVERNING_SCOPE_DEMAND_RECORDED_CAPACITY_ARITHMETIC_KIND,
    );

    assert.deepEqual(
      value.reservationRequest,
      {
        id:
          REQUEST_ID,
        version: 1,
      },
    );

    assert.deepEqual(
      value.fulfillmentIntent,
      {
        id:
          INTENT_ID,
        version: 1,
      },
    );

    assert.deepEqual(
      value.skuArithmetic.map(
        (entry) => ({
          demand:
            entry.demandQuantity,
          delta:
            entry.recordedDemandAdjustedCapacityDelta,
        }),
      ),
      [
        {
          demand: 4,
          delta: 3,
        },
        {
          demand: 3,
          delta: 0,
        },
        {
          demand: 3,
          delta: -2,
        },
      ],
    );

    assert.equal(
      value.slotArithmetic
        .demandQuantity,
      1,
    );

    assert.equal(
      value.slotArithmetic
        .recordedDemandAdjustedCapacityDelta,
      0,
    );
  },
);

test(
  "007M preserves negative arithmetic and never clamps to zero",
  () => {
    const value =
      derived(
        deriveFoodReservationGoverningScopeDemandRecordedCapacityArithmetic(
          selectionRequest(),
          recordedArithmetic(),
        ),
      );

    assert.equal(
      value.skuArithmetic[2]!
        .recordedDemandAdjustedCapacityDelta,
      -2,
    );
  },
);

test(
  "007M rejects request and selected SKU identity mismatch",
  () => {
    const selection =
      selectionRequest();

    selection.skuSelections[0]!
      .sku.id =
      parseFoodSkuId("food-sku:other");

    assert.deepEqual(
      deriveFoodReservationGoverningScopeDemandRecordedCapacityArithmetic(
        selection,
        recordedArithmetic(),
      ),
      {
        outcome:
          "invalid",
      },
    );
  },
);

test(
  "007M rejects selected revision and 007L revision mismatch",
  () => {
    const arithmetic =
      recordedArithmetic();

    arithmetic.skuArithmetic[0]!
      .governingRevision =
      99;

    assert.deepEqual(
      deriveFoodReservationGoverningScopeDemandRecordedCapacityArithmetic(
        selectionRequest(),
        arithmetic,
      ),
      {
        outcome:
          "invalid",
      },
    );
  },
);

test(
  "007M rejects internally inconsistent 007L SKU arithmetic",
  () => {
    const arithmetic =
      recordedArithmetic();

    arithmetic.skuArithmetic[0]!
      .recordedCapacityDelta =
      6;

    assert.deepEqual(
      deriveFoodReservationGoverningScopeDemandRecordedCapacityArithmetic(
        selectionRequest(),
        arithmetic,
      ),
      {
        outcome:
          "invalid",
      },
    );
  },
);

test(
  "007M rejects internally inconsistent 007L slot arithmetic",
  () => {
    const arithmetic =
      recordedArithmetic();

    arithmetic.slotArithmetic
      .recordedCapacityDelta =
      0;

    assert.deepEqual(
      deriveFoodReservationGoverningScopeDemandRecordedCapacityArithmetic(
        selectionRequest(),
        arithmetic,
      ),
      {
        outcome:
          "invalid",
      },
    );
  },
);

test(
  "007M rejects request and fulfillment linkage mismatch",
  () => {
    const selection =
      selectionRequest();

    selection.request
      .fulfillmentIntent.id =
      createFoodFulfillmentIntentId(
        "other",
      );

    assert.deepEqual(
      deriveFoodReservationGoverningScopeDemandRecordedCapacityArithmetic(
        selection,
        recordedArithmetic(),
      ),
      {
        outcome:
          "invalid",
      },
    );
  },
);

test(
  "007M rejects selected slot and 007L slot mismatch",
  () => {
    const arithmetic =
      recordedArithmetic();

    arithmetic.slotArithmetic
      .windowReference =
      "synthetic:other-window";

    assert.deepEqual(
      deriveFoodReservationGoverningScopeDemandRecordedCapacityArithmetic(
        selectionRequest(),
        arithmetic,
      ),
      {
        outcome:
          "invalid",
      },
    );
  },
);

test(
  "007M rejects SKU count mismatch",
  () => {
    const arithmetic =
      recordedArithmetic();

    arithmetic.skuArithmetic.pop();

    assert.deepEqual(
      deriveFoodReservationGoverningScopeDemandRecordedCapacityArithmetic(
        selectionRequest(),
        arithmetic,
      ),
      {
        outcome:
          "invalid",
      },
    );
  },
);

test(
  "007M rejects extra accessor fields without invoking them",
  () => {
    let invoked =
      false;

    const selection =
      selectionRequest();

    const bad =
      {
        ...selection,
        get extra() {
          invoked =
            true;

          return 1;
        },
      };

    assert.deepEqual(
      deriveFoodReservationGoverningScopeDemandRecordedCapacityArithmetic(
        bad,
        recordedArithmetic(),
      ),
      {
        outcome:
          "invalid",
      },
    );

    assert.equal(
      invoked,
      false,
    );
  },
);

test(
  "007M output is detached and deeply frozen",
  () => {
    const selection =
      selectionRequest();

    const arithmetic =
      recordedArithmetic();

    const value =
      derived(
        deriveFoodReservationGoverningScopeDemandRecordedCapacityArithmetic(
          selection,
          arithmetic,
        ),
      );

    selection.request
      .capacityRequirements[0]!
      .quantity =
      999;

    arithmetic.skuArithmetic[0]!
      .recordedCapacityDelta =
      999;

    assert.equal(
      value.skuArithmetic[0]!
        .demandQuantity,
      4,
    );

    assert.equal(
      value.skuArithmetic[0]!
        .recordedCapacityDelta,
      7,
    );

    assert.equal(
      value.skuArithmetic[0]!
        .recordedDemandAdjustedCapacityDelta,
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
        value.reservationRequest,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        value.fulfillmentIntent,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        value.skuArithmetic,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        value.skuArithmetic[0],
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        value.skuArithmetic[0]!.sku,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        value.slotArithmetic,
      ),
      true,
    );
  },
);

test(
  "007M result surface contains arithmetic only and grants no reservation decision",
  () => {
    const value =
      derived(
        deriveFoodReservationGoverningScopeDemandRecordedCapacityArithmetic(
          selectionRequest(),
          recordedArithmetic(),
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
          '"available"',
          '"atp"',
          '"sufficient"',
          '"insufficient"',
          '"eligible"',
          '"accepted"',
          '"rejected"',
          '"acceptance"',
          '"governing"',
          '"orderable"',
          '"quantityonhand"',
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
  "007M source is pure BigInt arithmetic with no database acceptance lifecycle or clamp behavior",
  () => {
    const source =
      readFileSync(
        new URL(
          "./reservation-governing-scope-demand-recorded-capacity-arithmetic.ts",
          import.meta.url,
        ),
        "utf8",
      );

    assert.match(
      source,
      /BigInt/,
    );

    assert.match(
      source,
      /recordedDemandAdjustedCapacityDelta/,
    );

    assert.match(
      source,
      /SLOT_DEMAND_QUANTITY/,
    );

    assert.doesNotMatch(
      source,
      /Math\.max\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\s+FROM\b|\bUPSERT\b/i,
    );

    assert.doesNotMatch(
      source,
      /\.prepare\s*\(|\.bind\s*\(|\.batch\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /createFoodReservationAcceptance|createInitialFoodReservationAcceptance/,
    );

    assert.doesNotMatch(
      source,
      /releaseReservation|cancelReservation|expireReservation|replaceReservation/,
    );

    assert.doesNotMatch(
      source,
      /Date\.now|new Date|process\.env|fetch\s*\(|Math\.random|randomUUID/,
    );

    assert.doesNotMatch(
      source,
      /\bremainingCapacity\b|\breservableQuantity\b|\bavailableToPromise\b|\bcapacitySufficient\b|\bsufficientCapacity\b/,
    );
  },
);

test(
  "007T rejects custom object prototypes before caller data is trusted",
  () => {
    const selection = selectionRequest();

    Object.setPrototypeOf(
      selection,
      Object.create(Object.prototype),
    );

    assert.equal(
      deriveFoodReservationGoverningScopeDemandRecordedCapacityArithmetic(
        selection,
        recordedArithmetic(),
      ).outcome,
      "invalid",
    );
  },
);

test(
  "007T rejects null object prototypes",
  () => {
    const selection = selectionRequest();

    Object.setPrototypeOf(
      selection,
      null,
    );

    assert.equal(
      deriveFoodReservationGoverningScopeDemandRecordedCapacityArithmetic(
        selection,
        recordedArithmetic(),
      ).outcome,
      "invalid",
    );
  },
);

test(
  "007T rejects custom Array prototypes without invoking inherited iterator getters",
  () => {
    const selection = selectionRequest();
    let getterCalls = 0;

    const hostilePrototype =
      Object.create(Array.prototype);

    Object.defineProperty(
      hostilePrototype,
      Symbol.iterator,
      {
        configurable: true,
        get() {
          getterCalls += 1;

          return Array.prototype[Symbol.iterator];
        },
      },
    );

    Object.setPrototypeOf(
      selection.skuSelections,
      hostilePrototype,
    );

    const result =
      deriveFoodReservationGoverningScopeDemandRecordedCapacityArithmetic(
        selection,
        recordedArithmetic(),
      );

    assert.equal(
      result.outcome,
      "invalid",
    );

    assert.equal(
      getterCalls,
      0,
    );
  },
);

test(
  "007T rejects null Array prototypes",
  () => {
    const selection = selectionRequest();

    Object.setPrototypeOf(
      selection.skuSelections,
      null,
    );

    assert.equal(
      deriveFoodReservationGoverningScopeDemandRecordedCapacityArithmetic(
        selection,
        recordedArithmetic(),
      ).outcome,
      "invalid",
    );
  },
);

test(
  "007T rejects Array subclass prototypes",
  () => {
    const selection = selectionRequest();

    class HostileArray<T> extends Array<T> {}

    Object.setPrototypeOf(
      selection.skuSelections,
      HostileArray.prototype,
    );

    assert.equal(
      deriveFoodReservationGoverningScopeDemandRecordedCapacityArithmetic(
        selection,
        recordedArithmetic(),
      ).outcome,
      "invalid",
    );
  },
);