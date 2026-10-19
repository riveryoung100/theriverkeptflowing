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
} from "./fulfillment-capacity-reservation-domain";

import {
  createInitialFoodPhysicalOrderVersion,
} from "./physical-order-domain";

import {
  FOOD_RESERVATION_CAPACITY_GOVERNING_SOURCE_POLICY_KIND,
  evaluateFoodReservationCapacityGoverningSourcePolicy,
} from "./reservation-capacity-governing-source-policy";

import {
  FOOD_RESERVATION_CAPACITY_COMMITMENT_SCOPE_KIND as KIND,
  deriveFoodReservationCapacityCommitmentScope as derive,
} from "./reservation-capacity-commitment-scope";

function baseFixture(
  count = 3,
  method = "personal-delivery",
) {
  const skus =
    Array.from(
      {
        length: count,
      },
      (_, index) => ({
        id:
          `food-sku:test-${index}`,
        version:
          2,
        servingOffer: {
          offerId:
            `food-serving-offer:test-${index}`,
          version:
            1,
        },
        package: {
          id:
            `food-package-definition:test-${index}`,
          version:
            1,
        },
      }),
    );

  const cart =
    createInitialFoodCartVersion({
      id:
        "food-cart:007p",
      version:
        1,
      lines:
        skus.map(
          (sku) => ({
            sku: {
              id:
                sku.id,
              version:
                sku.version,
            },
            quantity:
              2,
          }),
        ),
    });

  const prices =
    skus.map(
      (sku, index) => ({
        id:
          `food-approved-commercial-price:test-${index}`,
        version:
          1,
        sku: {
          id:
            sku.id,
          version:
            sku.version,
        },
        money: {
          currency:
            "USD",
          minorUnits:
            100,
        },
        approval: {
          attribution:
            "synthetic:owner",
          sourceReference:
            "synthetic:price",
          approvedOn:
            "2026-10-13",
        },
      }),
    );

  const quote =
    createInitialFoodMerchandiseQuoteVersion(
      {
        id:
          "food-merchandise-quote:007p",
        version:
          1,
      },
      cart,
      skus,
      prices,
    );

  const fulfillmentIntent =
    createInitialFoodFulfillmentIntentVersion(
      {
        id:
          "food-fulfillment-intent:007p",
        version:
          1,
      },
      quote,
      {
        method,
        locationReference:
          "synthetic:location",
        windowReference:
          "synthetic:window",
      },
    );

  const request =
    createInitialFoodReservationRequestVersion(
      {
        id:
          "food-reservation-request:007p",
        version:
          1,
      },
      quote,
      fulfillmentIntent,
    );

  return {
    request: {
      ...request,
      quote: {
        ...request.quote,
      },
      fulfillmentIntent: {
        ...request.fulfillmentIntent,
      },
      capacityRequirements:
        request.capacityRequirements.map(
          (line) => ({
            ...line,
            sku: {
              ...line.sku,
            },
          }),
        ),
    },

    quote: {
      ...quote,
      cart: {
        ...quote.cart,
      },
      merchandiseSubtotal: {
        ...quote.merchandiseSubtotal,
      },
      lines:
        quote.lines.map(
          (line) => ({
            ...line,
            sku: {
              ...line.sku,
            },
            approvedPrice: {
              ...line.approvedPrice,
            },
            unitPrice: {
              ...line.unitPrice,
            },
            merchandiseSubtotal: {
              ...line.merchandiseSubtotal,
            },
          }),
        ),
    },

    fulfillmentIntent: {
      ...fulfillmentIntent,
      quote: {
        ...fulfillmentIntent.quote,
      },
    },

    skuSelections:
      request.capacityRequirements.map(
        (line, index) => ({
          sku: {
            ...line.sku,
          },
          revision:
            index + 1,
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
        1,
    },
  };
}

function commandFixture(
  count = 3,
  method = "personal-delivery",
) {
  const selection =
    baseFixture(
      count,
      method,
    );

  const order =
    createInitialFoodPhysicalOrderVersion(
      {
        id:
          "food-physical-order:007p",
        version:
          1,
      },
      selection.quote,
      selection.fulfillmentIntent,
      selection.request,
    );

  return {
    reservationId:
      "opaque:007p",
    ...selection,

    order: {
      ...order,

      quote: {
        ...order.quote,
      },

      fulfillmentIntent: {
        ...order.fulfillmentIntent,
      },

      reservationRequest: {
        ...order.reservationRequest,

        capacityRequirements:
          order.reservationRequest.capacityRequirements.map(
            (line) => ({
              ...line,
              sku: {
                ...line.sku,
              },
            }),
          ),
      },

      lines:
        order.lines.map(
          (line) => ({
            ...line,
            sku: {
              ...line.sku,
            },
            approvedPrice: {
              ...line.approvedPrice,
            },
            unitPrice: {
              ...line.unitPrice,
            },
            merchandiseSubtotal: {
              ...line.merchandiseSubtotal,
            },
          }),
        ),

      merchandiseSubtotal: {
        ...order.merchandiseSubtotal,
      },
    },
  };
}

function fixture(
  count = 3,
  method = "personal-delivery",
) {
  const commandInput =
    commandFixture(
      count,
      method,
    );

  return {
    commandInput,

    observations: {
      skuObservations:
        commandInput.skuSelections.map(
          (selection) => ({
            sku: {
              ...selection.sku,
            },
            observedHighestRecordedRevision:
              selection.revision,
          }),
        ),

      slotObservation: {
        method:
          commandInput.slotSelection.method,
        locationReference:
          commandInput.slotSelection.locationReference,
        windowReference:
          commandInput.slotSelection.windowReference,
        observedHighestRecordedRevision:
          commandInput.slotSelection.revision,
      },
    },
  };
}


function record(
  input: unknown,
): Record<PropertyKey, unknown> {
  return input as Record<PropertyKey, unknown>;
}

function deeplyFrozen(
  input: unknown,
): void {
  if (
    input !== null &&
    typeof input === "object"
  ) {
    assert.ok(
      Object.isFrozen(input),
    );

    Object.values(input)
      .forEach(deeplyFrozen);
  }
}

function scoped(
  input: unknown,
) {
  const result =
    derive(input);

  assert.equal(
    result.outcome,
    "scoped",
  );

  if (
    result.outcome !==
    "scoped"
  ) {
    throw new Error(
      "Expected scoped outcome",
    );
  }

  deeplyFrozen(result);

  return result.value;
}

function invalid(
  input: unknown,
): void {
  const result =
    derive(input);

  assert.deepEqual(
    result,
    {
      outcome:
        "invalid",
    },
  );

  assert.ok(
    Object.isFrozen(result),
  );
}

for (
  const count of
    [
      1,
      3,
    ]
) {
  for (
    const method of
      [
        "personal-delivery",
        "meetup",
      ]
  ) {
    test(
      `007P ${count} SKU ${method} derives canonical governing commitment scopes`,
      () => {
        const input =
          fixture(
            count,
            method,
          );

        const governingResult =
          evaluateFoodReservationCapacityGoverningSourcePolicy(
            input,
          );

        assert.equal(
          governingResult.outcome,
          "matches-policy",
        );

        if (
          governingResult.outcome !==
          "matches-policy"
        ) {
          throw new Error(
            "Expected governing match",
          );
        }

        const value =
          scoped(input);

        assert.equal(
          value.kind,
          KIND,
        );

        assert.equal(
          value.policyVersion,
          1,
        );

        assert.deepEqual(
          value.governing,
          governingResult.value,
        );

        assert.equal(
          value.governing.kind,
          FOOD_RESERVATION_CAPACITY_GOVERNING_SOURCE_POLICY_KIND,
        );

        assert.deepEqual(
          value.skuScopes,
          input.commandInput.skuSelections.map(
            (selection) => ({
              sku:
                selection.sku,
              governingRevision:
                selection.revision,
            }),
          ),
        );

        assert.deepEqual(
          value.slotScope,
          {
            method:
              input.commandInput.slotSelection.method,
            locationReference:
              input.commandInput.slotSelection.locationReference,
            windowReference:
              input.commandInput.slotSelection.windowReference,
            governingRevision:
              input.commandInput.slotSelection.revision,
          },
        );

        assert.deepEqual(
          Object.keys(value).sort(),
          [
            "kind",
            "policyVersion",
            "governing",
            "skuScopes",
            "slotScope",
          ].sort(),
        );
      },
    );
  }
}

test(
  "007P uses observed governing revisions and preserves canonical command order",
  () => {
    const input =
      fixture();

    const revisions =
      [
        7,
        11,
        19,
      ];

    input.commandInput.skuSelections
      .forEach(
        (selection, index) => {
          selection.revision =
            revisions[index]!;
        },
      );

    input.observations.skuObservations
      .forEach(
        (observation, index) => {
          observation.observedHighestRecordedRevision =
            revisions[index]!;
        },
      );

    input.commandInput.slotSelection.revision =
      23;

    input.observations.slotObservation
      .observedHighestRecordedRevision =
        23;

    input.observations.skuObservations
      .reverse();

    const value =
      scoped(input);

    assert.deepEqual(
      value.skuScopes.map(
        (scope) =>
          scope.governingRevision,
      ),
      revisions,
    );

    assert.deepEqual(
      value.skuScopes.map(
        (scope) =>
          scope.sku,
      ),
      input.commandInput.request
        .capacityRequirements.map(
          (line) =>
            line.sku,
        ),
    );

    assert.equal(
      value.slotScope
        .governingRevision,
      23,
    );
  },
);

test(
  "007P refuses a valid complete FOOD-007O revision inequality",
  () => {
    const input =
      fixture();

    input.observations
      .skuObservations[0]!
      .observedHighestRecordedRevision++;

    const governing =
      evaluateFoodReservationCapacityGoverningSourcePolicy(
        input,
      );

    assert.equal(
      governing.outcome,
      "does-not-match-policy",
    );

    invalid(input);
  },
);

test(
  "007P refuses slot governing revision inequality",
  () => {
    const input =
      fixture();

    input.observations
      .slotObservation
      .observedHighestRecordedRevision++;

    const governing =
      evaluateFoodReservationCapacityGoverningSourcePolicy(
        input,
      );

    assert.equal(
      governing.outcome,
      "does-not-match-policy",
    );

    invalid(input);
  },
);

test(
  "007P delegates malformed-input rejection to FOOD-007O",
  () => {
    const inputs:
      unknown[] =
      [
        null,
        undefined,
        true,
        1,
        "x",
        [],
        {},
      ];

    for (
      const input of
        inputs
    ) {
      invalid(input);
    }

    const extra =
      fixture();

    record(extra)
      .policyVersion =
        1;

    invalid(extra);
  },
);

test(
  "007P inherits hostile accessor rejection without invoking caller getter",
  () => {
    const input =
      fixture();

    let calls =
      0;

    Object.defineProperty(
      input.observations,
      "slotObservation",
      {
        enumerable:
          true,
        configurable:
          true,
        get() {
          calls++;

          return null;
        },
      },
    );

    invalid(input);

    assert.equal(
      calls,
      0,
    );
  },
);

test(
  "007P inherits symbol and sparse-array rejection",
  () => {
    const symbolInput =
      fixture();

    Object.defineProperty(
      symbolInput.observations,
      Symbol("unexpected"),
      {
        enumerable:
          true,
        value:
          true,
      },
    );

    invalid(symbolInput);

    const sparse =
      fixture();

    Reflect.deleteProperty(
      sparse.observations.skuObservations,
      "0",
    );

    invalid(sparse);
  },
);

test(
  "007P output is detached and deeply frozen",
  () => {
    const input =
      fixture();

    const value =
      scoped(input);

    const before =
      structuredClone(value);

    assert.ok(
      !Object.isFrozen(input),
    );

    assert.ok(
      !Object.isFrozen(
        input.commandInput,
      ),
    );

    input.commandInput
      .skuSelections[0]!
      .revision =
        97;

    record(
      input.commandInput
        .skuSelections[0]!
        .sku,
    ).id =
      "food-sku:mutated";

    input.observations
      .skuObservations[0]!
      .observedHighestRecordedRevision =
        97;

    input.observations
      .skuObservations
      .reverse();

    input.commandInput
      .slotSelection
      .revision =
        99;

    input.observations
      .slotObservation
      .observedHighestRecordedRevision =
        99;

    assert.deepEqual(
      value,
      before,
    );

    deeplyFrozen(value);
  },
);

test(
  "007P result surface contains no quantity arithmetic or operational authority",
  () => {
    const value =
      scoped(
        fixture(),
      );

    const serialized =
      JSON.stringify(value)
        .toLowerCase();

    for (
      const forbidden of
        [
          '"capacityunits"',
          '"recordedheldquantity"',
          '"recordedcapacitydelta"',
          '"recordeddemandadjustedcapacitydelta"',
          '"remainingcapacity"',
          '"reservablequantity"',
          '"availabletopromise"',
          '"sufficient"',
          '"insufficient"',
          '"accepted"',
          '"rejected"',
          '"heldquantity"',
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
  "007P source is pure policy composition with no held reader or arithmetic",
  () => {
    const source =
      readFileSync(
        new URL(
          "./reservation-capacity-commitment-scope.ts",
          import.meta.url,
        ),
        "utf8",
      );

    assert.match(
      source,
      /evaluateFoodReservationCapacityGoverningSourcePolicy/,
    );

    assert.match(
      source,
      /governingResult\.outcome\s*!==\s*"matches-policy"/,
    );

    assert.match(
      source,
      /observedHighestRecordedRevision/,
    );

    assert.doesNotMatch(
      source,
      /d1-exact-revision-recorded-held-capacity-commitment-read|reservation-selection-recorded-held-commitment-resolution|reservation-selection-recorded-capacity-arithmetic|reservation-demand-recorded-capacity-arithmetic/,
    );

    assert.doesNotMatch(
      source,
      /\bD1Database\b|\.prepare\(|\.bind\(|\.batch\(|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bUPSERT\b/i,
    );

    assert.doesNotMatch(
      source,
      /capacityRevision|recordedHeldQuantity|capacityUnits|recordedCapacityDelta|recordedDemandAdjustedCapacityDelta/,
    );

    assert.doesNotMatch(
      source,
      /createInitialFoodReservationAcceptanceVersion|reservation-acceptance-domain|acceptedOn/,
    );

    assert.doesNotMatch(
      source,
      /Date\.now|new Date|Math\.random|randomUUID|process\.env|fetch\s*\(/,
    );
  },
);

test(
  "007P specification locks cumulative-through-governing-revision v1",
  () => {
    const spec =
      JSON.parse(
        readFileSync(
          new URL(
            "../../../.river-dev/specifications/food-007p-reservation-capacity-commitment-scope.json",
            import.meta.url,
          ),
          "utf8",
        ),
      );

    assert.equal(
      spec.id,
      "FOOD-007P",
    );

    assert.equal(
      spec.startingHead,
      "14aa40252faf1f2ba0efb7ad1f0c6f77c837a85e",
    );

    assert.equal(
      spec.kind,
      "reservation-capacity-commitment-scope",
    );

    assert.equal(
      spec.classification.candidate,
      "B",
    );

    assert.equal(
      spec.classification.name,
      "cumulative-through-governing-revision",
    );

    assert.equal(
      spec.classification.policyVersion,
      1,
    );

    assert.equal(
      spec.scopeBoundary.comparison,
      "capacityRevision <= governingRevision",
    );

    assert.equal(
      spec.scopeBoundary.crossStreamComparison,
      false,
    );

    assert.equal(
      spec.governingPrerequisite.source,
      "FOOD-007O",
    );

    assert.equal(
      spec.governingPrerequisite.requiredOutcome,
      "matches-policy",
    );

    assert.match(
      spec.historicalRevisionBinding,
      /does not rewrite/i,
    );

    assert.match(
      spec.carryForwardPolicy,
      /earlier recorded held commitments remain/i,
    );

    assert.match(
      spec.capacityRevisionMeaning,
      /not independent reservable pools/i,
    );

    assert.match(
      spec.noImplicitReset,
      /no reset/i,
    );

    assert.match(
      spec.futureReaderRule,
      /capacity_revision <= governingRevision/,
    );

    assert.match(
      spec.food007jRelationship,
      /exact-revision historical/i,
    );

    assert.match(
      spec.food007kRelationship,
      /historical exact-selection evidence/i,
    );

    assert.match(
      spec.food007lRelationship,
      /does not silently change/i,
    );

    assert.match(
      spec.food007mRelationship,
      /not a dependency/i,
    );

    assert.equal(
      spec.migrationImpact,
      "none",
    );

    assert.equal(
      spec.productionImpact,
      "none",
    );

    assert.equal(
      spec.nextDependency,
      "Reservation Governing-Scope Recorded-Held Commitment Read",
    );

    for (
      const claim of
        [
          "current physical QOH",
          "physical currentness",
          "physical truth",
          "remaining capacity",
          "available capacity",
          "reservable quantity",
          "ATP / available-to-promise",
          "capacity sufficiency",
          "capacity insufficiency",
          "reservation admission",
          "permission to reserve",
          "reservation acceptance",
          "durable hold creation",
          "reservation mutation success",
          "atomic reservation",
          "oversell prevention",
          "slot-overbooking prevention",
          "release",
          "expiration",
          "cancellation",
          "replacement",
          "consumption",
          "rescheduling",
          "perpetual governing validity",
        ]
    ) {
      assert.ok(
        spec.nonClaims.includes(
          claim,
        ),
        claim,
      );
    }
  },
);
