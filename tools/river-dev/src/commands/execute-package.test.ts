import {
    strict as assert
} from "node:assert";

import {
    execFileSync
} from "node:child_process";

import {
    mkdir,
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

import type {
    RiverDevConfiguration
} from "../types";

import {
    executePackageRiverDev,
    formatPackageExecutionResult,
    loadExecutionPackage
} from "./execute-package";


const PACKAGE_FILE =
    ".river-dev/execution-packages/dev-14-command-package.json";


function createPackageJson(): string {

    return JSON.stringify(
        {
            version:
                "1.0.0",

            packageId:
                "execution-package:implementation:proposal:intent:dev-14-command",

            planId:
                "plan:dev-14-command",

            branch:
                "dev-14-controlled-package-execution",

            state:
                "ready-for-implementation",

            proposal:
                {
                    version:
                        "1.0.0",

                    proposalId:
                        "proposal:intent:dev-14-command",

                    planId:
                        "plan:dev-14-command",

                    branch:
                        "dev-14-controlled-package-execution",

                    objective:
                        "Execute a DEV-14 command package.",

                    approved:
                        true,

                    operations: [
                        {
                            type:
                                "write-file",

                            path:
                                "generated/dev-14-command.ts",

                            content:
                                "export const dev14Command = true;\n",

                            overwrite:
                                false,

                            reason:
                                "Create the DEV-14 command example."
                        }
                    ]
                },

            manifest:
                {
                    version:
                        "1.0.0",

                    implementationId:
                        "implementation:proposal:intent:dev-14-command",

                    planId:
                        "plan:dev-14-command",

                    branch:
                        "dev-14-controlled-package-execution",

                    description:
                        "Execute a DEV-14 command package.",

                    operations: [
                        {
                            type:
                                "write-file",

                            path:
                                "generated/dev-14-command.ts",

                            content:
                                "export const dev14Command = true;\n",

                            overwrite:
                                false
                        }
                    ]
                },

            verification:
                {
                    verificationId:
                        "verification:dev-14-command",

                    passed:
                        true,

                    verifiedAt:
                        "2026-08-06T23:00:00.000Z",

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
        },
        null,
        2
    ) + "\n";

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
                "river-dev-execute-package-command-"
            )
        );

    try {

        execFileSync(
            "git",
            [
                "init",
                "-b",
                "dev-14-controlled-package-execution"
            ],
            {
                cwd:
                    repositoryRoot,

                stdio:
                    "ignore"
            }
        );

        await mkdir(
            join(
                repositoryRoot,
                ".river-dev",
                "execution-packages"
            ),
            {
                recursive: true
            }
        );

        const packagePath =
            join(
                repositoryRoot,
                PACKAGE_FILE
            );

        await writeFile(
            packagePath,
            createPackageJson(),
            {
                encoding:
                    "utf8",

                flag:
                    "wx"
            }
        );

        const baseConfiguration =
            await loadRiverDevConfiguration(
                process.cwd()
            );

        const configuration:
            RiverDevConfiguration =
            {
                ...baseConfiguration,

                repositoryRoot
            };

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
    "loads an execution package from a repository-local path",
    async () => {

        await withTemporaryRepository(
            async (
                repositoryRoot,
                configuration
            ) => {

                void repositoryRoot;

                const executionPackage =
                    await loadExecutionPackage(
                        configuration,
                        PACKAGE_FILE
                    );

                assert.equal(
                    executionPackage.packageId,
                    "execution-package:implementation:proposal:intent:dev-14-command"
                );

            }
        );

    }
);


test(
    "executes a package in dry-run mode by default",
    async () => {

        await withTemporaryRepository(
            async (
                repositoryRoot,
                configuration
            ) => {

                const result =
                    await executePackageRiverDev(
                        configuration,
                        PACKAGE_FILE
                    );

                assert.equal(
                    result.mode,
                    "dry-run"
                );

                assert.equal(
                    result.explicitApplyAuthorized,
                    false
                );

                assert.equal(
                    result.implementation.applied,
                    false
                );

                await assert.rejects(
                    readFile(
                        join(
                            repositoryRoot,
                            "generated",
                            "dev-14-command.ts"
                        ),
                        "utf8"
                    )
                );

            }
        );

    }
);


test(
    "executes a package in apply mode when explicitly requested",
    async () => {

        await withTemporaryRepository(
            async (
                repositoryRoot,
                configuration
            ) => {

                const result =
                    await executePackageRiverDev(
                        configuration,
                        PACKAGE_FILE,
                        "apply"
                    );

                assert.equal(
                    result.mode,
                    "apply"
                );

                assert.equal(
                    result.explicitApplyAuthorized,
                    true
                );

                assert.equal(
                    result.implementation.applied,
                    true
                );

                const content =
                    await readFile(
                        join(
                            repositoryRoot,
                            "generated",
                            "dev-14-command.ts"
                        ),
                        "utf8"
                    );

                assert.equal(
                    content,
                    "export const dev14Command = true;\n"
                );

            }
        );

    }
);


test(
    "formats package execution results",
    async () => {

        await withTemporaryRepository(
            async (
                repositoryRoot,
                configuration
            ) => {

                void repositoryRoot;

                const result =
                    await executePackageRiverDev(
                        configuration,
                        PACKAGE_FILE
                    );

                const formatted =
                    formatPackageExecutionResult(
                        result
                    );

                assert.match(
                    formatted,
                    /River Development Agent Package Execution/
                );

                assert.match(
                    formatted,
                    /Mode: dry-run/
                );

                assert.match(
                    formatted,
                    /Explicit apply authorized: false/
                );

                assert.match(
                    formatted,
                    /Applied: false/
                );

                assert.match(
                    formatted,
                    /Operations: 1/
                );

            }
        );

    }
);


test(
    "rejects execution package paths outside the repository",
    async () => {

        await withTemporaryRepository(
            async (
                repositoryRoot,
                configuration
            ) => {

                void repositoryRoot;

                await assert.rejects(
                    loadExecutionPackage(
                        configuration,
                        "../outside-package.json"
                    ),
                    /Path escapes the repository boundary./
                );

            }
        );

    }
);


