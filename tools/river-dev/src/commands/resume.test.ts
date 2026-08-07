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
    createRiverDevSession,
    updateRiverDevSessionProgress
} from "../core/session-state";

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

            assert.equal(
                report.hasActiveSession,
                false
            );

            assert.equal(
                report.activeSession,
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


test(
    "reports an active session as safely resumable when repository context matches",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-dev-session-resume-"
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
                    "dev-17-session-state-manager",

                commit:
                    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",

                clean:
                    true,

                changedPaths:
                    [],

                capturedAt:
                    "2026-08-07T14:50:00.000Z"

            } as const;

            const session =
                createRiverDevSession({
                    phase:
                        "DEV-17 Session State Manager",
                    specificationPath:
                        ".river-dev/specifications/dev-17-session-state-manager.json",
                    repository:
                        snapshot,
                    startedAt:
                        "2026-08-07T14:50:00.000Z",
                    planId:
                        "plan:dev-17-test"
                });

            const progressed =
                updateRiverDevSessionProgress(
                    session,
                    {
                        currentStep:
                            "verification",
                        status:
                            "ready-to-resume",
                        updatedAt:
                            "2026-08-07T14:51:00.000Z"
                    }
                );

            const store =
                createRiverDevStateStore(
                    root
                );

            await store.beginSession(
                progressed
            );

            const report =
                await resumeRiverDev(
                    temporaryConfiguration,
                    snapshot
                );

            assert.equal(
                report.hasActiveSession,
                true
            );

            assert.equal(
                report.sessionResumable,
                true
            );

            assert.equal(
                report.activeSession?.currentStep,
                "verification"
            );

            assert.match(
                report.message,
                /ready to resume from verification/
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
    "blocks session resume when branch does not match",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-dev-session-resume-"
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

            const originalSnapshot = {

                repositoryRoot:
                    root,

                branch:
                    "dev-17-session-state-manager",

                commit:
                    "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",

                clean:
                    true,

                changedPaths:
                    [],

                capturedAt:
                    "2026-08-07T14:52:00.000Z"

            } as const;

            const session =
                createRiverDevSession({
                    phase:
                        "DEV-17 Session State Manager",
                    specificationPath:
                        ".river-dev/specifications/dev-17-session-state-manager.json",
                    repository:
                        originalSnapshot,
                    startedAt:
                        "2026-08-07T14:52:00.000Z"
                });

            const store =
                createRiverDevStateStore(
                    root
                );

            await store.beginSession(
                session
            );

            const mismatchedSnapshot = {

                ...originalSnapshot,

                branch:
                    "main"

            };

            const report =
                await resumeRiverDev(
                    temporaryConfiguration,
                    mismatchedSnapshot
                );

            assert.equal(
                report.sessionResumable,
                false
            );

            assert.match(
                report.sessionResumeReason ?? "",
                /branch mismatch/
            );

            assert.match(
                report.message,
                /blocked from resume/
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
    "blocks session resume when commit does not match",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-dev-session-resume-"
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

            const originalSnapshot = {

                repositoryRoot:
                    root,

                branch:
                    "dev-17-session-state-manager",

                commit:
                    "cccccccccccccccccccccccccccccccccccccccc",

                clean:
                    true,

                changedPaths:
                    [],

                capturedAt:
                    "2026-08-07T14:53:00.000Z"

            } as const;

            const session =
                createRiverDevSession({
                    phase:
                        "DEV-17 Session State Manager",
                    specificationPath:
                        ".river-dev/specifications/dev-17-session-state-manager.json",
                    repository:
                        originalSnapshot,
                    startedAt:
                        "2026-08-07T14:53:00.000Z"
                });

            const store =
                createRiverDevStateStore(
                    root
                );

            await store.beginSession(
                session
            );

            const mismatchedSnapshot = {

                ...originalSnapshot,

                commit:
                    "dddddddddddddddddddddddddddddddddddddddd"

            };

            const report =
                await resumeRiverDev(
                    temporaryConfiguration,
                    mismatchedSnapshot
                );

            assert.equal(
                report.sessionResumable,
                false
            );

            assert.match(
                report.sessionResumeReason ?? "",
                /commit mismatch/
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
    "formats durable session recovery context",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-dev-session-resume-"
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
                    "dev-17-session-state-manager",

                commit:
                    "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",

                clean:
                    true,

                changedPaths:
                    [],

                capturedAt:
                    "2026-08-07T14:54:00.000Z"

            } as const;

            const session =
                createRiverDevSession({
                    phase:
                        "DEV-17 Session State Manager",
                    specificationPath:
                        ".river-dev/specifications/dev-17-session-state-manager.json",
                    repository:
                        snapshot,
                    startedAt:
                        "2026-08-07T14:54:00.000Z",
                    planId:
                        "plan:resume-format-test"
                });

            const progressed =
                updateRiverDevSessionProgress(
                    session,
                    {
                        currentStep:
                            "execution-package",
                        executionPackageId:
                            "execution-package:test",
                        auditId:
                            "audit:test",
                        updatedAt:
                            "2026-08-07T14:55:00.000Z"
                    }
                );

            const store =
                createRiverDevStateStore(
                    root
                );

            await store.beginSession(
                progressed
            );

            const report =
                await resumeRiverDev(
                    temporaryConfiguration,
                    snapshot
                );

            const formatted =
                formatResumeReport(
                    report
                );

            assert.match(
                formatted,
                /DEV-17 Session State Manager/
            );

            assert.match(
                formatted,
                /Current step: execution-package/
            );

            assert.match(
                formatted,
                /execution-package:test/
            );

            assert.match(
                formatted,
                /audit:test/
            );

            assert.match(
                formatted,
                /Session resumable: true/
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
