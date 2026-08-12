import type {
  RiverDevControlledOperationExecutionLifecycleFoundationResult,
  RiverDevControlledOperationExecutionReceiptFoundationResult
} from "../types";

const VERSION = "DEV-277" as const;

function reject(
  reason: string
): RiverDevControlledOperationExecutionLifecycleFoundationResult {
  return {
    version: VERSION,

    trusted: false,
    ready: false,
    executionLifecycleEstablished: false,

    defaultPolicy: "DENY",

    controlledOperationExecutionLifecycleBoundaryOnly: true,
    executionLifecycleResultIsDeterministicData: true,

    executionLifecycleState:
      "CONTROLLED_OPERATION_EXECUTION_LIFECYCLE_NOT_ESTABLISHED",

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

    blockedReasons: [reason],

    singleLifecycleTransitionOnly: true,
    lifecycleMustPreserveExactExecutionScope: true,
    lifecycleMustPreserveReceiptEvidence: true,
    lifecycleMustPreserveExecutionEvidence: true,
    lifecycleMustPreservePredecessorEvidence: true,

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

    futureControlledExecutionCompletionBoundaryRequired: true
  };
}

export function establishControlledOperationExecutionLifecycle(
  predecessor: RiverDevControlledOperationExecutionReceiptFoundationResult
): RiverDevControlledOperationExecutionLifecycleFoundationResult {
  if (!predecessor || predecessor.version !== "DEV-276") {
    return reject(
      "DEV-277 requires the exact DEV-276 controlled operation execution receipt contract."
    );
  }

  if (
    predecessor.trusted !== true ||
    predecessor.ready !== true ||
    predecessor.executionReceiptCreated !== true
  ) {
    return reject(
      "DEV-276 predecessor must be trusted, ready, and execution-receipt-created."
    );
  }

  if (
    predecessor.defaultPolicy !== "DENY" ||
    predecessor.controlledOperationExecutionReceiptBoundaryOnly !== true ||
    predecessor.executionReceiptResultIsDeterministicData !== true ||
    predecessor.executionReceiptState !==
      "CONTROLLED_OPERATION_EXECUTION_RECEIPT_CREATED"
  ) {
    return reject(
      "DEV-276 predecessor must represent the exact deterministic controlled execution receipt boundary."
    );
  }

  if (
    predecessor.singleExecutionReceiptOnly !== true ||
    predecessor.receiptMustPreserveExactExecutionScope !== true ||
    predecessor.receiptMustPreservePredecessorEvidence !== true ||
    predecessor.receiptMustPreserveExecutionEvidence !== true
  ) {
    return reject(
      "DEV-276 predecessor must preserve all execution receipt invariants."
    );
  }

  if (
    predecessor.controlledOperationExecution === null ||
    predecessor.operationExecutionAuthorization === null ||
    predecessor.controlledExecutorInvocation === null ||
    predecessor.controlledDispatch === null ||
    predecessor.dispatchAuthorization === null ||
    predecessor.activeAdmission === null ||
    predecessor.authorization === null ||
    predecessor.eligibility === null ||
    predecessor.consumption === null ||
    predecessor.receiptState === null ||
    predecessor.executedOperation === null
  ) {
    return reject(
      "DEV-276 predecessor is missing required receipt or execution-chain state."
    );
  }

  if (predecessor.approvedExecutionScope.length === 0) {
    return reject(
      "DEV-276 predecessor must preserve a non-empty approved execution scope."
    );
  }

  if (predecessor.provenance.length === 0) {
    return reject(
      "DEV-276 predecessor must preserve provenance."
    );
  }

  if (
    predecessor.controlledDispatchEvidence.length === 0 ||
    predecessor.executorInvocationAuthorizationEvidence.length === 0 ||
    predecessor.controlledExecutorInvocationEvidence.length === 0 ||
    predecessor.operationExecutionAuthorizationEvidence.length === 0 ||
    predecessor.controlledOperationExecutionEvidence.length === 0 ||
    predecessor.controlledOperationExecutionReceiptEvidence.length === 0
  ) {
    return reject(
      "DEV-276 predecessor must preserve the complete receipt and execution evidence chain."
    );
  }

  if (predecessor.blockedReasons.length !== 0) {
    return reject(
      "DEV-276 predecessor must not contain blocked reasons."
    );
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
    return reject(
      "DEV-276 predecessor exceeds the permitted execution lifecycle boundary."
    );
  }

  if (predecessor.futureExecutionLifecycleBoundaryRequired !== true) {
    return reject(
      "DEV-276 predecessor must require the future execution lifecycle boundary."
    );
  }

  return {
    version: VERSION,

    trusted: true,
    ready: true,
    executionLifecycleEstablished: true,

    defaultPolicy: "DENY",

    controlledOperationExecutionLifecycleBoundaryOnly: true,
    executionLifecycleResultIsDeterministicData: true,

    executionLifecycleState:
      "CONTROLLED_OPERATION_EXECUTION_LIFECYCLE_ESTABLISHED",

    controlledOperationExecutionReceipt: predecessor,
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
      [...predecessor.provenance, VERSION],

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

    controlledOperationExecutionLifecycleEvidence: [
      "DEV-277 controlled operation execution lifecycle established from exact DEV-276 predecessor.",
      `DEV-277 preserved approved execution scope entries: ${predecessor.approvedExecutionScope.length}.`,
      `DEV-277 preserved execution receipt evidence entries: ${predecessor.controlledOperationExecutionReceiptEvidence.length}.`
    ],

    blockedReasons: [],

    singleLifecycleTransitionOnly: true,
    lifecycleMustPreserveExactExecutionScope: true,
    lifecycleMustPreserveReceiptEvidence: true,
    lifecycleMustPreserveExecutionEvidence: true,
    lifecycleMustPreservePredecessorEvidence: true,

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

    futureControlledExecutionCompletionBoundaryRequired: true
  };
}
