import assert from "node:assert/strict";
import test from "node:test";

import type {
    RiverDevContextUnderstanding
} from "../types";

import {
    createImplementationPlan
} from "./planning-engine";


test(
    "creates deterministic implementation plans from understanding",
    () => {

        const understanding:
        RiverDevContextUnderstanding = {

            version:
                "1.0.0",

            artifactCount:
                2,

            metadata:
                [],

            relationships:
                [],

            relevance: [

                {
                    path:
                        "tools/river-dev/src/core/context-engine.ts",

                    score:
                        10,

                    reasons:
                        []
                },

                {
                    path:
                        "tools/river-dev/src/core/planning-engine.test.ts",

                    score:
                        5,

                    reasons:
                        []
                }

            ]

        };


        const plan =
            createImplementationPlan(
                understanding,
                "Build planning intelligence"
            );


        assert.equal(
            plan.version,
            "1.0.0"
        );


        assert.equal(
            plan.objective,
            "Build planning intelligence"
        );


        assert.equal(
            plan.decisions[0]!.path,
            "tools/river-dev/src/core/context-engine.ts"
        );


        assert.equal(
            plan.decisions[0]!.priority,
            10
        );


        assert.equal(
            plan.steps.length,
            4
        );

    }
);


test(
    "creates explainable planning decisions",
    () => {

        const plan =
            createImplementationPlan(
                {
                    version:
                        "1.0.0",

                    artifactCount:
                        1,

                    metadata:
                        [],

                    relationships:
                        [],

                    relevance: [

                        {
                            path:
                                "tools/river-dev/src/core/test.ts",

                            score:
                                1,

                            reasons:
                                []

                        }

                    ]

                },

                "Test planning"

            );


        assert.match(
            plan.decisions[0]!.reason,
            /context relevance intelligence/
        );

    }
);
