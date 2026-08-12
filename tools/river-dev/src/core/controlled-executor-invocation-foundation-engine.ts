import type {
  RiverDevControlledExecutorInvocationAuthorizationFoundationResult,
  RiverDevControlledExecutorInvocationFoundationResult
} from "../types";

const VERSION = "DEV-273" as const;
const DEFAULT_POLICY = "DENY" as const;

const EMPTY: readonly string[] = Object.freeze([]);

function rejected(
  ...blockedReasons: string[]
): RiverDevControlledExecutorInvocationFoundationResult {
  return {
    version: VERSION,

    trusted: false,
    ready: false,
    invoked: false,

    defaultPolicy: DEFAULT_POLICY,

    controlledExecutorInvocationBoundaryOnly: true,
    controlledExecutorInvocationResultIsInertData: true,

    invocationState: "CONTROLLED_EXECUTOR_NOT_INVOKED",

    invocationAuthorization: null,

    controlledDispatch: null,
    dispatchAuthorization: null,
    activeAdmission: null,
    authorization: null,
    eligibility: null,
    consumption: null,
    receiptState: null,
    executedOperation: null,

    approvedExecutionScope: EMPTY,
    provenance: EMPTY,

    controlledDispatchEvidence: EMPTY,
    executorInvocationAuthorizationEvidence: EMPTY,
    controlledExecutorInvocationEvidence: EMPTY,

    blockedReasons: Object.freeze([...blockedReasons]),

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

    futureExecutionBoundaryRequired: true
  };
}

