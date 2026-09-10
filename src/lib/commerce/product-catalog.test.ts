import assert from "node:assert/strict";
import test from "node:test";

import {
    createRiverCommerceProduct,
    getRiverCommerceProduct,
    KNOW_YOUR_NUMBER_COMMERCE_PRODUCT,
    RIVER_LIFE_OPERATING_SYSTEM_COMMERCE_PRODUCT,
} from "./product-catalog";

test(
    "PRODUCT-002A preserves the existing River Life Operating System commerce identity",
    () => {
        assert.deepEqual(
            RIVER_LIFE_OPERATING_SYSTEM_COMMERCE_PRODUCT,
            {
                productId:
                    "river-life-operating-system",

                productVersion:
                    "v1",

                productName:
                    "River Life Operating System",

                unitAmountUsdCents:
                    2900,

                checkoutPath:
                    "/api/commerce/create-checkout",

                successPath:
                    "/shop?checkout=success&session_id={CHECKOUT_SESSION_ID}",

                cancelPath:
                    "/shop?checkout=cancelled",

                approvedReleaseId:
                    "product-001e-07-runtime-approved-001",

                deliverySubject:
                    "Your River Life Operating System",

                deliveryText:
                    "Thank you for your purchase. Your River Life Operating System is attached.",
            },
        );
    },
);

test(
    "PRODUCT-002A resolves the exact registered product identity",
    () => {
        assert.equal(
            getRiverCommerceProduct(
                "river-life-operating-system",
                "v1",
            ),
            RIVER_LIFE_OPERATING_SYSTEM_COMMERCE_PRODUCT,
        );
    },
);

test(
    "PRODUCT-002A fails closed for unknown product identities and versions",
    () => {
        assert.equal(
            getRiverCommerceProduct(
                "unknown-product",
                "v1",
            ),
            undefined,
        );

        assert.equal(
            getRiverCommerceProduct(
                "river-life-operating-system",
                "v2",
            ),
            undefined,
        );
    },
);

test(
    "PRODUCT-002A accepts another structurally valid commerce product without registering it",
    () => {
        const product =
            createRiverCommerceProduct({
                productId:
                    "example-product",

                productVersion:
                    "v1",

                productName:
                    "Example Product",

                unitAmountUsdCents:
                    3900,

                checkoutPath:
                    "/api/commerce/create-checkout",

                successPath:
                    "/shop/example?checkout=success",

                cancelPath:
                    "/shop/example?checkout=cancelled",

                approvedReleaseId:
                    "example-product-v1-approved",

                deliverySubject:
                    "Your Example Product",

                deliveryText:
                    "Your Example Product is attached.",
            });

        assert.deepEqual(
            product,
            {
                productId:
                    "example-product",

                productVersion:
                    "v1",

                productName:
                    "Example Product",

                unitAmountUsdCents:
                    3900,

                checkoutPath:
                    "/api/commerce/create-checkout",

                successPath:
                    "/shop/example?checkout=success",

                cancelPath:
                    "/shop/example?checkout=cancelled",

                approvedReleaseId:
                    "example-product-v1-approved",

                deliverySubject:
                    "Your Example Product",

                deliveryText:
                    "Your Example Product is attached.",
            },
        );

        assert.equal(
            getRiverCommerceProduct(
                "example-product",
                "v1",
            ),
            undefined,
        );
    },
);

test(
    "PRODUCT-002A rejects malformed commerce product fields",
    () => {
        const valid = {
            productId:
                "example-product",

            productVersion:
                "v1",

            productName:
                "Example Product",

            unitAmountUsdCents:
                3900,

            checkoutPath:
                "/api/commerce/create-checkout",

            successPath:
                "/shop/example?checkout=success",

            cancelPath:
                "/shop/example?checkout=cancelled",

            approvedReleaseId:
                "example-product-v1-approved",

            deliverySubject:
                "Your Example Product",

            deliveryText:
                "Your Example Product is attached.",
        };

        assert.throws(
            () =>
                createRiverCommerceProduct({
                    ...valid,
                    productId:
                        " example-product",
                }),
            /Product id/,
        );

        assert.throws(
            () =>
                createRiverCommerceProduct({
                    ...valid,
                    productVersion:
                        "",
                }),
            /Product version/,
        );

        assert.throws(
            () =>
                createRiverCommerceProduct({
                    ...valid,
                    productName:
                        "Example Product ",
                }),
            /Product name/,
        );

        assert.throws(
            () =>
                createRiverCommerceProduct({
                    ...valid,
                    unitAmountUsdCents:
                        0,
                }),
            /positive whole-cent/,
        );

        assert.throws(
            () =>
                createRiverCommerceProduct({
                    ...valid,
                    unitAmountUsdCents:
                        39.5,
                }),
            /positive whole-cent/,
        );
    },
);

test(
    "PRODUCT-002L registers Know Your Number v1 with its approved release",
    () => {
        assert.deepEqual(
            KNOW_YOUR_NUMBER_COMMERCE_PRODUCT,
            {
                productId:
                    "know-your-number",

                productVersion:
                    "v1",

                productName:
                    "Know Your Number",

                unitAmountUsdCents:
                    4900,

                checkoutPath:
                    "/api/commerce/create-checkout",

                successPath:
                    "/shop/know-your-number?checkout=success&session_id={CHECKOUT_SESSION_ID}",

                cancelPath:
                    "/shop/know-your-number?checkout=cancelled",

                approvedReleaseId:
                    "know-your-number-v1-approved-001",

                deliverySubject:
                    "Your Know Your Number Money Plan",

                deliveryText:
                    "Thank you for your purchase. Your Know Your Number Money & Future Planning System is attached.",
            },
        );
    },
);

test(
    "PRODUCT-002L resolves only the exact Know Your Number v1 identity",
    () => {
        assert.equal(
            getRiverCommerceProduct(
                "know-your-number",
                "v1",
            ),
            KNOW_YOUR_NUMBER_COMMERCE_PRODUCT,
        );

        assert.equal(
            getRiverCommerceProduct(
                "know-your-number",
                "v2",
            ),
            undefined,
        );
    },
);
