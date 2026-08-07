export const RIVER_DEV_VERSION =
    "0.1.0" as const;


export type RiverDevVersion =
    typeof RIVER_DEV_VERSION;


export type RiverDevCommandName =
    | "inspect"
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


export interface RiverDevStoredState {

    readonly version:
        RiverDevVersion;

    readonly activeRun:
        RiverDevRunState |
        null;

    readonly completedRuns:
        readonly RiverDevRunState[];

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

}











