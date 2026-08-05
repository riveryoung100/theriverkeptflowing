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
    WorkflowStepId
} from "./types";

import {
    validateWorkflowEngineResult,
    validateWorkflowRunRequest
} from "./validation";


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
            hash.slice(0, 8),
            hash.slice(8, 12),
            `5${hash.slice(13, 16)}`,
            `8${hash.slice(17, 20)}`,
            hash.slice(20, 32)
        ].join(
            "-"
        );

    return (
        `workflow-run:${uuid}`
    ) as WorkflowRunId;

}


function createCompletedExecution(
    stepId: WorkflowStepId,
    timestamp: string
): WorkflowStepExecution {

    return {

        stepId,

        status:
            "completed",

        startedAt:
            timestamp,

        completedAt:
            timestamp,

        outputs:
            []

    };

}


function dependencyIsComplete(
    dependencyId: WorkflowStepId,
    executions:
        readonly WorkflowStepExecution[]
): boolean {

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


export class DeterministicWorkflowEngine {

    run(
        request: WorkflowRunRequest
    ): WorkflowEngineResult {

        validateWorkflowRunRequest(
            request
        );

        const executions:
            WorkflowStepExecution[] =
            [];

        const remaining =
            [...request.workflow.steps];

        while (
            remaining.length > 0
        ) {

            const readyIndex =
                remaining.findIndex(
                    (step) => {

                        return step.dependsOn.every(
                            (dependencyId) => {

                                return dependencyIsComplete(
                                    dependencyId,
                                    executions
                                );

                            }
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

            executions.push(
                createCompletedExecution(
                    step.id,
                    request.requestedAt
                )
            );

        }

        const result:
            WorkflowEngineResult = {

            run: {

                id:
                    createDeterministicWorkflowRunId(
                        request
                    ),

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

                warnings:
                    [],

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
    ): WorkflowEngineResult {

        return this.run(
            request
        );

    }

}


export function createWorkflowEngine():
DeterministicWorkflowEngine {

    return new
        DeterministicWorkflowEngine();

}
