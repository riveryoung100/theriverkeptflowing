import type {
  RiverDevControlledExecutorActiveAdmissionEligibilityFoundationResult,
  RiverDevControlledExecutorVerifiedPackageDownstreamAdmissionConsumptionFoundationResult
} from "../types";

const VERSION = "DEV-267" as const;
const DEFAULT_POLICY = "DENY" as const;

const REQUIRED_CONSUMPTION_STATE =
  "ADMISSION_CONSUMPTION_ACCEPTED" as const;

const ELIGIBLE_STATE =
  "ACTIVE_ADMISSION_ELIGIBLE" as const;

const INELIGIBLE_STATE =
  "ACTIVE_ADMISSION_INELIGIBLE" as const;

function nonEmpty(values: readonly string[]): boolean {
  return values.length > 0;
}

export function evaluateControlledExecutorActiveAdmissionEligibility(
  consumption:
    RiverDevControlledExecutorVerifiedPackageDownstreamAdmissionConsumptionFoundationResult
): RiverDevControlledExecutorActiveAdmissionEligibilityFoundationResult {
  const blockedReasons: string[] = [];

  if (consumption.version !== "DEV-266") {
    blockedReasons.push("DEV-266 consumption version is required.");
  }

  if (!consumption.trusted) {
    blockedReasons.push("Consumption result must be trusted.");
  }

  if (!consumption.ready) {
    blockedReasons.push("Consumption result must be ready.");
  }

  if (!consumption.consumable) {
    blockedReasons.push("Consumption result must be consumable.");
  }

  if (consumption.defaultPolicy !== DEFAULT_POLICY) {
    blockedReasons.push("Consumption result must remain DENY by default.");
  }

  if (!consumption.admissionConsumptionDecisionOnly) {
    blockedReasons.push(
      "Consumption result must remain admission-consumption-decision-only."
    );
  }

  if (!consumption.consumptionResultIsInertData) {
    blockedReasons.push("Consumption result must remain inert data.");
  }

  if (consumption.consumptionState !== REQUIRED_CONSUMPTION_STATE) {
    blockedReasons.push(
      "Accepted DEV-266 admission consumption state is required."
    );
  }

  if (consumption.admission === null) {
    blockedReasons.push("Preserved DEV-265 admission result is required.");
  }

  if (consumption.receiptState === null) {
    blockedReasons.push("Receipt state is required.");
  }

  if (consumption.executedOperation === null) {
    blockedReasons.push("Executed operation lineage is required.");
  }

  if (!nonEmpty(consumption.approvedExecutionScope)) {
    blockedReasons.push("Approved execution scope is required.");
  }

  if (!nonEmpty(consumption.provenance)) {
    blockedReasons.push("Provenance is required.");
  }

  if (!nonEmpty(consumption.authorizationBoundaries)) {
    blockedReasons.push("Authorization boundaries are required.");
  }

  if (!nonEmpty(consumption.scopeBoundaries)) {
    blockedReasons.push("Scope boundaries are required.");
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

  if (consumption.blockedReasons.length > 0) {
    blockedReasons.push(
      "DEV-266 consumption result contains blocking reasons."
    );
  }

  const prohibitedAuthorities = [
    consumption.mayCreateExecutionAuthorization,
    consumption.mayAuthorizeDownstreamAction,
    consumption.mayAdmitIntoActiveExecutor,
    consumption.mayActivateAdmission,
    consumption.mayDispatch,
    consumption.mayInvokeExecutor,
    consumption.mayExecuteOperation,
    consumption.mayInvokeInspectionDependency,
    consumption.mayRetryExecution,
    consumption.mayPersistLifecycleState,
    consumption.mayModifyRepository,
    consumption.mayDeleteRepositoryContent,
    consumption.mayStageRepositoryChanges,
    consumption.mayCommit,
    consumption.mayPush,
    consumption.mayDeploy,
    consumption.mayAccessSecrets,
    consumption.mayExpandScope,
    consumption.mayPerformArbitraryShellExecution,
    consumption.mayPerformExternalSideEffects
  ];

  if (prohibitedAuthorities.some(Boolean)) {
    blockedReasons.push(
      "DEV-266 consumption result grants prohibited authority."
    );
  }

  if (!consumption.futureActiveAdmissionBoundaryRequired) {
    blockedReasons.push(
      "Future active-admission boundary requirement must remain enabled."
    );
  }

  const eligible = blockedReasons.length === 0;

  return {
    version: VERSION,
    trusted: eligible,
    ready: eligible,
    eligible,
    defaultPolicy: DEFAULT_POLICY,
    activeAdmissionEligibilityDecisionOnly: true,
    eligibilityResultIsInertData: true,
    eligibilityState: eligible
      ? ELIGIBLE_STATE
      : INELIGIBLE_STATE,
    consumption: eligible ? consumption : null,
    receiptState: eligible ? consumption.receiptState : null,
    executedOperation: eligible ? consumption.executedOperation : null,
    approvedExecutionScope: eligible
      ? [...consumption.approvedExecutionScope]
      : [],
    provenance: eligible ? [...consumption.provenance] : [],
    authorizationBoundaries: eligible
      ? [...consumption.authorizationBoundaries]
      : [],
    scopeBoundaries: eligible
      ? [...consumption.scopeBoundaries]
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
          "DEV-266 consumption identity validated.",
          "Accepted inert admission consumption validated.",
          "Preserved admission lineage validated.",
          "Receipt and operation lineage validated.",
          "Approved execution scope validated.",
          "Provenance and authority boundaries validated.",
          "Verification and lifecycle evidence validated.",
          "All active and execution authorities remain denied.",
          "Future active-admission boundary remains required."
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
    mayPerformExternalSideEffects: false,
    futureActiveAdmissionBoundaryRequired: true
  };
}
