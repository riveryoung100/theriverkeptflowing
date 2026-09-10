import assert from "node:assert/strict";
import test from "node:test";

import {
    requireStripeSandboxSecretKey,
} from "./stripe-sandbox-secret-key";


test(
    "PRODUCT-002P accepts a normalized Stripe test-mode secret key",
    () => {

        assert.equal(
            requireStripeSandboxSecretKey(
                "sk_test_example"
            ),
            "sk_test_example"
        );
    }
);


test(
    "PRODUCT-002P rejects a Stripe live-mode secret key",
    () => {

        assert.throws(
            () =>
                requireStripeSandboxSecretKey(
                    "sk_live_example"
                ),
            /requires a test-mode secret key/
        );
    }
);


test(
    "PRODUCT-002P rejects missing malformed or whitespace-padded secret-key evidence",
    () => {

        for (
            const value
            of [
                undefined,
                null,
                "",
                " sk_test_example",
                "sk_test_example ",
                "sk_test_",
                "not-a-stripe-key",
            ]
        ) {

            assert.throws(
                () =>
                    requireStripeSandboxSecretKey(
                        value
                    )
            );
        }
    }
);