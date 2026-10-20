import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  createInitialFoodCartVersion,
  createInitialFoodMerchandiseQuoteVersion,
} from "./cart-quote-domain";
import {
  createInitialFoodFulfillmentIntentVersion,
  createInitialFoodReservationRequestVersion,
  parseFoodFulfillmentIntentId,
  parseFoodReservationRequestId,
} from "./fulfillment-capacity-reservation-domain";
import {
  deriveFoodReservationCapacitySourceSelectionRequest,
  type FoodReservationCapacitySourceSelectionRequest,
} from "./reservation-capacity-source-selection-request";
import {
  FOOD_RESERVATION_GOVERNING_SCOPE_DEMAND_RECORDED_CAPACITY_ARITHMETIC_KIND,
  type FoodReservationGoverningScopeDemandRecordedCapacityArithmetic,
} from "./reservation-governing-scope-demand-recorded-capacity-arithmetic";
import {
  evaluateFoodReservationGoverningScopeCapacityAdmission,
  FOOD_RESERVATION_GOVERNING_SCOPE_CAPACITY_ADMISSION_EVALUATION_KIND,
} from "./reservation-governing-scope-capacity-admission-evaluation";

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

function mutableClone<T>(
  input: T,
): Mutable<T> {
  return structuredClone(input) as Mutable<T>;
}

function record(
  input: unknown,
): Record<string, unknown> {
  return input as Record<string, unknown>;
}

function frozen(
  input: unknown,
): void {
  if (
    input !== null &&
    typeof input === "object"
  ) {
    assert.ok(
      Object.isFrozen(input),
    );

    for (
      const value of
      Object.values(input)
    ) {
      frozen(value);
    }
  }
}

function sku(
  name: string,
  version = 1,
) {
  return {
    id:
      `food-sku:${name}`,
    version,
    servingOffer: {
      offerId:
        `food-serving-offer:${name}`,
      version: 1,
    },
    package: {
      id:
        `food-package-definition:${name}`,
      version: 1,
    },
  };
}

function approvedPrice(
  name: string,
  skuInput:
    ReturnType<typeof sku>,
  minorUnits: number,
) {
  return {
    id:
      `food-approved-commercial-price:${name}`,
    version: 1,
    sku: {
      id:
        skuInput.id,
      version:
        skuInput.version,
    },
    money: {
      currency:
        "USD",
      minorUnits,
    },
    approval: {
      attribution:
        "fixture:owner",
      sourceReference:
        `fixture:price:${name}`,
      approvedOn:
        "2026-10-20",
    },
  };
}

function selectionFixture(
  count = 2,
  method:
    | "personal-delivery"
    | "meetup" =
    "personal-delivery",
): Mutable<
  FoodReservationCapacitySourceSelectionRequest
> {
  assert.ok(
    count >= 1 &&
      count <= 3,
  );

  const definitions =
    [
      sku("007u-a"),
      sku("007u-b"),
      sku("007u-c"),
    ].slice(
      0,
      count,
    );

  const cart =
    createInitialFoodCartVersion({
      id:
        `food-cart:007u-${count}`,
      version: 1,
      lines:
        definitions.map(
          (
            definition,
            index,
          ) => ({
            sku: {
              id:
                definition.id,
              version:
                definition.version,
            },
            quantity:
              index + 2,
          }),
        ),
    });

  const quote =
    createInitialFoodMerchandiseQuoteVersion(
      {
        id:
          `food-merchandise-quote:007u-${count}`,
        version: 1,
      },
      cart,
      definitions,
      definitions.map(
        (
          definition,
          index,
        ) =>
          approvedPrice(
            `007u-${index}`,
            definition,
            1000 +
              index * 100,
          ),
      ),
    );

  const fulfillmentIntent =
    createInitialFoodFulfillmentIntentVersion(
      {
        id:
          `food-fulfillment-intent:007u-${count}`,
        version: 1,
      },
      quote,
      {
        method,
        locationReference:
          "synthetic:007u-location",
        windowReference:
          "synthetic:007u-window",
      },
    );

  const request =
    createInitialFoodReservationRequestVersion(
      {
        id:
          `food-reservation-request:007u-${count}`,
        version: 1,
      },
      quote,
      fulfillmentIntent,
    );

  const result =
    deriveFoodReservationCapacitySourceSelectionRequest({
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
        revision:
          19,
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
      "Expected canonical FOOD-007E fixture",
    );
  }

  return mutableClone(
    result.value,
  );
}

