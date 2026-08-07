import {
    createHash
} from "node:crypto";

import type {
    RiverDevRepositorySnapshot
} from "../types";


export const RIVER_DEV_SESSION_VERSION =
    "1.0.0" as const;


export type RiverDevSessionStatus =
    | "active"
    | "blocked"
    | "repairing"
    | "ready-to-resume"
    | "completed"
    | "failed";


export type RiverDevSessionLifecycleStep =
    | "context"
    | "specification"
    | "scope-validation"
    | "planning"
    | "proposal"
    | "manifest"
    | "artifact-generation"
    | "execution-package"
    | "execution"
    | "audit"
    | "review"
    | "verification"
    | "repair"
    | "commit-preparation"
    | "approval"
    | "completed";


export type RiverDevValidationStatus =
    | "pending"
    | "passed"
    | "failed"
    | "blocked";


export interface RiverDevSessionValidationState {

    readonly tests:
        RiverDevValidationStatus;

    readonly typecheck:
        RiverDevValidationStatus;

    readonly review:
        RiverDevValidationStatus;

    readonly qualityGates:
        RiverDevValidationStatus;

}


export interface RiverDevSessionRepairAttempt {

    readonly attempt:
        number;

    readonly reason:
        string;

    readonly outcome:
        "pending" |
        "repaired" |
        "failed";

    readonly recordedAt:
        string;

}


export interface RiverDevSessionResumeState {

    readonly resumable:
        boolean;

    readonly reason:
        string;

    readonly expectedBranch:
        string;

    readonly expectedCommit:
        string;

}


export interface RiverDevSessionState {

    readonly version:
        typeof RIVER_DEV_SESSION_VERSION;

    readonly sessionId:
        string;

    readonly phase:
        string;

    readonly specificationPath:
        string;

    readonly planId:
        string |
        null;

    readonly executionPackageId:
        string |
        null;

    readonly auditId:
        string |
        null;

    readonly currentStep:
        RiverDevSessionLifecycleStep;

    readonly status:
        RiverDevSessionStatus;

    readonly startedAt:
        string;

    readonly updatedAt:
        string;

    readonly repository:
        RiverDevRepositorySnapshot;

    readonly validation:
        RiverDevSessionValidationState;

    readonly repairHistory:
        readonly RiverDevSessionRepairAttempt[];

    readonly resume:
        RiverDevSessionResumeState;

}


export interface CreateRiverDevSessionInput {

    readonly phase:
        string;

    readonly specificationPath:
        string;

    readonly repository:
        RiverDevRepositorySnapshot;

    readonly startedAt:
        string;

    readonly planId?:
        string |
        null;

}


export interface RiverDevResumeEvaluation {

    readonly resumable:
        boolean;

    readonly reason:
        string;

}


function assertNonEmptyString(
    value: string,
    label: string
): void {

    if (
        value.trim().length ===
        0
    ) {
        throw new TypeError(
            `${label} cannot be empty.`
        );
    }

}


function createSessionIdentifier(
    input:
        CreateRiverDevSessionInput
): string {

    const source =
        JSON.stringify({
            version:
                RIVER_DEV_SESSION_VERSION,
            phase:
                input.phase,
            specificationPath:
                input.specificationPath,
            branch:
                input.repository.branch,
            commit:
                input.repository.commit,
            startedAt:
                input.startedAt
        });

    const digest =
        createHash(
            "sha256"
        )
            .update(
                source
            )
            .digest(
                "hex"
            )
            .slice(
                0,
                24
            );

    return `session:${digest}`;

}


