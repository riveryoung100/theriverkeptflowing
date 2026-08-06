import {
    strict as assert
} from "node:assert";

import {
    test
} from "node:test";

import {
    generateImplementationManifest
} from "./manifest-generator";

import type {
    RiverDevImplementationPlan
} from "./planner";

import type {
    RiverDevImplementationProposal
} from "./implementation-proposal";


function createPlan(): RiverDevImplementationPlan {

    return {

        version:
            "1.0.0",

        planId:
            "plan:dev-08-generator",

        phase:
            "DEV-08 Generator",

        branch:
            "dev-08-autonomous-manifest-generation",

        commitMessage:
            "DEV-08: Test manifest generation",

        objective:
            "Generate a deterministic implementation manifest.",

        generatedAt:
            "2026-08-06T16:45:00.000Z",

        allowedPaths: [
            "tools/river-dev/src/core/alpha.ts",
            "tools/river-dev/src/core/zeta.ts"
        ],

        excludedPaths:
            [],

        acceptanceCriteria: [
            "The manifest is deterministic."
        ],

        requiredTests: [
            "tools/river-dev/src/core/manifest-generator.test.ts"
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
            "proposal:dev-08-generator",

        planId:
            "plan:dev-08-generator",

        branch:
            "dev-08-autonomous-manifest-generation",

        objective:
            "Create two approved files.",

        approved:
            true,

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
                    "Create the zeta implementation."
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
                    "Create the alpha implementation."
            }
        ]

    };

}


test(
    "generates a deterministic implementation manifest",
    () => {

        const first =
            generateImplementationManifest(
                createPlan(),
                createProposal()
            );

        const second =
            generateImplementationManifest(
                createPlan(),
                createProposal()
            );

        assert.deepEqual(
            first,
            second
        );

    }
);


test(
    "maps approved proposal fields into the manifest",
    () => {

        const result =
            generateImplementationManifest(
                createPlan(),
                createProposal()
            );

        assert.equal(
            result.manifest.version,
            "1.0.0"
        );

        assert.equal(
            result.manifest.implementationId,
            "implementation:proposal:dev-08-generator"
        );

        assert.equal(
            result.manifest.planId,
            "plan:dev-08-generator"
        );

        assert.equal(
            result.manifest.branch,
            "dev-08-autonomous-manifest-generation"
        );

        assert.equal(
            result.manifest.description,
            "Create two approved files."
        );

        assert.equal(
            result.operationCount,
            2
        );

    }
);


test(
    "sorts manifest operations by path",
    () => {

        const result =
            generateImplementationManifest(
                createPlan(),
                createProposal()
            );

        assert.deepEqual(
            result.manifest.operations.map(
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
    "removes proposal-only reason fields",
    () => {

        const result =
            generateImplementationManifest(
                createPlan(),
                createProposal()
            );

        for (
            const operation of
            result.manifest.operations
        ) {

            assert.equal(
                "reason" in operation,
                false
            );

        }

    }
);


test(
    "preserves content and overwrite behavior",
    () => {

        const result =
            generateImplementationManifest(
                createPlan(),
                createProposal()
            );

        const firstOperation =
            result.manifest.operations[0];

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

    }
);


test(
    "rejects an unapproved proposal",
    () => {

        assert.throws(
            () => {
                generateImplementationManifest(
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
    "rejects an operation outside plan scope",
    () => {

        const proposal =
            createProposal();

        assert.throws(
            () => {
                generateImplementationManifest(
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
