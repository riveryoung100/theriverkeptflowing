import assert from "node:assert/strict";
import test from "node:test";

import {
    assertPublicCommerceAuthorized,
    CLOSED_PRODUCT_PUBLICATION_STATE,
    isPublicCommerceAuthorized,
    RIVER_LIFE_OPERATING_SYSTEM_PRESENTATION,
    RIVER_LIFE_OPERATING_SYSTEM_WORKING_PRICE_USD,
    type ProductPublicationState,
} from "./product-presentation";

test("PRODUCT-001F-01 keeps every publication capability closed by default", () => {
    assert.deepEqual(CLOSED_PRODUCT_PUBLICATION_STATE, {
        pricePublicationAuthorized: false,
        availabilityPublicationAuthorized: false,
        checkoutPublicationAuthorized: false,
        customerPurchaseAuthorized: false,
        publicLaunchAuthorized: false,
    });

    assert.equal(
        isPublicCommerceAuthorized(CLOSED_PRODUCT_PUBLICATION_STATE),
        false,
    );
});

test("working price exists without becoming publication authority", () => {
    assert.equal(RIVER_LIFE_OPERATING_SYSTEM_WORKING_PRICE_USD, 29);

    assert.equal(
        RIVER_LIFE_OPERATING_SYSTEM_PRESENTATION
            .publicationState
            .pricePublicationAuthorized,
        false,
    );
});

test("presentation contract preserves the five-part PRODUCT-001 architecture", () => {
    assert.deepEqual(
        RIVER_LIFE_OPERATING_SYSTEM_PRESENTATION.architecture.map(
            ({ order, id, title }) => ({ order, id, title }),
        ),
        [
            { order: 1, id: "headwaters", title: "Headwaters" },
            { order: 2, id: "source", title: "The Source" },
            { order: 3, id: "tributaries", title: "Tributaries" },
            { order: 4, id: "current", title: "The Current" },
            { order: 5, id: "destination", title: "The Destination" },
        ],
    );
});

test("presentation contract identifies the governed V1 customer deliverable", () => {
    assert.match(
        RIVER_LIFE_OPERATING_SYSTEM_PRESENTATION.customerDeliverable,
        /approved River Life Operating System v1 digital PDF release/,
    );

    assert.match(
        RIVER_LIFE_OPERATING_SYSTEM_PRESENTATION.deliveryExpectation,
        /after verified payment/,
    );
});

test("paid value remains structured application rather than essay republication", () => {
    assert.match(
        RIVER_LIFE_OPERATING_SYSTEM_PRESENTATION.paidValueBoundary,
        /structured application and guided execution/,
    );

    assert.match(
        RIVER_LIFE_OPERATING_SYSTEM_PRESENTATION.paidValueBoundary,
        /rather than merely republishing freely available River essays/,
    );
});

test("closed launch state cannot authorize public commerce", () => {
    assert.throws(
        () =>
            assertPublicCommerceAuthorized(
                CLOSED_PRODUCT_PUBLICATION_STATE,
            ),
        /public commerce is not authorized/,
    );
});

test("partial authorization cannot accidentally open public commerce", () => {
    const partialState: ProductPublicationState = {
        pricePublicationAuthorized: true,
        availabilityPublicationAuthorized: true,
        checkoutPublicationAuthorized: true,
        customerPurchaseAuthorized: true,
        publicLaunchAuthorized: false,
    };

    assert.equal(isPublicCommerceAuthorized(partialState), false);

    assert.throws(
        () => assertPublicCommerceAuthorized(partialState),
        /public commerce is not authorized/,
    );
});

test("public commerce requires every explicit authorization gate", () => {
    const fullyAuthorizedState: ProductPublicationState = {
        pricePublicationAuthorized: true,
        availabilityPublicationAuthorized: true,
        checkoutPublicationAuthorized: true,
        customerPurchaseAuthorized: true,
        publicLaunchAuthorized: true,
    };

    assert.equal(isPublicCommerceAuthorized(fullyAuthorizedState), true);

    assert.doesNotThrow(() =>
        assertPublicCommerceAuthorized(fullyAuthorizedState),
    );
});

test("prohibited presentation claims remain explicit", () => {
    const prohibited =
        RIVER_LIFE_OPERATING_SYSTEM_PRESENTATION.prohibitedClaims;

    assert.ok(prohibited.includes("invented testimonials"));
    assert.ok(prohibited.includes("invented customer results"));
    assert.ok(prohibited.includes("guaranteed outcomes"));
    assert.ok(prohibited.includes("therapy claims"));
    assert.ok(prohibited.includes("medical advice claims"));
    assert.ok(prohibited.includes("legal advice claims"));
    assert.ok(prohibited.includes("financial advice claims"));
});
