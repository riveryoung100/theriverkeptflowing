
export interface RiverDevExecutionIntelligenceEvaluationFoundation {

readonly version:
"1.0.0";

readonly source:
string;

readonly objective:
string;

readonly approved:
boolean;

readonly understood:
boolean;

readonly evaluation:
readonly string[];

readonly provenance:
readonly string[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevExecutionIntelligenceFoundation {

readonly version:
"1.0.0";

readonly source:
string;

readonly objective:
string;

readonly decision:
"approved" | "blocked";

readonly understood:
boolean;

readonly executionActions:
readonly string[];

readonly preparationSource:
string;

readonly blockedReasons:
readonly string[];

}

export interface RiverDevExecutionContextSynthesis {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly retrievedContext:
readonly RiverDevMemoryEntry[];

readonly synthesis:
readonly string[];

readonly provenance:
readonly string[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevExecutionMemoryRetrieval {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly retrievedEntries:
readonly RiverDevMemoryEntry[];

readonly provenance:
readonly string[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevExecutionContinuation {

readonly version:
"1.0.0";

readonly source:
string;

readonly objective:
string;

readonly reportingSource:
string;

readonly continuationState:
"continue" | "halt" | "review";

readonly continuationActions:
readonly string[];

readonly validationSummary:
readonly string[];

readonly authorized:
boolean;

}

export interface RiverDevExecutionReporting {

readonly version:
"1.0.0";

readonly source:
string;

readonly objective:
string;

readonly outcomeSource:
string;

readonly reportState:
"successful" | "failed" | "blocked";

readonly reportEntries:
readonly string[];

readonly validationSummary:
readonly string[];

readonly authorized:
boolean;

}

export interface RiverDevExecutionOutcome {

readonly version:
"1.0.0";

readonly source:
string;

readonly objective:
string;

readonly lifecycleSource:
string;

readonly outcome:
"successful" | "failed" | "blocked";

readonly executionResult:
readonly string[];

readonly validationSummary:
readonly string[];

readonly authorized:
boolean;

}

export interface RiverDevExecutionPreparation {

readonly version:
"1.0.0";

readonly source?:
string;

readonly objective:
string;

readonly implementationSource:
string;

readonly executionSteps:
readonly string[];

readonly safetyChecks:
readonly string[];

readonly authorized:
boolean;

}

export interface RiverDevImplementationIntelligence {

readonly version:
"1.0.0";

readonly source?:
string;

readonly objective:
string;

readonly planSource:
string;

readonly proposedChanges:
readonly string[];

readonly validationSteps:
readonly string[];

readonly trusted:
boolean;

}

export interface RiverDevPlanningIntelligence {

readonly version:
"1.0.0";

readonly source?:
string;

readonly objective:
string;

readonly projectRepository:
string;

readonly steps:
readonly string[];

readonly risks:
readonly string[];

readonly trusted:
boolean;

}

export interface RiverDevProjectIntelligence {

readonly version:
"1.0.0";

readonly source?:
string;

readonly repository:
string;

readonly architecture:
readonly string[];

readonly contentSystems:
readonly string[];

readonly understood:
boolean;

}
export const RIVER_DEV_VERSION =
    "0.1.0" as const;


export type RiverDevVersion =
    typeof RIVER_DEV_VERSION;


export type RiverDevCommandName =
    | "inspect"
| "discover-repository"
| "context"
| "plan"
    | "create-execution-package"
    | "persist-execution-package"
    | "execute-package"
    | "audit-execution"
    | "persist-artifacts"
    | "generate-artifacts"
    | "generate-proposal"
    | "generate-manifest"
    | "implement"
    | "verify"
    | "review"
    | "commit"
    | "orchestrate"
    | "repair"
    | "resume";


export type RiverDevRunStatus =
    | "idle"
    | "inspecting"
    | "planning"
    | "implementing"
    | "verifying"
    | "reviewing"
    | "ready-to-commit"
    | "committing"
    | "completed"
    | "blocked"
    | "failed";


export type RiverDevApprovalRequirement =
    | "push"
    | "deploy"
    | "package-install"
    | "dependency-upgrade"
    | "file-delete"
    | "database-migration"
    | "production-data-change"
    | "infrastructure-change"
    | "secret-access"
    | "scope-expansion";


export interface RiverDevProjectMap {

    readonly version:
        string;

    readonly project: {

        readonly name:
            string;

        readonly repositoryType:
            string;

        readonly defaultBranch:
            string;

        readonly packageManager:
            string;

    };

    readonly paths:
        Readonly<Record<string, string>>;

    readonly commands:
        Readonly<Record<string, string>>;

    readonly conventions:
        Readonly<Record<string, unknown>>;

    readonly protectedPaths:
        readonly string[];

}


export interface RiverDevSafetyPolicy {

    readonly version:
        string;

    readonly defaultMode:
        string;

    readonly repositoryBoundary: {

        readonly allowOutsideRepository:
            boolean;

        readonly allowParentDirectoryTraversal:
            boolean;

        readonly allowAbsolutePathsOutsideRepository:
            boolean;

    };

    readonly git:
        Readonly<Record<string, boolean>>;

    readonly filesystem:
        Readonly<Record<string, boolean>>;

    readonly commands: {

        readonly allowShell:
            boolean;

        readonly allowNetworkCommands:
            boolean;

        readonly allowDownloadedScripts:
            boolean;

        readonly allowPackageInstall:
            boolean;

        readonly allowProductionCommands:
            boolean;

        readonly maximumCommandSeconds:
            number;

    };

    readonly secrets: {

        readonly denyPatterns:
            readonly string[];

        readonly allowReadingSecretFiles:
            boolean;

        readonly allowWritingSecretFiles:
            boolean;

        readonly allowReportingSecretValues:
            boolean;

    };

    readonly repairs: {

        readonly maximumAttempts:
            number;

        readonly requireFailureEvidence:
            boolean;

        readonly allowScopeExpansion:
            boolean;

    };

    readonly approvalRequiredFor:
        readonly RiverDevApprovalRequirement[];

}


export interface RiverDevQualityGate {

    readonly id:
        string;

    readonly description:
        string;

}


export interface RiverDevQualityGates {

    readonly version:
        string;

    readonly requiredBeforeCommit:
        readonly RiverDevQualityGate[];

    readonly existingNonBlockingHints:
        readonly {

            readonly path:
                string;

            readonly description:
                string;

        }[];

    readonly failureBehavior:
        "stop";

}


export interface RiverDevCommandDefinition {

    readonly name:
        string;

    readonly executable:
        string;

    readonly arguments?:
        readonly string[];

    readonly argumentsPrefix?:
        readonly string[];

}


export interface RiverDevCommandPolicy {

    readonly version:
        string;

    readonly allowedCommands:
        readonly RiverDevCommandDefinition[];

    readonly deniedExecutables:
        readonly string[];

    readonly deniedGitArguments:
        readonly string[];

}


export interface RiverDevConfiguration {

    readonly repositoryRoot:
        string;

    readonly policyRoot:
        string;

    readonly projectMap:
        RiverDevProjectMap;

    readonly safetyPolicy:
        RiverDevSafetyPolicy;

    readonly qualityGates:
        RiverDevQualityGates;

    readonly commandPolicy:
        RiverDevCommandPolicy;

}


export interface RiverDevRepositorySnapshot {

    readonly repositoryRoot:
        string;

    readonly branch:
        string;

    readonly commit:
        string;

    readonly clean:
        boolean;

    readonly changedPaths:
        readonly string[];

    readonly capturedAt:
        string;

}


export type RiverDevRepositoryPathKind =
    | "file"
    | "directory";

export type RiverDevRepositoryPathClassification =
    | "river-dev"
    | "source"
    | "test"
    | "documentation"
    | "configuration"
    | "content"
    | "public-asset"
    | "infrastructure"
    | "protected"
    | "other";

export interface RiverDevRepositoryDiscoveryEntry {

    readonly path:
        string;

    readonly kind:
        RiverDevRepositoryPathKind;

    readonly classification:
        RiverDevRepositoryPathClassification;

    readonly protected:
        boolean;

}

export interface RiverDevRepositoryDiscoveryCounts {

    readonly total:
        number;

    readonly files:
        number;

    readonly directories:
        number;

    readonly protected:
        number;

}

export interface RiverDevRepositoryDiscoveryReport {

    readonly version:
        "1.0.0";

    readonly repositoryRoot:
        string;

    readonly projectName:
        string;

    readonly branch:
        string;

    readonly commit:
        string;

    readonly discoveredAt:
        string;

    readonly entries:
        readonly RiverDevRepositoryDiscoveryEntry[];

    readonly counts:
        RiverDevRepositoryDiscoveryCounts;

    readonly keyPaths:
        Readonly<Record<string, string>>;

}

export interface RiverDevContextPhaseIdentity {

    readonly phase:
        string;

    readonly branch:
        string;

    readonly specificationPath:
        string;

    readonly objective:
        string;

    readonly commitMessage:
        string;

}

export interface RiverDevContextScope {

    readonly modifiablePaths:
        readonly string[];

    readonly creatablePaths:
        readonly string[];

    readonly excludedPaths:
        readonly string[];

}

export interface RiverDevContextSessionCompatibility {

    readonly hasActiveSession:
        boolean;

    readonly sessionId:
        string |
        null;

    readonly compatible:
        boolean;

    readonly reason:
        string;

}

export interface RiverDevContextRelevantEntry {

    readonly path:
        string;

    readonly kind:
        RiverDevRepositoryPathKind;

    readonly classification:
        RiverDevRepositoryPathClassification;

    readonly reason:
        string;

}

export interface RiverDevContextIdentity {

    readonly repositoryRoot:
        string;

    readonly branch:
        string;

    readonly commit:
        string;

    readonly capturedAt:
        string;

    readonly discoveryVersion:
        "1.0.0";

    readonly specificationPath:
        string;

}

export interface RiverDevContextArtifact {

    readonly path:
        string;

    readonly classification:
        RiverDevRepositoryPathClassification;

    readonly reason:
        string;

    readonly originalBytes:
        number;

    readonly loadedBytes:
        number;

    readonly truncated:
        boolean;

    readonly content:
        string;

}

export interface RiverDevContextArtifactBundle {

    readonly version:
        "1.0.0";

    readonly maximumArtifactBytes:
        number;

    readonly maximumTotalBytes:
        number;

    readonly loadedBytes:
        number;

    readonly loadedCount:
        number;

    readonly truncatedCount:
        number;

    readonly omittedCount:
        number;


    readonly artifacts:
        readonly RiverDevContextArtifact[];

}


export interface RiverDevContextArtifactMetadata {

    readonly path:
        string;

    readonly extension:
        string;

    readonly bytes:
        number;

    readonly classification:
        RiverDevRepositoryPathClassification;

}


export interface RiverDevContextArtifactRelationship {

    readonly from:
        string;

    readonly to:
        string;

    readonly type:
        "imports" |
        "references";

    readonly reason:
        string;

}


export interface RiverDevContextRelevanceScore {

    readonly path:
        string;

    readonly score:
        number;

    readonly reasons:
        readonly string[];

}


export interface RiverDevContextUnderstanding {

    readonly version:
        "1.0.0";

    readonly artifactCount:
        number;

    readonly metadata:
        readonly RiverDevContextArtifactMetadata[];

    readonly relationships:
        readonly RiverDevContextArtifactRelationship[];

    readonly relevance:
        readonly RiverDevContextRelevanceScore[];

}

export interface RiverDevPlanningDecision {

    readonly path:
        string;

    readonly priority:
        number;

    readonly reason:
        string;

    readonly action:
        "inspect" |
        "modify" |
        "create";
}



export interface RiverDevExecutionTask {

    readonly id:
        string;

    readonly path:
        string;

    readonly action:
        "inspect" |
        "modify" |
        "create";

    readonly priority:
        number;

    readonly reason:
        string;

}



export interface RiverDevValidationDecision {

readonly taskId:
    string;

readonly path:
    string;

readonly valid:
    boolean;

readonly reason:
    string;

readonly requiresApproval:
    boolean;

}



export interface RiverDevExecutionStep {

readonly id:
    string;

readonly taskId:
    string;

readonly order:
    number;

readonly status:
    "ready" |
    "blocked" |
    "approval-required";

readonly reason:
    string;

}


export interface RiverDevApprovalState {

readonly taskId:
string;

readonly state:
"pending" |
"approved" |
"rejected";

readonly reason:
string;

}


export interface RiverDevSimulationStep {

readonly taskId:
string;

readonly state:
"simulated" |
"blocked" |
"approval-required";

readonly reason:
string;

}


export interface RiverDevRunnerStep {

readonly taskId:
string;

readonly state:
"executable" |
"blocked" |
"approval-required";

readonly reason:
string;

}


export interface RiverDevActionStep {

readonly taskId:
string;

readonly state:
"executable" |
"blocked" |
"approval-required";

readonly reason:
string;

}


export interface RiverDevDispatchStep {

    readonly taskId:
    string;

    readonly state:
    "dispatchable" |
    "blocked" |
    "approval-required";

    readonly reason:
    string;

}


export interface RiverDevResultStep {

readonly taskId:
string;

readonly state:
"successful" |
"blocked" |
"approval-required";

readonly reason:
string;

}


export interface RiverDevAuditStep {

readonly taskId:
string;

readonly state:
"successful" |
"blocked" |
"approval-required";

readonly reason:
string;

}


export interface RiverDevGovernanceStep {

readonly taskId:
string;

readonly state:
"approved" |
"blocked" |
"review-required";

readonly reason:
string;

}


export interface RiverDevPolicyStep {

readonly taskId:
string;

readonly state:
"allowed" |
"blocked" |
"review-required";

readonly reason:
string;

}


export interface RiverDevApprovalStep {

readonly taskId:
string;

readonly state:
"approved" |
"blocked" |
"pending-review";

readonly reason:
string;

}


export interface RiverDevAuthorizationStep {

readonly taskId:
string;

readonly state:
"authorized" |
"blocked" |
"confirmation-required";

readonly reason:
string;

}


export interface RiverDevImplementationStep {

readonly taskId:
string;

readonly state:
"ready" |
"blocked" |
"confirmation-required";

readonly reason:
string;

}


export interface RiverDevChangeStep {

readonly taskId:
string;

readonly state:
"planned" |
"blocked" |
"confirmation-required";

readonly reason:
string;

}


export interface RiverDevValidationStep {

readonly taskId:
string;

readonly state:
"validated" |
"blocked" |
"confirmation-required";

readonly reason:
string;

}


export interface RiverDevReadinessStep {

readonly taskId:
string;

readonly state:
"ready" |
"blocked" |
"confirmation-required";

readonly reason:
string;

}


export interface RiverDevRunAuthorizationStep {

readonly taskId:
string;

readonly state:
"authorized" |
"blocked" |
"confirmation-required";

readonly reason:
string;

}


export interface RiverDevFinalGateStep {

readonly taskId:
string;

readonly state:
"approved" |
"blocked" |
"confirmation-required";

readonly reason:
string;

}


export interface RiverDevCommitBoundaryStep {

readonly taskId:
string;

readonly state:
"authorized" |
"blocked" |
"confirmation-required";

readonly reason:
string;

}


export interface RiverDevReviewBoundaryStep {

readonly taskId:
string;

readonly state:
"approved" |
"blocked" |
"confirmation-required";

readonly reason:
string;

}


export interface RiverDevOrchestratorStep {

readonly name:
string;

readonly state:
"complete" |
"blocked" |
"confirmation-required";

readonly reason:
string;

}


export interface RiverDevIntelligenceStep {

readonly category:
string;

readonly state:
"understood" |
"blocked" |
"confirmation-required";

readonly explanation:
string;

}


export interface RiverDevReasoningStep {

readonly category:
string;

readonly state:
"reasoned" |
"blocked" |
"confirmation-required";

readonly explanation:
string;

readonly decision:
string;

}


export interface RiverDevMemoryEntry {

readonly category:
string;

readonly key:
string;

readonly value:
string;

readonly source:
string;

}


export interface RiverDevKnowledgeObject {

readonly category:
string;

readonly key:
string;

readonly insight:
string;

readonly source:
string;

}


export interface RiverDevCapability {

readonly category:
string;

readonly name:
string;

readonly description:
string;

readonly source:
string;

}


export interface RiverDevSkill {

readonly category:
string;

readonly name:
string;

readonly description:
string;

readonly source:
string;

}


export interface RiverDevSkillComposition {

readonly category:
string;

readonly name:
string;

readonly description:
string;

readonly source:
string;

readonly skills:
readonly string[];

}

export interface RiverDevExecutionSkillComposition {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly compositions:
readonly RiverDevSkillComposition[];

readonly blockedReasons:
readonly string[];

}
export interface RiverDevExecutionSkill {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly skills:
readonly RiverDevSkill[];

readonly blockedReasons:
readonly string[];

}
export interface RiverDevExecutionCapability {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly capabilities:
readonly RiverDevCapability[];

readonly blockedReasons:
readonly string[];

}
export interface RiverDevExecutionKnowledge {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly objects:
readonly RiverDevKnowledgeObject[];

readonly blockedReasons:
readonly string[];

}
export interface RiverDevExecutionMemory {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly entries:
readonly RiverDevMemoryEntry[];

readonly blockedReasons:
readonly string[];

}
export interface RiverDevExecutionReasoning {

readonly version:
"1.0.0";

readonly objective:
string;

readonly validated:
boolean;

readonly steps:
readonly RiverDevReasoningStep[];

readonly blockedReasons:
readonly string[];

}
export interface RiverDevExecutionIntelligence {

readonly version:
"1.0.0";

readonly source?:
string;

readonly objective:
string;

readonly preparationSource?:
string;

readonly decision?:
"approved" | "blocked";

readonly executionActions?:
readonly string[];

readonly validationRequirements?:
readonly string[];

readonly understood:
boolean;

readonly steps:
readonly RiverDevIntelligenceStep[];

readonly blockedReasons:
readonly string[];

}
export interface RiverDevExecutionOrchestrator {

readonly version:
"1.0.0";

readonly objective:
string;

readonly executable:
boolean;

readonly steps:
readonly RiverDevOrchestratorStep[];

readonly blockedReasons:
readonly string[];

}
export interface RiverDevReviewBoundary {

readonly version:
"1.0.0";

readonly objective:
string;

readonly completed:
boolean;

readonly reviews:
readonly RiverDevReviewBoundaryStep[];

readonly blockedReasons:
readonly string[];

}
export interface RiverDevCommitBoundary {

readonly version:
"1.0.0";

readonly objective:
string;

readonly permitted:
boolean;

readonly commits:
readonly RiverDevCommitBoundaryStep[];

readonly blockedReasons:
readonly string[];

}
export interface RiverDevExecutionFinalGate {

readonly version:
"1.0.0";

readonly objective:
string;

readonly permitted:
boolean;

readonly gates:
readonly RiverDevFinalGateStep[];

readonly blockedReasons:
readonly string[];

}
export interface RiverDevRunAuthorization {

readonly version:
"1.0.0";

readonly objective:
string;

readonly authorized:
boolean;

readonly authorization:
readonly RiverDevRunAuthorizationStep[];

readonly blockedReasons:
readonly string[];

}
export interface RiverDevExecutionReadiness {

readonly version:
"1.0.0";

readonly objective:
string;

readonly ready:
boolean;

readonly readiness:
readonly RiverDevReadinessStep[];

readonly blockedReasons:
readonly string[];

}
export interface RiverDevExecutionChangeValidation {

readonly version:
"1.0.0";

readonly objective:
string;

readonly valid:
boolean;

readonly validations:
readonly RiverDevValidationStep[];

readonly blockedReasons:
readonly string[];

}
export interface RiverDevExecutionChangePlan {

readonly version:
"1.0.0";

readonly objective:
string;

readonly executable:
boolean;

readonly changes:
readonly RiverDevChangeStep[];

readonly blockedReasons:
readonly string[];

}
export interface RiverDevExecutionImplementation {

readonly version:
"1.0.0";

readonly objective:
string;

readonly ready:
boolean;

readonly implementations:
readonly RiverDevImplementationStep[];

readonly blockedReasons:
readonly string[];

}
export interface RiverDevExecutionAuthorization {

readonly version:
"1.0.0";

readonly objective:
string;

readonly authorized:
boolean;

readonly authorizations:
readonly RiverDevAuthorizationStep[];

readonly blockedReasons:
readonly string[];

}
























export interface RiverDevExecutionLifecycleIntelligenceReadiness {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly source:
string;

readonly readiness:
readonly RiverDevLifecycleIntelligenceReadinessStep[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevLifecycleIntelligenceReadinessStep {

readonly taskId:
string;

readonly state:
"ready" | "blocked";

readonly reason:
string;

}
export interface RiverDevExecutionLifecycleIntelligenceActivation {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly source:
string;

readonly activation:
readonly RiverDevLifecycleIntelligenceActivationStep[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevLifecycleIntelligenceActivationStep {

readonly taskId:
string;

readonly state:
"activated" | "blocked";

readonly reason:
string;

}
export interface RiverDevExecutionLifecycleIntelligenceRestoration {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly source:
string;

readonly restoration:
readonly RiverDevLifecycleIntelligenceRestorationStep[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevLifecycleIntelligenceRestorationStep {

readonly taskId:
string;

readonly state:
"restored" | "blocked";

readonly reason:
string;

}
export interface RiverDevExecutionLifecycleIntelligenceRecovery {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly source:
string;

readonly recovery:
readonly RiverDevLifecycleIntelligenceRecoveryStep[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevLifecycleIntelligenceRecoveryStep {

readonly taskId:
string;

readonly state:
"recovered" | "blocked";

readonly reason:
string;

}
export interface RiverDevExecutionLifecycleIntelligencePersistence {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly source:
string;

readonly persistence:
readonly RiverDevLifecycleIntelligencePersistenceStep[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevLifecycleIntelligencePersistenceStep {

readonly taskId:
string;

readonly state:
"persisted" | "blocked";

readonly reason:
string;

}
export interface RiverDevExecutionLifecycleIntelligenceContinuity {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly source:
string;

readonly continuity:
readonly RiverDevLifecycleIntelligenceContinuityStep[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevLifecycleIntelligenceContinuityStep {

readonly taskId:
string;

readonly state:
"continuous" | "blocked";

readonly reason:
string;

}
export interface RiverDevExecutionLifecycleIntelligenceResilience {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly source:
string;

readonly resilience:
readonly RiverDevLifecycleIntelligenceResilienceStep[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevLifecycleIntelligenceResilienceStep {

readonly taskId:
string;

readonly state:
"resilient" | "blocked";

readonly reason:
string;

}
export interface RiverDevExecutionLifecycleIntelligenceReliability {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly source:
string;

readonly reliability:
readonly RiverDevLifecycleIntelligenceReliabilityStep[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevLifecycleIntelligenceReliabilityStep {

readonly taskId:
string;

readonly state:
"reliable" | "blocked";

readonly reason:
string;

}
export interface RiverDevExecutionLifecycleIntelligenceCompliance {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly source:
string;

readonly compliance:
readonly RiverDevLifecycleIntelligenceComplianceStep[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevLifecycleIntelligenceComplianceStep {

readonly taskId:
string;

readonly state:
"compliant" | "blocked";

readonly reason:
string;

}
export interface RiverDevExecutionLifecycleIntelligenceAssurance {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly source:
string;

readonly assurance:
readonly RiverDevLifecycleIntelligenceAssuranceStep[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevLifecycleIntelligenceAssuranceStep {

readonly taskId:
string;

readonly state:
"assured" | "blocked";

readonly reason:
string;

}
export interface RiverDevExecutionLifecycleIntelligenceValidation {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly source:
string;

readonly validation:
readonly RiverDevLifecycleIntelligenceValidationStep[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevLifecycleIntelligenceValidationStep {

readonly taskId:
string;

readonly state:
"validated" | "blocked";

readonly reason:
string;

}



export interface RiverDevExecutionLifecycleIntelligenceExecution {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly source:
string;

readonly execution:
readonly RiverDevLifecycleIntelligenceExecutionStep[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevLifecycleIntelligenceExecutionStep {

readonly taskId:
string;

readonly state:
"executed" | "blocked";

readonly reason:
string;

}
export interface RiverDevExecutionLifecycleIntelligenceDispatch {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly source:
string;

readonly dispatch:
readonly RiverDevLifecycleIntelligenceDispatchStep[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevLifecycleIntelligenceDispatchStep {

readonly taskId:
string;

readonly state:
"dispatched" | "blocked";

readonly reason:
string;

}
export interface RiverDevExecutionLifecycleIntelligenceAuthorization {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly source:
string;

readonly authorization:
readonly RiverDevLifecycleIntelligenceAuthorizationStep[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevLifecycleIntelligenceAuthorizationStep {

readonly taskId:
string;

readonly state:
"authorized" | "blocked";

readonly reason:
string;

}
export interface RiverDevExecutionLifecycleIntelligenceGovernance {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly source:
string;

readonly governance:
readonly RiverDevLifecycleIntelligenceGovernanceStep[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevLifecycleIntelligenceGovernanceStep {

readonly taskId:
string;

readonly state:
"approved" | "blocked";

readonly reason:
string;

}
export interface RiverDevExecutionLifecycleIntelligenceRecommendation {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly source:
string;

readonly recommendation:
readonly RiverDevLifecycleIntelligenceRecommendationStep[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevLifecycleIntelligenceRecommendationStep {

readonly taskId:
string;

readonly state:
"recommended" | "blocked";

readonly reason:
string;

}
export interface RiverDevExecutionLifecycleIntelligenceInsight {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly source:
string;

readonly insight:
readonly RiverDevLifecycleIntelligenceInsightStep[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevLifecycleIntelligenceInsightStep {

readonly taskId:
string;

readonly state:
"identified" | "blocked";

readonly reason:
string;

}
export interface RiverDevExecutionLifecycleIntelligenceKnowledge {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly source:
string;

readonly knowledge:
readonly RiverDevLifecycleIntelligenceKnowledgeStep[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevLifecycleIntelligenceKnowledgeStep {

readonly taskId:
string;

readonly state:
"stored" | "blocked";

readonly reason:
string;

}
export interface RiverDevExecutionLifecycleIntelligenceLearning {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly source:
string;

readonly learning:
readonly RiverDevLifecycleIntelligenceLearningStep[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevLifecycleIntelligenceLearningStep {

readonly taskId:
string;

readonly state:
"learned" | "blocked";

readonly reason:
string;

}


export interface RiverDevExecutionLifecycleIntelligenceOptimization {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly source:
string;

readonly optimization:
readonly RiverDevLifecycleIntelligenceOptimizationStep[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevLifecycleIntelligenceOptimizationStep {

readonly taskId:
string;

readonly state:
"optimized" | "blocked";

readonly reason:
string;

}
export interface RiverDevExecutionLifecycleIntelligenceAdaptation {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly source:
string;

readonly adaptation:
readonly RiverDevLifecycleIntelligenceAdaptationStep[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevLifecycleIntelligenceAdaptationStep {

readonly taskId:
string;

readonly state:
"adapted" | "blocked";

readonly reason:
string;

}
export interface RiverDevExecutionLifecycleIntelligenceFeedback {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly source:
string;

readonly feedback:
readonly RiverDevLifecycleIntelligenceFeedbackStep[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevLifecycleIntelligenceFeedbackStep {

readonly taskId:
string;

readonly state:
"learned" | "blocked";

readonly reason:
string;

}
export interface RiverDevExecutionLifecycleIntelligenceOutcome {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly source:
string;

readonly outcome:
readonly RiverDevLifecycleIntelligenceOutcomeStep[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevLifecycleIntelligenceOutcomeStep {

readonly taskId:
string;

readonly state:
"completed" | "blocked";

readonly reason:
string;

}
export interface RiverDevExecutionLifecycleIntelligenceAction {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly source:
string;

readonly action:
readonly RiverDevLifecycleIntelligenceActionStep[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevLifecycleIntelligenceActionStep {

readonly taskId:
string;

readonly state:
"acted" | "blocked";

readonly reason:
string;

}
export interface RiverDevExecutionLifecycleIntelligenceDecision {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly source:
string;

readonly decision:
readonly RiverDevLifecycleIntelligenceDecisionStep[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevLifecycleIntelligenceDecisionStep {

readonly taskId:
string;

readonly state:
"decided" | "blocked";

readonly reason:
string;

}









export interface RiverDevExecutionLifecycleIntelligenceContinuation {

readonly version:
"1.0.0";

readonly objective:
string;

readonly resilience:
readonly RiverDevLifecycleIntelligenceResilienceStep[];

readonly trusted:
boolean;

readonly source:
string;


readonly blockedReasons:
readonly string[];

}

export interface RiverDevLifecycleIntelligenceContinuationStep {

readonly taskId:
string;

readonly state:
"continued" | "blocked";

readonly reason:
string;

}
export interface RiverDevExecutionLifecycleIntelligenceEvolution {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly source:
string;

readonly evolution:
readonly RiverDevLifecycleIntelligenceEvolutionStep[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevLifecycleIntelligenceEvolutionStep {

readonly taskId:
string;

readonly state:
"evolved" | "blocked";

readonly reason:
string;

}
export interface RiverDevExecutionLifecycleIntelligenceMaturation {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly source:
string;

readonly maturation:
readonly RiverDevLifecycleIntelligenceMaturationStep[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevLifecycleIntelligenceMaturationStep {

readonly taskId:
string;

readonly state:
"matured" | "blocked";

readonly reason:
string;

}
export interface RiverDevExecutionLifecycleIntelligenceAdvancement {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly source:
string;

readonly advancement:
readonly RiverDevLifecycleIntelligenceAdvancementStep[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevLifecycleIntelligenceAdvancementStep {

readonly taskId:
string;

readonly state:
"advanced" | "blocked";

readonly reason:
string;

}
export interface RiverDevExecutionLifecycleIntelligenceTransition {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly source:
string;

readonly transition:
readonly RiverDevLifecycleIntelligenceTransitionStep[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevLifecycleIntelligenceTransitionStep {

readonly taskId:
string;

readonly state:
"transitioned" | "blocked";

readonly reason:
string;

}
export interface RiverDevExecutionLifecycleIntelligenceConsolidation {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly source:
string;

readonly consolidation:
readonly RiverDevLifecycleIntelligenceConsolidationStep[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevLifecycleIntelligenceConsolidationStep {

readonly taskId:
string;

readonly state:
"consolidated" | "blocked";

readonly reason:
string;

}
export interface RiverDevExecutionLifecycleIntelligenceIntegration {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly source:
string;

readonly integration:
readonly RiverDevLifecycleIntelligenceIntegrationStep[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevLifecycleIntelligenceIntegrationStep {

readonly taskId:
string;

readonly state:
"integrated" | "blocked";

readonly reason:
string;

}
export interface RiverDevExecutionLifecycleIntelligenceSynchronization {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly source:
string;

readonly synchronization:
readonly RiverDevLifecycleIntelligenceSynchronizationStep[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevLifecycleIntelligenceSynchronizationStep {

readonly taskId:
string;

readonly state:
"synchronized" | "blocked";

readonly reason:
string;

}
export interface RiverDevExecutionLifecycleIntelligenceCoordination {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly source:
string;

readonly coordination:
readonly RiverDevLifecycleIntelligenceCoordinationStep[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevLifecycleIntelligenceCoordinationStep {

readonly taskId:
string;

readonly state:
"coordinated" | "blocked";

readonly reason:
string;

}
export interface RiverDevExecutionLifecycleIntelligenceOrchestration {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly source:
string;

readonly orchestration:
readonly RiverDevLifecycleIntelligenceOrchestrationStep[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevLifecycleIntelligenceOrchestrationStep {

readonly taskId:
string;

readonly state:
"orchestrated" | "blocked";

readonly reason:
string;

}
export interface RiverDevExecutionLifecycleIntelligence {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly source:
string;

readonly intelligence:
readonly RiverDevLifecycleIntelligenceStep[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevLifecycleIntelligenceStep {

readonly taskId:
string;

readonly state:
"trusted" | "blocked";

readonly reason:
string;

}
export interface RiverDevExecutionLifecycle {

readonly version:
"1.0.0";

readonly objective:
string;

readonly active:
boolean;

readonly source:
string;

readonly executionSource?:
string;

readonly state?:
"ready" | "executing" | "completed" | "blocked";

readonly lifecycle:
readonly RiverDevLifecycleStep[];

readonly lifecycleSteps?:
readonly string[];

readonly safetyChecks?:
readonly string[];

readonly authorized?:
boolean;

readonly blockedReasons:
readonly string[];

}
export interface RiverDevLifecycleStep {

readonly taskId:
string;

readonly state:
"active" | "blocked";

readonly reason:
string;

}
export interface RiverDevExecutionCompletion {

readonly version:
"1.0.0";

readonly objective:
string;

readonly completed:
boolean;

readonly source:
string;

readonly completion:
readonly RiverDevCompletionStep[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevCompletionStep {

readonly taskId:
string;

readonly state:
"completed" | "blocked";

readonly reason:
string;

}
export interface RiverDevExecutionApproval {

readonly version:
"1.0.0";

readonly objective:
string;

readonly approved:
boolean;

readonly approvals:
readonly RiverDevApprovalStep[];

readonly blockedReasons:
readonly string[];

}
export interface RiverDevExecutionPolicy {

readonly version:
"1.0.0";

readonly objective:
string;

readonly allowed:
boolean;

readonly policies:
readonly RiverDevPolicyStep[];

readonly blockedReasons:
readonly string[];

}
export interface RiverDevExecutionGovernance {

readonly version:
"1.0.0";

readonly objective:
string;

readonly approved:
boolean;

readonly decisions:
readonly RiverDevGovernanceStep[];

readonly blockedReasons:
readonly string[];

}
export interface RiverDevExecutionAudit {

readonly version:
"1.0.0";

readonly objective:
string;

readonly complete:
boolean;

readonly history:
readonly RiverDevAuditStep[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevExecutionReview {

readonly version:
"1.0.0";

readonly objective:
string;

readonly approved:
boolean;

readonly source:
string;

readonly findings:
readonly string[];

readonly blockedReasons:
readonly string[];

}
export interface RiverDevExecutionResult {

readonly version:
"1.0.0";

readonly objective:
string;

readonly ready:
boolean;

readonly results:
readonly RiverDevResultStep[];

readonly trusted?:
boolean;

readonly status?:
"success" | "blocked";

readonly source?:
string;

readonly details?:
readonly string[];

readonly blockedReasons:
readonly string[];

}
export interface RiverDevExecutionDispatcher {

    readonly version:
    "1.0.0";

    readonly objective:
    string;

    readonly ready:
    boolean;

    readonly dispatches:
    readonly RiverDevDispatchStep[];

    readonly blockedReasons:
    readonly string[];

}
export interface RiverDevExecutionAction {

readonly version:
"1.0.0";

readonly objective:
string;

readonly ready:
boolean;

readonly actions:
readonly RiverDevActionStep[];

readonly blockedReasons:
readonly string[];

}
export interface RiverDevExecutionRunner {

readonly version:
"1.0.0";

readonly objective:
string;

readonly ready:
boolean;

readonly steps:
readonly RiverDevRunnerStep[];

readonly blockedReasons:
readonly string[];

}
export interface RiverDevExecutionSimulation {

readonly version:
"1.0.0";

readonly objective:
string;

readonly ready:
boolean;

readonly steps:
readonly RiverDevSimulationStep[];

readonly blockedReasons:
readonly string[];

}
export interface RiverDevExecutionSession {

readonly version:
"1.0.0";

readonly objective:
string;

readonly ready:
boolean;

readonly approvals:
readonly RiverDevApprovalState[];

readonly blockedReasons:
readonly string[];

}

export interface RiverDevWorkflow {

readonly category:
string;

readonly name:
string;

readonly description:
string;

readonly source:
string;

readonly steps:
readonly string[];

}

export interface RiverDevWorkflowOrchestration {

readonly category:
string;

readonly name:
string;

readonly description:
string;

readonly source:
string;

readonly workflows:
readonly string[];

}


export interface RiverDevWorkflowRuntimeStep {

readonly name:
string;

readonly source:
string;

readonly status:
"ready" | "blocked";

}

export interface RiverDevExecutionWorkflowRuntime {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly steps:
readonly RiverDevWorkflowRuntimeStep[];

readonly blockedReasons:
readonly string[];

}
export interface RiverDevExecutionWorkflowOrchestration {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted:
boolean;

readonly orchestrations:
readonly RiverDevWorkflowOrchestration[];

readonly blockedReasons:
readonly string[];

}
export interface RiverDevExecutionWorkflow {

readonly version:
"1.0.0";

readonly objective:
string;

readonly trusted?:
boolean;

readonly ready:
boolean;

readonly steps:
readonly RiverDevExecutionStep[];

readonly workflows?:
readonly RiverDevWorkflow[];

readonly blockedReasons:
readonly string[];

}
export interface RiverDevValidationResult {

readonly version:
    "1.0.0";

readonly ready:
    boolean;

readonly decisions:
    readonly RiverDevValidationDecision[];

readonly blockedReasons:
    readonly string[];

}
export interface RiverDevExecutionManifest {

    readonly version:
        "1.0.0";

    readonly objective:
        string;

    readonly tasks:
        readonly RiverDevExecutionTask[];

    readonly approvalRequired:
        readonly string[];

}
export interface RiverDevImplementationPlan {

    readonly version:
        "1.0.0";

    readonly objective:
        string;

    readonly decisions:
        readonly RiverDevPlanningDecision[];

    readonly steps:
        readonly string[];

}
export interface RiverDevDevelopmentContext {

    readonly version:
        "1.0.0";

    readonly generatedAt:
        string;

    readonly identity:
        RiverDevContextIdentity;

    readonly project: {

        readonly name:
            string;

        readonly repositoryType:
            string;

        readonly defaultBranch:
            string;

        readonly packageManager:
            string;

    };

    readonly phase:
        RiverDevContextPhaseIdentity;

    readonly repository:
        RiverDevRepositorySnapshot;

    readonly discovery:
        RiverDevRepositoryDiscoveryReport;

    readonly keyPaths:
        Readonly<Record<string, string>>;

    readonly architecturalContext:
        readonly string[];

    readonly scope:
        RiverDevContextScope;

    readonly acceptanceCriteria:
        readonly string[];

    readonly requiredTests:
        readonly string[];

    readonly requiredQualityGates:
        readonly string[];

    readonly approvedCommands:
        readonly string[];

    readonly repairLimits: {

        readonly maximumAttempts:
            number;

        readonly allowScopeExpansion:
            boolean;

    };

    readonly approvalBoundaries:
        readonly RiverDevApprovalRequirement[];

    readonly session:
        RiverDevContextSessionCompatibility;

    readonly relevantEntries:
        readonly RiverDevContextRelevantEntry[];



    readonly understanding:
        RiverDevContextUnderstanding;

readonly artifacts:
        RiverDevContextArtifactBundle;

}

export interface RiverDevRunState {

    readonly version:
        RiverDevVersion;

    readonly runId:
        string;

    readonly command:
        RiverDevCommandName;

    readonly status:
        RiverDevRunStatus;

    readonly startedAt:
        string;

    readonly updatedAt:
        string;

    readonly repository:
        RiverDevRepositorySnapshot;

    readonly messages:
        readonly string[];

}


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
        | "pending"
        | "repaired"
        | "failed";

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
        "1.0.0";

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

export interface RiverDevStoredState {

    readonly version:
        RiverDevVersion;

    readonly activeRun:
        RiverDevRunState |
        null;

    readonly completedRuns:
        readonly RiverDevRunState[];

    readonly activeSession:
        RiverDevSessionState |
        null;

    readonly completedSessions:
        readonly RiverDevSessionState[];

}


export interface RiverDevStateStore {

    load():
        Promise<RiverDevStoredState>;

    save(
        state: RiverDevStoredState
    ): Promise<void>;

    beginRun(
        run: RiverDevRunState
    ): Promise<RiverDevStoredState>;

    updateRun(
        run: RiverDevRunState
    ): Promise<RiverDevStoredState>;

    completeRun(
        run: RiverDevRunState
    ): Promise<RiverDevStoredState>;

    clearActiveRun():
        Promise<RiverDevStoredState>;

    beginSession(
        session: RiverDevSessionState
    ): Promise<RiverDevStoredState>;

    updateSession(
        session: RiverDevSessionState
    ): Promise<RiverDevStoredState>;

    completeSession(
        session: RiverDevSessionState
    ): Promise<RiverDevStoredState>;

    clearActiveSession():
        Promise<RiverDevStoredState>;

}