function arithmeticFixture(
  selection:
    FoodReservationCapacitySourceSelectionRequest,
  skuDeltas:
    readonly number[] = [],
  slotDelta = 2,
) {
  const skuArithmetic =
    selection.request.capacityRequirements.map(
      (
        demand,
        index,
      ) => {
        const adjustedDelta =
          skuDeltas[index] ??
          2;

        const recordedHeldQuantity =
          4;

        const recordedCapacityDelta =
          demand.quantity +
          adjustedDelta;

        const capacityUnits =
          recordedHeldQuantity +
          recordedCapacityDelta;

        return {
          sku: {
            id:
              demand.sku.id,
            version:
              demand.sku.version,
          },
          governingRevision:
            selection.skuSelections[index]!
              .revision,
          capacityUnits,
          recordedHeldQuantity,
          recordedCapacityDelta,
          demandQuantity:
            demand.quantity,
          recordedDemandAdjustedCapacityDelta:
            adjustedDelta,
        };
      },
    );

  const slotRecordedHeldQuantity =
    3;

  const slotRecordedCapacityDelta =
    1 +
    slotDelta;

  const slotCapacityUnits =
    slotRecordedHeldQuantity +
    slotRecordedCapacityDelta;

  return {
    kind:
      FOOD_RESERVATION_GOVERNING_SCOPE_DEMAND_RECORDED_CAPACITY_ARITHMETIC_KIND,
    reservationRequest: {
      id:
        selection.request.id,
      version:
        selection.request.version,
    },
    fulfillmentIntent: {
      id:
        selection.fulfillmentIntent.id,
      version:
        selection.fulfillmentIntent.version,
    },
    skuArithmetic,
    slotArithmetic: {
      method:
        selection.slotSelection.method,
      locationReference:
        selection.slotSelection.locationReference,
      windowReference:
        selection.slotSelection.windowReference,
      governingRevision:
        selection.slotSelection.revision,
      capacityUnits:
        slotCapacityUnits,
      recordedHeldQuantity:
        slotRecordedHeldQuantity,
      recordedCapacityDelta:
        slotRecordedCapacityDelta,
      demandQuantity: 1,
      recordedDemandAdjustedCapacityDelta:
        slotDelta,
    },
  } satisfies
    FoodReservationGoverningScopeDemandRecordedCapacityArithmetic;
}

function evaluate(
  selection:
    FoodReservationCapacitySourceSelectionRequest,
  arithmetic:
    FoodReservationGoverningScopeDemandRecordedCapacityArithmetic,
) {
  return evaluateFoodReservationGoverningScopeCapacityAdmission(
    selection,
    arithmetic,
  );
}

test(
  "007U positive correlated SKU and slot evidence is admissible",
  () => {
    const selection =
      selectionFixture(2);

    const arithmetic =
      arithmeticFixture(
        selection,
        [3, 7],
        4,
      );

    const result =
      evaluate(
        selection,
        arithmetic,
      );

    assert.equal(
      result.outcome,
      "admissible",
    );

    if (
      result.outcome !==
      "admissible"
    ) {
      throw new Error(
        "Expected admissible",
      );
    }

    assert.equal(
      result.value.kind,
      FOOD_RESERVATION_GOVERNING_SCOPE_CAPACITY_ADMISSION_EVALUATION_KIND,
    );

    assert.equal(
      result.value.policyVersion,
      1,
    );

    assert.deepEqual(
      result.value.skuAdmissions.map(
        (entry) =>
          entry.recordedDemandAdjustedCapacityDelta,
      ),
      [3, 7],
    );

    assert.ok(
      result.value.skuAdmissions.every(
        (entry) =>
          entry.admissible,
      ),
    );

    assert.equal(
      result.value.slotAdmission.admissible,
      true,
    );

    frozen(result);
  },
);

test(
  "007U zero SKU and zero slot deltas are admissible",
  () => {
    const selection =
      selectionFixture(2);

    const result =
      evaluate(
        selection,
        arithmeticFixture(
          selection,
          [0, 0],
          0,
        ),
      );

    assert.equal(
      result.outcome,
      "admissible",
    );

    if (
      result.outcome !==
      "admissible"
    ) {
      throw new Error(
        "Expected zero to pass",
      );
    }

    assert.deepEqual(
      result.value.skuAdmissions.map(
        (entry) => [
          entry
            .recordedDemandAdjustedCapacityDelta,
          entry.admissible,
        ],
      ),
      [
        [0, true],
        [0, true],
      ],
    );

    assert.equal(
      result.value.slotAdmission
        .recordedDemandAdjustedCapacityDelta,
      0,
    );

    assert.equal(
      result.value.slotAdmission.admissible,
      true,
    );
  },
);

