import type {
  RiverDevGovernedExecutorIntegrationAcceptedHandoffPackagingFoundationResult,
  RiverDevGovernedExecutorIntegrationPackagedHandoffVerificationFoundationResult
} from "../types";

const VERSION = "DEV-298" as const;

const SOURCE =
  "governed-executor-integration-packaged-handoff-verification-foundation-engine" as const;

const OBJECTIVE =
  "Verify an exact trusted DEV-297 governed executor integration accepted handoff package as inert decision data for a future admission boundary while preserving valid evidence continuity, containing rejected data, and granting zero downstream authority.";

export interface EvaluateGovernedExecutorIntegrationPackagedHandoffVerificationFoundationInput {
  readonly packaging:
    RiverDevGovernedExecutorIntegrationAcceptedHandoffPackagingFoundationResult;
}

export function evaluateGovernedExecutorIntegrationPackagedHandoffVerificationFoundation(
  input:
    EvaluateGovernedExecutorIntegrationPackagedHandoffVerificationFoundationInput
):
RiverDevGovernedExecutorIntegrationPackagedHandoffVerificationFoundationResult {
  const packaging =
    input.packaging;

  const blockedReasons: string[] =
    [];

  const packageVerificationEvidence: string[] =
    [];

  if (packaging.version !== "DEV-297") {
    blockedReasons.push(
      "DEV-297 packaging version is required."
    );
  } else {
    packageVerificationEvidence.push(
      "DEV-297 packaging version is exact."
    );
  }

  if (
    packaging.source !==
    "governed-executor-integration-accepted-handoff-packaging-foundation-engine"
  ) {
    blockedReasons.push(
      "DEV-297 packaging source is invalid."
    );
  } else {
    packageVerificationEvidence.push(
      "DEV-297 packaging source is exact."
    );
  }

  if (packaging.trusted !== true) {
    blockedReasons.push(
      "DEV-297 packaging must be trusted."
    );
  } else {
    packageVerificationEvidence.push(
      "DEV-297 packaging is trusted."
    );
  }

  if (packaging.ready !== true) {
    blockedReasons.push(
      "DEV-297 packaging must be ready."
    );
  } else {
    packageVerificationEvidence.push(
      "DEV-297 packaging is ready."
    );
  }

  if (packaging.packaged !== true) {
    blockedReasons.push(
      "DEV-297 handoff must be packaged."
    );
  } else {
    packageVerificationEvidence.push(
      "DEV-297 handoff is packaged."
    );
  }

  if (packaging.defaultPolicy !== "DENY") {
    blockedReasons.push(
      "DEV-297 packaging must remain DENY-by-default."
    );
  } else {
    packageVerificationEvidence.push(
      "DEV-297 default policy remains DENY."
    );
  }

  if (packaging.handoffPackagingOnly !== true) {
    blockedReasons.push(
      "DEV-297 must remain packaging-only."
    );
  } else {
    packageVerificationEvidence.push(
      "DEV-297 remains packaging-only."
    );
  }

  if (packaging.packageIsInertData !== true) {
    blockedReasons.push(
      "DEV-297 package must remain inert data."
    );
  } else {
    packageVerificationEvidence.push(
      "DEV-297 package remains inert data."
    );
  }

  if (
    packaging.futureDownstreamBoundaryRequired !==
    true
  ) {
    blockedReasons.push(
      "DEV-297 package must require a future downstream boundary."
    );
  } else {
    packageVerificationEvidence.push(
      "DEV-297 future downstream boundary requirement is preserved."
    );
  }

  if (
    packaging.packagingState !==
    "GOVERNED_EXECUTOR_INTEGRATION_ACCEPTED_HANDOFF_PACKAGE_READY"
  ) {
    blockedReasons.push(
      "DEV-297 packaging state must be ready."
    );
  } else {
    packageVerificationEvidence.push(
      "DEV-297 packaging state is ready."
    );
  }

  if (packaging.blockedReasons.length !== 0) {
    blockedReasons.push(
      "DEV-297 packaging must contain no blocked reasons."
    );
  } else {
    packageVerificationEvidence.push(
      "DEV-297 packaging contains no blocked reasons."
    );
  }

  const evidenceRequirements: readonly [
    readonly string[],
    string
  ][] = [
    [
      packaging.predecessorVerificationState,
      "DEV-297 predecessor verification state is required."
    ],
    [
      packaging.predecessorVerificationEvidence,
      "DEV-297 predecessor verification evidence is required."
    ],
    [
      packaging.predecessorAcceptanceEvidence,
      "DEV-297 predecessor acceptance evidence is required."
    ],
    [
      packaging.predecessorHandoffEvidence,
      "DEV-297 predecessor handoff evidence is required."
    ],
    [
      packaging.verificationEvidence,
      "DEV-297 verification evidence is required."
    ],
    [
      packaging.acceptanceEvidence,
      "DEV-297 acceptance evidence is required."
    ],
    [
      packaging.packagingEvidence,
      "DEV-297 packaging evidence is required."
    ]
  ];

  for (
    const [evidence, blockedReason] of
    evidenceRequirements
  ) {
    if (evidence.length === 0) {
      blockedReasons.push(blockedReason);
    }
  }

  if (
    packaging.mayCreateExecutionAuthorization !== false ||
    packaging.mayAuthorizeDownstreamAction !== false ||
    packaging.mayDispatch !== false ||
    packaging.mayInvokeExecutor !== false ||
    packaging.mayExecuteOperation !== false ||
    packaging.mayInvokeInspectionDependency !== false ||
    packaging.mayRetryExecution !== false ||
    packaging.mayPersistLifecycleState !== false ||
    packaging.mayModifyRepository !== false ||
    packaging.mayDeleteRepositoryContent !== false ||
    packaging.mayStageRepositoryChanges !== false ||
    packaging.mayCommit !== false ||
    packaging.mayPush !== false ||
    packaging.mayDeploy !== false ||
    packaging.mayAccessSecrets !== false ||
    packaging.mayExpandScope !== false ||
    packaging.mayPerformArbitraryShellExecution !== false ||
    packaging.mayPerformExternalSideEffects !== false
  ) {
    blockedReasons.push(
      "DEV-297 packaging grants prohibited authority."
    );
  } else {
    packageVerificationEvidence.push(
      "DEV-297 prohibited authorities remain denied."
    );
  }

  const verified =
    blockedReasons.length === 0;

  return {
    version: VERSION,
    source: SOURCE,
    objective: OBJECTIVE,

    trusted: verified,
    ready: verified,
    verified,

    defaultPolicy: "DENY",
    verificationOnly: true,
    verificationResultIsInertData: true,
    futureAdmissionBoundaryRequired: true,

    verificationState:
      verified
        ? "GOVERNED_EXECUTOR_INTEGRATION_PACKAGED_HANDOFF_VERIFIED"
        : "GOVERNED_EXECUTOR_INTEGRATION_PACKAGED_HANDOFF_VERIFICATION_BLOCKED",

    packaging,

    predecessorVerificationState:
      verified
        ? [...packaging.predecessorVerificationState]
        : [],

    predecessorVerificationEvidence:
      verified
        ? [...packaging.predecessorVerificationEvidence]
        : [],

    predecessorAcceptanceEvidence:
      verified
        ? [...packaging.predecessorAcceptanceEvidence]
        : [],

    predecessorHandoffEvidence:
      verified
        ? [...packaging.predecessorHandoffEvidence]
        : [],

    verificationEvidence:
      verified
        ? [...packaging.verificationEvidence]
        : [],

    acceptanceEvidence:
      verified
        ? [...packaging.acceptanceEvidence]
        : [],

    packagingEvidence:
      verified
        ? [...packaging.packagingEvidence]
        : [],

    packageVerificationEvidence:
      verified
        ? packageVerificationEvidence
        : [],

    blockedReasons,

    mayCreateExecutionAuthorization: false,
    mayAuthorizeDownstreamAction: false,
    mayDispatch: false,
    mayInvokeExecutor: false,
    mayExecuteOperation: false,
    mayInvokeInspectionDependency: false,
    mayRetryExecution: false,
    mayPersistLifecycleState: false,

    mayModifyRepository: false,
    mayDeleteRepositoryContent: false,
    mayStageRepositoryChanges: false,
    mayCommit: false,
    mayPush: false,
    mayDeploy: false,

    mayAccessSecrets: false,
    mayExpandScope: false,
    mayPerformArbitraryShellExecution: false,
    mayPerformExternalSideEffects: false
  };
}