export function buildControlledExecutorInvocationFoundation(
  predecessor:
    RiverDevControlledExecutorInvocationAuthorizationFoundationResult
): RiverDevControlledExecutorInvocationFoundationResult {
  const blockedReasons: string[] = [];

  if (predecessor.version !== "DEV-272") {
    blockedReasons.push("INVALID_PREDECESSOR_VERSION");
  }

  if (!predecessor.trusted) {
    blockedReasons.push("PREDECESSOR_NOT_TRUSTED");
  }

  if (!predecessor.ready) {
    blockedReasons.push("PREDECESSOR_NOT_READY");
  }

  if (!predecessor.executorInvocationAuthorized) {
    blockedReasons.push("EXECUTOR_INVOCATION_NOT_AUTHORIZED");
  }

  if (
    predecessor.executorInvocationAuthorizationState !==
    "EXECUTOR_INVOCATION_AUTHORIZED"
  ) {
    blockedReasons.push(
      "INVALID_EXECUTOR_INVOCATION_AUTHORIZATION_STATE"
    );
  }

  if (predecessor.defaultPolicy !== "DENY") {
    blockedReasons.push("INVALID_DEFAULT_POLICY");
  }

  if (
    predecessor.executorInvocationAuthorizationDecisionOnly !==
    true
  ) {
    blockedReasons.push(
      "AUTHORIZATION_DECISION_ONLY_CONTRACT_MISSING"
    );
  }

  if (
    predecessor.executorInvocationAuthorizationResultIsInertData !==
    true
  ) {
    blockedReasons.push(
      "AUTHORIZATION_RESULT_NOT_INERT"
    );
  }

  if (predecessor.mayInvokeExecutor !== false) {
    blockedReasons.push(
      "PREDECESSOR_INVOCATION_AUTHORITY_INVALID"
    );
  }

  if (predecessor.mayExecuteOperation !== false) {
    blockedReasons.push(
      "PREDECESSOR_EXECUTION_AUTHORITY_INVALID"
    );
  }

  if (
    predecessor.futureControlledExecutorInvocationBoundaryRequired !==
    true
  ) {
    blockedReasons.push(
      "CONTROLLED_INVOCATION_BOUNDARY_NOT_REQUIRED"
    );
  }

  if (
    predecessor.futureExecutionBoundaryRequired !==
    true
  ) {
    blockedReasons.push(
      "FUTURE_EXECUTION_BOUNDARY_NOT_REQUIRED"
    );
  }

  if (predecessor.controlledDispatch === null) {
    blockedReasons.push("CONTROLLED_DISPATCH_MISSING");
  }

  if (predecessor.dispatchAuthorization === null) {
    blockedReasons.push("DISPATCH_AUTHORIZATION_MISSING");
  }

  if (predecessor.activeAdmission === null) {
    blockedReasons.push("ACTIVE_ADMISSION_MISSING");
  }

  if (predecessor.authorization === null) {
    blockedReasons.push("AUTHORIZATION_MISSING");
  }

  if (predecessor.eligibility === null) {
    blockedReasons.push("ELIGIBILITY_MISSING");
  }

  if (predecessor.consumption === null) {
    blockedReasons.push("CONSUMPTION_MISSING");
  }

  if (predecessor.receiptState === null) {
    blockedReasons.push("RECEIPT_STATE_MISSING");
  }

  if (predecessor.executedOperation === null) {
    blockedReasons.push("EXECUTED_OPERATION_MISSING");
  }

  if (predecessor.approvedExecutionScope.length === 0) {
    blockedReasons.push("APPROVED_EXECUTION_SCOPE_EMPTY");
  }

  if (predecessor.provenance.length === 0) {
    blockedReasons.push("PROVENANCE_EMPTY");
  }

  if (predecessor.controlledDispatchEvidence.length === 0) {
    blockedReasons.push("CONTROLLED_DISPATCH_EVIDENCE_EMPTY");
  }

  if (
    predecessor.executorInvocationAuthorizationEvidence.length === 0
  ) {
    blockedReasons.push(
      "EXECUTOR_INVOCATION_AUTHORIZATION_EVIDENCE_EMPTY"
    );
  }

  if (predecessor.blockedReasons.length !== 0) {
    blockedReasons.push(
      "PREDECESSOR_CONTAINS_BLOCKED_REASONS"
    );
  }

  if (blockedReasons.length > 0) {
    return rejected(...blockedReasons);
  }

  const evidence = Object.freeze([
    "DEV-273:INVOCATION_AUTHORIZATION_PREDECESSOR_VALIDATED",
    "DEV-273:CONTROLLED_EXECUTOR_INVOCATION_BOUNDARY_CROSSED",
    "DEV-273:CONTROLLED_EXECUTOR_INVOKED",
    "DEV-273:INVOCATION_RESULT_INERT",
    "DEV-273:EXECUTOR_IMPLEMENTATION_NOT_CALLED",
    "DEV-273:OPERATION_NOT_EXECUTED",
    "DEV-273:FUTURE_EXECUTION_BOUNDARY_REQUIRED"
  ]);

  return {
    version: VERSION,

    trusted: true,
    ready: true,
    invoked: true,

    defaultPolicy: DEFAULT_POLICY,

    controlledExecutorInvocationBoundaryOnly: true,
    controlledExecutorInvocationResultIsInertData: true,

    invocationState: "CONTROLLED_EXECUTOR_INVOKED",

    invocationAuthorization: predecessor,

    controlledDispatch: predecessor.controlledDispatch,
    dispatchAuthorization: predecessor.dispatchAuthorization,
    activeAdmission: predecessor.activeAdmission,
    authorization: predecessor.authorization,
    eligibility: predecessor.eligibility,
    consumption: predecessor.consumption,
    receiptState: predecessor.receiptState,
    executedOperation: predecessor.executedOperation,

    approvedExecutionScope:
      Object.freeze([...predecessor.approvedExecutionScope]),

    provenance:
      Object.freeze([...predecessor.provenance]),

    controlledDispatchEvidence:
      Object.freeze([...predecessor.controlledDispatchEvidence]),

    executorInvocationAuthorizationEvidence:
      Object.freeze([
        ...predecessor.executorInvocationAuthorizationEvidence
      ]),

    controlledExecutorInvocationEvidence: evidence,

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
    mayPerformNetworkExecution: false,
    mayPerformExternalSideEffects: false,

    futureExecutionBoundaryRequired: true
  };
}
