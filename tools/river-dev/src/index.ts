import {
    loadRiverDevConfiguration
} from "./core/config";

import {
    formatInspectionReport,
    runTrackedInspection
} from "./commands/inspect";

import {
    formatImplementationResult,
    getDefaultImplementationManifestPath,
    implementRiverDevPlan
} from "./commands/implement";

import {
    formatImplementationPlan,
    getDefaultSpecificationPath,
    planRiverDevPhase
} from "./commands/plan";

import {
    formatResumeReport,
    resumeRiverDev
} from "./commands/resume";

import type {
    RiverDevCommandName
} from "./types";


function parseCommand(
    value:
        string |
        undefined
): RiverDevCommandName {

    switch (value) {

        case "inspect":
        case "plan":
        case "implement":
        case "verify":
        case "review":
        case "commit":
        case "resume":
            return value;

        default:
            throw new TypeError(
                `Unknown River Dev command: ${value ?? "(missing)"}`
            );

    }

}


async function run(): Promise<void> {

    const command =
        parseCommand(
            process.argv[2]
        );

    const configuration =
        await loadRiverDevConfiguration(
            process.cwd()
        );

    switch (command) {

        case "inspect": {

            const report =
                await runTrackedInspection(
                    configuration
                );

            process.stdout.write(
                `${formatInspectionReport(report)}\n`
            );

            return;

        }

        case "plan": {

            const specificationPath =
                process.argv[3] ??
                getDefaultSpecificationPath(
                    configuration
                );

            const plan =
                await planRiverDevPhase(
                    configuration,
                    specificationPath
                );

            process.stdout.write(
                `${formatImplementationPlan(plan)}\n`
            );

            return;

        }

        case "implement": {

            const manifestPath =
                process.argv[3] ??
                getDefaultImplementationManifestPath(
                    configuration
                );

            const mode =
                process.argv.includes(
                    "--apply"
                )
                    ? "apply" as const
                    : "dry-run" as const;

            const result =
                await implementRiverDevPlan(
                    configuration,
                    manifestPath,
                    mode
                );

            process.stdout.write(
                `${formatImplementationResult(result)}\n`
            );

            return;

        }

        case "resume": {

            const report =
                await resumeRiverDev(
                    configuration
                );

            process.stdout.write(
                `${formatResumeReport(report)}\n`
            );

            return;

        }

        case "verify":
        case "review":
        case "commit":
            throw new TypeError(
                `River Dev command is not implemented yet: ${command}`
            );

    }

}


run().catch(
    (error: unknown) => {

        const message =
            error instanceof Error
                ? error.message
                : String(
                    error
                );

        process.stderr.write(
            `River Dev failed: ${message}\n`
        );

        process.exitCode =
            1;

    }
);
