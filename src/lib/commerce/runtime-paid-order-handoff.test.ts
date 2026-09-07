import assert from "node:assert/strict";
import test from "node:test";

import {
    InMemoryFulfillmentPersistence
} from "../fulfillment/persistence";

import type {
    DeliveryProvider,
    DeliveryProviderRequest,
    DeliveryProviderResult
} from "../fulfillment/delivery-provider";

import type {
    ProductRelease
} from "../fulfillment/types";

import type {
    VerifiedPaymentEvent
} from "./payment-event";

import {
    handoffVerifiedPaidOrderAtRuntime,
    type ApprovedReleaseResolver
} from "./runtime-paid-order-handoff";


const artifactBytes =
    new Uint8Array([
        37,
        80,
        68,
        70
    ]);


const release: ProductRelease = {
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
        "ff2daef78217a5afdf03f355c40016393b64596d7253c5b395aee87ebf9b5f78",

    createdAt:
        "2026-09-06T00:00:00.000Z",

    releaseStatus:
        "approved"
};


const paymentEvent: VerifiedPaymentEvent = {
    verificationState:
        "verified",

    provider:
        "stripe",

    providerEventId:
        "evt_runtime_paid_001",

    providerOrderOrSessionId:
        "cs_runtime_paid_001",

    providerPaymentReference:
        "pi_runtime_paid_001",

    customerReference:
        "customer-runtime-001",

    deliveryEmail:
        "customer@example.com",

    productId:
        release.productId,

    productVersion:
        release.productVersion,

    amount:
        29,

    currency:
        "USD",

    paymentState:
        "paid",

    eventCreatedAt:
        "2026-09-06T00:01:00.000Z",

    paidAt:
        "2026-09-06T00:01:00.000Z"
};


class RecordingDeliveryProvider
implements DeliveryProvider {

    readonly calls:
        DeliveryProviderRequest[] =
        [];


    async send(
        request: DeliveryProviderRequest
    ): Promise<
        DeliveryProviderResult
    > {

        this.calls.push(
            structuredClone(request)
        );

        return {
            status:
                "sent",

            providerMessageReference:
                "runtime-message-001",

            sentAt:
                "2026-09-06T00:02:00.000Z"
        };
    }
}


class RecordingReleaseResolver
implements ApprovedReleaseResolver {

    readonly calls:
        Array<{
            productId: string;
            productVersion: string;
        }> =
        [];


    constructor(
        private readonly artifact: {
            release: ProductRelease;
            artifactBytes: Uint8Array;
        }
    ) {}


    async resolveApprovedRelease(
        productId: string,
        productVersion: string
    ) {

        this.calls.push({
            productId,
            productVersion
        });

        return this.artifact;
    }
}


test(
    "runtime handoff resolves the approved release and delivers verified paid evidence through canonical fulfillment",
    async () => {

        const persistence =
            new InMemoryFulfillmentPersistence();

        const deliveryProvider =
            new RecordingDeliveryProvider();

        const releaseResolver =
            new RecordingReleaseResolver({
                release,
                artifactBytes
            });

        const result =
            await handoffVerifiedPaidOrderAtRuntime(
                {
                    paymentEvent,

                    occurredAt:
                        "2026-09-06T00:02:00.000Z",

                    message: {
                        subject:
                            "Your River Life Operating System",

                        text:
                            "Your purchase is ready."
                    }
                },
                {
                    persistence,
                    deliveryProvider,
                    releaseResolver
                }
            );

        assert.equal(
            releaseResolver.calls.length,
            1
        );

        assert.deepEqual(
            releaseResolver.calls[0],
            {
                productId:
                    paymentEvent.productId,

                productVersion:
                    paymentEvent.productVersion
            }
        );

        assert.equal(
            deliveryProvider.calls.length,
            1
        );

        assert.equal(
            result.fulfillmentRecord
                .fulfillmentState,
            "delivered"
        );

        assert.equal(
            result.fulfillmentRecord
                .deliveryState,
            "sent"
        );
    }
);


