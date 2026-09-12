import {
    createWorkflowEngine
} from "./engine";

import type {
    DeterministicWorkflowEngine
} from "./engine";

import {
    createProductionWorkflowStepHandlerRegistry
} from "./handlers/productionRegistry";

import type {
    ProductionKnowledgeBuildExecution
} from "./handlers/productionKnowledgeBuild";


export function createProductionWorkflowEngine(
    rawSourceRootDirectory: string,
    knowledgeGraphRootDirectory: string,
    knowledgeBuildExecution?:
        ProductionKnowledgeBuildExecution
): DeterministicWorkflowEngine {

    const registry =
        createProductionWorkflowStepHandlerRegistry(
            rawSourceRootDirectory,
            knowledgeGraphRootDirectory,
            knowledgeBuildExecution
        );

    return createWorkflowEngine(
        registry
    );

}
