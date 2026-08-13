import type {
  RiverDevGovernedExecutorIntegrationActiveAdmissionEnforcementFoundationResult,
  RiverDevGovernedExecutorIntegrationExecutorInvocationAuthorizationFoundationResult
} from "../types";

function nonEmpty(values: readonly string[]): boolean {
  return values.length > 0;
}

function authorityRemainsDenied(
  enforcement: RiverDevGovernedExecutorIntegrationActiveAdmissionEnforcementFoundationResult
): boolean {
  return (
    enforcement.mayCreateExecutionAuthorization === false &&
    enforcement.mayAuthorizeDownstreamAction === false &&
    enforcement.mayAdmitIntoActiveExecutor === false &&
    enforcement.mayActivateAdmission === false &&
    enforcement.mayDispatch === false &&
    enforcement.mayInvokeExecutor === false &&
    enforcement.mayExecuteOperation === false &&
    enforcement.mayInvokeInspectionDependency === false &&
    enforcement.mayRetryExecution === false &&
    enforcement.mayPersistLifecycleState === false &&
    enforcement.mayModifyRepository === false &&
    enforcement.mayDeleteRepositoryContent === false &&
    enforcement.mayStageRepositoryChanges === false &&
    enforcement.mayCommit === false &&
    enforcement.mayPush === false &&
    enforcement.mayDeploy === false &&
    enforcement.mayAccessSecrets === false &&
    enforcement.mayExpandScope === false &&
    enforcement.mayPerformArbitraryShellExecution === false &&
    enforcement.mayPerformNetworkExecution === false &&
    enforcement.mayPerformExternalSideEffects === false
  );
}

export function authorizeGovernedExecutorIntegrationExecutorInvocation(
  enforcement: RiverDevGovernedExecutorIntegrationActiveAdmissionEnforcementFoundationResult
): RiverDevGovernedExecutorIntegrationExecutorInvocationAuthorizationFoundationResult {
  const blockedReasons: string[] = [];

  if (enforcement.version !== "DEV-304") {
    blockedReasons.push("DEV-304 predecessor version is required.");
  }

  if (!enforcement.trusted) {
    blockedReasons.push("DEV-304 enforcement must be trusted.");
  }

  if (!enforcement.ready) {
    blockedReasons.push("DEV-304 enforcement must be ready.");
  }

  if (!enforcement.enforced) {
    blockedReasons.push("DEV-304 active admission must be enforced.");
  }

  if (enforcement.enforcementState !== "ACTIVE_ADMISSION_ENFORCED") {
    blockedReasons.push(
      "DEV-304 enforcement state must be ACTIVE_ADMISSION_ENFORCED."
    );
  }

  if (enforcement.defaultPolicy !== "DENY") {
    blockedReasons.push("Default policy must remain DENY.");
  }

  if (!enforcement.activeAdmissionEnforcementDecisionOnly) {
    blockedReasons.push(
      "DEV-304 must remain an active-admission enforcement decision only."
    );
  }

  if (!enforcement.enforcementResultIsInertData) {
    blockedReasons.push(
      "DEV-304 enforcement result must remain inert data."
    );
  }

  if (!enforcement.futureExecutorInvocationBoundaryRequired) {
    blockedReasons.push(
      "DEV-304 executor invocation boundary requirement must remain enabled."
    );
  }

  if (enforcement.blockedReasons.length !== 0) {
    blockedReasons.push("DEV-304 blocked reasons must be empty.");
  }

  if (enforcement.verification === null) {
    blockedReasons.push("DEV-303 verification lineage is required.");
  }

  const requiredEvidence: ReadonlyArray<readonly string[]> = [
    enforcement.predecessorVerificationState,
    enforcement.predecessorVerificationEvidence,
    enforcement.predecessorAcceptanceEvidence,
    enforcement.predecessorHandoffEvidence,
    enforcement.verificationEvidence,
    enforcement.acceptanceEvidence,
    enforcement.packagingEvidence,
    enforcement.packageVerificationEvidence,
    enforcement.admissionEvidence,
    enforcement.consumptionEvidence,
    enforcement.activeAdmissionEligibilityEvidence,
    enforcement.activeAdmissionAuthorizationEvidence,
    enforcement.activeAdmissionVerificationEvidence,
    enforcement.activeAdmissionEnforcementEvidence
  ];

  if (requiredEvidence.some(values => !nonEmpty(values))) {
    blockedReasons.push(
      "Complete DEV-304 lineage and evidence continuity is required."
    );
  }

  if (!authorityRemainsDenied(enforcement)) {
    blockedReasons.push(
      "DEV-304 must create zero inherited or downstream authority."
    );
  }

  const authorized =
    blockedReasons.length === 0;

  return {
    version: "DEV-305",
    source:
      "governed-executor-integration-executor-invocation-authorization-foundation-engine",
    objective:
      "Authorize an exact trusted DEV-304 active-admission enforcement result for a future separately governed executor invocation boundary without invoking an executor or creating dispatch, execution, mutation, network, secret, shell, or external-side-effect authority.",

    trusted: authorized,
    ready: authorized,
    authorized,

    defaultPolicy: "DENY",

    executorInvocationAuthorizationDecisionOnly: true,
    authorizationResultIsInertData: true,
    futureExecutorInvocationBoundaryRequired: true,

    authorizationState: authorized
      ? "EXECUTOR_INVOCATION_AUTHORIZED"
      : "EXECUTOR_INVOCATION_UNAUTHORIZED",

    enforcement: authorized
      ? enforcement
      : null,

    predecessorVerificationState: authorized
      ? [...enforcement.predecessorVerificationState]
      : [],

    predecessorVerificationEvidence: authorized
      ? [...enforcement.predecessorVerificationEvidence]
      : [],

    predecessorAcceptanceEvidence: authorized
      ? [...enforcement.predecessorAcceptanceEvidence]
      : [],

    predecessorHandoffEvidence: authorized
      ? [...enforcement.predecessorHandoffEvidence]
      : [],

    verificationEvidence: authorized
      ? [...enforcement.verificationEvidence]
      : [],

    acceptanceEvidence: authorized
      ? [...enforcement.acceptanceEvidence]
      : [],

    packagingEvidence: authorized
      ? [...enforcement.packagingEvidence]
      : [],

    packageVerificationEvidence: authorized
      ? [...enforcement.packageVerificationEvidence]
      : [],

    admissionEvidence: authorized
      ? [...enforcement.admissionEvidence]
      : [],

    consumptionEvidence: authorized
      ? [...enforcement.consumptionEvidence]
      : [],

    activeAdmissionEligibilityEvidence: authorized
      ? [...enforcement.activeAdmissionEligibilityEvidence]
      : [],

    activeAdmissionAuthorizationEvidence: authorized
      ? [...enforcement.activeAdmissionAuthorizationEvidence]
      : [],

    activeAdmissionVerificationEvidence: authorized
      ? [...enforcement.activeAdmissionVerificationEvidence]
      : [],

    activeAdmissionEnforcementEvidence: authorized
      ? [...enforcement.activeAdmissionEnforcementEvidence]
      : [],

    executorInvocationAuthorizationEvidence: authorized
      ? [
          ...enforcement.activeAdmissionEnforcementEvidence,
          "Exact DEV-304 active-admission enforcement predecessor validated.",
          "Executor invocation authorization decision created as inert data only.",
          "No executor has been invoked.",
          "No dispatch or operation execution authority has been granted.",
          "Future separately governed executor invocation boundary remains required."
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