test(
  "007U preserves canonical multi-SKU order",
  () => {
    const selection =
      selectionFixture(3);

    const result =
      evaluate(
        selection,
        arithmeticFixture(
          selection,
          [1, 0, 4],
          1,
        ),
      );

    assert.equal(
      result.outcome,
      "admissible",
    );

    if (
      result.outcome !==
      "admissible"
    ) {
      throw new Error(
        "Expected admissible",
      );
    }

    assert.deepEqual(
      result.value.skuAdmissions.map(
        (entry) =>
          entry.sku,
      ),
      selection.request
        .capacityRequirements
        .map(
          (line) =>
            line.sku,
        ),
    );
  },
);

test(
  "007U one negative SKU yields insufficient-capacity and retains evidence",
  () => {
    const selection =
      selectionFixture(2);

    const result =
      evaluate(
        selection,
        arithmeticFixture(
          selection,
          [-1, 5],
          2,
        ),
      );

    assert.equal(
      result.outcome,
      "insufficient-capacity",
    );

    if (
      result.outcome !==
      "insufficient-capacity"
    ) {
      throw new Error(
        "Expected insufficient-capacity",
      );
    }

    assert.equal(
      result.value.skuAdmissions[0]!
        .recordedDemandAdjustedCapacityDelta,
      -1,
    );

    assert.equal(
      result.value.skuAdmissions[0]!
        .admissible,
      false,
    );

    assert.equal(
      result.value.skuAdmissions[1]!
        .admissible,
      true,
    );
  },
);

test(
  "007U negative slot yields insufficient-capacity",
  () => {
    const selection =
      selectionFixture(2);

    const result =
      evaluate(
        selection,
        arithmeticFixture(
          selection,
          [2, 2],
          -1,
        ),
      );

    assert.equal(
      result.outcome,
      "insufficient-capacity",
    );

    if (
      result.outcome !==
      "insufficient-capacity"
    ) {
      throw new Error(
        "Expected insufficient-capacity",
      );
    }

    assert.equal(
      result.value.slotAdmission
        .recordedDemandAdjustedCapacityDelta,
      -1,
    );

    assert.equal(
      result.value.slotAdmission.admissible,
      false,
    );
  },
);

test(
  "007U rejects reservation-request identity mismatch",
  () => {
    const selection =
      selectionFixture();

    const arithmetic =
      arithmeticFixture(
        selection,
      );

    arithmetic.reservationRequest.id =
      parseFoodReservationRequestId(
        "food-reservation-request:007u-other",
      );

    assert.equal(
      evaluate(
        selection,
        arithmetic,
      ).outcome,
      "invalid",
    );
  },
);

test(
  "007U rejects fulfillment-intent identity mismatch",
  () => {
    const selection =
      selectionFixture();

    const arithmetic =
      arithmeticFixture(
        selection,
      );

    arithmetic.fulfillmentIntent.id =
      parseFoodFulfillmentIntentId(
        "food-fulfillment-intent:007u-other",
      );

    assert.equal(
      evaluate(
        selection,
        arithmetic,
      ).outcome,
      "invalid",
    );
  },
);

test(
  "007U rejects missing SKU arithmetic entry",
  () => {
    const selection =
      selectionFixture(2);

    const arithmetic =
      arithmeticFixture(
        selection,
      );

    arithmetic.skuArithmetic.pop();

    assert.equal(
      evaluate(
        selection,
        arithmetic,
      ).outcome,
      "invalid",
    );
  },
);

test(
  "007U rejects extra SKU arithmetic entry",
  () => {
    const selection =
      selectionFixture(2);

    const arithmetic =
      arithmeticFixture(
        selection,
      );

    arithmetic.skuArithmetic.push(
      structuredClone(
        arithmetic.skuArithmetic[0]!,
      ),
    );

    assert.equal(
      evaluate(
        selection,
        arithmetic,
      ).outcome,
      "invalid",
    );
  },
);

test(
  "007U rejects reordered arithmetic rather than repairing it",
  () => {
    const selection =
      selectionFixture(2);

    const arithmetic =
      arithmeticFixture(
        selection,
      );

    arithmetic.skuArithmetic.reverse();

    assert.equal(
      evaluate(
        selection,
        arithmetic,
      ).outcome,
      "invalid",
    );
  },
);

test(
  "007U rejects selected SKU revision versus governingRevision mismatch",
  () => {
    const selection =
      selectionFixture();

    const arithmetic =
      arithmeticFixture(
        selection,
      );

    arithmetic.skuArithmetic[0]!
      .governingRevision += 1;

    assert.equal(
      evaluate(
        selection,
        arithmetic,
      ).outcome,
      "invalid",
    );
  },
);

