import assert from "node:assert/strict";
import test from "node:test";

import {
    mkdtemp,
    rm
} from "node:fs/promises";

import {
    tmpdir
} from "node:os";

import {
    join
} from "node:path";

import {
    loadRiverDevConfiguration
} from "../core/config";

import {
    captureRepositorySnapshot
} from "../git/repository";

import {
    createRiverDevRun,
    createRiverDevRunId,
    updateRiverDevRun
} from "../state/lifecycle";

import {
    createRiverDevStateStore
} from "../state/store";

import {
    formatResumeReport,
    resumeRiverDev
} from "./resume";


test(
    "creates deterministic River Dev run identifiers",
    async () => {

        const repositoryRoot =
            process.cwd();

        const snapshot =
            await captureRepositorySnapshot(
                repositoryRoot,
                "2026-08-06T13:50:00.000Z"
            );

        const first =
            createRiverDevRunId(
                "inspect",
                snapshot,
                "2026-08-06T13:50:00.000Z"
            );

        const second =
            createRiverDevRunId(
                "inspect",
                snapshot,
                "2026-08-06T13:50:00.000Z"
            );

        assert.equal(
            first,
            second
        );

        assert.match(
            first,
            /^run:[0-9a-f]{24}$/
        );

    }
);


test(
    "creates and updates River Dev runs",
    async () => {

        const repositoryRoot =
            process.cwd();

        const snapshot =
            await captureRepositorySnapshot(
                repositoryRoot,
                "2026-08-06T13:51:00.000Z"
            );

        const run =
            createRiverDevRun(
                "inspect",
                "inspecting",
                snapshot,
                "2026-08-06T13:51:00.000Z"
            );

        const updated =
            updateRiverDevRun(
                run,
                "completed",
                "2026-08-06T13:52:00.000Z",
                "Inspection completed."
            );

        assert.equal(
            updated.status,
            "completed"
        );

        assert.equal(
            updated.messages[0],
            "Inspection completed."
        );

    }
);


test(
    "reports no active run from an empty store",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-dev-resume-"
                )
            );

        try {

            const configuration =
                await loadRiverDevConfiguration(
                    process.cwd()
                );

            const temporaryConfiguration = {

                ...configuration,

                repositoryRoot:
                    root

            };

            const report =
                await resumeRiverDev(
                    temporaryConfiguration
                );

            assert.equal(
                report.hasActiveRun,
                false
            );

            assert.equal(
                report.activeRun,
                null
            );

        }
        finally {

            await rm(
                root,
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
    "reports an active resumable run",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-dev-resume-"
                )
            );

        try {

            const configuration =
                await loadRiverDevConfiguration(
                    process.cwd()
                );

            const temporaryConfiguration = {

                ...configuration,

                repositoryRoot:
                    root

            };

            const snapshot = {

                repositoryRoot:
                    root,

                branch:
                    "dev-test",

                commit:
                    "1234567890123456789012345678901234567890",

                clean:
                    true,

                changedPaths:
                    [],

                capturedAt:
                    "2026-08-06T13:53:00.000Z"

            } as const;

            const run =
                createRiverDevRun(
                    "plan",
                    "planning",
                    snapshot,
                    "2026-08-06T13:53:00.000Z",
                    [
                        "Plan started."
                    ]
                );

            const store =
                createRiverDevStateStore(
                    root
                );

            await store.beginRun(
                run
            );

            const report =
                await resumeRiverDev(
                    temporaryConfiguration
                );

            assert.equal(
                report.hasActiveRun,
                true
            );

            assert.equal(
                report.activeRun?.runId,
                run.runId
            );

            assert.match(
                formatResumeReport(
                    report
                ),
                /Plan started/
            );

        }
        finally {

            await rm(
                root,
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
