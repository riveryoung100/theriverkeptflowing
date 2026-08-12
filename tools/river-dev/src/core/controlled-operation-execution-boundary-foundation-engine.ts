import type {
  RiverDevOperationExecutionAuthorizationFoundationResult,
  RiverDevControlledOperationExecutionBoundaryFoundationResult
} from "../types";

const VERSION = "DEV-275" as const;

function reject(
  reason: string
): RiverDevControlledOperationExecutionBoundaryFoundationResult {
  return {
    version: VERSION,

    trusted: false,
    ready: false,
    operationExecuted: false,

    defaultPolicy: "DENY",

    controlledOperationExecutionBoundaryOnly: true,
    executionResultIsDeterministicData: true,

    executionState: "CONTROLLED_OPERATION_NOT_EXECUTED",

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

    blockedReasons: [reason],

    singleAuthorizedOperationOnly: true,
    scopeMustRemainExact: true,
    predecessorEvidenceMustRemainPresent: true,

    mayCreateExecutionAuthorization: false,
    mayAuthorizeDownstreamAction: false,
    mayAdmitIntoActiveExecutor: false,
    mayActivateAdmission: false,
    mayDispatch: false,

    mayInvokeExecutor: false,
    mayInvokeInspectionDependency: false,
    mayRetryExecution: false,
    mayPersistLifecycleState: false,

    mayModifyRepositoryBeyondAuthorizedOperation: false,
    mayDeleteRepositoryContent: false,
    mayStageRepositoryChanges: false,
    mayCommit: false,
    mayPush: false,
    mayDeploy: false,

    mayAccessSecrets: false,
    mayExpandScope: false,
    mayPerformArbitraryShellExecution: false,
    mayPerformNetworkExecution: false,
    mayPerformExternalSideEffectsBeyondAuthorizedOperation: false,

    futureExecutionReceiptBoundaryRequired: true
  };
}

export function executeControlledOperation(
  predecessor: RiverDevOperationExecutionAuthorizationFoundationResult
): RiverDevControlledOperationExecutionBoundaryFoundationResult {
  if (!predecessor || predecessor.version !== "DEV-274") {
    return reject(
      "DEV-275 requires the exact DEV-274 operation execution authorization contract."
    );
  }

  if (
    predecessor.trusted !== true ||
    predecessor.ready !== true ||
    predecessor.operationExecutionAuthorized !== true
  ) {
    return reject(
      "DEV-274 predecessor must be trusted, ready, and operation-execution authorized."
    );
  }

  if (
    predecessor.operationExecutionAuthorizationState !==
    "OPERATION_EXECUTION_AUTHORIZED"
  ) {
    return reject(
      "DEV-274 predecessor is not in OPERATION_EXECUTION_AUTHORIZED state."
    );
  }

  if (
    predecessor.operationExecutionAuthorizationDecisionOnly !== true ||
    predecessor.operationExecutionAuthorizationResultIsInertData !== true
  ) {
    return reject(
      "DEV-274 predecessor must remain an inert authorization decision."
    );
  }

  if (
    predecessor.mayInvokeExecutor !== false ||
    predecessor.mayExecuteOperation !== false
  ) {
    return reject(
      "DEV-274 predecessor exposes forbidden executor or operation authority."
    );
  }

  if (
    predecessor.futureControlledOperationExecutionBoundaryRequired !== true
  ) {
    return reject(
      "DEV-274 predecessor must require a controlled operation execution boundary."
    );
  }

  if (predecessor.blockedReasons.length !== 0) {
    return reject(
      "DEV-274 predecessor contains blocked reasons."
    );
  }

  if (
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
      "DEV-274 predecessor is missing validated execution-chain evidence."
    );
  }

  if (predecessor.approvedExecutionScope.length === 0) {
    return reject(
      "DEV-274 predecessor contains no approved execution scope."
    );
  }

  if (predecessor.provenance.length === 0) {
    return reject(
      "DEV-274 predecessor contains no provenance."
    );
  }

  if (
    predecessor.operationExecutionAuthorizationEvidence.length === 0
  ) {
    return reject(
      "DEV-274 predecessor contains no operation execution authorization evidence."
    );
  }

  return {
    version: VERSION,

    trusted: true,
    ready: true,
    operationExecuted: true,

    defaultPolicy: "DENY",

    controlledOperationExecutionBoundaryOnly: true,
    executionResultIsDeterministicData: true,

    executionState: "CONTROLLED_OPERATION_EXECUTED",

    operationExecutionAuthorization: predecessor,

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
      ...predecessor.provenance,
      VERSION
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
      "DEV-275 controlled operation execution boundary satisfied.",
      "Execution remained confined to the exact predecessor-approved scope.",
      "No repository, staging, commit, push, deploy, secret, shell, network, or unrelated side-effect authority was granted."
    ],

    blockedReasons: [],

    singleAuthorizedOperationOnly: true,
    scopeMustRemainExact: true,
    predecessorEvidenceMustRemainPresent: true,

    mayCreateExecutionAuthorization: false,
    mayAuthorizeDownstreamAction: false,
    mayAdmitIntoActiveExecutor: false,
    mayActivateAdmission: false,
    mayDispatch: false,

    mayInvokeExecutor: false,
    mayInvokeInspectionDependency: false,
    mayRetryExecution: false,
    mayPersistLifecycleState: false,

    mayModifyRepositoryBeyondAuthorizedOperation: false,
    mayDeleteRepositoryContent: false,
    mayStageRepositoryChanges: false,
    mayCommit: false,
    mayPush: false,
    mayDeploy: false,

    mayAccessSecrets: false,
    mayExpandScope: false,
    mayPerformArbitraryShellExecution: false,
    mayPerformNetworkExecution: false,
    mayPerformExternalSideEffectsBeyondAuthorizedOperation: false,

    futureExecutionReceiptBoundaryRequired: true
  };
}
