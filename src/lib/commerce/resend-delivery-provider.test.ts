import assert from "node:assert/strict";
import test from "node:test";

import type {
    DeliveryProviderRequest
} from "../fulfillment/delivery-provider";

import {
    ResendDeliveryProvider
} from "./resend-delivery-provider";


function createRequest():
DeliveryProviderRequest {

    const artifactBytes =
        new TextEncoder()
            .encode(
                "%PDF-river"
            );

    return {
        fulfillmentId:
            "fulfillment-e07",

        fulfillmentRequestId:
            "fulfillment-request-e07",

        orderId:
            "order-e07",

        entitlementId:
            "entitlement-e07",

        customerReference:
            "customer-e07",

        deliveryEmail:
            "buyer@example.com",

        idempotencyKey:
            "fulfillment-e07-delivery",

        release: {
            productId:
                "river-life-operating-system",

            productVersion:
                "v1",

            releaseId:
                "product-001e-07-runtime-approved-001",

            artifactFilename:
                "river-life-operating-system-v1.pdf",

            artifactFormat:
                "PDF",

            artifactByteSize:
                artifactBytes.byteLength,

            artifactSha256:
                "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",

            createdAt:
                "2026-09-07T01:49:45.805Z",

            releaseStatus:
                "approved"
        },

        artifactBytes,

        message: {
            subject:
                "Your River Life Operating System",

            text:
                "Your purchase is attached."
        }
    };

}


test(
    "sends canonical delivery evidence to Resend with attachment and idempotency key",
    async () => {

        let capturedUrl =
            "";

        let capturedInit:
            RequestInit | undefined;

        const provider =
            new ResendDeliveryProvider({
                apiKey:
                    "re_test_key",

                from:
                    "River <delivery@example.com>",

                now:
                    () =>
                        "2026-09-07T02:00:00.000Z",

                fetcher:
                    async (
                        url,
                        init
                    ) => {

                        capturedUrl =
                            url;

                        capturedInit =
                            init;

                        return new Response(
                            JSON.stringify({
                                id:
                                    "email-resend-e07"
                            }),
                            {
                                status:
                                    200,

                                headers: {
                                    "content-type":
                                        "application/json"
                                }
                            }
                        );

                    }
            });

        const result =
            await provider.send(
                createRequest()
            );

        assert.deepEqual(
            result,
            {
                status:
                    "sent",

                providerMessageReference:
                    "email-resend-e07",

                acceptedAt:
                    "2026-09-07T02:00:00.000Z"
            }
        );

        assert.equal(
            capturedUrl,
            "https://api.resend.com/emails"
        );

        assert.ok(
            capturedInit
        );

        const headers =
            capturedInit.headers as
                Record<string, string>;

        assert.equal(
            headers.Authorization,
            "Bearer re_test_key"
        );

        assert.equal(
            headers["Idempotency-Key"],
            "fulfillment-e07-delivery"
        );

        const body =
            JSON.parse(
                String(
                    capturedInit.body
                )
            );

        assert.equal(
            body.from,
            "River <delivery@example.com>"
        );

        assert.deepEqual(
            body.to,
            [
                "buyer@example.com"
            ]
        );

        assert.equal(
            body.attachments.length,
            1
        );

        assert.equal(
            body.attachments[0].filename,
            "river-life-operating-system-v1.pdf"
        );

        assert.equal(
            typeof body.attachments[0].content,
            "string"
        );

        assert.ok(
            body.attachments[0].content.length >
                0
        );

    }
);


test(
    "returns retryable failure on Resend transport exception",
    async () => {

        const provider =
            new ResendDeliveryProvider({
                apiKey:
                    "re_test_key",

                from:
                    "River <delivery@example.com>",

                fetcher:
                    async () => {
                        throw new Error(
                            "network"
                        );
                    }
            });

        const result =
            await provider.send(
                createRequest()
            );

        assert.equal(
            result.status,
            "failed"
        );

        if (
            result.status !==
                "failed"
        ) {
            assert.fail(
                "Expected failed result."
            );
        }

        assert.equal(
            result.code,
            "resend_transport_error"
        );

        assert.equal(
            result.message,
            "Resend delivery transport failed: network"
        );

        assert.equal(
            result.retryable,
            true
        );

    }
);


test(
    "treats Resend 429 and server errors as retryable",
    async () => {

        for (
            const status of
            [
                429,
                500
            ]
        ) {

            const provider =
                new ResendDeliveryProvider({
                    apiKey:
                        "re_test_key",

                    from:
                        "River <delivery@example.com>",

                    fetcher:
                        async () =>
                            new Response(
                                JSON.stringify({
                                    error:
                                        "unavailable"
                                }),
                                {
                                    status
                                }
                            )
                });

            const result =
                await provider.send(
                    createRequest()
                );

            assert.equal(
                result.status,
                "failed"
            );

            if (
                result.status !==
                    "failed"
            ) {
                assert.fail(
                    "Expected failed result."
                );
            }

            assert.equal(
                result.retryable,
                true
            );

        }

    }
);


test(
    "treats deterministic Resend client rejection as non-retryable",
    async () => {

        const provider =
            new ResendDeliveryProvider({
                apiKey:
                    "re_test_key",

                from:
                    "River <delivery@example.com>",

                fetcher:
                    async () =>
                        new Response(
                            JSON.stringify({
                                error:
                                    "bad request"
                            }),
                            {
                                status:
                                    400
                            }
                        )
            });

        const result =
            await provider.send(
                createRequest()
            );

        assert.equal(
            result.status,
            "failed"
        );

        if (
            result.status !==
                "failed"
        ) {
            assert.fail(
                "Expected failed result."
            );
        }

        assert.equal(
            result.retryable,
            false
        );

    }
);


test(
    "fails closed when Resend success response lacks message identity",
    async () => {

        const provider =
            new ResendDeliveryProvider({
                apiKey:
                    "re_test_key",

                from:
                    "River <delivery@example.com>",

                fetcher:
                    async () =>
                        new Response(
                            JSON.stringify({}),
                            {
                                status:
                                    200
                            }
                        )
            });

        const result =
            await provider.send(
                createRequest()
            );

        assert.equal(
            result.status,
            "failed"
        );

        if (
            result.status !==
                "failed"
        ) {
            assert.fail(
                "Expected failed result."
            );
        }

        assert.equal(
            result.code,
            "resend_invalid_response"
        );

    }
);

test(
    "invokes configured fetch transport without rebinding its this reference",
    async () => {

        let called =
            false;

        async function contextSensitiveFetcher(
            this: unknown
        ): Promise<Response> {

            assert.equal(
                this,
                undefined
            );

            called =
                true;

            return new Response(
                JSON.stringify({
                    id:
                        "email_context_safe_001"
                }),
                {
                    status:
                        200
                }
            );

        }

        const provider =
            new ResendDeliveryProvider({
                apiKey:
                    "re_test_key",

                from:
                    "River <delivery@example.com>",

                fetcher:
                    contextSensitiveFetcher
            });

        const result =
            await provider.send(
                createRequest()
            );

        assert.equal(
            called,
            true
        );

        assert.equal(
            result.status,
            "sent"
        );

    }
);
