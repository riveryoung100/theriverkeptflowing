import assert from "node:assert/strict";
import {
    Readable
} from "node:stream";
import test from "node:test";

import {
    SEMANTIC_KNOWLEDGE_LIVE_CLI_AUTHORIZATION_FLAG,
    parseSemanticKnowledgeLiveCliArguments,
    readSemanticModelCredentialFromStdin,
    runSemanticKnowledgeLiveCli
} from "./semantic-knowledge-live-cli";

import {
    SEMANTIC_LIVE_EXECUTION_AUTHORIZATION
} from "../knowledge/semantic/live-execution";


const validAssetId =
    "asset:11111111-1111-4111-8111-111111111111";


test(
    "parses one explicitly authorized semantic Knowledge production request",
    () => {

        assert.deepEqual(
            parseSemanticKnowledgeLiveCliArguments(
                [
                    ".river-content",
                    ".river-knowledge",
                    validAssetId,
                    "river-semantic-knowledge",
                    "--endpoint",
                    "https://model.example.test/v1/chat/completions",
                    "--model",
                    "semantic-model",
                    SEMANTIC_KNOWLEDGE_LIVE_CLI_AUTHORIZATION_FLAG
                ]
            ),
            {
                rawSourceRootDirectory:
                    ".river-content",
                knowledgeGraphRootDirectory:
                    ".river-knowledge",
                sourceAssetId:
                    validAssetId,
                persistenceKey:
                    "river-semantic-knowledge",
                endpoint:
                    "https://model.example.test/v1/chat/completions",
                model:
                    "semantic-model"
            }
        );

    }
);


test(
    "rejects missing or duplicate live semantic Knowledge authorization",
    () => {

        assert.throws(
            () =>
                parseSemanticKnowledgeLiveCliArguments(
                    [
                        ".river-content",
                        ".river-knowledge",
                        validAssetId,
                        "river-semantic-knowledge",
                        "--endpoint",
                        "https://model.example.test/v1/chat/completions",
                        "--model",
                        "semantic-model"
                    ]
                ),
            /Explicit live semantic Knowledge authorization is required/
        );

        assert.throws(
            () =>
                parseSemanticKnowledgeLiveCliArguments(
                    [
                        ".river-content",
                        ".river-knowledge",
                        validAssetId,
                        "river-semantic-knowledge",
                        "--endpoint",
                        "https://model.example.test/v1/chat/completions",
                        "--model",
                        "semantic-model",
                        SEMANTIC_KNOWLEDGE_LIVE_CLI_AUTHORIZATION_FLAG,
                        SEMANTIC_KNOWLEDGE_LIVE_CLI_AUTHORIZATION_FLAG
                    ]
                ),
            /authorization may be specified only once/
        );

    }
);


test(
    "rejects invalid asset and public model configuration before execution construction",
    async () => {

        let constructionCalls =
            0;

        const createExecution =
            async () => {

                constructionCalls +=
                    1;

                throw new Error(
                    "must not construct"
                );

            };

        await assert.rejects(
            () =>
                runSemanticKnowledgeLiveCli({
                    arguments: [
                        ".river-content",
                        ".river-knowledge",
                        "asset:not-a-valid-uuid",
                        "river-semantic-knowledge",
                        "--endpoint",
                        "https://model.example.test/v1/chat/completions",
                        "--model",
                        "semantic-model",
                        SEMANTIC_KNOWLEDGE_LIVE_CLI_AUTHORIZATION_FLAG
                    ],
                    readCredential:
                        async () =>
                            "must-not-be-read",
                    createExecution
                }),
            /Expected a valid asset identifier/
        );

        await assert.rejects(
            () =>
                runSemanticKnowledgeLiveCli({
                    arguments: [
                        ".river-content",
                        ".river-knowledge",
                        validAssetId,
                        "river-semantic-knowledge",
                        "--endpoint",
                        "http://model.example.test/v1/chat/completions",
                        "--model",
                        "semantic-model",
                        SEMANTIC_KNOWLEDGE_LIVE_CLI_AUTHORIZATION_FLAG
                    ],
                    readCredential:
                        async () =>
                            "must-not-be-read",
                    createExecution
                }),
            /must use HTTPS/
        );

        assert.equal(
            constructionCalls,
            0
        );

    }
);


