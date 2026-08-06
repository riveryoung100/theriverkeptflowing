import {
    strict as assert
} from "node:assert";

import {
    mkdtemp,
    readFile,
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

import {
    prepareArtifactPersistence
} from "../core/artifact-persistence";

import type {
    RiverDevImplementationProposal
} from "../core/implementation-proposal";

import type {
    RiverDevImplementationManifest
} from "../execution/runner";

import type {
    RiverDevConfiguration
} from "../types";

import {
    formatArtifactPersistenceResult,
    formatGeneratedArtifactPersistenceResult,
    persistArtifactsRiverDev,
    persistGeneratedArtifactsRiverDev
} from "./persist-artifacts";


function createProposal(
    approved:
        boolean
): RiverDevImplementationProposal {

    return {

        version:
            "1.0.0",

        proposalId:
            "proposal:intent:dev-11-command",

        planId:
            "plan:dev-11-command",

        branch:
            "dev-11-artifact-persistence",

        objective:
            "Persist command adapter artifacts.",

        approved,

        operations: [
            {
                type:
                    "write-file",

                path:
                    "tools/river-dev/src/generated/command-example.ts",

                content:
                    "export const commandExample = true;\n",

                overwrite:
                    false,

                reason:
                    "Create the command adapter example."
            }
        ]

    };

}


function createManifest(): RiverDevImplementationManifest {

    return {

        version:
            "1.0.0",

        implementationId:
            "implementation:proposal:intent:dev-11-command",

        planId:
            "plan:dev-11-command",

        branch:
            "dev-11-artifact-persistence",

        description:
            "Persist command adapter artifacts.",

        operations: [
            {
                type:
                    "write-file",

                path:
                    "tools/river-dev/src/generated/command-example.ts",

                content:
                    "export const commandExample = true;\n",

                overwrite:
                    false
            }
        ]

    };

}


async function withTemporaryRepository(
    callback:
        (
            repositoryRoot:
                string,
            configuration:
                RiverDevConfiguration
        ) => Promise<void>
): Promise<void> {

    const repositoryRoot =
        await mkdtemp(
            join(
                tmpdir(),
                "river-dev-persist-command-"
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

                repositoryRoot
            } satisfies RiverDevConfiguration;

        await callback(
            repositoryRoot,
            configuration
        );

    }
    finally {

        await rm(
            repositoryRoot,
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
    "persists a prepared proposal through the command adapter",
    async () => {

        await withTemporaryRepository(
            async (
                repositoryRoot,
                configuration
            ) => {

                const preparation =
                    prepareArtifactPersistence(
                        {
                            repositoryRoot,

                            artifactRoot:
                                ".river-dev/artifacts",

                            proposal:
                                createProposal(
                                    false
                                ),

                            manifest:
                                null
                        }
                    );

                const result =
                    await persistArtifactsRiverDev(
                        configuration,
                        preparation
                    );

                assert.equal(
                    result.artifactCount,
                    1
                );

                assert.equal(
                    result.artifacts[0]?.type,
                    "proposal"
                );

                assert.equal(
                    result.implementationWritesPerformed,
                    false
                );

                const content =
                    await readFile(
                        preparation.proposal.absolutePath,
                        "utf8"
                    );

                assert.equal(
                    content,
                    preparation.proposal.content
                );

            }
        );

    }
);


test(
    "persists approved proposal and manifest through the command adapter",
    async () => {

        await withTemporaryRepository(
            async (
                repositoryRoot,
                configuration
            ) => {

                const preparation =
                    prepareArtifactPersistence(
                        {
                            repositoryRoot,

                            artifactRoot:
                                ".river-dev/artifacts",

                            proposal:
                                createProposal(
                                    true
                                ),

                            manifest:
                                createManifest()
                        }
                    );

                const result =
                    await persistArtifactsRiverDev(
                        configuration,
                        preparation
                    );

                assert.equal(
                    result.artifactCount,
                    2
                );

                assert.deepEqual(
                    result.artifacts.map(
                        (artifact) => {
                            return artifact.type;
                        }
                    ),
                    [
                        "proposal",
                        "manifest"
                    ]
                );

                assert.equal(
                    result.implementationWritesPerformed,
                    false
                );

            }
        );

    }
);


test(
    "blocks command adapter artifact overwrites",
    async () => {

        await withTemporaryRepository(
            async (
                repositoryRoot,
                configuration
            ) => {

                const preparation =
                    prepareArtifactPersistence(
                        {
                            repositoryRoot,

                            artifactRoot:
                                ".river-dev/artifacts",

                            proposal:
                                createProposal(
                                    false
                                ),

                            manifest:
                                null
                        }
                    );

                await persistArtifactsRiverDev(
                    configuration,
                    preparation
                );

                await assert.rejects(
                    persistArtifactsRiverDev(
                        configuration,
                        preparation
                    ),
                    /Artifact already exists/
                );

            }
        );

    }
);


test(
    "formats proposal persistence results",
    async () => {

        await withTemporaryRepository(
            async (
                repositoryRoot,
                configuration
            ) => {

                const preparation =
                    prepareArtifactPersistence(
                        {
                            repositoryRoot,

                            artifactRoot:
                                ".river-dev/artifacts",

                            proposal:
                                createProposal(
                                    false
                                ),

                            manifest:
                                null
                        }
                    );

                const result =
                    await persistArtifactsRiverDev(
                        configuration,
                        preparation
                    );

                const formatted =
                    formatArtifactPersistenceResult(
                        result
                    );

                assert.match(
                    formatted,
                    /River Development Agent Artifact Persistence/
                );

                assert.match(
                    formatted,
                    /Artifacts: 1/
                );

                assert.match(
                    formatted,
                    /Implementation writes: false/
                );

                assert.match(
                    formatted,
                    /proposal: .river-dev\/artifacts\/proposal\/proposal-intent-dev-11-command.json/
                );

            }
        );

    }
);


test(
    "formats proposal and manifest persistence results",
    async () => {

        await withTemporaryRepository(
            async (
                repositoryRoot,
                configuration
            ) => {

                const preparation =
                    prepareArtifactPersistence(
                        {
                            repositoryRoot,

                            artifactRoot:
                                ".river-dev/artifacts",

                            proposal:
                                createProposal(
                                    true
                                ),

                            manifest:
                                createManifest()
                        }
                    );

                const result =
                    await persistArtifactsRiverDev(
                        configuration,
                        preparation
                    );

                const formatted =
                    formatArtifactPersistenceResult(
                        result
                    );

                assert.match(
                    formatted,
                    /Artifacts: 2/
                );

                assert.match(
                    formatted,
                    /proposal: .river-dev\/artifacts\/proposal\//
                );

                assert.match(
                    formatted,
                    /manifest: .river-dev\/artifacts\/manifest\//
                );

                assert.match(
                    formatted,
                    /Implementation writes: false/
                );

            }
        );

    }
);

test(
    "persists only the generated proposal without approval",
    async () => {

        await withTemporaryRepository(
            async (
                repositoryRoot,
                configuration
            ) => {

                const planPath =
                    join(
                        repositoryRoot,
                        "plan.json"
                    );

                const intentPath =
                    join(
                        repositoryRoot,
                        "intent.json"
                    );

                const plan =
                    {
                        version:
                            "1.0.0",

                        planId:
                            "plan:dev-11-generated",

                        phase:
                            "DEV-11 Generated Persistence",

                        branch:
                            "dev-11-artifact-persistence",

                        commitMessage:
                            "DEV-11 generated persistence test",

                        objective:
                            "Persist generated River Dev artifacts.",

                        generatedAt:
                            "2026-08-06T20:00:00.000Z",

                        allowedPaths: [
                            "tools/river-dev/src/generated/generated-example.ts"
                        ],

                        excludedPaths:
                            [],

                        acceptanceCriteria:
                            [],

                        requiredTests:
                            [],

                        requiredQualityGates:
                            [],

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

                const intent =
                    {
                        version:
                            "1.0.0",

                        intentId:
                            "intent:dev-11-generated",

                        planId:
                            "plan:dev-11-generated",

                        branch:
                            "dev-11-artifact-persistence",

                        objective:
                            "Generate one controlled artifact.",

                        operations: [
                            {
                                type:
                                    "write-file",

                                path:
                                    "tools/river-dev/src/generated/generated-example.ts",

                                content:
                                    "export const generatedExample = true;\n",

                                overwrite:
                                    false,

                                reason:
                                    "Create the generated example."
                            }
                        ]
                    };

                await writeFile(
                    planPath,
                    JSON.stringify(
                        plan
                    ),
                    "utf8"
                );

                await writeFile(
                    intentPath,
                    JSON.stringify(
                        intent
                    ),
                    "utf8"
                );

                const result =
                    await persistGeneratedArtifactsRiverDev(
                        configuration,
                        planPath,
                        intentPath,
                        false
                    );

                assert.equal(
                    result.pipelineOutcome,
                    "approval-required"
                );

                assert.equal(
                    result.proposalApproved,
                    false
                );

                assert.equal(
                    result.manifestGenerated,
                    false
                );

                assert.equal(
                    result.persistence.artifactCount,
                    1
                );

                assert.equal(
                    result.persistence.artifacts[0]?.type,
                    "proposal"
                );

                assert.equal(
                    result.implementationWritesPerformed,
                    false
                );

            }
        );

    }
);


test(
    "persists generated proposal and manifest after explicit approval",
    async () => {

        await withTemporaryRepository(
            async (
                repositoryRoot,
                configuration
            ) => {

                const planPath =
                    join(
                        repositoryRoot,
                        "approved-plan.json"
                    );

                const intentPath =
                    join(
                        repositoryRoot,
                        "approved-intent.json"
                    );

                const plan =
                    {
                        version:
                            "1.0.0",

                        planId:
                            "plan:dev-11-approved-generated",

                        phase:
                            "DEV-11 Approved Generated Persistence",

                        branch:
                            "dev-11-artifact-persistence",

                        commitMessage:
                            "DEV-11 approved generated persistence test",

                        objective:
                            "Persist approved generated artifacts.",

                        generatedAt:
                            "2026-08-06T20:05:00.000Z",

                        allowedPaths: [
                            "tools/river-dev/src/generated/approved-example.ts"
                        ],

                        excludedPaths:
                            [],

                        acceptanceCriteria:
                            [],

                        requiredTests:
                            [],

                        requiredQualityGates:
                            [],

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

                const intent =
                    {
                        version:
                            "1.0.0",

                        intentId:
                            "intent:dev-11-approved-generated",

                        planId:
                            "plan:dev-11-approved-generated",

                        branch:
                            "dev-11-artifact-persistence",

                        objective:
                            "Generate an approved controlled artifact.",

                        operations: [
                            {
                                type:
                                    "write-file",

                                path:
                                    "tools/river-dev/src/generated/approved-example.ts",

                                content:
                                    "export const approvedExample = true;\n",

                                overwrite:
                                    false,

                                reason:
                                    "Create the approved example."
                            }
                        ]
                    };

                await writeFile(
                    planPath,
                    JSON.stringify(
                        plan
                    ),
                    "utf8"
                );

                await writeFile(
                    intentPath,
                    JSON.stringify(
                        intent
                    ),
                    "utf8"
                );

                const result =
                    await persistGeneratedArtifactsRiverDev(
                        configuration,
                        planPath,
                        intentPath,
                        true
                    );

                assert.equal(
                    result.pipelineOutcome,
                    "manifest-generated"
                );

                assert.equal(
                    result.proposalApproved,
                    true
                );

                assert.equal(
                    result.manifestGenerated,
                    true
                );

                assert.equal(
                    result.persistence.artifactCount,
                    2
                );

                assert.deepEqual(
                    result.persistence.artifacts.map(
                        (artifact) => {
                            return artifact.type;
                        }
                    ),
                    [
                        "proposal",
                        "manifest"
                    ]
                );

                assert.equal(
                    result.implementationWritesPerformed,
                    false
                );

            }
        );

    }
);


test(
    "formats generated artifact persistence results",
    async () => {

        await withTemporaryRepository(
            async (
                repositoryRoot,
                configuration
            ) => {

                const planPath =
                    join(
                        repositoryRoot,
                        "format-plan.json"
                    );

                const intentPath =
                    join(
                        repositoryRoot,
                        "format-intent.json"
                    );

                const plan =
                    {
                        version:
                            "1.0.0",

                        planId:
                            "plan:dev-11-format-generated",

                        phase:
                            "DEV-11 Format Generated Persistence",

                        branch:
                            "dev-11-artifact-persistence",

                        commitMessage:
                            "DEV-11 format generated persistence test",

                        objective:
                            "Format generated artifact persistence.",

                        generatedAt:
                            "2026-08-06T20:10:00.000Z",

                        allowedPaths: [
                            "tools/river-dev/src/generated/format-example.ts"
                        ],

                        excludedPaths:
                            [],

                        acceptanceCriteria:
                            [],

                        requiredTests:
                            [],

                        requiredQualityGates:
                            [],

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

                const intent =
                    {
                        version:
                            "1.0.0",

                        intentId:
                            "intent:dev-11-format-generated",

                        planId:
                            "plan:dev-11-format-generated",

                        branch:
                            "dev-11-artifact-persistence",

                        objective:
                            "Generate the formatted example.",

                        operations: [
                            {
                                type:
                                    "write-file",

                                path:
                                    "tools/river-dev/src/generated/format-example.ts",

                                content:
                                    "export const formatExample = true;\n",

                                overwrite:
                                    false,

                                reason:
                                    "Create the formatted example."
                            }
                        ]
                    };

                await writeFile(
                    planPath,
                    JSON.stringify(
                        plan
                    ),
                    "utf8"
                );

                await writeFile(
                    intentPath,
                    JSON.stringify(
                        intent
                    ),
                    "utf8"
                );

                const result =
                    await persistGeneratedArtifactsRiverDev(
                        configuration,
                        planPath,
                        intentPath,
                        false
                    );

                const formatted =
                    formatGeneratedArtifactPersistenceResult(
                        result
                    );

                assert.match(
                    formatted,
                    /River Development Agent Generated Artifact Persistence/
                );

                assert.match(
                    formatted,
                    /Pipeline outcome: approval-required/
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
                    /Artifacts: 1/
                );

                assert.match(
                    formatted,
                    /Implementation writes: false/
                );

            }
        );

    }
);



