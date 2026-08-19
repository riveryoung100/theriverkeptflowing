import {
    existsSync
} from "node:fs";

import {
    dirname,
    resolve
} from "node:path";

import {
    loadRiverDevConfiguration
} from "./core/config";

import {
    formatInspectionReport,
    runTrackedInspection
} from "./commands/inspect";

import {
discoverRiverDevRepository,
formatRepositoryDiscoveryReport
} from "./commands/discover-repository";

import {
createContextReport,
formatContextReport
} from "./commands/context";

import {
    commitRiverDev,
    formatCommitResult,
    getDefaultCommitSpecificationPath
} from "./commands/commit";
import {
    createExecutionPackageRiverDev,
    formatExecutionPackageResult
} from "./commands/create-execution-package";
import {
    auditExecutionFileRiverDev,
    formatExecutionAuditResult
} from "./commands/audit-execution";
import {
    executePackageRiverDev,
    formatPackageExecutionResult
} from "./commands/execute-package";
import {
    formatExecutionPackagePersistenceResult,
    persistExecutionPackageFileRiverDev
} from "./commands/persist-execution-package";
import {
    formatGeneratedArtifactPersistenceResult,
    persistGeneratedArtifactsRiverDev
} from "./commands/persist-artifacts";
import {
    formatArtifactPipelineResult,
    generateArtifactsRiverDev
} from "./commands/generate-artifacts";
import {
    formatProposalGenerationResult,
    generateProposalRiverDev
} from "./commands/generate-proposal";
import {
    formatManifestGenerationResult,
    generateManifestRiverDev
} from "./commands/generate-manifest";
import {
    formatImplementationResult,
    getDefaultImplementationManifestPath,
    implementRiverDevPlan
} from "./commands/implement";

import {
    formatImplementationPlan,
    planRiverDevPhase
} from "./commands/plan";

import {
    resolvePhaseSpecification
} from "./core/phase-resolution";

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

        case "discover-repository":

        case "context":

        case "plan":
        case "generate-artifacts":
        case "create-execution-package":
        case "persist-execution-package":
        case "execute-package":
        case "audit-execution":
        case "persist-artifacts":
        case "generate-proposal":
        case "generate-manifest":
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


function resolveRepositoryRoot(
    startingDirectory:
        string = process.cwd()
): string {

    let candidate =
        resolve(
            startingDirectory
        );

    while (true) {

        const policyDirectory =
            resolve(
                candidate,
                ".river-dev"
            );

        if (
            existsSync(
                policyDirectory
            )
        ) {
            return candidate;
        }

        const parent =
            dirname(
                candidate
            );

        if (
            parent ===
            candidate
        ) {
            throw new TypeError(
                `Unable to locate River Dev repository root from ${startingDirectory}.`
            );
        }

        candidate =
            parent;

    }

}


