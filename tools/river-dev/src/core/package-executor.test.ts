import {
    strict as assert
} from "node:assert";

import {
    execFileSync
} from "node:child_process";

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
} from "./config";

import type {
    RiverDevConfiguration
} from "../types";

import type {
    RiverDevExecutionPackage
} from "./execution-package";

import {
    executePackage,
    validatePackageExecutionRequest
} from "./package-executor";


function createPackage(): RiverDevExecutionPackage {

    return {
        version:
            "1.0.0",

        packageId:
            "execution-package:implementation:proposal:intent:dev-14-example",

        planId:
            "plan:dev-14-example",

        branch:
            "dev-14-controlled-package-execution",

        state:
            "ready-for-implementation",

        proposal:
            {
                version:
                    "1.0.0",

                proposalId:
                    "proposal:intent:dev-14-example",

                planId:
                    "plan:dev-14-example",

                branch:
                    "dev-14-controlled-package-execution",

                objective:
                    "Execute a controlled DEV-14 package.",

                approved:
                    true,

                operations: [
                    {
                        type:
                            "write-file",

                        path:
                            "generated/dev-14-example.ts",

                        content:
                            "export const dev14Example = true;\n",

                        overwrite:
                            false,

                        reason:
                            "Create the DEV-14 example."
                    }
                ]
            },

        manifest:
            {
                version:
                    "1.0.0",

                implementationId:
                    "implementation:proposal:intent:dev-14-example",

                planId:
                    "plan:dev-14-example",

                branch:
                    "dev-14-controlled-package-execution",

                description:
                    "Execute a controlled DEV-14 package.",

                operations: [
                    {
                        type:
                            "write-file",

                        path:
                            "generated/dev-14-example.ts",

                        content:
                            "export const dev14Example = true;\n",

                        overwrite:
                            false
                    }
                ]
            },

        verification:
            {
                verificationId:
                    "verification:dev-14-example",

                passed:
                    true,

                verifiedAt:
                    "2026-08-06T22:45:00.000Z",

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


async function createConfiguration(
    repositoryRoot:
        string
): Promise<RiverDevConfiguration> {

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

    const baseConfiguration =
        await loadRiverDevConfiguration(
            process.cwd()
        );

    return {
        ...baseConfiguration,

        repositoryRoot
    };

}


test(
    "accepts a valid ready execution package",
    () => {

        assert.doesNotThrow(
            () => {
                validatePackageExecutionRequest(
                    {
                        executionPackage:
                            createPackage(),

                        mode:
                            "dry-run"
                    }
                );
            }
        );

    }
);


test(
    "rejects an unapproved proposal",
    () => {

        const originalPackage =
            createPackage();

        const executionPackage:
            RiverDevExecutionPackage =
            {
                ...originalPackage,

                proposal:
                    {
                        ...originalPackage.proposal,

                        approved:
                            false
                    }
            };

        assert.throws(
            () => {
                validatePackageExecutionRequest(
                    {
                        executionPackage,
                        mode:
                            "dry-run"
                    }
                );
            },
            /requires an approved proposal/
        );

    }
);


test(
    "rejects failed verification",
    () => {

        const originalPackage =
            createPackage();

        const executionPackage:
            RiverDevExecutionPackage =
            {
                ...originalPackage,

                verification:
                    {
                        ...originalPackage.verification,

                        passed:
                            false
                    }
            };

        assert.throws(
            () => {
                validatePackageExecutionRequest(
                    {
                        executionPackage,
                        mode:
                            "dry-run"
                    }
                );
            },
            /requires passing verification/
        );

    }
);


test(
    "rejects a blocked package",
    () => {

        const originalPackage =
            createPackage();

        const executionPackage:
            RiverDevExecutionPackage =
            {
                ...originalPackage,

                state:
                    "blocked"
            };

        assert.throws(
            () => {
                validatePackageExecutionRequest(
                    {
                        executionPackage,
                        mode:
                            "dry-run"
                    }
                );
            },
            /not ready for implementation/
        );

    }
);


test(
    "rejects manifest operation mismatches",
    () => {

        const originalPackage =
            createPackage();

        const originalOperation =
            originalPackage.manifest.operations[0];

        if (
            originalOperation ===
            undefined
        ) {
            throw new TypeError(
                "Expected a manifest operation."
            );
        }

        const executionPackage:
            RiverDevExecutionPackage =
            {
                ...originalPackage,

                manifest:
                    {
                        ...originalPackage.manifest,

                        operations: [
                            {
                                ...originalOperation,

                                content:
                                    "export const dev14Example = false;\n"
                            }
                        ]
                    }
            };

        assert.throws(
            () => {
                validatePackageExecutionRequest(
                    {
                        executionPackage,
                        mode:
                            "dry-run"
                    }
                );
            },
            /operation mismatch/
        );

    }
);


test(
    "executes a dry run without writing files",
    async () => {

        const repositoryRoot =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-dev-package-dry-run-"
                )
            );

        try {

            const result =
                await executePackage(
                    await createConfiguration(
                        repositoryRoot
                    ),
                    {
                        executionPackage:
                            createPackage(),

                        mode:
                            "dry-run"
                    }
                );

            assert.equal(
                result.mode,
                "dry-run"
            );

            assert.equal(
                result.implementation.applied,
                false
            );

            assert.equal(
                result.explicitApplyAuthorized,
                false
            );

            await assert.rejects(
                readFile(
                    join(
                        repositoryRoot,
                        "generated",
                        "dev-14-example.ts"
                    ),
                    "utf8"
                )
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
    "executes an apply only when explicitly requested",
    async () => {

        const repositoryRoot =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-dev-package-apply-"
                )
            );

        try {

            const result =
                await executePackage(
                    await createConfiguration(
                        repositoryRoot
                    ),
                    {
                        executionPackage:
                            createPackage(),

                        mode:
                            "apply"
                    }
                );

            assert.equal(
                result.mode,
                "apply"
            );

            assert.equal(
                result.implementation.applied,
                true
            );

            assert.equal(
                result.explicitApplyAuthorized,
                true
            );

            const content =
                await readFile(
                    join(
                        repositoryRoot,
                        "generated",
                        "dev-14-example.ts"
                    ),
                    "utf8"
                );

            assert.equal(
                content,
                "export const dev14Example = true;\n"
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


