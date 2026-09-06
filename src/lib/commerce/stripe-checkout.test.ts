import assert from "node:assert/strict";
import test from "node:test";

import type Stripe from "stripe";

import {
    createRiverLifeOperatingSystemCheckout,
    riverLifeOperatingSystemCheckoutProduct
} from "./stripe-checkout";


function createStripeDouble(
    overrides:
        Partial<Stripe.Checkout.Session> =
            {}
) {

    let captured:
        Stripe.Checkout.SessionCreateParams |
        undefined;

    const stripe =
        {
            checkout: {
                sessions: {
                    async create(
                        params:
                            Stripe.Checkout.SessionCreateParams
                    ) {

                        captured =
                            params;

                        return {
                            id:
                                "cs_test_river_001",

                            url:
                                "https://checkout.stripe.com/c/pay/cs_test_river_001",

                            ...overrides
                        } as Stripe.Checkout.Session;
                    }
                }
            }
        };

    return {
        stripe,
        getCaptured:
            () => captured
    };
}


test(
    "creates a governed one-time Stripe Checkout Session",
    async () => {

        const double =
            createStripeDouble();

        const result =
            await createRiverLifeOperatingSystemCheckout(
                double.stripe,
                {
                    customerReference:
                        "river-customer-001",

                    deliveryEmail:
                        "customer@example.com",

                    origin:
                        "https://theriverkeptflowing.com"
                }
            );

        assert.deepEqual(
            result,
            {
                provider:
                    "stripe",

                checkoutSessionId:
                    "cs_test_river_001",

                checkoutUrl:
                    "https://checkout.stripe.com/c/pay/cs_test_river_001"
            }
        );

        const params =
            double.getCaptured();

        assert.ok(
            params
        );

        assert.equal(
            params.mode,
            "payment"
        );

        assert.equal(
            params.customer_email,
            "customer@example.com"
        );

        assert.equal(
            params.client_reference_id,
            "river-customer-001"
        );
    }
);


test(
    "carries exact governed River metadata required by webhook ingestion",
    async () => {

        const double =
            createStripeDouble();

        await createRiverLifeOperatingSystemCheckout(
            double.stripe,
            {
                customerReference:
                    "river-customer-002",

                deliveryEmail:
                    "delivery@example.com",

                origin:
                    "https://theriverkeptflowing.com"
            }
        );

        const params =
            double.getCaptured();

        assert.ok(
            params
        );

        assert.deepEqual(
            params.metadata,
            {
                river_customer_reference:
                    "river-customer-002",

                river_product_id:
                    "river-life-operating-system",

                river_product_version:
                    "v1"
            }
        );

        assert.deepEqual(
            params.payment_intent_data?.metadata,
            params.metadata
        );
    }
);


test(
    "creates the exact governed USD line item",
    async () => {

        const double =
            createStripeDouble();

        await createRiverLifeOperatingSystemCheckout(
            double.stripe,
            {
                customerReference:
                    "river-customer-003",

                deliveryEmail:
                    "delivery@example.com",

                origin:
                    "https://theriverkeptflowing.com"
            }
        );

        const params =
            double.getCaptured();

        assert.ok(
            params
        );

        const lineItem =
            params.line_items?.[0];

        assert.ok(
            lineItem
        );

        assert.equal(
            lineItem.quantity,
            1
        );

        assert.equal(
            lineItem.price_data?.currency,
            "usd"
        );

        assert.equal(
            lineItem.price_data?.unit_amount,
            riverLifeOperatingSystemCheckoutProduct
                .unitAmountUsdCents
        );

        assert.equal(
            lineItem.price_data?.product_data?.name,
            "River Life Operating System"
        );
    }
);


test(
    "uses River-owned success and cancellation return paths",
    async () => {

        const double =
            createStripeDouble();

        await createRiverLifeOperatingSystemCheckout(
            double.stripe,
            {
                customerReference:
                    "river-customer-004",

                deliveryEmail:
                    "delivery@example.com",

                origin:
                    "https://theriverkeptflowing.com"
            }
        );

        const params =
            double.getCaptured();

        assert.ok(
            params
        );

        assert.equal(
            params.success_url,
            "https://theriverkeptflowing.com/shop?checkout=success&session_id={CHECKOUT_SESSION_ID}"
        );

        assert.equal(
            params.cancel_url,
            "https://theriverkeptflowing.com/shop?checkout=cancelled"
        );
    }
);


test(
    "rejects malformed customer, email, and origin input before provider invocation",
    async () => {

        const cases =
            [
                {
                    customerReference:
                        " river-customer ",

                    deliveryEmail:
                        "delivery@example.com",

                    origin:
                        "https://theriverkeptflowing.com"
                },

                {
                    customerReference:
                        "river-customer",

                    deliveryEmail:
                        "not-an-email",

                    origin:
                        "https://theriverkeptflowing.com"
                },

                {
                    customerReference:
                        "river-customer",

                    deliveryEmail:
                        "delivery@example.com",

                    origin:
                        "http://theriverkeptflowing.com"
                }
            ];

        for (
            const checkoutRequest
            of cases
        ) {

            let invoked =
                false;

            const stripe =
                {
                    checkout: {
                        sessions: {
                            async create() {

                                invoked =
                                    true;

                                throw new Error(
                                    "Provider should not be invoked."
                                );
                            }
                        }
                    }
                };

            await assert.rejects(
                createRiverLifeOperatingSystemCheckout(
                    stripe,
                    checkoutRequest
                )
            );

            assert.equal(
                invoked,
                false
            );
        }
    }
);


test(
    "fails closed when Stripe does not return checkout identity or URL",
    async () => {

        const missingIdentity =
            createStripeDouble({
                id:
                    ""
            });

        await assert.rejects(
            createRiverLifeOperatingSystemCheckout(
                missingIdentity.stripe,
                {
                    customerReference:
                        "river-customer-005",

                    deliveryEmail:
                        "delivery@example.com",

                    origin:
                        "https://theriverkeptflowing.com"
                }
            ),
            /session identity/
        );

        const missingUrl =
            createStripeDouble({
                url:
                    null
            });

        await assert.rejects(
            createRiverLifeOperatingSystemCheckout(
                missingUrl.stripe,
                {
                    customerReference:
                        "river-customer-006",

                    deliveryEmail:
                        "delivery@example.com",

                    origin:
                        "https://theriverkeptflowing.com"
                }
            ),
            /checkout URL/
        );
    }
);