import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createFoodApprovedCommercialPriceId,
  createInitialFoodApprovedCommercialPrice,
} from "./approved-commercial-price-domain";
import {
  createFoodCartId,
  createFoodMerchandiseQuoteId,
  createInitialFoodCartVersion,
  createInitialFoodMerchandiseQuoteVersion,
} from "./cart-quote-domain";
import {
  createFoodFulfillmentIntentId,
  createFoodReservationRequestId,
  createInitialFoodFulfillmentIntentVersion,
  createInitialFoodReservationRequestVersion,
} from "./fulfillment-capacity-reservation-domain";
import {
  createFoodPackageDefinitionId,
  createFoodSkuId,
  validateFoodPackageDefinitionVersion,
  validateFoodSkuVersion,
} from "./package-sku-domain";
import {
  cancelFoodPhysicalOrderVersion,
  createFoodPhysicalOrderId,
  createInitialFoodPhysicalOrderVersion,
} from "./physical-order-domain";

import * as d from "./fulfillment-policy-decision-domain";

const money = (
  minorUnits = 1200,
  currency = "USD",
) => ({
  currency,
  minorUnits,
});

function sources(
  suffix = "synthetic-n",
) {
  const packageDefinition =
    validateFoodPackageDefinitionVersion({
      id:
        createFoodPackageDefinitionId(
          suffix,
        ),
      version: 1,
      descriptor: "Synthetic package",
    });

  const sku =
    validateFoodSkuVersion({
      id:
        createFoodSkuId(suffix),
      version: 1,
      servingOffer: {
        offerId:
          `food-serving-offer:${suffix}` as never,
        version: 1,
      },
      package: {
        id: packageDefinition.id,
        version:
          packageDefinition.version,
      },
    });

  const price =
    createInitialFoodApprovedCommercialPrice(
      {
        id:
          createFoodApprovedCommercialPriceId(
            suffix,
          ),
        version: 1,
        sku: {
          id: sku.id,
          version: sku.version,
        },
        money: money(),
        approval: {
          attribution:
            "fixture:synthetic",
          sourceReference:
            "fixture:price",
          approvedOn:
            "2026-10-13",
        },
      },
      sku,
    );

  const cart =
    createInitialFoodCartVersion({
      id: createFoodCartId(suffix),
      version: 1,
      lines: [
        {
          sku: {
            id: sku.id,
            version: sku.version,
          },
          quantity: 2,
        },
      ],
    });

  const quote =
    createInitialFoodMerchandiseQuoteVersion(
      {
        id:
          createFoodMerchandiseQuoteId(
            suffix,
          ),
        version: 1,
      },
      cart,
      [sku],
      [price],
    );

  const fulfillment =
    createInitialFoodFulfillmentIntentVersion(
      {
        id:
          createFoodFulfillmentIntentId(
            suffix,
          ),
        version: 1,
      },
      quote,
      {
        method: "personal-delivery",
        locationReference:
          "fixture:policy-location",
        windowReference:
          "fixture:policy-window",
      },
    );

  const reservation =
    createInitialFoodReservationRequestVersion(
      {
        id:
          createFoodReservationRequestId(
            suffix,
          ),
        version: 1,
      },
      quote,
      fulfillment,
    );

  const order =
    createInitialFoodPhysicalOrderVersion(
      {
        id:
          createFoodPhysicalOrderId(
            suffix,
          ),
        version: 1,
      },
      quote,
      fulfillment,
      reservation,
    );

  return {
    fulfillment,
    reservation,
    order,
  };
}

function createDecision(
  suffix = "synthetic-n",
  manualApprovalRequirement:
    d.FoodManualApprovalRequirement =
      "required",
) {
  const source = sources(suffix);

  const decision =
    d.createInitialFoodFulfillmentPolicyDecisionVersion(
      {
        id:
          d.createFoodFulfillmentPolicyDecisionId(
            suffix,
          ),
        version: 1,
      },
      source.order,
      source.fulfillment,
      {
        manualApprovalRequirement,
        attribution:
          "fixture:trusted-policy",
        policyReference:
          "fixture:fulfillment-policy",
        decidedOn:
          "2026-10-13",
      },
    );

  return {
    ...source,
    decision,
  };
}

