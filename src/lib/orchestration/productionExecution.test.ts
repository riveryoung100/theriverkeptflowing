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