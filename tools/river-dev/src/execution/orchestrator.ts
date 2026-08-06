export type RiverDevOrchestratorStage =
    | "inspect"
    | "plan"
    | "implement"
    | "verify"
    | "repair"
    | "review"
    | "commit";


export type RiverDevOrchestratorOutcome =
    | "completed"
    | "dry-run-complete"
    | "already-complete"
    | "repair-blocked"
    | "verification-failed"
    | "review-failed"
    | "commit-failed"
    | "stopped";


export interface RiverDevOrchestratorSpecification {

    readonly version:
        string;

    readonly id:
        string;

    readonly name:
        string;

    readonly objective:
        string;

    readonly branch:
        string;

    readonly allowedPaths:
        readonly string[];

    readonly stages:
        readonly RiverDevOrchestratorStage[];

    readonly requirements: {

        readonly expectedBranchRequired:
            boolean;

        readonly cleanStartRequired:
            boolean;

        readonly planRequired:
            boolean;

        readonly dryRunDefault:
            boolean;

        readonly verificationRequired:
            boolean;

        readonly repairAllowed:
            boolean;

        readonly reviewRequired:
            boolean;

        readonly commitRequiresApplyFlag:
            boolean;

        readonly pushAllowed:
            boolean;

        readonly outsideRepositoryAllowed:
            boolean;

        readonly maximumRepairAttempts:
            number;

        readonly stopOnUnsupportedFailure:
            boolean;

        readonly stopOnReviewFailure:
            boolean;

        readonly stopOnScopeFailure:
            boolean;

    };

    readonly outcomes:
        readonly RiverDevOrchestratorOutcome[];

    readonly qualityGates:
        readonly string[];

}


export interface RiverDevStageResult {

    readonly stage:
        RiverDevOrchestratorStage;

    readonly passed:
        boolean;

    readonly skipped:
        boolean;

    readonly message:
        string;

}


export interface RiverDevOrchestratorRequest {

    readonly specification:
        RiverDevOrchestratorSpecification;

    readonly apply?:
        boolean;

}


export interface RiverDevOrchestratorResult {

    readonly specificationId:
        string;

    readonly branch:
        string;

    readonly outcome:
        RiverDevOrchestratorOutcome;

    readonly passed:
        boolean;

    readonly dryRun:
        boolean;

    readonly stages:
        readonly RiverDevStageResult[];

    readonly warnings:
        readonly string[];

}


export interface RiverDevOrchestratorDependencies {

    readonly getCurrentBranch:
        () => Promise<string>;

    readonly isWorkingTreeClean:
        () => Promise<boolean>;

    readonly inspect:
        () => Promise<boolean>;

    readonly plan:
        () => Promise<boolean>;

    readonly implement:
        (
            dryRun: boolean
        ) => Promise<boolean>;

    readonly verify:
        () => Promise<boolean>;

    readonly repair:
        (
            dryRun: boolean
        ) => Promise<boolean>;

    readonly review:
        () => Promise<boolean>;

    readonly commit:
        () => Promise<boolean>;

}


export const REQUIRED_ORCHESTRATOR_STAGE_ORDER:
readonly RiverDevOrchestratorStage[] = [
    "inspect",
    "plan",
    "implement",
    "verify",
    "repair",
    "review",
    "commit"
];


