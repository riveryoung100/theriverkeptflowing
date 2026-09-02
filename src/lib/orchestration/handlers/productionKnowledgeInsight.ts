import {
    createProductionKnowledgeInsightExecution
} from "../../knowledge/productionKnowledgeInsightExecution";

import type {
    ProductionKnowledgeInsightRequest
} from "../../knowledge/productionKnowledgeInsightExecution";

import {
    createKnowledgeReasoningEngine
} from "../../knowledge/reasoning";

import type {
    KnowledgeReasoningRequest
} from "../../knowledge/reasoning";

import {
    createKnowledgeInsightEngine
} from "../../knowledge/insight";

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


export const productionKnowledgeInsightReasoningRequestInputKey =
    "reasoningRequest";

export const productionKnowledgeInsightRequestInputKey =
    "insightRequest";


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
            `Knowledge insight workflow step requires input "${key}".`
        );
    }

    return input.value;

}


export class ProductionKnowledgeInsightWorkflowStepHandler
implements WorkflowStepHandler {

    public readonly type:
        WorkflowStepType =
        "knowledge-insight";


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
                    `Knowledge insight workflow step requires non-empty string input "${productionKnowledgePersistenceKeyInputKey}".`
                );
            }

            const explicitReasoningRequest =
                getStepInput(
                    context,
                    productionKnowledgeInsightReasoningRequestInputKey
                );

            let reasoningRequest: KnowledgeReasoningRequest;

            if (explicitReasoningRequest !== undefined) {

                reasoningRequest =
                    explicitReasoningRequest.value as KnowledgeReasoningRequest;

            }
            else {

                const dependencyReasoningResults =
                    Object.values(context.dependencyOutputs)
                        .flat()
                        .filter((output) => {
                            return output.key === "knowledgeReasoningResult";
                        })
                        .map((output) => output.value)
                        .filter((value): value is { readonly request: KnowledgeReasoningRequest } => {
                            return (
                                typeof value === "object" &&
                                value !== null &&
                                "request" in value &&
                                typeof (value as { readonly request?: unknown }).request === "object" &&
                                (value as { readonly request?: unknown }).request !== null
                            );
                        });

                if (dependencyReasoningResults.length !== 1) {
                    throw new TypeError(
                        `Knowledge insight workflow step requires input "${productionKnowledgeInsightReasoningRequestInputKey}" or exactly one dependency output "knowledgeReasoningResult".`
                    );
                }

                reasoningRequest =
                    dependencyReasoningResults[0].request;

            }

            const insightRequest =
                requireInput(
                    context,
                    productionKnowledgeInsightRequestInputKey
                ) as ProductionKnowledgeInsightRequest;

            const result =
                await createProductionKnowledgeInsightExecution().execute(
                    persistenceKeyValue.trim(),
                    reasoningRequest,
                    insightRequest,
                    createFilesystemKnowledgeGraphPersistence({
                        rootDirectory:
                            this.knowledgeGraphRootDirectory
                    }),
                    createKnowledgeReasoningEngine(),
                    createKnowledgeInsightEngine()
                );

            return {
                status:
                    "completed",
                outputs: [
                    {
                        key:
                            "knowledgeInsightResult",
                        value:
                            result
                    },
                    {
                        key:
                            "knowledgeInsight",
                        value:
                            result.insight
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
                        : "Production knowledge-insight handler failed."
            };

        }

    }

}


export function createProductionKnowledgeInsightWorkflowStepHandler(
    knowledgeGraphRootDirectory: string
): WorkflowStepHandler {

    return new ProductionKnowledgeInsightWorkflowStepHandler(
        knowledgeGraphRootDirectory
    );

}
