import type {
  RiverDevGovernedExecutorIntegrationActiveAdmissionAuthorizationFoundationResult,
  RiverDevGovernedExecutorIntegrationActiveAdmissionVerificationFoundationInput,
  RiverDevGovernedExecutorIntegrationActiveAdmissionVerificationFoundationResult,
} from "../types";

function nonEmpty(values: readonly string[]): boolean {
  return values.length > 0;
}

function authorityRemainsDenied(
  authorization: RiverDevGovernedExecutorIntegrationActiveAdmissionAuthorizationFoundationResult,
): boolean {
  return (
    authorization.mayCreateExecutionAuthorization === false &&
    authorization.mayAuthorizeDownstreamAction === false &&
    authorization.mayAdmitIntoActiveExecutor === false &&
    authorization.mayActivateAdmission === false &&
    authorization.mayDispatch === false &&
    authorization.mayInvokeExecutor === false &&
    authorization.mayExecuteOperation === false &&
    authorization.mayInvokeInspectionDependency === false &&
    authorization.mayRetryExecution === false &&
    authorization.mayPersistLifecycleState === false &&
    authorization.mayModifyRepository === false &&
    authorization.mayDeleteRepositoryContent === false &&
    authorization.mayStageRepositoryChanges === false &&
    authorization.mayCommit === false &&
    authorization.mayPush === false &&
    authorization.mayDeploy === false &&
    authorization.mayAccessSecrets === false &&
    authorization.mayExpandScope === false &&
    authorization.mayPerformArbitraryShellExecution === false &&
    authorization.mayPerformNetworkExecution === false &&
    authorization.mayPerformExternalSideEffects === false
  );
}

export function verifyGovernedExecutorIntegrationActiveAdmissionAuthorization(
  input: RiverDevGovernedExecutorIntegrationActiveAdmissionVerificationFoundationInput,
): RiverDevGovernedExecutorIntegrationActiveAdmissionVerificationFoundationResult {
  const authorization = input.activeAdmissionAuthorization;

  const blockedReasons: string[] = [];

  if (authorization.version !== "DEV-302") {
    blockedReasons.push("DEV-302 predecessor version is required.");
  }

  if (
    authorization.source !==
    "governed-executor-integration-active-admission-authorization-foundation-engine"
  ) {
    blockedReasons.push("DEV-302 predecessor source is invalid.");
  }

  if (!authorization.trusted) {
    blockedReasons.push("DEV-302 authorization must be trusted.");
  }

  if (!authorization.ready) {
    blockedReasons.push("DEV-302 authorization must be ready.");
  }

  if (!authorization.authorized) {
    blockedReasons.push("DEV-302 predecessor must be authorized.");
  }

  if (authorization.authorizationState !== "ACTIVE_ADMISSION_AUTHORIZED") {
    blockedReasons.push(
      "DEV-302 authorization state must be ACTIVE_ADMISSION_AUTHORIZED.",
    );
  }

  if (authorization.defaultPolicy !== "DENY") {
    blockedReasons.push("Default policy must remain DENY.");
  }

  if (!authorization.activeAdmissionAuthorizationDecisionOnly) {
    blockedReasons.push(
      "DEV-302 must remain an active-admission authorization decision only.",
    );
  }

  if (!authorization.authorizationResultIsInertData) {
    blockedReasons.push("DEV-302 authorization result must remain inert data.");
  }

  if (!authorization.futureActiveAdmissionBoundaryRequired) {
    blockedReasons.push(
      "DEV-302 future active-admission boundary requirement must remain enabled.",
    );
  }

  if (authorization.blockedReasons.length !== 0) {
    blockedReasons.push("DEV-302 blocked reasons must be empty.");
  }

  if (authorization.eligibility === null) {
    blockedReasons.push("DEV-301 eligibility lineage is required.");
  }

  if (authorization.consumption === null) {
    blockedReasons.push("DEV-300 consumption lineage is required.");
  }

  const requiredEvidence: ReadonlyArray<readonly string[]> = [
    authorization.predecessorVerificationState,
    authorization.predecessorVerificationEvidence,
    authorization.predecessorAcceptanceEvidence,
    authorization.predecessorHandoffEvidence,
    authorization.verificationEvidence,
    authorization.acceptanceEvidence,
    authorization.packagingEvidence,
    authorization.packageVerificationEvidence,
    authorization.admissionEvidence,
    authorization.consumptionEvidence,
    authorization.activeAdmissionEligibilityEvidence,
    authorization.activeAdmissionAuthorizationEvidence,
  ];

  if (requiredEvidence.some((values) => !nonEmpty(values))) {
    blockedReasons.push(
      "Complete DEV-302 lineage and evidence continuity is required.",
    );
  }

  if (!authorityRemainsDenied(authorization)) {
    blockedReasons.push(
      "DEV-302 must create zero inherited or downstream authority.",
    );
  }

  const verified = blockedReasons.length === 0;

  return {
    version: "DEV-303",
    source:
      "governed-executor-integration-active-admission-verification-foundation-engine",
    objective:
      "Verify an exact trusted DEV-302 active-admission authorization result while preserving the separately governed active-admission boundary and creating no admission, dispatch, execution, mutation, network, secret, shell, or external-side-effect authority.",

    trusted: verified,
    ready: verified,
    verified,

    defaultPolicy: "DENY",

    activeAdmissionVerificationDecisionOnly: true,
    verificationResultIsInertData: true,
    futureActiveAdmissionBoundaryRequired: true,

    verificationState: verified
      ? "ACTIVE_ADMISSION_AUTHORIZATION_VERIFIED"
      : "ACTIVE_ADMISSION_AUTHORIZATION_UNVERIFIED",

    authorization: verified ? authorization : null,

    predecessorVerificationState: verified
      ? [...authorization.predecessorVerificationState]
      : [],

    predecessorVerificationEvidence: verified
      ? [...authorization.predecessorVerificationEvidence]
      : [],

    predecessorAcceptanceEvidence: verified
      ? [...authorization.predecessorAcceptanceEvidence]
      : [],

    predecessorHandoffEvidence: verified
      ? [...authorization.predecessorHandoffEvidence]
      : [],

    verificationEvidence: verified
      ? [...authorization.verificationEvidence]
      : [],

    acceptanceEvidence: verified ? [...authorization.acceptanceEvidence] : [],

    packagingEvidence: verified ? [...authorization.packagingEvidence] : [],

    packageVerificationEvidence: verified
      ? [...authorization.packageVerificationEvidence]
      : [],

    admissionEvidence: verified ? [...authorization.admissionEvidence] : [],

    consumptionEvidence: verified ? [...authorization.consumptionEvidence] : [],

    activeAdmissionEligibilityEvidence: verified
      ? [...authorization.activeAdmissionEligibilityEvidence]
      : [],

    activeAdmissionAuthorizationEvidence: verified
      ? [...authorization.activeAdmissionAuthorizationEvidence]
      : [],

    activeAdmissionVerificationEvidence: verified
      ? [
          ...authorization.activeAdmissionAuthorizationEvidence,
          "Exact DEV-302 active-admission authorization predecessor validated.",
          "Active-admission authorization verification created as inert data only.",
          "No active-admission authority has been exercised.",
          "No dispatch, executor invocation, or execution authority has been granted.",
          "Future separately governed active-admission boundary remains required.",
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
