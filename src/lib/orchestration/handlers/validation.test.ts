import assert from "node:assert/strict";
import test from "node:test";

import {
    createWorkflowRunId
} from "../identifiers";

import {
    sampleWorkflow
} from "../fixtures/sampleWorkflow";

import {
    sampleAssimilationHandler
} from "./fixtures/sampleHandlers";

import {
    validateWorkflowStepHandlerContext,
    validateWorkflowStepHandlerResult
} from "./validation";


const sampleContext = {

    workflowRunId:
        createWorkflowRunId(),

    step:
        sampleWorkflow.steps[0],

    workflowContext: {
        source:
            "fixture"
    },

    dependencyOutputs:
        {},

    timestamp:
        "2026-08-05T22:00:00.000Z"

} as const;


test(
    "accepts a valid handler context",
    () => {

        assert.doesNotThrow(
            () => {
                validateWorkflowStepHandlerContext(
                    sampleContext
                );
            }
        );

    }
);


test(
    "accepts a valid handler result",
    () => {

        const result =
            sampleAssimilationHandler.execute(
                sampleContext
            );

        assert.doesNotThrow(
            () => {
                validateWorkflowStepHandlerResult(
                    result
                );
            }
        );

    }
);


test(
    "rejects an empty handler timestamp",
    () => {

        assert.throws(
            () => {
                validateWorkflowStepHandlerContext({

                    ...sampleContext,

                    timestamp:
                        "   "

                });
            },
            TypeError
        );

    }
);


test(
    "rejects duplicate handler output keys",
    () => {

        assert.throws(
            () => {
                validateWorkflowStepHandlerResult({

                    status:
                        "completed",

                    outputs: [
                        {
                            key:
                                "duplicate",

                            value:
                                1
                        },
                        {
                            key:
                                "duplicate",

                            value:
                                2
                        }
                    ],

                    warnings:
                        []

                });
            },
            TypeError
        );

    }
);


test(
    "requires failed handlers to provide errors",
    () => {

        assert.throws(
            () => {
                validateWorkflowStepHandlerResult({

                    status:
                        "failed",

                    outputs:
                        [],

                    warnings:
                        []

                });
            },
            TypeError
        );

    }
);


test(
    "rejects errors on completed handler results",
    () => {

        assert.throws(
            () => {
                validateWorkflowStepHandlerResult({

                    status:
                        "completed",

                    outputs:
                        [],

                    warnings:
                        [],

                    error:
                        "Unexpected error"

                });
            },
            TypeError
        );

    }
);
