import assert from "node:assert/strict";
import test from "node:test";

import {
    PRODUCT_001F_03_PRICE_AVAILABILITY_PUBLICATION_STATE,
    PRODUCT_002N_KNOW_YOUR_NUMBER_PRICE_AVAILABILITY_PUBLICATION_STATE,
    buildPublicPriceAvailabilityPresentation,
    hasPublicPriceAvailabilityPresentation,
} from "./product-price-availability-presentation";

test("PRODUCT-001F-03 explicitly authorizes only price and availability presentation", () => {
    assert.deepEqual(
        PRODUCT_001F_03_PRICE_AVAILABILITY_PUBLICATION_STATE,
        {
            pricePublicationAuthorized: true,
            availabilityPublicationAuthorized: true,
        },
    );

    assert.equal(
        "checkoutPublicationAuthorized" in
            PRODUCT_001F_03_PRICE_AVAILABILITY_PUBLICATION_STATE,
        false,
    );

    assert.equal(
        "customerPurchaseAuthorized" in
            PRODUCT_001F_03_PRICE_AVAILABILITY_PUBLICATION_STATE,
        false,
    );

    assert.equal(
        "publicLaunchAuthorized" in
            PRODUCT_001F_03_PRICE_AVAILABILITY_PUBLICATION_STATE,
        false,
    );
});

test("PRODUCT-001F-03 suppresses price and availability while both gates are closed", () => {
    const result = buildPublicPriceAvailabilityPresentation({
        publicationState: {
            pricePublicationAuthorized: false,
            availabilityPublicationAuthorized: false,
        },
        workingPriceUsd: 29,
        digitallyDeliverable: true,
    });

    assert.deepEqual(result, {
        priceLabel: null,
        availabilityLabel: null,
    });

    assert.equal(
        hasPublicPriceAvailabilityPresentation(result),
        false,
    );
});

test("PRODUCT-001F-03 can represent the governed V1 price only after its gate is advanced", () => {
    const result = buildPublicPriceAvailabilityPresentation({
        publicationState: {
            pricePublicationAuthorized: true,
            availabilityPublicationAuthorized: false,
        },
        workingPriceUsd: 29,
        digitallyDeliverable: true,
    });

    assert.equal(result.priceLabel, "$29");
    assert.equal(result.availabilityLabel, null);
});

test("PRODUCT-001F-03 can represent availability independently only after its gate is advanced", () => {
    const result = buildPublicPriceAvailabilityPresentation({
        publicationState: {
            pricePublicationAuthorized: false,
            availabilityPublicationAuthorized: true,
        },
        workingPriceUsd: 29,
        digitallyDeliverable: true,
    });

    assert.equal(result.priceLabel, null);
    assert.equal(
        result.availabilityLabel,
        "Available for digital delivery",
    );
});

test("PRODUCT-001F-03 represents unavailable delivery state accurately when availability publication is authorized", () => {
    const result = buildPublicPriceAvailabilityPresentation({
        publicationState: {
            pricePublicationAuthorized: false,
            availabilityPublicationAuthorized: true,
        },
        workingPriceUsd: 29,
        digitallyDeliverable: false,
    });

    assert.equal(
        result.availabilityLabel,
        "Not currently available",
    );
});

test("PRODUCT-001F-03 price and availability gates do not imply checkout or purchase authorization", () => {
    const result = buildPublicPriceAvailabilityPresentation({
        publicationState: {
            pricePublicationAuthorized: true,
            availabilityPublicationAuthorized: true,
        },
        workingPriceUsd: 29,
        digitallyDeliverable: true,
    });

    assert.deepEqual(result, {
        priceLabel: "$29",
        availabilityLabel: "Available for digital delivery",
    });

    assert.equal(
        "checkoutPublicationAuthorized" in result,
        false,
    );

    assert.equal(
        "customerPurchaseAuthorized" in result,
        false,
    );
});

test("PRODUCT-001F-03 rejects invalid working-price evidence instead of formatting it", () => {
    assert.throws(
        () =>
            buildPublicPriceAvailabilityPresentation({
                publicationState: {
                    pricePublicationAuthorized: true,
                    availabilityPublicationAuthorized: false,
                },
                workingPriceUsd: 0,
                digitallyDeliverable: true,
            }),
        /positive whole-dollar amount/,
    );
});
test(
    "PRODUCT-002N authorizes Know Your Number price and digital availability presentation without checkout authority",
    () => {
        assert.deepEqual(
            PRODUCT_002N_KNOW_YOUR_NUMBER_PRICE_AVAILABILITY_PUBLICATION_STATE,
            {
                pricePublicationAuthorized: true,
                availabilityPublicationAuthorized: true,
            }
        );

        assert.deepEqual(
            buildPublicPriceAvailabilityPresentation({
                publicationState:
                    PRODUCT_002N_KNOW_YOUR_NUMBER_PRICE_AVAILABILITY_PUBLICATION_STATE,
                workingPriceUsd: 49,
                digitallyDeliverable: true,
            }),
            {
                priceLabel: "$49",
                availabilityLabel:
                    "Available for digital delivery",
            }
        );

        assert.equal(
            "checkoutPublicationAuthorized" in
                PRODUCT_002N_KNOW_YOUR_NUMBER_PRICE_AVAILABILITY_PUBLICATION_STATE,
            false
        );
    }
);
