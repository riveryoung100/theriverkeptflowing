import type {
  RiverDevControlledExecutionArchiveFoundationResult,
  RiverDevControlledExecutionAuditFoundationResult
} from "../types";

export function buildRiverDevControlledExecutionAuditFoundation(
  predecessor: RiverDevControlledExecutionArchiveFoundationResult
): RiverDevControlledExecutionAuditFoundationResult {
  const denied = (
    reason: string
  ): RiverDevControlledExecutionAuditFoundationResult => ({
    version: "DEV-282",

    trusted: false,
    ready: false,
    executionAudited: false,

    defaultPolicy: "DENY",

    controlledExecutionAuditBoundaryOnly: true,
    executionAuditResultIsDeterministicData: true,

    executionAuditState: "CONTROLLED_EXECUTION_NOT_AUDITED",

    controlledExecutionArchive: null,
    controlledExecutionClosure: null,
    controlledExecutionFinalization: null,
    controlledExecutionCompletion: null,
    controlledOperationExecutionLifecycle: null,
    controlledOperationExecutionReceipt: null,
    controlledOperationExecution: null,
    operationExecutionAuthorization: null,
    controlledExecutorInvocation: null,
    controlledDispatch: null,
    dispatchAuthorization: null,
    activeAdmission: null,
    authorization: null,
    eligibility: null,
    consumption: null,
    receiptState: null,
    executedOperation: null,

    approvedExecutionScope: [],
    provenance: [],

    controlledDispatchEvidence: [],
    executorInvocationAuthorizationEvidence: [],
    controlledExecutorInvocationEvidence: [],
    operationExecutionAuthorizationEvidence: [],
    controlledOperationExecutionEvidence: [],
    controlledOperationExecutionReceiptEvidence: [],
    controlledOperationExecutionLifecycleEvidence: [],
    controlledExecutionCompletionEvidence: [],
    controlledExecutionFinalizationEvidence: [],
    controlledExecutionClosureEvidence: [],
    controlledExecutionArchiveEvidence: [],
    controlledExecutionAuditEvidence: [],

    blockedReasons: [reason],

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

    futureControlledExecutionAttestationBoundaryRequired: true
  });

  if (predecessor.version !== "DEV-281") {
    return denied("INVALID_DEV_281_PREDECESSOR_VERSION");
  }

  if (!predecessor.trusted) {
    return denied("UNTRUSTED_DEV_281_PREDECESSOR");
  }

  if (!predecessor.ready) {
    return denied("UNREADY_DEV_281_PREDECESSOR");
  }

  if (!predecessor.executionArchived) {
    return denied("DEV_281_EXECUTION_NOT_ARCHIVED");
  }

  if (
    predecessor.executionArchiveState !==
    "CONTROLLED_EXECUTION_ARCHIVED"
  ) {
    return denied("INVALID_DEV_281_ARCHIVE_STATE");
  }

  if (!predecessor.controlledExecutionArchiveBoundaryOnly) {
    return denied("DEV_281_OUTSIDE_ARCHIVE_BOUNDARY");
  }

  if (!predecessor.executionArchiveResultIsDeterministicData) {
    return denied("NON_DETERMINISTIC_DEV_281_ARCHIVE_RESULT");
  }

  if (predecessor.controlledExecutionClosure === null) {
    return denied("MISSING_DEV_281_EXECUTION_CLOSURE");
  }

  if (predecessor.controlledExecutionFinalization === null) {
    return denied("MISSING_DEV_281_EXECUTION_FINALIZATION");
  }

  if (predecessor.controlledExecutionCompletion === null) {
    return denied("MISSING_DEV_281_EXECUTION_COMPLETION");
  }

  if (predecessor.controlledOperationExecutionLifecycle === null) {
    return denied("MISSING_DEV_281_EXECUTION_LIFECYCLE");
  }

  if (predecessor.controlledOperationExecutionReceipt === null) {
    return denied("MISSING_DEV_281_EXECUTION_RECEIPT");
  }

  if (predecessor.controlledOperationExecution === null) {
    return denied("MISSING_DEV_281_CONTROLLED_OPERATION_EXECUTION");
  }

  if (predecessor.operationExecutionAuthorization === null) {
    return denied("MISSING_DEV_281_OPERATION_EXECUTION_AUTHORIZATION");
  }

  if (predecessor.controlledExecutorInvocation === null) {
    return denied("MISSING_DEV_281_CONTROLLED_EXECUTOR_INVOCATION");
  }

  if (predecessor.controlledDispatch === null) {
    return denied("MISSING_DEV_281_CONTROLLED_DISPATCH");
  }

  if (predecessor.dispatchAuthorization === null) {
    return denied("MISSING_DEV_281_DISPATCH_AUTHORIZATION");
  }

  if (predecessor.activeAdmission === null) {
    return denied("MISSING_DEV_281_ACTIVE_ADMISSION");
  }

  if (predecessor.authorization === null) {
    return denied("MISSING_DEV_281_AUTHORIZATION");
  }

  if (predecessor.eligibility === null) {
    return denied("MISSING_DEV_281_ELIGIBILITY");
  }

  if (predecessor.consumption === null) {
    return denied("MISSING_DEV_281_CONSUMPTION");
  }

  if (predecessor.receiptState === null) {
    return denied("MISSING_DEV_281_RECEIPT_STATE");
  }

  if (predecessor.executedOperation === null) {
    return denied("MISSING_DEV_281_EXECUTED_OPERATION");
  }

  if (predecessor.approvedExecutionScope.length === 0) {
    return denied("EMPTY_DEV_281_APPROVED_EXECUTION_SCOPE");
  }

  if (predecessor.provenance.length === 0) {
    return denied("EMPTY_DEV_281_PROVENANCE");
  }

  if (predecessor.controlledDispatchEvidence.length === 0) {
    return denied("MISSING_DEV_281_CONTROLLED_DISPATCH_EVIDENCE");
  }

  if (
    predecessor.executorInvocationAuthorizationEvidence.length === 0
  ) {
    return denied(
      "MISSING_DEV_281_EXECUTOR_INVOCATION_AUTHORIZATION_EVIDENCE"
    );
  }

  if (
    predecessor.controlledExecutorInvocationEvidence.length === 0
  ) {
    return denied(
      "MISSING_DEV_281_CONTROLLED_EXECUTOR_INVOCATION_EVIDENCE"
    );
  }

  if (
    predecessor.operationExecutionAuthorizationEvidence.length === 0
  ) {
    return denied(
      "MISSING_DEV_281_OPERATION_EXECUTION_AUTHORIZATION_EVIDENCE"
    );
  }

  if (
    predecessor.controlledOperationExecutionEvidence.length === 0
  ) {
    return denied(
      "MISSING_DEV_281_CONTROLLED_OPERATION_EXECUTION_EVIDENCE"
    );
  }

  if (
    predecessor.controlledOperationExecutionReceiptEvidence.length === 0
  ) {
    return denied(
      "MISSING_DEV_281_CONTROLLED_OPERATION_EXECUTION_RECEIPT_EVIDENCE"
    );
  }

  if (
    predecessor.controlledOperationExecutionLifecycleEvidence.length === 0
  ) {
    return denied(
      "MISSING_DEV_281_CONTROLLED_OPERATION_EXECUTION_LIFECYCLE_EVIDENCE"
    );
  }

  if (
    predecessor.controlledExecutionCompletionEvidence.length === 0
  ) {
    return denied(
      "MISSING_DEV_281_CONTROLLED_EXECUTION_COMPLETION_EVIDENCE"
    );
  }

  if (
    predecessor.controlledExecutionFinalizationEvidence.length === 0
  ) {
    return denied(
      "MISSING_DEV_281_CONTROLLED_EXECUTION_FINALIZATION_EVIDENCE"
    );
  }

  if (
    predecessor.controlledExecutionClosureEvidence.length === 0
  ) {
    return denied(
      "MISSING_DEV_281_CONTROLLED_EXECUTION_CLOSURE_EVIDENCE"
    );
  }

  if (
    predecessor.controlledExecutionArchiveEvidence.length === 0
  ) {
    return denied(
      "MISSING_DEV_281_CONTROLLED_EXECUTION_ARCHIVE_EVIDENCE"
    );
  }

  if (predecessor.blockedReasons.length !== 0) {
    return denied("BLOCKED_DEV_281_PREDECESSOR");
  }

  if (
    predecessor.mayCreateExecutionAuthorization ||
    predecessor.mayAuthorizeDownstreamAction ||
    predecessor.mayAdmitIntoActiveExecutor ||
    predecessor.mayActivateAdmission ||
    predecessor.mayDispatch
  ) {
    return denied("DEV_281_HAS_DISPATCH_OR_ADMISSION_AUTHORITY");
  }

  if (
    predecessor.mayInvokeExecutor ||
    predecessor.mayExecuteOperation ||
    predecessor.mayInvokeInspectionDependency ||
    predecessor.mayRetryExecution ||
    predecessor.mayPersistLifecycleState
  ) {
    return denied("DEV_281_HAS_EXECUTION_AUTHORITY");
  }

  if (
    predecessor.mayModifyRepository ||
    predecessor.mayDeleteRepositoryContent ||
    predecessor.mayStageRepositoryChanges ||
    predecessor.mayCommit ||
    predecessor.mayPush ||
    predecessor.mayDeploy
  ) {
    return denied("DEV_281_HAS_REPOSITORY_MUTATION_AUTHORITY");
  }

  if (
    predecessor.mayAccessSecrets ||
    predecessor.mayExpandScope ||
    predecessor.mayPerformArbitraryShellExecution ||
    predecessor.mayPerformNetworkExecution ||
    predecessor.mayPerformExternalSideEffects
  ) {
    return denied("DEV_281_HAS_EXTERNAL_SIDE_EFFECT_AUTHORITY");
  }

  if (!predecessor.futureControlledExecutionAuditBoundaryRequired) {
    return denied("MISSING_DEV_281_FUTURE_AUDIT_BOUNDARY");
  }

  return {
    version: "DEV-282",

    trusted: true,
    ready: true,
    executionAudited: true,

    defaultPolicy: "DENY",

    controlledExecutionAuditBoundaryOnly: true,
    executionAuditResultIsDeterministicData: true,

    executionAuditState: "CONTROLLED_EXECUTION_AUDITED",

    controlledExecutionArchive: predecessor,
    controlledExecutionClosure: predecessor.controlledExecutionClosure,
    controlledExecutionFinalization:
      predecessor.controlledExecutionFinalization,
    controlledExecutionCompletion:
      predecessor.controlledExecutionCompletion,
    controlledOperationExecutionLifecycle:
      predecessor.controlledOperationExecutionLifecycle,
    controlledOperationExecutionReceipt:
      predecessor.controlledOperationExecutionReceipt,
    controlledOperationExecution:
      predecessor.controlledOperationExecution,
    operationExecutionAuthorization:
      predecessor.operationExecutionAuthorization,
    controlledExecutorInvocation:
      predecessor.controlledExecutorInvocation,
    controlledDispatch: predecessor.controlledDispatch,
    dispatchAuthorization: predecessor.dispatchAuthorization,
    activeAdmission: predecessor.activeAdmission,
    authorization: predecessor.authorization,
    eligibility: predecessor.eligibility,
    consumption: predecessor.consumption,
    receiptState: predecessor.receiptState,
    executedOperation: predecessor.executedOperation,

    approvedExecutionScope: [...predecessor.approvedExecutionScope],
    provenance: [...predecessor.provenance],

    controlledDispatchEvidence: [
      ...predecessor.controlledDispatchEvidence
    ],
    executorInvocationAuthorizationEvidence: [
      ...predecessor.executorInvocationAuthorizationEvidence
    ],
    controlledExecutorInvocationEvidence: [
      ...predecessor.controlledExecutorInvocationEvidence
    ],
    operationExecutionAuthorizationEvidence: [
      ...predecessor.operationExecutionAuthorizationEvidence
    ],
    controlledOperationExecutionEvidence: [
      ...predecessor.controlledOperationExecutionEvidence
    ],
    controlledOperationExecutionReceiptEvidence: [
      ...predecessor.controlledOperationExecutionReceiptEvidence
    ],
    controlledOperationExecutionLifecycleEvidence: [
      ...predecessor.controlledOperationExecutionLifecycleEvidence
    ],
    controlledExecutionCompletionEvidence: [
      ...predecessor.controlledExecutionCompletionEvidence
    ],
    controlledExecutionFinalizationEvidence: [
      ...predecessor.controlledExecutionFinalizationEvidence
    ],
    controlledExecutionClosureEvidence: [
      ...predecessor.controlledExecutionClosureEvidence
    ],
    controlledExecutionArchiveEvidence: [
      ...predecessor.controlledExecutionArchiveEvidence
    ],
    controlledExecutionAuditEvidence: [
      "DEV-282",
      "CONTROLLED_EXECUTION_AUDIT",
      "DEV-281_ARCHIVE_VERIFIED",
      "AUDIT_BOUNDARY_ONLY",
      "DETERMINISTIC_DATA_ONLY"
    ],

    blockedReasons: [],

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

    futureControlledExecutionAttestationBoundaryRequired: true
  };
}