test(
  "007U rejects FOOD-007E demand versus FOOD-007T demand mismatch even when T arithmetic remains internally valid",
  () => {
    const selection =
      selectionFixture();

    const arithmetic =
      arithmeticFixture(
        selection,
      );

    const entry =
      arithmetic.skuArithmetic[0]!;

    entry.demandQuantity +=
      1;

    entry.recordedDemandAdjustedCapacityDelta =
      entry.recordedCapacityDelta -
      entry.demandQuantity;

    assert.equal(
      evaluate(
        selection,
        arithmetic,
      ).outcome,
      "invalid",
    );
  },
);

test(
  "007U rejects selected slot identity mismatch",
  () => {
    const selection =
      selectionFixture();

    const arithmetic =
      arithmeticFixture(
        selection,
      );

    arithmetic.slotArithmetic
      .windowReference =
      "synthetic:wrong-window";

    assert.equal(
      evaluate(
        selection,
        arithmetic,
      ).outcome,
      "invalid",
    );
  },
);

test(
  "007U rejects selected slot revision versus governingRevision mismatch",
  () => {
    const selection =
      selectionFixture();

    const arithmetic =
      arithmeticFixture(
        selection,
      );

    arithmetic.slotArithmetic
      .governingRevision +=
      1;

    assert.equal(
      evaluate(
        selection,
        arithmetic,
      ).outcome,
      "invalid",
    );
  },
);

test(
  "007U rechecks recorded-capacity arithmetic identity",
  () => {
    const selection =
      selectionFixture();

    const arithmetic =
      arithmeticFixture(
        selection,
      );

    arithmetic.skuArithmetic[0]!
      .recordedCapacityDelta +=
      1;

    assert.equal(
      evaluate(
        selection,
        arithmetic,
      ).outcome,
      "invalid",
    );
  },
);

test(
  "007U rechecks demand-adjusted arithmetic identity",
  () => {
    const selection =
      selectionFixture();

    const arithmetic =
      arithmeticFixture(
        selection,
      );

    arithmetic.skuArithmetic[0]!
      .recordedDemandAdjustedCapacityDelta +=
      1;

    assert.equal(
      evaluate(
        selection,
        arithmetic,
      ).outcome,
      "invalid",
    );
  },
);

test(
  "007U rejects wrong FOOD-007T kind",
  () => {
    const selection =
      selectionFixture();

    const arithmetic =
      arithmeticFixture(
        selection,
      );

    record(arithmetic).kind =
      "wrong-kind";

    assert.equal(
      evaluate(
        selection,
        arithmetic,
      ).outcome,
      "invalid",
    );
  },
);

test(
  "007U rejects accessors without invoking them",
  () => {
    const selection =
      selectionFixture();

    const arithmetic =
      arithmeticFixture(
        selection,
      );

    let getterCalls = 0;

    Object.defineProperty(
      arithmetic,
      "kind",
      {
        configurable: true,
        get() {
          getterCalls +=
            1;

          return FOOD_RESERVATION_GOVERNING_SCOPE_DEMAND_RECORDED_CAPACITY_ARITHMETIC_KIND;
        },
      },
    );

    assert.equal(
      evaluate(
        selection,
        arithmetic,
      ).outcome,
      "invalid",
    );

    assert.equal(
      getterCalls,
      0,
    );
  },
);

test(
  "007U rejects custom selection Array prototypes without invoking inherited iterator getters",
  () => {
    const selection =
      selectionFixture();

    const arithmetic =
      arithmeticFixture(
        selection,
      );

    let getterCalls = 0;

    const hostilePrototype =
      Object.create(
        Array.prototype,
      );

    Object.defineProperty(
      hostilePrototype,
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
      selection.skuSelections,
      hostilePrototype,
    );

    assert.equal(
      evaluate(
        selection,
        arithmetic,
      ).outcome,
      "invalid",
    );

    assert.equal(
      getterCalls,
      0,
    );
  },
);

test(
  "007U rejects null arithmetic Array prototypes",
  () => {
    const selection =
      selectionFixture();

    const arithmetic =
      arithmeticFixture(
        selection,
      );

    Object.setPrototypeOf(
      arithmetic.skuArithmetic,
      null,
    );

    assert.equal(
      evaluate(
        selection,
        arithmetic,
      ).outcome,
      "invalid",
    );
  },
);

test(
  "007U rejects Array subclass prototypes",
  () => {
    const selection =
      selectionFixture();

    const arithmetic =
      arithmeticFixture(
        selection,
      );

    class HostileArray<T>
      extends Array<T> {}

    Object.setPrototypeOf(
      arithmetic.skuArithmetic,
      HostileArray.prototype,
    );

    assert.equal(
      evaluate(
        selection,
        arithmetic,
      ).outcome,
      "invalid",
    );
  },
);

