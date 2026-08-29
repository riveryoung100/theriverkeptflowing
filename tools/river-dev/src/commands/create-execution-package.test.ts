import {
    strict as assert
} from "node:assert";

import {
    mkdtemp,
    rm,
    readFile,
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
    RiverDevConfiguration
} from "../types";

import {
    createExecutionPackageRiverDev,
    formatExecutionPackageResult
} from "./create-execution-package";


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
                "river-dev-execution-package-"
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


async function writeFixtureFiles(
    repositoryRoot:
        string
): Promise<{
    proposalPath:
        string;
    manifestPath:
        string;
    verificationPath:
        string;
}> {

    const proposalPath =
        join(
            repositoryRoot,
            "proposal.json"
        );

    const manifestPath =
        join(
            repositoryRoot,
            "manifest.json"
        );

    const verificationPath =
        join(
            repositoryRoot,
            "verification.json"
        );

    await writeFile(
        proposalPath,
        JSON.stringify(
            {
                version:
                    "1.0.0",
                proposalId:
                    "proposal:intent:dev-12-command",
                planId:
                    "plan:dev-12-command",
                branch:
                    "dev-12-execution-package",
                objective:
                    "Create a command adapter package.",
                approved:
                    true,
                operations: [
                    {
                        type:
                            "write-file",
                        path:
                            "tools/river-dev/src/generated/dev-12-command.ts",
                        content:
                            "export const dev12Command = true;\n",
                        overwrite:
                            false,
                        reason:
                            "Create the DEV-12 command example."
                    }
                ]
            },
            null,
            2
        ),
        "utf8"
    );

    await writeFile(
        manifestPath,
        JSON.stringify(
            {
                version:
                    "1.0.0",
                implementationId:
                    "implementation:proposal:intent:dev-12-command",
                planId:
                    "plan:dev-12-command",
                branch:
                    "dev-12-execution-package",
                description:
                    "Create a command adapter package.",
                operations: [
                    {
                        type:
                            "write-file",
                        path:
                            "tools/river-dev/src/generated/dev-12-command.ts",
                        content:
                            "export const dev12Command = true;\n",
                        overwrite:
                            false
                    }
                ]
            },
            null,
            2
        ),
        "utf8"
    );

    await writeFile(
        verificationPath,
        JSON.stringify(
            {
                verificationId:
                    "verification:dev-12-command",
                passed:
                    true,
                verifiedAt:
                    "2026-08-06T21:30:00.000Z",
                commands: [
                    "typecheck",
                    "tests"
                ],
                warnings:
                    []
            },
            null,
            2
        ),
        "utf8"
    );

    return {
        proposalPath,
        manifestPath,
        verificationPath
    };

}


