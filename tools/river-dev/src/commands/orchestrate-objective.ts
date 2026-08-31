import type { RiverDevDevelopmentContext } from "../types";
import type { RiverDevImplementationPlan } from "../core/planner";
import type { RiverDevImplementationIntent } from "../core/implementation-intent";
import type { RiverDevArtifactPipelineResult } from "../core/artifact-pipeline";
import type { RiverDevImplementationProposal } from "../core/implementation-proposal";
import type { RiverDevImplementationManifest } from "../execution/runner";
import type { RiverDevExecutionPackage, RiverDevExecutionVerificationMetadata } from "../core/execution-package";
import type { RiverDevPackageExecutionResult } from "../core/package-executor";
import type { RiverDevVerificationResult } from "../execution/verification";
import type { RiverDevReviewResult } from "../review/reviewer";
import { createRiverDevDevelopmentContext } from "../core/context-engine";
import { planRiverDevPhase } from "./plan";
import { generateImplementationIntent } from "../core/implementation-intent-generator";
import { runArtifactPipeline } from "../core/artifact-pipeline";
import { createExecutionVerificationMetadata } from "./persist-execution-verification";
import { createExecutionPackage } from "../core/execution-package";
import { executePackageRiverDev } from "./execute-package";
import { persistExecutionPackageRiverDev } from "./persist-execution-package";
import { verifyRiverDev } from "./verify";
import { reviewRiverDev } from "./review";
import type { RiverDevImplementationContentGenerationProvider } from "../core/implementation-intent-generator";
import type { RiverDevConfiguration } from "../types";
import {
    completeRiverDevSession,
    createRiverDevSession,
    updateRiverDevSessionProgress
} from "../core/session-state";
import { createRiverDevStateStore } from "../state/store";
import { captureRepositorySnapshot } from "../git/repository";

export type RiverDevObjectiveOrchestrationMode = "dry-run" | "apply";

export type RiverDevObjectiveOrchestrationStage =
    | "understand"
    | "plan"
    | "generate-intent"
    | "generate-artifacts"
    | "execution-verification"
    | "execution-package"
    | "persist-execution-package"
    | "execute"
    | "verify"
    | "review";

export interface RiverDevObjectiveOrchestrationDependencies {
    readonly understand: () => Promise<RiverDevDevelopmentContext>;
    readonly plan: (context: RiverDevDevelopmentContext) => Promise<RiverDevImplementationPlan>;
    readonly generateIntent: (plan: RiverDevImplementationPlan, context: RiverDevDevelopmentContext) => Promise<RiverDevImplementationIntent>;
    readonly runArtifactPipeline: (plan: RiverDevImplementationPlan, intent: RiverDevImplementationIntent, approveProposal: boolean) => Promise<RiverDevArtifactPipelineResult> | RiverDevArtifactPipelineResult;
    readonly executionVerification: (proposal: RiverDevImplementationProposal, manifest: RiverDevImplementationManifest) => Promise<RiverDevExecutionVerificationMetadata>;
    readonly executionPackage: (proposal: RiverDevImplementationProposal, manifest: RiverDevImplementationManifest, verification: RiverDevExecutionVerificationMetadata) => Promise<RiverDevExecutionPackage>;
    readonly persistExecutionPackage: (executionPackage: RiverDevExecutionPackage) => Promise<string>;
    readonly execute: (executionPackagePath: string, mode: "dry-run") => Promise<RiverDevPackageExecutionResult>;
    readonly verify: (execution: RiverDevPackageExecutionResult) => Promise<RiverDevVerificationResult>;
    readonly review: (verification: RiverDevVerificationResult) => Promise<RiverDevReviewResult>;
}

export interface RiverDevObjectiveOrchestrationRequest {
    readonly mode?: RiverDevObjectiveOrchestrationMode;
    readonly approveProposal?: boolean;
}

export interface RiverDevObjectiveOrchestrationResult {
    readonly outcome: "completed" | "blocked" | "failed";
    readonly mode: RiverDevObjectiveOrchestrationMode;
    readonly completedStages: readonly RiverDevObjectiveOrchestrationStage[];
    readonly blockedStage: RiverDevObjectiveOrchestrationStage | null;
    readonly warning: string | null;
    readonly context: RiverDevDevelopmentContext | null;
    readonly plan: RiverDevImplementationPlan | null;
    readonly intent: RiverDevImplementationIntent | null;
    readonly artifacts: RiverDevArtifactPipelineResult | null;
    readonly executionVerification: RiverDevExecutionVerificationMetadata | null;
    readonly executionPackage: RiverDevExecutionPackage | null;
    readonly execution: RiverDevPackageExecutionResult | null;
    readonly verification: RiverDevVerificationResult | null;
    readonly review: RiverDevReviewResult | null;
}

