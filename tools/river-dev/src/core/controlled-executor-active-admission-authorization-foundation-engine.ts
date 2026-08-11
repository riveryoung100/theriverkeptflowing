import type {
  RiverDevControlledExecutorActiveAdmissionAuthorizationFoundationResult,
  RiverDevControlledExecutorActiveAdmissionEligibilityFoundationResult
} from "../types";

const VERSION = "DEV-268" as const;
const DEFAULT_POLICY = "DENY" as const;

function hasValues(
  values: readonly string[]
): boolean {
  return values.length > 0;
}

function predecessorAuthoritiesRemainDenied(
  value: RiverDevControlledExecutorActiveAdmissionEligibilityFoundationResult
): boolean {
  return (
    value.mayCreateExecutionAuthorization === false &&
    value.mayAuthorizeDownstreamAction === false &&
    value.mayAdmitIntoActiveExecutor === false &&
    value.mayActivateAdmission === false &&
    value.mayDispatch === false &&
    value.mayInvokeExecutor === false &&
    value.mayExecuteOperation === false &&
    value.mayInvokeInspectionDependency === false &&
    value.mayRetryExecution === false &&
    value.mayPersistLifecycleState === false &&
    value.mayModifyRepository === false &&
    value.mayDeleteRepositoryContent === false &&
    value.mayStageRepositoryChanges === false &&
    value.mayCommit === false &&
    value.mayPush === false &&
    value.mayDeploy === false &&
    value.mayAccessSecrets === false &&
    value.mayExpandScope === false &&
    value.mayPerformArbitraryShellExecution === false &&
    value.mayPerformExternalSideEffects === false
  );
}

