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

import type {
    RiverDevExecutionPackage
} from "./execution-package";

import {
    createExecutionPackageRepositoryPath,
    persistExecutionPackage,
    prepareExecutionPackagePersistence
} from "./execution-package-persistence";


function createPackage(): RiverDevExecutionPackage {

    return {
        version:
            "1.0.0",

        packageId:
            "execution-package:implementation:proposal:intent:dev-13-example",

        planId:
            "plan:dev-13-example",

        branch:
            "dev-13-execution-package-persistence",

        state:
            "ready-for-implementation",

        proposal:
            {
                version:
                    "1.0.0",

                proposalId:
                    "proposal:intent:dev-13-example",

                planId:
                    "plan:dev-13-example",

                branch:
                    "dev-13-execution-package-persistence",

                objective:
                    "Persist a controlled DEV-13 execution package.",

                approved:
                    true,

                operations: [
                    {
                        type:
                            "write-file",

                        path:
                            "tools/river-dev/src/generated/dev-13-example.ts",

                        content:
                            "export const dev13Example = true;\n",

                        overwrite:
                            false,

                        reason:
                            "Create the DEV-13 example."
                    }
                ]
            },

        manifest:
            {
                version:
                    "1.0.0",

                implementationId:
                    "implementation:proposal:intent:dev-13-example",

                planId:
                    "plan:dev-13-example",

                branch:
                    "dev-13-execution-package-persistence",

                description:
                    "Persist a controlled DEV-13 execution package.",

                operations: [
                    {
                        type:
                            "write-file",

                        path:
                            "tools/river-dev/src/generated/dev-13-example.ts",

                        content:
                            "export const dev13Example = true;\n",

                        overwrite:
                            false
                    }
                ]
            },

        verification:
            {
                verificationId:
                    "verification:dev-13-example",

                passed:
                    true,

                verifiedAt:
                    "2026-08-06T22:00:00.000Z",

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


test(
    "creates a deterministic repository path",
    () => {

        const first =
            createExecutionPackageRepositoryPath(
                ".river-dev/execution-packages",
                "execution-package:implementation:proposal:intent:dev-13-example"
            );

        const second =
            createExecutionPackageRepositoryPath(
                ".river-dev/execution-packages",
                "execution-package:implementation:proposal:intent:dev-13-example"
            );

        assert.equal(
            first,
            ".river-dev/execution-packages/execution-package-implementation-proposal-intent-dev-13-example.json"
        );

        assert.equal(
            first,
            second
        );

    }
);


test(
    "normalizes Windows package roots",
    () => {

        assert.equal(
            createExecutionPackageRepositoryPath(
                ".river-dev\\execution-packages\\",
                "execution-package:test"
            ),
            ".river-dev/execution-packages/execution-package-test.json"
        );

    }
);


test(
    "rejects empty package roots",
    () => {

        assert.throws(
            () => {
                createExecutionPackageRepositoryPath(
                    "",
                    "execution-package:test"
                );
            },
            /root cannot be empty/
        );

    }
);


test(
    "prepares deterministic package persistence",
    () => {

        const first =
            prepareExecutionPackagePersistence(
                {
                    repositoryRoot:
                        "C:\\repository",

                    packageRoot:
                        ".river-dev/execution-packages",

                    executionPackage:
                        createPackage()
                }
            );

        const second =
            prepareExecutionPackagePersistence(
                {
                    repositoryRoot:
                        "C:\\repository",

                    packageRoot:
                        ".river-dev/execution-packages",

                    executionPackage:
                        createPackage()
                }
            );

        assert.deepEqual(
            first,
            second
        );

        assert.equal(
            first.repositoryPath,
            ".river-dev/execution-packages/execution-package-implementation-proposal-intent-dev-13-example.json"
        );

        assert.equal(
            first.content.endsWith(
                "\n"
            ),
            true
        );

        assert.equal(
            first.implementationWritesPerformed,
            false
        );

    }
);


test(
    "persists an execution package immutably",
    async () => {

        const repositoryRoot =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-dev-execution-package-persistence-"
                )
            );

        try {

            const preparation =
                prepareExecutionPackagePersistence(
                    {
                        repositoryRoot,

                        packageRoot:
                            ".river-dev/execution-packages",

                        executionPackage:
                            createPackage()
                    }
                );

            const result =
                await persistExecutionPackage(
                    preparation
                );

            assert.equal(
                result.persisted,
                true
            );

            assert.equal(
                result.repositoryPath,
                preparation.repositoryPath
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

            assert.equal(
                persisted,
                preparation.content
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
);


test(
    "blocks execution package overwrites",
    async () => {

        const repositoryRoot =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-dev-execution-package-overwrite-"
                )
            );

        try {

            const preparation =
                prepareExecutionPackagePersistence(
                    {
                        repositoryRoot,

                        packageRoot:
                            ".river-dev/execution-packages",

                        executionPackage:
                            createPackage()
                    }
                );

            await persistExecutionPackage(
                preparation
            );

            await assert.rejects(
                persistExecutionPackage(
                    preparation
                ),
                /Execution package already exists/
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
);
