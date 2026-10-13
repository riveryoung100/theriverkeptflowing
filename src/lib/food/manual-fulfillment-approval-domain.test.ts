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

import * as d from "./manual-fulfillment-approval-domain";

const money = (
  minorUnits = 1200,
  currency = "USD",
) => ({
  currency,
  minorUnits,
});

function sources(
  suffix = "synthetic-m",
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
      id: createFoodSkuId(suffix),
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
          "fixture:outside-area-location",
        windowReference:
          "fixture:approved-request-window",
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

function createApproval(
  suffix = "synthetic-m",
  feeMinorUnits = 500,
) {
  const source = sources(suffix);

  const approval =
    d.createInitialFoodManualFulfillmentApprovalVersion(
      {
        id:
          d.createFoodManualFulfillmentApprovalId(
            suffix,
          ),
        version: 1,
      },
      source.order,
      source.fulfillment,
      {
        approvedAdditionalFee:
          money(feeMinorUnits),
        attribution:
          "fixture:owner-review",
        sourceReference:
          "fixture:manual-route-approval",
        approvedOn:
          "2026-10-13",
      },
    );

  return {
    ...source,
    approval,
  };
}

test(
  "manual fulfillment approval uses dedicated caller-supplied identity and initial version one",
  () => {
    assert.equal(
      d.createFoodManualFulfillmentApprovalId(
        "alpha",
      ),
      "food-manual-fulfillment-approval:alpha",
    );

    assert.equal(
      d.parseFoodManualFulfillmentApprovalId(
        "food-manual-fulfillment-approval:alpha",
      ),
      "food-manual-fulfillment-approval:alpha",
    );

    assert.throws(() =>
      d.createFoodManualFulfillmentApprovalId(
        "bad:identity",
      ),
    );

    assert.throws(() =>
      d.parseFoodManualFulfillmentApprovalId(
        "food-physical-order:alpha",
      ),
    );

    const source = sources();

    assert.throws(() =>
      d.createInitialFoodManualFulfillmentApprovalVersion(
        {
          id:
            d.createFoodManualFulfillmentApprovalId(
              "bad-version",
            ),
          version: 2,
        },
        source.order,
        source.fulfillment,
        {
          approvedAdditionalFee:
            money(500),
          attribution: "fixture",
          sourceReference: "fixture",
          approvedOn: "2026-10-13",
        },
      ),
    );
  },
);

test(
  "approval copies exact order and fulfillment terms plus explicit fee and provenance immutably",
  () => {
    const {
      approval,
      order,
      fulfillment,
    } = createApproval();

    assert.deepEqual(
      approval.order,
      {
        id: order.id,
        version: order.version,
      },
    );

    assert.deepEqual(
      approval.fulfillmentIntent,
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

    assert.deepEqual(
      approval.approvedAdditionalFee,
      money(500),
    );

    assert.deepEqual(
      approval.approval,
      {
        attribution:
          "fixture:owner-review",
        sourceReference:
          "fixture:manual-route-approval",
        approvedOn:
          "2026-10-13",
      },
    );

    assert.ok(Object.isFrozen(approval));
    assert.ok(Object.isFrozen(approval.order));
    assert.ok(
      Object.isFrozen(
        approval.fulfillmentIntent,
      ),
    );
    assert.ok(
      Object.isFrozen(
        approval.approvedAdditionalFee,
      ),
    );
    assert.ok(
      Object.isFrozen(
        approval.approval,
      ),
    );
  },
);

test(
  "approval rejects exact order or fulfillment source mismatch and snapshot drift",
  () => {
    const a = createApproval("source-a");
    const b = sources("source-b");

    assert.throws(() =>
      d.validateFoodManualFulfillmentApprovalAgainstSources(
        a.approval,
        b.order,
        a.fulfillment,
      ),
    );

    assert.throws(() =>
      d.validateFoodManualFulfillmentApprovalAgainstSources(
        a.approval,
        a.order,
        b.fulfillment,
      ),
    );

    assert.throws(() =>
      d.validateFoodManualFulfillmentApprovalAgainstSources(
        {
          ...a.approval,
          fulfillmentIntent: {
            ...a.approval
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
  "approved additional fee is nonnegative FoodMoney in exact order currency and zero is permitted",
  () => {
    const zero = createApproval(
      "zero-fee",
      0,
    );

    assert.deepEqual(
      zero.approval.approvedAdditionalFee,
      money(0),
    );

    const source = sources(
      "currency-mismatch",
    );

    assert.throws(() =>
      d.createInitialFoodManualFulfillmentApprovalVersion(
        {
          id:
            d.createFoodManualFulfillmentApprovalId(
              "currency-mismatch",
            ),
          version: 1,
        },
        source.order,
        source.fulfillment,
        {
          approvedAdditionalFee:
            money(500, "EUR"),
          attribution: "fixture",
          sourceReference: "fixture",
          approvedOn: "2026-10-13",
        },
      ),
    );

    assert.throws(() =>
      d.createInitialFoodManualFulfillmentApprovalVersion(
        {
          id:
            d.createFoodManualFulfillmentApprovalId(
              "negative-fee",
            ),
          version: 1,
        },
        source.order,
        source.fulfillment,
        {
          approvedAdditionalFee: {
            currency: "USD",
            minorUnits: -1,
          },
          attribution: "fixture",
          sourceReference: "fixture",
          approvedOn: "2026-10-13",
        },
      ),
    );
  },
);

test(
  "approval metadata is strict caller-supplied provenance without approver authentication",
  () => {
    const source = sources(
      "metadata",
    );

    assert.throws(() =>
      d.createInitialFoodManualFulfillmentApprovalVersion(
        {
          id:
            d.createFoodManualFulfillmentApprovalId(
              "metadata",
            ),
          version: 1,
        },
        source.order,
        source.fulfillment,
        {
          approvedAdditionalFee:
            money(500),
          attribution: "fixture",
          sourceReference: "fixture",
          approvedOn: "2026-10-13",
          authenticatedApprover: true,
        },
      ),
    );
  },
);

test(
  "historical approval may bind a cancelled exact order version without reviving it",
  () => {
    const source = sources(
      "cancelled-m",
    );

    const cancelled =
      cancelFoodPhysicalOrderVersion(
        source.order,
        {
          id: source.order.id,
          version: 2,
        },
      );

    const approval =
      d.createInitialFoodManualFulfillmentApprovalVersion(
        {
          id:
            d.createFoodManualFulfillmentApprovalId(
              "cancelled-m",
            ),
          version: 1,
        },
        cancelled,
        source.fulfillment,
        {
          approvedAdditionalFee:
            money(500),
          attribution:
            "fixture:owner-review",
          sourceReference:
            "fixture:historical",
          approvedOn:
            "2026-10-13",
        },
      );

    assert.equal(
      approval.order.id,
      cancelled.id,
    );

    assert.equal(
      approval.order.version,
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
        key in approval,
        false,
      );
    }
  },
);

test(
  "approval cannot smuggle policy calculation payment inventory fulfillment sale accounting or rewards authority",
  () => {
    const { approval } =
      createApproval();

    for (const key of [
      "insideServiceArea",
      "outsideServiceArea",
      "distance",
      "distanceMiles",
      "radius",
      "route",
      "routeCost",
      "geocoded",
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
        key in approval,
        false,
      );
    }
  },
);

test(
  "source remains pure with no radius geocoding routing persistence provider clock or operational effects",
  () => {
    const source = readFileSync(
      new URL(
        "./manual-fulfillment-approval-domain.ts",
        import.meta.url,
      ),
      "utf8",
    );

    assert.doesNotMatch(
      source,
      /Date\.now|new Date|process\.env|fetch\s*\(|Math\.random|D1Database|database|repository|INSERT|UPDATE|DELETE|Stripe|Square|PayPal|webhook|geocode|geocoding|maps API|route optimization|distanceMiles\s*:|radius\s*:|checkoutReady\s*:|paymentReady\s*:|paymentLink\s*:|dispatchReady\s*:|completedSale\s*:|revenue\s*:|ledger\s*:/i,
    );
  },
);
