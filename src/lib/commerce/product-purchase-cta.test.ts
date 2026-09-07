import assert from "node:assert/strict";
import test from "node:test";

import {
    CLOSED_PRODUCT_PURCHASE_CTA_PUBLICATION_STATE,
    PRODUCT_001F_04_CHECKOUT_PUBLICATION_STATE,
    RIVER_LIFE_OPERATING_SYSTEM_CHECKOUT_ENDPOINT,
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
            }
        );
    }
);