test(
    "creates an execution package from repository-local files",
    async () => {

        await withTemporaryRepository(
            async (
                repositoryRoot,
                configuration
            ) => {

                const fixtures =
                    await writeFixtureFiles(
                        repositoryRoot
                    );

                const result =
                    await createExecutionPackageRiverDev(
                        configuration,
                        fixtures.proposalPath,
                        fixtures.manifestPath,
                        fixtures.verificationPath
                    );

                assert.equal(
                    result.executionPackage.state,
                    "ready-for-implementation"
                );

                assert.equal(
                    result.executionPackage.implementationReady,
                    true
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
    "formats an execution package result",
    async () => {

        await withTemporaryRepository(
            async (
                repositoryRoot,
                configuration
            ) => {

                const fixtures =
                    await writeFixtureFiles(
                        repositoryRoot
                    );

                const result =
                    await createExecutionPackageRiverDev(
                        configuration,
                        fixtures.proposalPath,
                        fixtures.manifestPath,
                        fixtures.verificationPath
                    );

                const formatted =
                    formatExecutionPackageResult(
                        result
                    );

                assert.match(
                    formatted,
                    /River Development Agent Execution Package/
                );

                assert.match(
                    formatted,
                    /State: ready-for-implementation/
                );

                assert.match(
                    formatted,
                    /Implementation ready: true/
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
    "rejects execution package files outside the repository",
    async () => {

        await withTemporaryRepository(
            async (
                repositoryRoot,
                configuration
            ) => {

                const fixtures =
                    await writeFixtureFiles(
                        repositoryRoot
                    );

                await assert.rejects(
                    createExecutionPackageRiverDev(
                        configuration,
                        join(
                            repositoryRoot,
                            "..",
                            "outside-proposal.json"
                        ),
                        fixtures.manifestPath,
                        fixtures.verificationPath
                    )
                );

            }
        );

    }
);


test(
    "propagates creator rejection for an unapproved proposal",
    async () => {
        await withTemporaryRepository(
            async (repositoryRoot, configuration) => {
                const fixtures = await writeFixtureFiles(repositoryRoot);
                const proposal = JSON.parse(await readFile(fixtures.proposalPath, "utf8"));
                proposal.approved = false;
                await writeFile(fixtures.proposalPath, JSON.stringify(proposal, null, 2), "utf8");
                await assert.rejects(
                    createExecutionPackageRiverDev(configuration, fixtures.proposalPath, fixtures.manifestPath, fixtures.verificationPath),
                    /requires an approved proposal/
                );
            }
        );
    }
);

test(
    "derives non-ready lifecycle state from failed verification",
    async () => {
        await withTemporaryRepository(
            async (repositoryRoot, configuration) => {
                const fixtures = await writeFixtureFiles(repositoryRoot);
                const verification = JSON.parse(await readFile(fixtures.verificationPath, "utf8"));
                verification.passed = false;
                await writeFile(fixtures.verificationPath, JSON.stringify(verification, null, 2), "utf8");
                const result = await createExecutionPackageRiverDev(configuration, fixtures.proposalPath, fixtures.manifestPath, fixtures.verificationPath);
                assert.equal(result.executionPackage.state, "blocked");
                assert.equal(result.executionPackage.implementationReady, false);
                assert.equal(result.executionPackage.implementationWritesPerformed, false);
                assert.equal(result.implementationWritesPerformed, false);
            }
        );
    }
);

test(
    "snapshots loaded source artifacts into the execution package",
    async () => {
        await withTemporaryRepository(
            async (repositoryRoot, configuration) => {
                const fixtures = await writeFixtureFiles(repositoryRoot);
                const result = await createExecutionPackageRiverDev(configuration, fixtures.proposalPath, fixtures.manifestPath, fixtures.verificationPath);
                const proposalBefore = structuredClone(result.executionPackage.proposal);
                const manifestBefore = structuredClone(result.executionPackage.manifest);
                const verificationBefore = structuredClone(result.executionPackage.verification);
                await writeFile(fixtures.proposalPath, JSON.stringify({ changed: true }), "utf8");
                await writeFile(fixtures.manifestPath, JSON.stringify({ changed: true }), "utf8");
                await writeFile(fixtures.verificationPath, JSON.stringify({ changed: true }), "utf8");
                assert.deepEqual(result.executionPackage.proposal, proposalBefore);
                assert.deepEqual(result.executionPackage.manifest, manifestBefore);
                assert.deepEqual(result.executionPackage.verification, verificationBefore);
                assert.equal(result.executionPackage.implementationWritesPerformed, false);
                assert.equal(result.implementationWritesPerformed, false);
            }
        );
    }
);

test(
    "produces deterministic execution package results from identical repository artifacts",
    async () => {
        await withTemporaryRepository(
            async (repositoryRoot, configuration) => {
                const fixtures = await writeFixtureFiles(repositoryRoot);
                const first = await createExecutionPackageRiverDev(configuration, fixtures.proposalPath, fixtures.manifestPath, fixtures.verificationPath);
                const second = await createExecutionPackageRiverDev(configuration, fixtures.proposalPath, fixtures.manifestPath, fixtures.verificationPath);
                assert.deepEqual(first, second);
                assert.equal(first.implementationWritesPerformed, false);
                assert.equal(second.implementationWritesPerformed, false);
            }
        );
    }
);
