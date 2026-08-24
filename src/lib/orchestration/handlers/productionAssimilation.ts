import type {
    FileSystemSourceIngestionRequest
} from "../../assimilation/ingestion/types";
import {
    assertFileSystemSourceIngestionRequest
} from "../../assimilation/ingestion/validation";


import {
    createProductionSourceAssimilation
} from "../../assimilation/production/engine";

import type {
    ProductionSourceAssimilationService
} from "../../assimilation/production/types";

import type {
    WorkflowStepInput,
    WorkflowStepType
} from "../types";

import type {
    WorkflowStepHandler,
    WorkflowStepHandlerContext,
    WorkflowStepHandlerResult
} from "./types";


export const productionAssimilationRequestInputKey =
    "assimilationRequest";


function getStepInput(
    context: WorkflowStepHandlerContext,
    key: string
): WorkflowStepInput | undefined {

    return context.step.inputs.find(
        (input) => {
            return input.key === key;
        }
    );

}


function requireAssimilationRequest(
    context: WorkflowStepHandlerContext
): FileSystemSourceIngestionRequest {

    const input =
        getStepInput(
            context,
            productionAssimilationRequestInputKey
        );

    if (
        input ===
        undefined
    ) {

        throw new TypeError(
            `Assimilation workflow step requires input "${productionAssimilationRequestInputKey}".`
        );

    }

    assertFileSystemSourceIngestionRequest(
        input.value
    );

    return input.value;

}


export class ProductionAssimilationWorkflowStepHandler
implements WorkflowStepHandler {

    public readonly type:
        WorkflowStepType =
        "assimilation";


    public constructor(
        private readonly service:
            ProductionSourceAssimilationService
    ) {}


    public async execute(
        context: WorkflowStepHandlerContext
    ): Promise<WorkflowStepHandlerResult> {

        try {

            const request =
                requireAssimilationRequest(
                    context
                );

            const result =
                await this.service.ingestAndAssimilate(
                    request
                );

            if (
                result.status ===
                "failed"
            ) {

                return {
                    status:
                        "failed",
                    outputs: [
                        {
                            key:
                                "assimilationResult",
                            value:
                                result
                        },
                        {
                            key:
                                "sourceAsset",
                            value:
                                result.asset
                        }
                    ],
                    warnings:
                        [],
                    error:
                        result.failedStage ===
                            null
                            ? "Production assimilation failed."
                            : `Production assimilation failed during ${result.failedStage}.`
                };

            }

            return {
                status:
                    "completed",
                outputs: [
                    {
                        key:
                            "assimilationResult",
                        value:
                            result
                    },
                    {
                        key:
                            "sourceAsset",
                        value:
                            result.asset
                    },
                    {
                        key:
                            "extraction",
                        value:
                            result.extraction
                    },
                    {
                        key:
                            "segment",
                        value:
                            result.segment
                    },
                    {
                        key:
                            "classification",
                        value:
                            result.classification
                    },
                    {
                        key:
                            "derivedObject",
                        value:
                            result.derivedObject
                    }
                ],
                warnings:
                    []
            };

        }
        catch (error) {

            return {
                status:
                    "failed",
                outputs:
                    [],
                warnings:
                    [],
                error:
                    error instanceof Error
                        ? error.message
                        : "Production assimilation handler failed."
            };

        }

    }

}


export function createProductionAssimilationWorkflowStepHandler(
    rawSourceRootDirectory: string
): WorkflowStepHandler {

    return new
        ProductionAssimilationWorkflowStepHandler(
            createProductionSourceAssimilation(
                rawSourceRootDirectory
            )
        );

}
