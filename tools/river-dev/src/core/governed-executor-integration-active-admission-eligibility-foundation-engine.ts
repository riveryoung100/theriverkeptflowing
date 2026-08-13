import type {
  RiverDevGovernedExecutorIntegrationActiveAdmissionEligibilityFoundationResult,
  RiverDevGovernedExecutorIntegrationVerifiedPackageDownstreamAdmissionConsumptionFoundationResult
} from "../types";

function nonEmpty(values: readonly string[]): boolean {
  return values.length > 0;
}

function authorityRemainsDenied(
  consumption: RiverDevGovernedExecutorIntegrationVerifiedPackageDownstreamAdmissionConsumptionFoundationResult
): boolean {
  return (
    consumption.mayCreateExecutionAuthorization === false &&
    consumption.mayAuthorizeDownstreamAction === false &&
    consumption.mayAdmitIntoActiveExecutor === false &&
    consumption.mayActivateAdmission === false &&
    consumption.mayDispatch === false &&
    consumption.mayInvokeExecutor === false &&
    consumption.mayExecuteOperation === false &&
    consumption.mayInvokeInspectionDependency === false &&
    consumption.mayRetryExecution === false &&
    consumption.mayPersistLifecycleState === false &&
    consumption.mayModifyRepository === false &&
    consumption.mayDeleteRepositoryContent === false &&
    consumption.mayStageRepositoryChanges === false &&
    consumption.mayCommit === false &&
    consumption.mayPush === false &&
    consumption.mayDeploy === false &&
    consumption.mayAccessSecrets === false &&
    consumption.mayExpandScope === false &&
    consumption.mayPerformArbitraryShellExecution === false &&
    consumption.mayPerformNetworkExecution === false &&
    consumption.mayPerformExternalSideEffects === false
  );
}

export function evaluateGovernedExecutorIntegrationActiveAdmissionEligibility(
  consumption: RiverDevGovernedExecutorIntegrationVerifiedPackageDownstreamAdmissionConsumptionFoundationResult
): RiverDevGovernedExecutorIntegrationActiveAdmissionEligibilityFoundationResult {
  const blockedReasons: string[] = [];

  if (consumption.version !== "DEV-300") {
    blockedReasons.push("DEV-300 predecessor version is required.");
  }

  if (!consumption.trusted) {
    blockedReasons.push("DEV-300 consumption must be trusted.");
  }

  if (!consumption.ready) {
    blockedReasons.push("DEV-300 consumption must be ready.");
  }

  if (!consumption.consumed) {
    blockedReasons.push("DEV-300 package must be consumed.");
  }

  if (
    consumption.consumptionState !==
    "GOVERNED_EXECUTOR_INTEGRATION_VERIFIED_PACKAGE_ADMISSION_CONSUMPTION_ACCEPTED"
  ) {
    blockedReasons.push(
      "DEV-300 consumption state must be the exact accepted state."
    );
  }

  if (consumption.defaultPolicy !== "DENY") {
    blockedReasons.push("Default policy must remain DENY.");
  }

  if (!consumption.admissionConsumptionDecisionOnly) {
    blockedReasons.push(
      "DEV-300 must remain an admission-consumption decision only."
    );
  }

  if (!consumption.consumptionResultIsInertData) {
    blockedReasons.push("DEV-300 consumption result must remain inert data.");
  }

  if (!consumption.futureActiveAdmissionEligibilityBoundaryRequired) {
    blockedReasons.push(
      "DEV-300 active-admission eligibility boundary requirement must remain enabled."
    );
  }

  if (consumption.blockedReasons.length !== 0) {
    blockedReasons.push("DEV-300 blocked reasons must be empty.");
  }

  if (!nonEmpty(consumption.predecessorVerificationState)) {
    blockedReasons.push("Predecessor verification state is required.");
  }

  if (!nonEmpty(consumption.predecessorVerificationEvidence)) {
    blockedReasons.push("Predecessor verification evidence is required.");
  }

  if (!nonEmpty(consumption.predecessorAcceptanceEvidence)) {
    blockedReasons.push("Predecessor acceptance evidence is required.");
  }

  if (!nonEmpty(consumption.predecessorHandoffEvidence)) {
    blockedReasons.push("Predecessor handoff evidence is required.");
  }

  if (!nonEmpty(consumption.verificationEvidence)) {
    blockedReasons.push("Verification evidence is required.");
  }

  if (!nonEmpty(consumption.acceptanceEvidence)) {
    blockedReasons.push("Acceptance evidence is required.");
  }

  if (!nonEmpty(consumption.packagingEvidence)) {
    blockedReasons.push("Packaging evidence is required.");
  }

  if (!nonEmpty(consumption.packageVerificationEvidence)) {
    blockedReasons.push("Package verification evidence is required.");
  }

  if (!nonEmpty(consumption.admissionEvidence)) {
    blockedReasons.push("Admission evidence is required.");
  }

  if (!nonEmpty(consumption.consumptionEvidence)) {
    blockedReasons.push("Consumption evidence is required.");
  }

  if (!authorityRemainsDenied(consumption)) {
    blockedReasons.push(
      "DEV-300 must create zero inherited or downstream authority."
    );
  }

  const eligible =
    blockedReasons.length === 0;

  return {
    version: "DEV-301",
    source:
      "governed-executor-integration-active-admission-eligibility-foundation-engine",
    objective:
      "Determine whether an exact trusted DEV-300 inert consumption result is eligible for a future separately governed active-admission authorization boundary without creating authorization or execution authority.",
    trusted: eligible,
    ready: eligible,
    eligible,
    defaultPolicy: "DENY",
    activeAdmissionEligibilityDecisionOnly: true,
    eligibilityResultIsInertData: true,
    futureActiveAdmissionAuthorizationBoundaryRequired: true,
    eligibilityState: eligible
      ? "ACTIVE_ADMISSION_ELIGIBLE"
      : "ACTIVE_ADMISSION_INELIGIBLE",
    consumption: eligible
      ? consumption
      : null,
    predecessorVerificationState: eligible
      ? [...consumption.predecessorVerificationState]
      : [],
    predecessorVerificationEvidence: eligible
      ? [...consumption.predecessorVerificationEvidence]
      : [],
    predecessorAcceptanceEvidence: eligible
      ? [...consumption.predecessorAcceptanceEvidence]
      : [],
    predecessorHandoffEvidence: eligible
      ? [...consumption.predecessorHandoffEvidence]
      : [],
    verificationEvidence: eligible
      ? [...consumption.verificationEvidence]
      : [],
    acceptanceEvidence: eligible
      ? [...consumption.acceptanceEvidence]
      : [],
    packagingEvidence: eligible
      ? [...consumption.packagingEvidence]
      : [],
    packageVerificationEvidence: eligible
      ? [...consumption.packageVerificationEvidence]
      : [],
    admissionEvidence: eligible
      ? [...consumption.admissionEvidence]
      : [],
    consumptionEvidence: eligible
      ? [...consumption.consumptionEvidence]
      : [],
    activeAdmissionEligibilityEvidence: eligible
      ? [
          "Exact DEV-300 predecessor validated.",
          "Trusted consumed inert package validated.",
          "Evidence and provenance continuity validated.",
          "Blocked predecessor state absent.",
          "All authorization and execution authorities remain denied.",
          "Eligible only for a future separately governed active-admission authorization boundary."
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