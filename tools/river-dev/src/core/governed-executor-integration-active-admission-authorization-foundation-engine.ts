import type {
  RiverDevGovernedExecutorIntegrationActiveAdmissionAuthorizationFoundationResult,
  RiverDevGovernedExecutorIntegrationActiveAdmissionEligibilityFoundationResult
} from "../types";

function nonEmpty(values: readonly string[]): boolean {
  return values.length > 0;
}

function authorityRemainsDenied(
  eligibility: RiverDevGovernedExecutorIntegrationActiveAdmissionEligibilityFoundationResult
): boolean {
  return (
    eligibility.mayCreateExecutionAuthorization === false &&
    eligibility.mayAuthorizeDownstreamAction === false &&
    eligibility.mayAdmitIntoActiveExecutor === false &&
    eligibility.mayActivateAdmission === false &&
    eligibility.mayDispatch === false &&
    eligibility.mayInvokeExecutor === false &&
    eligibility.mayExecuteOperation === false &&
    eligibility.mayInvokeInspectionDependency === false &&
    eligibility.mayRetryExecution === false &&
    eligibility.mayPersistLifecycleState === false &&
    eligibility.mayModifyRepository === false &&
    eligibility.mayDeleteRepositoryContent === false &&
    eligibility.mayStageRepositoryChanges === false &&
    eligibility.mayCommit === false &&
    eligibility.mayPush === false &&
    eligibility.mayDeploy === false &&
    eligibility.mayAccessSecrets === false &&
    eligibility.mayExpandScope === false &&
    eligibility.mayPerformArbitraryShellExecution === false &&
    eligibility.mayPerformNetworkExecution === false &&
    eligibility.mayPerformExternalSideEffects === false
  );
}

export function authorizeGovernedExecutorIntegrationActiveAdmission(
  eligibility: RiverDevGovernedExecutorIntegrationActiveAdmissionEligibilityFoundationResult
): RiverDevGovernedExecutorIntegrationActiveAdmissionAuthorizationFoundationResult {
  const blockedReasons: string[] = [];

  if (eligibility.version !== "DEV-301") {
    blockedReasons.push("DEV-301 predecessor version is required.");
  }

  if (!eligibility.trusted) {
    blockedReasons.push("DEV-301 eligibility must be trusted.");
  }

  if (!eligibility.ready) {
    blockedReasons.push("DEV-301 eligibility must be ready.");
  }

  if (!eligibility.eligible) {
    blockedReasons.push("DEV-301 predecessor must be eligible.");
  }

  if (eligibility.eligibilityState !== "ACTIVE_ADMISSION_ELIGIBLE") {
    blockedReasons.push(
      "DEV-301 eligibility state must be ACTIVE_ADMISSION_ELIGIBLE."
    );
  }

  if (eligibility.defaultPolicy !== "DENY") {
    blockedReasons.push("Default policy must remain DENY.");
  }

  if (!eligibility.activeAdmissionEligibilityDecisionOnly) {
    blockedReasons.push(
      "DEV-301 must remain an active-admission eligibility decision only."
    );
  }

  if (!eligibility.eligibilityResultIsInertData) {
    blockedReasons.push("DEV-301 eligibility result must remain inert data.");
  }

  if (!eligibility.futureActiveAdmissionAuthorizationBoundaryRequired) {
    blockedReasons.push(
      "DEV-301 active-admission authorization boundary requirement must remain enabled."
    );
  }

  if (eligibility.blockedReasons.length !== 0) {
    blockedReasons.push("DEV-301 blocked reasons must be empty.");
  }

  if (eligibility.consumption === null) {
    blockedReasons.push("DEV-300 consumption lineage is required.");
  }

  const requiredEvidence: ReadonlyArray<
    readonly string[]
  > = [
    eligibility.predecessorVerificationState,
    eligibility.predecessorVerificationEvidence,
    eligibility.predecessorAcceptanceEvidence,
    eligibility.predecessorHandoffEvidence,
    eligibility.verificationEvidence,
    eligibility.acceptanceEvidence,
    eligibility.packagingEvidence,
    eligibility.packageVerificationEvidence,
    eligibility.admissionEvidence,
    eligibility.consumptionEvidence,
    eligibility.activeAdmissionEligibilityEvidence
  ];

  if (requiredEvidence.some(values => !nonEmpty(values))) {
    blockedReasons.push(
      "Complete DEV-301 lineage and evidence continuity is required."
    );
  }

  if (!authorityRemainsDenied(eligibility)) {
    blockedReasons.push(
      "DEV-301 must create zero inherited or downstream authority."
    );
  }

  const authorized =
    blockedReasons.length === 0;

  return {
    version: "DEV-302",
    source:
      "governed-executor-integration-active-admission-authorization-foundation-engine",
    objective:
      "Authorize an exact trusted DEV-301 active-admission eligibility result for a future separately governed active-admission boundary without creating admission, dispatch, execution, mutation, network, secret, shell, or external-side-effect authority.",
    trusted: authorized,
    ready: authorized,
    authorized,
    defaultPolicy: "DENY",
    activeAdmissionAuthorizationDecisionOnly: true,
    authorizationResultIsInertData: true,
    futureActiveAdmissionBoundaryRequired: true,
    authorizationState: authorized
      ? "ACTIVE_ADMISSION_AUTHORIZED"
      : "ACTIVE_ADMISSION_UNAUTHORIZED",
    eligibility: authorized
      ? eligibility
      : null,
    consumption: authorized
      ? eligibility.consumption
      : null,
    predecessorVerificationState: authorized
      ? [...eligibility.predecessorVerificationState]
      : [],
    predecessorVerificationEvidence: authorized
      ? [...eligibility.predecessorVerificationEvidence]
      : [],
    predecessorAcceptanceEvidence: authorized
      ? [...eligibility.predecessorAcceptanceEvidence]
      : [],
    predecessorHandoffEvidence: authorized
      ? [...eligibility.predecessorHandoffEvidence]
      : [],
    verificationEvidence: authorized
      ? [...eligibility.verificationEvidence]
      : [],
    acceptanceEvidence: authorized
      ? [...eligibility.acceptanceEvidence]
      : [],
    packagingEvidence: authorized
      ? [...eligibility.packagingEvidence]
      : [],
    packageVerificationEvidence: authorized
      ? [...eligibility.packageVerificationEvidence]
      : [],
    admissionEvidence: authorized
      ? [...eligibility.admissionEvidence]
      : [],
    consumptionEvidence: authorized
      ? [...eligibility.consumptionEvidence]
      : [],
    activeAdmissionEligibilityEvidence: authorized
      ? [...eligibility.activeAdmissionEligibilityEvidence]
      : [],
    activeAdmissionAuthorizationEvidence: authorized
      ? [
          ...eligibility.activeAdmissionEligibilityEvidence,
          "Exact DEV-301 active-admission eligibility predecessor validated.",
          "Active-admission authorization decision created as inert data only.",
          "No active-admission authority has been exercised.",
          "No dispatch, executor invocation, or execution authority has been granted.",
          "Future separately governed active-admission boundary remains required."
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
    mayPerformExternalSideEffects: false
  };
}
