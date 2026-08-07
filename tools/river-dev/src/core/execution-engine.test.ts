import assert from "node:assert/strict";
import test from "node:test";

import type {
RiverDevImplementationPlan
} from "../types";

import {
createExecutionManifest
} from "./execution-engine";


test(
"creates deterministic execution manifests from implementation plans",
() => {

    const plan: RiverDevImplementationPlan = {

        version:
            "1.0.0",

        objective:
            "Build execution intelligence",

        decisions: [

            {
                path:
                    "tools/river-dev/src/core/execution-engine.ts",

                priority:
                    10,

                reason:
                    "selected from planning intelligence",

                action:
                    "create"
            },

            {
                path:
                    "tools/river-dev/src/core/context-engine.ts",

                priority:
                    5,

                reason:
                    "selected from planning intelligence",

                action:
                    "inspect"
            }

        ],

        steps: [

            "inspect",

            "implement"

        ]

    };


    const manifest =
        createExecutionManifest(
            plan
        );


    assert.equal(
        manifest.version,
        "1.0.0"
    );


    assert.equal(
        manifest.objective,
        "Build execution intelligence"
    );


    assert.equal(
        manifest.tasks[0]!.path,
        "tools/river-dev/src/core/execution-engine.ts"
    );


    assert.equal(
        manifest.tasks[0]!.action,
        "create"
    );


    assert.equal(
        manifest.tasks.length,
        2
    );

});


test(
"identifies approval required execution tasks",
() => {

    const manifest =
        createExecutionManifest(
            {

                version:
                    "1.0.0",

                objective:
                    "Approval test",

                decisions: [

                    {

                        path:
                            "tools/river-dev/src/types.ts",

                        priority:
                            1,

                        reason:
                            "requires modification",

                        action:
                            "modify"

                    }

                ],

                steps:
                    []

            }
        );


    assert.equal(
        manifest.approvalRequired.length,
        1
    );


    assert.equal(
        manifest.approvalRequired[0],
        "tools/river-dev/src/types.ts"
    );

});

