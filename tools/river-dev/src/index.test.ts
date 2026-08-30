import assert from "node:assert/strict";
import test from "node:test";

import {
    resolve
} from "node:path";

import {
    loadRiverDevConfiguration
} from "./core/config";

import {
    createRiverDevPolicyEngine
} from "./safety/policy";

import {
    captureRepositorySnapshot,
    getChangedPaths,
    getCurrentBranch,
    getLatestCommit
} from "./git/repository";

import {
    formatInspectionReport,
    inspectRepository
} from "./commands/inspect";


const repositoryRoot =
    resolve(
        import.meta.dirname,
        "..",
        "..",
        ".."
    );


test(
    "loads the River Dev configuration",
    async () => {

        const configuration =
            await loadRiverDevConfiguration(
                repositoryRoot
            );

        assert.equal(
            configuration
                .projectMap
                .project
                .name,
            "The River Kept Flowing"
        );

        assert.equal(
            configuration
                .safetyPolicy
                .git
                .allowPush,
            false
        );

    }
);


test(
    "allows paths inside the repository",
    async () => {

        const configuration =
            await loadRiverDevConfiguration(
                repositoryRoot
            );

        const policy =
            createRiverDevPolicyEngine(
                configuration
            );

        assert.doesNotThrow(
            () => {
                policy.assertRepositoryPath(
                    "src/lib/knowledge"
                );
            }
        );

    }
);


test(
    "rejects paths outside the repository",
    async () => {

        const configuration =
            await loadRiverDevConfiguration(
                repositoryRoot
            );

        const policy =
            createRiverDevPolicyEngine(
                configuration
            );

        assert.throws(
            () => {
                policy.assertRepositoryPath(
                    "../outside"
                );
            },
            TypeError
        );

    }
);


test(
    "rejects protected paths",
    async () => {

        const configuration =
            await loadRiverDevConfiguration(
                repositoryRoot
            );

        const policy =
            createRiverDevPolicyEngine(
                configuration
            );

        assert.throws(
            () => {
                policy.assertPathIsNotProtected(
                    ".env"
                );
            },
            TypeError
        );

        assert.throws(
            () => {
                policy.assertPathIsNotProtected(
                    ".git/config"
                );
            },
            TypeError
        );

    }
);


test(
    "allows approved commands",
    async () => {

        const configuration =
            await loadRiverDevConfiguration(
                repositoryRoot
            );

        const policy =
            createRiverDevPolicyEngine(
                configuration
            );

        assert.doesNotThrow(
            () => {
                policy.assertCommandIsAllowed(
                    "npm",
                    [
                        "run",
                        "typecheck"
                    ]
                );
            }
        );

    }
);


test(
    "rejects prohibited commands",
    async () => {

        const configuration =
            await loadRiverDevConfiguration(
                repositoryRoot
            );

        const policy =
            createRiverDevPolicyEngine(
                configuration
            );

        assert.throws(
            () => {
                policy.assertCommandIsAllowed(
                    "git",
                    [
                        "push"
                    ]
                );
            },
            TypeError
        );

        assert.throws(
            () => {
                policy.assertCommandIsAllowed(
                    "curl",
                    [
                        "https://example.com"
                    ]
                );
            },
            TypeError
        );

    }
);


test(
    "reads current Git branch",
    async () => {

        const branch =
            await getCurrentBranch(
                repositoryRoot
            );

        const independentlyReadBranch =
            await getCurrentBranch(
                repositoryRoot
            );

        assert.equal(
            branch.length > 0,
            true
        );

        assert.equal(
            branch,
            independentlyReadBranch
        );

    }
);


test(
    "reads current Git commit",
    async () => {

        const commit =
            await getLatestCommit(
                repositoryRoot
            );

        assert.match(
            commit,
            /^[0-9a-f]{40}$/i
        );

    }
);


test(
    "reads changed repository paths",
    async () => {

        const changedPaths =
            await getChangedPaths(
                repositoryRoot
            );

        assert.equal(
            Array.isArray(
                changedPaths
            ),
            true
        );

        assert.deepEqual(
            changedPaths,
            [
                ...changedPaths
            ].sort()
        );

        for (
            const path of
            changedPaths
        ) {

            assert.equal(
                path.includes(
                    "\\"
                ),
                false
            );

            assert.equal(
                path.trim().length >
                    0,
                true
            );

        }

    }
);


test(
    "captures a repository snapshot",
    async () => {

        const capturedAt =
            "2026-08-06T01:30:00.000Z";

        const snapshot =
            await captureRepositorySnapshot(
                repositoryRoot,
                capturedAt
            );

        const currentBranch =
            await getCurrentBranch(
                repositoryRoot
            );

        assert.equal(
            snapshot.branch,
            currentBranch
        );

        assert.equal(
            snapshot.clean,
            (await getChangedPaths(repositoryRoot)).length === 0
        );

        assert.equal(
            snapshot.capturedAt,
            capturedAt
        );

    }
);


test(
    "creates a River Dev inspection report",
    async () => {

        const configuration =
            await loadRiverDevConfiguration(
                repositoryRoot
            );

        const report =
            await inspectRepository(
                configuration,
                "2026-08-06T01:31:00.000Z"
            );

        assert.equal(
            report.project,
            "The River Kept Flowing"
        );

        assert.equal(
            report.policy
                .autonomousPushAllowed,
            false
        );

        assert.ok(
            report.policy
                .requiredQualityGates
                .includes(
                    "typecheck"
                )
        );

    }
);


test(
    "formats a River Dev inspection report",
    async () => {

        const configuration =
            await loadRiverDevConfiguration(
                repositoryRoot
            );

        const report =
            await inspectRepository(
                configuration,
                "2026-08-06T01:32:00.000Z"
            );

        const formatted =
            formatInspectionReport(
                report
            );

        assert.match(
            formatted,
            /River Development Agent Inspection/
        );

        assert.match(
            formatted,
            /Autonomous push allowed: false/
        );

        assert.match(
            formatted,
            new RegExp(`Changed paths: ${report.repository.changedPaths.length}`)
        );

        if (report.repository.changedPaths.length === 0) {
            assert.doesNotMatch(
                formatted,
                /Changed files:/
            );
        } else {
            assert.match(
                formatted,
                /Changed files:/
            );
        }

    }
);
