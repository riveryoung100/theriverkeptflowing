import test from "node:test";

import assert from "node:assert/strict";

import type {
    RiverDevRepositorySnapshot
} from "../types";

import {
    completeRiverDevSession,
    createRiverDevSession,
    evaluateRiverDevSessionResume,
    recordRiverDevSessionRepair,
    updateRiverDevSessionProgress
} from "./session-state";


function createRepositorySnapshot(
    overrides: Partial<RiverDevRepositorySnapshot> = {}
): RiverDevRepositorySnapshot {

    return {
        repositoryRoot:
            "C:/repo",
        branch:
            "dev-17-session-state-manager",
        commit:
            "abc123",
        clean:
            true,
        changedPaths:
            [],
        capturedAt:
            "2026-08-07T14:40:00.000Z",
        ...overrides
    };

}


test(
    "creates deterministic session identifiers",
    () => {

        const repository =
            createRepositorySnapshot();

        const input = {
            phase:
                "DEV-17 Session State Manager",
            specificationPath:
                ".river-dev/specifications/dev-17-session-state-manager.json",
            repository,
            startedAt:
                "2026-08-07T14:40:00.000Z",
            planId:
                "plan:test"
        };

        const first =
            createRiverDevSession(
                input
            );

        const second =
            createRiverDevSession(
                input
            );

        assert.equal(
            first.sessionId,
            second.sessionId
        );

    }
);


test(
    "creates the expected initial session state",
    () => {

        const repository =
            createRepositorySnapshot();

        const session =
            createRiverDevSession({
                phase:
                    "DEV-17 Session State Manager",
                specificationPath:
                    ".river-dev/specifications/dev-17-session-state-manager.json",
                repository,
                startedAt:
                    "2026-08-07T14:40:00.000Z",
                planId:
                    "plan:test"
            });

        assert.equal(
            session.phase,
            "DEV-17 Session State Manager"
        );

        assert.equal(
            session.currentStep,
            "context"
        );

        assert.equal(
            session.status,
            "active"
        );

        assert.equal(
            session.planId,
            "plan:test"
        );

        assert.equal(
            session.executionPackageId,
            null
        );

        assert.equal(
            session.auditId,
            null
        );

        assert.deepEqual(
            session.validation,
            {
                tests:
                    "pending",
                typecheck:
                    "pending",
                review:
                    "pending",
                qualityGates:
                    "pending"
            }
        );

        assert.equal(
            session.resume.resumable,
            true
        );

    }
);


test(
    "updates session progress without losing existing state",
    () => {

        const session =
            createRiverDevSession({
                phase:
                    "DEV-17 Session State Manager",
                specificationPath:
                    ".river-dev/specifications/dev-17-session-state-manager.json",
                repository:
                    createRepositorySnapshot(),
                startedAt:
                    "2026-08-07T14:40:00.000Z"
            });

        const updated =
            updateRiverDevSessionProgress(
                session,
                {
                    currentStep:
                        "verification",
                    status:
                        "ready-to-resume",
                    executionPackageId:
                        "execution-package:test",
                    auditId:
                        "audit:test",
                    validation: {
                        tests:
                            "passed",
                        typecheck:
                            "passed"
                    },
                    updatedAt:
                        "2026-08-07T14:41:00.000Z"
                }
            );

        assert.equal(
            updated.currentStep,
            "verification"
        );

        assert.equal(
            updated.status,
            "ready-to-resume"
        );

        assert.equal(
            updated.executionPackageId,
            "execution-package:test"
        );

        assert.equal(
            updated.auditId,
            "audit:test"
        );

        assert.equal(
            updated.validation.tests,
            "passed"
        );

        assert.equal(
            updated.validation.typecheck,
            "passed"
        );

        assert.equal(
            updated.validation.review,
            "pending"
        );

        assert.equal(
            updated.phase,
            session.phase
        );

    }
);


