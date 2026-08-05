import assert from "node:assert/strict";
import test from "node:test";

import {
    assertWorkflowId,
    assertWorkflowRunId,
    assertWorkflowStepId,
    createWorkflowId,
    createWorkflowRunId,
    createWorkflowStepId,
    isWorkflowId,
    isWorkflowRunId,
    isWorkflowStepId
} from "./identifiers";


test(
    "creates workflow identifiers",
    () => {

        const id =
            createWorkflowId();

        assert.equal(
            isWorkflowId(
                id
            ),
            true
        );

        assert.equal(
            id.startsWith(
                "workflow:"
            ),
            true
        );

    }
);


test(
    "creates workflow run identifiers",
    () => {

        const id =
            createWorkflowRunId();

        assert.equal(
            isWorkflowRunId(
                id
            ),
            true
        );

        assert.equal(
            id.startsWith(
                "workflow-run:"
            ),
            true
        );

    }
);


test(
    "creates workflow step identifiers",
    () => {

        const id =
            createWorkflowStepId();

        assert.equal(
            isWorkflowStepId(
                id
            ),
            true
        );

        assert.equal(
            id.startsWith(
                "workflow-step:"
            ),
            true
        );

    }
);


test(
    "creates unique workflow identifiers",
    () => {

        assert.notEqual(
            createWorkflowId(),
            createWorkflowId()
        );

        assert.notEqual(
            createWorkflowRunId(),
            createWorkflowRunId()
        );

        assert.notEqual(
            createWorkflowStepId(),
            createWorkflowStepId()
        );

    }
);


test(
    "recognizes matching identifier types",
    () => {

        assert.equal(
            isWorkflowId(
                createWorkflowId()
            ),
            true
        );

        assert.equal(
            isWorkflowRunId(
                createWorkflowRunId()
            ),
            true
        );

        assert.equal(
            isWorkflowStepId(
                createWorkflowStepId()
            ),
            true
        );

    }
);


test(
    "rejects mismatched identifier types",
    () => {

        const workflowId =
            createWorkflowId();

        const workflowRunId =
            createWorkflowRunId();

        const workflowStepId =
            createWorkflowStepId();

        assert.equal(
            isWorkflowRunId(
                workflowId
            ),
            false
        );

        assert.equal(
            isWorkflowStepId(
                workflowId
            ),
            false
        );

        assert.equal(
            isWorkflowId(
                workflowRunId
            ),
            false
        );

        assert.equal(
            isWorkflowStepId(
                workflowRunId
            ),
            false
        );

        assert.equal(
            isWorkflowId(
                workflowStepId
            ),
            false
        );

        assert.equal(
            isWorkflowRunId(
                workflowStepId
            ),
            false
        );

    }
);


test(
    "rejects malformed identifiers",
    () => {

        const malformedValues = [
            "",
            "workflow",
            "workflow:",
            "workflow-run:",
            "workflow-step:",
            "workflow:not-a-uuid",
            "workflow-run:not-a-uuid",
            "workflow-step:not-a-uuid"
        ];

        for (
            const value of
            malformedValues
        ) {

            assert.equal(
                isWorkflowId(
                    value
                ),
                false
            );

            assert.equal(
                isWorkflowRunId(
                    value
                ),
                false
            );

            assert.equal(
                isWorkflowStepId(
                    value
                ),
                false
            );

        }

    }
);


test(
    "workflow assertions accept valid identifiers",
    () => {

        assert.doesNotThrow(
            () => {
                assertWorkflowId(
                    createWorkflowId()
                );
            }
        );

        assert.doesNotThrow(
            () => {
                assertWorkflowRunId(
                    createWorkflowRunId()
                );
            }
        );

        assert.doesNotThrow(
            () => {
                assertWorkflowStepId(
                    createWorkflowStepId()
                );
            }
        );

    }
);


test(
    "workflow assertions reject invalid identifiers",
    () => {

        assert.throws(
            () => {
                assertWorkflowId(
                    "workflow:invalid"
                );
            },
            TypeError
        );

        assert.throws(
            () => {
                assertWorkflowRunId(
                    "workflow-run:invalid"
                );
            },
            TypeError
        );

        assert.throws(
            () => {
                assertWorkflowStepId(
                    "workflow-step:invalid"
                );
            },
            TypeError
        );

    }
);
