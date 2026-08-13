import type {
  RiverDevGovernedExecutorIntegrationOperationExecutionResultCompletionFoundationInput,
  RiverDevGovernedExecutorIntegrationOperationExecutionResultCompletionFoundationResult,
  RiverDevGovernedExecutorIntegrationOperationExecutionResultLifecycleFoundationResult
} from "../types";

const OBJECTIVE =
  "Establish an immutable inert completion representation from exact trusted DEV-310 governed operation-execution result lifecycle without persisting state, re-executing operations, or creating mutation authority.";

function createDeniedCompletion(
  resultLifecycle:
    RiverDevGovernedExecutorIntegrationOperationExecutionResultLifecycleFoundationResult,
  blockedReasons: readonly string[]
): RiverDevGovernedExecutorIntegrationOperationExecutionResultCompletionFoundationResult {

  return {
    version: "DEV-311",

    source:
      "governed-executor-integration-operation-execution-result-completion-foundation-engine",

    objective: OBJECTIVE,

    trusted: false,
    ready: false,
    completionEstablished: false,

    defaultPolicy: "DENY",

    completionOnly: true,
    completionIsInertData: true,
    resultMutationProhibited: true,
    lifecycleMutationProhibited: true,
    operationReexecutionProhibited: true,
    futureMutationCapableExecutionBoundaryRequired: true,

    completionState:
      "GOVERNED_OPERATION_EXECUTION_RESULT_COMPLETION_NOT_ESTABLISHED",

    lifecycleState:
      resultLifecycle.lifecycleState,

    resultState:
      resultLifecycle.resultState,

    receiptState:
      resultLifecycle.receiptState,

    resultLifecycle: null,

    completionEvidence: [],

    provenance: [
      "DEV-311",
      "governed-executor-integration-operation-execution-result-completion-foundation-engine"
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

export function establishGovernedExecutorIntegrationOperationExecutionResultCompletionFoundation(
  input:
    RiverDevGovernedExecutorIntegrationOperationExecutionResultCompletionFoundationInput
): RiverDevGovernedExecutorIntegrationOperationExecutionResultCompletionFoundationResult {

  const resultLifecycle =
    input.resultLifecycle;

  const blockedReasons: string[] = [];

  if (
    resultLifecycle.version !==
    "DEV-310"
  ) {
    blockedReasons.push(
      "Operation execution result completion requires exact DEV-310 lifecycle."
    );
  }

  if (
    resultLifecycle.source !==
    "governed-executor-integration-operation-execution-result-lifecycle-foundation-engine"
  ) {
    blockedReasons.push(
      "DEV-310 result lifecycle source is not trusted."
    );
  }

  if (
    resultLifecycle.defaultPolicy !==
    "DENY"
  ) {
    blockedReasons.push(
      "DEV-310 default policy must remain DENY."
    );
  }

  if (
    resultLifecycle.trusted !== true ||
    resultLifecycle.ready !== true ||
    resultLifecycle.lifecycleEstablished !== true
  ) {
    blockedReasons.push(
      "DEV-310 governed result lifecycle is not established."
    );
  }

  if (
    resultLifecycle.lifecycleState !==
    "GOVERNED_OPERATION_EXECUTION_RESULT_LIFECYCLE_ESTABLISHED"
  ) {
    blockedReasons.push(
      "DEV-310 lifecycle state is not established."
    );
  }

  if (
    resultLifecycle.resultState !==
    "GOVERNED_OPERATION_EXECUTION_RESULT_ESTABLISHED"
  ) {
    blockedReasons.push(
      "DEV-310 result state is not established."
    );
  }

  if (
    resultLifecycle.receiptState !==
    "EXECUTION_RESULT_RECORDED"
  ) {
    blockedReasons.push(
      "DEV-310 execution result receipt is not recorded."
    );
  }

  if (
    resultLifecycle.lifecycleOnly !== true ||
    resultLifecycle.lifecycleIsInertData !== true ||
    resultLifecycle.resultMutationProhibited !== true ||
    resultLifecycle.operationReexecutionProhibited !== true ||
    resultLifecycle.futureMutationCapableExecutionBoundaryRequired !== true
  ) {
    blockedReasons.push(
      "DEV-310 inert lifecycle boundary invariants are not satisfied."
    );
  }

  if (
    resultLifecycle.operationExecutionResult === null
  ) {
    blockedReasons.push(
      "DEV-310 operation execution result lineage is absent."
    );
  }

  if (
    resultLifecycle.lifecycleEvidence.length ===
    0
  ) {
    blockedReasons.push(
      "DEV-310 lifecycle evidence is absent."
    );
  }

  if (
    resultLifecycle.mayInvokeExecutor !== false ||
    resultLifecycle.mayExecuteOperation !== false ||
    resultLifecycle.mayRetryExecution !== false ||
    resultLifecycle.mayPersistLifecycleState !== false ||
    resultLifecycle.mayModifyRepository !== false ||
    resultLifecycle.mayDeleteRepositoryContent !== false ||
    resultLifecycle.mayStageRepositoryChanges !== false ||
    resultLifecycle.mayCommit !== false ||
    resultLifecycle.mayPush !== false ||
    resultLifecycle.mayDeploy !== false ||
    resultLifecycle.mayAccessSecrets !== false ||
    resultLifecycle.mayExpandScope !== false ||
    resultLifecycle.mayPerformArbitraryShellExecution !== false ||
    resultLifecycle.mayPerformNetworkExecution !== false ||
    resultLifecycle.mayPerformExternalSideEffects !== false
  ) {
    blockedReasons.push(
      "DEV-310 exposes forbidden execution, persistence, or side-effect authority."
    );
  }

  if (blockedReasons.length > 0) {
    return createDeniedCompletion(
      resultLifecycle,
      blockedReasons
    );
  }

  return {
    version: "DEV-311",

    source:
      "governed-executor-integration-operation-execution-result-completion-foundation-engine",

    objective: OBJECTIVE,

    trusted: true,
    ready: true,
    completionEstablished: true,

    defaultPolicy: "DENY",

    completionOnly: true,
    completionIsInertData: true,
    resultMutationProhibited: true,
    lifecycleMutationProhibited: true,
    operationReexecutionProhibited: true,
    futureMutationCapableExecutionBoundaryRequired: true,

    completionState:
      "GOVERNED_OPERATION_EXECUTION_RESULT_COMPLETION_ESTABLISHED",

    lifecycleState:
      resultLifecycle.lifecycleState,

    resultState:
      resultLifecycle.resultState,

    receiptState:
      resultLifecycle.receiptState,

    resultLifecycle,

    completionEvidence: [
      ...resultLifecycle.lifecycleEvidence,
      "Exact trusted DEV-310 result lifecycle consumed.",
      "Governed operation execution result completion established.",
      "DEV-311 completion is immutable inert data.",
      "DEV-311 persisted no lifecycle state.",
      "DEV-311 performed no operation re-execution.",
      "DEV-311 created no mutation authority."
    ],

    provenance: [
      ...resultLifecycle.provenance,
      "DEV-311",
      "governed-executor-integration-operation-execution-result-completion-foundation-engine"
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
