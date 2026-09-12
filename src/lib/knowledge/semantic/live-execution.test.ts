import assert from "node:assert/strict";
import test from "node:test";

import {
    sampleTextAsset,
    sampleTextClassification,
    sampleTextSegment
} from "../../assimilation/fixtures/sampleTextAsset";

import {
    sampleDerivationResult
} from "../../assimilation/derivation/fixtures/sampleDerivation";

import {
    SEMANTIC_LIVE_EXECUTION_AUTHORIZATION,
    createAuthorizedLiveSemanticKnowledgeExecution
} from "./live-execution";


const validCandidateContent =
    JSON.stringify({
        nodes: [
            {
                key:
                    "semantic-source",
                nodeType:
                    "concept",
                canonicalName:
                    "Semantic source",
                aliases:
                    [],
                confidence:
                    1
            }
        ],
        relations:
            [],
        claims:
            []
    });


test(
    "rejects missing live semantic authorization before credential consumption",
    async () => {

        let credentialReads =
            0;

        let networkCalls =
            0;

        await assert.rejects(
            () =>
                createAuthorizedLiveSemanticKnowledgeExecution({
                    endpoint:
                        "https://model.example.test/v1/chat/completions",
                    model:
                        "semantic-model",
                    authorization:
                        "not-authorized",
                    readCredential:
                        async () => {

                            credentialReads +=
                                1;

                            return "credential";

                        },
                    fetchImplementation:
                        async () => {

                            networkCalls +=
                                1;

                            return new Response();

                        }
                }),
            /Explicit live semantic model invocation authorization is required/
        );

        assert.equal(
            credentialReads,
            0
        );

        assert.equal(
            networkCalls,
            0
        );

    }
);


test(
    "validates non-secret semantic configuration before credential consumption",
    async () => {

        for (
            const configuration of
            [
                {
                    endpoint:
                        "   ",
                    model:
                        "semantic-model"
                },
                {
                    endpoint:
                        "not-an-absolute-url",
                    model:
                        "semantic-model"
                },
                {
                    endpoint:
                        "http://model.example.test/v1/chat/completions",
                    model:
                        "semantic-model"
                },
                {
                    endpoint:
                        "https://model.example.test/v1/chat/completions",
                    model:
                        ""
                }
            ]
        ) {

            let credentialReads =
                0;

            await assert.rejects(
                () =>
                    createAuthorizedLiveSemanticKnowledgeExecution({
                        endpoint:
                            configuration.endpoint,
                        model:
                            configuration.model,
                        authorization:
                            SEMANTIC_LIVE_EXECUTION_AUTHORIZATION,
                        readCredential:
                            async () => {

                                credentialReads +=
                                    1;

                                return "credential";

                            }
                    }),
                /is required|absolute HTTP or HTTPS URL|must use HTTPS/
            );

            assert.equal(
                credentialReads,
                0
            );

        }

    }
);


test(
    "rejects an empty explicit semantic credential before transport use",
    async () => {

        let credentialReads =
            0;

        let networkCalls =
            0;

        await assert.rejects(
            () =>
                createAuthorizedLiveSemanticKnowledgeExecution({
                    endpoint:
                        "https://model.example.test/v1/chat/completions",
                    model:
                        "semantic-model",
                    authorization:
                        SEMANTIC_LIVE_EXECUTION_AUTHORIZATION,
                    readCredential:
                        async () => {

                            credentialReads +=
                                1;

                            return "   ";

                        },
                    fetchImplementation:
                        async () => {

                            networkCalls +=
                                1;

                            return new Response();

                        }
                }),
            /credential is required/
        );

        assert.equal(
            credentialReads,
            1
        );

        assert.equal(
            networkCalls,
            0
        );

    }
);