export function buildControlledExecutorActiveAdmissionAuthorizationFoundation(
  value: RiverDevControlledExecutorActiveAdmissionEligibilityFoundationResult
): RiverDevControlledExecutorActiveAdmissionAuthorizationFoundationResult {
  const blockedReasons: string[] = [];

  if (value.version !== "DEV-267") {
    blockedReasons.push("INVALID_PREDECESSOR_VERSION");
  }

  if (value.trusted !== true) {
    blockedReasons.push("PREDECESSOR_NOT_TRUSTED");
  }

  if (value.ready !== true) {
    blockedReasons.push("PREDECESSOR_NOT_READY");
  }

  if (value.eligible !== true) {
    blockedReasons.push("PREDECESSOR_NOT_ELIGIBLE");
  }

  if (value.defaultPolicy !== DEFAULT_POLICY) {
    blockedReasons.push("INVALID_DEFAULT_POLICY");
  }

  if (
    value.activeAdmissionEligibilityDecisionOnly !== true
  ) {
    blockedReasons.push(
      "PREDECESSOR_NOT_ELIGIBILITY_DECISION_ONLY"
    );
  }

  if (
    value.eligibilityResultIsInertData !== true
  ) {
    blockedReasons.push(
      "PREDECESSOR_RESULT_NOT_INERT"
    );
  }

  if (
    value.eligibilityState !==
    "ACTIVE_ADMISSION_ELIGIBLE"
  ) {
    blockedReasons.push(
      "PREDECESSOR_NOT_ACTIVE_ADMISSION_ELIGIBLE"
    );
  }

  if (value.consumption === null) {
    blockedReasons.push(
      "MISSING_CONSUMPTION_LINEAGE"
    );
  }

  if (value.receiptState === null) {
    blockedReasons.push(
      "MISSING_RECEIPT_STATE"
    );
  }

  if (value.executedOperation === null) {
    blockedReasons.push(
      "MISSING_EXECUTED_OPERATION"
    );
  }

  if (!hasValues(value.approvedExecutionScope)) {
    blockedReasons.push(
      "MISSING_APPROVED_EXECUTION_SCOPE"
    );
  }

  if (!hasValues(value.provenance)) {
    blockedReasons.push(
      "MISSING_PROVENANCE"
    );
  }

  if (!hasValues(value.authorizationBoundaries)) {
    blockedReasons.push(
      "MISSING_AUTHORIZATION_BOUNDARIES"
    );
  }

  if (!hasValues(value.scopeBoundaries)) {
    blockedReasons.push(
      "MISSING_SCOPE_BOUNDARIES"
    );
  }

  if (!hasValues(value.verificationEvidence)) {
    blockedReasons.push(
      "MISSING_VERIFICATION_EVIDENCE"
    );
  }

  if (!hasValues(value.acceptanceEvidence)) {
    blockedReasons.push(
      "MISSING_ACCEPTANCE_EVIDENCE"
    );
  }

  if (!hasValues(value.packagingEvidence)) {
    blockedReasons.push(
      "MISSING_PACKAGING_EVIDENCE"
    );
  }

  if (!hasValues(value.packageVerificationEvidence)) {
    blockedReasons.push(
      "MISSING_PACKAGE_VERIFICATION_EVIDENCE"
    );
  }

  if (!hasValues(value.admissionEvidence)) {
    blockedReasons.push(
      "MISSING_ADMISSION_EVIDENCE"
    );
  }

  if (!hasValues(value.consumptionEvidence)) {
    blockedReasons.push(
      "MISSING_CONSUMPTION_EVIDENCE"
    );
  }

  if (
    !hasValues(
      value.activeAdmissionEligibilityEvidence
    )
  ) {
    blockedReasons.push(
      "MISSING_ACTIVE_ADMISSION_ELIGIBILITY_EVIDENCE"
    );
  }

  if (value.blockedReasons.length > 0) {
    blockedReasons.push(
      "PREDECESSOR_HAS_BLOCKED_REASONS"
    );
  }

  if (!predecessorAuthoritiesRemainDenied(value)) {
    blockedReasons.push(
      "PREDECESSOR_AUTHORITY_BOUNDARY_VIOLATION"
    );
  }

  if (
    value.futureActiveAdmissionBoundaryRequired !==
    true
  ) {
    blockedReasons.push(
      "FUTURE_ACTIVE_ADMISSION_BOUNDARY_NOT_REQUIRED"
    );
  }

  const authorized =
    blockedReasons.length === 0;

  const authorizationState =
    authorized
      ? "ACTIVE_ADMISSION_AUTHORIZED"
      : "ACTIVE_ADMISSION_UNAUTHORIZED";

  const activeAdmissionAuthorizationEvidence =
    authorized
      ? [
          "DEV-267 predecessor identity validated",
          "active-admission eligibility validated",
          "predecessor lineage validated",
          "approved execution scope validated",
          "provenance and boundaries validated",
          "lifecycle evidence validated",
          "predecessor authority denial validated",
          "future active-admission boundary remains required"
        ]
      : [];

  return {
    version: VERSION,
    trusted: authorized,
    ready: authorized,
    authorized,
    defaultPolicy: DEFAULT_POLICY,
    activeAdmissionAuthorizationDecisionOnly: true,
    authorizationResultIsInertData: true,
    authorizationState,

    eligibility:
      authorized
        ? value
        : null,

    consumption:
      authorized
        ? value.consumption
        : null,

    receiptState:
      authorized
        ? value.receiptState
        : null,

    executedOperation:
      authorized
        ? value.executedOperation
        : null,

    approvedExecutionScope:
      authorized
        ? [...value.approvedExecutionScope]
        : [],

    provenance:
      authorized
        ? [...value.provenance]
        : [],

    authorizationBoundaries:
      authorized
        ? [...value.authorizationBoundaries]
        : [],

    scopeBoundaries:
      authorized
        ? [...value.scopeBoundaries]
        : [],

    verificationEvidence:
      authorized
        ? [...value.verificationEvidence]
        : [],

    acceptanceEvidence:
      authorized
        ? [...value.acceptanceEvidence]
        : [],

    packagingEvidence:
      authorized
        ? [...value.packagingEvidence]
        : [],

    packageVerificationEvidence:
      authorized
        ? [...value.packageVerificationEvidence]
        : [],

    admissionEvidence:
      authorized
        ? [...value.admissionEvidence]
        : [],

    consumptionEvidence:
      authorized
        ? [...value.consumptionEvidence]
        : [],

    activeAdmissionEligibilityEvidence:
      authorized
        ? [...value.activeAdmissionEligibilityEvidence]
        : [],

    activeAdmissionAuthorizationEvidence,

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
