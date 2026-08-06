import type {
    RiverDevConfiguration,
    RiverDevRunState,
    RiverDevStoredState
} from "../types";

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

    readonly message:
        string;

}


export async function resumeRiverDev(
    configuration:
        RiverDevConfiguration
): Promise<RiverDevResumeReport> {

    const store =
        createRiverDevStateStore(
            configuration.repositoryRoot
        );

    const state:
        RiverDevStoredState =
        await store.load();

    if (
        state.activeRun ===
        null
    ) {

        return {

            hasActiveRun:
                false,

            activeRun:
                null,

            completedRunCount:
                state.completedRuns.length,

            message:
                "No active River Dev run exists."

        };

    }

    return {

        hasActiveRun:
            true,

        activeRun:
            state.activeRun,

        completedRunCount:
            state.completedRuns.length,

        message:
            `Active run ${state.activeRun.runId} is ready to resume.`

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

    return lines.join(
        "\n"
    );

}
