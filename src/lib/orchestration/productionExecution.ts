import {
    createAuthorizedLiveSemanticKnowledgeExecution
} from "../knowledge/semantic/live-execution";

import type {
    SemanticLiveExecutionOptions
} from "../knowledge/semantic/live-execution";

import {
    createProductionWorkflowEngine
} from "./productionEngine";

import type {
    ProductionKnowledgeBuildExecution
} from "./handlers/productionKnowledgeBuild";

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
        rawSourceRootDirectory: string,
        knowledgeGraphRootDirectory: string,
        knowledgeBuildExecution?:
            ProductionKnowledgeBuildExecution
    ) {

        this.engine =
            createProductionWorkflowEngine(
                rawSourceRootDirectory,
                knowledgeGraphRootDirectory,
                knowledgeBuildExecution
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
    rawSourceRootDirectory: string,
    knowledgeGraphRootDirectory: string,
    knowledgeBuildExecution?:
        ProductionKnowledgeBuildExecution
): ProductionWorkflowExecutionService {

    return new ProductionWorkflowExecution(
        rawSourceRootDirectory,
        knowledgeGraphRootDirectory,
        knowledgeBuildExecution
    );

}

export interface AuthorizedLiveSemanticProductionWorkflowExecutionOptions
extends SemanticLiveExecutionOptions {

    readonly rawSourceRootDirectory:
        string;

    readonly knowledgeGraphRootDirectory:
        string;

}


export async function createAuthorizedLiveSemanticProductionWorkflowExecution(
    options:
        AuthorizedLiveSemanticProductionWorkflowExecutionOptions
): Promise<ProductionWorkflowExecutionService> {

    const semanticExecution =
        await createAuthorizedLiveSemanticKnowledgeExecution(
            options
        );

    return createProductionWorkflowExecution(
        options.rawSourceRootDirectory,
        options.knowledgeGraphRootDirectory,
        semanticExecution
    );

}
