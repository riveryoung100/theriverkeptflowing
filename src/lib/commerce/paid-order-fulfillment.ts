import type {
    ProductRelease
} from "../fulfillment/lifecycle";

import type {
    FulfillmentPersistence
} from "../fulfillment/persistence";

import {
    orchestrateFulfillment
} from "../fulfillment/orchestration";

import type {
    DeliveryProvider
} from "../fulfillment/delivery-provider";

import type {
    VerifiedPaymentEvent
} from "./payment-event";

import {
    normalizeVerifiedPaymentEvent
} from "./payment-event";


export interface PaidOrderFulfillmentInput {
    paymentEvent:
        VerifiedPaymentEvent;

    release:
        ProductRelease;

    artifactBytes:
        Uint8Array;

    occurredAt:
        string;

    message: {
        subject:
            string;

        text:
            string;
    };
}


export interface PaidOrderFulfillmentDependencies {
    persistence:
        FulfillmentPersistence;

    deliveryProvider:
        DeliveryProvider;
}


export type PaidOrderFulfillmentResult =
    Awaited<
        ReturnType<
            typeof orchestrateFulfillment
        >
    >;


function requirePaidPaymentEvent(
    paymentEvent:
        VerifiedPaymentEvent
): void {

    if (
        paymentEvent.paymentState !== "paid"
    ) {

        throw new Error(
            "Paid-order fulfillment integration requires verified paid payment evidence."
        );
    }
}


export async function processVerifiedPaidOrder(
    dependencies:
        PaidOrderFulfillmentDependencies,
    input:
        PaidOrderFulfillmentInput
): Promise<PaidOrderFulfillmentResult> {

    requirePaidPaymentEvent(
        input.paymentEvent
    );

    const order =
        normalizeVerifiedPaymentEvent(
            input.paymentEvent
        );

    if (
        order.paymentState !== "paid"
    ) {

        throw new Error(
            "Canonical River order must be paid before fulfillment."
        );
    }

    /*
     * Caller-owned persistence is intentional.
     *
     * PRODUCT-001D established that fulfillment orchestration does not
     * persist the normalized order itself. Commerce owns the verified
     * payment -> canonical order boundary and saves that order before
     * invoking fulfillment.
     *
     * Replays are safe only when the supplied persistence implementation
     * preserves the canonical identity/idempotency contracts already
     * required by FulfillmentPersistence.
     */
    await dependencies.persistence.saveOrder(
        order
    );

    return orchestrateFulfillment(
        {
            order,
            release:
                input.release,

            artifactBytes:
                input.artifactBytes,

            occurredAt:
                input.occurredAt,

            message:
                input.message
        },
        {
            persistence:
                dependencies.persistence,

            deliveryProvider:
                dependencies.deliveryProvider
        }
    );
}