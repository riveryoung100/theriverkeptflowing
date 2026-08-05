import assert from "node:assert/strict";
import test from "node:test";

import {
    createWorkflowEngine
} from "./engine";

import {
    createWorkflowStepHandlerRegistry
} from "./handlers/registry";

import {
    sampleHandlers
} from "./handlers/fixtures/sampleHandlers";

import {
    sampleWorkflowRunRequest
} from "./fixtures/sampleWorkflow";


test(
    "creates workflow engine",
    () => {

        assert.ok(
            createWorkflowEngine()
        );

    }
);


test(
    "runs workflow with default handlers",
    () => {

        const result =
            createWorkflowEngine()
                .run(
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

        const result =
            createWorkflowEngine()
                .run(
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

        const result =
            createWorkflowEngine()
                .run(
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
    "returns deterministic executions",
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

        assert.deepEqual(
            first,
            second
        );

    }
);


test(
    "dispatches workflow steps through registered handlers",
    () => {

        const registry =
            createWorkflowStepHandlerRegistry();

        for (
            const handler of
            sampleHandlers
        ) {
            registry.register(
                handler
            );
        }

        const result =
            createWorkflowEngine(
                registry
            )
                .run(
                    sampleWorkflowRunRequest
                );

        for (
            const execution of
            result.run.steps
        ) {

            assert.equal(
                execution.outputs.some(
                    (output) => {
                        return (
                            output.key ===
                            "handlerType"
                        );
                    }
                ),
                true
            );

        }

    }
);


test(
    "rejects workflows without registered handlers",
    () => {

        const emptyRegistry =
            createWorkflowStepHandlerRegistry();

        assert.throws(
            () => {
                createWorkflowEngine(
                    emptyRegistry
                )
                    .run(
                        sampleWorkflowRunRequest
                    );
            },
            TypeError
        );

    }
);
