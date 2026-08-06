import {
    strict as assert
} from "node:assert";

import {
    mkdtemp,
    readFile,
    rm
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
    RiverDevExecutionPackage
} from "../core/execution-package";

import type {
    RiverDevConfiguration
} from "../types";

import {
    formatExecutionPackagePersistenceResult,
    persistExecutionPackageRiverDev
} from "./persist-execution-package";


function createPackage(): RiverDevExecutionPackage {

    return {
        version:
            "1.0.0",

        packageId:
            "execution-package:implementation:proposal:intent:dev-13-command",

        planId:
            "plan:dev-13-command",

        branch:
            "dev-13-execution-package-persistence",

        state:
            "ready-for-implementation",

        proposal:
            {
                version:
                    "1.0.0",

                proposalId:
                    "proposal:intent:dev-13-command",

                planId:
                    "plan:dev-13-command",

                branch:
                    "dev-13-execution-package-persistence",

                objective:
                    "Persist a DEV-13 command package.",

                approved:
                    true,

                operations: [
                    {
                        type:
                            "write-file",

                        path:
                            "tools/river-dev/src/generated/dev-13-command.ts",

                        content:
                            "export const dev13Command = true;\n",

                        overwrite:
                            false,

                        reason:
                            "Create the DEV-13 command example."
                    }
                ]
            },

        manifest:
            {
                version:
                    "1.0.0",

                implementationId:
                    "implementation:proposal:intent:dev-13-command",

                planId:
                    "plan:dev-13-command",

                branch:
                    "dev-13-execution-package-persistence",

                description:
                    "Persist a DEV-13 command package.",

                operations: [
                    {
                        type:
                            "write-file",

                        path:
                            "tools/river-dev/src/generated/dev-13-command.ts",

                        content:
                            "export const dev13Command = true;\n",

                        overwrite:
                            false
                    }
                ]
            },

        verification:
            {
                verificationId:
                    "verification:dev-13-command",

                passed:
                    true,

                verifiedAt:
                    "2026-08-06T22:15:00.000Z",

                commands: [
                    "typecheck",
                    "tests"
                ],

                warnings:
                    []
            },

        implementationReady:
            true,

        implementationWritesPerformed:
            false
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
                "river-dev-persist-execution-package-"
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
    "persists an execution package through the command adapter",
    async () => {

        await withTemporaryRepository(
            async (
                repositoryRoot,
                configuration
            ) => {

                const result =
                    await persistExecutionPackageRiverDev(
                        configuration,
                        createPackage()
                    );

                assert.equal(
                    result.persisted,
                    true
                );

                assert.equal(
                    result.implementationWritesPerformed,
                    false
                );

                const persisted =
                    await readFile(
                        result.absolutePath,
                        "utf8"
                    );

                assert.match(
                    persisted,
                    /execution-package:implementation:proposal:intent:dev-13-command/
                );

                assert.equal(
                    result.absolutePath.startsWith(
                        repositoryRoot
                    ),
                    true
                );

            }
        );

    }
);


test(
    "blocks command adapter execution package overwrites",
    async () => {

        await withTemporaryRepository(
            async (
                repositoryRoot,
                configuration
            ) => {

                void repositoryRoot;

                const executionPackage =
                    createPackage();

                await persistExecutionPackageRiverDev(
                    configuration,
                    executionPackage
                );

                await assert.rejects(
                    persistExecutionPackageRiverDev(
                        configuration,
                        executionPackage
                    ),
                    /Execution package already exists/
                );

            }
        );

    }
);


test(
    "formats execution package persistence results",
    async () => {

        await withTemporaryRepository(
            async (
                repositoryRoot,
                configuration
            ) => {

                void repositoryRoot;

                const result =
                    await persistExecutionPackageRiverDev(
                        configuration,
                        createPackage()
                    );

                const formatted =
                    formatExecutionPackagePersistenceResult(
                        result
                    );

                assert.match(
                    formatted,
                    /River Development Agent Execution Package Persistence/
                );

                assert.match(
                    formatted,
                    /Persisted: true/
                );

                assert.match(
                    formatted,
                    /Implementation writes: false/
                );

                assert.match(
                    formatted,
                    /Repository path: .river-dev\/execution-packages\//
                );

            }
        );

    }
);