test(
    "reads a semantic model credential from an injected stdin stream",
    async () => {

        const input =
            Readable.from(
                [
                    "test-semantic-credential",
                    "\n"
                ]
            );

        assert.equal(
            await readSemanticModelCredentialFromStdin(
                input
            ),
            "test-semantic-credential"
        );

    }
);


test(
    "composes one canonical knowledge-build workflow through the authorized production seam without network execution",
    async () => {

        let constructionCalls =
            0;

        let executionCalls =
            0;

        const result =
            await runSemanticKnowledgeLiveCli({
                arguments: [
                    ".river-content",
                    ".river-knowledge",
                    validAssetId,
                    "river-semantic-knowledge",
                    "--endpoint",
                    "https://model.example.test/v1/chat/completions",
                    "--model",
                    "semantic-model",
                    SEMANTIC_KNOWLEDGE_LIVE_CLI_AUTHORIZATION_FLAG
                ],
                readCredential:
                    async () =>
                        "explicit-test-credential",
                now:
                    () =>
                        "2026-09-12T21:00:00.000Z",
                createExecution:
                    async (
                        options
                    ) => {

                        constructionCalls +=
                            1;

                        assert.equal(
                            options.rawSourceRootDirectory,
                            ".river-content"
                        );

                        assert.equal(
                            options.knowledgeGraphRootDirectory,
                            ".river-knowledge"
                        );

                        assert.equal(
                            options.endpoint,
                            "https://model.example.test/v1/chat/completions"
                        );

                        assert.equal(
                            options.model,
                            "semantic-model"
                        );

                        assert.equal(
                            options.authorization,
                            SEMANTIC_LIVE_EXECUTION_AUTHORIZATION
                        );

                        return {
                            execute:
                                async (
                                    request
                                ) => {

                                    executionCalls +=
                                        1;

                                    assert.equal(
                                        request.workflow.status,
                                        "ready"
                                    );

                                    assert.equal(
                                        request.workflow.steps.length,
                                        1
                                    );

                                    const step =
                                        request.workflow.steps[0]!;

                                    assert.equal(
                                        step.type,
                                        "knowledge-build"
                                    );

                                    assert.deepEqual(
                                        step.inputs,
                                        [
                                            {
                                                key:
                                                    "sourceAssetId",
                                                value:
                                                    validAssetId
                                            },
                                            {
                                                key:
                                                    "persistenceKey",
                                                value:
                                                    "river-semantic-knowledge"
                                            }
                                        ]
                                    );

                                    assert.equal(
                                        request.requestedAt,
                                        "2026-09-12T21:00:00.000Z"
                                    );

                                    return {
                                        run: {
                                            id:
                                                "workflow-run:11111111-1111-5111-8111-111111111111",
                                            workflowId:
                                                request.workflow.id,
                                            status:
                                                "completed",
                                            requestedAt:
                                                request.requestedAt,
                                            startedAt:
                                                request.requestedAt,
                                            completedAt:
                                                request.requestedAt,
                                            steps: [
                                                {
                                                    stepId:
                                                        step.id,
                                                    status:
                                                        "completed",
                                                    startedAt:
                                                        request.requestedAt,
                                                    completedAt:
                                                        request.requestedAt,
                                                    outputs:
                                                        []
                                                }
                                            ],
                                            warnings:
                                                [],
                                            schemaVersion:
                                                "1.0.0"
                                        }
                                    };

                                }
                        };

                    }
            });

        assert.equal(
            constructionCalls,
            1
        );

        assert.equal(
            executionCalls,
            1
        );

        assert.equal(
            result.run.status,
            "completed"
        );

    }
);
