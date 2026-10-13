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

import * as d from "./reservation-acceptance-domain";

const money = (
  minorUnits = 1200,
  currency = "USD",
) => ({
  currency,
  minorUnits,
});

function sources(
  suffix = "synthetic-l",
) {
  const packageDefinition =
    validateFoodPackageDefinitionVersion({
      id: createFoodPackageDefinitionId(
        suffix,
      ),
      version: 1,
      descriptor: "Synthetic package",
    });

  const sku = validateFoodSkuVersion({
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
          approvedOn: "2026-10-13",
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
        method: "meetup",
        locationReference:
          "fixture:location",
        windowReference:
          "fixture:window",
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

function createAcceptance(
  suffix = "synthetic-l",
) {
  const source = sources(suffix);

  const acceptance =
    d.createInitialFoodReservationAcceptanceVersion(
      {
        id:
          d.createFoodReservationAcceptanceId(
            suffix,
          ),
        version: 1,
      },
      source.order,
      source.reservation,
      source.fulfillment,
      {
        attribution:
          "fixture:capacity-service",
        sourceReference:
          "fixture:atomic-reservation",
        acceptedOn: "2026-10-13",
      },
    );

  return {
    ...source,
    acceptance,
  };
}

test(
  "acceptance identity is dedicated caller-supplied and initial version is exactly one",
  () => {
    assert.equal(
      d.createFoodReservationAcceptanceId(
        "alpha",
      ),
      "food-reservation-acceptance:alpha",
    );

    assert.equal(
      d.parseFoodReservationAcceptanceId(
        "food-reservation-acceptance:alpha",
      ),
      "food-reservation-acceptance:alpha",
    );

    assert.throws(() =>
      d.createFoodReservationAcceptanceId(
        "bad:identity",
      ),
    );

    assert.throws(() =>
      d.parseFoodReservationAcceptanceId(
        "food-reservation-request:alpha",
      ),
    );

    const source = sources();

    assert.throws(() =>
      d.createInitialFoodReservationAcceptanceVersion(
        {
          id:
            d.createFoodReservationAcceptanceId(
              "bad-version",
            ),
          version: 2,
        },
        source.order,
        source.reservation,
        source.fulfillment,
        {
          attribution: "fixture",
          sourceReference: "fixture",
          acceptedOn: "2026-10-13",
        },
      ),
    );
  },
);

test(
  "acceptance copies exact order request fulfillment and capacity snapshots immutably",
  () => {
    const {
      acceptance,
      order,
      reservation,
      fulfillment,
    } = createAcceptance();

    assert.deepEqual(
      acceptance.order,
      {
        id: order.id,
        version: order.version,
      },
    );

    assert.deepEqual(
      acceptance.reservationRequest,
      {
        id: reservation.id,
        version: reservation.version,
      },
    );

    assert.deepEqual(
      acceptance.fulfillmentIntent,
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
      acceptance.capacityRequirements,
      reservation.capacityRequirements,
    );

    assert.ok(Object.isFrozen(acceptance));
    assert.ok(Object.isFrozen(acceptance.order));
    assert.ok(
      Object.isFrozen(
        acceptance.reservationRequest,
      ),
    );
    assert.ok(
      Object.isFrozen(
        acceptance.fulfillmentIntent,
      ),
    );
    assert.ok(
      Object.isFrozen(
        acceptance.capacityRequirements,
      ),
    );
    assert.ok(
      Object.isFrozen(
        acceptance.capacityRequirements[0],
      ),
    );
    assert.ok(
      Object.isFrozen(
        acceptance.acceptance,
      ),
    );
  },
);

test(
  "acceptance rejects order request and fulfillment source mismatch",
  () => {
    const a = sources("source-a");
    const b = sources("source-b");

    assert.throws(() =>
      d.createInitialFoodReservationAcceptanceVersion(
        {
          id:
            d.createFoodReservationAcceptanceId(
              "mismatch-order",
            ),
          version: 1,
        },
        b.order,
        a.reservation,
        a.fulfillment,
        {
          attribution: "fixture",
          sourceReference: "fixture",
          acceptedOn: "2026-10-13",
        },
      ),
    );

    assert.throws(() =>
      d.createInitialFoodReservationAcceptanceVersion(
        {
          id:
            d.createFoodReservationAcceptanceId(
              "mismatch-request",
            ),
          version: 1,
        },
        a.order,
        b.reservation,
        a.fulfillment,
        {
          attribution: "fixture",
          sourceReference: "fixture",
          acceptedOn: "2026-10-13",
        },
      ),
    );

    assert.throws(() =>
      d.createInitialFoodReservationAcceptanceVersion(
        {
          id:
            d.createFoodReservationAcceptanceId(
              "mismatch-intent",
            ),
          version: 1,
        },
        a.order,
        a.reservation,
        b.fulfillment,
        {
          attribution: "fixture",
          sourceReference: "fixture",
          acceptedOn: "2026-10-13",
        },
      ),
    );
  },
);

test(
  "validation rejects fulfillment or accepted-capacity snapshot drift",
  () => {
    const source = createAcceptance();

    assert.throws(() =>
      d.validateFoodReservationAcceptanceAgainstSources(
        {
          ...source.acceptance,
          fulfillmentIntent: {
            ...source.acceptance
              .fulfillmentIntent,
            windowReference:
              "fixture:different-window",
          },
        },
        source.order,
        source.reservation,
        source.fulfillment,
      ),
    );

    assert.throws(() =>
      d.validateFoodReservationAcceptanceAgainstSources(
        {
          ...source.acceptance,
          capacityRequirements:
            source.acceptance
              .capacityRequirements.map(
                (line, index) =>
                  index === 0
                    ? {
                        ...line,
                        quantity:
                          line.quantity + 1,
                      }
                    : line,
              ),
        },
        source.order,
        source.reservation,
        source.fulfillment,
      ),
    );
  },
);

test(
  "acceptance metadata is explicit strict caller-supplied provenance without source authentication",
  () => {
    const source = createAcceptance();

    assert.deepEqual(
      source.acceptance.acceptance,
      {
        attribution:
          "fixture:capacity-service",
        sourceReference:
          "fixture:atomic-reservation",
        acceptedOn: "2026-10-13",
      },
    );

    assert.throws(() =>
      d.createInitialFoodReservationAcceptanceVersion(
        {
          id:
            d.createFoodReservationAcceptanceId(
              "bad-metadata",
            ),
          version: 1,
        },
        source.order,
        source.reservation,
        source.fulfillment,
        {
          attribution: "fixture",
          sourceReference: "fixture",
          acceptedOn: "2026-10-13",
          authenticated: true,
        },
      ),
    );
  },
);

test(
  "late acceptance evidence may bind a cancelled exact order version without reviving it",
  () => {
    const source = sources(
      "cancelled-l",
    );

    const cancelled =
      cancelFoodPhysicalOrderVersion(
        source.order,
        {
          id: source.order.id,
          version: 2,
        },
      );

    const acceptance =
      d.createInitialFoodReservationAcceptanceVersion(
        {
          id:
            d.createFoodReservationAcceptanceId(
              "cancelled-l",
            ),
          version: 1,
        },
        cancelled,
        source.reservation,
        source.fulfillment,
        {
          attribution:
            "fixture:capacity-service",
          sourceReference:
            "fixture:late-acceptance",
          acceptedOn: "2026-10-13",
        },
      );

    assert.equal(
      acceptance.order.id,
      cancelled.id,
    );

    assert.equal(
      acceptance.order.version,
      cancelled.version,
    );

    assert.equal(
      cancelled.state,
      "cancelled",
    );

    for (const key of [
      "revived",
      "orderState",
      "dispatchReady",
      "fulfilled",
    ]) {
      assert.equal(
        key in acceptance,
        false,
      );
    }
  },
);

test(
  "acceptance cannot smuggle inventory checkout payment fulfillment sale accounting or rewards authority",
  () => {
    const { acceptance } =
      createAcceptance();

    for (const key of [
      "quantityOnHand",
      "availableQuantity",
      "reservedQuantity",
      "inventory",
      "inventoryMovement",
      "slotInventory",
      "checkoutReady",
      "paymentReady",
      "paymentStatus",
      "paidInFull",
      "prepareReady",
      "scheduled",
      "preparing",
      "ready",
      "dispatchReady",
      "dispatched",
      "handedOver",
      "fulfilled",
      "completedSale",
      "revenue",
      "accounting",
      "ledger",
      "rewardsEligible",
      "verifiedPurchase",
      "refund",
      "release",
      "expiresAt",
    ]) {
      assert.equal(
        key in acceptance,
        false,
      );
    }
  },
);

test(
  "source is pure and contains no persistence clock provider payment or operational side effects",
  () => {
    const source = readFileSync(
      new URL(
        "./reservation-acceptance-domain.ts",
        import.meta.url,
      ),
      "utf8",
    );

    assert.doesNotMatch(
      source,
      /Date\.now|new Date|process\.env|fetch\s*\(|Math\.random|D1Database|database|repository|INSERT|UPDATE|DELETE|Stripe|Square|PayPal|webhook|electronic-payment-confirmation-domain|cash-payment-evidence-domain|payment-reconciliation-domain|quantityOnHand\s*:|reservedQuantity\s*:|inventoryMovement\s*:|checkoutReady\s*:|paymentReady\s*:|dispatchReady\s*:|completedSale\s*:|revenue\s*:|ledger\s*:|rewardsEligible\s*:/i,
    );
  },
);
