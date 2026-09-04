import assert from "node:assert/strict";
import test from "node:test";

import {
    assertDeliveryProviderRequest,
    assertDeliveryProviderResult
} from "./delivery-provider";

import type {
    DeliveryProvider,
    DeliveryProviderRequest,
    DeliveryProviderResult
} from "./delivery-provider";

import type {
    ProductRelease
} from "./types";


function createApprovedRelease(
    overrides:
        Partial<ProductRelease> = {}
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
            "PDF",

        artifactByteSize:
            4,

        artifactSha256:
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",

        createdAt:
            "2026-09-04T18:00:00.000Z",

        releaseStatus:
            "approved",

        ...overrides
    };

}


function createRequest(
    overrides:
        Partial<DeliveryProviderRequest> = {}
): DeliveryProviderRequest {

    return {
        fulfillmentId:
            "fulfillment-001",

        fulfillmentRequestId:
            "fulfillment-request-001",

        orderId:
            "order-001",

        entitlementId:
            "entitlement-001",

        customerReference:
            "customer-001",

        deliveryEmail:
            "customer@example.com",

        idempotencyKey:
            "fulfillment-request-001",

        release:
            createApprovedRelease(),

        artifactBytes:
            Uint8Array.from([
                1,
                2,
                3,
                4
            ]),

        message: {
            subject:
                "Your River Life Operating System",

            text:
                "Your approved River Life Operating System release is attached."
        },

        ...overrides
    };

}


class RecordingDeliveryProvider
implements DeliveryProvider {

    public readonly requests:
        DeliveryProviderRequest[] =
        [];

    public constructor(
        private readonly result:
            DeliveryProviderResult
    ) {}


    public async send(
        request:
            DeliveryProviderRequest
    ): Promise<DeliveryProviderResult> {

        assertDeliveryProviderRequest(
            request
        );

        this.requests.push(
            request
        );

        assertDeliveryProviderResult(
            this.result
        );

        return this.result;

    }

}


test(
    "defines a provider-independent successful delivery boundary",
    async () => {

        const result:
            DeliveryProviderResult = {
                status:
                    "sent",

                providerMessageReference:
                    "message-001",

                acceptedAt:
                    "2026-09-04T18:30:00.000Z"
            };

        const provider =
            new RecordingDeliveryProvider(
                result
            );

        const request =
            createRequest();

        const actual =
            await provider.send(
                request
            );

        assert.deepEqual(
            actual,
            result
        );

        assert.equal(
            provider.requests.length,
            1
        );

        assert.equal(
            provider.requests[0]?.fulfillmentRequestId,
            "fulfillment-request-001"
        );

        assert.equal(
            provider.requests[0]?.idempotencyKey,
            "fulfillment-request-001"
        );

    }
);


test(
    "defines structured provider-independent failure evidence",
    async () => {

        const failure:
            DeliveryProviderResult = {
                status:
                    "failed",

                code:
                    "temporary-provider-failure",

                message:
                    "Transactional delivery was not accepted.",

                retryable:
                    true
            };

        const provider =
            new RecordingDeliveryProvider(
                failure
            );

        const actual =
            await provider.send(
                createRequest()
            );

        assert.deepEqual(
            actual,
            failure
        );

        if (actual.status !== "failed") {
            assert.fail(
                "Expected failed delivery result."
            );
        }

        assert.equal(
            actual.retryable,
            true
        );

    }
);


test(
    "requires the exact delivery request to reference an approved release",
    () => {

        const request =
            createRequest({
                release:
                    createApprovedRelease({
                        releaseStatus:
                            "draft"
                    })
            });

        assert.throws(
            () => {
                assertDeliveryProviderRequest(
                    request
                );
            },
            /requires an approved product release/
        );

    }
);


test(
    "requires artifact bytes to match approved release byte-size metadata",
    () => {

        const request =
            createRequest({
                artifactBytes:
                    Uint8Array.from([
                        1,
                        2,
                        3
                    ])
            });

        assert.throws(
            () => {
                assertDeliveryProviderRequest(
                    request
                );
            },
            /byte length must match/
        );

    }
);


test(
    "requires non-empty artifact bytes",
    () => {

        const request =
            createRequest({
                artifactBytes:
                    new Uint8Array()
            });

        assert.throws(
            () => {
                assertDeliveryProviderRequest(
                    request
                );
            },
            /non-empty Uint8Array/
        );

    }
);


test(
    "requires normalized fulfillment delivery identities and destination",
    () => {

        const invalidRequests:
            DeliveryProviderRequest[] = [
                createRequest({
                    fulfillmentId:
                        " fulfillment-001"
                }),

                createRequest({
                    fulfillmentRequestId:
                        ""
                }),

                createRequest({
                    orderId:
                        "order-001 "
                }),

                createRequest({
                    entitlementId:
                        " "
                }),

                createRequest({
                    customerReference:
                        " customer-001"
                }),

                createRequest({
                    deliveryEmail:
                        " customer@example.com"
                }),

                createRequest({
                    idempotencyKey:
                        " fulfillment-request-001"
                })
            ];

        for (
            const request of
            invalidRequests
        ) {

            assert.throws(
                () => {
                    assertDeliveryProviderRequest(
                        request
                    );
                },
                /must be a non-empty normalized value/
            );

        }

    }
);


test(
    "requires customer-facing delivery message content",
    () => {

        assert.throws(
            () => {
                assertDeliveryProviderRequest(
                    createRequest({
                        message: {
                            subject:
                                "   ",

                            text:
                                "Delivery text."
                        }
                    })
                );
            },
            /subject must contain non-whitespace text/
        );

        assert.throws(
            () => {
                assertDeliveryProviderRequest(
                    createRequest({
                        message: {
                            subject:
                                "Delivery subject",

                            text:
                                ""
                        }
                    })
                );
            },
            /text must contain non-whitespace text/
        );

    }
);


test(
    "allows successful delivery evidence without a provider-specific message reference",
    () => {

        assert.doesNotThrow(
            () => {
                assertDeliveryProviderResult({
                    status:
                        "sent"
                });
            }
        );

    }
);


test(
    "validates optional provider message evidence without requiring a provider identity",
    () => {

        assert.doesNotThrow(
            () => {
                assertDeliveryProviderResult({
                    status:
                        "sent",

                    providerMessageReference:
                        "provider-message-001",

                    acceptedAt:
                        "2026-09-04T18:45:00.000Z"
                });
            }
        );

        assert.throws(
            () => {
                assertDeliveryProviderResult({
                    status:
                        "sent",

                    providerMessageReference:
                        " provider-message-001"
                });
            },
            /Provider message reference must be a non-empty normalized value/
        );

    }
);


test(
    "requires structured failure code message and retryability",
    () => {

        assert.throws(
            () => {
                assertDeliveryProviderResult({
                    status:
                        "failed",

                    code:
                        " ",

                    message:
                        "Failure.",

                    retryable:
                        true
                });
            },
            /Delivery failure code must be a non-empty normalized value/
        );

        assert.throws(
            () => {
                assertDeliveryProviderResult({
                    status:
                        "failed",

                    code:
                        "provider-failure",

                    message:
                        "   ",

                    retryable:
                        false
                });
            },
            /Delivery failure message must contain non-whitespace text/
        );

    }
);