function blockedResult(mode: RiverDevObjectiveOrchestrationMode, completedStages: readonly RiverDevObjectiveOrchestrationStage[], blockedStage: RiverDevObjectiveOrchestrationStage, warning: string, values: Partial<RiverDevObjectiveOrchestrationResult> = {}): RiverDevObjectiveOrchestrationResult {
    return {
        outcome: "blocked",
        mode,
        completedStages,
        blockedStage,
        warning,
        context: values.context ?? null,
        plan: values.plan ?? null,
        intent: values.intent ?? null,
        artifacts: values.artifacts ?? null,
        executionVerification: values.executionVerification ?? null,
        executionPackage: values.executionPackage ?? null,
        execution: values.execution ?? null,
        verification: values.verification ?? null,
        review: values.review ?? null
    };
}

export async function orchestrateObjectiveRiverDev(dependencies: RiverDevObjectiveOrchestrationDependencies, request: RiverDevObjectiveOrchestrationRequest = {}): Promise<RiverDevObjectiveOrchestrationResult> {
    const mode = request.mode ?? "dry-run";
    const completedStages: RiverDevObjectiveOrchestrationStage[] = [];

    if (mode === "apply") {
        return blockedResult(mode, completedStages, "execute", "Apply orchestration is blocked until separately governed execution authorization and authoritative persistence handoffs are wired.");
    }

    try {
        const context = await dependencies.understand();
        completedStages.push("understand");

        const plan = await dependencies.plan(context);
        completedStages.push("plan");

        const intent = await dependencies.generateIntent(plan, context);
        completedStages.push("generate-intent");

        const artifacts = await dependencies.runArtifactPipeline(plan, intent, request.approveProposal === true);
        completedStages.push("generate-artifacts");

        if (artifacts.proposalApproved !== true || artifacts.manifest === null) {
            return blockedResult(mode, completedStages, "execution-verification", "Execution package composition requires separately supplied proposal approval.", { context, plan, intent, artifacts });
        }

        const executionVerification = await dependencies.executionVerification(artifacts.proposal, artifacts.manifest);
        completedStages.push("execution-verification");

        if (executionVerification.passed !== true || executionVerification.verifiedAt === null) {
            return blockedResult(mode, completedStages, "execution-package", "Execution package composition requires passing pre-execution verification.", { context, plan, intent, artifacts, executionVerification });
        }

        const executionPackage = await dependencies.executionPackage(artifacts.proposal, artifacts.manifest, executionVerification);
        completedStages.push("execution-package");

        const persistedExecutionPackagePath = await dependencies.persistExecutionPackage(executionPackage);
        completedStages.push("persist-execution-package");

        const execution = await dependencies.execute(persistedExecutionPackagePath, "dry-run");
        completedStages.push("execute");

        const verification = await dependencies.verify(execution);
        completedStages.push("verify");

        if (verification.passed !== true || verification.requiredCommandsPassed !== true) {
            return blockedResult(mode, completedStages, "review", "Post-execution verification failed. Repair remains unsupported by this production composition boundary.", { context, plan, intent, artifacts, executionVerification, executionPackage, execution, verification });
        }

        const review = await dependencies.review(verification);
        completedStages.push("review");

        if (review.passed !== true) {
            return blockedResult(mode, completedStages, "review", "Repository review did not pass.", { context, plan, intent, artifacts, executionVerification, executionPackage, execution, verification, review });
        }

        return {
            outcome: "completed",
            mode,
            completedStages,
            blockedStage: null,
            warning: null,
            context,
            plan,
            intent,
            artifacts,
            executionVerification,
            executionPackage,
            execution,
            verification,
            review
        };
    } catch (error) {
        const warning = error instanceof Error ? error.message : String(error);
        const blockedStage: RiverDevObjectiveOrchestrationStage = completedStages.length === 0 ? "understand" : completedStages[completedStages.length - 1] === "understand" ? "plan" : completedStages[completedStages.length - 1] === "plan" ? "generate-intent" : completedStages[completedStages.length - 1] === "generate-intent" ? "generate-artifacts" : completedStages[completedStages.length - 1] === "generate-artifacts" ? "execution-verification" : completedStages[completedStages.length - 1] === "execution-verification" ? "execution-package" : completedStages[completedStages.length - 1] === "execution-package" ? "persist-execution-package" : completedStages[completedStages.length - 1] === "persist-execution-package" ? "execute" : completedStages[completedStages.length - 1] === "execute" ? "verify" : "review";
        return blockedResult(mode, completedStages, blockedStage, warning);
    }
}

