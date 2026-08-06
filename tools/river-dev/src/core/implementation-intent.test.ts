import {
    strict as assert
} from "node:assert";

import {
    test
} from "node:test";

import {
    validateImplementationIntent
} from "./implementation-intent";

import type {
    RiverDevImplementationIntent
} from "./implementation-intent";

import type {
    RiverDevImplementationPlan
} from "./planner";


function createPlan(): RiverDevImplementationPlan {

    return {

        version:
            "1.0.0",

        planId:
            "plan:dev-09-intent",

        phase:
            "DEV-09 Intent",

        branch:
            "dev-09-autonomous-planning-engine",

        commitMessage:
            "DEV-09: Test implementation intent",

        objective:
            "Validate implementation intent.",

        generatedAt:
            "2026-08-06T18:30:00.000Z",

        allowedPaths: [
            "tools/river-dev/src/core/example.ts",
            "tools/river-dev/src/core/example.test.ts"
        ],

        excludedPaths: [
            ".env"
        ],

        acceptanceCriteria: [
            "Implementation intent is validated."
        ],

        requiredTests: [
            "tools/river-dev/src/core/implementation-intent.test.ts"
        ],

        requiredQualityGates: [
            "typecheck",
            "tests"
        ],

        approvedCommands: [
            "typecheck"
        ],

        maximumRepairAttempts:
            3,

        scopeExpansionAllowed:
            false,

        approvalBoundaries:
            [],

        steps:
            []

    };

}


function createIntent(): RiverDevImplementationIntent {

    return {

        version:
            "1.0.0",

        intentId:
            "intent:dev-09-test",

        planId:
            "plan:dev-09-intent",

        branch:
            "dev-09-autonomous-planning-engine",

        objective:
            "Create one approved example file.",

        operations: [
            {
                type:
                    "write-file",

                path:
                    "tools/river-dev/src/core/example.ts",

                content:
                    "export const example = true;\n",

                overwrite:
                    true,

                reason:
                    "Create the approved example implementation."
            }
        ]

    };

}


test(
    "accepts valid implementation intent",
    () => {

        assert.doesNotThrow(
            () => {
                validateImplementationIntent(
                    createPlan(),
                    createIntent()
                );
            }
        );

    }
);


test(
    "rejects intent for another plan",
    () => {

        assert.throws(
            () => {
                validateImplementationIntent(
                    createPlan(),
                    {
                        ...createIntent(),

                        planId:
                            "plan:other"
                    }
                );
            },
            /does not match the approved plan/
        );

    }
);


test(
    "rejects intent for another branch",
    () => {

        assert.throws(
            () => {
                validateImplementationIntent(
                    createPlan(),
                    {
                        ...createIntent(),

                        branch:
                            "another-branch"
                    }
                );
            },
            /branch does not match/
        );

    }
);


test(
    "rejects empty implementation intent",
    () => {

        assert.throws(
            () => {
                validateImplementationIntent(
                    createPlan(),
                    {
                        ...createIntent(),

                        operations:
                            []
                    }
                );
            },
            /at least one operation/
        );

    }
);


test(
    "rejects path outside approved plan scope",
    () => {

        const intent =
            createIntent();

        assert.throws(
            () => {
                validateImplementationIntent(
                    createPlan(),
                    {
                        ...intent,

                        operations: [
                            {
                                ...intent.operations[0]!,

                                path:
                                    "src/outside-scope.ts"
                            }
                        ]
                    }
                );
            },
            /outside the approved plan scope/
        );

    }
);


test(
    "rejects duplicate intent paths",
    () => {

        const intent =
            createIntent();

        const operation =
            intent.operations[0]!;

        assert.throws(
            () => {
                validateImplementationIntent(
                    createPlan(),
                    {
                        ...intent,

                        operations: [
                            operation,
                            {
                                ...operation,

                                reason:
                                    "Duplicate operation."
                            }
                        ]
                    }
                );
            },
            /Duplicate implementation intent path/
        );

    }
);
