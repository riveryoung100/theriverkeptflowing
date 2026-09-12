import assert from "node:assert/strict";
import test from "node:test";

import {
    createSemanticOpenAICompatibleTransport
} from "./openai-compatible-transport";


test(
    "performs one explicit semantic model request with caller-supplied configuration",
    async () => {

        let calls =
            0;

        const transport =
            createSemanticOpenAICompatibleTransport(
                {
                    endpoint:
                        "https://model.example.test/v1/chat/completions",
                    model:
                        "semantic-test-model",
                    credential:
                        "explicit-semantic-test-credential"
                },
                async (
                    input,
                    init
                ) => {

                    calls +=
                        1;

                    assert.equal(
                        String(
                            input
                        ),
                        "https://model.example.test/v1/chat/completions"
                    );

                    assert.equal(
                        init?.method,
                        "POST"
                    );

                    const headers =
                        init?.headers as
                            Record<string, string>;

                    assert.equal(
                        headers.authorization,
                        "Bearer explicit-semantic-test-credential"
                    );

                    const body =
                        JSON.parse(
                            String(
                                init?.body
                            )
                        ) as {
                            model: string;
                            messages: readonly {
                                role: string;
                                content: string;
                            }[];
                            temperature: number;
                        };

                    assert.equal(
                        body.model,
                        "semantic-test-model"
                    );

                    assert.equal(
                        body.temperature,
                        0
                    );

                    assert.deepEqual(
                        body.messages,
                        [
                            {
                                role:
                                    "system",
                                content:
                                    "Bounded semantic system instruction."
                            },
                            {
                                role:
                                    "user",
                                content:
                                    "Bounded semantic source context."
                            }
                        ]
                    );

                    return new Response(
                        JSON.stringify({
                            choices: [
                                {
                                    message: {
                                        content:
                                            '{"nodes":[],"relations":[],"claims":[]}'
                                    }
                                }
                            ]
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
            await transport({
                system:
                    "Bounded semantic system instruction.",
                user:
                    "Bounded semantic source context."
            });

        assert.equal(
            calls,
            1
        );

        assert.equal(
            result.content,
            '{"nodes":[],"relations":[],"claims":[]}'
        );

    }
);


test(
    "fails closed on invalid semantic transport configuration before network execution",
    () => {

        let called =
            false;

        assert.throws(
            () =>
                createSemanticOpenAICompatibleTransport(
                    {
                        endpoint:
                            "file:///tmp/model",
                        model:
                            "model",
                        credential:
                            "credential"
                    },
                    async () => {

                        called =
                            true;

                        return new Response();

                    }
                ),
            /HTTP or HTTPS/
        );

        assert.equal(
            called,
            false
        );

    }
);


test(
    "rejects remote HTTP before semantic network execution",
    () => {

        const credential =
            "SEMANTIC_REMOTE_HTTP_CREDENTIAL_SENTINEL";

        let called =
            false;

        let errorText =
            "";

        try {

            createSemanticOpenAICompatibleTransport(
                {
                    endpoint:
                        "http://model.example.test/v1/chat/completions",
                    model:
                        "model",
                    credential
                },
                async () => {

                    called =
                        true;

                    return new Response();

                }
            );

        } catch (error) {

            errorText =
                String(
                    error
                );

        }

        assert.equal(
            called,
            false
        );

        assert.match(
            errorText,
            /must use HTTPS/
        );

        assert.equal(
            errorText.includes(
                credential
            ),
            false
        );

    }
);


test(
    "permits HTTP only for explicit semantic loopback-local endpoints",
    async () => {

        const endpoints =
            [
                "http://localhost:11434/v1/chat/completions",
                "http://127.0.0.1:11434/v1/chat/completions",
                "http://[::1]:11434/v1/chat/completions"
            ];

        for (
            const endpoint of
            endpoints
        ) {

            let calls =
                0;

            const transport =
                createSemanticOpenAICompatibleTransport(
                    {
                        endpoint,
                        model:
                            "model",
                        credential:
                            "credential"
                    },
                    async () => {

                        calls +=
                            1;

                        return new Response(
                            JSON.stringify({
                                choices: [
                                    {
                                        message: {
                                            content:
                                                '{"nodes":[],"relations":[],"claims":[]}'
                                        }
                                    }
                                ]
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
                await transport({
                    system:
                        "system",
                    user:
                        "user"
                });

            assert.equal(
                calls,
                1
            );

            assert.equal(
                result.content,
                '{"nodes":[],"relations":[],"claims":[]}'
            );

        }

    }
);


test(
    "rejects non-explicit localhost-like semantic HTTP hosts",
    () => {

        for (
            const endpoint of
            [
                "http://api.localhost:11434/v1/chat/completions",
                "http://127.0.0.2:11434/v1/chat/completions",
                "http://example.com/v1/chat/completions"
            ]
        ) {

            let called =
                false;

            assert.throws(
                () =>
                    createSemanticOpenAICompatibleTransport(
                        {
                            endpoint,
                            model:
                                "model",
                            credential:
                                "credential"
                        },
                        async () => {

                            called =
                                true;

                            return new Response();

                        }
                    ),
                /must use HTTPS/
            );

            assert.equal(
                called,
                false
            );

        }

    }
);


test(
    "fails closed on unsuccessful malformed or unusable semantic responses",
    async () => {

        const configuration =
            {
                endpoint:
                    "https://model.example.test/v1/chat/completions",
                model:
                    "model",
                credential:
                    "credential"
            };

        const unsuccessful =
            createSemanticOpenAICompatibleTransport(
                configuration,
                async () =>
                    new Response(
                        "denied",
                        {
                            status:
                                403
                        }
                    )
            );

        await assert.rejects(
            unsuccessful({
                system:
                    "system",
                user:
                    "user"
            }),
            /HTTP 403/
        );

        const invalidJson =
            createSemanticOpenAICompatibleTransport(
                configuration,
                async () =>
                    new Response(
                        "not-json",
                        {
                            status:
                                200,
                            headers: {
                                "content-type":
                                    "application/json"
                            }
                        }
                    )
            );

        await assert.rejects(
            invalidJson({
                system:
                    "system",
                user:
                    "user"
            }),
            /not valid JSON/
        );

        const unusable =
            createSemanticOpenAICompatibleTransport(
                configuration,
                async () =>
                    new Response(
                        JSON.stringify({
                            choices:
                                []
                        }),
                        {
                            status:
                                200,
                            headers: {
                                "content-type":
                                    "application/json"
                            }
                        }
                    )
            );

        await assert.rejects(
            unusable({
                system:
                    "system",
                user:
                    "user"
            }),
            /usable candidate content/
        );

    }
);


test(
    "semantic transport errors do not expose caller credentials",
    async () => {

        const credential =
            "SEMANTIC_CREDENTIAL_SENTINEL";

        const transport =
            createSemanticOpenAICompatibleTransport(
                {
                    endpoint:
                        "https://model.example.test/v1/chat/completions",
                    model:
                        "model",
                    credential
                },
                async () =>
                    new Response(
                        "denied",
                        {
                            status:
                                401
                        }
                    )
            );

        let errorText =
            "";

        try {

            await transport({
                system:
                    "system",
                user:
                    "user"
            });

        } catch (error) {

            errorText =
                String(
                    error
                );

        }

        assert.equal(
            errorText.includes(
                credential
            ),
            false
        );

    }
);


test(
    "rejects empty semantic model instructions before network execution",
    async () => {

        let calls =
            0;

        const transport =
            createSemanticOpenAICompatibleTransport(
                {
                    endpoint:
                        "https://model.example.test/v1/chat/completions",
                    model:
                        "model",
                    credential:
                        "credential"
                },
                async () => {

                    calls +=
                        1;

                    return new Response();

                }
            );

        await assert.rejects(
            transport({
                system:
                    "   ",
                user:
                    "user"
            }),
            /system instruction is required/
        );

        await assert.rejects(
            transport({
                system:
                    "system",
                user:
                    ""
            }),
            /user instruction is required/
        );

        assert.equal(
            calls,
            0
        );

    }
);
