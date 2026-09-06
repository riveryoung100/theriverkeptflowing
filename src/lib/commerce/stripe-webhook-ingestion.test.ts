import assert from "node:assert/strict";
import test from "node:test";

import Stripe from "stripe";

import {
    verifyAndIngestStripeWebhook
} from "./stripe-webhook-ingestion";


const WEBHOOK_SECRET =
    "whsec_product_001e_03_test";


interface TestPayloadOptions {

    eventId?:
        string;

    eventType?:
        string;

    eventCreated?:
        number;

    sessionId?:
        string;

    paymentIntentId?:
        string | null;

    amountTotal?:
        number | null;

    currency?:
        string | null;

    paymentStatus?:
        "no_payment_required"
        | "paid"
        | "unpaid";

    deliveryEmail?:
        string | null;

    customerReference?:
        string | null;

    productId?:
        string | null;

    productVersion?:
        string | null;

}


function createStripePayload(
    options:
        TestPayloadOptions =
        {}
): string {

    const metadata:
        Record<string, string> =
        {};

    if (
        options.customerReference !== null
    ) {

        metadata.river_customer_reference =
            options.customerReference ??
            "customer_river_001";

    }

    if (
        options.productId !== null
    ) {

        metadata.river_product_id =
            options.productId ??
            "river-life-operating-system";

    }

    if (
        options.productVersion !== null
    ) {

        metadata.river_product_version =
            options.productVersion ??
            "v1";

    }

    return JSON.stringify({
        id:
            options.eventId ??
            "evt_river_001",

        object:
            "event",

        created:
            options.eventCreated ??
            1_788_700_000,

        data: {
            object: {
                id:
                    options.sessionId ??
                    "cs_river_001",

                object:
                    "checkout.session",

                amount_total:
                    options.amountTotal === undefined
                        ? 2900
                        : options.amountTotal,

                currency:
                    options.currency === undefined
                        ? "usd"
                        : options.currency,

                customer:
                    "cus_river_001",

                customer_details: {
                    email:
                        options.deliveryEmail === undefined
                            ? "river@example.com"
                            : options.deliveryEmail
                },

                customer_email:
                    null,

                metadata,

                payment_intent:
                    options.paymentIntentId === undefined
                        ? "pi_river_001"
                        : options.paymentIntentId,

                payment_status:
                    options.paymentStatus ??
                    "paid"
            }
        },

        livemode:
            false,

        pending_webhooks:
            1,

        request: {
            id:
                null,

            idempotency_key:
                null
        },

        type:
            options.eventType ??
            "checkout.session.completed"
    });

}


async function signPayload(
    payload:
        string
): Promise<string> {

    return Stripe.webhooks
        .generateTestHeaderStringAsync({
            payload,
            secret:
                WEBHOOK_SECRET
        });

}


test(
    "verifies a raw signed Stripe checkout event before entering the commerce domain",
    async () => {

        const payload =
            createStripePayload();

        const signature =
            await signPayload(
                payload
            );

        const result =
            await verifyAndIngestStripeWebhook({
                rawBody:
                    payload,

                signature,

                webhookSecret:
                    WEBHOOK_SECRET
            });

        assert.equal(
            result.status,
            "handled"
        );

        if (
            result.status !==
            "handled"
        ) {

            assert.fail(
                "Expected handled Stripe webhook result."
            );

        }

        assert.equal(
            result.eventType,
            "checkout.session.completed"
        );

        assert.equal(
            result.providerEventId,
            "evt_river_001"
        );

        assert.deepEqual(
            result.paymentEvent,
            {
                verificationState:
                    "verified",

                provider:
                    "stripe",

                providerEventId:
                    "evt_river_001",

                providerOrderOrSessionId:
                    "cs_river_001",

                providerPaymentReference:
                    "pi_river_001",

                customerReference:
                    "customer_river_001",

                deliveryEmail:
                    "river@example.com",

                productId:
                    "river-life-operating-system",

                productVersion:
                    "v1",

                amount:
                    29,

                currency:
                    "usd",

                paymentState:
                    "paid",

                eventCreatedAt:
                    new Date(
                        1_788_700_000 *
                        1000
                    ).toISOString(),

                paidAt:
                    new Date(
                        1_788_700_000 *
                        1000
                    ).toISOString()
            }
        );

    }
);


test(
    "rejects a Stripe webhook with an invalid signature before normalization",
    async () => {

        const payload =
            createStripePayload();

        await assert.rejects(
            async () => {

                await verifyAndIngestStripeWebhook({
                    rawBody:
                        payload,

                    signature:
                        "t=1,v1=invalid",

                    webhookSecret:
                        WEBHOOK_SECRET
                });

            }
        );

    }
);


test(
    "requires the exact raw body used to produce the Stripe signature",
    async () => {

        const payload =
            createStripePayload();

        const signature =
            await signPayload(
                payload
            );

        const mutatedPayload =
            payload.replace(
                "river@example.com",
                "other@example.com"
            );

        await assert.rejects(
            async () => {

                await verifyAndIngestStripeWebhook({
                    rawBody:
                        mutatedPayload,

                    signature,

                    webhookSecret:
                        WEBHOOK_SECRET
                });

            }
        );

    }
);


test(
    "verifies unsupported Stripe events before safely ignoring them",
    async () => {

        const payload =
            createStripePayload({
                eventType:
                    "payment_intent.succeeded"
            });

        const signature =
            await signPayload(
                payload
            );

        const result =
            await verifyAndIngestStripeWebhook({
                rawBody:
                    payload,

                signature,

                webhookSecret:
                    WEBHOOK_SECRET
            });

        assert.deepEqual(
            result,
            {
                status:
                    "ignored",

                eventType:
                    "payment_intent.succeeded",

                providerEventId:
                    "evt_river_001"
            }
        );

    }
);


