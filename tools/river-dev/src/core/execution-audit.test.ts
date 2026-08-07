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
    RiverDevPackageExecutionResult
} from "./package-executor";

import {
    createExecutionAuditId,
    createExecutionAuditRecord,
    createExecutionAuditRepositoryPath,
    persistExecutionAudit,
    prepareExecutionAudit,
    serializeExecutionAuditRecord
} from "./execution-audit";


function createExecutionResult(
    mode:
        "dry-run" |
        "apply" =
            "dry-run"
): RiverDevPackageExecutionResult {

    const applied =
        mode ===
        "apply";

    return {
        packageId:
            "execution-package:implementation:proposal:intent:dev-15-example",

        mode,

        explicitApplyAuthorized:
            applied,

        implementation:
            {
                version:
                    "1.0.0",

                implementationId:
                    "implementation:proposal:intent:dev-15-example",

                planId:
                    "plan:dev-15-example",

                branch:
                    "dev-15-execution-audit-record",

                mode,

                applied,

                operationCount:
                    1,

                operations: [
                    {
                        index:
                            0,

                        type:
                            "write-file",

                        path:
                            "generated/dev-15-example.ts",

                        status:
                            applied
                                ? "applied"
                                : "validated",

                        message:
                            applied
                                ? "File written."
                                : "File validated."
                    }
                ],

                warnings:
                    []
            }
    };

}


test(
    "creates a deterministic execution audit identifier",
    () => {

        const auditId =
            createExecutionAuditId(
                createExecutionResult(),
                "2026-08-06T23:30:00.000Z"
            );

        assert.equal(
            auditId,
            "execution-audit:execution-package-implementation-proposal-intent-dev-15-example:dry-run:2026-08-06t23-30-00.000z"
        );

    }
);


test(
    "creates a deterministic audit repository path",
    () => {

        const repositoryPath =
            createExecutionAuditRepositoryPath(
                ".river-dev/execution-audits",
                "execution-audit:example"
            );

        assert.equal(
            repositoryPath,
            ".river-dev/execution-audits/execution-audit-example.json"
        );

    }
);


test(
    "normalizes Windows audit roots",
    () => {

        const repositoryPath =
            createExecutionAuditRepositoryPath(
                ".river-dev\\execution-audits\\",
                "execution-audit:example"
            );

        assert.equal(
            repositoryPath,
            ".river-dev/execution-audits/execution-audit-example.json"
        );

    }
);


test(
    "rejects empty audit roots",
    () => {

        assert.throws(
            () => {
                createExecutionAuditRepositoryPath(
                    "   ",
                    "execution-audit:example"
                );
            },
            /audit root cannot be empty/
        );

    }
);


test(
    "creates a dry-run audit record",
    () => {

        const auditRecord =
            createExecutionAuditRecord(
                createExecutionResult(
                    "dry-run"
                ),
                "2026-08-06T23:30:00.000Z"
            );

        assert.equal(
            auditRecord.mode,
            "dry-run"
        );

        assert.equal(
            auditRecord.applied,
            false
        );

        assert.equal(
            auditRecord.explicitApplyAuthorized,
            false
        );

        assert.equal(
            auditRecord.writesPerformed,
            false
        );

        assert.equal(
            auditRecord.operationCount,
            1
        );

    }
);


test(
    "creates an apply audit record",
    () => {

        const auditRecord =
            createExecutionAuditRecord(
                createExecutionResult(
                    "apply"
                ),
                "2026-08-06T23:31:00.000Z"
            );

        assert.equal(
            auditRecord.mode,
            "apply"
        );

        assert.equal(
            auditRecord.applied,
            true
        );

        assert.equal(
            auditRecord.explicitApplyAuthorized,
            true
        );

        assert.equal(
            auditRecord.writesPerformed,
            true
        );

    }
);


test(
    "rejects unauthorized apply results",
    () => {

        const originalResult =
            createExecutionResult(
                "apply"
            );

        const executionResult:
            RiverDevPackageExecutionResult =
            {
                ...originalResult,

                explicitApplyAuthorized:
                    false
            };

        assert.throws(
            () => {
                createExecutionAuditRecord(
                    executionResult,
                    "2026-08-06T23:32:00.000Z"
                );
            },
            /requires explicit authorization/
        );

    }
);


test(
    "rejects mismatched operation counts",
    () => {

        const originalResult =
            createExecutionResult();

        const executionResult:
            RiverDevPackageExecutionResult =
            {
                ...originalResult,

                implementation:
                    {
                        ...originalResult.implementation,

                        operationCount:
                            2
                    }
            };

        assert.throws(
            () => {
                createExecutionAuditRecord(
                    executionResult,
                    "2026-08-06T23:33:00.000Z"
                );
            },
            /operation count does not match/
        );

    }
);


test(
    "serializes execution audit records deterministically",
    () => {

        const auditRecord =
            createExecutionAuditRecord(
                createExecutionResult(),
                "2026-08-06T23:34:00.000Z"
            );

        const first =
            serializeExecutionAuditRecord(
                auditRecord
            );

        const second =
            serializeExecutionAuditRecord(
                auditRecord
            );

        assert.equal(
            first,
            second
        );

        assert.equal(
            first.endsWith(
                "\n"
            ),
            true
        );

    }
);


test(
    "prepares deterministic audit persistence",
    () => {

        const request = {
            repositoryRoot:
                "C:\\repository",

            auditRoot:
                ".river-dev/execution-audits",

            executionResult:
                createExecutionResult(),

            executedAt:
                "2026-08-06T23:35:00.000Z"
        };

        const first =
            prepareExecutionAudit(
                request
            );

        const second =
            prepareExecutionAudit(
                request
            );

        assert.deepEqual(
            first,
            second
        );

        assert.equal(
            first.implementationWritesPerformed,
            false
        );

    }
);


test(
    "persists an execution audit immutably",
    async () => {

        const repositoryRoot =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-dev-execution-audit-"
                )
            );

        try {

            const preparation =
                prepareExecutionAudit(
                    {
                        repositoryRoot,

                        auditRoot:
                            ".river-dev/execution-audits",

                        executionResult:
                            createExecutionResult(),

                        executedAt:
                            "2026-08-06T23:36:00.000Z"
                    }
                );

            const result =
                await persistExecutionAudit(
                    preparation
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

            assert.equal(
                content,
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
    "blocks execution audit overwrites",
    async () => {

        const repositoryRoot =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-dev-execution-audit-overwrite-"
                )
            );

        try {

            const preparation =
                prepareExecutionAudit(
                    {
                        repositoryRoot,

                        auditRoot:
                            ".river-dev/execution-audits",

                        executionResult:
                            createExecutionResult(),

                        executedAt:
                            "2026-08-06T23:37:00.000Z"
                    }
                );

            await persistExecutionAudit(
                preparation
            );

            await assert.rejects(
                persistExecutionAudit(
                    preparation
                ),
                /Execution audit already exists/
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

