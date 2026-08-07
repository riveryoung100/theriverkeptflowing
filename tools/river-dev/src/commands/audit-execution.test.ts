import {
    strict as assert
} from "node:assert";

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
    auditExecutionFileRiverDev,
    auditExecutionRiverDev,
    formatExecutionAuditResult,
    loadPackageExecutionResult
} from "./audit-execution";


const RESULT_FILE =
    ".river-dev/specifications/dev-15-execution-result.json";


function createExecutionResultJson(): string {

    return JSON.stringify(
        {
            packageId:
                "execution-package:implementation:proposal:intent:dev-15-command",

            mode:
                "dry-run",

            explicitApplyAuthorized:
                false,

            implementation:
                {
                    version:
                        "1.0.0",

                    implementationId:
                        "implementation:proposal:intent:dev-15-command",

                    planId:
                        "plan:dev-15-command",

                    branch:
                        "dev-15-execution-audit-record",

                    mode:
                        "dry-run",

                    applied:
                        false,

                    operationCount:
                        1,

                    operations: [
                        {
                            index:
                                0,

                            type:
                                "write-file",

                            path:
                                "generated/dev-15-command.ts",

                            status:
                                "validated",

                            message:
                                "File validated."
                        }
                    ],

                    warnings:
                        []
                }
        },
        null,
        2
    ) + "\n";

}


async function createConfiguration(
    repositoryRoot:
        string
): Promise<RiverDevConfiguration> {

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
    "loads an execution result from a repository-local file",
    async () => {

        const repositoryRoot =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-dev-audit-command-load-"
                )
            );

        try {

            await mkdir(
                join(
                    repositoryRoot,
                    ".river-dev",
                    "specifications"
                ),
                {
                    recursive:
                        true
                }
            );

            await writeFile(
                join(
                    repositoryRoot,
                    RESULT_FILE
                ),
                createExecutionResultJson(),
                "utf8"
            );

            const result =
                await loadPackageExecutionResult(
                    await createConfiguration(
                        repositoryRoot
                    ),
                    RESULT_FILE
                );

            assert.equal(
                result.packageId,
                "execution-package:implementation:proposal:intent:dev-15-command"
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
    "persists an execution audit from an in-memory result",
    async () => {

        const repositoryRoot =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-dev-audit-command-memory-"
                )
            );

        try {

            const configuration =
                await createConfiguration(
                    repositoryRoot
                );

            const executionResult =
                JSON.parse(
                    createExecutionResultJson()
                );

            const result =
                await auditExecutionRiverDev(
                    configuration,
                    executionResult,
                    "2026-08-06T23:45:00.000Z"
                );

            assert.equal(
                result.persisted,
                true
            );

            assert.equal(
                result.implementationWritesPerformed,
                false
            );

            const content =
                await readFile(
                    result.absolutePath,
                    "utf8"
                );

            assert.match(
                content,
                /"packageId": "execution-package:implementation:proposal:intent:dev-15-command"/
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
    "persists an execution audit from a repository-local file",
    async () => {

        const repositoryRoot =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-dev-audit-command-file-"
                )
            );

        try {

            await mkdir(
                join(
                    repositoryRoot,
                    ".river-dev",
                    "specifications"
                ),
                {
                    recursive:
                        true
                }
            );

            await writeFile(
                join(
                    repositoryRoot,
                    RESULT_FILE
                ),
                createExecutionResultJson(),
                "utf8"
            );

            const result =
                await auditExecutionFileRiverDev(
                    await createConfiguration(
                        repositoryRoot
                    ),
                    RESULT_FILE,
                    "2026-08-06T23:46:00.000Z"
                );

            assert.equal(
                result.persisted,
                true
            );

            assert.equal(
                result.implementationWritesPerformed,
                false
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
    "formats execution audit persistence results",
    async () => {

        const repositoryRoot =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-dev-audit-command-format-"
                )
            );

        try {

            const configuration =
                await createConfiguration(
                    repositoryRoot
                );

            const executionResult =
                JSON.parse(
                    createExecutionResultJson()
                );

            const result =
                await auditExecutionRiverDev(
                    configuration,
                    executionResult,
                    "2026-08-06T23:47:00.000Z"
                );

            const formatted =
                formatExecutionAuditResult(
                    result
                );

            assert.match(
                formatted,
                /River Development Agent Execution Audit/
            );

            assert.match(
                formatted,
                /Persisted: true/
            );

            assert.match(
                formatted,
                /Implementation writes: false/
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
    "rejects execution result paths outside the repository",
    async () => {

        const repositoryRoot =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-dev-audit-command-boundary-"
                )
            );

        try {

            await assert.rejects(
                loadPackageExecutionResult(
                    await createConfiguration(
                        repositoryRoot
                    ),
                    "../outside-result.json"
                ),
                /Path escapes the repository boundary/
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
