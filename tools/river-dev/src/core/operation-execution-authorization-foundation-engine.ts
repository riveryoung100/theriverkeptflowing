import type {
  RiverDevControlledExecutorInvocationFoundationResult,
  RiverDevOperationExecutionAuthorizationFoundationResult
} from "../types";

const VERSION = "DEV-274" as const;

function reject(
  reason: string
): RiverDevOperationExecutionAuthorizationFoundationResult {
  return {
    version: VERSION,

    trusted: false,
    ready: false,
    operationExecutionAuthorized: false,

    defaultPolicy: "DENY",

    operationExecutionAuthorizationDecisionOnly: true,
    operationExecutionAuthorizationResultIsInertData: true,

    operationExecutionAuthorizationState:
      "OPERATION_EXECUTION_UNAUTHORIZED",

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

    futureControlledOperationExecutionBoundaryRequired: true
  };
}

export function authorizeOperationExecution(
  predecessor: RiverDevControlledExecutorInvocationFoundationResult
): RiverDevOperationExecutionAuthorizationFoundationResult {
  if (!predecessor || predecessor.version !== "DEV-273") {
    return reject(
      "DEV-274 requires the exact DEV-273 controlled executor invocation contract."
    );
  }

  if (
    predecessor.trusted !== true ||
    predecessor.ready !== true ||
    predecessor.invoked !== true
  ) {
    return reject(
      "DEV-273 predecessor must be trusted, ready, and invoked."
    );
  }

  if (
    predecessor.invocationState !== "CONTROLLED_EXECUTOR_INVOKED"
  ) {
    return reject(
      "DEV-273 predecessor is not in CONTROLLED_EXECUTOR_INVOKED state."
    );
  }

  if (
    predecessor.controlledExecutorInvocationResultIsInertData !== true
  ) {
    return reject(
      "DEV-273 predecessor invocation result must remain inert data."
    );
  }

  if (
    predecessor.mayInvokeExecutor !== false ||
    predecessor.mayExecuteOperation !== false
  ) {
    return reject(
      "DEV-273 predecessor exposes forbidden executor or operation authority."
    );
  }

  if (
    predecessor.futureExecutionBoundaryRequired !== true
  ) {
    return reject(
      "DEV-273 predecessor must require a future execution boundary."
    );
  }

  if (
    predecessor.blockedReasons.length !== 0
  ) {
    return reject(
      "DEV-273 predecessor contains blocked reasons."
    );
  }

  if (
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
      "DEV-273 predecessor is missing validated execution-chain evidence."
    );
  }

  if (
    predecessor.approvedExecutionScope.length === 0
  ) {
    return reject(
      "DEV-273 predecessor contains no approved execution scope."
    );
  }

  if (
    predecessor.provenance.length === 0
  ) {
    return reject(
      "DEV-273 predecessor contains no provenance."
    );
  }

  if (
    predecessor.controlledExecutorInvocationEvidence.length === 0
  ) {
    return reject(
      "DEV-273 predecessor contains no controlled executor invocation evidence."
    );
  }

  return {
    version: VERSION,

    trusted: true,
    ready: true,
    operationExecutionAuthorized: true,

    defaultPolicy: "DENY",

    operationExecutionAuthorizationDecisionOnly: true,
    operationExecutionAuthorizationResultIsInertData: true,

    operationExecutionAuthorizationState:
      "OPERATION_EXECUTION_AUTHORIZED",

    controlledExecutorInvocation: predecessor,
    controlledDispatch: predecessor.controlledDispatch,
    dispatchAuthorization: predecessor.dispatchAuthorization,
    activeAdmission: predecessor.activeAdmission,
    authorization: predecessor.authorization,
    eligibility: predecessor.eligibility,
    consumption: predecessor.consumption,
    receiptState: predecessor.receiptState,
    executedOperation: predecessor.executedOperation,

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
      "DEV-274 exact DEV-273 predecessor contract validated.",
      "DEV-274 predecessor is trusted, ready, invoked, and unblocked.",
      "DEV-274 predecessor remains inert and grants no executor or operation authority.",
      "DEV-274 operation execution authorization represented as inert data only.",
      "DEV-274 requires a future controlled operation execution boundary."
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

    futureControlledOperationExecutionBoundaryRequired: true
  };
}
