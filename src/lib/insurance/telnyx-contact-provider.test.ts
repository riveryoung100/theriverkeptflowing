import assert from "node:assert/strict";
import test from "node:test";

import {
    createTelnyxContactProvider
} from "./telnyx-contact-provider";

import type {
    InsuranceContactProviderRequest
} from "./contact-attempt";

import {
    requireRiverCrmRelationshipId
} from "../river-os/crm-actions";


function phoneRequest():
    InsuranceContactProviderRequest {

    return {
        attemptId:
            "contact-attempt:test-1",
        relationshipId:
            requireRiverCrmRelationshipId(
                "relationship:test-1"
            ),
        channel:
            "phone",
        intent:
            "instant-contact",
        idempotencyKey:
            "contact-idempotency:test-1",
        destination: {
            channel:
                "phone",
            value:
                "+14325550123"
        }
    } as
        InsuranceContactProviderRequest;
}


test(
    "Telnyx provider sends a canonical Voice API dial request",
    async () => {
        let receivedUrl:
            string | undefined;

        let receivedInit:
            RequestInit | undefined;

        const provider =
            createTelnyxContactProvider(
                {
                    apiKey:
                        "test-api-key",
                    connectionId:
                        "test-connection-id",
                    fromNumber:
                        "+14325550999"
                },
                async (
                    input,
                    init
                ) => {
                    receivedUrl =
                        input;

                    receivedInit =
                        init;

                    return new Response(
                        JSON.stringify({
                            data: {
                                call_control_id:
                                    "call-control-123"
                            }
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
            );

        const result =
            await provider.requestContact(
                phoneRequest()
            );

        assert.equal(
            receivedUrl,
            "https://api.telnyx.com/v2/calls"
        );

        assert.equal(
            receivedInit?.method,
            "POST"
        );

        const headers =
            receivedInit?.headers as
                Record<
                    string,
                    string
                >;

        assert.equal(
            headers.authorization,
            "Bearer test-api-key"
        );

        const body =
            JSON.parse(
                String(
                    receivedInit?.body
                )
            ) as
                Record<
                    string,
                    unknown
                >;

        assert.deepEqual(
            body,
            {
                connection_id:
                    "test-connection-id",
                to:
                    "+14325550123",
                from:
                    "+14325550999"
            }
        );

        assert.deepEqual(
            result,
            {
                accepted:
                    true,
                providerReference:
                    "call-control-123",
                providerState:
                    "dial-request-accepted"
            }
        );
    }
);


test(
    "Telnyx provider keeps credentials server-side and destination comes from orchestration request",
    async () => {
        let body:
            Record<
                string,
                unknown
            > | undefined;

        const provider =
            createTelnyxContactProvider(
                {
                    apiKey:
                        "server-secret",
                    connectionId:
                        "connection-1",
                    fromNumber:
                        "+15550000001"
                },
                async (
                    _input,
                    init
                ) => {
                    body =
                        JSON.parse(
                            String(
                                init.body
                            )
                        ) as
                            Record<
                                string,
                                unknown
                            >;

                    return new Response(
                        JSON.stringify({
                            data: {
                                call_control_id:
                                    "call-1"
                            }
                        }),
                        {
                            status:
                                200
                        }
                    );
                }
            );

        await provider.requestContact(
            phoneRequest()
        );

        assert.equal(
            body?.to,
            "+14325550123"
        );

        assert.equal(
            "apiKey" in
                (body ?? {}),
            false
        );

        assert.equal(
            "authorization" in
                (body ?? {}),
            false
        );
    }
);


test(
    "Telnyx Voice rejects sms and email without network transport",
    async () => {
        let calls =
            0;

        const provider =
            createTelnyxContactProvider(
                {
                    apiKey:
                        "key",
                    connectionId:
                        "connection",
                    fromNumber:
                        "+15550000001"
                },
                async () => {
                    calls +=
                        1;

                    throw new Error(
                        "should not execute"
                    );
                }
            );

        for(
            const channel of [
                "sms",
                "email"
            ] as const
        ){
            const base =
                phoneRequest();

            const result =
                await provider.requestContact({
                    ...base,
                    channel,
                    destination: {
                        channel,
                        value:
                            channel ===
                                "sms"
                                ? "+14325550123"
                                : "lead@example.com"
                    }
                });

            assert.equal(
                result.accepted,
                false
            );

            if(
                result.accepted
            ){
                assert.fail(
                    "Expected rejected Telnyx channel."
                );
            }

            assert.equal(
                result.code,
                "telnyx-channel-unsupported"
            );

            assert.equal(
                result.retryable,
                false
            );
        }

        assert.equal(
            calls,
            0
        );
    }
);


test(
    "Telnyx provider rejects mismatched phone destination channel before transport",
    async () => {
        let calls =
            0;

        const provider =
            createTelnyxContactProvider(
                {
                    apiKey:
                        "key",
                    connectionId:
                        "connection",
                    fromNumber:
                        "+15550000001"
                },
                async () => {
                    calls +=
                        1;

                    throw new Error(
                        "should not execute"
                    );
                }
            );

        const request =
            phoneRequest();

        const result =
            await provider.requestContact({
                ...request,
                destination: {
                    channel:
                        "email",
                    value:
                        "lead@example.com"
                }
            });

        assert.equal(
            result.accepted,
            false
        );

        if(result.accepted){
            assert.fail(
                "Expected destination mismatch rejection."
            );
        }

        assert.equal(
            result.code,
            "telnyx-destination-channel-mismatch"
        );

        assert.equal(
            calls,
            0
        );
    }
);


test(
    "Telnyx provider maps retryable HTTP failures",
    async () => {
        const provider =
            createTelnyxContactProvider(
                {
                    apiKey:
                        "key",
                    connectionId:
                        "connection",
                    fromNumber:
                        "+15550000001"
                },
                async () =>
                    new Response(
                        "busy",
                        {
                            status:
                                503
                        }
                    )
            );

        const result =
            await provider.requestContact(
                phoneRequest()
            );

        assert.equal(
            result.accepted,
            false
        );

        if(result.accepted){
            assert.fail(
                "Expected Telnyx HTTP rejection."
            );
        }

        assert.equal(
            result.code,
            "telnyx-http-503"
        );

        assert.equal(
            result.retryable,
            true
        );
    }
);


test(
    "Telnyx provider maps non-retryable HTTP failures",
    async () => {
        const provider =
            createTelnyxContactProvider(
                {
                    apiKey:
                        "key",
                    connectionId:
                        "connection",
                    fromNumber:
                        "+15550000001"
                },
                async () =>
                    new Response(
                        "bad request",
                        {
                            status:
                                400
                        }
                    )
            );

        const result =
            await provider.requestContact(
                phoneRequest()
            );

        assert.equal(
            result.accepted,
            false
        );

        if(result.accepted){
            assert.fail(
                "Expected Telnyx HTTP rejection."
            );
        }

        assert.equal(
            result.retryable,
            false
        );
    }
);


test(
    "Telnyx provider maps transport failure as retryable",
    async () => {
        const provider =
            createTelnyxContactProvider(
                {
                    apiKey:
                        "key",
                    connectionId:
                        "connection",
                    fromNumber:
                        "+15550000001"
                },
                async () => {
                    throw new Error(
                        "network unavailable"
                    );
                }
            );

        const result =
            await provider.requestContact(
                phoneRequest()
            );

        assert.equal(
            result.accepted,
            false
        );

        if(result.accepted){
            assert.fail(
                "Expected transport rejection."
            );
        }

        assert.equal(
            result.code,
            "telnyx-transport-error"
        );

        assert.equal(
            result.retryable,
            true
        );
    }
);


test(
    "Telnyx provider rejects malformed successful response",
    async () => {
        const provider =
            createTelnyxContactProvider(
                {
                    apiKey:
                        "key",
                    connectionId:
                        "connection",
                    fromNumber:
                        "+15550000001"
                },
                async () =>
                    new Response(
                        JSON.stringify({
                            data: {}
                        }),
                        {
                            status:
                                200
                        }
                    )
            );

        const result =
            await provider.requestContact(
                phoneRequest()
            );

        assert.equal(
            result.accepted,
            false
        );

        if(result.accepted){
            assert.fail(
                "Expected invalid response rejection."
            );
        }

        assert.equal(
            result.code,
            "telnyx-invalid-response"
        );

        assert.equal(
            result.retryable,
            true
        );
    }
);


test(
    "Telnyx provider validates required configuration before use",
    () => {
        assert.throws(
            () =>
                createTelnyxContactProvider(
                    {
                        apiKey:
                            "",
                        connectionId:
                            "connection",
                        fromNumber:
                            "+15550000001"
                    },
                    async () =>
                        new Response()
                ),
            /requires apiKey/
        );
    }
);
