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
    rawSourceRootDirectory: string
): DeterministicWorkflowEngine {

    const registry =
        createProductionWorkflowStepHandlerRegistry(
            rawSourceRootDirectory
        );

    return createWorkflowEngine(
        registry
    );

}
