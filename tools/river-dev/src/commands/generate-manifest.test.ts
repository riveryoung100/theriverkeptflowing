import {
    strict as assert
} from "node:assert";

import {
    mkdtemp,
    mkdir,
    rm,
    writeFile
} from "node:fs/promises";

import {
    tmpdir
} from "node:os";

import {
    join
} from "node:path";

import {
    test
} from "node:test";

import {
    formatManifestGenerationResult,
    generateManifestRiverDev,
    loadImplementationPlan,
    loadImplementationProposal
} from "./generate-manifest";

import type {
    RiverDevImplementationPlan
} from "../core/planner";

import type {
    RiverDevImplementationProposal
} from "../core/implementation-proposal";

import {
    loadRiverDevConfiguration
} from "../core/config";

import type {
    RiverDevConfiguration
} from "../types";


function createPlan(): RiverDevImplementationPlan {

    return {

        version:
            "1.0.0",

        planId:
            "plan:dev-08-command",

        phase:
            "DEV-08 Command",

        branch:
            "dev-08-autonomous-manifest-generation",

        commitMessage:
            "DEV-08: Test generate-manifest command",

        objective:
            "Test manifest command generation.",

        generatedAt:
            "2026-08-06T17:00:00.000Z",

        allowedPaths: [
            "tools/river-dev/src/core/example.ts"
        ],

        excludedPaths:
            [],

        acceptanceCriteria: [
            "Command generation passes."
        ],

        requiredTests: [
            "tools/river-dev/src/commands/generate-manifest.test.ts"
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
            "proposal:dev-08-command",

        planId:
            "plan:dev-08-command",

        branch:
            "dev-08-autonomous-manifest-generation",

        objective:
            "Create an approved example implementation.",

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
                    "Create the approved example file."
            }
        ]

    };

}


async function withTemporaryRepository(
    callback:
        (
            root:
                string,
            configuration:
                RiverDevConfiguration
        ) => Promise<void>
): Promise<void> {

    const root =
        await mkdtemp(
            join(
                tmpdir(),
                "river-dev-generate-manifest-"
            )
        );

    try {

        await mkdir(
            join(
                root,
                ".river-dev"
            ),
            {
                recursive:
                    true
            }
        );

        const baseConfiguration =
            await loadRiverDevConfiguration(
                process.cwd()
            );

        const configuration =
            {
                ...baseConfiguration,

                repositoryRoot:
                    root
            } satisfies RiverDevConfiguration;

        await callback(
            root,
            configuration
        );

    }
    finally {

        await rm(
            root,
            {
                recursive:
                    true,

                force:
                    true
            }
        );

    }

}


test(
    "loads an implementation plan from JSON",
    async () => {

        await withTemporaryRepository(
            async (
                root
            ) => {

                const path =
                    join(
                        root,
                        "plan.json"
                    );

                await writeFile(
                    path,
                    JSON.stringify(
                        createPlan()
                    ),
                    "utf8"
                );

                const plan =
                    await loadImplementationPlan(
                        path
                    );

                assert.equal(
                    plan.planId,
                    "plan:dev-08-command"
                );

            }
        );

    }
);


test(
    "loads a proposal containing a UTF-8 BOM",
    async () => {

        await withTemporaryRepository(
            async (
                root
            ) => {

                const path =
                    join(
                        root,
                        "proposal.json"
                    );

                await writeFile(
                    path,
                    `\ufeff${JSON.stringify(
                        createProposal()
                    )}`,
                    "utf8"
                );

                const proposal =
                    await loadImplementationProposal(
                        path
                    );

                assert.equal(
                    proposal.proposalId,
                    "proposal:dev-08-command"
                );

            }
        );

    }
);


test(
    "generates a manifest from repository-local inputs",
    async () => {

        await withTemporaryRepository(
            async (
                root,
                configuration
            ) => {

                const planPath =
                    join(
                        root,
                        "plan.json"
                    );

                const proposalPath =
                    join(
                        root,
                        "proposal.json"
                    );

                await writeFile(
                    planPath,
                    JSON.stringify(
                        createPlan()
                    ),
                    "utf8"
                );

                await writeFile(
                    proposalPath,
                    JSON.stringify(
                        createProposal()
                    ),
                    "utf8"
                );

                const result =
                    await generateManifestRiverDev(
                        configuration,
                        planPath,
                        proposalPath
                    );

                assert.equal(
                    result.operationCount,
                    1
                );

                assert.equal(
                    result.manifest.implementationId,
                    "implementation:proposal:dev-08-command"
                );

            }
        );

    }
);


test(
    "rejects a plan path outside the repository",
    async () => {

        await withTemporaryRepository(
            async (
                root,
                configuration
            ) => {

                const proposalPath =
                    join(
                        root,
                        "proposal.json"
                    );

                await writeFile(
                    proposalPath,
                    JSON.stringify(
                        createProposal()
                    ),
                    "utf8"
                );

                await assert.rejects(
                    generateManifestRiverDev(
                        configuration,
                        join(
                            root,
                            "..",
                            "outside-plan.json"
                        ),
                        proposalPath
                    ),
                    /escapes the repository boundary/
                );

            }
        );

    }
);


test(
    "formats a generated manifest result",
    async () => {

        await withTemporaryRepository(
            async (
                root,
                configuration
            ) => {

                const planPath =
                    join(
                        root,
                        "plan.json"
                    );

                const proposalPath =
                    join(
                        root,
                        "proposal.json"
                    );

                await writeFile(
                    planPath,
                    JSON.stringify(
                        createPlan()
                    ),
                    "utf8"
                );

                await writeFile(
                    proposalPath,
                    JSON.stringify(
                        createProposal()
                    ),
                    "utf8"
                );

                const result =
                    await generateManifestRiverDev(
                        configuration,
                        planPath,
                        proposalPath
                    );

                const formatted =
                    formatManifestGenerationResult(
                        result
                    );

                assert.match(
                    formatted,
                    /River Development Agent Manifest Generation/
                );

                assert.match(
                    formatted,
                    /Repository writes: false/
                );

                assert.match(
                    formatted,
                    /implementation:proposal:dev-08-command/
                );

            }
        );

    }
);

