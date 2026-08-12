import type {
  RiverDevControlledExecutionCompletionFoundationResult,
  RiverDevControlledExecutionFinalizationFoundationResult
} from "../types";

const VERSION = "DEV-279" as const;

function denied(
  reason: string
): RiverDevControlledExecutionFinalizationFoundationResult {
  return {
    version: VERSION,

    trusted: false,
    ready: false,
    executionFinalized: false,

    defaultPolicy: "DENY",

    controlledExecutionFinalizationBoundaryOnly: true,
    executionFinalizationResultIsDeterministicData: true,

    executionFinalizationState: "CONTROLLED_EXECUTION_NOT_FINALIZED",

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

    blockedReasons: [reason],

    singleFinalizationTransitionOnly: true,
    finalizationMustPreserveExactExecutionScope: true,
    finalizationMustPreserveCompletionEvidence: true,
    finalizationMustPreserveLifecycleEvidence: true,
    finalizationMustPreserveReceiptEvidence: true,
    finalizationMustPreserveExecutionEvidence: true,
    finalizationMustPreservePredecessorEvidence: true,

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

    futureControlledExecutionClosureBoundaryRequired: true
  };
}

export function establishControlledExecutionFinalizationFoundation(
  predecessor:
    | RiverDevControlledExecutionCompletionFoundationResult
    | null
    | undefined
): RiverDevControlledExecutionFinalizationFoundationResult {
  if (!predecessor || predecessor.version !== "DEV-278") {
    return denied("INVALID_DEV_278_PREDECESSOR");
  }

  if (!predecessor.trusted) {
    return denied("UNTRUSTED_DEV_278_PREDECESSOR");
  }

  if (!predecessor.ready) {
    return denied("UNREADY_DEV_278_PREDECESSOR");
  }

  if (!predecessor.executionCompleted) {
    return denied("DEV_278_EXECUTION_NOT_COMPLETED");
  }

  if (predecessor.defaultPolicy !== "DENY") {
    return denied("INVALID_DEV_278_DEFAULT_POLICY");
  }

  if (!predecessor.controlledExecutionCompletionBoundaryOnly) {
    return denied("INVALID_DEV_278_COMPLETION_BOUNDARY");
  }

  if (!predecessor.executionCompletionResultIsDeterministicData) {
    return denied("NON_DETERMINISTIC_DEV_278_COMPLETION");
  }

  if (
    predecessor.executionCompletionState !==
    "CONTROLLED_EXECUTION_COMPLETED"
  ) {
    return denied("INVALID_DEV_278_COMPLETION_STATE");
  }

  if (!predecessor.singleCompletionTransitionOnly) {
    return denied("INVALID_DEV_278_COMPLETION_TRANSITION");
  }

  if (!predecessor.completionMustPreserveExactExecutionScope) {
    return denied("INVALID_DEV_278_SCOPE_PRESERVATION");
  }

  if (!predecessor.completionMustPreserveLifecycleEvidence) {
    return denied("INVALID_DEV_278_LIFECYCLE_PRESERVATION");
  }

  if (!predecessor.completionMustPreserveReceiptEvidence) {
    return denied("INVALID_DEV_278_RECEIPT_PRESERVATION");
  }

  if (!predecessor.completionMustPreserveExecutionEvidence) {
    return denied("INVALID_DEV_278_EXECUTION_PRESERVATION");
  }

  if (!predecessor.completionMustPreservePredecessorEvidence) {
    return denied("INVALID_DEV_278_PREDECESSOR_PRESERVATION");
  }

  if (!predecessor.controlledOperationExecutionLifecycle) {
    return denied("MISSING_DEV_278_EXECUTION_LIFECYCLE");
  }

  if (!predecessor.controlledOperationExecutionReceipt) {
    return denied("MISSING_DEV_278_EXECUTION_RECEIPT");
  }

  if (!predecessor.controlledOperationExecution) {
    return denied("MISSING_DEV_278_CONTROLLED_OPERATION_EXECUTION");
  }

  if (!predecessor.executedOperation) {
    return denied("MISSING_DEV_278_EXECUTED_OPERATION");
  }

  if (predecessor.approvedExecutionScope.length === 0) {
    return denied("EMPTY_DEV_278_APPROVED_EXECUTION_SCOPE");
  }

  if (predecessor.provenance.length === 0) {
    return denied("EMPTY_DEV_278_PROVENANCE");
  }

  if (predecessor.controlledExecutionCompletionEvidence.length === 0) {
    return denied("MISSING_DEV_278_COMPLETION_EVIDENCE");
  }

  if (predecessor.controlledOperationExecutionLifecycleEvidence.length === 0) {
    return denied("MISSING_DEV_278_LIFECYCLE_EVIDENCE");
  }

  if (predecessor.controlledOperationExecutionReceiptEvidence.length === 0) {
    return denied("MISSING_DEV_278_RECEIPT_EVIDENCE");
  }

  if (predecessor.controlledOperationExecutionEvidence.length === 0) {
    return denied("MISSING_DEV_278_EXECUTION_EVIDENCE");
  }

  if (predecessor.blockedReasons.length !== 0) {
    return denied("BLOCKED_DEV_278_PREDECESSOR");
  }

  if (predecessor.mayInvokeExecutor) {
    return denied("DEV_278_EXECUTOR_AUTHORITY_PRESENT");
  }

  if (predecessor.mayExecuteOperation) {
    return denied("DEV_278_EXECUTION_AUTHORITY_PRESENT");
  }

  if (predecessor.mayRetryExecution) {
    return denied("DEV_278_RETRY_AUTHORITY_PRESENT");
  }

  if (predecessor.mayPersistLifecycleState) {
    return denied("DEV_278_LIFECYCLE_PERSISTENCE_AUTHORITY_PRESENT");
  }

  if (predecessor.mayModifyRepository) {
    return denied("DEV_278_REPOSITORY_MUTATION_AUTHORITY_PRESENT");
  }

  if (predecessor.mayCommit) {
    return denied("DEV_278_COMMIT_AUTHORITY_PRESENT");
  }

  if (predecessor.mayPush) {
    return denied("DEV_278_PUSH_AUTHORITY_PRESENT");
  }

  if (predecessor.mayPerformExternalSideEffects) {
    return denied("DEV_278_EXTERNAL_SIDE_EFFECT_AUTHORITY_PRESENT");
  }

  if (!predecessor.futureControlledExecutionFinalizationBoundaryRequired) {
    return denied("MISSING_DEV_278_FINALIZATION_BOUNDARY");
  }

  return {
    version: VERSION,

    trusted: true,
    ready: true,
    executionFinalized: true,

    defaultPolicy: "DENY",

    controlledExecutionFinalizationBoundaryOnly: true,
    executionFinalizationResultIsDeterministicData: true,

    executionFinalizationState: "CONTROLLED_EXECUTION_FINALIZED",

    controlledExecutionCompletion: predecessor,
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

    approvedExecutionScope: [
      ...predecessor.approvedExecutionScope
    ],

    provenance: [
      ...predecessor.provenance
    ],

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
      "DEV-279:CONTROLLED_EXECUTION_FINALIZED"
    ],

    blockedReasons: [],

    singleFinalizationTransitionOnly: true,
    finalizationMustPreserveExactExecutionScope: true,
    finalizationMustPreserveCompletionEvidence: true,
    finalizationMustPreserveLifecycleEvidence: true,
    finalizationMustPreserveReceiptEvidence: true,
    finalizationMustPreserveExecutionEvidence: true,
    finalizationMustPreservePredecessorEvidence: true,

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

    futureControlledExecutionClosureBoundaryRequired: true
  };
}