export interface RiverDevProductionObjectiveOrchestrationOptions {
    readonly configuration: RiverDevConfiguration;
    readonly specificationPath: string;
    readonly provider?: RiverDevImplementationContentGenerationProvider;
    readonly generatedAt?: string;
    readonly verifiedAt?: string;
    readonly dependencies?: RiverDevObjectiveOrchestrationDependencies;
}

export function createProductionObjectiveOrchestrationDependencies(options: RiverDevProductionObjectiveOrchestrationOptions): RiverDevObjectiveOrchestrationDependencies {
    if (options.provider === undefined) {
        throw new Error("Production objective orchestration requires an explicit implementation content generation provider.");
    }

    const provider = options.provider;


    return {
        understand: () => createRiverDevDevelopmentContext(options.configuration, options.generatedAt, options.specificationPath),
        plan: async () => planRiverDevPhase(options.configuration, options.specificationPath, options.generatedAt),
        generateIntent: async (plan, context) => {
            const generated = await generateImplementationIntent(plan, context, provider);
            return generated.intent;
        },
        runArtifactPipeline: (plan, intent, approveProposal) => runArtifactPipeline({ plan, intent, approveProposal }),
        executionVerification: async () => {
            const verification = await verifyRiverDev(options.configuration, options.specificationPath);
            return createExecutionVerificationMetadata(verification, options.verifiedAt ?? new Date().toISOString());
        },
        executionPackage: async (proposal, manifest, verification) => createExecutionPackage({ proposal, manifest, verification }).executionPackage,
        persistExecutionPackage: async (executionPackage) => (await persistExecutionPackageRiverDev(options.configuration, executionPackage)).repositoryPath,
        execute: (executionPackagePath, mode) => executePackageRiverDev(options.configuration, executionPackagePath, mode, null),
        verify: async () => verifyRiverDev(options.configuration, options.specificationPath),
        review: async () => reviewRiverDev(options.configuration, options.specificationPath)
    };
}

export interface RiverDevProductionObjectiveLifecycleRequest {
    readonly mode?: RiverDevObjectiveOrchestrationMode;
    readonly approveProposal?: boolean;
    readonly startedAt?: string;
}

export interface RiverDevProductionObjectiveLifecycleResult {
    readonly orchestration: RiverDevObjectiveOrchestrationResult;
    readonly sessionId: string;
    readonly sessionCompleted: boolean;
    readonly completionEvidence: readonly string[];
}