export function validateOrchestratorSpecification(
    specification:
        RiverDevOrchestratorSpecification
): void {

    if (
        specification.id.trim().length ===
        0
    ) {
        throw new TypeError(
            "Orchestrator specification identifier cannot be empty."
        );
    }

    if (
        specification.branch.trim().length ===
        0
    ) {
        throw new TypeError(
            "Orchestrator branch cannot be empty."
        );
    }

    if (
        specification.allowedPaths.length ===
        0
    ) {
        throw new TypeError(
            "Orchestrator must contain allowed paths."
        );
    }

    const normalizedPaths =
        specification.allowedPaths.map(
            (path) => {
                return path.replaceAll(
                    "\\",
                    "/"
                );
            }
        );

    if (
        new Set(
            normalizedPaths
        ).size !==
        normalizedPaths.length
    ) {
        throw new TypeError(
            "Orchestrator allowed paths must be unique."
        );
    }

    if (
        specification.stages.length !==
        REQUIRED_ORCHESTRATOR_STAGE_ORDER.length
    ) {
        throw new TypeError(
            "Orchestrator must contain the complete lifecycle."
        );
    }

    for (
        let index = 0;
        index <
            REQUIRED_ORCHESTRATOR_STAGE_ORDER.length;
        index += 1
    ) {

        if (
            specification.stages[index] !==
            REQUIRED_ORCHESTRATOR_STAGE_ORDER[index]
        ) {
            throw new TypeError(
                "Orchestrator stages are not in the required order."
            );
        }

    }

    if (
        specification.requirements.pushAllowed
    ) {
        throw new TypeError(
            "Autonomous push is not allowed."
        );
    }

    if (
        specification
            .requirements
            .outsideRepositoryAllowed
    ) {
        throw new TypeError(
            "Outside-repository orchestration is not allowed."
        );
    }

    if (
        !Number.isInteger(
            specification
                .requirements
                .maximumRepairAttempts
        ) ||
        specification
            .requirements
            .maximumRepairAttempts <
            1
    ) {
        throw new TypeError(
            "Maximum repair attempts must be a positive integer."
        );
    }

    if (
        specification
            .requirements
            .maximumRepairAttempts >
        10
    ) {
        throw new TypeError(
            "Maximum repair attempts cannot exceed 10."
        );
    }

}


