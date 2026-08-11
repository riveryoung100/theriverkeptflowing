import type {
  RiverDevControlledExecutorActiveAdmissionDispatchAuthorizationFoundationResult,
  RiverDevControlledExecutorActiveAdmissionFoundationResult
} from "../types";

const VERSION = "DEV-270" as const;
const DEFAULT_POLICY = "DENY" as const;
const EMPTY: readonly string[] = Object.freeze([]);

function nonEmpty(
  values: readonly string[]
): boolean {
  return values.length > 0;
}

function predecessorAuthoritiesRemainDenied(
  value: RiverDevControlledExecutorActiveAdmissionFoundationResult
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

function reject(
  blockedReasons: readonly string[]
): RiverDevControlledExecutorActiveAdmissionDispatchAuthorizationFoundationResult {
  return {
    version: VERSION,
    trusted: false,
    ready: false,
    dispatchAuthorized: false,
    defaultPolicy: DEFAULT_POLICY,
    dispatchAuthorizationDecisionOnly: true,
    dispatchAuthorizationResultIsInertData: true,
    dispatchAuthorizationState: "DISPATCH_UNAUTHORIZED",
    activeAdmission: null,
    authorization: null,
    eligibility: null,
    consumption: null,
    receiptState: null,
    executedOperation: null,
    approvedExecutionScope: EMPTY,
    provenance: EMPTY,
    authorizationBoundaries: EMPTY,
    scopeBoundaries: EMPTY,
    verificationEvidence: EMPTY,
    acceptanceEvidence: EMPTY,
    packagingEvidence: EMPTY,
    packageVerificationEvidence: EMPTY,
    admissionEvidence: EMPTY,
    consumptionEvidence: EMPTY,
    activeAdmissionEligibilityEvidence: EMPTY,
    activeAdmissionAuthorizationEvidence: EMPTY,
    controlledActiveAdmissionEvidence: EMPTY,
    dispatchAuthorizationEvidence: EMPTY,
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
    futureControlledDispatchBoundaryRequired: true,
    futureExecutorInvocationBoundaryRequired: true,
    futureExecutionBoundaryRequired: true
  };
}

export function buildControlledExecutorActiveAdmissionDispatchAuthorizationFoundation(
  value: RiverDevControlledExecutorActiveAdmissionFoundationResult
): RiverDevControlledExecutorActiveAdmissionDispatchAuthorizationFoundationResult {
  const blockedReasons: string[] = [];

  if (value.version !== "DEV-269") {
    blockedReasons.push(
      "INVALID_PREDECESSOR_VERSION"
    );
  }

  if (value.trusted !== true) {
    blockedReasons.push(
      "PREDECESSOR_NOT_TRUSTED"
    );
  }

  if (value.ready !== true) {
    blockedReasons.push(
      "PREDECESSOR_NOT_READY"
    );
  }

  if (value.admitted !== true) {
    blockedReasons.push(
      "PREDECESSOR_NOT_ADMITTED"
    );
  }

  if (value.defaultPolicy !== DEFAULT_POLICY) {
    blockedReasons.push(
      "INVALID_DEFAULT_POLICY"
    );
  }

  if (value.controlledActiveAdmissionOnly !== true) {
    blockedReasons.push(
      "PREDECESSOR_NOT_CONTROLLED_ACTIVE_ADMISSION_ONLY"
    );
  }

  if (
    value.admissionState !==
    "ACTIVE_ADMISSION_ACCEPTED"
  ) {
    blockedReasons.push(
      "PREDECESSOR_ACTIVE_ADMISSION_NOT_ACCEPTED"
    );
  }

  if (value.authorization === null) {
    blockedReasons.push(
      "MISSING_AUTHORIZATION_LINEAGE"
    );
  }

  if (value.eligibility === null) {
    blockedReasons.push(
      "MISSING_ELIGIBILITY_LINEAGE"
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

  if (!nonEmpty(value.approvedExecutionScope)) {
    blockedReasons.push(
      "MISSING_APPROVED_EXECUTION_SCOPE"
    );
  }

  if (!nonEmpty(value.provenance)) {
    blockedReasons.push(
      "MISSING_PROVENANCE"
    );
  }

  if (!nonEmpty(value.authorizationBoundaries)) {
    blockedReasons.push(
      "MISSING_AUTHORIZATION_BOUNDARIES"
    );
  }

  if (!nonEmpty(value.scopeBoundaries)) {
    blockedReasons.push(
      "MISSING_SCOPE_BOUNDARIES"
    );
  }

  if (!nonEmpty(value.verificationEvidence)) {
    blockedReasons.push(
      "MISSING_VERIFICATION_EVIDENCE"
    );
  }

  if (!nonEmpty(value.acceptanceEvidence)) {
    blockedReasons.push(
      "MISSING_ACCEPTANCE_EVIDENCE"
    );
  }

  if (!nonEmpty(value.packagingEvidence)) {
    blockedReasons.push(
      "MISSING_PACKAGING_EVIDENCE"
    );
  }

  if (!nonEmpty(value.packageVerificationEvidence)) {
    blockedReasons.push(
      "MISSING_PACKAGE_VERIFICATION_EVIDENCE"
    );
  }

  if (!nonEmpty(value.admissionEvidence)) {
    blockedReasons.push(
      "MISSING_ADMISSION_EVIDENCE"
    );
  }

  if (!nonEmpty(value.consumptionEvidence)) {
    blockedReasons.push(
      "MISSING_CONSUMPTION_EVIDENCE"
    );
  }

  if (!nonEmpty(value.activeAdmissionEligibilityEvidence)) {
    blockedReasons.push(
      "MISSING_ACTIVE_ADMISSION_ELIGIBILITY_EVIDENCE"
    );
  }

  if (!nonEmpty(value.activeAdmissionAuthorizationEvidence)) {
    blockedReasons.push(
      "MISSING_ACTIVE_ADMISSION_AUTHORIZATION_EVIDENCE"
    );
  }

  if (!nonEmpty(value.controlledActiveAdmissionEvidence)) {
    blockedReasons.push(
      "MISSING_CONTROLLED_ACTIVE_ADMISSION_EVIDENCE"
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
    value.futureDispatchAuthorizationBoundaryRequired !==
    true
  ) {
    blockedReasons.push(
      "DISPATCH_AUTHORIZATION_BOUNDARY_NOT_REQUIRED"
    );
  }

  if (blockedReasons.length > 0) {
    return reject(
      Object.freeze([...blockedReasons])
    );
  }

  const dispatchAuthorizationEvidence =
    Object.freeze([
      ...value.controlledActiveAdmissionEvidence,
      "DEV-270:ACTIVE_ADMISSION_PREDECESSOR_VALIDATED",
      "DEV-270:DISPATCH_AUTHORIZATION_GRANTED",
      "DEV-270:DISPATCH_NOT_PERFORMED",
      "DEV-270:EXECUTOR_INVOCATION_NOT_PERFORMED",
      "DEV-270:EXECUTION_NOT_PERFORMED",
      "DEV-270:FUTURE_CONTROLLED_DISPATCH_BOUNDARY_REQUIRED"
    ]);

  return {
    version: VERSION,
    trusted: true,
    ready: true,
    dispatchAuthorized: true,
    defaultPolicy: DEFAULT_POLICY,
    dispatchAuthorizationDecisionOnly: true,
    dispatchAuthorizationResultIsInertData: true,
    dispatchAuthorizationState: "DISPATCH_AUTHORIZED",
    activeAdmission: value,
    authorization: value.authorization,
    eligibility: value.eligibility,
    consumption: value.consumption,
    receiptState: value.receiptState,
    executedOperation: value.executedOperation,
    approvedExecutionScope:
      value.approvedExecutionScope,
    provenance:
      value.provenance,
    authorizationBoundaries:
      value.authorizationBoundaries,
    scopeBoundaries:
      value.scopeBoundaries,
    verificationEvidence:
      value.verificationEvidence,
    acceptanceEvidence:
      value.acceptanceEvidence,
    packagingEvidence:
      value.packagingEvidence,
    packageVerificationEvidence:
      value.packageVerificationEvidence,
    admissionEvidence:
      value.admissionEvidence,
    consumptionEvidence:
      value.consumptionEvidence,
    activeAdmissionEligibilityEvidence:
      value.activeAdmissionEligibilityEvidence,
    activeAdmissionAuthorizationEvidence:
      value.activeAdmissionAuthorizationEvidence,
    controlledActiveAdmissionEvidence:
      value.controlledActiveAdmissionEvidence,
    dispatchAuthorizationEvidence,
    blockedReasons: EMPTY,
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
    futureControlledDispatchBoundaryRequired: true,
    futureExecutorInvocationBoundaryRequired: true,
    futureExecutionBoundaryRequired: true
  };
}
