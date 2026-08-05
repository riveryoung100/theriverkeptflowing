export const ORCHESTRATION_SCHEMA_VERSION =
    "1.0.0" as const;


export type OrchestrationSchemaVersion =
    typeof ORCHESTRATION_SCHEMA_VERSION;


export type WorkflowId =
    `workflow:${string}`;


export type WorkflowRunId =
    `workflow-run:${string}`;


export type WorkflowStepId =
    `workflow-step:${string}`;


export type WorkflowStatus =
    | "draft"
    | "ready"
    | "running"
    | "completed"
    | "failed"
    | "blocked"
    | "cancelled";


export type WorkflowStepStatus =
    | "pending"
    | "ready"
    | "running"
    | "completed"
    | "failed"
    | "blocked"
    | "skipped"
    | "cancelled";


export type WorkflowStepType =
    | "assimilation"
    | "knowledge-build"
    | "knowledge-query"
    | "knowledge-reasoning"
    | "knowledge-insight"
    | "review"
    | "notification"
    | "custom";


export type WorkflowFailurePolicy =
    | "stop"
    | "continue"
    | "block-dependents";


export interface WorkflowStepInput {

    readonly key:
        string;

    readonly value:
        unknown;

}


export interface WorkflowStepOutput {

    readonly key:
        string;

    readonly value:
        unknown;

}


export interface WorkflowStepDefinition {

    readonly id:
        WorkflowStepId;

    readonly name:
        string;

    readonly type:
        WorkflowStepType;

    readonly dependsOn:
        readonly WorkflowStepId[];

    readonly inputs:
        readonly WorkflowStepInput[];

    readonly failurePolicy:
        WorkflowFailurePolicy;

    readonly requiresReview:
        boolean;

}


export interface WorkflowDefinition {

    readonly id:
        WorkflowId;

    readonly name:
        string;

    readonly description:
        string;

    readonly status:
        WorkflowStatus;

    readonly steps:
        readonly WorkflowStepDefinition[];

    readonly createdAt:
        string;

    readonly version:
        number;

    readonly schemaVersion:
        OrchestrationSchemaVersion;

}


export interface WorkflowRunRequest {

    readonly workflow:
        WorkflowDefinition;

    readonly requestedAt:
        string;

    readonly context:
        Readonly<Record<string, unknown>>;

}


export interface WorkflowStepExecution {

    readonly stepId:
        WorkflowStepId;

    readonly status:
        WorkflowStepStatus;

    readonly startedAt?:
        string;

    readonly completedAt?:
        string;

    readonly outputs:
        readonly WorkflowStepOutput[];

    readonly error?:
        string;

}


export interface WorkflowRun {

    readonly id:
        WorkflowRunId;

    readonly workflowId:
        WorkflowId;

    readonly status:
        WorkflowStatus;

    readonly requestedAt:
        string;

    readonly startedAt:
        string;

    readonly completedAt?:
        string;

    readonly steps:
        readonly WorkflowStepExecution[];

    readonly warnings:
        readonly string[];

    readonly schemaVersion:
        OrchestrationSchemaVersion;

}


export interface WorkflowEngineResult {

    readonly run:
        WorkflowRun;

}


export interface WorkflowOrchestrationEngine {

    execute(
        request: WorkflowRunRequest
    ): WorkflowEngineResult;

}
