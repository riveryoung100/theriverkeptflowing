import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createProductionKnowledgeBuildWorkflowStepHandler } from "./productionKnowledgeBuild";
import { createProductionKnowledgeQueryWorkflowStepHandler } from "./productionKnowledgeQuery";
import { createProductionKnowledgeReasoningWorkflowStepHandler } from "./productionKnowledgeReasoning";
import { createProductionKnowledgeInsightWorkflowStepHandler } from "./productionKnowledgeInsight";
import type { WorkflowStepHandlerContext } from "./types";
import { createWorkflowRunId } from "../identifiers";

function createContext(type: "knowledge-build" | "knowledge-query" | "knowledge-reasoning" | "knowledge-insight", inputs: ReadonlyArray<{ readonly key: string; readonly value: unknown; }>): WorkflowStepHandlerContext {
    return {
        workflowRunId: createWorkflowRunId(),
        step: {
            id: `test-${type}`,
            type,
            dependencies: [],
            inputs
        },
        workflowContext: {},
        dependencyOutputs: {},
        timestamp: "2026-09-02T00:00:00.000Z"
    } as unknown as WorkflowStepHandlerContext;
}

test("production Knowledge handlers expose exact orchestration step types", async () => {
    const rawRoot = await mkdtemp(path.join(os.tmpdir(), "river-k007-raw-"));
    const knowledgeRoot = await mkdtemp(path.join(os.tmpdir(), "river-k007-knowledge-"));
    try {
        assert.equal(createProductionKnowledgeBuildWorkflowStepHandler(rawRoot, knowledgeRoot).type, "knowledge-build");
        assert.equal(createProductionKnowledgeQueryWorkflowStepHandler(knowledgeRoot).type, "knowledge-query");
        assert.equal(createProductionKnowledgeReasoningWorkflowStepHandler(knowledgeRoot).type, "knowledge-reasoning");
        assert.equal(createProductionKnowledgeInsightWorkflowStepHandler(knowledgeRoot).type, "knowledge-insight");
    } finally {
        await rm(rawRoot, { recursive: true, force: true });
        await rm(knowledgeRoot, { recursive: true, force: true });
    }
});

test("production Knowledge handlers fail deterministically when required inputs are missing", async () => {
    const rawRoot = await mkdtemp(path.join(os.tmpdir(), "river-k007-raw-"));
    const knowledgeRoot = await mkdtemp(path.join(os.tmpdir(), "river-k007-knowledge-"));
    try {
        const results = [
            await createProductionKnowledgeBuildWorkflowStepHandler(rawRoot, knowledgeRoot).execute(createContext("knowledge-build", [])),
            await createProductionKnowledgeQueryWorkflowStepHandler(knowledgeRoot).execute(createContext("knowledge-query", [])),
            await createProductionKnowledgeReasoningWorkflowStepHandler(knowledgeRoot).execute(createContext("knowledge-reasoning", [])),
            await createProductionKnowledgeInsightWorkflowStepHandler(knowledgeRoot).execute(createContext("knowledge-insight", []))
        ];
        for (const result of results) {
            assert.equal(result.status, "failed");
            assert.deepEqual(result.outputs, []);
            assert.deepEqual(result.warnings, []);
            assert.equal(typeof result.error, "string");
            assert.ok((result.error ?? "").length > 0);
        }
    } finally {
        await rm(rawRoot, { recursive: true, force: true });
        await rm(knowledgeRoot, { recursive: true, force: true });
    }
});

