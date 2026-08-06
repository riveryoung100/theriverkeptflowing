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
