import assert from "node:assert/strict";
import test from "node:test";

import {
    requireStripeCheckoutMode,
    requireStripeCheckoutSecretKey,
    requireStripeSandboxSecretKey,
} from "./stripe-sandbox-secret-key";


test(
    "PRODUCT-002BU accepts only explicit Stripe checkout modes",
    () => {

        assert.equal(
            requireStripeCheckoutMode(
                "test"
            ),
            "test"
        );

        assert.equal(
            requireStripeCheckoutMode(
                "live"
            ),
            "live"
        );

        for (
            const value
            of [
                undefined,
                null,
                "",
                "sandbox",
                "production",
                " test",
                "live ",
            ]
        ) {

            assert.throws(
                () =>
                    requireStripeCheckoutMode(
                        value
                    ),
                /explicitly configured as test or live/
            );
        }
    }
);


test(
    "PRODUCT-002BU accepts a test key only when test mode is explicit",
    () => {

        assert.equal(
            requireStripeCheckoutSecretKey(
                "sk_test_example",
                "test"
            ),
            "sk_test_example"
        );

        assert.throws(
            () =>
                requireStripeCheckoutSecretKey(
                    "sk_live_example",
                    "test"
                ),
            /test-mode secret key/
        );
    }
);


test(
    "PRODUCT-002BU accepts a live key only when live mode is explicit",
    () => {

        assert.equal(
            requireStripeCheckoutSecretKey(
                "sk_live_example",
                "live"
            ),
            "sk_live_example"
        );

        assert.throws(
            () =>
                requireStripeCheckoutSecretKey(
                    "sk_test_example",
                    "live"
                ),
            /live-mode secret key/
        );
    }
);


test(
    "PRODUCT-002BU rejects missing malformed or whitespace-padded Stripe keys",
    () => {

        for (
            const mode
            of [
                "test",
                "live",
            ] as const
        ) {

            for (
                const value
                of [
                    undefined,
                    null,
                    "",
                    " sk_test_example",
                    "sk_test_example ",
                    "sk_test_",
                    "sk_live_",
                    "not-a-stripe-key",
                ]
            ) {

                assert.throws(
                    () =>
                        requireStripeCheckoutSecretKey(
                            value,
                            mode
                        )
                );
            }
        }
    }
);


test(
    "PRODUCT-002P legacy sandbox guard remains test-mode only",
    () => {

        assert.equal(
            requireStripeSandboxSecretKey(
                "sk_test_example"
            ),
            "sk_test_example"
        );

        assert.throws(
            () =>
                requireStripeSandboxSecretKey(
                    "sk_live_example"
                ),
            /test-mode secret key/
        );
    }
);
