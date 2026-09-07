import assert from "node:assert/strict";
import test from "node:test";

import {
    RIVER_LIFE_OPERATING_SYSTEM_CUSTOMER_LAUNCH_PATH,
    buildCustomerLaunchReturnNotice,
} from "./product-customer-launch-path";

test(
    "PRODUCT-001F-05 represents the complete governed customer launch path in order",
    () => {

        assert.deepEqual(
            RIVER_LIFE_OPERATING_SYSTEM_CUSTOMER_LAUNCH_PATH.map(
                (stage) => stage.id
            ),
            [
                "presentation",
                "checkout",
                "verified-payment",
                "persistence",
                "fulfillment",
                "recorded-delivery",
            ]
        );
    }
);

test(
    "PRODUCT-001F-05 keeps browser presentation separate from payment, persistence, and fulfillment authority",
    () => {

        assert.deepEqual(
            RIVER_LIFE_OPERATING_SYSTEM_CUSTOMER_LAUNCH_PATH,
            [
                {
                    id: "presentation",
                    authority: "river-browser",
                },
                {
                    id: "checkout",
                    authority: "stripe",
                },
                {
                    id: "verified-payment",
                    authority: "river-server",
                },
                {
                    id: "persistence",
                    authority: "river-runtime",
                },
                {
                    id: "fulfillment",
                    authority: "river-runtime",
                },
                {
                    id: "recorded-delivery",
                    authority: "river-runtime",
                },
            ]
        );
    }
);

test(
    "PRODUCT-001F-05 acknowledges the Stripe success return without treating the browser redirect as proof of payment",
    () => {

        const notice =
            buildCustomerLaunchReturnNotice(
                "success"
            );

        assert.deepEqual(
            notice,
            {
                heading:
                    "Checkout received.",

                message:
                    "Your payment is verified server-side before fulfillment begins. If payment is confirmed, the River fulfillment path records the order and sends the approved digital release to the delivery email used at checkout.",
            }
        );

        const serialized =
            JSON.stringify(notice);

        assert.doesNotMatch(
            serialized,
            /payment confirmed|payment complete|payment succeeded|you paid|order fulfilled|delivery complete/i
        );
    }
);

test(
    "PRODUCT-001F-05 does not invent a customer return state when Stripe has not returned success",
    () => {

        assert.equal(
            buildCustomerLaunchReturnNotice(
                null
            ),
            null
        );

        assert.equal(
            buildCustomerLaunchReturnNotice(
                "cancel"
            ),
            null
        );

        assert.equal(
            buildCustomerLaunchReturnNotice(
                "unknown"
            ),
            null
        );
    }
);