import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    createInitialFoodCartVersion,
    createInitialFoodMerchandiseQuoteVersion,
} from "./cart-quote-domain";

import {
    createFoodFulfillmentIntentId,
    createFoodReservationRequestId,
    createInitialFoodFulfillmentIntentVersion,
    createInitialFoodReservationRequestVersion,
    reviseFoodFulfillmentIntentVersion,
    reviseFoodReservationRequestVersion,
    validateFoodFulfillmentIntentVersion,
    validateFoodReservationRequestAgainstSources,
} from "./fulfillment-capacity-reservation-domain";

function sku(
    name: string,
    version = 1,
) {
    return {
        id: `food-sku:${name}`,
        version,
        servingOffer: {
            offerId: `food-serving-offer:${name}`,
            version: 1,
        },
        package: {
            id: `food-package-definition:${name}`,
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
        id: `food-approved-commercial-price:${name}`,
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

function quoteFixture() {
    const a = sku("a");
    const b = sku("b");

    const cart =
        createInitialFoodCartVersion({
            id: "food-cart:005d-fixture",
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
                id: "food-merchandise-quote:005d-fixture",
                version: 1,
            },
            cart,
            [a, b],
            [
                approvedPrice("a", a, 1000),
                approvedPrice("b", b, 500),
            ],
        );

    return {
        a,
        b,
        quote,
    };
}

test("fulfillment intent is exact quote-bound request intent, not fulfillment approval", () => {
    const { quote } = quoteFixture();

    const rawDetails = {
        method: "personal-delivery",
        locationReference:
            "fixture:protected-location:1",
        windowReference:
            "fixture:requested-window:1",
    };

    const intent =
        createInitialFoodFulfillmentIntentVersion(
            {
                id: createFoodFulfillmentIntentId(
                    "delivery-1",
                ),
                version: 1,
            },
            quote,
            rawDetails,
        );

    assert.equal(
        intent.quote.id,
        quote.id,
    );
    assert.equal(
        intent.quote.version,
        quote.version,
    );
    assert.equal(
        intent.method,
        "personal-delivery",
    );

    assert(Object.isFrozen(intent));
    assert(Object.isFrozen(intent.quote));

    rawDetails.locationReference =
        "fixture:mutated";

    assert.equal(
        intent.locationReference,
        "fixture:protected-location:1",
    );

    for (const forbidden of [
        "approved",
        "scheduled",
        "fulfilled",
        "orderable",
        "available",
        "reservation",
        "payment",
    ]) {
        assert.equal(
            forbidden in intent,
            false,
        );
    }
});

test("fulfillment methods are deliberately limited to personal delivery and meetup", () => {
    const { quote } = quoteFixture();

    for (const method of [
        "pickup",
        "shipping",
        "courier",
        "third-party-delivery",
    ]) {
        assert.throws(() =>
            createInitialFoodFulfillmentIntentVersion(
                {
                    id:
                        "food-fulfillment-intent:unsupported",
                    version: 1,
                },
                quote,
                {
                    method,
                    locationReference:
                        "fixture:location",
                    windowReference:
                        "fixture:window",
                },
            ),
        );
    }

    assert.doesNotThrow(() =>
        createInitialFoodFulfillmentIntentVersion(
            {
                id:
                    "food-fulfillment-intent:meetup",
                version: 1,
            },
            quote,
            {
                method: "meetup",
                locationReference:
                    "fixture:meetup-location",
                windowReference:
                    "fixture:meetup-window",
            },
        ),
    );
});

test("fulfillment intent revisions are consecutive and preserve intent and quote authority", () => {
    const { quote } = quoteFixture();

    const initial =
        createInitialFoodFulfillmentIntentVersion(
            {
                id:
                    "food-fulfillment-intent:revise",
                version: 1,
            },
            quote,
            {
                method: "meetup",
                locationReference:
                    "fixture:meetup:a",
                windowReference:
                    "fixture:window:a",
            },
        );

    const revised =
        reviseFoodFulfillmentIntentVersion(
            initial,
            {
                id: initial.id,
                version: 2,
            },
            quote,
            {
                method: "personal-delivery",
                locationReference:
                    "fixture:delivery:b",
                windowReference:
                    "fixture:window:b",
            },
        );

    assert.equal(initial.version, 1);
    assert.equal(revised.version, 2);
    assert.equal(
        revised.id,
        initial.id,
    );
    assert.equal(
        revised.quote.id,
        initial.quote.id,
    );

    assert.throws(() =>
        reviseFoodFulfillmentIntentVersion(
            initial,
            {
                id: initial.id,
                version: 3,
            },
            quote,
            {
                method: "meetup",
                locationReference:
                    "fixture:a",
                windowReference:
                    "fixture:b",
            },
        ),
    );

    assert.throws(() =>
        reviseFoodFulfillmentIntentVersion(
            initial,
            {
                id:
                    "food-fulfillment-intent:different",
                version: 2,
            },
            quote,
            {
                method: "meetup",
                locationReference:
                    "fixture:a",
                windowReference:
                    "fixture:b",
            },
        ),
    );
});

test("reservation request derives exact SKU-unit capacity demand from quote lines", () => {
    const {
        a,
        b,
        quote,
    } = quoteFixture();

    const intent =
        createInitialFoodFulfillmentIntentVersion(
            {
                id:
                    "food-fulfillment-intent:capacity",
                version: 1,
            },
            quote,
            {
                method: "meetup",
                locationReference:
                    "fixture:meetup",
                windowReference:
                    "fixture:window",
            },
        );

    const request =
        createInitialFoodReservationRequestVersion(
            {
                id:
                    createFoodReservationRequestId(
                        "capacity-1",
                    ),
                version: 1,
            },
            quote,
            intent,
        );

    assert.deepEqual(
        request.capacityRequirements,
        [
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
    );

    assert.equal(
        request.quote.id,
        quote.id,
    );
    assert.equal(
        request.fulfillmentIntent.id,
        intent.id,
    );

    assert(Object.isFrozen(request));
    assert(
        Object.isFrozen(
            request.capacityRequirements,
        ),
    );
    assert(
        Object.isFrozen(
            request.capacityRequirements[0],
        ),
    );
    assert(
        Object.isFrozen(
            request.capacityRequirements[0]?.sku,
        ),
    );
});

test("reservation request cannot inject different capacity quantities or mismatched sources", () => {
    const { quote } = quoteFixture();

    const intent =
        createInitialFoodFulfillmentIntentVersion(
            {
                id:
                    "food-fulfillment-intent:exact",
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

    const request =
        createInitialFoodReservationRequestVersion(
            {
                id:
                    "food-reservation-request:exact",
                version: 1,
            },
            quote,
            intent,
        );

    assert.throws(() =>
        validateFoodReservationRequestAgainstSources(
            {
                ...request,
                capacityRequirements: [
                    {
                        ...request
                            .capacityRequirements[0],
                        quantity: 99,
                    },
                    request
                        .capacityRequirements[1],
                ],
            },
            quote,
            intent,
        ),
    );

    const otherQuoteFixture = quoteFixture();

    const otherIntent =
        createInitialFoodFulfillmentIntentVersion(
            {
                id:
                    "food-fulfillment-intent:other",
                version: 1,
            },
            otherQuoteFixture.quote,
            {
                method: "meetup",
                locationReference:
                    "fixture:other-location",
                windowReference:
                    "fixture:other-window",
            },
        );

    assert.throws(() =>
        validateFoodReservationRequestAgainstSources(
            request,
            quote,
            otherIntent,
        ),
    );
});

test("reservation request revisions are explicit consecutive snapshots and never become reservations", () => {
    const { quote } = quoteFixture();

    const intentV1 =
        createInitialFoodFulfillmentIntentVersion(
            {
                id:
                    "food-fulfillment-intent:req-revise",
                version: 1,
            },
            quote,
            {
                method: "meetup",
                locationReference:
                    "fixture:a",
                windowReference:
                    "fixture:a",
            },
        );

    const requestV1 =
        createInitialFoodReservationRequestVersion(
            {
                id:
                    "food-reservation-request:req-revise",
                version: 1,
            },
            quote,
            intentV1,
        );

    const intentV2 =
        reviseFoodFulfillmentIntentVersion(
            intentV1,
            {
                id: intentV1.id,
                version: 2,
            },
            quote,
            {
                method:
                    "personal-delivery",
                locationReference:
                    "fixture:b",
                windowReference:
                    "fixture:b",
            },
        );

    const requestV2 =
        reviseFoodReservationRequestVersion(
            requestV1,
            {
                id: requestV1.id,
                version: 2,
            },
            quote,
            intentV2,
        );

    assert.equal(
        requestV1.version,
        1,
    );
    assert.equal(
        requestV2.version,
        2,
    );
    assert.equal(
        requestV2.fulfillmentIntent.version,
        2,
    );

    for (const forbidden of [
        "reserved",
        "reservationStatus",
        "availableQuantity",
        "quantityOnHand",
        "reservedQuantity",
        "soldQuantity",
        "expiresAt",
        "validUntil",
        "orderId",
        "paymentId",
    ]) {
        assert.equal(
            forbidden in requestV2,
            false,
        );
    }

    assert.throws(() =>
        reviseFoodReservationRequestVersion(
            requestV1,
            {
                id: requestV1.id,
                version: 3,
            },
            quote,
            intentV2,
        ),
    );
});

test("unsupported fields cannot smuggle approval, capacity or order authority into FOOD-005D", () => {
    const { quote } = quoteFixture();

    const intent =
        createInitialFoodFulfillmentIntentVersion(
            {
                id:
                    "food-fulfillment-intent:strict",
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

    assert.throws(() =>
        validateFoodFulfillmentIntentVersion({
            ...intent,
            approved: true,
        }),
    );

    const request =
        createInitialFoodReservationRequestVersion(
            {
                id:
                    "food-reservation-request:strict",
                version: 1,
            },
            quote,
            intent,
        );

    assert.throws(() =>
        validateFoodReservationRequestAgainstSources(
            {
                ...request,
                reserved: true,
            },
            quote,
            intent,
        ),
    );
});

test("FOOD-005D has no clocks, persistence, availability projection, order or payment side effects", async () => {
    const source = await readFile(
        new URL(
            "./fulfillment-capacity-reservation-domain.ts",
            import.meta.url,
        ),
        "utf8",
    );

    assert.doesNotMatch(
        source,
        /Date\.now|new Date|process\.env|fetch\(|Math\.random|node:fs|stripe|paymentIntent|projectFoodPublicMenu|D1Database|wrangler/i,
    );

    assert.doesNotMatch(
        source,
        /quantityOnHand|reservedQuantity|soldQuantity|availableQuantity|expiresAt|validUntil|checkoutReady|paymentReady|orderable:/,
    );
});
