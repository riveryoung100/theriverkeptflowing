import {
    strict as assert
} from "node:assert";

import {
    test
} from "node:test";

import type {
    RiverDevImplementationIntent
} from "./implementation-intent";

import type {
    RiverDevImplementationPlan
} from "./planner";

import {
    generateImplementationProposal
} from "./proposal-generator";


function createPlan(): RiverDevImplementationPlan {

    return {

        version:
            "1.0.0",

        planId:
            "plan:dev-09-proposal",

        phase:
            "DEV-09 Proposal Generator",

        branch:
            "dev-09-autonomous-planning-engine",

        commitMessage:
            "DEV-09: Test proposal generation",

        objective:
            "Generate a deterministic implementation proposal.",

        generatedAt:
            "2026-08-06T18:45:00.000Z",

        allowedPaths: [
            "tools/river-dev/src/core/alpha.ts",
            "tools/river-dev/src/core/zeta.ts"
        ],

        excludedPaths:
            [],

        acceptanceCriteria: [
            "Proposal generation is deterministic.",
            "Generated proposals remain unapproved."
        ],

        requiredTests: [
            "tools/river-dev/src/core/proposal-generator.test.ts"
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
            "intent:dev-09-proposal",

        planId:
            "plan:dev-09-proposal",

        branch:
            "dev-09-autonomous-planning-engine",

        objective:
            "Create two proposed implementation files.",

        operations: [
            {
                type:
                    "write-file",

                path:
                    "tools/river-dev/src/core/zeta.ts",

                content:
                    "export const zeta = true;\n",

                overwrite:
                    true,

                reason:
                    "Create the proposed zeta implementation."
            },
            {
                type:
                    "write-file",

                path:
                    "tools/river-dev/src/core/alpha.ts",

                content:
                    "export const alpha = true;\n",

                overwrite:
                    false,

                reason:
                    "Create the proposed alpha implementation."
            }
        ]

    };

}


test(
    "generates a deterministic implementation proposal",
    () => {

        const first =
            generateImplementationProposal(
                createPlan(),
                createIntent()
            );

        const second =
            generateImplementationProposal(
                createPlan(),
                createIntent()
            );

        assert.deepEqual(
            first,
            second
        );

    }
);


test(
    "maps intent fields into the proposal",
    () => {

        const result =
            generateImplementationProposal(
                createPlan(),
                createIntent()
            );

        assert.equal(
            result.proposal.version,
            "1.0.0"
        );

        assert.equal(
            result.proposal.proposalId,
            "proposal:intent:dev-09-proposal"
        );

        assert.equal(
            result.proposal.planId,
            "plan:dev-09-proposal"
        );

        assert.equal(
            result.proposal.branch,
            "dev-09-autonomous-planning-engine"
        );

        assert.equal(
            result.proposal.objective,
            "Create two proposed implementation files."
        );

        assert.equal(
            result.operationCount,
            2
        );

    }
);


test(
    "keeps generated proposals unapproved",
    () => {

        const result =
            generateImplementationProposal(
                createPlan(),
                createIntent()
            );

        assert.equal(
            result.proposal.approved,
            false
        );

    }
);


test(
    "sorts proposal operations by path",
    () => {

        const result =
            generateImplementationProposal(
                createPlan(),
                createIntent()
            );

        assert.deepEqual(
            result.proposal.operations.map(
                (operation) => {
                    return operation.path;
                }
            ),
            [
                "tools/river-dev/src/core/alpha.ts",
                "tools/river-dev/src/core/zeta.ts"
            ]
        );

    }
);


test(
    "preserves operation content and reasons",
    () => {

        const result =
            generateImplementationProposal(
                createPlan(),
                createIntent()
            );

        const firstOperation =
            result.proposal.operations[0];

        assert.ok(
            firstOperation
        );

        assert.equal(
            firstOperation.content,
            "export const alpha = true;\n"
        );

        assert.equal(
            firstOperation.overwrite,
            false
        );

        assert.equal(
            firstOperation.reason,
            "Create the proposed alpha implementation."
        );

    }
);


test(
    "rejects intent for another plan",
    () => {

        assert.throws(
            () => {
                generateImplementationProposal(
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
    "rejects operations outside approved scope",
    () => {

        const intent =
            createIntent();

        assert.throws(
            () => {
                generateImplementationProposal(
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
