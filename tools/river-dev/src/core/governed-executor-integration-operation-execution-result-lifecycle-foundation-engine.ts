import type {
  RiverDevGovernedExecutorIntegrationOperationExecutionResultFoundationResult,
  RiverDevGovernedExecutorIntegrationOperationExecutionResultLifecycleFoundationInput,
  RiverDevGovernedExecutorIntegrationOperationExecutionResultLifecycleFoundationResult
} from "../types";

const OBJECTIVE =
  "Establish an immutable inert lifecycle representation from exact trusted DEV-309 governed operation-execution result without persisting lifecycle state, re-executing operations, or creating mutation authority.";

function createDeniedLifecycle(
  operationExecutionResult:
    RiverDevGovernedExecutorIntegrationOperationExecutionResultFoundationResult,
  blockedReasons: readonly string[]
): RiverDevGovernedExecutorIntegrationOperationExecutionResultLifecycleFoundationResult {
  return {
    version: "DEV-310",
    source:
      "governed-executor-integration-operation-execution-result-lifecycle-foundation-engine",
    objective: OBJECTIVE,

    trusted: false,
    ready: false,
    lifecycleEstablished: false,

    defaultPolicy: "DENY",

    lifecycleOnly: true,
    lifecycleIsInertData: true,
    resultMutationProhibited: true,
    operationReexecutionProhibited: true,
    futureMutationCapableExecutionBoundaryRequired: true,

    lifecycleState:
      "GOVERNED_OPERATION_EXECUTION_RESULT_LIFECYCLE_NOT_ESTABLISHED",

    resultState:
      operationExecutionResult.resultState,

    receiptState:
      operationExecutionResult.receiptState,

    operationExecutionResult: null,

    lifecycleEvidence: [],

    provenance: [
      "DEV-310",
      "governed-executor-integration-operation-execution-result-lifecycle-foundation-engine"
    ],

    blockedReasons,

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
    mayPerformExternalSideEffects: false
  };
}

export function establishGovernedExecutorIntegrationOperationExecutionResultLifecycleFoundation(
  input:
    RiverDevGovernedExecutorIntegrationOperationExecutionResultLifecycleFoundationInput
): RiverDevGovernedExecutorIntegrationOperationExecutionResultLifecycleFoundationResult {

  const operationExecutionResult =
    input.operationExecutionResult;

  const blockedReasons: string[] = [];

  if (
    operationExecutionResult.version !==
    "DEV-309"
  ) {
    blockedReasons.push(
      "Operation execution result lifecycle requires exact DEV-309 result."
    );
  }

  if (
    operationExecutionResult.source !==
    "governed-executor-integration-operation-execution-result-foundation-engine"
  ) {
    blockedReasons.push(
      "DEV-309 operation execution result source is not trusted."
    );
  }

  if (
    operationExecutionResult.defaultPolicy !==
    "DENY"
  ) {
    blockedReasons.push(
      "DEV-309 default policy must remain DENY."
    );
  }

  if (
    operationExecutionResult.trusted !== true ||
    operationExecutionResult.ready !== true ||
    operationExecutionResult.resultEstablished !== true
  ) {
    blockedReasons.push(
      "DEV-309 governed operation execution result is not established."
    );
  }

  if (
    operationExecutionResult.resultState !==
    "GOVERNED_OPERATION_EXECUTION_RESULT_ESTABLISHED"
  ) {
    blockedReasons.push(
      "DEV-309 result state is not established."
    );
  }

  if (
    operationExecutionResult.receiptState !==
    "EXECUTION_RESULT_RECORDED"
  ) {
    blockedReasons.push(
      "DEV-309 execution result receipt is not recorded."
    );
  }

  if (
    operationExecutionResult.resultOnly !== true ||
    operationExecutionResult.resultIsInertData !== true ||
    operationExecutionResult.operationReexecutionProhibited !== true ||
    operationExecutionResult.futureMutationCapableExecutionBoundaryRequired !== true
  ) {
    blockedReasons.push(
      "DEV-309 inert result boundary invariants are not satisfied."
    );
  }

  if (
    operationExecutionResult.operationExecution === null
  ) {
    blockedReasons.push(
      "DEV-309 operation execution lineage is absent."
    );
  }

  if (
    operationExecutionResult.operationExecutionResultEvidence.length ===
    0
  ) {
    blockedReasons.push(
      "DEV-309 operation execution result evidence is absent."
    );
  }

  if (
    operationExecutionResult.mayInvokeExecutor !== false ||
    operationExecutionResult.mayExecuteOperation !== false ||
    operationExecutionResult.mayRetryExecution !== false ||
    operationExecutionResult.mayPersistLifecycleState !== false ||
    operationExecutionResult.mayModifyRepository !== false ||
    operationExecutionResult.mayDeleteRepositoryContent !== false ||
    operationExecutionResult.mayStageRepositoryChanges !== false ||
    operationExecutionResult.mayCommit !== false ||
    operationExecutionResult.mayPush !== false ||
    operationExecutionResult.mayDeploy !== false ||
    operationExecutionResult.mayAccessSecrets !== false ||
    operationExecutionResult.mayExpandScope !== false ||
    operationExecutionResult.mayPerformArbitraryShellExecution !== false ||
    operationExecutionResult.mayPerformNetworkExecution !== false ||
    operationExecutionResult.mayPerformExternalSideEffects !== false
  ) {
    blockedReasons.push(
      "DEV-309 exposes forbidden execution, persistence, or side-effect authority."
    );
  }

  if (blockedReasons.length > 0) {
    return createDeniedLifecycle(
      operationExecutionResult,
      blockedReasons
    );
  }

  return {
    version: "DEV-310",
    source:
      "governed-executor-integration-operation-execution-result-lifecycle-foundation-engine",
    objective: OBJECTIVE,

    trusted: true,
    ready: true,
    lifecycleEstablished: true,

    defaultPolicy: "DENY",

    lifecycleOnly: true,
    lifecycleIsInertData: true,
    resultMutationProhibited: true,
    operationReexecutionProhibited: true,
    futureMutationCapableExecutionBoundaryRequired: true,

    lifecycleState:
      "GOVERNED_OPERATION_EXECUTION_RESULT_LIFECYCLE_ESTABLISHED",

    resultState:
      operationExecutionResult.resultState,

    receiptState:
      operationExecutionResult.receiptState,

    operationExecutionResult,

    lifecycleEvidence: [
      ...operationExecutionResult.operationExecutionResultEvidence,
      "Exact trusted DEV-309 operation execution result consumed.",
      "Governed operation execution result lifecycle established.",
      "DEV-310 lifecycle is immutable inert data.",
      "DEV-310 persisted no lifecycle state.",
      "DEV-310 performed no operation re-execution.",
      "DEV-310 created no mutation authority."
    ],

    provenance: [
      ...operationExecutionResult.provenance,
      "DEV-310",
      "governed-executor-integration-operation-execution-result-lifecycle-foundation-engine"
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
    mayPerformExternalSideEffects: false
  };
}
