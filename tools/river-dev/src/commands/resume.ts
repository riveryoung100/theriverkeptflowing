import type {
    RiverDevConfiguration,
    RiverDevRepositorySnapshot,
    RiverDevRunState,
    RiverDevSessionState,
    RiverDevStoredState
} from "../types";

import {
    evaluateRiverDevSessionResume
} from "../core/session-state";

import {
    captureRepositorySnapshot
} from "../git/repository";

import {
    createRiverDevStateStore
} from "../state/store";


export interface RiverDevResumeReport {

    readonly hasActiveRun:
        boolean;

    readonly activeRun:
        RiverDevRunState |
        null;

    readonly completedRunCount:
        number;

    readonly hasActiveSession:
        boolean;

    readonly activeSession:
        RiverDevSessionState |
        null;

    readonly completedSessionCount:
        number;

    readonly sessionResumable:
        boolean;

    readonly sessionResumeReason:
        string |
        null;

    readonly message:
        string;

}


export async function resumeRiverDev(
    configuration:
        RiverDevConfiguration,
    repositorySnapshot?:
        RiverDevRepositorySnapshot
): Promise<RiverDevResumeReport> {

    const store =
        createRiverDevStateStore(
            configuration.repositoryRoot
        );

    const state:
        RiverDevStoredState =
        await store.load();

    let sessionResumable =
        false;

    let sessionResumeReason:
        string |
        null =
        null;

    if (
        state.activeSession !==
        null
    ) {

        const currentRepository =
            repositorySnapshot ??
            await captureRepositorySnapshot(
                configuration.repositoryRoot
            );

        const evaluation =
            evaluateRiverDevSessionResume(
                state.activeSession,
                currentRepository
            );

        sessionResumable =
            evaluation.resumable;

        sessionResumeReason =
            evaluation.reason;

    }

    let message:
        string;

    if (
        state.activeSession !==
        null
    ) {

        if (
            sessionResumable
        ) {
            message =
                `Active session ${state.activeSession.sessionId} is ready to resume from ${state.activeSession.currentStep}.`;
        }
        else {
            message =
                `Active session ${state.activeSession.sessionId} is blocked from resume: ${sessionResumeReason ?? "Unknown reason."}`;
        }

    }
    else if (
        state.activeRun !==
        null
    ) {

        message =
            `Active run ${state.activeRun.runId} is ready to resume.`;

    }
    else {

        message =
            "No active River Dev run exists.";

    }

    return {

        hasActiveRun:
            state.activeRun !==
            null,

        activeRun:
            state.activeRun,

        completedRunCount:
            state.completedRuns.length,

        hasActiveSession:
            state.activeSession !==
            null,

        activeSession:
            state.activeSession,

        completedSessionCount:
            state.completedSessions.length,

        sessionResumable,

        sessionResumeReason,

        message

    };

}


export function formatResumeReport(
    report:
        RiverDevResumeReport
): string {

    const lines = [

        "River Development Agent Resume",

        `Active run exists: ${report.hasActiveRun}`,

        `Completed runs: ${report.completedRunCount}`,

        `Active session exists: ${report.hasActiveSession}`,

        `Completed sessions: ${report.completedSessionCount}`,

        `Session resumable: ${report.sessionResumable}`,

        `Message: ${report.message}`

    ];

    if (
        report.activeRun !==
        null
    ) {

        lines.push(
            `Run ID: ${report.activeRun.runId}`,
            `Command: ${report.activeRun.command}`,
            `Status: ${report.activeRun.status}`,
            `Branch: ${report.activeRun.repository.branch}`,
            `Started: ${report.activeRun.startedAt}`,
            `Updated: ${report.activeRun.updatedAt}`
        );

        if (
            report.activeRun.messages.length >
            0
        ) {

            lines.push(
                "Run messages:"
            );

            for (
                const message of
                report.activeRun.messages
            ) {
                lines.push(
                    `- ${message}`
                );
            }

        }

    }

    if (
        report.activeSession !==
        null
    ) {

        lines.push(
            "Session:",
            `Session ID: ${report.activeSession.sessionId}`,
            `Phase: ${report.activeSession.phase}`,
            `Session status: ${report.activeSession.status}`,
            `Current step: ${report.activeSession.currentStep}`,
            `Specification: ${report.activeSession.specificationPath}`,
            `Plan ID: ${report.activeSession.planId ?? "none"}`,
            `Execution package ID: ${report.activeSession.executionPackageId ?? "none"}`,
            `Audit ID: ${report.activeSession.auditId ?? "none"}`,
            `Session branch: ${report.activeSession.repository.branch}`,
            `Session started: ${report.activeSession.startedAt}`,
            `Session updated: ${report.activeSession.updatedAt}`,
            `Resume reason: ${report.sessionResumeReason ?? report.activeSession.resume.reason}`
        );

        if (
            report.activeSession.repairHistory.length >
            0
        ) {

            lines.push(
                "Repair history:"
            );

            for (
                const repair of
                report.activeSession.repairHistory
            ) {
                lines.push(
                    `- Attempt ${repair.attempt}: ${repair.outcome} — ${repair.reason}`
                );
            }

        }

    }

    return lines.join(
        "\n"
    );

}
