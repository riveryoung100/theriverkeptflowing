import type {
    WorkflowStepHandlerRegistry
} from "./types";

import {
    createProductionAssimilationWorkflowStepHandler
} from "./productionAssimilation";

import {
    createWorkflowStepHandlerRegistry
} from "./registry";


export function createProductionWorkflowStepHandlerRegistry(
    rawSourceRootDirectory: string
): WorkflowStepHandlerRegistry {

    const registry =
        createWorkflowStepHandlerRegistry();

    registry.register(
        createProductionAssimilationWorkflowStepHandler(
            rawSourceRootDirectory
        )
    );

    return registry;

}