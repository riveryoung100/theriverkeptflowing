import assert from "node:assert/strict";

import {
    describe,
    it
} from "node:test";

import type {
    DeliveryProvider,
    DeliveryProviderResult
} from "./delivery-provider";

import {
    InMemoryFulfillmentPersistence
} from "./persistence";

import type {
    ProductRelease,
    RiverOrder
} from "./types";

import {
    orchestrateFulfillment
} from "./orchestration";


const occurredAt =
    "2026-09-05T00:00:00.000Z";


function createOrder(
    overrides:
        Partial<RiverOrder> = {}
): RiverOrder {

    return {
        orderId:
            "order-001",
        provider:
            "test-payment-provider",
        providerOrderOrSessionId:
            "provider-order-001",
        providerPaymentReference:
            "payment-001",
        customerReference:
            "customer-001",
        deliveryEmail:
            "river@example.com",
        productId:
            "river-life-operating-system",
        productVersion:
            "1.0.0",
        amount:
            4900,
        currency:
            "USD",
        paymentState:
            "paid",
        createdAt:
            "2026-09-04T23:00:00.000Z",
        paidAt:
            "2026-09-04T23:05:00.000Z",
        ...overrides
    };

}


function createRelease(
    artifactBytes:
        Uint8Array,
    overrides:
        Partial<ProductRelease> = {}
): ProductRelease {

    return {
        productId:
            "river-life-operating-system",
        productVersion:
            "1.0.0",
        releaseId:
            "release-001",
        artifactFilename:
            "river-life-operating-system-v1.pdf",
        artifactFormat:
            "pdf",
        artifactByteSize:
            artifactBytes.byteLength,
        artifactSha256:
            "test-sha256",
        createdAt:
            "2026-09-04T22:00:00.000Z",
        releaseStatus:
            "approved",
        ...overrides
    };

}


interface RecordingDeliveryProvider
extends DeliveryProvider {

    readonly calls:
        number;

}


function createRecordingProvider(
    results:
        readonly DeliveryProviderResult[]
): RecordingDeliveryProvider {

    let callCount =
        0;

    return {

        get calls() {
            return callCount;
        },

        async send() {

            const result =
                results[
                    callCount
                ];

            callCount++;

            if (!result) {
                throw new Error(
                    "Unexpected delivery-provider invocation."
                );
            }

            return result;

        }

    };

}


function createInput(
    artifactBytes:
        Uint8Array,
    overrides:
        {
            order?: RiverOrder;
            release?: ProductRelease;
            occurredAt?: string;
        } = {}
) {

    return {
        order:
            overrides.order ??
            createOrder(),
        release:
            overrides.release ??
            createRelease(
                artifactBytes
            ),
        artifactBytes,
        occurredAt:
            overrides.occurredAt ??
            occurredAt,
        message: {
            subject:
                "Your River product",
            text:
                "Your product is attached."
        }
    };

}