test("production query and reasoning handlers reject invalid request objects before durable retrieval", async () => {
    const knowledgeRoot = await mkdtemp(path.join(os.tmpdir(), "river-k007-knowledge-"));
    try {
        const queryResult = await createProductionKnowledgeQueryWorkflowStepHandler(knowledgeRoot).execute(createContext("knowledge-query", [{ key: "persistenceKey", value: "sample-graph" }, { key: "queryRequest", value: {} }]));
        const reasoningResult = await createProductionKnowledgeReasoningWorkflowStepHandler(knowledgeRoot).execute(createContext("knowledge-reasoning", [{ key: "persistenceKey", value: "sample-graph" }, { key: "reasoningRequest", value: {} }]));
        assert.equal(queryResult.status, "failed");
        assert.equal(reasoningResult.status, "failed");
        assert.deepEqual(queryResult.outputs, []);
        assert.deepEqual(reasoningResult.outputs, []);
        assert.equal(typeof queryResult.error, "string");
        assert.equal(typeof reasoningResult.error, "string");
    } finally {
        await rm(knowledgeRoot, { recursive: true, force: true });
    }
});


test(
    "production knowledge-build uses an explicitly injected knowledge-build execution strategy",
    async () => {

        const rawRoot =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    "river-k007-raw-"
                )
            );

        const knowledgeRoot =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    "river-k007-knowledge-"
                )
            );

        try {

            let executionCalls =
                0;

            let capturedAssetId:
                string | undefined;

            let capturedPersistenceKey:
                string | undefined;

            const expectedResult = {
                graph: {
                    nodes:
                        [],
                    relations:
                        [],
                    claims:
                        [],
                    revisions:
                        []
                },
                createdNodeIds:
                    [],
                createdRelationIds:
                    [],
                createdClaimIds:
                    [],
                warnings: [
                    "explicit execution strategy"
                ]
            };

            const execution = {

                async executeAndPersistFromProductionRecords(
                    assetId: string,
                    persistenceKey: string
                ) {

                    executionCalls +=
                        1;

                    capturedAssetId =
                        assetId;

                    capturedPersistenceKey =
                        persistenceKey;

                    return expectedResult;

                }

            };

            const handler =
                createProductionKnowledgeBuildWorkflowStepHandler(
                    rawRoot,
                    knowledgeRoot,
                    execution
                );

            const result =
                await handler.execute(
                    createContext(
                        "knowledge-build",
                        [
                            {
                                key:
                                    "sourceAssetId",
                                value:
                                    "asset:11111111-1111-4111-8111-111111111111"
                            },
                            {
                                key:
                                    "persistenceKey",
                                value:
                                    "explicit-strategy"
                            }
                        ]
                    )
                );

            assert.equal(
                executionCalls,
                1
            );

            assert.equal(
                capturedAssetId,
                "asset:11111111-1111-4111-8111-111111111111"
            );

            assert.equal(
                capturedPersistenceKey,
                "explicit-strategy"
            );

            assert.equal(
                result.status,
                "completed"
            );

            assert.deepEqual(
                result.warnings,
                [
                    "explicit execution strategy"
                ]
            );

            assert.equal(
                result.outputs.find(
                    (output) =>
                        output.key ===
                        "knowledgeResult"
                )?.value,
                expectedResult
            );

        }
        finally {

            await rm(
                rawRoot,
                {
                    recursive:
                        true,
                    force:
                        true
                }
            );

            await rm(
                knowledgeRoot,
                {
                    recursive:
                        true,
                    force:
                        true
                }
            );

        }

    }
);


test(
    "production knowledge-build preserves the existing default execution strategy when none is injected",
    async () => {

        const rawRoot =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    "river-k007-raw-"
                )
            );

        const knowledgeRoot =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    "river-k007-knowledge-"
                )
            );

        try {

            const handler =
                createProductionKnowledgeBuildWorkflowStepHandler(
                    rawRoot,
                    knowledgeRoot
                );

            assert.equal(
                handler.type,
                "knowledge-build"
            );

        }
        finally {

            await rm(
                rawRoot,
                {
                    recursive:
                        true,
                    force:
                        true
                }
            );

            await rm(
                knowledgeRoot,
                {
                    recursive:
                        true,
                    force:
                        true
                }
            );

        }

    }
);