test(
  "007U output is detached and deeply frozen",
  () => {
    const selection =
      selectionFixture(2);

    const arithmetic =
      arithmeticFixture(
        selection,
        [0, 3],
        0,
      );

    const result =
      evaluate(
        selection,
        arithmetic,
      );

    assert.equal(
      result.outcome,
      "admissible",
    );

    if (
      result.outcome !==
      "admissible"
    ) {
      throw new Error(
        "Expected admissible",
      );
    }

    const before =
      structuredClone(
        result.value,
      );

    selection.request.version =
      99;

    selection.fulfillmentIntent
      .windowReference =
      "changed";

    selection.skuSelections[0]!
      .revision =
      99;

    arithmetic.skuArithmetic[0]!
      .recordedDemandAdjustedCapacityDelta =
      -999;

    arithmetic.slotArithmetic
      .recordedDemandAdjustedCapacityDelta =
      -999;

    assert.deepEqual(
      result.value,
      before,
    );

    frozen(result);
  },
);

test(
  "007U malformed runtime inputs fail closed",
  () => {
    const selection =
      selectionFixture();

    const arithmetic =
      arithmeticFixture(
        selection,
      );

    for (
      const badSelection of
      [
        null,
        undefined,
        [],
        true,
        1,
        "selection",
        {},
      ]
    ) {
      const result =
        Reflect.apply(
          evaluateFoodReservationGoverningScopeCapacityAdmission,
          undefined,
          [
            badSelection,
            arithmetic,
          ],
        );

      assert.deepEqual(
        result,
        {
          outcome:
            "invalid",
        },
      );
    }

    for (
      const badArithmetic of
      [
        null,
        undefined,
        [],
        true,
        1,
        "arithmetic",
        {},
      ]
    ) {
      const result =
        Reflect.apply(
          evaluateFoodReservationGoverningScopeCapacityAdmission,
          undefined,
          [
            selection,
            badArithmetic,
          ],
        );

      assert.deepEqual(
        result,
        {
          outcome:
            "invalid",
        },
      );
    }
  },
);

test(
  "007U source and specification preserve admission-only authority boundary",
  () => {
    const source =
      readFileSync(
        new URL(
          "./reservation-governing-scope-capacity-admission-evaluation.ts",
          import.meta.url,
        ),
        "utf8",
      );

    const spec =
      JSON.parse(
        readFileSync(
          new URL(
            "../../../.river-dev/specifications/food-007u-reservation-governing-scope-capacity-admission-evaluation.json",
            import.meta.url,
          ),
          "utf8",
        ),
      ) as {
        inputs: {
          selectionRequest: {
            source: string;
          };
          arithmetic: {
            source: string;
          };
        };
        policy: {
          policyVersion: number;
          zeroTreatment: string;
          negativeTreatment: string;
          partialAdmission: boolean;
        };
        purity: {
          database: boolean;
          mutation: boolean;
          async: boolean;
        };
      };

    assert.equal(
      spec.inputs
        .selectionRequest
        .source,
      "FOOD-007E",
    );

    assert.equal(
      spec.inputs
        .arithmetic
        .source,
      "FOOD-007T",
    );

    assert.equal(
      spec.policy
        .policyVersion,
      1,
    );

    assert.equal(
      spec.policy
        .zeroTreatment,
      "admissible",
    );

    assert.equal(
      spec.policy
        .negativeTreatment,
      "insufficient-capacity",
    );

    assert.equal(
      spec.policy
        .partialAdmission,
      false,
    );

    assert.equal(
      spec.purity.database,
      false,
    );

    assert.equal(
      spec.purity.mutation,
      false,
    );

    assert.equal(
      spec.purity.async,
      false,
    );

    assert.doesNotMatch(
      source,
      /\b(?:SELECT|INSERT|UPDATE|DELETE)\b/i,
    );

    assert.doesNotMatch(
      source,
      /\b(?:D1Database|prepare\(|exec\(|batch\()\b/,
    );

    assert.doesNotMatch(
      source,
      /reservation-acceptance-domain|FoodReservationAcceptanceVersion|createInitialFoodReservationAcceptanceVersion/,
    );

    assert.doesNotMatch(
      source,
      /reservation-hold-command|deriveFoodReservationHoldCommand/,
    );

    assert.doesNotMatch(
      source,
      /\b(?:remainingCapacity|reservableQuantity|availableToPromise)\b/,
    );
  },
);
