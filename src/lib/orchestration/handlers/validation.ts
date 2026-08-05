import type {
    WorkflowStepHandlerContext,
    WorkflowStepHandlerResult
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


function assertUniqueKeys(
    keys: readonly string[],
    message: string
): void {

    if (
        new Set(
            keys
        ).size !==
        keys.length
    ) {
        throw new TypeError(
            message
        );
    }

}


export function validateWorkflowStepHandlerContext(
    context: WorkflowStepHandlerContext
): void {

    assertNonEmpty(
        context.workflowRunId,
        "Workflow run identifier cannot be empty."
    );

    assertNonEmpty(
        context.step.id,
        "Workflow step identifier cannot be empty."
    );

    assertNonEmpty(
        context.timestamp,
        "Workflow handler timestamp cannot be empty."
    );

}


export function validateWorkflowStepHandlerResult(
    result: WorkflowStepHandlerResult
): void {

    assertUniqueKeys(
        result.outputs.map(
            (output) => {
                return output.key;
            }
        ),
        "Workflow handler output keys must be unique."
    );

    if (
        result.status ===
            "failed" &&
        (
            result.error ===
                undefined ||
            result.error.trim().length ===
                0
        )
    ) {
        throw new TypeError(
            "Failed workflow handlers must provide an error."
        );
    }

    if (
        result.status !==
            "failed" &&
        result.error !==
            undefined
    ) {
        throw new TypeError(
            "Only failed workflow handlers may provide an error."
        );
    }

}
