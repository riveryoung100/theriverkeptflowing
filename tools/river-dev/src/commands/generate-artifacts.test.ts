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
    formatArtifactPipelineResult,
    generateArtifactsRiverDev,
    loadArtifactIntent,
    loadArtifactPlan
} from "./generate-artifacts";


function createPlan(): RiverDevImplementationPlan {

    return {

        version:
            "1.0.0",

        planId:
            "plan:dev-10-command",

        phase:
            "DEV-10 Artifact Command",

        branch:
            "dev-10-artifact-pipeline",

        commitMessage:
            "DEV-10: Test artifact command",

        objective:
            "Test controlled artifact generation.",

        generatedAt:
            "2026-08-06T19:45:00.000Z",

        allowedPaths: [
            "tools/river-dev/src/generated/example.ts"
        ],

        excludedPaths:
            [],

        acceptanceCriteria: [
            "Proposal approval controls manifest generation."
        ],

        requiredTests: [
            "tools/river-dev/src/commands/generate-artifacts.test.ts"
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
            "intent:dev-10-command",

        planId:
            "plan:dev-10-command",

        branch:
            "dev-10-artifact-pipeline",

        objective:
            "Create a controlled example artifact.",

        operations: [
            {
                type:
                    "write-file",

                path:
                    "tools/river-dev/src/generated/example.ts",

                content:
                    "export const example = true;\n",

                overwrite:
                    false,

                reason:
                    "Propose the controlled example artifact."
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
                "river-dev-generate-artifacts-"
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
    "loads an artifact plan from JSON",
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
                    await loadArtifactPlan(
                        path
                    );

                assert.equal(
                    plan.planId,
                    "plan:dev-10-command"
                );

            }
        );

    }
);


test(
    "loads artifact intent containing a UTF-8 BOM",
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
                    await loadArtifactIntent(
                        path
                    );

                assert.equal(
                    intent.intentId,
                    "intent:dev-10-command"
                );

            }
        );

    }
);


test(
    "stops before manifest generation without approval",
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
                    await generateArtifactsRiverDev(
                        configuration,
                        planPath,
                        intentPath,
                        false
                    );

                assert.equal(
                    result.outcome,
                    "approval-required"
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

    }
);


test(
    "generates a manifest with explicit approval",
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
                    await generateArtifactsRiverDev(
                        configuration,
                        planPath,
                        intentPath,
                        true
                    );

                assert.equal(
                    result.outcome,
                    "manifest-generated"
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
                    "implementation:proposal:intent:dev-10-command"
                );

                assert.equal(
                    result.repositoryWritesPerformed,
                    false
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
                    generateArtifactsRiverDev(
                        configuration,
                        join(
                            root,
                            "..",
                            "outside-plan.json"
                        ),
                        intentPath,
                        false
                    ),
                    /escapes the repository boundary/
                );

            }
        );

    }
);


test(
    "formats approval-required output",
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
                    await generateArtifactsRiverDev(
                        configuration,
                        planPath,
                        intentPath,
                        false
                    );

                const formatted =
                    formatArtifactPipelineResult(
                        result
                    );

                assert.match(
                    formatted,
                    /River Development Agent Artifact Pipeline/
                );

                assert.match(
                    formatted,
                    /Outcome: approval-required/
                );

                assert.match(
                    formatted,
                    /Proposal approved: false/
                );

                assert.match(
                    formatted,
                    /Manifest generated: false/
                );

                assert.match(
                    formatted,
                    /Repository writes: false/
                );

            }
        );

    }
);


test(
    "formats generated manifest output",
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
                    await generateArtifactsRiverDev(
                        configuration,
                        planPath,
                        intentPath,
                        true
                    );

                const formatted =
                    formatArtifactPipelineResult(
                        result
                    );

                assert.match(
                    formatted,
                    /Outcome: manifest-generated/
                );

                assert.match(
                    formatted,
                    /Proposal approved: true/
                );

                assert.match(
                    formatted,
                    /Manifest generated: true/
                );

                assert.match(
                    formatted,
                    /Generated manifest:/
                );

            }
        );

    }
);
