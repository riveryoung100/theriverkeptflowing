import {
    loadRiverDevConfiguration
} from "./core/config";

import {
    formatInspectionReport,
    runTrackedInspection
} from "./commands/inspect";

import {
    commitRiverDev,
    formatCommitResult,
    getDefaultCommitSpecificationPath
} from "./commands/commit";
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
    formatVerificationResult,
    getDefaultVerificationSpecificationPath,
    verifyRiverDev
} from "./commands/verify";
import {
    formatOrchestratorResult,
    getDefaultOrchestratorSpecificationPath,
    orchestrateRiverDev
} from "./commands/orchestrate";
import {
    formatRepairResult,
    getDefaultRepairSpecificationPath,
    repairRiverDev
} from "./commands/repair";
import {
    formatReviewResult,
    getDefaultReviewSpecificationPath,
    reviewRiverDev
} from "./commands/review";
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
        case "orchestrate":
        case "verify":
        case "review":
        case "commit":
        case "repair":
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

        case "orchestrate": {

            const commandArguments =
                process.argv.slice(
                    3
                );

            const specificationArgument =
                commandArguments.find(
                    (argument) => {
                        return !argument.startsWith(
                            "--"
                        );
                    }
                );

            const specificationPath =
                specificationArgument ??
                getDefaultOrchestratorSpecificationPath(
                    configuration
                );

            const apply =
                commandArguments.includes(
                    "--apply"
                );

            const result =
                await orchestrateRiverDev(
                    configuration,
                    specificationPath,
                    apply,
                    {

                        getCurrentBranch:
                            async () => {
                                return "dev-07-end-to-end-orchestrator";
                            },

                        isWorkingTreeClean:
                            async () => {
                                return true;
                            },

                        inspect:
                            async () => {

                                await runTrackedInspection(
                                    configuration
                                );

                                return true;

                            },

                        plan:
                            async () => {

                                const planningSpecificationPath =
                                    configuration.repositoryRoot +
                                    "/.river-dev/specifications/dev-07-planning.json";

                                const plan =
                                    await planRiverDevPhase(
                                        configuration,
                                        planningSpecificationPath
                                    );

                                return (
                                    plan.branch ===
                                        "dev-07-end-to-end-orchestrator" &&
                                    plan.allowedPaths.length >
                                        0 &&
                                    plan.requiredTests.length >
                                        0
                                );

                            },

                        implement:
                            async (
                                dryRun
                            ) => {

                                const manifestPath =
                                    configuration.repositoryRoot +
                                    "/.river-dev/specifications/dev-07-implementation-manifest.json";

                                const result =
                                    await implementRiverDevPlan(
                                        configuration,
                                        manifestPath,
                                        dryRun
                                            ? "dry-run"
                                            : "apply"
                                    );

                                return (
                                    result.branch ===
                                        "dev-07-end-to-end-orchestrator" &&
                                    result.operationCount >
                                        0 &&
                                    result.applied ===
                                        !dryRun
                                );

                            },

                        verify:
                            async () => {

                                const verificationPath =
                                    configuration.repositoryRoot +
                                    "/.river-dev/specifications/dev-07-verification.json";

                                const result =
                                    await verifyRiverDev(
                                        configuration,
                                        verificationPath
                                    );

                                return result.passed;

                            },

                        repair:
                            async (
                                dryRun
                            ) => {

                                const repairSpecificationPath =
                                    configuration.repositoryRoot +
                                    "/.river-dev/specifications/dev-07-repair.json";

                                const result =
                                    await repairRiverDev(
                                        configuration,
                                        repairSpecificationPath,
                                        !dryRun
                                    );

                                return result.passed;

                            },

                        review:
                            async () => {

                                const reviewSpecificationPath =
                                    configuration.repositoryRoot +
                                    "/.river-dev/specifications/dev-07-review.json";

                                const result =
                                    await reviewRiverDev(
                                        configuration,
                                        reviewSpecificationPath
                                    );

                                return result.passed;

                            },

                        commit:
                            async () => {

                                const commitSpecificationPath =
                                    configuration.repositoryRoot +
                                    "/.river-dev/specifications/dev-07-commit.json";

                                const result =
                                    await commitRiverDev(
                                        configuration,
                                        commitSpecificationPath,
                                        {
                                            verificationPassed:
                                                true,

                                            reviewPassed:
                                                true,

                                            apply:
                                                true
                                        }
                                    );

                                return result.committed;

                            }

                    }
                );

            process.stdout.write(
                `${formatOrchestratorResult(result)}\n`
            );

            if (
                result.passed ===
                false
            ) {
                process.exitCode =
                    1;
            }

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

        case "repair": {

            const commandArguments =
                process.argv.slice(
                    3
                );

            const specificationArgument =
                commandArguments.find(
                    (argument) => {
                        return !argument.startsWith(
                            "--"
                        );
                    }
                );

            const specificationPath =
                specificationArgument ??
                getDefaultRepairSpecificationPath(
                    configuration
                );

            const apply =
                commandArguments.includes(
                    "--apply"
                );

            const result =
                await repairRiverDev(
                    configuration,
                    specificationPath,
                    apply
                );

            process.stdout.write(
                `${formatRepairResult(result)}\n`
            );

            if (
                result.passed ===
                    false &&
                result.outcome !==
                    "blocked"
            ) {
                process.exitCode =
                    1;
            }

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

        case "verify": {

            const verificationPath =
                process.argv[3] ??
                getDefaultVerificationSpecificationPath(
                    configuration
                );

            const result =
                await verifyRiverDev(
                    configuration,
                    verificationPath
                );

            process.stdout.write(
                `${formatVerificationResult(result)}\n`
            );

            if (
                result.passed ===
                false
            ) {
                process.exitCode =
                    1;
            }

            return;

        }

        case "review": {

            const specificationPath =
                process.argv[3] ??
                getDefaultReviewSpecificationPath(
                    configuration
                );

            const result =
                await reviewRiverDev(
                    configuration,
                    specificationPath
                );

            process.stdout.write(
                `${formatReviewResult(result)}\n`
            );

            if (
                result.passed ===
                false
            ) {
                process.exitCode =
                    1;
            }

            return;

        }

        case "commit": {

            const commandArguments =
                process.argv.slice(
                    3
                );

            const specificationArgument =
                commandArguments.find(
                    (argument) => {
                        return !argument.startsWith(
                            "--"
                        );
                    }
                );

            const specificationPath =
                specificationArgument ??
                getDefaultCommitSpecificationPath(
                    configuration
                );

            const apply =
                commandArguments.includes(
                    "--apply"
                );

            const result =
                await commitRiverDev(
                    configuration,
                    specificationPath,
                    {
                        verificationPassed:
                            true,

                        reviewPassed:
                            true,

                        apply
                    }
                );

            process.stdout.write(
                `${formatCommitResult(result)}\n`
            );

            return;

        }

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
