export function createRiverDevSession(
    input:
        CreateRiverDevSessionInput
): RiverDevSessionState {

    assertNonEmptyString(
        input.phase,
        "Session phase"
    );

    assertNonEmptyString(
        input.specificationPath,
        "Session specification path"
    );

    assertNonEmptyString(
        input.repository.branch,
        "Session repository branch"
    );

    assertNonEmptyString(
        input.repository.commit,
        "Session repository commit"
    );

    assertNonEmptyString(
        input.startedAt,
        "Session start timestamp"
    );

    return {

        version:
            RIVER_DEV_SESSION_VERSION,

        sessionId:
            createSessionIdentifier(
                input
            ),

        phase:
            input.phase,

        specificationPath:
            input.specificationPath,

        planId:
            input.planId ??
            null,

        executionPackageId:
            null,

        auditId:
            null,

        currentStep:
            "context",

        status:
            "active",

        startedAt:
            input.startedAt,

        updatedAt:
            input.startedAt,

        repository:
            input.repository,

        validation: {
            tests:
                "pending",
            typecheck:
                "pending",
            review:
                "pending",
            qualityGates:
                "pending"
        },

        repairHistory:
            [],

        resume: {
            resumable:
                true,
            reason:
                "Session repository context is unchanged.",
            expectedBranch:
                input.repository.branch,
            expectedCommit:
                input.repository.commit
        }

    };

}


export function updateRiverDevSessionProgress(
    session:
        RiverDevSessionState,
    update: {
        readonly currentStep?:
            RiverDevSessionLifecycleStep;
        readonly status?:
            RiverDevSessionStatus;
        readonly planId?:
            string |
            null;
        readonly executionPackageId?:
            string |
            null;
        readonly auditId?:
            string |
            null;
        readonly validation?:
            Partial<RiverDevSessionValidationState>;
        readonly updatedAt:
            string;
    }
): RiverDevSessionState {

    assertNonEmptyString(
        update.updatedAt,
        "Session update timestamp"
    );

    return {

        ...session,

        planId:
            update.planId ===
            undefined
                ? session.planId
                : update.planId,

        executionPackageId:
            update.executionPackageId ===
            undefined
                ? session.executionPackageId
                : update.executionPackageId,

        auditId:
            update.auditId ===
            undefined
                ? session.auditId
                : update.auditId,

        currentStep:
            update.currentStep ??
            session.currentStep,

        status:
            update.status ??
            session.status,

        updatedAt:
            update.updatedAt,

        validation: {
            ...session.validation,
            ...update.validation
        }

    };

}


export function recordRiverDevSessionRepair(
    session:
        RiverDevSessionState,
    repair: {
        readonly reason:
            string;
        readonly outcome:
            RiverDevSessionRepairAttempt["outcome"];
        readonly recordedAt:
            string;
    }
): RiverDevSessionState {

    assertNonEmptyString(
        repair.reason,
        "Repair reason"
    );

    assertNonEmptyString(
        repair.recordedAt,
        "Repair timestamp"
    );

    const attempt:
        RiverDevSessionRepairAttempt = {

        attempt:
            session.repairHistory.length +
            1,

        reason:
            repair.reason,

        outcome:
            repair.outcome,

        recordedAt:
            repair.recordedAt

    };

    return {

        ...session,

        status:
            repair.outcome ===
            "pending"
                ? "repairing"
                : session.status,

        updatedAt:
            repair.recordedAt,

        repairHistory: [
            ...session.repairHistory,
            attempt
        ]

    };

}


export function evaluateRiverDevSessionResume(
    session:
        RiverDevSessionState,
    repository:
        RiverDevRepositorySnapshot
): RiverDevResumeEvaluation {

    if (
        session.status ===
        "completed"
    ) {
        return {
            resumable:
                false,
            reason:
                "Completed River Dev sessions cannot be resumed."
        };
    }

    if (
        repository.branch !==
        session.resume.expectedBranch
    ) {
        return {
            resumable:
                false,
            reason:
                `Repository branch mismatch. Expected ${session.resume.expectedBranch} but found ${repository.branch}.`
        };
    }

    if (
        repository.commit !==
        session.resume.expectedCommit
    ) {
        return {
            resumable:
                false,
            reason:
                `Repository commit mismatch. Expected ${session.resume.expectedCommit} but found ${repository.commit}.`
        };
    }

    return {
        resumable:
            true,
        reason:
            "Session repository context matches and is safe to resume."
    };

}


export function completeRiverDevSession(
    session:
        RiverDevSessionState,
    completedAt:
        string
): RiverDevSessionState {

    assertNonEmptyString(
        completedAt,
        "Session completion timestamp"
    );

    return {

        ...session,

        currentStep:
            "completed",

        status:
            "completed",

        updatedAt:
            completedAt,

        resume: {
            ...session.resume,
            resumable:
                false,
            reason:
                "Session is complete."
        }

    };

}
