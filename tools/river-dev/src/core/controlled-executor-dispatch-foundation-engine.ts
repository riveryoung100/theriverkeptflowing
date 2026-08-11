import type {
  RiverDevControlledExecutorActiveAdmissionDispatchAuthorizationFoundationResult,
  RiverDevControlledExecutorDispatchFoundationResult
} from "../types";

const VERSION = "DEV-271" as const;
const DEFAULT_POLICY = "DENY" as const;
const EMPTY: readonly string[] = Object.freeze([]);

function nonEmpty(
  values: readonly string[]
): boolean {
  return values.length > 0;
}

function predecessorAuthoritiesRemainDenied(
  value: RiverDevControlledExecutorActiveAdmissionDispatchAuthorizationFoundationResult
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
): RiverDevControlledExecutorDispatchFoundationResult {
  return {
    version: VERSION,
    trusted: false,
    ready: false,
    dispatched: false,
    defaultPolicy: DEFAULT_POLICY,
    controlledDispatchStateOnly: true,
    dispatchState: "CONTROLLED_DISPATCH_REJECTED",
    dispatchAuthorization: null,
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
    controlledDispatchEvidence: EMPTY,
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
    futureExecutorInvocationBoundaryRequired: true,
    futureExecutionBoundaryRequired: true
  };
}