test(
  "fulfillment policy decision has dedicated caller-supplied identity initial version one and strict requirement values",
  () => {
    assert.equal(
      d.createFoodFulfillmentPolicyDecisionId(
        "alpha",
      ),
      "food-fulfillment-policy-decision:alpha",
    );

    assert.equal(
      d.parseFoodFulfillmentPolicyDecisionId(
        "food-fulfillment-policy-decision:alpha",
      ),
      "food-fulfillment-policy-decision:alpha",
    );

    assert.equal(
      d.validateFoodManualApprovalRequirement(
        "required",
      ),
      "required",
    );

    assert.equal(
      d.validateFoodManualApprovalRequirement(
        "not-required",
      ),
      "not-required",
    );

    assert.throws(() =>
      d.validateFoodManualApprovalRequirement(
        "approved",
      ),
    );

    assert.throws(() =>
      d.createFoodFulfillmentPolicyDecisionId(
        "bad:identity",
      ),
    );

    const source = sources();

    assert.throws(() =>
      d.createInitialFoodFulfillmentPolicyDecisionVersion(
        {
          id:
            d.createFoodFulfillmentPolicyDecisionId(
              "bad-version",
            ),
          version: 2,
        },
        source.order,
        source.fulfillment,
        {
          manualApprovalRequirement:
            "required",
          attribution: "fixture",
          policyReference: "fixture",
          decidedOn: "2026-10-13",
        },
      ),
    );
  },
);

test(
  "decision copies exact order and fulfillment snapshot with explicit immutable policy provenance",
  () => {
    const {
      decision,
      order,
      fulfillment,
    } = createDecision();

    assert.deepEqual(
      decision.order,
      {
        id: order.id,
        version: order.version,
      },
    );

    assert.deepEqual(
      decision.fulfillmentIntent,
      {
        id: fulfillment.id,
        version: fulfillment.version,
        method: fulfillment.method,
        locationReference:
          fulfillment.locationReference,
        windowReference:
          fulfillment.windowReference,
      },
    );

    assert.equal(
      decision.manualApprovalRequirement,
      "required",
    );

    assert.deepEqual(
      decision.decision,
      {
        attribution:
          "fixture:trusted-policy",
        policyReference:
          "fixture:fulfillment-policy",
        decidedOn:
          "2026-10-13",
      },
    );

    assert.ok(Object.isFrozen(decision));
    assert.ok(Object.isFrozen(decision.order));
    assert.ok(
      Object.isFrozen(
        decision.fulfillmentIntent,
      ),
    );
    assert.ok(
      Object.isFrozen(
        decision.decision,
      ),
    );
  },
);

test(
  "decision rejects exact order or fulfillment source mismatch and snapshot drift",
  () => {
    const a =
      createDecision("source-a");

    const b =
      sources("source-b");

    assert.throws(() =>
      d.validateFoodFulfillmentPolicyDecisionAgainstSources(
        a.decision,
        b.order,
        a.fulfillment,
      ),
    );

    assert.throws(() =>
      d.validateFoodFulfillmentPolicyDecisionAgainstSources(
        a.decision,
        a.order,
        b.fulfillment,
      ),
    );

    assert.throws(() =>
      d.validateFoodFulfillmentPolicyDecisionAgainstSources(
        {
          ...a.decision,
          fulfillmentIntent: {
            ...a.decision
              .fulfillmentIntent,
            windowReference:
              "fixture:different-window",
          },
        },
        a.order,
        a.fulfillment,
      ),
    );
  },
);

