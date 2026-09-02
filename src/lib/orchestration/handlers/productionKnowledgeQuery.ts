import {
    createProductionKnowledgeQueryExecution
} from "../../knowledge/productionKnowledgeQueryExecution";

import {
    createKnowledgeQueryEngine,
    validateKnowledgeQueryRequest
} from "../../knowledge/query";

import type {
    KnowledgeQueryRequest
} from "../../knowledge/query";

import {
    createFilesystemKnowledgeGraphPersistence
} from "../../knowledge/persistence";

import type {
    WorkflowStepInput,
    WorkflowStepType
} from "../types";

import type {
    WorkflowStepHandler,
    WorkflowStepHandlerContext,
    WorkflowStepHandlerResult
} from "./types";

import {
    productionKnowledgePersistenceKeyInputKey
} from "./productionKnowledgeBuild";


export const productionKnowledgeQueryRequestInputKey =
    "queryRequest";


function getStepInput(
    context: WorkflowStepHandlerContext,
    key: string
): WorkflowStepInput | undefined {

    return context.step.inputs.find(
        (input) => input.key === key
    );

}


function requireInput(
    context: WorkflowStepHandlerContext,
    key: string
): unknown {

    const input =
        getStepInput(
            context,
            key
        );

    if (input === undefined) {
        throw new TypeError(
            `Knowledge query workflow step requires input "${key}".`
        );
    }

    return input.value;

}


export class ProductionKnowledgeQueryWorkflowStepHandler
implements WorkflowStepHandler {

    public readonly type:
        WorkflowStepType =
        "knowledge-query";


    public constructor(
        private readonly knowledgeGraphRootDirectory:
            string
    ) {}


    public async execute(
        context: WorkflowStepHandlerContext
    ): Promise<WorkflowStepHandlerResult> {

        try {

            const persistenceKeyValue =
                requireInput(
                    context,
                    productionKnowledgePersistenceKeyInputKey
                );

            if (
                typeof persistenceKeyValue !== "string" ||
                persistenceKeyValue.trim().length === 0
            ) {
                throw new TypeError(
                    `Knowledge query workflow step requires non-empty string input "${productionKnowledgePersistenceKeyInputKey}".`
                );
            }

            const request =
                requireInput(
                    context,
                    productionKnowledgeQueryRequestInputKey
                ) as KnowledgeQueryRequest;

            const requestValidation =
                validateKnowledgeQueryRequest(
                    request
                );

            if (!requestValidation.valid) {
                throw new TypeError(
                    requestValidation.issues.map((issue) => issue.message).join("; ")
                );
            }

            const result =
                await createProductionKnowledgeQueryExecution().execute(
                    persistenceKeyValue.trim(),
                    request,
                    createFilesystemKnowledgeGraphPersistence({
                        rootDirectory:
                            this.knowledgeGraphRootDirectory
                    }),
                    createKnowledgeQueryEngine()
                );

            return {
                status:
                    "completed",
                outputs: [
                    {
                        key:
                            "knowledgeQueryResult",
                        value:
                            result
                    }
                ],
                warnings:
                    result.warnings
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
                        : "Production knowledge-query handler failed."
            };

        }

    }

}


export function createProductionKnowledgeQueryWorkflowStepHandler(
    knowledgeGraphRootDirectory: string
): WorkflowStepHandler {

    return new ProductionKnowledgeQueryWorkflowStepHandler(
        knowledgeGraphRootDirectory
    );

}