test(
    "constructs authorized semantic execution without performing network work",
    async () => {

        let credentialReads =
            0;

        let networkCalls =
            0;

        const execution =
            await createAuthorizedLiveSemanticKnowledgeExecution({
                endpoint:
                    "https://model.example.test/v1/chat/completions",
                model:
                    "semantic-model",
                authorization:
                    SEMANTIC_LIVE_EXECUTION_AUTHORIZATION,
                readCredential:
                    async () => {

                        credentialReads +=
                            1;

                        return "explicit-semantic-credential";

                    },
                fetchImplementation:
                    async () => {

                        networkCalls +=
                            1;

                        return new Response(
                            JSON.stringify({
                                choices: [
                                    {
                                        message: {
                                            content:
                                                validCandidateContent
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
            });

        assert.equal(
            credentialReads,
            1
        );

        assert.equal(
            networkCalls,
            0
        );

        assert.equal(
            typeof execution.execute,
            "function"
        );

    }
);


test(
    "authorized semantic execution performs one bounded model request only when executed",
    async () => {

        let credentialReads =
            0;

        let networkCalls =
            0;

        let authorizationHeader =
            "";

        const execution =
            await createAuthorizedLiveSemanticKnowledgeExecution({
                endpoint:
                    "https://model.example.test/v1/chat/completions",
                model:
                    "semantic-model",
                authorization:
                    SEMANTIC_LIVE_EXECUTION_AUTHORIZATION,
                readCredential:
                    async () => {

                        credentialReads +=
                            1;

                        return "explicit-semantic-credential";

                    },
                fetchImplementation:
                    async (
                        _input,
                        init
                    ) => {

                        networkCalls +=
                            1;

                        const headers =
                            init?.headers as
                                Record<string, string>;

                        authorizationHeader =
                            headers.authorization;

                        return new Response(
                            JSON.stringify({
                                choices: [
                                    {
                                        message: {
                                            content:
                                                validCandidateContent
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
            });

        const result =
            await execution.execute({
                asset:
                    sampleTextAsset,
                derivedObject:
                    sampleDerivationResult.results[0]!.derivative,
                interpretation: {
                    segment:
                        sampleTextSegment,
                    classification:
                        sampleTextClassification
                }
            });

        assert.equal(
            credentialReads,
            1
        );

        assert.equal(
            networkCalls,
            1
        );

        assert.equal(
            authorizationHeader,
            "Bearer explicit-semantic-credential"
        );

        assert.equal(
            result.graph.nodes.length,
            1
        );

    }
);


test(
    "consumes live semantic authorization after exactly one model invocation",
    async () => {

        let credentialReads =
            0;

        let networkCalls =
            0;

        const execution =
            await createAuthorizedLiveSemanticKnowledgeExecution({
                endpoint:
                    "https://model.example.test/v1/chat/completions",
                model:
                    "semantic-model",
                authorization:
                    SEMANTIC_LIVE_EXECUTION_AUTHORIZATION,
                readCredential:
                    async () => {

                        credentialReads +=
                            1;

                        return "explicit-semantic-credential";

                    },
                fetchImplementation:
                    async () => {

                        networkCalls +=
                            1;

                        return new Response(
                            JSON.stringify({
                                choices: [
                                    {
                                        message: {
                                            content:
                                                validCandidateContent
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
            });

        const input =
            {
                asset:
                    sampleTextAsset,
                derivedObject:
                    sampleDerivationResult.results[0]!.derivative,
                interpretation: {
                    segment:
                        sampleTextSegment,
                    classification:
                        sampleTextClassification
                }
            };

        await execution.execute(
            input
        );

        await assert.rejects(
            () =>
                execution.execute(
                    input
                ),
            /authorization has already been consumed/
        );

        assert.equal(
            credentialReads,
            1
        );

        assert.equal(
            networkCalls,
            1
        );

    }
);

test(
    "live semantic composition does not read ambient environment credentials",
    async () => {

        const previous =
            process.env.OPENAI_API_KEY;

        process.env.OPENAI_API_KEY =
            "AMBIENT_CREDENTIAL_SENTINEL";

        let authorizationHeader =
            "";

        try {

            const execution =
                await createAuthorizedLiveSemanticKnowledgeExecution({
                    endpoint:
                        "https://model.example.test/v1/chat/completions",
                    model:
                        "semantic-model",
                    authorization:
                        SEMANTIC_LIVE_EXECUTION_AUTHORIZATION,
                    readCredential:
                        async () =>
                            "explicit-credential",
                    fetchImplementation:
                        async (
                            _input,
                            init
                        ) => {

                            const headers =
                                init?.headers as
                                    Record<string, string>;

                            authorizationHeader =
                                headers.authorization;

                            return new Response(
                                JSON.stringify({
                                    choices: [
                                        {
                                            message: {
                                                content:
                                                    validCandidateContent
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
                });

            await execution.execute({
                asset:
                    sampleTextAsset,
                derivedObject:
                    sampleDerivationResult.results[0]!.derivative,
                interpretation: {
                    segment:
                        sampleTextSegment,
                    classification:
                        sampleTextClassification
                }
            });

            assert.equal(
                authorizationHeader,
                "Bearer explicit-credential"
            );

            assert.equal(
                authorizationHeader.includes(
                    "AMBIENT_CREDENTIAL_SENTINEL"
                ),
                false
            );

        } finally {

            if (
                previous ===
                undefined
            ) {
                delete process.env.OPENAI_API_KEY;
            }
            else {
                process.env.OPENAI_API_KEY =
                    previous;
            }

        }

    }
);
