import {
    createProductionWorkflowEngine
} from "./productionEngine";

import type {
    WorkflowEngineResult,
    WorkflowRunRequest
} from "./types";


export interface ProductionWorkflowExecutionService {

    execute(
        request:
            WorkflowRunRequest
    ): Promise<WorkflowEngineResult>;

}


export class ProductionWorkflowExecution
implements ProductionWorkflowExecutionService {

    private readonly engine:
        ReturnType<
            typeof createProductionWorkflowEngine
        >;


    public constructor(
        rawSourceRootDirectory: string
    ) {

        this.engine =
            createProductionWorkflowEngine(
                rawSourceRootDirectory
            );

    }


    public execute(
        request:
            WorkflowRunRequest
    ): Promise<WorkflowEngineResult> {

        return this.engine.run(
            request
        );

    }

}


export function createProductionWorkflowExecution(
    rawSourceRootDirectory: string
): ProductionWorkflowExecutionService {

    return new ProductionWorkflowExecution(
        rawSourceRootDirectory
    );

}