export function buildControlledExecutorDispatchFoundation(
  value: RiverDevControlledExecutorActiveAdmissionDispatchAuthorizationFoundationResult
): RiverDevControlledExecutorDispatchFoundationResult {
  const blockedReasons: string[] = [];

  if (value.version !== "DEV-270") {
    blockedReasons.push("INVALID_PREDECESSOR_VERSION");
  }

  if (value.trusted !== true) {
    blockedReasons.push("PREDECESSOR_NOT_TRUSTED");
  }

  if (value.ready !== true) {
    blockedReasons.push("PREDECESSOR_NOT_READY");
  }

  if (value.dispatchAuthorized !== true) {
    blockedReasons.push("DISPATCH_NOT_AUTHORIZED");
  }

  if (value.defaultPolicy !== DEFAULT_POLICY) {
    blockedReasons.push("INVALID_DEFAULT_POLICY");
  }

  if (value.dispatchAuthorizationDecisionOnly !== true) {
    blockedReasons.push("PREDECESSOR_NOT_DECISION_ONLY");
  }

  if (
    value.dispatchAuthorizationResultIsInertData !==
    true
  ) {
    blockedReasons.push(
      "PREDECESSOR_AUTHORIZATION_RESULT_NOT_INERT"
    );
  }

  if (
    value.dispatchAuthorizationState !==
    "DISPATCH_AUTHORIZED"
  ) {
    blockedReasons.push(
      "PREDECESSOR_DISPATCH_AUTHORIZATION_NOT_ACCEPTED"
    );
  }

  if (value.activeAdmission === null) {
    blockedReasons.push("MISSING_ACTIVE_ADMISSION_LINEAGE");
  }

  if (value.authorization === null) {
    blockedReasons.push("MISSING_AUTHORIZATION_LINEAGE");
  }

  if (value.eligibility === null) {
    blockedReasons.push("MISSING_ELIGIBILITY_LINEAGE");
  }

  if (value.consumption === null) {
    blockedReasons.push("MISSING_CONSUMPTION_LINEAGE");
  }

  if (value.receiptState === null) {
    blockedReasons.push("MISSING_RECEIPT_STATE");
  }

  if (value.executedOperation === null) {
    blockedReasons.push("MISSING_EXECUTED_OPERATION");
  }

  if (!nonEmpty(value.approvedExecutionScope)) {
    blockedReasons.push("MISSING_APPROVED_EXECUTION_SCOPE");
  }

  if (!nonEmpty(value.provenance)) {
    blockedReasons.push("MISSING_PROVENANCE");
  }

  if (!nonEmpty(value.authorizationBoundaries)) {
    blockedReasons.push("MISSING_AUTHORIZATION_BOUNDARIES");
  }

  if (!nonEmpty(value.scopeBoundaries)) {
    blockedReasons.push("MISSING_SCOPE_BOUNDARIES");
  }

  if (!nonEmpty(value.verificationEvidence)) {
    blockedReasons.push("MISSING_VERIFICATION_EVIDENCE");
  }

  if (!nonEmpty(value.acceptanceEvidence)) {
    blockedReasons.push("MISSING_ACCEPTANCE_EVIDENCE");
  }

  if (!nonEmpty(value.packagingEvidence)) {
    blockedReasons.push("MISSING_PACKAGING_EVIDENCE");
  }

  if (!nonEmpty(value.packageVerificationEvidence)) {
    blockedReasons.push("MISSING_PACKAGE_VERIFICATION_EVIDENCE");
  }

  if (!nonEmpty(value.admissionEvidence)) {
    blockedReasons.push("MISSING_ADMISSION_EVIDENCE");
  }

  if (!nonEmpty(value.consumptionEvidence)) {
    blockedReasons.push("MISSING_CONSUMPTION_EVIDENCE");
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

  if (!nonEmpty(value.dispatchAuthorizationEvidence)) {
    blockedReasons.push(
      "MISSING_DISPATCH_AUTHORIZATION_EVIDENCE"
    );
  }

  if (value.blockedReasons.length > 0) {
    blockedReasons.push("PREDECESSOR_HAS_BLOCKED_REASONS");
  }

  if (!predecessorAuthoritiesRemainDenied(value)) {
    blockedReasons.push(
      "PREDECESSOR_AUTHORITY_BOUNDARY_VIOLATION"
    );
  }

  if (
    value.futureControlledDispatchBoundaryRequired !==
    true
  ) {
    blockedReasons.push(
      "CONTROLLED_DISPATCH_BOUNDARY_NOT_REQUIRED"
    );
  }

  if (
    value.futureExecutorInvocationBoundaryRequired !==
    true
  ) {
    blockedReasons.push(
      "EXECUTOR_INVOCATION_BOUNDARY_NOT_REQUIRED"
    );
  }

  if (
    value.futureExecutionBoundaryRequired !==
    true
  ) {
    blockedReasons.push(
      "EXECUTION_BOUNDARY_NOT_REQUIRED"
    );
  }

  if (blockedReasons.length > 0) {
    return reject(
      Object.freeze([...blockedReasons])
    );
  }

  const controlledDispatchEvidence =
    Object.freeze([
      ...value.dispatchAuthorizationEvidence,
      "DEV-271:DISPATCH_AUTHORIZATION_PREDECESSOR_VALIDATED",
      "DEV-271:CONTROLLED_DISPATCH_ACCEPTED",
      "DEV-271:EXECUTOR_NOT_INVOKED",
      "DEV-271:OPERATION_NOT_EXECUTED",
      "DEV-271:FUTURE_EXECUTOR_INVOCATION_BOUNDARY_REQUIRED"
    ]);

  return {
    version: VERSION,
    trusted: true,
    ready: true,
    dispatched: true,
    defaultPolicy: DEFAULT_POLICY,
    controlledDispatchStateOnly: true,
    dispatchState: "CONTROLLED_DISPATCH_ACCEPTED",
    dispatchAuthorization: value,
    activeAdmission: value.activeAdmission,
    authorization: value.authorization,
    eligibility: value.eligibility,
    consumption: value.consumption,
    receiptState: value.receiptState,
    executedOperation: value.executedOperation,
    approvedExecutionScope: value.approvedExecutionScope,
    provenance: value.provenance,
    authorizationBoundaries: value.authorizationBoundaries,
    scopeBoundaries: value.scopeBoundaries,
    verificationEvidence: value.verificationEvidence,
    acceptanceEvidence: value.acceptanceEvidence,
    packagingEvidence: value.packagingEvidence,
    packageVerificationEvidence: value.packageVerificationEvidence,
    admissionEvidence: value.admissionEvidence,
    consumptionEvidence: value.consumptionEvidence,
    activeAdmissionEligibilityEvidence:
      value.activeAdmissionEligibilityEvidence,
    activeAdmissionAuthorizationEvidence:
      value.activeAdmissionAuthorizationEvidence,
    controlledActiveAdmissionEvidence:
      value.controlledActiveAdmissionEvidence,
    dispatchAuthorizationEvidence:
      value.dispatchAuthorizationEvidence,
    controlledDispatchEvidence,
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
    futureExecutorInvocationBoundaryRequired: true,
    futureExecutionBoundaryRequired: true
  };
}
