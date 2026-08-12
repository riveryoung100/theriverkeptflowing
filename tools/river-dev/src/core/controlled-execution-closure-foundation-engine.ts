import type {
  RiverDevControlledExecutionFinalizationFoundationResult,
  RiverDevControlledExecutionClosureFoundationResult
} from "../types";

const VERSION = "DEV-280" as const;

function denied(
  reason: string
): RiverDevControlledExecutionClosureFoundationResult {
  return {
    version: VERSION,

    trusted: false,
    ready: false,
    executionClosed: false,

    defaultPolicy: "DENY",

    controlledExecutionClosureBoundaryOnly: true,
    executionClosureResultIsDeterministicData: true,

    executionClosureState: "CONTROLLED_EXECUTION_NOT_CLOSED",

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

    futureControlledExecutionArchiveBoundaryRequired: true
  };
}

export function establishControlledExecutionClosureFoundation(
  predecessor:
    | RiverDevControlledExecutionFinalizationFoundationResult
    | null
    | undefined
): RiverDevControlledExecutionClosureFoundationResult {
  if (!predecessor || predecessor.version !== "DEV-279") {
    return denied("INVALID_DEV_279_PREDECESSOR");
  }

  if (!predecessor.trusted) {
    return denied("UNTRUSTED_DEV_279_PREDECESSOR");
  }

  if (!predecessor.ready) {
    return denied("UNREADY_DEV_279_PREDECESSOR");
  }

  if (!predecessor.executionFinalized) {
    return denied("DEV_279_EXECUTION_NOT_FINALIZED");
  }

  if (predecessor.defaultPolicy !== "DENY") {
    return denied("INVALID_DEV_279_DEFAULT_POLICY");
  }

  if (!predecessor.controlledExecutionFinalizationBoundaryOnly) {
    return denied("INVALID_DEV_279_FINALIZATION_BOUNDARY");
  }

  if (!predecessor.executionFinalizationResultIsDeterministicData) {
    return denied("NON_DETERMINISTIC_DEV_279_FINALIZATION");
  }

  if (
    predecessor.executionFinalizationState !==
    "CONTROLLED_EXECUTION_FINALIZED"
  ) {
    return denied("INVALID_DEV_279_FINALIZATION_STATE");
  }

  if (
    predecessor.singleFinalizationTransitionOnly !== true ||
    predecessor.finalizationMustPreserveExactExecutionScope !== true ||
    predecessor.finalizationMustPreserveCompletionEvidence !== true ||
    predecessor.finalizationMustPreserveLifecycleEvidence !== true ||
    predecessor.finalizationMustPreserveReceiptEvidence !== true ||
    predecessor.finalizationMustPreserveExecutionEvidence !== true ||
    predecessor.finalizationMustPreservePredecessorEvidence !== true
  ) {
    return denied("INVALID_DEV_279_FINALIZATION_INVARIANTS");
  }

  if (!predecessor.controlledExecutionCompletion) {
    return denied("MISSING_DEV_279_COMPLETION");
  }

  if (!predecessor.controlledOperationExecutionLifecycle) {
    return denied("MISSING_DEV_279_EXECUTION_LIFECYCLE");
  }

  if (!predecessor.controlledOperationExecutionReceipt) {
    return denied("MISSING_DEV_279_EXECUTION_RECEIPT");
  }

  if (!predecessor.controlledOperationExecution) {
    return denied("MISSING_DEV_279_CONTROLLED_OPERATION_EXECUTION");
  }

  if (!predecessor.executedOperation) {
    return denied("MISSING_DEV_279_EXECUTED_OPERATION");
  }

  if (predecessor.approvedExecutionScope.length === 0) {
    return denied("EMPTY_DEV_279_APPROVED_EXECUTION_SCOPE");
  }

  if (predecessor.provenance.length === 0) {
    return denied("EMPTY_DEV_279_PROVENANCE");
  }

  if (predecessor.controlledDispatchEvidence.length === 0) {
    return denied("MISSING_DEV_279_CONTROLLED_DISPATCH_EVIDENCE");
  }

  if (predecessor.controlledExecutorInvocationEvidence.length === 0) {
    return denied(
      "MISSING_DEV_279_CONTROLLED_EXECUTOR_INVOCATION_EVIDENCE"
    );
  }

  if (predecessor.operationExecutionAuthorizationEvidence.length === 0) {
    return denied(
      "MISSING_DEV_279_OPERATION_EXECUTION_AUTHORIZATION_EVIDENCE"
    );
  }

  if (predecessor.controlledOperationExecutionEvidence.length === 0) {
    return denied(
      "MISSING_DEV_279_CONTROLLED_OPERATION_EXECUTION_EVIDENCE"
    );
  }

  if (
    predecessor.controlledOperationExecutionReceiptEvidence.length === 0
  ) {
    return denied(
      "MISSING_DEV_279_CONTROLLED_OPERATION_EXECUTION_RECEIPT_EVIDENCE"
    );
  }

  if (predecessor.controlledOperationExecutionLifecycleEvidence.length === 0) {
    return denied("MISSING_DEV_279_EXECUTION_LIFECYCLE_EVIDENCE");
  }

  if (predecessor.controlledExecutionCompletionEvidence.length === 0) {
    return denied("MISSING_DEV_279_EXECUTION_COMPLETION_EVIDENCE");
  }

  if (predecessor.controlledExecutionFinalizationEvidence.length === 0) {
    return denied("MISSING_DEV_279_EXECUTION_FINALIZATION_EVIDENCE");
  }

  if (predecessor.blockedReasons.length !== 0) {
    return denied("BLOCKED_DEV_279_PREDECESSOR");
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
    return denied("DEV_279_FORBIDDEN_AUTHORITY_PRESENT");
  }

  if (!predecessor.futureControlledExecutionClosureBoundaryRequired) {
    return denied("MISSING_DEV_279_FUTURE_CLOSURE_BOUNDARY");
  }

  return {
    version: VERSION,

    trusted: true,
    ready: true,
    executionClosed: true,

    defaultPolicy: "DENY",

    controlledExecutionClosureBoundaryOnly: true,
    executionClosureResultIsDeterministicData: true,

    executionClosureState: "CONTROLLED_EXECUTION_CLOSED",

    controlledExecutionFinalization: predecessor,
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

    controlledExecutionClosureEvidence: [
      ...predecessor.controlledExecutionFinalizationEvidence,
      "DEV-280_CONTROLLED_EXECUTION_CLOSED"
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

    futureControlledExecutionArchiveBoundaryRequired: true
  };
}
