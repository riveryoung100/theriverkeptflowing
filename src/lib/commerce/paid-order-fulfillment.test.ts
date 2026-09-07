import assert from "node:assert/strict";
import test from "node:test";

import {
    InMemoryFulfillmentPersistence
} from "../fulfillment/persistence";

import type {
    DeliveryProvider
} from "../fulfillment/delivery-provider";

import type {
    ProductRelease
} from "../fulfillment/lifecycle";

import type {
    VerifiedPaymentEvent
} from "./payment-event";

import {
    processVerifiedPaidOrder
} from "./paid-order-fulfillment";


const artifactBytes =
    new Uint8Array([
        37,
        80,
        68,
        70
    ]);


function createPaymentEvent(
    overrides:
        Partial<VerifiedPaymentEvent> =
            {}
): VerifiedPaymentEvent {

    return {
        verificationState:
            "verified",

        provider:
            "stripe",

        providerEventId:
            "evt_river_e06_001",

        providerOrderOrSessionId:
            "cs_river_e06_001",

        providerPaymentReference:
            "pi_river_e06_001",

        customerReference:
            "river-customer-e06",

        deliveryEmail:
            "customer@example.com",

        productId:
            "river-life-operating-system",

        productVersion:
            "v1",

        amount:
            29,

        currency:
            "USD",

        paymentState:
            "paid",

        eventCreatedAt:
            "2026-09-06T18:00:00.000Z",

        paidAt:
            "2026-09-06T18:00:00.000Z",

        ...overrides
    };
}


function createRelease(
    overrides:
        Partial<ProductRelease> =
            {}
): ProductRelease {

    return {
        productId:
            "river-life-operating-system",

        productVersion:
            "v1",

        releaseId:
            "river-life-operating-system-v1-approved",

        artifactFilename:
            "river-life-operating-system-v1.pdf",

        artifactFormat:
            "pdf",

        artifactByteSize:
            artifactBytes.byteLength,

        artifactSha256:
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",

        createdAt:
            "2026-09-06T17:00:00.000Z",

        releaseStatus:
            "approved",

        ...overrides
    };
}


function createDeliveryProvider() {

    let calls =
        0;

    const provider:
        DeliveryProvider =
        {
            async send() {

                calls +=
                    1;

                return {
                    status:
                        "sent",

                    acceptedAt:
                        "2026-09-06T18:01:00.000Z",

                    providerMessageReference:
                        `river-message-${calls}`
                };
            }
        };

    return {
        provider,

        calls:
            () => calls
    };
}


test(
    "persists a verified paid canonical order before invoking fulfillment",
    async () => {

        const persistence =
            new InMemoryFulfillmentPersistence();

        const delivery =
            createDeliveryProvider();

        const result =
            await processVerifiedPaidOrder(
                {
                    persistence,
                    deliveryProvider:
                        delivery.provider
                },
                {
                    paymentEvent:
                        createPaymentEvent(),

                    release:
                        createRelease(),

                    artifactBytes,

                    occurredAt:
                        "2026-09-06T18:01:00.000Z",

                    message: {
                        subject:
                            "Your River Life Operating System",

                        text:
                            "Your River Life Operating System is attached."
                    }
                }
            );

        assert.equal(
            result.fulfillmentRecord.fulfillmentState,
            "delivered"
        );

        const order =
            await persistence.getOrderByProviderOrderOrSessionId(
                "cs_river_e06_001"
            );

        assert.ok(
            order
        );

        assert.equal(
            order.paymentState,
            "paid"
        );

        assert.equal(
            order.providerPaymentReference,
            "pi_river_e06_001"
        );

        assert.equal(
            delivery.calls(),
            1
        );
    }
);


test(
    "replay of identical paid evidence does not deliver twice",
    async () => {

        const persistence =
            new InMemoryFulfillmentPersistence();

        const delivery =
            createDeliveryProvider();

        const input =
            {
                paymentEvent:
                    createPaymentEvent(),

                release:
                    createRelease(),

                artifactBytes,

                occurredAt:
                    "2026-09-06T18:01:00.000Z",

                message: {
                    subject:
                        "Your River Life Operating System",

                    text:
                        "Your River Life Operating System is attached."
                }
            };

        const dependencies =
            {
                persistence,

                deliveryProvider:
                    delivery.provider
            };

        const first =
            await processVerifiedPaidOrder(
                dependencies,
                input
            );

        const second =
            await processVerifiedPaidOrder(
                dependencies,
                input
            );

        assert.equal(
            first.fulfillmentRecord.fulfillmentState,
            "delivered"
        );

        assert.equal(
            second.fulfillmentRecord.fulfillmentState,
            "delivered"
        );

        assert.equal(
            delivery.calls(),
            1
        );
    }
);


test(
    "rejects non-paid verified evidence before order persistence or delivery",
    async () => {

        const persistence =
            new InMemoryFulfillmentPersistence();

        const delivery =
            createDeliveryProvider();

        await assert.rejects(
            processVerifiedPaidOrder(
                {
                    persistence,

                    deliveryProvider:
                        delivery.provider
                },
                {
                    paymentEvent:
                        createPaymentEvent({
                            paymentState:
                                "pending",

                            paidAt:
                                undefined
                        }),

                    release:
                        createRelease(),

                    artifactBytes,

                    occurredAt:
                        "2026-09-06T18:01:00.000Z",

                    message: {
                        subject:
                            "Your River Life Operating System",

                        text:
                            "Your River Life Operating System is attached."
                    }
                }
            ),
            /requires verified paid payment evidence/
        );

        const order =
            await persistence.getOrderByProviderOrderOrSessionId(
                "cs_river_e06_001"
            );

        assert.equal(
            order,
            undefined
        );

        assert.equal(
            delivery.calls(),
            0
        );
    }
);


test(
    "rejects an unapproved release before delivery",
    async () => {

        const persistence =
            new InMemoryFulfillmentPersistence();

        const delivery =
            createDeliveryProvider();

        await assert.rejects(
            processVerifiedPaidOrder(
                {
                    persistence,

                    deliveryProvider:
                        delivery.provider
                },
                {
                    paymentEvent:
                        createPaymentEvent(),

                    release:
                        createRelease({
                            releaseStatus:
                                "draft"
                        }),

                    artifactBytes,

                    occurredAt:
                        "2026-09-06T18:01:00.000Z",

                    message: {
                        subject:
                            "Your River Life Operating System",

                        text:
                            "Your River Life Operating System is attached."
                    }
                }
            )
        );

        assert.equal(
            delivery.calls(),
            0
        );
    }
);


test(
    "rejects product identity mismatch before delivery",
    async () => {

        const persistence =
            new InMemoryFulfillmentPersistence();

        const delivery =
            createDeliveryProvider();

        await assert.rejects(
            processVerifiedPaidOrder(
                {
                    persistence,

                    deliveryProvider:
                        delivery.provider
                },
                {
                    paymentEvent:
                        createPaymentEvent(),

                    release:
                        createRelease({
                            productVersion:
                                "v2"
                        }),

                    artifactBytes,

                    occurredAt:
                        "2026-09-06T18:01:00.000Z",

                    message: {
                        subject:
                            "Your River Life Operating System",

                        text:
                            "Your River Life Operating System is attached."
                    }
                }
            )
        );

        assert.equal(
            delivery.calls(),
            0
        );
    }
);