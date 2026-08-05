import type {
    WorkflowRunId,
    WorkflowStepDefinition,
    WorkflowStepOutput,
    WorkflowStepStatus,
    WorkflowStepType
} from "../types";


export interface WorkflowStepHandlerContext {

    readonly workflowRunId:
        WorkflowRunId;

    readonly step:
        WorkflowStepDefinition;

    readonly workflowContext:
        Readonly<Record<string, unknown>>;

    readonly dependencyOutputs:
        Readonly<Record<string, readonly WorkflowStepOutput[]>>;

    readonly timestamp:
        string;

}


export interface WorkflowStepHandlerResult {

    readonly status:
        WorkflowStepStatus;

    readonly outputs:
        readonly WorkflowStepOutput[];

    readonly warnings:
        readonly string[];

    readonly error?:
        string;

}


export interface WorkflowStepHandler {

    readonly type:
        WorkflowStepType;

    execute(
        context: WorkflowStepHandlerContext
    ): WorkflowStepHandlerResult;

}


export interface WorkflowStepHandlerRegistry {

    register(
        handler: WorkflowStepHandler
    ): void;

    has(
        type: WorkflowStepType
    ): boolean;

    get(
        type: WorkflowStepType
    ): WorkflowStepHandler;

    list():
        readonly WorkflowStepType[];

}
