import {
    assertWorkflowId,
    assertWorkflowRunId,
    assertWorkflowStepId
} from "./identifiers";

import type {
    WorkflowDefinition,
    WorkflowEngineResult,
    WorkflowRun,
    WorkflowRunRequest,
    WorkflowStepDefinition
} from "./types";


function assertNonEmpty(
    value: string,
    message: string
): void {

    if (
        value.trim().length === 0
    ) {
        throw new TypeError(
            message
        );
    }

}


function assertUniqueStrings(
    values: readonly string[],
    message: string
): void {

    if (
        new Set(values).size !==
        values.length
    ) {
        throw new TypeError(
            message
        );
    }

}


export function validateWorkflowStepDefinition(
    step: WorkflowStepDefinition
): void {

    assertWorkflowStepId(
        step.id
    );

    assertNonEmpty(
        step.name,
        "Workflow step name cannot be empty."
    );

    assertUniqueStrings(
        step.dependsOn,
        "Workflow step dependencies must be unique."
    );

    assertUniqueStrings(
        step.inputs.map(
            (input) => {
                return input.key;
            }
        ),
        "Workflow step input keys must be unique."
    );

    if (
        step.dependsOn.includes(
            step.id
        )
    ) {
        throw new TypeError(
            "Workflow step cannot depend on itself."
        );
    }

}


export function validateWorkflowDefinition(
    workflow: WorkflowDefinition
): void {

    assertWorkflowId(
        workflow.id
    );

    assertNonEmpty(
        workflow.name,
        "Workflow name cannot be empty."
    );

    assertNonEmpty(
        workflow.description,
        "Workflow description cannot be empty."
    );

    if (
        workflow.steps.length === 0
    ) {
        throw new TypeError(
            "Workflow must contain at least one step."
        );
    }

    if (
        !Number.isInteger(
            workflow.version
        ) ||
        workflow.version < 1
    ) {
        throw new TypeError(
            "Workflow version must be a positive integer."
        );
    }

    const stepIds =
        workflow.steps.map(
            (step) => {
                return step.id;
            }
        );

    assertUniqueStrings(
        stepIds,
        "Workflow step identifiers must be unique."
    );

    const knownStepIds =
        new Set(
            stepIds
        );

    for (
        const step of
        workflow.steps
    ) {

        validateWorkflowStepDefinition(
            step
        );

        for (
            const dependencyId of
            step.dependsOn
        ) {

            if (
                !knownStepIds.has(
                    dependencyId
                )
            ) {
                throw new TypeError(
                    `Unknown workflow dependency: ${dependencyId}`
                );
            }

        }

    }

}


export function validateWorkflowRunRequest(
    request: WorkflowRunRequest
): void {

    validateWorkflowDefinition(
        request.workflow
    );

    assertNonEmpty(
        request.requestedAt,
        "Workflow request timestamp cannot be empty."
    );

}


export function validateWorkflowRun(
    run: WorkflowRun
): void {

    assertWorkflowRunId(
        run.id
    );

    assertWorkflowId(
        run.workflowId
    );

    assertNonEmpty(
        run.requestedAt,
        "Workflow run request timestamp cannot be empty."
    );

    assertNonEmpty(
        run.startedAt,
        "Workflow run start timestamp cannot be empty."
    );

    const stepIds =
        run.steps.map(
            (step) => {
                assertWorkflowStepId(
                    step.stepId
                );

                return step.stepId;
            }
        );

    assertUniqueStrings(
        stepIds,
        "Workflow run step executions must be unique."
    );

}


export function validateWorkflowEngineResult(
    result: WorkflowEngineResult
): void {

    validateWorkflowRun(
        result.run
    );

}
