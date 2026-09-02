import {
    createWorkflowEngine
} from "./engine";

import type {
    DeterministicWorkflowEngine
} from "./engine";

import {
    createProductionWorkflowStepHandlerRegistry
} from "./handlers/productionRegistry";


export function createProductionWorkflowEngine(
    rawSourceRootDirectory: string,
    knowledgeGraphRootDirectory: string
): DeterministicWorkflowEngine {

    const registry =
        createProductionWorkflowStepHandlerRegistry(
            rawSourceRootDirectory,
            knowledgeGraphRootDirectory
        );

    return createWorkflowEngine(
        registry
    );

}
