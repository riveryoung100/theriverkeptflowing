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
    async () => {

        const result =
            await createWorkflowEngine()
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
    async () => {

        const result =
            await createWorkflowEngine()
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
    async () => {

        const result =
            await createWorkflowEngine()
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
    async () => {

        const engine =
            createWorkflowEngine();

        const first =
            await engine.run(
                sampleWorkflowRunRequest
            );

        const second =
            await engine.run(
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
    async () => {

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
            await createWorkflowEngine(
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
    async () => {

        const emptyRegistry =
            createWorkflowStepHandlerRegistry();

        await assert.rejects(
            () =>
                createWorkflowEngine(
                    emptyRegistry
                )
                    .run(
                        sampleWorkflowRunRequest
                    ),
            TypeError
        );

    }
);