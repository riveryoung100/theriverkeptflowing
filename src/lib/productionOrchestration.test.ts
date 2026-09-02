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
} from "./assimilation/ingestion/types";

import {
    productionAssimilationRequestInputKey
} from "./orchestration/handlers/productionAssimilation";

import {
    createWorkflowId,
    createWorkflowStepId
} from "./orchestration/identifiers";

import {
    ORCHESTRATION_SCHEMA_VERSION
} from "./orchestration/types";

import type {
    WorkflowRunRequest
} from "./orchestration/types";

import {
    ProductionOrchestration,
    createProductionOrchestration
} from "./productionOrchestration";

import type {
    ProductionOrchestrationService
} from "./productionOrchestration";


function createAssimilationRequest():
FileSystemSourceIngestionRequest {

    return {
        content:
            "Faith, family, purpose, stewardship, and legacy.",
        assetType:
            "note",
        originalFilename:
            "application-production-source.txt",
        title:
            "Application Production Source",
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
            "Application production orchestration validation."
    };

}


function createWorkflowRequest():
WorkflowRunRequest {

    return {

        workflow: {

            id:
                createWorkflowId(),

            name:
                "Application production orchestration",

            description:
                "Executes production orchestration through the application service boundary.",

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
    "creates application production orchestration service",
    async () => {

        const rootDirectory =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    "river-application-orchestration-"
                )
            );

        try {

            const orchestration =
                createProductionOrchestration(
                    rootDirectory,
                    rootDirectory
                );

            const service:
                ProductionOrchestrationService =
                orchestration;

            assert.ok(
                service
            );

            assert.ok(
                orchestration instanceof
                    ProductionOrchestration
            );

            assert.equal(
                typeof orchestration.execute,
                "function"
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
    "executes production workflow through application orchestration boundary",
    async () => {

        const rootDirectory =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    "river-application-orchestration-"
                )
            );

        try {

            const result =
                await createProductionOrchestration(
                    rootDirectory,
                    rootDirectory
                )
                    .execute(
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

            const sourceAsset =
                outputs.find(
                    (output) => {
                        return (
                            output.key ===
                            "sourceAsset"
                        );
                    }
                );

            assert.ok(
                sourceAsset
            );

            assert.equal(
                (
                    sourceAsset.value as {
                        originalFilename:
                            string;
                        storage: {
                            provider:
                                string;
                        };
                    }
                ).originalFilename,
                "application-production-source.txt"
            );

            assert.equal(
                (
                    sourceAsset.value as {
                        storage: {
                            provider:
                                string;
                        };
                    }
                ).storage.provider,
                "filesystem"
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