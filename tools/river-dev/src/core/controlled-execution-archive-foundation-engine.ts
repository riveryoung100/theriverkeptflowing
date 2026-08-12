import type {
  RiverDevControlledExecutionArchiveFoundationResult,
  RiverDevControlledExecutionClosureFoundationResult
} from "../types";

const VERSION = "DEV-281" as const;

function denied(
  reason: string
): RiverDevControlledExecutionArchiveFoundationResult {
  return {
    version: VERSION,

    trusted: false,
    ready: false,
    executionArchived: false,

    defaultPolicy: "DENY",

    controlledExecutionArchiveBoundaryOnly: true,
    executionArchiveResultIsDeterministicData: true,

    executionArchiveState: "CONTROLLED_EXECUTION_NOT_ARCHIVED",

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

    futureControlledExecutionAuditBoundaryRequired: true
  };
}

export function establishControlledExecutionArchiveFoundation(
  predecessor:
    | RiverDevControlledExecutionClosureFoundationResult
    | null
    | undefined
): RiverDevControlledExecutionArchiveFoundationResult {
  if (!predecessor || predecessor.version !== "DEV-280") {
    return denied("INVALID_DEV_280_PREDECESSOR");
  }

  if (!predecessor.trusted) {
    return denied("UNTRUSTED_DEV_280_PREDECESSOR");
  }

  if (!predecessor.ready) {
    return denied("UNREADY_DEV_280_PREDECESSOR");
  }

  if (!predecessor.executionClosed) {
    return denied("DEV_280_EXECUTION_NOT_CLOSED");
  }

  if (predecessor.defaultPolicy !== "DENY") {
    return denied("INVALID_DEV_280_DEFAULT_POLICY");
  }

  if (!predecessor.controlledExecutionClosureBoundaryOnly) {
    return denied("INVALID_DEV_280_CLOSURE_BOUNDARY");
  }

  if (!predecessor.executionClosureResultIsDeterministicData) {
    return denied("NON_DETERMINISTIC_DEV_280_CLOSURE");
  }

  if (
    predecessor.executionClosureState !==
    "CONTROLLED_EXECUTION_CLOSED"
  ) {
    return denied("INVALID_DEV_280_CLOSURE_STATE");
  }

  if (!predecessor.controlledExecutionFinalization) {
    return denied("MISSING_DEV_280_FINALIZATION");
  }

  if (!predecessor.controlledExecutionCompletion) {
    return denied("MISSING_DEV_280_COMPLETION");
  }

  if (!predecessor.controlledOperationExecutionLifecycle) {
    return denied("MISSING_DEV_280_EXECUTION_LIFECYCLE");
  }

  if (!predecessor.controlledOperationExecutionReceipt) {
    return denied("MISSING_DEV_280_EXECUTION_RECEIPT");
  }

  if (!predecessor.controlledOperationExecution) {
    return denied("MISSING_DEV_280_CONTROLLED_OPERATION_EXECUTION");
  }

  if (!predecessor.executedOperation) {
    return denied("MISSING_DEV_280_EXECUTED_OPERATION");
  }

  if (predecessor.approvedExecutionScope.length === 0) {
    return denied("EMPTY_DEV_280_APPROVED_EXECUTION_SCOPE");
  }

  if (predecessor.provenance.length === 0) {
    return denied("EMPTY_DEV_280_PROVENANCE");
  }

  if (predecessor.controlledDispatchEvidence.length === 0) {
    return denied("MISSING_DEV_280_CONTROLLED_DISPATCH_EVIDENCE");
  }

  if (
    predecessor.executorInvocationAuthorizationEvidence.length === 0
  ) {
    return denied(
      "MISSING_DEV_280_EXECUTOR_INVOCATION_AUTHORIZATION_EVIDENCE"
    );
  }

  if (
    predecessor.controlledExecutorInvocationEvidence.length === 0
  ) {
    return denied(
      "MISSING_DEV_280_CONTROLLED_EXECUTOR_INVOCATION_EVIDENCE"
    );
  }

  if (
    predecessor.operationExecutionAuthorizationEvidence.length === 0
  ) {
    return denied(
      "MISSING_DEV_280_OPERATION_EXECUTION_AUTHORIZATION_EVIDENCE"
    );
  }

  if (
    predecessor.controlledOperationExecutionEvidence.length === 0
  ) {
    return denied(
      "MISSING_DEV_280_CONTROLLED_OPERATION_EXECUTION_EVIDENCE"
    );
  }

  if (
    predecessor.controlledOperationExecutionReceiptEvidence.length === 0
  ) {
    return denied(
      "MISSING_DEV_280_CONTROLLED_OPERATION_EXECUTION_RECEIPT_EVIDENCE"
    );
  }

  if (
    predecessor.controlledOperationExecutionLifecycleEvidence.length === 0
  ) {
    return denied(
      "MISSING_DEV_280_CONTROLLED_OPERATION_EXECUTION_LIFECYCLE_EVIDENCE"
    );
  }

  if (
    predecessor.controlledExecutionCompletionEvidence.length === 0
  ) {
    return denied(
      "MISSING_DEV_280_CONTROLLED_EXECUTION_COMPLETION_EVIDENCE"
    );
  }

  if (
    predecessor.controlledExecutionFinalizationEvidence.length === 0
  ) {
    return denied(
      "MISSING_DEV_280_CONTROLLED_EXECUTION_FINALIZATION_EVIDENCE"
    );
  }

  if (
    predecessor.controlledExecutionClosureEvidence.length === 0
  ) {
    return denied(
      "MISSING_DEV_280_CONTROLLED_EXECUTION_CLOSURE_EVIDENCE"
    );
  }

  if (predecessor.blockedReasons.length !== 0) {
    return denied("BLOCKED_DEV_280_PREDECESSOR");
  }

  if (
    predecessor.mayCreateExecutionAuthorization !== false ||
    predecessor.mayAuthorizeDownstreamAction !== false ||
    predecessor.mayAdmitIntoActiveExecutor !== false ||
    predecessor.mayActivateAdmission !== false ||
    predecessor.mayDispatch !== false ||
    predecessor.mayInvokeExecutor !== false ||
    predecessor.mayExecuteOperation !== false ||
    predecessor.mayInvokeInspectionDependency !== false ||
    predecessor.mayRetryExecution !== false ||
    predecessor.mayPersistLifecycleState !== false ||
    predecessor.mayModifyRepository !== false ||
    predecessor.mayDeleteRepositoryContent !== false ||
    predecessor.mayStageRepositoryChanges !== false ||
    predecessor.mayCommit !== false ||
    predecessor.mayPush !== false ||
    predecessor.mayDeploy !== false ||
    predecessor.mayAccessSecrets !== false ||
    predecessor.mayExpandScope !== false ||
    predecessor.mayPerformArbitraryShellExecution !== false ||
    predecessor.mayPerformNetworkExecution !== false ||
    predecessor.mayPerformExternalSideEffects !== false
  ) {
    return denied("DEV_280_FORBIDDEN_AUTHORITY_PRESENT");
  }

  if (!predecessor.futureControlledExecutionArchiveBoundaryRequired) {
    return denied("MISSING_DEV_280_FUTURE_ARCHIVE_BOUNDARY");
  }

  return {
    version: VERSION,

    trusted: true,
    ready: true,
    executionArchived: true,

    defaultPolicy: "DENY",

    controlledExecutionArchiveBoundaryOnly: true,
    executionArchiveResultIsDeterministicData: true,

    executionArchiveState: "CONTROLLED_EXECUTION_ARCHIVED",

    controlledExecutionClosure: predecessor,
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
    controlledDispatch:
      predecessor.controlledDispatch,
    dispatchAuthorization:
      predecessor.dispatchAuthorization,
    activeAdmission:
      predecessor.activeAdmission,
    authorization:
      predecessor.authorization,
    eligibility:
      predecessor.eligibility,
    consumption:
      predecessor.consumption,
    receiptState:
      predecessor.receiptState,
    executedOperation:
      predecessor.executedOperation,

    approvedExecutionScope:
      [...predecessor.approvedExecutionScope],

    provenance:
      [...predecessor.provenance],

    controlledDispatchEvidence:
      [...predecessor.controlledDispatchEvidence],

    executorInvocationAuthorizationEvidence:
      [...predecessor.executorInvocationAuthorizationEvidence],

    controlledExecutorInvocationEvidence:
      [...predecessor.controlledExecutorInvocationEvidence],

    operationExecutionAuthorizationEvidence:
      [...predecessor.operationExecutionAuthorizationEvidence],

    controlledOperationExecutionEvidence:
      [...predecessor.controlledOperationExecutionEvidence],

    controlledOperationExecutionReceiptEvidence:
      [...predecessor.controlledOperationExecutionReceiptEvidence],

    controlledOperationExecutionLifecycleEvidence:
      [...predecessor.controlledOperationExecutionLifecycleEvidence],

    controlledExecutionCompletionEvidence:
      [...predecessor.controlledExecutionCompletionEvidence],

    controlledExecutionFinalizationEvidence:
      [...predecessor.controlledExecutionFinalizationEvidence],

    controlledExecutionClosureEvidence:
      [...predecessor.controlledExecutionClosureEvidence],

    controlledExecutionArchiveEvidence: [
      ...predecessor.controlledExecutionClosureEvidence,
      "DEV-281_CONTROLLED_EXECUTION_ARCHIVED"
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

    futureControlledExecutionAuditBoundaryRequired: true
  };
}