test(
    "records repair attempts sequentially",
    () => {

        const session =
            createRiverDevSession({
                phase:
                    "DEV-17 Session State Manager",
                specificationPath:
                    ".river-dev/specifications/dev-17-session-state-manager.json",
                repository:
                    createRepositorySnapshot(),
                startedAt:
                    "2026-08-07T14:40:00.000Z"
            });

        const first =
            recordRiverDevSessionRepair(
                session,
                {
                    reason:
                        "Typecheck failed.",
                    outcome:
                        "pending",
                    recordedAt:
                        "2026-08-07T14:41:00.000Z"
                }
            );

        const second =
            recordRiverDevSessionRepair(
                first,
                {
                    reason:
                        "Typecheck repaired.",
                    outcome:
                        "repaired",
                    recordedAt:
                        "2026-08-07T14:42:00.000Z"
                }
            );

        assert.equal(
            second.repairHistory.length,
            2
        );

        assert.equal(
            second.repairHistory[0]?.attempt,
            1
        );

        assert.equal(
            second.repairHistory[1]?.attempt,
            2
        );

        assert.equal(
            second.repairHistory[1]?.outcome,
            "repaired"
        );

    }
);


test(
    "allows resume when repository context matches",
    () => {

        const repository =
            createRepositorySnapshot();

        const session =
            createRiverDevSession({
                phase:
                    "DEV-17 Session State Manager",
                specificationPath:
                    ".river-dev/specifications/dev-17-session-state-manager.json",
                repository,
                startedAt:
                    "2026-08-07T14:40:00.000Z"
            });

        const evaluation =
            evaluateRiverDevSessionResume(
                session,
                repository
            );

        assert.equal(
            evaluation.resumable,
            true
        );

    }
);


test(
    "blocks resume when repository branch changes",
    () => {

        const session =
            createRiverDevSession({
                phase:
                    "DEV-17 Session State Manager",
                specificationPath:
                    ".river-dev/specifications/dev-17-session-state-manager.json",
                repository:
                    createRepositorySnapshot(),
                startedAt:
                    "2026-08-07T14:40:00.000Z"
            });

        const evaluation =
            evaluateRiverDevSessionResume(
                session,
                createRepositorySnapshot({
                    branch:
                        "main"
                })
            );

        assert.equal(
            evaluation.resumable,
            false
        );

        assert.match(
            evaluation.reason,
            /branch mismatch/
        );

    }
);


test(
    "blocks resume when repository commit changes",
    () => {

        const session =
            createRiverDevSession({
                phase:
                    "DEV-17 Session State Manager",
                specificationPath:
                    ".river-dev/specifications/dev-17-session-state-manager.json",
                repository:
                    createRepositorySnapshot(),
                startedAt:
                    "2026-08-07T14:40:00.000Z"
            });

        const evaluation =
            evaluateRiverDevSessionResume(
                session,
                createRepositorySnapshot({
                    commit:
                        "different-commit"
                })
            );

        assert.equal(
            evaluation.resumable,
            false
        );

        assert.match(
            evaluation.reason,
            /commit mismatch/
        );

    }
);


test(
    "completed sessions cannot be resumed",
    () => {

        const repository =
            createRepositorySnapshot();

        const session =
            createRiverDevSession({
                phase:
                    "DEV-17 Session State Manager",
                specificationPath:
                    ".river-dev/specifications/dev-17-session-state-manager.json",
                repository,
                startedAt:
                    "2026-08-07T14:40:00.000Z"
            });

        const completed =
            completeRiverDevSession(
                session,
                "2026-08-07T14:45:00.000Z"
            );

        assert.equal(
            completed.status,
            "completed"
        );

        assert.equal(
            completed.currentStep,
            "completed"
        );

        assert.equal(
            completed.resume.resumable,
            false
        );

        const evaluation =
            evaluateRiverDevSessionResume(
                completed,
                repository
            );

        assert.equal(
            evaluation.resumable,
            false
        );

    }
);
