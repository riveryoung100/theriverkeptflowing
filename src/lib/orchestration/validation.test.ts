import assert from "node:assert/strict";
import test from "node:test";

import {
    createWorkflowStepId
} from "./identifiers";

import {
    sampleAssimilationStep,
    sampleWorkflow,
    sampleWorkflowEngineResult,
    sampleWorkflowRun,
    sampleWorkflowRunRequest
} from "./fixtures/sampleWorkflow";

import {
    validateWorkflowDefinition,
    validateWorkflowEngineResult,
    validateWorkflowRun,
    validateWorkflowRunRequest,
    validateWorkflowStepDefinition
} from "./validation";


test(
    "accepts a valid workflow step",
    () => {

        assert.doesNotThrow(
            () => {
                validateWorkflowStepDefinition(
                    sampleAssimilationStep
                );
            }
        );

    }
);


test(
    "accepts a valid workflow definition",
    () => {

        assert.doesNotThrow(
            () => {
                validateWorkflowDefinition(
                    sampleWorkflow
                );
            }
        );

    }
);


test(
    "accepts a valid workflow run request",
    () => {

        assert.doesNotThrow(
            () => {
                validateWorkflowRunRequest(
                    sampleWorkflowRunRequest
                );
            }
        );

    }
);


test(
    "accepts a valid workflow run",
    () => {

        assert.doesNotThrow(
            () => {
                validateWorkflowRun(
                    sampleWorkflowRun
                );
            }
        );

    }
);


test(
    "accepts a valid workflow engine result",
    () => {

        assert.doesNotThrow(
            () => {
                validateWorkflowEngineResult(
                    sampleWorkflowEngineResult
                );
            }
        );

    }
);


test(
    "rejects an empty workflow name",
    () => {

        assert.throws(
            () => {
                validateWorkflowDefinition({

                    ...sampleWorkflow,

                    name:
                        "   "

                });
            },
            TypeError
        );

    }
);


test(
    "rejects an empty workflow",
    () => {

        assert.throws(
            () => {
                validateWorkflowDefinition({

                    ...sampleWorkflow,

                    steps:
                        []

                });
            },
            TypeError
        );

    }
);


test(
    "rejects duplicate workflow step identifiers",
    () => {

        assert.throws(
            () => {
                validateWorkflowDefinition({

                    ...sampleWorkflow,

                    steps: [
                        sampleWorkflow.steps[0],
                        sampleWorkflow.steps[0]
                    ]

                });
            },
            TypeError
        );

    }
);


test(
    "rejects self-dependent workflow steps",
    () => {

        assert.throws(
            () => {
                validateWorkflowStepDefinition({

                    ...sampleAssimilationStep,

                    dependsOn: [
                        sampleAssimilationStep.id
                    ]

                });
            },
            TypeError
        );

    }
);


test(
    "rejects duplicate step dependencies",
    () => {

        const dependencyId =
            createWorkflowStepId();

        assert.throws(
            () => {
                validateWorkflowStepDefinition({

                    ...sampleAssimilationStep,

                    dependsOn: [
                        dependencyId,
                        dependencyId
                    ]

                });
            },
            TypeError
        );

    }
);


test(
    "rejects unknown workflow dependencies",
    () => {

        const unknownDependencyId =
            createWorkflowStepId();

        assert.throws(
            () => {
                validateWorkflowDefinition({

                    ...sampleWorkflow,

                    steps: [
                        {
                            ...sampleWorkflow.steps[0],

                            dependsOn: [
                                unknownDependencyId
                            ]
                        }
                    ]

                });
            },
            TypeError
        );

    }
);


test(
    "rejects duplicate workflow input keys",
    () => {

        assert.throws(
            () => {
                validateWorkflowStepDefinition({

                    ...sampleAssimilationStep,

                    inputs: [
                        {
                            key:
                                "source",

                            value:
                                "first"
                        },
                        {
                            key:
                                "source",

                            value:
                                "second"
                        }
                    ]

                });
            },
            TypeError
        );

    }
);


test(
    "rejects invalid workflow versions",
    () => {

        assert.throws(
            () => {
                validateWorkflowDefinition({

                    ...sampleWorkflow,

                    version:
                        0

                });
            },
            TypeError
        );

    }
);


test(
    "rejects empty request timestamps",
    () => {

        assert.throws(
            () => {
                validateWorkflowRunRequest({

                    ...sampleWorkflowRunRequest,

                    requestedAt:
                        "   "

                });
            },
            TypeError
        );

    }
);


test(
    "rejects duplicate run step executions",
    () => {

        assert.throws(
            () => {
                validateWorkflowRun({

                    ...sampleWorkflowRun,

                    steps: [
                        sampleWorkflowRun.steps[0],
                        sampleWorkflowRun.steps[0]
                    ]

                });
            },
            TypeError
        );

    }
);
