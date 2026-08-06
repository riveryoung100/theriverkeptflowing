import {
    strict as assert
} from "node:assert";

import {
    test
} from "node:test";

import type {
    RiverDevImplementationPlan
} from "./planner";

import {
    validateImplementationProposal
} from "./implementation-proposal";

import type {
    RiverDevImplementationProposal
} from "./implementation-proposal";


function createPlan(): RiverDevImplementationPlan {

    return {

        version:
            "1.0.0",

        planId:
            "plan:dev-08-test",

        phase:
            "DEV-08 Test",

        branch:
            "dev-08-autonomous-manifest-generation",

        commitMessage:
            "DEV-08: Test proposal validation",

        objective:
            "Validate implementation proposals.",

        generatedAt:
            "2026-08-06T16:30:00.000Z",

        allowedPaths: [
            "tools/river-dev/src/core/example.ts",
            "tools/river-dev/src/core/example.test.ts"
        ],

        excludedPaths: [
            ".env"
        ],

        acceptanceCriteria: [
            "Proposal validation passes."
        ],

        requiredTests: [
            "tools/river-dev/src/core/example.test.ts"
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


function createProposal(): RiverDevImplementationProposal {

    return {

        version:
            "1.0.0",

        proposalId:
            "proposal:dev-08-test",

        planId:
            "plan:dev-08-test",

        branch:
            "dev-08-autonomous-manifest-generation",

        objective:
            "Create an approved example file.",

        approved:
            true,

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
    "accepts an approved proposal inside plan scope",
    () => {

        assert.doesNotThrow(
            () => {
                validateImplementationProposal(
                    createPlan(),
                    createProposal()
                );
            }
        );

    }
);


test(
    "rejects an unapproved implementation proposal",
    () => {

        assert.throws(
            () => {
                validateImplementationProposal(
                    createPlan(),
                    {
                        ...createProposal(),

                        approved:
                            false
                    }
                );
            },
            /must be approved/
        );

    }
);


test(
    "rejects a proposal for another plan",
    () => {

        assert.throws(
            () => {
                validateImplementationProposal(
                    createPlan(),
                    {
                        ...createProposal(),

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
    "rejects a proposal for another branch",
    () => {

        assert.throws(
            () => {
                validateImplementationProposal(
                    createPlan(),
                    {
                        ...createProposal(),

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
    "rejects an empty proposal",
    () => {

        assert.throws(
            () => {
                validateImplementationProposal(
                    createPlan(),
                    {
                        ...createProposal(),

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
    "rejects a path outside approved plan scope",
    () => {

        const proposal =
            createProposal();

        assert.throws(
            () => {
                validateImplementationProposal(
                    createPlan(),
                    {
                        ...proposal,

                        operations: [
                            {
                                ...proposal.operations[0]!,

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
    "rejects duplicate proposal operation paths",
    () => {

        const proposal =
            createProposal();

        const operation =
            proposal.operations[0]!;

        assert.throws(
            () => {
                validateImplementationProposal(
                    createPlan(),
                    {
                        ...proposal,

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
            /Duplicate proposal operation path/
        );

    }
);
