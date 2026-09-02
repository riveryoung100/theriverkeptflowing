import type {
    WorkflowStepHandlerRegistry
} from "./types";

import {
    createProductionAssimilationWorkflowStepHandler
} from "./productionAssimilation";

import {
    createProductionKnowledgeBuildWorkflowStepHandler
} from "./productionKnowledgeBuild";

import {
    createProductionKnowledgeQueryWorkflowStepHandler
} from "./productionKnowledgeQuery";

import {
    createProductionKnowledgeReasoningWorkflowStepHandler
} from "./productionKnowledgeReasoning";

import {
    createProductionKnowledgeInsightWorkflowStepHandler
} from "./productionKnowledgeInsight";

import {
    createWorkflowStepHandlerRegistry
} from "./registry";


export function createProductionWorkflowStepHandlerRegistry(
    rawSourceRootDirectory: string,
    knowledgeGraphRootDirectory: string
): WorkflowStepHandlerRegistry {

    const registry =
        createWorkflowStepHandlerRegistry();

    registry.register(
        createProductionAssimilationWorkflowStepHandler(
            rawSourceRootDirectory
        )
    );

    registry.register(
        createProductionKnowledgeBuildWorkflowStepHandler(
            rawSourceRootDirectory,
            knowledgeGraphRootDirectory
        )
    );

    registry.register(
        createProductionKnowledgeQueryWorkflowStepHandler(
            knowledgeGraphRootDirectory
        )
    );

    registry.register(
        createProductionKnowledgeReasoningWorkflowStepHandler(
            knowledgeGraphRootDirectory
        )
    );

    registry.register(
        createProductionKnowledgeInsightWorkflowStepHandler(
            knowledgeGraphRootDirectory
        )
    );

    return registry;

}
