import { randomUUID } from "node:crypto";

import type {
    WorkflowId,
    WorkflowRunId,
    WorkflowStepId
} from "./types";

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function hasPrefixAndUuid(
    value: string,
    prefix: string
): boolean {

    if (!value.startsWith(prefix)) {
        return false;
    }

    const uuid =
        value.slice(prefix.length);

    return UUID_PATTERN.test(uuid);

}

export function createWorkflowId():
WorkflowId {

    return (
        `workflow:${randomUUID()}`
    ) as WorkflowId;

}

export function createWorkflowRunId():
WorkflowRunId {

    return (
        `workflow-run:${randomUUID()}`
    ) as WorkflowRunId;

}

export function createWorkflowStepId():
WorkflowStepId {

    return (
        `workflow-step:${randomUUID()}`
    ) as WorkflowStepId;

}

export function isWorkflowId(
    value: string
): value is WorkflowId {

    return hasPrefixAndUuid(
        value,
        "workflow:"
    );

}

export function isWorkflowRunId(
    value: string
): value is WorkflowRunId {

    return hasPrefixAndUuid(
        value,
        "workflow-run:"
    );

}

export function isWorkflowStepId(
    value: string
): value is WorkflowStepId {

    return hasPrefixAndUuid(
        value,
        "workflow-step:"
    );

}

export function assertWorkflowId(
    value: string
): asserts value is WorkflowId {

    if (!isWorkflowId(value)) {
        throw new TypeError(
            "Invalid workflow identifier."
        );
    }

}

export function assertWorkflowRunId(
    value: string
): asserts value is WorkflowRunId {

    if (!isWorkflowRunId(value)) {
        throw new TypeError(
            "Invalid workflow run identifier."
        );
    }

}

export function assertWorkflowStepId(
    value: string
): asserts value is WorkflowStepId {

    if (!isWorkflowStepId(value)) {
        throw new TypeError(
            "Invalid workflow step identifier."
        );
    }

}