export async function orchestrateProductionObjectiveRiverDev(
    options: RiverDevProductionObjectiveOrchestrationOptions,
    request: RiverDevProductionObjectiveLifecycleRequest = {}
): Promise<RiverDevProductionObjectiveLifecycleResult> {
    const mode = request.mode ?? "dry-run";

    if (mode === "apply") {
        const orchestration = await orchestrateObjectiveRiverDev(
            options.dependencies ?? createProductionObjectiveOrchestrationDependencies(options),
            request.approveProposal === undefined ? { mode } : { mode, approveProposal: request.approveProposal }
        );

        return {
            orchestration,
            sessionId: "",
            sessionCompleted: false,
            completionEvidence: []
        };
    }

    const startedAt = request.startedAt ?? new Date().toISOString();
    const repository = await captureRepositorySnapshot(options.configuration.repositoryRoot, startedAt);
    const store = createRiverDevStateStore(options.configuration.repositoryRoot);
    let session = createRiverDevSession({
        phase: "ORCHESTRATE-001",
        specificationPath: options.specificationPath,
        repository,
        startedAt
    });

    await store.beginSession(session);

    const dependencies = options.dependencies ?? createProductionObjectiveOrchestrationDependencies(options);
    const trackedDependencies: RiverDevObjectiveOrchestrationDependencies = {
        understand: async () => {
            const context = await dependencies.understand();
            session = updateRiverDevSessionProgress(session, { currentStep: "planning", updatedAt: new Date().toISOString() });
            await store.updateSession(session);
            return context;
        },
        plan: async (context) => {
            const plan = await dependencies.plan(context);
            session = updateRiverDevSessionProgress(session, { currentStep: "proposal", planId: plan.planId, updatedAt: new Date().toISOString() });
            await store.updateSession(session);
            return plan;
        },
        generateIntent: (plan, context) => dependencies.generateIntent(plan, context),
        runArtifactPipeline: async (plan, intent, approveProposal) => {
            const artifacts = await dependencies.runArtifactPipeline(plan, intent, approveProposal);
            session = updateRiverDevSessionProgress(session, { currentStep: "artifact-generation", updatedAt: new Date().toISOString() });
            await store.updateSession(session);
            return artifacts;
        },
        executionVerification: async (proposal, manifest) => {
            const verification = await dependencies.executionVerification(proposal, manifest);
            session = updateRiverDevSessionProgress(session, { currentStep: "verification", validation: { qualityGates: verification.passed ? "passed" : "failed" }, updatedAt: new Date().toISOString() });
            await store.updateSession(session);
            return verification;
        },
        executionPackage: async (proposal, manifest, verification) => {
            const executionPackage = await dependencies.executionPackage(proposal, manifest, verification);
            session = updateRiverDevSessionProgress(session, { currentStep: "execution-package", executionPackageId: executionPackage.packageId, updatedAt: new Date().toISOString() });
            await store.updateSession(session);
            return executionPackage;
        },
        persistExecutionPackage: async (executionPackage) => {
            const executionPackagePath = await dependencies.persistExecutionPackage(executionPackage);
            session = updateRiverDevSessionProgress(session, { currentStep: "execution-package", updatedAt: new Date().toISOString() });
            await store.updateSession(session);
            return executionPackagePath;
        },
        execute: async (executionPackagePath, executionMode) => {
            const execution = await dependencies.execute(executionPackagePath, executionMode);
            session = updateRiverDevSessionProgress(session, { currentStep: "execution", updatedAt: new Date().toISOString() });
            await store.updateSession(session);
            return execution;
        },
        verify: async (execution) => {
            const verification = await dependencies.verify(execution);
            session = updateRiverDevSessionProgress(session, { currentStep: "verification", validation: { tests: verification.requiredCommandsPassed ? "passed" : "failed", typecheck: verification.requiredCommandsPassed ? "passed" : "failed", qualityGates: verification.passed ? "passed" : "failed" }, updatedAt: new Date().toISOString() });
            await store.updateSession(session);
            return verification;
        },
        review: async (verification) => {
            const review = await dependencies.review(verification);
            session = updateRiverDevSessionProgress(session, { currentStep: "review", validation: { review: review.passed ? "passed" : "failed" }, updatedAt: new Date().toISOString() });
            await store.updateSession(session);
            return review;
        }
    };

    try {
        const orchestration = await orchestrateObjectiveRiverDev(trackedDependencies, request.approveProposal === undefined ? { mode } : { mode, approveProposal: request.approveProposal });

        if (orchestration.outcome !== "completed" || orchestration.plan === null || orchestration.executionPackage === null || orchestration.verification === null || orchestration.review === null) {
            session = updateRiverDevSessionProgress(session, { status: "blocked", updatedAt: new Date().toISOString() });
            await store.updateSession(session);

            return {
                orchestration,
                sessionId: session.sessionId,
                sessionCompleted: false,
                completionEvidence: []
            };
        }

        session = updateRiverDevSessionProgress(session, { planId: orchestration.plan.planId, executionPackageId: orchestration.executionPackage.packageId, validation: { tests: orchestration.verification.requiredCommandsPassed ? "passed" : "failed", typecheck: orchestration.verification.requiredCommandsPassed ? "passed" : "failed", review: orchestration.review.passed ? "passed" : "failed", qualityGates: orchestration.verification.passed ? "passed" : "failed" }, updatedAt: new Date().toISOString() });
        session = completeRiverDevSession(session, new Date().toISOString());
        await store.completeSession(session);

        return {
            orchestration,
            sessionId: session.sessionId,
            sessionCompleted: true,
            completionEvidence: [
                `session:${session.sessionId}`,
                `plan:${orchestration.plan.planId}`,
                `execution-package:${orchestration.executionPackage.packageId}`,
                `verification:${orchestration.verification.verificationId}`,
                `review:${orchestration.review.reviewId}`
            ]
        };
    } catch (error) {
        session = updateRiverDevSessionProgress(session, { status: "failed", updatedAt: new Date().toISOString() });
        await store.updateSession(session);
        throw error;
    }
}
