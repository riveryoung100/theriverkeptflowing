import type {
  RiverDevGovernedExecutorIntegrationPackagedHandoffVerificationFoundationResult,
  RiverDevGovernedExecutorIntegrationVerifiedPackageDownstreamAdmissionFoundationResult
} from "../types";

const VERSION = "DEV-299" as const;

const SOURCE =
  "governed-executor-integration-verified-package-downstream-admission-foundation-engine" as const;

const OBJECTIVE =
  "Determine downstream admission eligibility for an exact trusted DEV-298 governed executor integration packaged-handoff verification result while preserving evidence continuity, containing rejected data, remaining inert, and granting zero execution or repository authority.";

export interface EvaluateGovernedExecutorIntegrationVerifiedPackageDownstreamAdmissionFoundationInput {
  readonly verification:
    RiverDevGovernedExecutorIntegrationPackagedHandoffVerificationFoundationResult;
}

export function evaluateGovernedExecutorIntegrationVerifiedPackageDownstreamAdmissionFoundation(
  input:
    EvaluateGovernedExecutorIntegrationVerifiedPackageDownstreamAdmissionFoundationInput
):
RiverDevGovernedExecutorIntegrationVerifiedPackageDownstreamAdmissionFoundationResult {
  const verification =
    input.verification;

  const blockedReasons: string[] =
    [];

  const admissionEvidence: string[] =
    [];

  if (verification.version !== "DEV-298") {
    blockedReasons.push(
      "DEV-298 verification version is required."
    );
  } else {
    admissionEvidence.push(
      "DEV-298 verification version is exact."
    );
  }

  if (
    verification.source !==
    "governed-executor-integration-packaged-handoff-verification-foundation-engine"
  ) {
    blockedReasons.push(
      "DEV-298 verification source is invalid."
    );
  } else {
    admissionEvidence.push(
      "DEV-298 verification source is exact."
    );
  }

  if (verification.trusted !== true) {
    blockedReasons.push(
      "DEV-298 verification must be trusted."
    );
  } else {
    admissionEvidence.push(
      "DEV-298 verification is trusted."
    );
  }

  if (verification.ready !== true) {
    blockedReasons.push(
      "DEV-298 verification must be ready."
    );
  } else {
    admissionEvidence.push(
      "DEV-298 verification is ready."
    );
  }

  if (verification.verified !== true) {
    blockedReasons.push(
      "DEV-298 package must be verified."
    );
  } else {
    admissionEvidence.push(
      "DEV-298 package is verified."
    );
  }

  if (verification.defaultPolicy !== "DENY") {
    blockedReasons.push(
      "DEV-298 verification must remain DENY-by-default."
    );
  } else {
    admissionEvidence.push(
      "DEV-298 default policy remains DENY."
    );
  }

  if (verification.verificationOnly !== true) {
    blockedReasons.push(
      "DEV-298 must remain verification-only."
    );
  } else {
    admissionEvidence.push(
      "DEV-298 remains verification-only."
    );
  }

  if (
    verification.verificationResultIsInertData !==
    true
  ) {
    blockedReasons.push(
      "DEV-298 verification result must remain inert data."
    );
  } else {
    admissionEvidence.push(
      "DEV-298 verification result remains inert data."
    );
  }

  if (
    verification.futureAdmissionBoundaryRequired !==
    true
  ) {
    blockedReasons.push(
      "DEV-298 must require a future admission boundary."
    );
  } else {
    admissionEvidence.push(
      "DEV-298 admission-boundary requirement is preserved."
    );
  }

  if (
    verification.verificationState !==
    "GOVERNED_EXECUTOR_INTEGRATION_PACKAGED_HANDOFF_VERIFIED"
  ) {
    blockedReasons.push(
      "DEV-298 verification state must be verified."
    );
  } else {
    admissionEvidence.push(
      "DEV-298 verification state is verified."
    );
  }

  if (verification.blockedReasons.length !== 0) {
    blockedReasons.push(
      "DEV-298 verification must contain no blocked reasons."
    );
  } else {
    admissionEvidence.push(
      "DEV-298 verification contains no blocked reasons."
    );
  }

  const evidenceRequirements: readonly [
    readonly string[],
    string
  ][] = [
    [
      verification.predecessorVerificationState,
      "DEV-298 predecessor verification state is required."
    ],
    [
      verification.predecessorVerificationEvidence,
      "DEV-298 predecessor verification evidence is required."
    ],
    [
      verification.predecessorAcceptanceEvidence,
      "DEV-298 predecessor acceptance evidence is required."
    ],
    [
      verification.predecessorHandoffEvidence,
      "DEV-298 predecessor handoff evidence is required."
    ],
    [
      verification.verificationEvidence,
      "DEV-298 verification evidence is required."
    ],
    [
      verification.acceptanceEvidence,
      "DEV-298 acceptance evidence is required."
    ],
    [
      verification.packagingEvidence,
      "DEV-298 packaging evidence is required."
    ],
    [
      verification.packageVerificationEvidence,
      "DEV-298 package verification evidence is required."
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
    verification.mayCreateExecutionAuthorization !== false ||
    verification.mayAuthorizeDownstreamAction !== false ||
    verification.mayDispatch !== false ||
    verification.mayInvokeExecutor !== false ||
    verification.mayExecuteOperation !== false ||
    verification.mayInvokeInspectionDependency !== false ||
    verification.mayRetryExecution !== false ||
    verification.mayPersistLifecycleState !== false ||
    verification.mayModifyRepository !== false ||
    verification.mayDeleteRepositoryContent !== false ||
    verification.mayStageRepositoryChanges !== false ||
    verification.mayCommit !== false ||
    verification.mayPush !== false ||
    verification.mayDeploy !== false ||
    verification.mayAccessSecrets !== false ||
    verification.mayExpandScope !== false ||
    verification.mayPerformArbitraryShellExecution !== false ||
    verification.mayPerformExternalSideEffects !== false
  ) {
    blockedReasons.push(
      "DEV-298 verification grants prohibited authority."
    );
  } else {
    admissionEvidence.push(
      "DEV-298 prohibited authorities remain denied."
    );
  }

  const admissionEligible =
    blockedReasons.length === 0;

  return {
    version: VERSION,
    source: SOURCE,
    objective: OBJECTIVE,

    trusted: admissionEligible,
    ready: admissionEligible,
    admissionEligible,

    defaultPolicy: "DENY",
    downstreamAdmissionEligibilityOnly: true,
    admissionResultIsInertData: true,
    futureDownstreamAdmissionConsumptionBoundaryRequired: true,

    admissionState:
      admissionEligible
        ? "GOVERNED_EXECUTOR_INTEGRATION_VERIFIED_PACKAGE_ADMISSION_ELIGIBLE"
        : "GOVERNED_EXECUTOR_INTEGRATION_VERIFIED_PACKAGE_ADMISSION_BLOCKED",

    verification,

    predecessorVerificationState:
      admissionEligible
        ? [...verification.predecessorVerificationState]
        : [],

    predecessorVerificationEvidence:
      admissionEligible
        ? [...verification.predecessorVerificationEvidence]
        : [],

    predecessorAcceptanceEvidence:
      admissionEligible
        ? [...verification.predecessorAcceptanceEvidence]
        : [],

    predecessorHandoffEvidence:
      admissionEligible
        ? [...verification.predecessorHandoffEvidence]
        : [],

    verificationEvidence:
      admissionEligible
        ? [...verification.verificationEvidence]
        : [],

    acceptanceEvidence:
      admissionEligible
        ? [...verification.acceptanceEvidence]
        : [],

    packagingEvidence:
      admissionEligible
        ? [...verification.packagingEvidence]
        : [],

    packageVerificationEvidence:
      admissionEligible
        ? [...verification.packageVerificationEvidence]
        : [],

    admissionEvidence:
      admissionEligible
        ? admissionEvidence
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
