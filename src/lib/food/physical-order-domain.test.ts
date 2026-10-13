import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    createInitialFoodCartVersion,
    createInitialFoodMerchandiseQuoteVersion,
} from "./cart-quote-domain";

import {
    createInitialFoodFulfillmentIntentVersion,
    createInitialFoodReservationRequestVersion,
} from "./fulfillment-capacity-reservation-domain";

import {
    cancelFoodPhysicalOrderVersion,
    createFoodPhysicalOrderId,
    createInitialFoodPhysicalOrderVersion,
    validateFoodPhysicalOrderAgainstSources,
    validateFoodPhysicalOrderVersion,
} from "./physical-order-domain";

function sku(
    name: string,
    version = 1,
) {
    return {
        id: `food-sku:${name}`,
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
    skuInput: ReturnType<typeof sku>,
    minorUnits: number,
) {
    return {
        id:
            `food-approved-commercial-price:${name}`,
        version: 1,
        sku: {
            id: skuInput.id,
            version: skuInput.version,
        },
        money: {
            currency: "USD",
            minorUnits,
        },
        approval: {
            attribution: "fixture:owner",
            sourceReference:
                `fixture:price:${name}`,
            approvedOn: "2026-10-13",
        },
    };
}

function sources() {
    const a = sku("order-a");
    const b = sku("order-b");

    const cart =
        createInitialFoodCartVersion({
            id: "food-cart:005e-fixture",
            version: 1,
            lines: [
                {
                    sku: {
                        id: a.id,
                        version: a.version,
                    },
                    quantity: 2,
                },
                {
                    sku: {
                        id: b.id,
                        version: b.version,
                    },
                    quantity: 3,
                },
            ],
        });

    const quote =
        createInitialFoodMerchandiseQuoteVersion(
            {
                id:
                    "food-merchandise-quote:005e-fixture",
                version: 1,
            },
            cart,
            [a, b],
            [
                approvedPrice(
                    "order-a",
                    a,
                    1200,
                ),
                approvedPrice(
                    "order-b",
                    b,
                    700,
                ),
            ],
        );

    const fulfillmentIntent =
        createInitialFoodFulfillmentIntentVersion(
            {
                id:
                    "food-fulfillment-intent:005e-fixture",
                version: 1,
            },
            quote,
            {
                method: "meetup",
                locationReference:
                    "fixture:meeting-location",
                windowReference:
                    "fixture:requested-window",
            },
        );

    const reservationRequest =
        createInitialFoodReservationRequestVersion(
            {
                id:
                    "food-reservation-request:005e-fixture",
                version: 1,
            },
            quote,
            fulfillmentIntent,
        );

    return {
        a,
        b,
        quote,
        fulfillmentIntent,
        reservationRequest,
    };
}

test("explicit exact source submission creates requested pre-payment order truth", () => {
    const {
        quote,
        fulfillmentIntent,
        reservationRequest,
    } = sources();

    const order =
        createInitialFoodPhysicalOrderVersion(
            {
                id:
                    createFoodPhysicalOrderId(
                        "order-1",
                    ),
                version: 1,
            },
            quote,
            fulfillmentIntent,
            reservationRequest,
        );

    assert.equal(
        order.state,
        "requested",
    );

    assert.equal(
        order.quote.id,
        quote.id,
    );

    assert.equal(
        order.quote.version,
        quote.version,
    );

    assert.equal(
        order.fulfillmentIntent.id,
        fulfillmentIntent.id,
    );

    assert.equal(
        order.reservationRequest.id,
        reservationRequest.id,
    );

    for (const forbidden of [
        "paid",
        "paymentStatus",
        "paymentId",
        "reserved",
        "reservationAccepted",
        "dispatchReady",
        "fulfilled",
    ]) {
        assert.equal(
            forbidden in order,
            false,
        );
    }
});

test("order copies exact immutable quote SKU price money and merchandise subtotal truth", () => {
    const {
        quote,
        fulfillmentIntent,
        reservationRequest,
    } = sources();

    const order =
        createInitialFoodPhysicalOrderVersion(
            {
                id:
                    "food-physical-order:snapshot",
                version: 1,
            },
            quote,
            fulfillmentIntent,
            reservationRequest,
        );

    assert.deepEqual(
        order.lines,
        quote.lines,
    );

    assert.deepEqual(
        order.merchandiseSubtotal,
        quote.merchandiseSubtotal,
    );

    assert.notEqual(
        order.lines,
        quote.lines,
    );

    assert.notEqual(
        order.lines[0],
        quote.lines[0],
    );

    assert(Object.isFrozen(order));
    assert(Object.isFrozen(order.lines));
    assert(Object.isFrozen(order.lines[0]));
    assert(
        Object.isFrozen(
            order.lines[0]?.sku,
        ),
    );
    assert(
        Object.isFrozen(
            order.lines[0]?.approvedPrice,
        ),
    );
    assert(
        Object.isFrozen(
            order.lines[0]?.unitPrice,
        ),
    );
    assert(
        Object.isFrozen(
            order.lines[0]
                ?.merchandiseSubtotal,
        ),
    );
    assert(
        Object.isFrozen(
            order.merchandiseSubtotal,
        ),
    );
});

test("order copies exact fulfillment and capacity-request snapshots without inventing reservation acceptance", () => {
    const {
        fulfillmentIntent,
        reservationRequest,
        quote,
    } = sources();

    const order =
        createInitialFoodPhysicalOrderVersion(
            {
                id:
                    "food-physical-order:fulfillment",
                version: 1,
            },
            quote,
            fulfillmentIntent,
            reservationRequest,
        );

    assert.deepEqual(
        order.fulfillmentIntent,
        {
            id: fulfillmentIntent.id,
            version:
                fulfillmentIntent.version,
            method:
                fulfillmentIntent.method,
            locationReference:
                fulfillmentIntent
                    .locationReference,
            windowReference:
                fulfillmentIntent
                    .windowReference,
        },
    );

    assert.deepEqual(
        order.reservationRequest
            .capacityRequirements,
        reservationRequest
            .capacityRequirements,
    );

    assert.notEqual(
        order.reservationRequest
            .capacityRequirements,
        reservationRequest
            .capacityRequirements,
    );

    for (const forbidden of [
        "reservationStatus",
        "accepted",
        "reservedQuantity",
        "availableQuantity",
        "quantityOnHand",
        "expiresAt",
    ]) {
        assert.equal(
            forbidden in
                order.reservationRequest,
            false,
        );
    }
});

test("order source validation rejects quote fulfillment and reservation drift", () => {
    const {
        quote,
        fulfillmentIntent,
        reservationRequest,
    } = sources();

    const order =
        createInitialFoodPhysicalOrderVersion(
            {
                id:
                    "food-physical-order:exact",
                version: 1,
            },
            quote,
            fulfillmentIntent,
            reservationRequest,
        );

    assert.throws(() =>
        validateFoodPhysicalOrderAgainstSources(
            {
                ...order,
                lines: [
                    {
                        ...order.lines[0],
                        quantity: 99,
                    },
                    order.lines[1],
                ],
            },
            quote,
            fulfillmentIntent,
            reservationRequest,
        ),
    );

    const otherQuote = {
        ...quote,
        id:
            "food-merchandise-quote:005e-other",
    };

    const otherFulfillmentIntent = {
        ...fulfillmentIntent,
        id:
            "food-fulfillment-intent:005e-other",
    };

    const otherReservationRequest = {
        ...reservationRequest,
        id:
            "food-reservation-request:005e-other",
    };

    assert.notEqual(
        otherQuote.id,
        quote.id,
    );

    assert.notEqual(
        otherFulfillmentIntent.id,
        fulfillmentIntent.id,
    );

    assert.notEqual(
        otherReservationRequest.id,
        reservationRequest.id,
    );

    assert.throws(() =>
        validateFoodPhysicalOrderAgainstSources(
            order,
            otherQuote,
            fulfillmentIntent,
            reservationRequest,
        ),
    );

    assert.throws(() =>
        validateFoodPhysicalOrderAgainstSources(
            order,
            quote,
            otherFulfillmentIntent,
            reservationRequest,
        ),
    );

    assert.throws(() =>
        validateFoodPhysicalOrderAgainstSources(
            order,
            quote,
            fulfillmentIntent,
            otherReservationRequest,
        ),
    );
});

test("structural validation rejects forged arithmetic and unsupported authority fields", () => {
    const {
        quote,
        fulfillmentIntent,
        reservationRequest,
    } = sources();

    const order =
        createInitialFoodPhysicalOrderVersion(
            {
                id:
                    "food-physical-order:strict",
                version: 1,
            },
            quote,
            fulfillmentIntent,
            reservationRequest,
        );

    assert.throws(() =>
        validateFoodPhysicalOrderVersion({
            ...order,
            merchandiseSubtotal: {
                currency: "USD",
                minorUnits:
                    order.merchandiseSubtotal
                        .minorUnits + 1,
            },
        }),
    );

    assert.throws(() =>
        validateFoodPhysicalOrderVersion({
            ...order,
            paid: true,
        }),
    );

    assert.throws(() =>
        validateFoodPhysicalOrderVersion({
            ...order,
            tax: {
                currency: "USD",
                minorUnits: 1,
            },
        }),
    );

    assert.throws(() =>
        validateFoodPhysicalOrderVersion({
            ...order,
            grandTotal: {
                currency: "USD",
                minorUnits: 1,
            },
        }),
    );
});

test("requested order may be cancelled by one consecutive immutable revision and cancellation is terminal", () => {
    const {
        quote,
        fulfillmentIntent,
        reservationRequest,
    } = sources();

    const requested =
        createInitialFoodPhysicalOrderVersion(
            {
                id:
                    "food-physical-order:cancel",
                version: 1,
            },
            quote,
            fulfillmentIntent,
            reservationRequest,
        );

    const cancelled =
        cancelFoodPhysicalOrderVersion(
            requested,
            {
                id: requested.id,
                version: 2,
            },
        );

    assert.equal(
        requested.state,
        "requested",
    );

    assert.equal(
        cancelled.state,
        "cancelled",
    );

    assert.equal(
        cancelled.version,
        2,
    );

    assert.deepEqual(
        cancelled.lines,
        requested.lines,
    );

    assert.deepEqual(
        cancelled.fulfillmentIntent,
        requested.fulfillmentIntent,
    );

    assert.deepEqual(
        cancelled.reservationRequest,
        requested.reservationRequest,
    );

    assert.deepEqual(
        cancelled.merchandiseSubtotal,
        requested.merchandiseSubtotal,
    );

    assert.throws(() =>
        cancelFoodPhysicalOrderVersion(
            requested,
            {
                id: requested.id,
                version: 3,
            },
        ),
    );

    assert.throws(() =>
        cancelFoodPhysicalOrderVersion(
            requested,
            {
                id:
                    "food-physical-order:different",
                version: 2,
            },
        ),
    );

    assert.throws(() =>
        cancelFoodPhysicalOrderVersion(
            cancelled,
            {
                id: cancelled.id,
                version: 3,
            },
        ),
    );
});

test("FOOD-005E exposes only requested and cancelled lifecycle states", () => {
    const {
        quote,
        fulfillmentIntent,
        reservationRequest,
    } = sources();

    const order =
        createInitialFoodPhysicalOrderVersion(
            {
                id:
                    "food-physical-order:states",
                version: 1,
            },
            quote,
            fulfillmentIntent,
            reservationRequest,
        );

    for (const state of [
        "awaiting-payment",
        "paid",
        "scheduled",
        "preparing",
        "ready",
        "dispatched",
        "handed-over",
        "refunded",
    ]) {
        assert.throws(() =>
            validateFoodPhysicalOrderVersion({
                ...order,
                state,
            }),
        );
    }
});

test("FOOD-005E has no payment tax customer persistence clock or operational fulfillment authority", async () => {
    const source = await readFile(
        new URL(
            "./physical-order-domain.ts",
            import.meta.url,
        ),
        "utf8",
    );

    assert.doesNotMatch(
        source,
        /Date\.now|new Date|process\.env|fetch\(|Math\.random|node:fs|D1Database|wrangler|stripe|paymentIntent/i,
    );

    assert.doesNotMatch(
        source,
        /paymentId:|paymentStatus:|paid:|tax:|discount:|fee:|tip:|grandTotal:|amountDue:|customerId:|guestId:|scheduledAt:|dispatchedAt:|handedOverAt:|reservationAccepted:/,
    );
});
