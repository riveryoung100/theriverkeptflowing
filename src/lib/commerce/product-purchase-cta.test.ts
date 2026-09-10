import assert from "node:assert/strict";
import test from "node:test";

import {
    CLOSED_PRODUCT_PURCHASE_CTA_PUBLICATION_STATE,
    PRODUCT_001F_04_CHECKOUT_PUBLICATION_STATE,
    RIVER_LIFE_OPERATING_SYSTEM_CHECKOUT_ENDPOINT,
    buildPublicProductPurchaseCta,
    buildPublicPurchaseCta,
} from "./product-purchase-cta";

test(
    "PRODUCT-001F-04 keeps the purchase CTA closed by default",
    () => {

        assert.deepEqual(
            CLOSED_PRODUCT_PURCHASE_CTA_PUBLICATION_STATE,
            {
                checkoutPublicationAuthorized:
                    false,
            }
        );

        assert.equal(
            buildPublicPurchaseCta(
                CLOSED_PRODUCT_PURCHASE_CTA_PUBLICATION_STATE
            ),
            null
        );
    }
);

test(
    "PRODUCT-001F-04 points only to the governed River checkout endpoint when authorized",
    () => {

        assert.equal(
            RIVER_LIFE_OPERATING_SYSTEM_CHECKOUT_ENDPOINT,
            "/api/commerce/create-checkout"
        );

        assert.deepEqual(
            buildPublicPurchaseCta({
                checkoutPublicationAuthorized:
                    true,
            }),
            {
                label:
                    "Purchase the River Life Operating System",

                checkoutEndpoint:
                    "/api/commerce/create-checkout",

                productId:
                    "river-life-operating-system",

                productVersion:
                    "v1",
            }
        );
    }
);

test(
    "PRODUCT-001F-04 does not place Stripe payment credentials or fulfillment authority in the CTA contract",
    () => {

        const authorized =
            buildPublicPurchaseCta({
                checkoutPublicationAuthorized:
                    true,
            });

        assert.ok(authorized);

        const serialized =
            JSON.stringify(authorized);

        assert.doesNotMatch(
            serialized,
            /STRIPE_SECRET_KEY|sk_test_|sk_live_|fulfillment|entitlement|webhook/i
        );
    }
);
test(
    "PRODUCT-001F-04 explicitly authorizes checkout publication without authorizing customer purchase or public launch",
    () => {

        assert.deepEqual(
            PRODUCT_001F_04_CHECKOUT_PUBLICATION_STATE,
            {
                checkoutPublicationAuthorized:
                    true,
            }
        );

        assert.deepEqual(
            buildPublicPurchaseCta(
                PRODUCT_001F_04_CHECKOUT_PUBLICATION_STATE
            ),
            {
                label:
                    "Purchase the River Life Operating System",

                checkoutEndpoint:
                    "/api/commerce/create-checkout",

                productId:
                    "river-life-operating-system",

                productVersion:
                    "v1",
            }
        );
    }
);
test(
    "PRODUCT-002M builds a governed CTA for an explicit registered product identity",
    () => {
        assert.deepEqual(
            buildPublicProductPurchaseCta(
                {
                    checkoutPublicationAuthorized:
                        true,
                },
                {
                    productId:
                        "know-your-number",

                    productVersion:
                        "v1",

                    productName:
                        "Know Your Number",

                    checkoutEndpoint:
                        "/api/commerce/create-checkout",
                }
            ),
            {
                label:
                    "Purchase Know Your Number",

                checkoutEndpoint:
                    "/api/commerce/create-checkout",

                productId:
                    "know-your-number",

                productVersion:
                    "v1",
            }
        );
    }
);

test(
    "PRODUCT-002M keeps explicit product identity unavailable while checkout publication is closed",
    () => {
        assert.equal(
            buildPublicProductPurchaseCta(
                CLOSED_PRODUCT_PURCHASE_CTA_PUBLICATION_STATE,
                {
                    productId:
                        "know-your-number",

                    productVersion:
                        "v1",

                    productName:
                        "Know Your Number",

                    checkoutEndpoint:
                        "/api/commerce/create-checkout",
                }
            ),
            null
        );
    }
);

test(
    "PRODUCT-002M rejects malformed explicit CTA product metadata when publication is authorized",
    () => {
        assert.throws(
            () =>
                buildPublicProductPurchaseCta(
                    {
                        checkoutPublicationAuthorized:
                            true,
                    },
                    {
                        productId:
                            " know-your-number ",

                        productVersion:
                            "v1",

                        productName:
                            "Know Your Number",

                        checkoutEndpoint:
                            "/api/commerce/create-checkout",
                    }
                ),
            /Product id must be a non-empty normalized string/
        );
    }
);