describe(
    "PRODUCT-001D-05 fulfillment orchestration",
    () => {

        it(
            "moves a paid order through entitlement, request, delivery, and delivered fulfillment state",
            async () => {

                const artifactBytes =
                    new Uint8Array([
                        1,
                        2,
                        3,
                        4
                    ]);

                const persistence =
                    new InMemoryFulfillmentPersistence();

                const deliveryProvider =
                    createRecordingProvider([
                        {
                            status:
                                "sent",
                            providerMessageReference:
                                "message-001",
                            acceptedAt:
                                "2026-09-05T00:00:01.000Z"
                        }
                    ]);

                const result =
                    await orchestrateFulfillment(
                        createInput(
                            artifactBytes
                        ),
                        {
                            persistence,
                            deliveryProvider
                        }
                    );

                assert.equal(
                    result.entitlement.status,
                    "active"
                );

                assert.equal(
                    result.fulfillmentRequest.paymentState,
                    "paid"
                );

                assert.equal(
                    result.fulfillmentRecord.fulfillmentState,
                    "delivered"
                );

                assert.equal(
                    result.fulfillmentRecord.deliveryState,
                    "sent"
                );

                assert.equal(
                    result.fulfillmentRecord.deliveredAt,
                    "2026-09-05T00:00:01.000Z"
                );

                assert.equal(
                    result.providerInvoked,
                    true
                );

                assert.equal(
                    deliveryProvider.calls,
                    1
                );

                const persisted =
                    await persistence
                        .getFulfillmentRecordByOrderId(
                            "order-001"
                        );

                assert.deepEqual(
                    persisted,
                    result.fulfillmentRecord
                );

            }
        );


        it(
            "is idempotent after successful delivery and does not invoke the provider twice",
            async () => {

                const artifactBytes =
                    new Uint8Array([
                        1,
                        2,
                        3,
                        4
                    ]);

                const persistence =
                    new InMemoryFulfillmentPersistence();

                const deliveryProvider =
                    createRecordingProvider([
                        {
                            status:
                                "sent",
                            providerMessageReference:
                                "message-001",
                            acceptedAt:
                                "2026-09-05T00:00:01.000Z"
                        }
                    ]);

                const input =
                    createInput(
                        artifactBytes
                    );

                const first =
                    await orchestrateFulfillment(
                        input,
                        {
                            persistence,
                            deliveryProvider
                        }
                    );

                const second =
                    await orchestrateFulfillment(
                        input,
                        {
                            persistence,
                            deliveryProvider
                        }
                    );

                assert.equal(
                    deliveryProvider.calls,
                    1
                );

                assert.equal(
                    second.providerInvoked,
                    false
                );

                assert.equal(
                    second.entitlement.entitlementId,
                    first.entitlement.entitlementId
                );

                assert.equal(
                    second.fulfillmentRequest.fulfillmentRequestId,
                    first.fulfillmentRequest.fulfillmentRequestId
                );

                assert.equal(
                    second.fulfillmentRecord.fulfillmentId,
                    first.fulfillmentRecord.fulfillmentId
                );

                assert.equal(
                    second.fulfillmentRecord.fulfillmentState,
                    "delivered"
                );

                assert.equal(
                    second.fulfillmentRecord.deliveryState,
                    "sent"
                );

            }
        );


        it(
            "records provider failure as recoverable failed fulfillment state",
            async () => {

                const artifactBytes =
                    new Uint8Array([
                        1,
                        2,
                        3,
                        4
                    ]);

                const persistence =
                    new InMemoryFulfillmentPersistence();

                const deliveryProvider =
                    createRecordingProvider([
                        {
                            status:
                                "failed",
                            code:
                                "provider-unavailable",
                            message:
                                "Temporary provider failure.",
                            retryable:
                                true
                        }
                    ]);

                const result =
                    await orchestrateFulfillment(
                        createInput(
                            artifactBytes
                        ),
                        {
                            persistence,
                            deliveryProvider
                        }
                    );

                assert.equal(
                    result.fulfillmentRecord.fulfillmentState,
                    "failed"
                );

                assert.equal(
                    result.fulfillmentRecord.deliveryState,
                    "failed"
                );

                assert.equal(
                    result.fulfillmentRecord.failureReason,
                    "provider-unavailable: Temporary provider failure."
                );

                assert.equal(
                    result.providerInvoked,
                    true
                );

                assert.equal(
                    deliveryProvider.calls,
                    1
                );

            }
        );


        it(
            "resumes a failed fulfillment without creating duplicate domain identities",
            async () => {

                const artifactBytes =
                    new Uint8Array([
                        1,
                        2,
                        3,
                        4
                    ]);

                const persistence =
                    new InMemoryFulfillmentPersistence();

                const deliveryProvider =
                    createRecordingProvider([
                        {
                            status:
                                "failed",
                            code:
                                "temporary",
                            message:
                                "Try again.",
                            retryable:
                                true
                        },
                        {
                            status:
                                "sent",
                            providerMessageReference:
                                "message-002",
                            acceptedAt:
                                "2026-09-05T00:01:00.000Z"
                        }
                    ]);

                const first =
                    await orchestrateFulfillment(
                        createInput(
                            artifactBytes
                        ),
                        {
                            persistence,
                            deliveryProvider
                        }
                    );

                const second =
                    await orchestrateFulfillment(
                        createInput(
                            artifactBytes,
                            {
                                occurredAt:
                                    "2026-09-05T00:01:00.000Z"
                            }
                        ),
                        {
                            persistence,
                            deliveryProvider
                        }
                    );

                assert.equal(
                    deliveryProvider.calls,
                    2
                );

                assert.equal(
                    second.entitlement.entitlementId,
                    first.entitlement.entitlementId
                );

                assert.equal(
                    second.fulfillmentRequest.fulfillmentRequestId,
                    first.fulfillmentRequest.fulfillmentRequestId
                );

                assert.equal(
                    second.fulfillmentRecord.fulfillmentId,
                    first.fulfillmentRecord.fulfillmentId
                );

                assert.equal(
                    second.fulfillmentRecord.fulfillmentState,
                    "delivered"
                );

                assert.equal(
                    second.fulfillmentRecord.deliveryState,
                    "sent"
                );

            }
        );


        it(
            "rejects an unpaid order before provider invocation",
            async () => {

                const artifactBytes =
                    new Uint8Array([
                        1,
                        2,
                        3,
                        4
                    ]);

                const persistence =
                    new InMemoryFulfillmentPersistence();

                const deliveryProvider =
                    createRecordingProvider([]);

                await assert.rejects(
                    async () =>
                        orchestrateFulfillment(
                            createInput(
                                artifactBytes,
                                {
                                    order:
                                        createOrder({
                                            paymentState:
                                                "pending"
                                        })
                                }
                            ),
                            {
                                persistence,
                                deliveryProvider
                            }
                        ),
                    /Fulfillment is not ready: order-not-paid/
                );

                assert.equal(
                    deliveryProvider.calls,
                    0
                );

            }
        );


        it(
            "rejects a non-approved release before provider invocation",
            async () => {

                const artifactBytes =
                    new Uint8Array([
                        1,
                        2,
                        3,
                        4
                    ]);

                const persistence =
                    new InMemoryFulfillmentPersistence();

                const deliveryProvider =
                    createRecordingProvider([]);

                await assert.rejects(
                    async () =>
                        orchestrateFulfillment(
                            createInput(
                                artifactBytes,
                                {
                                    release:
                                        createRelease(
                                            artifactBytes,
                                            {
                                                releaseStatus:
                                                    "draft"
                                            }
                                        )
                                }
                            ),
                            {
                                persistence,
                                deliveryProvider
                            }
                        ),
                    /Fulfillment is not ready: release-not-approved/
                );

                assert.equal(
                    deliveryProvider.calls,
                    0
                );

            }
        );


        it(
            "rejects mismatched artifact byte length before creating fulfillment state",
            async () => {

                const artifactBytes =
                    new Uint8Array([
                        1,
                        2,
                        3,
                        4
                    ]);

                const persistence =
                    new InMemoryFulfillmentPersistence();

                const deliveryProvider =
                    createRecordingProvider([]);

                await assert.rejects(
                    async () =>
                        orchestrateFulfillment(
                            createInput(
                                artifactBytes,
                                {
                                    release:
                                        createRelease(
                                            artifactBytes,
                                            {
                                                artifactByteSize:
                                                    99
                                            }
                                        )
                                }
                            ),
                            {
                                persistence,
                                deliveryProvider
                            }
                        ),
                    /artifactBytes length does not match release artifactByteSize/
                );

                assert.equal(
                    deliveryProvider.calls,
                    0
                );

                assert.equal(
                    await persistence
                        .getEntitlementByOrderId(
                            "order-001"
                        ),
                    undefined
                );

                assert.equal(
                    await persistence
                        .getFulfillmentRequestByOrderId(
                            "order-001"
                        ),
                    undefined
                );

                assert.equal(
                    await persistence
                        .getFulfillmentRecordByOrderId(
                            "order-001"
                        ),
                    undefined
                );

            }
        );

    }
);
