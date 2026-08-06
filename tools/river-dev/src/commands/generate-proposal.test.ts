import {
    strict as assert
} from "node:assert";

import {
    mkdtemp,
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
    loadRiverDevConfiguration
} from "../core/config";

import type {
    RiverDevImplementationIntent
} from "../core/implementation-intent";

import type {
    RiverDevImplementationPlan
} from "../core/planner";

import type {
    RiverDevConfiguration
} from "../types";

import {
    formatProposalGenerationResult,
    generateProposalRiverDev,
    loadImplementationIntent,
    loadImplementationPlan
} from "./generate-proposal";


function createPlan(): RiverDevImplementationPlan {

    return {

        version:
            "1.0.0",

        planId:
            "plan:dev-09-command",

        phase:
            "DEV-09 Command",

        branch:
            "dev-09-autonomous-planning-engine",

        commitMessage:
            "DEV-09: Test generate-proposal command",

        objective:
            "Test proposal command generation.",

        generatedAt:
            "2026-08-06T19:00:00.000Z",

        allowedPaths: [
            "tools/river-dev/src/core/example.ts"
        ],

        excludedPaths:
            [],

        acceptanceCriteria: [
            "Proposal generation passes."
        ],

        requiredTests: [
            "tools/river-dev/src/commands/generate-proposal.test.ts"
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
            "intent:dev-09-command",

        planId:
            "plan:dev-09-command",

        branch:
            "dev-09-autonomous-planning-engine",

        objective:
            "Create an example proposal.",

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
                    "Create the proposed example file."
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
                "river-dev-generate-proposal-"
            )
        );

    try {

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
    "loads an implementation plan",
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
                    "plan:dev-09-command"
                );

            }
        );

    }
);


test(
    "loads implementation intent with a UTF-8 BOM",
    async () => {

        await withTemporaryRepository(
            async (
                root
            ) => {

                const path =
                    join(
                        root,
                        "intent.json"
                    );

                await writeFile(
                    path,
                    `\ufeff${JSON.stringify(
                        createIntent()
                    )}`,
                    "utf8"
                );

                const intent =
                    await loadImplementationIntent(
                        path
                    );

                assert.equal(
                    intent.intentId,
                    "intent:dev-09-command"
                );

            }
        );

    }
);


test(
    "generates an unapproved proposal",
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

                const intentPath =
                    join(
                        root,
                        "intent.json"
                    );

                await writeFile(
                    planPath,
                    JSON.stringify(
                        createPlan()
                    ),
                    "utf8"
                );

                await writeFile(
                    intentPath,
                    JSON.stringify(
                        createIntent()
                    ),
                    "utf8"
                );

                const result =
                    await generateProposalRiverDev(
                        configuration,
                        planPath,
                        intentPath
                    );

                assert.equal(
                    result.operationCount,
                    1
                );

                assert.equal(
                    result.proposal.approved,
                    false
                );

                assert.equal(
                    result.proposal.proposalId,
                    "proposal:intent:dev-09-command"
                );

            }
        );

    }
);


test(
    "rejects paths outside the repository",
    async () => {

        await withTemporaryRepository(
            async (
                root,
                configuration
            ) => {

                const intentPath =
                    join(
                        root,
                        "intent.json"
                    );

                await writeFile(
                    intentPath,
                    JSON.stringify(
                        createIntent()
                    ),
                    "utf8"
                );

                await assert.rejects(
                    generateProposalRiverDev(
                        configuration,
                        join(
                            root,
                            "..",
                            "outside-plan.json"
                        ),
                        intentPath
                    ),
                    /escapes the repository boundary/
                );

            }
        );

    }
);


test(
    "formats proposal generation output",
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

                const intentPath =
                    join(
                        root,
                        "intent.json"
                    );

                await writeFile(
                    planPath,
                    JSON.stringify(
                        createPlan()
                    ),
                    "utf8"
                );

                await writeFile(
                    intentPath,
                    JSON.stringify(
                        createIntent()
                    ),
                    "utf8"
                );

                const result =
                    await generateProposalRiverDev(
                        configuration,
                        planPath,
                        intentPath
                    );

                const formatted =
                    formatProposalGenerationResult(
                        result
                    );

                assert.match(
                    formatted,
                    /River Development Agent Proposal Generation/
                );

                assert.match(
                    formatted,
                    /Repository writes: false/
                );

                assert.match(
                    formatted,
                    /"approved": false/
                );

            }
        );

    }
);
