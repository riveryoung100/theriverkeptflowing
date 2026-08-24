import {
    createProductionWorkflowExecution
} from "./orchestration";

import type {
    WorkflowEngineResult,
    WorkflowRunRequest
} from "./orchestration";


export interface ProductionOrchestrationService {

    execute(
        request:
            WorkflowRunRequest
    ): Promise<WorkflowEngineResult>;

}


export class ProductionOrchestration
implements ProductionOrchestrationService {

    private readonly execution:
        ReturnType<
            typeof createProductionWorkflowExecution
        >;


    public constructor(
        rawSourceRootDirectory: string
    ) {

        this.execution =
            createProductionWorkflowExecution(
                rawSourceRootDirectory
            );

    }


    public execute(
        request:
            WorkflowRunRequest
    ): Promise<WorkflowEngineResult> {

        return this.execution.execute(
            request
        );

    }

}


export function createProductionOrchestration(
    rawSourceRootDirectory: string
): ProductionOrchestrationService {

    return new ProductionOrchestration(
        rawSourceRootDirectory
    );

}