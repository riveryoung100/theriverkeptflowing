import type {
    FileSystemSourceIngestionRequest
} from "./assimilation/ingestion/types";
import {
    assertFileSystemSourceIngestionRequest
} from "./assimilation/ingestion/validation";

import {
    createWorkflowId,
    createWorkflowStepId,
    ORCHESTRATION_SCHEMA_VERSION
} from "./orchestration";

import {
    productionAssimilationRequestInputKey
} from "./orchestration/handlers/productionAssimilation";

import type {
    WorkflowRunRequest
} from "./orchestration";

import {
    createProductionOrchestration
} from "./productionOrchestration";


export interface ProductionSourceIntake {

    ingest(
        request:
            FileSystemSourceIngestionRequest
    ): Promise<void>;

}


function createAssimilationWorkflowRequest(
    request:
        FileSystemSourceIngestionRequest
): WorkflowRunRequest {

    return {

        workflow: {

            id:
                createWorkflowId(),

            name:
                "Production source intake",

            description:
                "Assimilates a source through the application production orchestration boundary.",

            status:
                "ready",

            createdAt:
                new Date().toISOString(),

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
                                request
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
            new Date().toISOString(),

        context:
            {}

    };

}


export function createProductionSourceIntake(
    rawSourceRootDirectory: string
): ProductionSourceIntake {

    const orchestration =
        createProductionOrchestration(
            rawSourceRootDirectory
        );

    return {

        async ingest(
            request:
                FileSystemSourceIngestionRequest
        ): Promise<void> {

            assertFileSystemSourceIngestionRequest(
                request
            );

            await orchestration
                .execute(
                    createAssimilationWorkflowRequest(
                        request
                    )
                );

        }

    };

}