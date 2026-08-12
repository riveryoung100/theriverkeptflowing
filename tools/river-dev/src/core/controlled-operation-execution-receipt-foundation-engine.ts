import type {
  RiverDevControlledOperationExecutionBoundaryFoundationResult,
  RiverDevControlledOperationExecutionReceiptFoundationResult
} from "../types";

const VERSION = "DEV-276" as const;

function reject(
  reason: string
): RiverDevControlledOperationExecutionReceiptFoundationResult {
  return {
    version: VERSION,

    trusted: false,
    ready: false,
    executionReceiptCreated: false,

    defaultPolicy: "DENY",

    controlledOperationExecutionReceiptBoundaryOnly: true,
    executionReceiptResultIsDeterministicData: true,

    executionReceiptState:
      "CONTROLLED_OPERATION_EXECUTION_RECEIPT_NOT_CREATED",

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

    blockedReasons: [reason],

    singleExecutionReceiptOnly: true,
    receiptMustPreserveExactExecutionScope: true,
    receiptMustPreservePredecessorEvidence: true,
    receiptMustPreserveExecutionEvidence: true,

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

    futureExecutionLifecycleBoundaryRequired: true
  };
}

export function createControlledOperationExecutionReceipt(
  predecessor: RiverDevControlledOperationExecutionBoundaryFoundationResult
): RiverDevControlledOperationExecutionReceiptFoundationResult {
  if (!predecessor || predecessor.version !== "DEV-275") {
    return reject(
      "DEV-276 requires the exact DEV-275 controlled operation execution boundary contract."
    );
  }

  if (
    predecessor.trusted !== true ||
    predecessor.ready !== true ||
    predecessor.operationExecuted !== true
  ) {
    return reject(
      "DEV-275 predecessor must be trusted, ready, and operation-executed."
    );
  }

  if (
    predecessor.controlledOperationExecutionBoundaryOnly !== true ||
    predecessor.executionResultIsDeterministicData !== true ||
    predecessor.executionState !== "CONTROLLED_OPERATION_EXECUTED"
  ) {
    return reject(
      "DEV-275 predecessor must represent a deterministic controlled operation execution."
    );
  }

  if (
    predecessor.singleAuthorizedOperationOnly !== true ||
    predecessor.scopeMustRemainExact !== true ||
    predecessor.predecessorEvidenceMustRemainPresent !== true
  ) {
    return reject(
      "DEV-275 predecessor must preserve the exact authorized execution boundary."
    );
  }

  if (
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
      "DEV-275 predecessor is missing required execution-chain state."
    );
  }

  if (predecessor.approvedExecutionScope.length === 0) {
    return reject(
      "DEV-275 predecessor must preserve a non-empty approved execution scope."
    );
  }

  if (predecessor.provenance.length === 0) {
    return reject(
      "DEV-275 predecessor must preserve provenance."
    );
  }

  if (
    predecessor.controlledDispatchEvidence.length === 0 ||
    predecessor.executorInvocationAuthorizationEvidence.length === 0 ||
    predecessor.controlledExecutorInvocationEvidence.length === 0 ||
    predecessor.operationExecutionAuthorizationEvidence.length === 0 ||
    predecessor.controlledOperationExecutionEvidence.length === 0
  ) {
    return reject(
      "DEV-275 predecessor must preserve the complete execution evidence chain."
    );
  }

  if (predecessor.blockedReasons.length !== 0) {
    return reject(
      "DEV-275 predecessor must not contain blocked reasons."
    );
  }

  if (
    predecessor.mayCreateExecutionAuthorization !== false ||
    predecessor.mayAuthorizeDownstreamAction !== false ||
    predecessor.mayAdmitIntoActiveExecutor !== false ||
    predecessor.mayActivateAdmission !== false ||
    predecessor.mayDispatch !== false ||
    predecessor.mayInvokeExecutor !== false ||
    predecessor.mayInvokeInspectionDependency !== false ||
    predecessor.mayRetryExecution !== false ||
    predecessor.mayPersistLifecycleState !== false ||
    predecessor.mayModifyRepositoryBeyondAuthorizedOperation !== false ||
    predecessor.mayDeleteRepositoryContent !== false ||
    predecessor.mayStageRepositoryChanges !== false ||
    predecessor.mayCommit !== false ||
    predecessor.mayPush !== false ||
    predecessor.mayDeploy !== false ||
    predecessor.mayAccessSecrets !== false ||
    predecessor.mayExpandScope !== false ||
    predecessor.mayPerformArbitraryShellExecution !== false ||
    predecessor.mayPerformNetworkExecution !== false ||
    predecessor.mayPerformExternalSideEffectsBeyondAuthorizedOperation !== false
  ) {
    return reject(
      "DEV-275 predecessor exceeds the permitted post-execution authority boundary."
    );
  }

  if (predecessor.futureExecutionReceiptBoundaryRequired !== true) {
    return reject(
      "DEV-275 predecessor must require the future execution receipt boundary."
    );
  }

  return {
    version: VERSION,

    trusted: true,
    ready: true,
    executionReceiptCreated: true,

    defaultPolicy: "DENY",

    controlledOperationExecutionReceiptBoundaryOnly: true,
    executionReceiptResultIsDeterministicData: true,

    executionReceiptState:
      "CONTROLLED_OPERATION_EXECUTION_RECEIPT_CREATED",

    controlledOperationExecution: predecessor,

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

    controlledOperationExecutionReceiptEvidence: [
      "DEV-276 controlled operation execution receipt created from exact DEV-275 predecessor.",
      `DEV-276 preserved approved execution scope entries: ${predecessor.approvedExecutionScope.length}.`,
      `DEV-276 preserved controlled operation execution evidence entries: ${predecessor.controlledOperationExecutionEvidence.length}.`
    ],

    blockedReasons: [],

    singleExecutionReceiptOnly: true,
    receiptMustPreserveExactExecutionScope: true,
    receiptMustPreservePredecessorEvidence: true,
    receiptMustPreserveExecutionEvidence: true,

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

    futureExecutionLifecycleBoundaryRequired: true
  };
}
