import assert from "node:assert/strict";
import test from "node:test";

import {
    createOpenAICompatibleTransport
} from "./openai-compatible-transport";

test(
    "performs one explicit bounded model request with caller-supplied configuration",
    async () => {
        let calls =
            0;

        const transport =
            createOpenAICompatibleTransport(
                {
                    endpoint:
                        "https://model.example.test/v1/chat/completions",
                    model:
                        "river-test-model",
                    credential:
                        "explicit-test-credential"
                },
                async (
                    input,
                    init
                ) => {
                    calls +=
                        1;

                    assert.equal(
                        String(input),
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
                        "Bearer explicit-test-credential"
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
                        "river-test-model"
                    );

                    assert.equal(
                        body.temperature,
                        0
                    );

                    assert.equal(
                        body.messages[0]?.role,
                        "system"
                    );

                    assert.equal(
                        body.messages[1]?.role,
                        "user"
                    );

                    return new Response(
                        JSON.stringify({
                            choices: [
                                {
                                    message: {
                                        content:
                                            "export const generated = true;\n"
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
                    "Bounded system instruction.",
                user:
                    "Author the approved file."
            });

        assert.equal(
            calls,
            1
        );

        assert.equal(
            result.content,
            "export const generated = true;\n"
        );
    }
);

test(
    "fails closed on invalid configuration before transport execution",
    async () => {
        let called =
            false;

        assert.throws(
            () =>
                createOpenAICompatibleTransport(
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
    "fails closed on unsuccessful or unusable model responses",
    async () => {
        const unsuccessful =
            createOpenAICompatibleTransport(
                {
                    endpoint:
                        "https://model.example.test/v1/chat/completions",
                    model:
                        "model",
                    credential:
                        "credential"
                },
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

        const malformed =
            createOpenAICompatibleTransport(
                {
                    endpoint:
                        "https://model.example.test/v1/chat/completions",
                    model:
                        "model",
                    credential:
                        "credential"
                },
                async () =>
                    new Response(
                        JSON.stringify({
                            choices: []
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
            malformed({
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
    "GENERATE-003 rejects remote HTTP before network execution",
    () => {
        let called = false;

        assert.throws(
            () =>
                createOpenAICompatibleTransport(
                    {
                        endpoint: "http://model.example.test/v1/chat/completions",
                        model: "model",
                        credential: "GENERATE_003_CREDENTIAL_SENTINEL"
                    },
                    async () => {
                        called = true;
                        return new Response();
                    }
                ),
            /must use HTTPS/
        );

        assert.equal(called, false);
    }
);

test(
    "GENERATE-003 permits HTTP only for explicit loopback-local endpoints",
    async () => {
        const endpoints = [
            "http://localhost:11434/v1/chat/completions",
            "http://127.0.0.1:11434/v1/chat/completions",
            "http://[::1]:11434/v1/chat/completions"
        ];

        for (const endpoint of endpoints) {
            let calls = 0;

            const transport =
                createOpenAICompatibleTransport(
                    {
                        endpoint,
                        model: "model",
                        credential: "credential"
                    },
                    async () => {
                        calls += 1;

                        return new Response(
                            JSON.stringify({
                                choices: [
                                    {
                                        message: {
                                            content: "export const local = true;\n"
                                        }
                                    }
                                ]
                            }),
                            {
                                status: 200,
                                headers: {
                                    "content-type": "application/json"
                                }
                            }
                        );
                    }
                );

            const result =
                await transport({
                    system: "system",
                    user: "user"
                });

            assert.equal(calls, 1);
            assert.equal(result.content, "export const local = true;\n");
        }
    }
);

test(
    "GENERATE-003 rejects non-explicit localhost-like HTTP hosts",
    () => {
        for (const endpoint of [
            "http://api.localhost:11434/v1/chat/completions",
            "http://127.0.0.2:11434/v1/chat/completions",
            "http://example.com/v1/chat/completions"
        ]) {
            let called = false;

            assert.throws(
                () =>
                    createOpenAICompatibleTransport(
                        {
                            endpoint,
                            model: "model",
                            credential: "credential"
                        },
                        async () => {
                            called = true;
                            return new Response();
                        }
                    ),
                /must use HTTPS/
            );

            assert.equal(called, false);
        }
    }
);

test(
    "GENERATE-003 transport errors do not expose caller credentials",
    async () => {
        const credential = "GENERATE_003_CREDENTIAL_SENTINEL";
        let configurationError = "";

        try {
            createOpenAICompatibleTransport(
                {
                    endpoint: "http://remote.example.test/v1/chat/completions",
                    model: "model",
                    credential
                },
                async () => new Response()
            );
        } catch (error) {
            configurationError = String(error);
        }

        assert.equal(configurationError.includes(credential), false);

        const transport =
            createOpenAICompatibleTransport(
                {
                    endpoint: "https://model.example.test/v1/chat/completions",
                    model: "model",
                    credential
                },
                async () =>
                    new Response(
                        "denied",
                        { status: 401 }
                    )
            );

        let responseError = "";

        try {
            await transport({
                system: "system",
                user: "user"
            });
        } catch (error) {
            responseError = String(error);
        }

        assert.equal(responseError.includes(credential), false);
    }
);