test(
    "runtime handoff rejects non-paid evidence before release resolution or delivery",
    async () => {

        const persistence =
            new InMemoryFulfillmentPersistence();

        const deliveryProvider =
            new RecordingDeliveryProvider();

        const releaseResolver =
            new RecordingReleaseResolver({
                release,
                artifactBytes
            });

        await assert.rejects(
            () =>
                handoffVerifiedPaidOrderAtRuntime(
                    {
                        paymentEvent: {
                            ...paymentEvent,
                            paymentState:
                                "failed",
                            paidAt:
                                undefined
                        },

                        occurredAt:
                            "2026-09-06T00:02:00.000Z",

                        message: {
                            subject:
                                "Your River Life Operating System",

                            text:
                                "Your purchase is ready."
                        }
                    },
                    {
                        persistence,
                        deliveryProvider,
                        releaseResolver
                    }
                ),
            /requires verified paid payment evidence/
        );

        assert.equal(
            releaseResolver.calls.length,
            0
        );

        assert.equal(
            deliveryProvider.calls.length,
            0
        );
    }
);


test(
    "runtime handoff rejects a resolver result that is not approved before delivery",
    async () => {

        const persistence =
            new InMemoryFulfillmentPersistence();

        const deliveryProvider =
            new RecordingDeliveryProvider();

        const releaseResolver =
            new RecordingReleaseResolver({
                release: {
                    ...release,
                    releaseStatus:
                        "draft"
                },
                artifactBytes
            });

        await assert.rejects(
            () =>
                handoffVerifiedPaidOrderAtRuntime(
                    {
                        paymentEvent,

                        occurredAt:
                            "2026-09-06T00:02:00.000Z",

                        message: {
                            subject:
                                "Your River Life Operating System",

                            text:
                                "Your purchase is ready."
                        }
                    },
                    {
                        persistence,
                        deliveryProvider,
                        releaseResolver
                    }
                ),
            /non-approved release/
        );

        assert.equal(
            deliveryProvider.calls.length,
            0
        );
    }
);


test(
    "runtime handoff rejects release identity mismatch before delivery",
    async () => {

        const persistence =
            new InMemoryFulfillmentPersistence();

        const deliveryProvider =
            new RecordingDeliveryProvider();

        const releaseResolver =
            new RecordingReleaseResolver({
                release: {
                    ...release,
                    productVersion:
                        "v2"
                },
                artifactBytes
            });

        await assert.rejects(
            () =>
                handoffVerifiedPaidOrderAtRuntime(
                    {
                        paymentEvent,

                        occurredAt:
                            "2026-09-06T00:02:00.000Z",

                        message: {
                            subject:
                                "Your River Life Operating System",

                            text:
                                "Your purchase is ready."
                        }
                    },
                    {
                        persistence,
                        deliveryProvider,
                        releaseResolver
                    }
                ),
            /productVersion does not match/
        );

        assert.equal(
            deliveryProvider.calls.length,
            0
        );
    }
);


test(
    "runtime handoff rejects artifact byte mismatch before delivery",
    async () => {

        const persistence =
            new InMemoryFulfillmentPersistence();

        const deliveryProvider =
            new RecordingDeliveryProvider();

        const releaseResolver =
            new RecordingReleaseResolver({
                release,
                artifactBytes:
                    new Uint8Array([
                        37
                    ])
            });

        await assert.rejects(
            () =>
                handoffVerifiedPaidOrderAtRuntime(
                    {
                        paymentEvent,

                        occurredAt:
                            "2026-09-06T00:02:00.000Z",

                        message: {
                            subject:
                                "Your River Life Operating System",

                            text:
                                "Your purchase is ready."
                        }
                    },
                    {
                        persistence,
                        deliveryProvider,
                        releaseResolver
                    }
                ),
            /byte length does not match/
        );

        assert.equal(
            deliveryProvider.calls.length,
            0
        );
    }
);