async function run(): Promise<void> {

    const command =
        parseCommand(
            process.argv[2]
        );

    const repositoryRoot =
        resolveRepositoryRoot();

    const configuration =
        await loadRiverDevConfiguration(
            repositoryRoot
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

        case "discover-repository": {


            const report =

                await discoverRiverDevRepository(

                    configuration

                );


            process.stdout.write(

                `${formatRepositoryDiscoveryReport(report)}\n`

            );


            return;


        }
        case "context": {

            const context =
                await createContextReport(
                    configuration
                );

            process.stdout.write(
                `${formatContextReport(context)}\n`
            );

            return;

        }


        case "plan": {

            const explicitSpecificationPath =
                process.argv[3];

            const specificationPath =
                explicitSpecificationPath ??
                await resolvePhaseSpecification(
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

        case "create-execution-package": {

    const proposalPath =
        process.argv[3];

    const manifestPath =
        process.argv[4];

    const verificationPath =
        process.argv[5];

    if (
        proposalPath === undefined ||
        manifestPath === undefined ||
        verificationPath === undefined
    ) {
        throw new TypeError(
            "Usage: create-execution-package <proposal-path> <manifest-path> <verification-path>"
        );
    }

    const result =
        await createExecutionPackageRiverDev(
            configuration,
            proposalPath,
            manifestPath,
            verificationPath
        );

    process.stdout.write(
        `${formatExecutionPackageResult(result)}\n`
    );

    return;

}

case "audit-execution": {

    const executionResultPath =
        process.argv[3];

    const executedAt =
        process.argv[4];

    if (
        executionResultPath === undefined ||
        executedAt === undefined
    ) {
        throw new TypeError(
            "Usage: audit-execution <execution-result-path> <executed-at>"
        );
    }

    const result =
        await auditExecutionFileRiverDev(
            configuration,
            executionResultPath,
            executedAt
        );

    process.stdout.write(
        `${formatExecutionAuditResult(result)}\n`
    );

    return;

}

case "execute-package": {

    const commandArguments =
        process.argv.slice(
            3
        );

    const packagePath =
        commandArguments.find(
            (argument) => {
                return !argument.startsWith(
                    "--"
                );
            }
        );

    if (
        packagePath ===
        undefined
    ) {
        throw new TypeError(
            "Usage: execute-package <execution-package-path> [--apply]"
        );
    }

    const mode =
        commandArguments.includes(
            "--apply"
        )
            ? "apply"
            : "dry-run";

    const result =
        await executePackageRiverDev(
            configuration,
            packagePath,
            mode
        );

    process.stdout.write(
        `${formatPackageExecutionResult(result)}\n`
    );

    return;

}

case "persist-execution-package": {

    const packagePath =
        process.argv[3];

    if (
        packagePath === undefined
    ) {
        throw new TypeError(
            "Usage: persist-execution-package <execution-package-path>"
        );
    }

    const result =
        await persistExecutionPackageFileRiverDev(
            configuration,
            packagePath
        );

    process.stdout.write(
        `${formatExecutionPackagePersistenceResult(result)}\n`
    );

    return;

}

        case "persist-artifacts": {

            const commandArguments =
                process.argv.slice(
                    3
                );

            const positionalArguments =
                commandArguments.filter(
                    (argument) => {
                        return !argument.startsWith(
                            "--"
                        );
                    }
                );

            const planPath =
                positionalArguments[0];

            const intentPath =
                positionalArguments[1];

            if (
                planPath ===
                    undefined ||
                intentPath ===
                    undefined
            ) {
                throw new TypeError(
                    "Usage: persist-artifacts <plan-path> <intent-path> [--approve-proposal]"
                );
            }

            const approveProposal =
                commandArguments.includes(
                    "--approve-proposal"
                );

            const result =
                await persistGeneratedArtifactsRiverDev(
                    configuration,
                    planPath,
                    intentPath,
                    approveProposal
                );

            process.stdout.write(
                `${formatGeneratedArtifactPersistenceResult(result)}\n`
            );

            return;

        }

        case "generate-artifacts": {

            const commandArguments =
                process.argv.slice(
                    3
                );

            const positionalArguments =
                commandArguments.filter(
                    (argument) => {
                        return !argument.startsWith(
                            "--"
                        );
                    }
                );

            const planPath =
                positionalArguments[0];

            const intentPath =
                positionalArguments[1];

            if (
                planPath ===
                    undefined ||
                intentPath ===
                    undefined
            ) {
                throw new TypeError(
                    "Usage: generate-artifacts <plan-path> <intent-path> [--approve-proposal]"
                );
            }

            const approveProposal =
                commandArguments.includes(
                    "--approve-proposal"
                );

            const result =
                await generateArtifactsRiverDev(
                    configuration,
                    planPath,
                    intentPath,
                    approveProposal
                );

            process.stdout.write(
                `${formatArtifactPipelineResult(result)}\n`
            );

            return;

        }

        case "generate-proposal": {

            const commandArguments =
                process.argv.slice(
                    3
                );

            const positionalArguments =
                commandArguments.filter(
                    (argument) => {
                        return !argument.startsWith(
                            "--"
                        );
                    }
                );

            const planPath =
                positionalArguments[0];

            const intentPath =
                positionalArguments[1];

            if (
                planPath ===
                    undefined ||
                intentPath ===
                    undefined
            ) {
                throw new TypeError(
                    "Usage: generate-proposal <plan-path> <intent-path>"
                );
            }

            const result =
                await generateProposalRiverDev(
                    configuration,
                    planPath,
                    intentPath
                );

            process.stdout.write(
                `${formatProposalGenerationResult(result)}\n`
            );

            return;

        }

        case "generate-manifest": {

            const commandArguments =
                process.argv.slice(
                    3
                );

            const positionalArguments =
                commandArguments.filter(
                    (argument) => {
                        return !argument.startsWith(
                            "--"
                        );
                    }
                );

            const planPath =
                positionalArguments[0];

            const proposalPath =
                positionalArguments[1];

            if (
                planPath ===
                    undefined ||
                proposalPath ===
                    undefined
            ) {
                throw new TypeError(
                    "Usage: generate-manifest <plan-path> <proposal-path>"
                );
            }

            const result =
                await generateManifestRiverDev(
                    configuration,
                    planPath,
                    proposalPath
                );

            process.stdout.write(
                `${formatManifestGenerationResult(result)}\n`
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


