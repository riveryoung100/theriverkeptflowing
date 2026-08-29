import { strict as assert } from "node:assert";
import {
    mkdtemp,
    readFile,
    rm
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
    loadRiverDevConfiguration
} from "../core/config";

import type {
    RiverDevConfiguration
} from "../types";

import type {
    RiverDevVerificationResult
} from "../execution/verification";

import {
    createExecutionVerificationMetadata,
    createExecutionVerificationRepositoryPath,
    persistExecutionVerificationRiverDev
} from "./persist-execution-verification";


async function withTemporaryRepository(
    callback: (configuration: RiverDevConfiguration) => Promise<void>
): Promise<void> {

    const repositoryRoot =
        await mkdtemp(
            join(
                tmpdir(),
                "river-dev-execution-verification-"
            )
        );

    try {
        const baseConfiguration =
            await loadRiverDevConfiguration(
                process.cwd()
            );

        await callback(
            {
                ...baseConfiguration,
                repositoryRoot
            }
        );
    }
    finally {
        await rm(
            repositoryRoot,
            {
                recursive: true,
                force: true
            }
        );
    }

}


function createVerificationResult(
    passed: boolean = true
): RiverDevVerificationResult {

    return {
        version: "1.0.0",
        verificationId: "verification:dev-332:test",
        branch: "dev-332-test",
        passed,
        requiredCommandsPassed: passed,
        commandCount: 2,
        commands: [
            {
                name: "typecheck",
                executable: "npm",
                arguments: ["run", "typecheck"],
                required: true,
                passed,
                exitCode: passed ? 0 : 1,
                stdout: passed ? "typecheck passed" : "",
                stderr: passed ? "" : "typecheck failed",
                durationMilliseconds: 10
            },
            {
                name: "tests",
                executable: "npm",
                arguments: ["test"],
                required: true,
                passed,
                exitCode: passed ? 0 : 1,
                stdout: passed ? "tests passed" : "",
                stderr: passed ? "" : "tests failed",
                durationMilliseconds: 20
            }
        ],
        warnings: [
            "fixture warning"
        ]
    };

}


test(
    "materializes and immutably persists authoritative successful verification evidence",
    async () => {

        await withTemporaryRepository(
            async (configuration) => {
                const result =
                    createVerificationResult(
                        true
                    );

                const persisted =
                    await persistExecutionVerificationRiverDev(
                        configuration,
                        result,
                        "2026-08-29T20:00:00.000Z"
                    );

                assert.equal(
                    persisted.persisted,
                    true
                );
                assert.equal(
                    persisted.implementationWritesPerformed,
                    false
                );
                assert.equal(
                    persisted.repositoryPath,
                    ".river-dev/execution-verifications/verification-dev-332-test.json"
                );
                assert.equal(
                    persisted.verification.verificationId,
                    result.verificationId
                );
                assert.equal(
                    persisted.verification.passed,
                    result.passed
                );
                assert.deepEqual(
                    persisted.verification.commands,
                    ["typecheck", "tests"]
                );
                assert.deepEqual(
                    persisted.verification.warnings,
                    result.warnings
                );

                const stored =
                    JSON.parse(
                        await readFile(
                            persisted.absolutePath,
                            "utf8"
                        )
                    );

                assert.deepEqual(
                    stored,
                    persisted.verification
                );
            }
        );
    }
);


test(
    "preserves failed authoritative verification without manufacturing pass state",
    async () => {

        await withTemporaryRepository(
            async (configuration) => {
                const result =
                    createVerificationResult(
                        false
                    );

                const persisted =
                    await persistExecutionVerificationRiverDev(
                        configuration,
                        result,
                        "2026-08-29T20:01:00.000Z"
                    );

                assert.equal(
                    persisted.verification.passed,
                    false
                );
                assert.deepEqual(
                    persisted.verification.commands,
                    ["typecheck", "tests"]
                );
            }
        );
    }
);


test(
    "derives deterministic metadata and repository path from authoritative evidence",
    () => {
        const result =
            createVerificationResult(
                true
            );

        const first =
            createExecutionVerificationMetadata(
                result,
                "2026-08-29T20:02:00.000Z"
            );

        const second =
            createExecutionVerificationMetadata(
                result,
                "2026-08-29T20:02:00.000Z"
            );

        assert.deepEqual(
            first,
            second
        );
        assert.equal(
            createExecutionVerificationRepositoryPath(
                result.verificationId
            ),
            ".river-dev/execution-verifications/verification-dev-332-test.json"
        );
    }
);


test(
    "rejects repeated persistence for the same verification artifact",
    async () => {

        await withTemporaryRepository(
            async (configuration) => {
                const result =
                    createVerificationResult(
                        true
                    );

                await persistExecutionVerificationRiverDev(
                    configuration,
                    result,
                    "2026-08-29T20:03:00.000Z"
                );

                await assert.rejects(
                    persistExecutionVerificationRiverDev(
                        configuration,
                        result,
                        "2026-08-29T20:03:00.000Z"
                    )
                );
            }
        );
    }
);


test(
    "fails closed when authoritative verification evidence is internally inconsistent",
    () => {
        const result =
            createVerificationResult(
                true
            );

        const inconsistentCount: RiverDevVerificationResult =
            {
                ...result,
                commandCount: 1
            };

        assert.throws(
            () =>
                createExecutionVerificationMetadata(
                    inconsistentCount,
                    "2026-08-29T20:04:00.000Z"
                ),
            /command count is inconsistent/i
        );

        const inconsistentPass: RiverDevVerificationResult =
            {
                ...result,
                requiredCommandsPassed: false
            };

        assert.throws(
            () =>
                createExecutionVerificationMetadata(
                    inconsistentPass,
                    "2026-08-29T20:04:00.000Z"
                ),
            /pass state is inconsistent/i
        );
    }
);
