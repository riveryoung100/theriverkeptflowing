import assert from "node:assert/strict";
import test from "node:test";

import type {
    VerifiedPaymentEvent
} from "./payment-event";

import {
    processStripeWebhookPaymentAtRuntime
} from "./stripe-webhook-runtime";


function createPendingPaymentEvent():
VerifiedPaymentEvent {

    return {
        verificationState:
            "verified",

        provider:
            "stripe",

        providerEventId:
            "evt_runtime_pending_001",

        providerOrderOrSessionId:
            "cs_runtime_pending_001",

        providerPaymentReference:
            "pi_runtime_pending_001",

        customerReference:
            "customer_runtime_pending_001",

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
            "pending",

        eventCreatedAt:
            "2026-09-07T02:00:00.000Z"
    };

}


function createPaidPaymentEvent():
VerifiedPaymentEvent {

    return {
        ...createPendingPaymentEvent(),

        providerEventId:
            "evt_runtime_paid_001",

        providerOrderOrSessionId:
            "cs_runtime_paid_001",

        providerPaymentReference:
            "pi_runtime_paid_001",

        paymentState:
            "paid",

        paidAt:
            "2026-09-07T02:00:00.000Z"
    };

}


test(
    "non-paid verified evidence exits before runtime infrastructure is required",
    async () => {

        const result =
            await processStripeWebhookPaymentAtRuntime({
                paymentEvent:
                    createPendingPaymentEvent(),

                environment: {
                    RIVER_COMMERCE_DB:
                        undefined,

                    RIVER_PRODUCT_RELEASES:
                        undefined,

                    RESEND_API_KEY:
                        undefined,

                    RIVER_DELIVERY_FROM:
                        undefined
                }
            });

        assert.deepEqual(
            result,
            {
                status:
                    "no-fulfillment-required",

                paymentState:
                    "pending"
            }
        );

    }
);


test(
    "paid evidence fails closed when durable D1 infrastructure is absent",
    async () => {

        await assert.rejects(
            () =>
                processStripeWebhookPaymentAtRuntime({
                    paymentEvent:
                        createPaidPaymentEvent(),

                    environment: {
                        RIVER_COMMERCE_DB:
                            undefined,

                        RIVER_PRODUCT_RELEASES:
                            undefined,

                        RESEND_API_KEY:
                            "re_test",

                        RIVER_DELIVERY_FROM:
                            "River <delivery@example.com>"
                    }
                }),
            /RIVER_COMMERCE_DB/
        );

    }
);


test(
    "runtime module composes the canonical production dependencies",
    async () => {

        const {
            readFile
        } =
            await import(
                "node:fs/promises"
            );

        const source =
            await readFile(
                new URL(
                    "./stripe-webhook-runtime.ts",
                    import.meta.url
                ),
                "utf8"
            );

        assert.match(
            source,
            /D1FulfillmentPersistence/
        );

        assert.match(
            source,
            /R2ApprovedReleaseResolver/
        );

        assert.match(
            source,
            /ResendDeliveryProvider/
        );

        assert.match(
            source,
            /handoffVerifiedPaidOrderAtRuntime/
        );

        assert.match(
            source,
            /product-001e-07-runtime-approved-001/
        );

    }
);