test(
  "required and not-required are policy outcomes without geographic meaning",
  () => {
    const required =
      createDecision(
        "required-policy",
        "required",
      );

    const notRequired =
      createDecision(
        "not-required-policy",
        "not-required",
      );

    assert.equal(
      required.decision
        .manualApprovalRequirement,
      "required",
    );

    assert.equal(
      notRequired.decision
        .manualApprovalRequirement,
      "not-required",
    );

    for (const value of [
      required.decision,
      notRequired.decision,
    ]) {
      assert.equal(
        "insideServiceArea" in value,
        false,
      );

      assert.equal(
        "outsideServiceArea" in value,
        false,
      );

      assert.equal(
        "distanceMiles" in value,
        false,
      );

      assert.equal(
        "radius" in value,
        false,
      );
    }
  },
);

test(
  "policy metadata is strict caller-supplied provenance without source authentication",
  () => {
    const source =
      sources("metadata");

    assert.throws(() =>
      d.createInitialFoodFulfillmentPolicyDecisionVersion(
        {
          id:
            d.createFoodFulfillmentPolicyDecisionId(
              "metadata",
            ),
          version: 1,
        },
        source.order,
        source.fulfillment,
        {
          manualApprovalRequirement:
            "required",
          attribution: "fixture",
          policyReference: "fixture",
          decidedOn: "2026-10-13",
          authenticatedPolicy: true,
        },
      ),
    );
  },
);

test(
  "historical policy decision may bind a cancelled exact order without reviving it",
  () => {
    const source =
      sources("cancelled-n");

    const cancelled =
      cancelFoodPhysicalOrderVersion(
        source.order,
        {
          id: source.order.id,
          version: 2,
        },
      );

    const decision =
      d.createInitialFoodFulfillmentPolicyDecisionVersion(
        {
          id:
            d.createFoodFulfillmentPolicyDecisionId(
              "cancelled-n",
            ),
          version: 1,
        },
        cancelled,
        source.fulfillment,
        {
          manualApprovalRequirement:
            "required",
          attribution:
            "fixture:trusted-policy",
          policyReference:
            "fixture:historical",
          decidedOn:
            "2026-10-13",
        },
      );

    assert.equal(
      decision.order.id,
      cancelled.id,
    );

    assert.equal(
      decision.order.version,
      cancelled.version,
    );

    assert.equal(
      cancelled.state,
      "cancelled",
    );

    for (const key of [
      "revived",
      "orderState",
      "checkoutReady",
      "paymentReady",
      "dispatchReady",
      "fulfilled",
    ]) {
      assert.equal(
        key in decision,
        false,
      );
    }
  },
);

test(
  "policy decision cannot smuggle approval fee inventory payment fulfillment sale accounting or rewards authority",
  () => {
    const { decision } =
      createDecision();

    for (const key of [
      "manualApprovalGranted",
      "manualApprovalId",
      "approvedAdditionalFee",
      "insideServiceArea",
      "outsideServiceArea",
      "distance",
      "distanceMiles",
      "radius",
      "route",
      "routeCost",
      "reservationAccepted",
      "quantityOnHand",
      "availableQuantity",
      "reservedQuantity",
      "inventory",
      "amountDue",
      "checkoutReady",
      "paymentReady",
      "paymentLink",
      "checkoutSession",
      "paymentStatus",
      "paidInFull",
      "prepareReady",
      "dispatchReady",
      "fulfilled",
      "completedSale",
      "revenue",
      "accounting",
      "ledger",
      "rewardsEligible",
      "verifiedPurchase",
    ]) {
      assert.equal(
        key in decision,
        false,
      );
    }
  },
);

test(
  "source is pure with no geography fee persistence provider payment or operational side effects",
  () => {
    const source = readFileSync(
      new URL(
        "./fulfillment-policy-decision-domain.ts",
        import.meta.url,
      ),
      "utf8",
    );

    assert.doesNotMatch(
      source,
      /Date\.now|new Date|process\.env|fetch\s*\(|Math\.random|D1Database|database|repository|INSERT|UPDATE|DELETE|Stripe|Square|PayPal|webhook|geocode|geocoding|maps API|route optimization|distanceMiles\s*:|radius\s*:|approvedAdditionalFee\s*:|amountDue\s*:|checkoutReady\s*:|paymentReady\s*:|paymentLink\s*:|dispatchReady\s*:|completedSale\s*:|revenue\s*:|ledger\s*:/i,
    );
  },
);
