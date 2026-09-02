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
        rawSourceRootDirectory: string,
        knowledgeGraphRootDirectory: string
    ) {

        this.execution =
            createProductionWorkflowExecution(
                rawSourceRootDirectory,
                knowledgeGraphRootDirectory
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
    rawSourceRootDirectory: string,
    knowledgeGraphRootDirectory: string
): ProductionOrchestrationService {

    return new ProductionOrchestration(
        rawSourceRootDirectory,
        knowledgeGraphRootDirectory
    );

}