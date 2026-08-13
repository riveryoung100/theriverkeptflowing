import type {
  RiverDevGovernedExecutorIntegrationActiveAdmissionEnforcementFoundationInput,
  RiverDevGovernedExecutorIntegrationActiveAdmissionEnforcementFoundationResult,
  RiverDevGovernedExecutorIntegrationActiveAdmissionVerificationFoundationResult,
} from "../types";

function nonEmpty(values: readonly string[]): boolean {
  return values.length > 0;
}

function authorityRemainsDenied(
  verification: RiverDevGovernedExecutorIntegrationActiveAdmissionVerificationFoundationResult,
): boolean {
  return (
    verification.mayCreateExecutionAuthorization === false &&
    verification.mayAuthorizeDownstreamAction === false &&
    verification.mayAdmitIntoActiveExecutor === false &&
    verification.mayActivateAdmission === false &&
    verification.mayDispatch === false &&
    verification.mayInvokeExecutor === false &&
    verification.mayExecuteOperation === false &&
    verification.mayInvokeInspectionDependency === false &&
    verification.mayRetryExecution === false &&
    verification.mayPersistLifecycleState === false &&
    verification.mayModifyRepository === false &&
    verification.mayDeleteRepositoryContent === false &&
    verification.mayStageRepositoryChanges === false &&
    verification.mayCommit === false &&
    verification.mayPush === false &&
    verification.mayDeploy === false &&
    verification.mayAccessSecrets === false &&
    verification.mayExpandScope === false &&
    verification.mayPerformArbitraryShellExecution === false &&
    verification.mayPerformNetworkExecution === false &&
    verification.mayPerformExternalSideEffects === false
  );
}

export function enforceGovernedExecutorIntegrationActiveAdmission(
  input: RiverDevGovernedExecutorIntegrationActiveAdmissionEnforcementFoundationInput,
): RiverDevGovernedExecutorIntegrationActiveAdmissionEnforcementFoundationResult {
  const verification = input.activeAdmissionVerification;

  const blockedReasons: string[] = [];

  if (verification.version !== "DEV-303") {
    blockedReasons.push("DEV-303 predecessor version is required.");
  }

  if (
    verification.source !==
    "governed-executor-integration-active-admission-verification-foundation-engine"
  ) {
    blockedReasons.push("DEV-303 predecessor source is invalid.");
  }

  if (!verification.trusted) {
    blockedReasons.push("DEV-303 verification must be trusted.");
  }

  if (!verification.ready) {
    blockedReasons.push("DEV-303 verification must be ready.");
  }

  if (!verification.verified) {
    blockedReasons.push("DEV-303 predecessor must be verified.");
  }

  if (
    verification.verificationState !==
    "ACTIVE_ADMISSION_AUTHORIZATION_VERIFIED"
  ) {
    blockedReasons.push(
      "DEV-303 verification state must be ACTIVE_ADMISSION_AUTHORIZATION_VERIFIED.",
    );
  }

  if (verification.defaultPolicy !== "DENY") {
    blockedReasons.push("Default policy must remain DENY.");
  }

  if (!verification.activeAdmissionVerificationDecisionOnly) {
    blockedReasons.push(
      "DEV-303 must remain an active-admission verification decision only.",
    );
  }

  if (!verification.verificationResultIsInertData) {
    blockedReasons.push(
      "DEV-303 verification result must remain inert data.",
    );
  }

  if (!verification.futureActiveAdmissionBoundaryRequired) {
    blockedReasons.push(
      "DEV-303 future active-admission boundary requirement must remain enabled.",
    );
  }

  if (verification.blockedReasons.length !== 0) {
    blockedReasons.push("DEV-303 blocked reasons must be empty.");
  }

  if (verification.authorization === null) {
    blockedReasons.push("DEV-302 authorization lineage is required.");
  }

  const requiredEvidence: ReadonlyArray<readonly string[]> = [
    verification.predecessorVerificationState,
    verification.predecessorVerificationEvidence,
    verification.predecessorAcceptanceEvidence,
    verification.predecessorHandoffEvidence,
    verification.verificationEvidence,
    verification.acceptanceEvidence,
    verification.packagingEvidence,
    verification.packageVerificationEvidence,
    verification.admissionEvidence,
    verification.consumptionEvidence,
    verification.activeAdmissionEligibilityEvidence,
    verification.activeAdmissionAuthorizationEvidence,
    verification.activeAdmissionVerificationEvidence,
  ];

  if (requiredEvidence.some((values) => !nonEmpty(values))) {
    blockedReasons.push(
      "Complete DEV-303 lineage and evidence continuity is required.",
    );
  }

  if (!authorityRemainsDenied(verification)) {
    blockedReasons.push(
      "DEV-303 must create zero inherited or downstream authority.",
    );
  }

  const enforced = blockedReasons.length === 0;

  return {
    version: "DEV-304",
    source:
      "governed-executor-integration-active-admission-enforcement-foundation-engine",
    objective:
      "Enforce an exact trusted DEV-303 active-admission verification result while preserving enforcement as inert data and creating no dispatch, executor invocation, execution, mutation, network, secret, shell, or external-side-effect authority.",

    trusted: enforced,
    ready: enforced,
    enforced,

    defaultPolicy: "DENY",

    activeAdmissionEnforcementDecisionOnly: true,
    enforcementResultIsInertData: true,
    futureExecutorInvocationBoundaryRequired: true,

    enforcementState: enforced
      ? "ACTIVE_ADMISSION_ENFORCED"
      : "ACTIVE_ADMISSION_REJECTED",

    verification: enforced ? verification : null,

    predecessorVerificationState: verification.predecessorVerificationState,
    predecessorVerificationEvidence:
      verification.predecessorVerificationEvidence,
    predecessorAcceptanceEvidence:
      verification.predecessorAcceptanceEvidence,
    predecessorHandoffEvidence:
      verification.predecessorHandoffEvidence,
    verificationEvidence: verification.verificationEvidence,
    acceptanceEvidence: verification.acceptanceEvidence,
    packagingEvidence: verification.packagingEvidence,
    packageVerificationEvidence:
      verification.packageVerificationEvidence,
    admissionEvidence: verification.admissionEvidence,
    consumptionEvidence: verification.consumptionEvidence,
    activeAdmissionEligibilityEvidence:
      verification.activeAdmissionEligibilityEvidence,
    activeAdmissionAuthorizationEvidence:
      verification.activeAdmissionAuthorizationEvidence,
    activeAdmissionVerificationEvidence:
      verification.activeAdmissionVerificationEvidence,

    activeAdmissionEnforcementEvidence: enforced
      ? [
          "Active-admission enforcement boundary satisfied.",
          "DEV-303 verification lineage accepted without authority escalation.",
          "Active-admission enforcement created as inert data only.",
          "No dispatch, executor invocation, or execution authority has been granted.",
          "Future separately governed executor invocation boundary remains required.",
        ]
      : [],

    blockedReasons,

    mayCreateExecutionAuthorization: false,
    mayAuthorizeDownstreamAction: false,
    mayAdmitIntoActiveExecutor: false,
    mayActivateAdmission: false,
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
    mayPerformNetworkExecution: false,
    mayPerformExternalSideEffects: false,
  };
}
