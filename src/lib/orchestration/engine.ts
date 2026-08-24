import {
    createHash
} from "node:crypto";

import {
    ORCHESTRATION_SCHEMA_VERSION
} from "./types";

import type {
    WorkflowEngineResult,
    WorkflowRunId,
    WorkflowRunRequest,
    WorkflowStepExecution,
    WorkflowStepOutput,
    WorkflowStepType
} from "./types";

import {
    validateWorkflowEngineResult,
    validateWorkflowRunRequest
} from "./validation";

import {
    createWorkflowStepHandlerRegistry
} from "./handlers/registry";

import {
    validateWorkflowStepHandlerContext,
    validateWorkflowStepHandlerResult
} from "./handlers/validation";

import type {
    WorkflowStepHandler,
    WorkflowStepHandlerContext,
    WorkflowStepHandlerRegistry,
    WorkflowStepHandlerResult
} from "./handlers/types";


const WORKFLOW_STEP_TYPES:
readonly WorkflowStepType[] = [

    "assimilation",
    "knowledge-build",
    "knowledge-query",
    "knowledge-reasoning",
    "knowledge-insight",
    "review",
    "notification",
    "custom"

];


function createDeterministicWorkflowRunId(
    request: WorkflowRunRequest
): WorkflowRunId {

    const source =
        JSON.stringify({

            workflowId:
                request.workflow.id,

            requestedAt:
                request.requestedAt,

            workflowVersion:
                request.workflow.version,

            stepIds:
                request.workflow.steps.map(
                    (step) => {
                        return step.id;
                    }
                ),

            context:
                request.context

        });

    const hash =
        createHash(
            "sha256"
        )
            .update(
                source
            )
            .digest(
                "hex"
            );

    const uuid =
        [
            hash.slice(
                0,
                8
            ),
            hash.slice(
                8,
                12
            ),
            `5${hash.slice(13, 16)}`,
            `8${hash.slice(17, 20)}`,
            hash.slice(
                20,
                32
            )
        ].join(
            "-"
        );

    return (
        `workflow-run:${uuid}`
    ) as WorkflowRunId;

}


class DeterministicDefaultWorkflowStepHandler
implements WorkflowStepHandler {

    constructor(
        public readonly type:
            WorkflowStepType
    ) {}


    async execute(
        context: WorkflowStepHandlerContext
    ): Promise<WorkflowStepHandlerResult> {

        return {

            status:
                "completed",

            outputs: [
                {
                    key:
                        "handlerType",

                    value:
                        this.type
                },
                {
                    key:
                        "stepId",

                    value:
                        context.step.id
                }
            ],

            warnings:
                []

        };

    }

}


function createDefaultHandlerRegistry():
WorkflowStepHandlerRegistry {

    const registry =
        createWorkflowStepHandlerRegistry();

    for (
        const type of
        WORKFLOW_STEP_TYPES
    ) {

        registry.register(
            new
                DeterministicDefaultWorkflowStepHandler(
                    type
                )
        );

    }

    return registry;

}


function dependenciesAreComplete(
    dependencyIds:
        readonly string[],
    executions:
        readonly WorkflowStepExecution[]
): boolean {

    return dependencyIds.every(
        (dependencyId) => {

            const execution =
                executions.find(
                    (candidate) => {
                        return (
                            candidate.stepId ===
                            dependencyId
                        );
                    }
                );

            return (
                execution?.status ===
                "completed"
            );

        }
    );

}


function collectDependencyOutputs(
    dependencyIds:
        readonly string[],
    executions:
        readonly WorkflowStepExecution[]
): Readonly<
    Record<
        string,
        readonly WorkflowStepOutput[]
    >
> {

    const result:
        Record<
            string,
            readonly WorkflowStepOutput[]
        > =
        {};

    for (
        const dependencyId of
        dependencyIds
    ) {

        const execution =
            executions.find(
                (candidate) => {
                    return (
                        candidate.stepId ===
                        dependencyId
                    );
                }
            );

        result[
            dependencyId
        ] =
            execution?.outputs ??
            [];

    }

    return result;

}


export class DeterministicWorkflowEngine {

    constructor(
        private readonly registry:
            WorkflowStepHandlerRegistry =
                createDefaultHandlerRegistry()
    ) {}


    async run(


        request: WorkflowRunRequest


    ): Promise<WorkflowEngineResult> {

        validateWorkflowRunRequest(
            request
        );

        const workflowRunId =
            createDeterministicWorkflowRunId(
                request
            );

        const executions:
            WorkflowStepExecution[] =
            [];

        const warnings:
            string[] =
            [];

        const remaining =
            [
                ...request.workflow.steps
            ];

        while (
            remaining.length >
            0
        ) {

            const readyIndex =
                remaining.findIndex(
                    (step) => {

                        return dependenciesAreComplete(
                            step.dependsOn,
                            executions
                        );

                    }
                );

            if (
                readyIndex ===
                -1
            ) {

                throw new TypeError(
                    "Workflow dependencies cannot be resolved."
                );

            }

            const [step] =
                remaining.splice(
                    readyIndex,
                    1
                );

            const handler =
                this.registry.get(
                    step.type
                );

            const context:
                WorkflowStepHandlerContext = {

                workflowRunId,

                step,

                workflowContext:
                    request.context,

                dependencyOutputs:
                    collectDependencyOutputs(
                        step.dependsOn,
                        executions
                    ),

                timestamp:
                    request.requestedAt

            };

            validateWorkflowStepHandlerContext(
                context
            );

            const handlerResult =
                await handler.execute(
                    context
                );

            validateWorkflowStepHandlerResult(
                handlerResult
            );

            warnings.push(
                ...handlerResult.warnings
            );

            executions.push({

                stepId:
                    step.id,

                status:
                    handlerResult.status,

                startedAt:
                    request.requestedAt,

                completedAt:
                    request.requestedAt,

                outputs:
                    handlerResult.outputs,

                ...(
                    handlerResult.error !==
                    undefined
                        ? {
                            error:
                                handlerResult.error
                        }
                        : {}
                )

            });

            if (
                handlerResult.status !==
                "completed"
            ) {

                throw new TypeError(
                    handlerResult.error ??
                    `Workflow step ${step.id} did not complete.`
                );

            }

        }

        const result:
            WorkflowEngineResult = {

            run: {

                id:
                    workflowRunId,

                workflowId:
                    request.workflow.id,

                status:
                    "completed",

                requestedAt:
                    request.requestedAt,

                startedAt:
                    request.requestedAt,

                completedAt:
                    request.requestedAt,

                steps:
                    executions,

                warnings,

                schemaVersion:
                    ORCHESTRATION_SCHEMA_VERSION

            }

        };

        validateWorkflowEngineResult(
            result
        );

        return result;

    }


    execute(


        request: WorkflowRunRequest


    ): Promise<WorkflowEngineResult> {

        return this.run(
            request
        );

    }

}


export function createWorkflowEngine(
    registry?:
        WorkflowStepHandlerRegistry
): DeterministicWorkflowEngine {

    return new
        DeterministicWorkflowEngine(
            registry
        );

}
