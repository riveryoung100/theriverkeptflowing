import assert from "node:assert/strict";
import {
    mkdtemp,
    rm
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import type {
    FileSystemSourceIngestionRequest
} from "../assimilation/ingestion/types";

import {
    productionAssimilationRequestInputKey
} from "./handlers/productionAssimilation";
import {
    productionKnowledgePersistenceKeyInputKey
} from "./handlers/productionKnowledgeBuild";
import {
    productionKnowledgeQueryRequestInputKey
} from "./handlers/productionKnowledgeQuery";
import {
    productionKnowledgeReasoningRequestInputKey
} from "./handlers/productionKnowledgeReasoning";
import {
    productionKnowledgeInsightReasoningRequestInputKey,
    productionKnowledgeInsightRequestInputKey
} from "./handlers/productionKnowledgeInsight";

import {
    createWorkflowId,
    createWorkflowStepId
} from "./identifiers";

import {
    createProductionWorkflowExecution
} from "./productionExecution";

import {
    ORCHESTRATION_SCHEMA_VERSION
} from "./types";

import type {
    WorkflowRunRequest
} from "./types";


function createAssimilationRequest():
FileSystemSourceIngestionRequest {

    return {
        content:
            "Faith, family, purpose, stewardship, and legacy.",
        assetType:
            "note",
        originalFilename:
            "production-execution-source.txt",
        title:
            "Production Execution Source",
        mimeType:
            "text/plain",
        language:
            "en-US",
        ownership: {
            ownerType:
                "river",
            ownerName:
                "River"
        },
        rightsStatus:
            "owned",
        usagePermission: {
            mayStore:
                true,
            mayExtract:
                true,
            mayAnalyze:
                true,
            mayQuote:
                true,
            mayTransform:
                true,
            mayPublish:
                false,
            mayCommercialize:
                false,
            mayTrainModels:
                false
        },
        privacy:
            "internal",
        sensitivityCategories:
            [],
        reviewStatus:
            "not-required",
        submittedBy: {
            type:
                "river",
            id:
                "river:owner"
        },
        intakeMethod:
            "manual",
        declaredOwner:
            "River",
        declaredPurpose:
            "Production workflow execution service validation."
    };

}


function createWorkflowRequest():
WorkflowRunRequest {

    return {

        workflow: {

            id:
                createWorkflowId(),

            name:
                "Production execution",

            description:
                "Executes a governed production workflow.",

            status:
                "ready",

            createdAt:
                "2026-08-24T00:00:00.000Z",

            version:
                1,

            schemaVersion:
                ORCHESTRATION_SCHEMA_VERSION,

            steps: [
                {

                    id:
                        createWorkflowStepId(),

                    name:
                        "Assimilate source",

                    type:
                        "assimilation",

                    dependsOn:
                        [],

                    inputs: [
                        {
                            key:
                                productionAssimilationRequestInputKey,

                            value:
                                createAssimilationRequest()
                        }
                    ],

                    failurePolicy:
                        "stop",

                    requiresReview:
                        false

                }
            ]

        },

        requestedAt:
            "2026-08-24T00:00:00.000Z",

        context:
            {}

    };

}


test(
    "creates production workflow execution service",
    async () => {

        const rootDirectory =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    "river-production-execution-"
                )
            );

        try {

            assert.ok(
                createProductionWorkflowExecution(
                    rootDirectory,
                    rootDirectory
                )
            );

        }
        finally {

            await rm(
                rootDirectory,
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
    "executes workflow through production execution service",
    async () => {

        const rootDirectory =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    "river-production-execution-"
                )
            );

        try {

            const service =
                createProductionWorkflowExecution(
                    rootDirectory,
                    rootDirectory
                );

            const result =
                await service.execute(
                    createWorkflowRequest()
                );

            assert.equal(
                result.run.status,
                "completed"
            );

            assert.equal(
                result.run.steps.length,
                1
            );

            assert.equal(
                result.run.steps[0]?.status,
                "completed"
            );

            const outputs =
                result.run.steps[0]?.outputs ??
                [];

            assert.deepEqual(
                outputs
                    .map(
                        (output) => {
                            return output.key;
                        }
                    )
                    .sort(),
                [
                    "assimilationResult",
                    "classification",
                    "derivedObject",
                    "extraction",
                    "segment",
                    "sourceAsset"
                ]
            );

            const assimilationResult =
                outputs.find(
                    (output) => {
                        return (
                            output.key ===
                            "assimilationResult"
                        );
                    }
                );

            assert.ok(
                assimilationResult
            );

            assert.equal(
                (
                    assimilationResult.value as {
                        status:
                            string;
                        failedStage:
                            string | null;
                    }
                ).status,
                "completed"
            );

        }
        finally {

            await rm(
                rootDirectory,
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
    "executes production assimilation through durable Knowledge insight orchestration",
    async () => {
        const rawRoot =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    "river-workflow-knowledge-raw-"
                )
            );
        const knowledgeRoot =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    "river-workflow-knowledge-graph-"
                )
            );
        try {
            const assimilationStepId =
                createWorkflowStepId();
            const buildStepId =
                createWorkflowStepId();
            const queryStepId =
                createWorkflowStepId();
            const reasoningStepId =
                createWorkflowStepId();
            const insightStepId =
                createWorkflowStepId();
            const persistenceKey =
                "knowledge-007-production-e2e";
            const request: WorkflowRunRequest = {
                workflow: {
                    id: createWorkflowId(),
                    name: "Production Knowledge workflow",
                    description:
                        "Assimilates production source material and executes durable Knowledge build, query, reasoning, and insight.",
                    status: "ready",
                    createdAt: "2026-09-02T00:00:00.000Z",
                    version: 1,
                    schemaVersion: ORCHESTRATION_SCHEMA_VERSION,
                    steps: [
                        {
                            id: assimilationStepId,
                            name: "Assimilate source",
                            type: "assimilation",
                            dependsOn: [],
                            inputs: [
                                {
                                    key: productionAssimilationRequestInputKey,
                                    value: createAssimilationRequest()
                                }
                            ],
                            failurePolicy: "stop",
                            requiresReview: false
                        },
                        {
                            id: buildStepId,
                            name: "Build durable Knowledge graph",
                            type: "knowledge-build",
                            dependsOn: [assimilationStepId],
                            inputs: [

                                {
                                    key: productionKnowledgePersistenceKeyInputKey,
                                    value: persistenceKey
                                }
                            ],
                            failurePolicy: "stop",
                            requiresReview: false
                        },
                        {
                            id: queryStepId,
                            name: "Query durable Knowledge graph",
                            type: "knowledge-query",
                            dependsOn: [buildStepId],
                            inputs: [
                                {
                                    key: productionKnowledgePersistenceKeyInputKey,
                                    value: persistenceKey
                                },
                                {
                                    key: productionKnowledgeQueryRequestInputKey,
                                    value: {
                                        mode: "search",
                                        textSearch: {
                                            text: "Production Execution Source",
                                            includeAliases: true,
                                            includeSummary: true,
                                            includeDescription: true
                                        },
                                        limit: 10,
                                        offset: 0
                                    }
                                }
                            ],
                            failurePolicy: "stop",
                            requiresReview: false
                        },
                        {
                            id: reasoningStepId,
                            name: "Reason over durable Knowledge graph",
                            type: "knowledge-reasoning",
                            dependsOn: [queryStepId],
                            inputs: [
                                {
                                    key: productionKnowledgePersistenceKeyInputKey,
                                    value: persistenceKey
                                }
                            ],
                            failurePolicy: "stop",
                            requiresReview: false
                        },
                        {
                            id: insightStepId,
                            name: "Create Knowledge insight",
                            type: "knowledge-insight",
                            dependsOn: [reasoningStepId],
                            inputs: [
                                {
                                    key: productionKnowledgePersistenceKeyInputKey,
                                    value: persistenceKey
                                },
                                {
                                    key: productionKnowledgeInsightRequestInputKey,
                                    value: {
                                        type: "pattern",
                                        title: "Production Knowledge workflow insight",
                                        requestedAt: "2026-09-02T00:00:00.000Z",
                                        minimumConfidence: 0,
                                        requireEvidence: false
                                    }
                                }
                            ],
                            failurePolicy: "stop",
                            requiresReview: false
                        }
                    ]
                },
                requestedAt: "2026-09-02T00:00:00.000Z",
                context: {}
            };
            const execution =
                createProductionWorkflowExecution(
                    rawRoot,
                    knowledgeRoot
                );
            const result =
                await execution.execute(request);
            assert.equal(
                result.run.status,
                "completed"
            );
            assert.equal(
                result.run.steps.length,
                5
            );
            assert.deepEqual(
                result.run.steps.map((stepResult) => stepResult.status),
                ["completed", "completed", "completed", "completed", "completed"]
            );
            const outputKeys =
                result.run.steps.map((stepResult) =>
                    stepResult.outputs.map((output) => output.key)
                );
            assert.ok(outputKeys[0]?.includes("sourceAsset"));
            assert.ok(outputKeys[1]?.includes("knowledgeGraph"));
            assert.ok(outputKeys[2]?.includes("knowledgeQueryResult"));
            assert.ok(outputKeys[3]?.includes("knowledgeReasoningResult"));
            assert.ok(outputKeys[4]?.includes("knowledgeInsightResult"));
            assert.ok(outputKeys[4]?.includes("knowledgeInsight"));
        }
        finally {
            await rm(
                rawRoot,
                { recursive: true, force: true }
            );
            await rm(
                knowledgeRoot,
                { recursive: true, force: true }
            );
        }
    }
);
