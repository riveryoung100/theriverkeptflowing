import {
    createProductionKnowledgeReasoningExecution
} from "../../knowledge/productionKnowledgeReasoningExecution";

import {
    createKnowledgeReasoningEngine,
    validateKnowledgeReasoningRequest
} from "../../knowledge/reasoning";

import type {
    KnowledgeReasoningRequest
} from "../../knowledge/reasoning";

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


export const productionKnowledgeReasoningRequestInputKey =
    "reasoningRequest";


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
            `Knowledge reasoning workflow step requires input "${key}".`
        );
    }

    return input.value;

}


export class ProductionKnowledgeReasoningWorkflowStepHandler
implements WorkflowStepHandler {

    public readonly type:
        WorkflowStepType =
        "knowledge-reasoning";


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
                    `Knowledge reasoning workflow step requires non-empty string input "${productionKnowledgePersistenceKeyInputKey}".`
                );
            }

            const explicitRequest =
                getStepInput(
                    context,
                    productionKnowledgeReasoningRequestInputKey
                );

            let request: KnowledgeReasoningRequest;

            if (explicitRequest !== undefined) {

                request =
                    explicitRequest.value as KnowledgeReasoningRequest;

            }
            else {

                const dependencyQueryResults =
                    Object.values(context.dependencyOutputs)
                        .flat()
                        .filter((output) => {
                            return output.key === "knowledgeQueryResult";
                        })
                        .map((output) => output.value)
                        .filter((value): value is { readonly nodes: readonly { readonly id: string }[] } => {
                            return (
                                typeof value === "object" &&
                                value !== null &&
                                "nodes" in value &&
                                Array.isArray((value as { readonly nodes?: unknown }).nodes)
                            );
                        });

                if (
                    dependencyQueryResults.length !== 1 ||
                    dependencyQueryResults[0].nodes.length !== 1 ||
                    typeof dependencyQueryResults[0].nodes[0]?.id !== "string" ||
                    dependencyQueryResults[0].nodes[0].id.trim().length === 0
                ) {
                    throw new TypeError(
                        `Knowledge reasoning workflow step requires input "${productionKnowledgeReasoningRequestInputKey}" or exactly one dependency output "knowledgeQueryResult" containing exactly one node.`
                    );
                }

                request = {
                    mode: "contradiction-check",
                    sourceNodeId: dependencyQueryResults[0].nodes[0].id.trim() as KnowledgeReasoningRequest["sourceNodeId"],
                    minimumConfidence: 0
                };

            }

            const requestValidation =
                validateKnowledgeReasoningRequest(
                    request
                );

            if (!requestValidation.valid) {
                throw new TypeError(
                    requestValidation.issues.map((issue) => issue.message).join("; ")
                );
            }

            const result =
                await createProductionKnowledgeReasoningExecution().execute(
                    persistenceKeyValue.trim(),
                    request,
                    createFilesystemKnowledgeGraphPersistence({
                        rootDirectory:
                            this.knowledgeGraphRootDirectory
                    }),
                    createKnowledgeReasoningEngine()
                );

            return {
                status:
                    "completed",
                outputs: [
                    {
                        key:
                            "knowledgeReasoningResult",
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
                        : "Production knowledge-reasoning handler failed."
            };

        }

    }

}


export function createProductionKnowledgeReasoningWorkflowStepHandler(
    knowledgeGraphRootDirectory: string
): WorkflowStepHandler {

    return new ProductionKnowledgeReasoningWorkflowStepHandler(
        knowledgeGraphRootDirectory
    );

}
