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
    runArtifactPipeline
} from "./artifact-pipeline";


function createPlan(): RiverDevImplementationPlan {

    return {

        version:
            "1.0.0",

        planId:
            "plan:dev-10-artifacts",

        phase:
            "DEV-10 Artifact Pipeline",

        branch:
            "dev-10-artifact-pipeline",

        commitMessage:
            "DEV-10: Test artifact pipeline",

        objective:
            "Generate controlled proposal and manifest artifacts.",

        generatedAt:
            "2026-08-06T19:30:00.000Z",

        allowedPaths: [
            "tools/river-dev/src/generated/alpha.ts",
            "tools/river-dev/src/generated/zeta.ts"
        ],

        excludedPaths:
            [],

        acceptanceCriteria: [
            "Unapproved proposals stop before manifest generation.",
            "Approved proposals generate deterministic manifests."
        ],

        requiredTests: [
            "tools/river-dev/src/core/artifact-pipeline.test.ts"
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
            "intent:dev-10-artifacts",

        planId:
            "plan:dev-10-artifacts",

        branch:
            "dev-10-artifact-pipeline",

        objective:
            "Create two controlled artifact operations.",

        operations: [
            {
                type:
                    "write-file",

                path:
                    "tools/river-dev/src/generated/zeta.ts",

                content:
                    "export const zeta = true;\n",

                overwrite:
                    false,

                reason:
                    "Propose the zeta artifact."
            },
            {
                type:
                    "write-file",

                path:
                    "tools/river-dev/src/generated/alpha.ts",

                content:
                    "export const alpha = true;\n",

                overwrite:
                    true,

                reason:
                    "Propose the alpha artifact."
            }
        ]

    };

}


test(
    "stops before manifest generation without approval",
    () => {

        const result =
            runArtifactPipeline(
                {
                    plan:
                        createPlan(),

                    intent:
                        createIntent(),

                    approveProposal:
                        false
                }
            );

        assert.equal(
            result.outcome,
            "approval-required"
        );

        assert.equal(
            result.proposal.approved,
            false
        );

        assert.equal(
            result.proposalApproved,
            false
        );

        assert.equal(
            result.manifest,
            null
        );

        assert.equal(
            result.repositoryWritesPerformed,
            false
        );

    }
);


test(
    "generates a manifest after explicit proposal approval",
    () => {

        const result =
            runArtifactPipeline(
                {
                    plan:
                        createPlan(),

                    intent:
                        createIntent(),

                    approveProposal:
                        true
                }
            );

        assert.equal(
            result.outcome,
            "manifest-generated"
        );

        assert.equal(
            result.proposal.approved,
            true
        );

        assert.equal(
            result.proposalApproved,
            true
        );

        assert.ok(
            result.manifest
        );

        assert.equal(
            result.manifest.implementationId,
            "implementation:proposal:intent:dev-10-artifacts"
        );

        assert.equal(
            result.repositoryWritesPerformed,
            false
        );

    }
);


test(
    "sorts proposal and manifest operations deterministically",
    () => {

        const result =
            runArtifactPipeline(
                {
                    plan:
                        createPlan(),

                    intent:
                        createIntent(),

                    approveProposal:
                        true
                }
            );

        assert.deepEqual(
            result.proposal.operations.map(
                (operation) => {
                    return operation.path;
                }
            ),
            [
                "tools/river-dev/src/generated/alpha.ts",
                "tools/river-dev/src/generated/zeta.ts"
            ]
        );

        assert.deepEqual(
            result.manifest?.operations.map(
                (operation) => {
                    return operation.path;
                }
            ),
            [
                "tools/river-dev/src/generated/alpha.ts",
                "tools/river-dev/src/generated/zeta.ts"
            ]
        );

    }
);


test(
    "produces deterministic artifact results",
    () => {

        const request =
            {
                plan:
                    createPlan(),

                intent:
                    createIntent(),

                approveProposal:
                    true
            } as const;

        const first =
            runArtifactPipeline(
                request
            );

        const second =
            runArtifactPipeline(
                request
            );

        assert.deepEqual(
            first,
            second
        );

    }
);


test(
    "preserves proposal reasons but removes them from the manifest",
    () => {

        const result =
            runArtifactPipeline(
                {
                    plan:
                        createPlan(),

                    intent:
                        createIntent(),

                    approveProposal:
                        true
                }
            );

        const proposalOperation =
            result.proposal.operations[0];

        const manifestOperation =
            result.manifest?.operations[0];

        assert.ok(
            proposalOperation
        );

        assert.ok(
            manifestOperation
        );

        assert.equal(
            proposalOperation.reason,
            "Propose the alpha artifact."
        );

        assert.equal(
            "reason" in manifestOperation,
            false
        );

    }
);


test(
    "rejects intent outside the approved plan scope",
    () => {

        const intent =
            createIntent();

        assert.throws(
            () => {
                runArtifactPipeline(
                    {
                        plan:
                            createPlan(),

                        intent:
                            {
                                ...intent,

                                operations: [
                                    {
                                        ...intent.operations[0]!,

                                        path:
                                            "src/outside-scope.ts"
                                    }
                                ]
                            },

                        approveProposal:
                            false
                    }
                );
            },
            /outside the approved plan scope/
        );

    }
);