export async function runEndToEndOrchestrator(
    dependencies:
        RiverDevOrchestratorDependencies,
    request:
        RiverDevOrchestratorRequest
): Promise<RiverDevOrchestratorResult> {

    validateOrchestratorSpecification(
        request.specification
    );

    const specification =
        request.specification;

    const apply =
        request.apply ??
        false;

    const dryRun =
        !apply;

    const branch =
        await dependencies
            .getCurrentBranch();

    if (
        specification
            .requirements
            .expectedBranchRequired &&
        branch !==
            specification.branch
    ) {
        throw new TypeError(
            `Orchestrator branch mismatch. Expected ${specification.branch}, received ${branch}.`
        );
    }

    const stages:
        RiverDevStageResult[] =
        [];

    const stoppedResult =
        (
            message:
                string
        ): RiverDevOrchestratorResult => {

            return {

                specificationId:
                    specification.id,

                branch,

                outcome:
                    "stopped",

                passed:
                    false,

                dryRun,

                stages,

                warnings: [
                    message
                ]

            };

        };

    if (
        specification
            .requirements
            .cleanStartRequired
    ) {

        const workingTreeClean =
            await dependencies
                .isWorkingTreeClean();

        if (
            !workingTreeClean
        ) {
            return stoppedResult(
                "Orchestrator requires a clean working tree."
            );
        }

    }

    const inspectionPassed =
        await dependencies.inspect();

    stages.push(
        {
            stage:
                "inspect",

            passed:
                inspectionPassed,

            skipped:
                false,

            message:
                inspectionPassed
                    ? "Inspection passed."
                    : "Inspection failed."
        }
    );

    if (
        !inspectionPassed
    ) {
        return stoppedResult(
            "Inspection failed."
        );
    }

    const planPassed =
        await dependencies.plan();

    stages.push(
        {
            stage:
                "plan",

            passed:
                planPassed,

            skipped:
                false,

            message:
                planPassed
                    ? "Planning passed."
                    : "Planning failed."
        }
    );

    if (
        specification
            .requirements
            .planRequired &&
        !planPassed
    ) {
        return stoppedResult(
            "Planning failed."
        );
    }

    const implementationPassed =
        await dependencies.implement(
            dryRun
        );

    stages.push(
        {
            stage:
                "implement",

            passed:
                implementationPassed,

            skipped:
                false,

            message:
                implementationPassed
                    ? "Implementation passed."
                    : "Implementation failed."
        }
    );

    if (
        !implementationPassed
    ) {
        return stoppedResult(
            "Implementation failed."
        );
    }

    let verificationPassed =
        await dependencies.verify();

    stages.push(
        {
            stage:
                "verify",

            passed:
                verificationPassed,

            skipped:
                false,

            message:
                verificationPassed
                    ? "Verification passed."
                    : "Verification failed."
        }
    );

    if (
        !verificationPassed &&
        specification
            .requirements
            .repairAllowed
    ) {

        const repairPassed =
            await dependencies.repair(
                dryRun
            );

        stages.push(
            {
                stage:
                    "repair",

                passed:
                    repairPassed,

                skipped:
                    false,

                message:
                    repairPassed
                        ? "Repair passed."
                        : "Repair was blocked or failed."
            }
        );

        if (
            !repairPassed
        ) {
            return {

                specificationId:
                    specification.id,

                branch,

                outcome:
                    "repair-blocked",

                passed:
                    false,

                dryRun,

                stages,

                warnings: [
                    "Verification failed and repair did not recover."
                ]

            };
        }

        verificationPassed =
            await dependencies.verify();

        stages.push(
            {
                stage:
                    "verify",

                passed:
                    verificationPassed,

                skipped:
                    false,

                message:
                    verificationPassed
                        ? "Verification passed after repair."
                        : "Verification still failed after repair."
            }
        );

    }
    else {

        stages.push(
            {
                stage:
                    "repair",

                passed:
                    true,

                skipped:
                    true,

                message:
                    "Repair was not required."
            }
        );

    }

    if (
        specification
            .requirements
            .verificationRequired &&
        !verificationPassed
    ) {
        return {

            specificationId:
                specification.id,

            branch,

            outcome:
                "verification-failed",

            passed:
                false,

            dryRun,

            stages,

            warnings: [
                "Verification did not pass."
            ]

        };
    }

    const reviewPassed =
        await dependencies.review();

    stages.push(
        {
            stage:
                "review",

            passed:
                reviewPassed,

            skipped:
                false,

            message:
                reviewPassed
                    ? "Review passed."
                    : "Review failed."
        }
    );

    if (
        specification
            .requirements
            .reviewRequired &&
        !reviewPassed
    ) {
        return {

            specificationId:
                specification.id,

            branch,

            outcome:
                "review-failed",

            passed:
                false,

            dryRun,

            stages,

            warnings: [
                "Review did not pass."
            ]

        };
    }

    if (
        dryRun
    ) {

        stages.push(
            {
                stage:
                    "commit",

                passed:
                    true,

                skipped:
                    true,

                message:
                    "Commit skipped in dry-run mode."
            }
        );

        return {

            specificationId:
                specification.id,

            branch,

            outcome:
                "dry-run-complete",

            passed:
                true,

            dryRun:
                true,

            stages,

            warnings:
                []

        };

    }

    const commitPassed =
        await dependencies.commit();

    stages.push(
        {
            stage:
                "commit",

            passed:
                commitPassed,

            skipped:
                false,

            message:
                commitPassed
                    ? "Commit passed."
                    : "Commit failed."
        }
    );

    if (
        !commitPassed
    ) {
        return {

            specificationId:
                specification.id,

            branch,

            outcome:
                "commit-failed",

            passed:
                false,

            dryRun:
                false,

            stages,

            warnings: [
                "Commit did not complete."
            ]

        };
    }

    return {

        specificationId:
            specification.id,

        branch,

        outcome:
            "completed",

        passed:
            true,

        dryRun:
            false,

        stages,

        warnings:
            []

    };

}


