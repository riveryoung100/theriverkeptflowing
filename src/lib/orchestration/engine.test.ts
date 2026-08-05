import assert from "node:assert/strict";
import test from "node:test";

import {
    createWorkflowEngine
} from "./engine";

import {
    sampleWorkflowRunRequest
} from "./fixtures/sampleWorkflow";


test(
    "creates workflow engine",
    () => {

        const engine =
            createWorkflowEngine();

        assert.ok(engine);

    }
);


test(
    "runs workflow",
    () => {

        const engine =
            createWorkflowEngine();

        const result =
            engine.run(
                sampleWorkflowRunRequest
            );

        assert.equal(
            result.run.status,
            "completed"
        );

    }
);


test(
    "creates one execution per workflow step",
    () => {

        const engine =
            createWorkflowEngine();

        const result =
            engine.run(
                sampleWorkflowRunRequest
            );

        assert.equal(
            result.run.steps.length,
            sampleWorkflowRunRequest
                .workflow
                .steps
                .length
        );

    }
);


test(
    "preserves workflow identifier",
    () => {

        const engine =
            createWorkflowEngine();

        const result =
            engine.run(
                sampleWorkflowRunRequest
            );

        assert.equal(
            result.run.workflowId,
            sampleWorkflowRunRequest
                .workflow
                .id
        );

    }
);


test(
    "returns deterministic execution",
    () => {

        const engine =
            createWorkflowEngine();

        const first =
            engine.run(
                sampleWorkflowRunRequest
            );

        const second =
            engine.run(
                sampleWorkflowRunRequest
            );

        assert.equal(
            first.run.workflowId,
            second.run.workflowId
        );

        assert.equal(
            first.run.steps.length,
            second.run.steps.length
        );

    }
);