test(
    "maps an unpaid completed Checkout Session to pending without inventing paidAt",
    async () => {

        const payload =
            createStripePayload({
                paymentStatus:
                    "unpaid"
            });

        const signature =
            await signPayload(
                payload
            );

        const result =
            await verifyAndIngestStripeWebhook({
                rawBody:
                    payload,

                signature,

                webhookSecret:
                    WEBHOOK_SECRET
            });

        assert.equal(
            result.status,
            "handled"
        );

        if (
            result.status !==
            "handled"
        ) {

            assert.fail(
                "Expected handled Stripe webhook result."
            );

        }

        assert.equal(
            result.paymentEvent.paymentState,
            "pending"
        );

        assert.equal(
            "paidAt" in
            result.paymentEvent,
            false
        );

    }
);


test(
    "maps Stripe asynchronous payment success to paid evidence",
    async () => {

        const payload =
            createStripePayload({
                eventType:
                    "checkout.session.async_payment_succeeded",

                paymentStatus:
                    "paid"
            });

        const signature =
            await signPayload(
                payload
            );

        const result =
            await verifyAndIngestStripeWebhook({
                rawBody:
                    payload,

                signature,

                webhookSecret:
                    WEBHOOK_SECRET
            });

        assert.equal(
            result.status,
            "handled"
        );

        if (
            result.status !==
            "handled"
        ) {

            assert.fail(
                "Expected handled Stripe webhook result."
            );

        }

        assert.equal(
            result.paymentEvent.paymentState,
            "paid"
        );

        assert.equal(
            typeof result.paymentEvent.paidAt,
            "string"
        );

    }
);


test(
    "maps Stripe asynchronous payment failure to failed evidence without paidAt",
    async () => {

        const payload =
            createStripePayload({
                eventType:
                    "checkout.session.async_payment_failed",

                paymentStatus:
                    "unpaid"
            });

        const signature =
            await signPayload(
                payload
            );

        const result =
            await verifyAndIngestStripeWebhook({
                rawBody:
                    payload,

                signature,

                webhookSecret:
                    WEBHOOK_SECRET
            });

        assert.equal(
            result.status,
            "handled"
        );

        if (
            result.status !==
            "handled"
        ) {

            assert.fail(
                "Expected handled Stripe webhook result."
            );

        }

        assert.equal(
            result.paymentEvent.paymentState,
            "failed"
        );

        assert.equal(
            "paidAt" in
            result.paymentEvent,
            false
        );

    }
);


test(
    "normalizes Stripe USD minor units into canonical major-unit amount",
    async () => {

        const payload =
            createStripePayload({
                amountTotal:
                    4325
            });

        const signature =
            await signPayload(
                payload
            );

        const result =
            await verifyAndIngestStripeWebhook({
                rawBody:
                    payload,

                signature,

                webhookSecret:
                    WEBHOOK_SECRET
            });

        assert.equal(
            result.status,
            "handled"
        );

        if (
            result.status !==
            "handled"
        ) {

            assert.fail(
                "Expected handled Stripe webhook result."
            );

        }

        assert.equal(
            result.paymentEvent.amount,
            43.25
        );

        assert.equal(
            result.paymentEvent.currency,
            "usd"
        );

    }
);


test(
    "rejects unsupported currency before canonical payment normalization",
    async () => {

        const payload =
            createStripePayload({
                currency:
                    "jpy"
            });

        const signature =
            await signPayload(
                payload
            );

        await assert.rejects(
            async () => {

                await verifyAndIngestStripeWebhook({
                    rawBody:
                        payload,

                    signature,

                    webhookSecret:
                        WEBHOOK_SECRET
                });

            },
            /requires USD currency/
        );

    }
);


test(
    "requires governed River product and customer metadata",
    async () => {

        for (
            const missingMetadata of
            [
                {
                    customerReference:
                        null
                },
                {
                    productId:
                        null
                },
                {
                    productVersion:
                        null
                }
            ]
        ) {

            const payload =
                createStripePayload(
                    missingMetadata
                );

            const signature =
                await signPayload(
                    payload
                );

            await assert.rejects(
                async () => {

                    await verifyAndIngestStripeWebhook({
                        rawBody:
                            payload,

                        signature,

                        webhookSecret:
                            WEBHOOK_SECRET
                    });

                },
                /metadata/
            );

        }

    }
);


test(
    "requires delivery email and payment-intent identity before commerce normalization",
    async () => {

        const missingEmailPayload =
            createStripePayload({
                deliveryEmail:
                    null
            });

        const missingEmailSignature =
            await signPayload(
                missingEmailPayload
            );

        await assert.rejects(
            async () => {

                await verifyAndIngestStripeWebhook({
                    rawBody:
                        missingEmailPayload,

                    signature:
                        missingEmailSignature,

                    webhookSecret:
                        WEBHOOK_SECRET
                });

            },
            /delivery email/
        );

        const missingPaymentPayload =
            createStripePayload({
                paymentIntentId:
                    null
            });

        const missingPaymentSignature =
            await signPayload(
                missingPaymentPayload
            );

        await assert.rejects(
            async () => {

                await verifyAndIngestStripeWebhook({
                    rawBody:
                        missingPaymentPayload,

                    signature:
                        missingPaymentSignature,

                    webhookSecret:
                        WEBHOOK_SECRET
                });

            },
            /payment intent id/
        );

    }
);
