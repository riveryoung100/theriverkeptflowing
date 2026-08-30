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