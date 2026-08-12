import type {
  RiverDevControlledExecutionCompletionFoundationResult,
  RiverDevControlledOperationExecutionLifecycleFoundationResult
} from "../types";

const VERSION = "DEV-278" as const;

function denied(
  reason: string
): RiverDevControlledExecutionCompletionFoundationResult {
  return {
    version: VERSION,

    trusted: false,
    ready: false,
    executionCompleted: false,

    defaultPolicy: "DENY",

    controlledExecutionCompletionBoundaryOnly: true,
    executionCompletionResultIsDeterministicData: true,

    executionCompletionState: "CONTROLLED_EXECUTION_NOT_COMPLETED",

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

    blockedReasons: [reason],

    singleCompletionTransitionOnly: true,
    completionMustPreserveExactExecutionScope: true,
    completionMustPreserveLifecycleEvidence: true,
    completionMustPreserveReceiptEvidence: true,
    completionMustPreserveExecutionEvidence: true,
    completionMustPreservePredecessorEvidence: true,

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

    futureControlledExecutionFinalizationBoundaryRequired: true
  };
}

export function establishControlledExecutionCompletionFoundation(
  predecessor:
    | RiverDevControlledOperationExecutionLifecycleFoundationResult
    | null
    | undefined
): RiverDevControlledExecutionCompletionFoundationResult {
  if (!predecessor || predecessor.version !== "DEV-277") {
    return denied("INVALID_DEV_277_PREDECESSOR");
  }

  if (!predecessor.trusted) {
    return denied("UNTRUSTED_DEV_277_PREDECESSOR");
  }

  if (!predecessor.ready) {
    return denied("UNREADY_DEV_277_PREDECESSOR");
  }

  if (!predecessor.executionLifecycleEstablished) {
    return denied("EXECUTION_LIFECYCLE_NOT_ESTABLISHED");
  }

  if (predecessor.defaultPolicy !== "DENY") {
    return denied("INVALID_DEFAULT_POLICY");
  }

  if (
    predecessor.controlledOperationExecutionLifecycleBoundaryOnly !== true ||
    predecessor.executionLifecycleResultIsDeterministicData !== true ||
    predecessor.executionLifecycleState !==
      "CONTROLLED_OPERATION_EXECUTION_LIFECYCLE_ESTABLISHED"
  ) {
    return denied("INVALID_EXECUTION_LIFECYCLE_STATE");
  }

  if (
    predecessor.singleLifecycleTransitionOnly !== true ||
    predecessor.lifecycleMustPreserveExactExecutionScope !== true ||
    predecessor.lifecycleMustPreserveReceiptEvidence !== true ||
    predecessor.lifecycleMustPreserveExecutionEvidence !== true ||
    predecessor.lifecycleMustPreservePredecessorEvidence !== true
  ) {
    return denied("INVALID_EXECUTION_LIFECYCLE_INVARIANTS");
  }

  if (
    !predecessor.controlledOperationExecutionReceipt ||
    !predecessor.controlledOperationExecution ||
    !predecessor.operationExecutionAuthorization ||
    !predecessor.controlledExecutorInvocation ||
    !predecessor.controlledDispatch ||
    !predecessor.dispatchAuthorization ||
    !predecessor.activeAdmission ||
    !predecessor.authorization ||
    !predecessor.eligibility ||
    !predecessor.consumption ||
    !predecessor.receiptState ||
    !predecessor.executedOperation
  ) {
    return denied("MISSING_EXECUTION_PREDECESSOR_CHAIN");
  }

  if (predecessor.approvedExecutionScope.length === 0) {
    return denied("EMPTY_APPROVED_EXECUTION_SCOPE");
  }

  if (predecessor.provenance.length === 0) {
    return denied("EMPTY_PROVENANCE");
  }

  if (
    predecessor.controlledDispatchEvidence.length === 0 ||
    predecessor.executorInvocationAuthorizationEvidence.length === 0 ||
    predecessor.controlledExecutorInvocationEvidence.length === 0 ||
    predecessor.operationExecutionAuthorizationEvidence.length === 0 ||
    predecessor.controlledOperationExecutionEvidence.length === 0 ||
    predecessor.controlledOperationExecutionReceiptEvidence.length === 0 ||
    predecessor.controlledOperationExecutionLifecycleEvidence.length === 0
  ) {
    return denied("MISSING_EXECUTION_LIFECYCLE_EVIDENCE");
  }

  if (predecessor.blockedReasons.length !== 0) {
    return denied("BLOCKED_DEV_277_PREDECESSOR");
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
    return denied("DEV_277_PREDECESSOR_HAS_FORBIDDEN_AUTHORITY");
  }

  if (
    predecessor.futureControlledExecutionCompletionBoundaryRequired !== true
  ) {
    return denied("MISSING_CONTROLLED_EXECUTION_COMPLETION_BOUNDARY");
  }

  return {
    version: VERSION,

    trusted: true,
    ready: true,
    executionCompleted: true,

    defaultPolicy: "DENY",

    controlledExecutionCompletionBoundaryOnly: true,
    executionCompletionResultIsDeterministicData: true,

    executionCompletionState: "CONTROLLED_EXECUTION_COMPLETED",

    controlledOperationExecutionLifecycle: predecessor,
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

    approvedExecutionScope: [...predecessor.approvedExecutionScope],
    provenance: [...predecessor.provenance, VERSION],

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
      "DEV-278:CONTROLLED_EXECUTION_COMPLETED"
    ],

    blockedReasons: [],

    singleCompletionTransitionOnly: true,
    completionMustPreserveExactExecutionScope: true,
    completionMustPreserveLifecycleEvidence: true,
    completionMustPreserveReceiptEvidence: true,
    completionMustPreserveExecutionEvidence: true,
    completionMustPreservePredecessorEvidence: true,

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

    futureControlledExecutionFinalizationBoundaryRequired: true
  };
}
