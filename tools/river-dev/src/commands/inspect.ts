import type {
    RiverDevConfiguration,
    RiverDevRepositorySnapshot
} from "../types";

import {
    captureRepositorySnapshot
} from "../git/repository";

import {
    createRiverDevRun
} from "../state/lifecycle";

import {
    createRiverDevStateStore
} from "../state/store";


export interface RiverDevInspectionReport {

    readonly project:
        string;

    readonly repository:
        RiverDevRepositorySnapshot;

    readonly policy: {

        readonly autonomousPushAllowed:
            boolean;

        readonly outsideRepositoryAllowed:
            boolean;

        readonly maximumRepairAttempts:
            number;

        readonly requiredQualityGates:
            readonly string[];

    };

    readonly paths:
        Readonly<Record<string, string>>;

}


export async function inspectRepository(
    configuration:
        RiverDevConfiguration,
    capturedAt?:
        string
): Promise<RiverDevInspectionReport> {

    const repository =
        await captureRepositorySnapshot(
            configuration.repositoryRoot,
            capturedAt
        );

    return {

        project:
            configuration
                .projectMap
                .project
                .name,

        repository,

        policy: {

            autonomousPushAllowed:
                configuration
                    .safetyPolicy
                    .git
                    .allowPush ===
                true,

            outsideRepositoryAllowed:
                configuration
                    .safetyPolicy
                    .repositoryBoundary
                    .allowOutsideRepository,

            maximumRepairAttempts:
                configuration
                    .safetyPolicy
                    .repairs
                    .maximumAttempts,

            requiredQualityGates:
                configuration
                    .qualityGates
                    .requiredBeforeCommit
                    .map(
                        (gate) => {
                            return gate.id;
                        }
                    )

        },

        paths:
            configuration
                .projectMap
                .paths

    };

}


export async function runTrackedInspection(
    configuration:
        RiverDevConfiguration,
    capturedAt:
        string = new Date()
            .toISOString()
): Promise<RiverDevInspectionReport> {

    const report =
        await inspectRepository(
            configuration,
            capturedAt
        );

    const store =
        createRiverDevStateStore(
            configuration.repositoryRoot
        );

    const existingState =
        await store.load();

    if (
        existingState.activeRun !==
        null
    ) {
        throw new TypeError(
            `Cannot begin inspection while run ${existingState.activeRun.runId} is active.`
        );
    }

    const inspectingRun =
        createRiverDevRun(
            "inspect",
            "inspecting",
            report.repository,
            capturedAt,
            [
                "Repository inspection started."
            ]
        );

    await store.beginRun(
        inspectingRun
    );

    const completedRun = {

        ...inspectingRun,

        status:
            "completed" as const,

        updatedAt:
            capturedAt,

        messages: [
            ...inspectingRun.messages,
            "Repository inspection completed."
        ]

    };

    await store.completeRun(
        completedRun
    );

    return report;

}


export function formatInspectionReport(
    report:
        RiverDevInspectionReport
): string {

    const lines = [

        "River Development Agent Inspection",

        `Project: ${report.project}`,

        `Repository: ${report.repository.repositoryRoot}`,

        `Branch: ${report.repository.branch}`,

        `Commit: ${report.repository.commit}`,

        `Working tree clean: ${report.repository.clean}`,

        `Changed paths: ${report.repository.changedPaths.length}`,

        `Autonomous push allowed: ${report.policy.autonomousPushAllowed}`,

        `Outside repository allowed: ${report.policy.outsideRepositoryAllowed}`,

        `Maximum repair attempts: ${report.policy.maximumRepairAttempts}`,

        `Required quality gates: ${report.policy.requiredQualityGates.join(", ")}`

    ];

    if (
        report.repository
            .changedPaths
            .length >
        0
    ) {

        lines.push(
            "Changed files:"
        );

        for (
            const path of
            report.repository
                .changedPaths
        ) {
            lines.push(
                `- ${path}`
            );
        }

    }

    return lines.join(
        "\n"
    );

}
