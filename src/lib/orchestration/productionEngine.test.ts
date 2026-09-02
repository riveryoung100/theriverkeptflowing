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
    createWorkflowId,
    createWorkflowStepId
} from "./identifiers";

import {
    createProductionWorkflowEngine
} from "./productionEngine";

import {
    ORCHESTRATION_SCHEMA_VERSION
} from "./types";

import type {
    WorkflowRunRequest
} from "./types";

function createRequest():
FileSystemSourceIngestionRequest {

    return {
        content:
            "Faith, family, purpose, stewardship, and legacy.",
        assetType:
            "note",
        originalFilename:
            "workflow-production-source.txt",
        title:
            "Workflow Production Source",
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
            "Production orchestration assimilation handler validation."
    };

}

test(
    "creates production workflow engine",
    async () => {

        const rootDirectory =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    "river-production-engine-"
                )
            );

        try {

            assert.ok(
                createProductionWorkflowEngine(
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
    "executes assimilation through production registry",
    async () => {

        const rootDirectory =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    "river-production-engine-"
                )
            );

        try {

            const workflowId =
                createWorkflowId();

            const stepId =
                createWorkflowStepId();

            const assimilationRequest =
                createRequest();

            const request:
                WorkflowRunRequest = {

                    workflow: {

                        id:
                            workflowId,

                        name:
                            "Production assimilation",

                        description:
                            "Executes assimilation through the production workflow engine.",

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
                                    stepId,

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
                                            assimilationRequest
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

            const result =
                await createProductionWorkflowEngine(
                    rootDirectory,
                    rootDirectory
                )
                    .run(
                        request
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

            const expectedOutputKeys =
                [
                    "assimilationResult",
                    "classification",
                    "derivedObject",
                    "extraction",
                    "segment",
                    "sourceAsset"
                ];

            assert.deepEqual(
                outputs
                    .map(
                        (output) => {
                            return output.key;
                        }
                    )
                    .sort(),
                expectedOutputKeys
            );

            const assimilationResultOutput =
                outputs.find(
                    (output) => {
                        return (
                            output.key ===
                            "assimilationResult"
                        );
                    }
                );

            assert.ok(
                assimilationResultOutput
            );

            const assimilationResult =
                assimilationResultOutput.value as {
                    status:
                        string;
                    failedStage:
                        string | null;
                };

            assert.equal(
                assimilationResult.status,
                "completed"
            );

            assert.equal(
                assimilationResult.failedStage,
                null
            );

            const sourceAssetOutput =
                outputs.find(
                    (output) => {
                        return (
                            output.key ===
                            "sourceAsset"
                        );
                    }
                );

            assert.ok(
                sourceAssetOutput
            );

            const sourceAsset =
                sourceAssetOutput.value as {
                    originalFilename:
                        string;
                    storage: {
                        provider:
                            string;
                        key:
                            string;
                        versionId:
                            string;
                    };
                };

            assert.equal(
                sourceAsset.originalFilename,
                assimilationRequest.originalFilename
            );

            assert.equal(
                sourceAsset.storage.provider,
                "filesystem"
            );

            assert.ok(
                sourceAsset.storage.key.length >
                0
            );

            assert.equal(
                sourceAsset.storage.versionId,
                "v1"
            );

            const extractionOutput =
                outputs.find(
                    (output) => {
                        return (
                            output.key ===
                            "extraction"
                        );
                    }
                );

            assert.ok(
                extractionOutput
            );

            const extraction =
                extractionOutput.value as {
                    text:
                        string;
                    status:
                        string;
                };

            assert.equal(
                extraction.status,
                "complete"
            );

            assert.equal(
                extraction.text,
                assimilationRequest.content
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