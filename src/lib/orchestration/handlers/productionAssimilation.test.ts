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
} from "../../assimilation/ingestion/types";

import {
    createWorkflowRunId,
    createWorkflowStepId
} from "../identifiers";

import type {
    WorkflowStepDefinition
} from "../types";

import {
    createProductionAssimilationWorkflowStepHandler,
    productionAssimilationRequestInputKey
} from "./productionAssimilation";


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


function createStep(
    request:
        FileSystemSourceIngestionRequest
): WorkflowStepDefinition {

    return {
        id:
            createWorkflowStepId(),
        name:
            "Assimilate production source",
        type:
            "assimilation",
        dependsOn:
            [],
        inputs: [
            {
                key:
                    productionAssimilationRequestInputKey,
                value:
                    request
            }
        ],
        failurePolicy:
            "stop",
        requiresReview:
            false
    };

}


test(
    "executes production source assimilation through the workflow handler",
    async () => {

        const rootDirectory =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    "river-workflow-assimilation-"
                )
            );

        try {

            const handler =
                createProductionAssimilationWorkflowStepHandler(
                    rootDirectory
                );

            const result =
                await handler.execute({
                    workflowRunId:
                        createWorkflowRunId(),
                    step:
                        createStep(
                            createRequest()
                        ),
                    workflowContext:
                        {},
                    dependencyOutputs:
                        {},
                    timestamp:
                        "2026-08-24T00:00:00.000Z"
                });

            assert.equal(
                handler.type,
                "assimilation"
            );

            assert.equal(
                result.status,
                "completed"
            );

            assert.equal(
                result.error,
                undefined
            );

            assert.deepEqual(
                result.warnings,
                []
            );

            const assimilationOutput =
                result.outputs.find(
                    (output) => {
                        return output.key ===
                            "assimilationResult";
                    }
                );

            assert.ok(
                assimilationOutput
            );

            const assimilationResult =
                assimilationOutput.value as {
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
                result.outputs
                    .map(
                        (output) => {
                            return output.key;
                        }
                    )
                    .sort(),
                expectedOutputKeys
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
    "fails deterministically when the assimilation request input is missing",
    async () => {

        const rootDirectory =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    "river-workflow-assimilation-"
                )
            );

        try {

            const handler =
                createProductionAssimilationWorkflowStepHandler(
                    rootDirectory
                );

            const step:
            WorkflowStepDefinition = {
                id:
                    createWorkflowStepId(),
                name:
                    "Assimilate missing request",
                type:
                    "assimilation",
                dependsOn:
                    [],
                inputs:
                    [],
                failurePolicy:
                    "stop",
                requiresReview:
                    false
            };

            const result =
                await handler.execute({
                    workflowRunId:
                        createWorkflowRunId(),
                    step,
                    workflowContext:
                        {},
                    dependencyOutputs:
                        {},
                    timestamp:
                        "2026-08-24T00:00:00.000Z"
                });

            assert.equal(
                result.status,
                "failed"
            );

            assert.deepEqual(
                result.outputs,
                []
            );

            assert.match(
                result.error ?? "",
                /requires input "assimilationRequest"/
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
    "preserves production assimilation failure as workflow failure",
    async () => {

        const rootDirectory =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    "river-workflow-assimilation-"
                )
            );

        try {

            const handler =
                createProductionAssimilationWorkflowStepHandler(
                    rootDirectory
                );

            const request =
                createRequest();

            const invalidRequest:
            FileSystemSourceIngestionRequest = {
                ...request,
                rightsStatus:
                    "unknown",
                usagePermission: {
                    ...request.usagePermission,
                    mayPublish:
                        true
                }
            };

            const result =
                await handler.execute({
                    workflowRunId:
                        createWorkflowRunId(),
                    step:
                        createStep(
                            invalidRequest
                        ),
                    workflowContext:
                        {},
                    dependencyOutputs:
                        {},
                    timestamp:
                        "2026-08-24T00:00:00.000Z"
                });

            assert.equal(
                result.status,
                "failed"
            );

            assert.deepEqual(
                result.outputs,
                []
            );

            assert.ok(
                result.error
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