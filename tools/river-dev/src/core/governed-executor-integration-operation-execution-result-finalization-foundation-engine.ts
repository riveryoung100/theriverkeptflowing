import type {
  RiverDevGovernedExecutorIntegrationOperationExecutionResultCompletionFoundationResult,
  RiverDevGovernedExecutorIntegrationOperationExecutionResultFinalizationFoundationInput,
  RiverDevGovernedExecutorIntegrationOperationExecutionResultFinalizationFoundationResult
} from "../types";

const OBJECTIVE =
  "Establish an immutable inert finalization representation from exact trusted DEV-311 governed operation-execution result completion without persisting state, re-executing operations, or creating mutation authority.";

function createDeniedFinalization(
  resultCompletion:
    RiverDevGovernedExecutorIntegrationOperationExecutionResultCompletionFoundationResult,
  blockedReasons: readonly string[]
): RiverDevGovernedExecutorIntegrationOperationExecutionResultFinalizationFoundationResult {

  return {
    version: "DEV-312",

    source:
      "governed-executor-integration-operation-execution-result-finalization-foundation-engine",

    objective: OBJECTIVE,

    trusted: false,
    ready: false,
    finalizationEstablished: false,

    defaultPolicy: "DENY",

    finalizationOnly: true,
    finalizationIsInertData: true,
    resultMutationProhibited: true,
    lifecycleMutationProhibited: true,
    completionMutationProhibited: true,
    operationReexecutionProhibited: true,
    futureMutationCapableExecutionBoundaryRequired: true,

    finalizationState:
      "GOVERNED_OPERATION_EXECUTION_RESULT_FINALIZATION_NOT_ESTABLISHED",

    completionState:
      resultCompletion.completionState,

    lifecycleState:
      resultCompletion.lifecycleState,

    resultState:
      resultCompletion.resultState,

    receiptState:
      resultCompletion.receiptState,

    resultCompletion: null,

    finalizationEvidence: [],

    provenance: [
      "DEV-312",
      "governed-executor-integration-operation-execution-result-finalization-foundation-engine"
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

export function establishGovernedExecutorIntegrationOperationExecutionResultFinalizationFoundation(
  input:
    RiverDevGovernedExecutorIntegrationOperationExecutionResultFinalizationFoundationInput
): RiverDevGovernedExecutorIntegrationOperationExecutionResultFinalizationFoundationResult {

  const resultCompletion =
    input.resultCompletion;

  const blockedReasons: string[] = [];

  if (
    resultCompletion.version !==
    "DEV-311"
  ) {
    blockedReasons.push(
      "Operation execution result finalization requires exact DEV-311 completion."
    );
  }

  if (
    resultCompletion.source !==
    "governed-executor-integration-operation-execution-result-completion-foundation-engine"
  ) {
    blockedReasons.push(
      "DEV-311 result completion source is not trusted."
    );
  }

  if (
    resultCompletion.defaultPolicy !==
    "DENY"
  ) {
    blockedReasons.push(
      "DEV-311 default policy must remain DENY."
    );
  }

  if (
    resultCompletion.trusted !== true ||
    resultCompletion.ready !== true ||
    resultCompletion.completionEstablished !== true
  ) {
    blockedReasons.push(
      "DEV-311 governed result completion is not established."
    );
  }

  if (
    resultCompletion.completionState !==
    "GOVERNED_OPERATION_EXECUTION_RESULT_COMPLETION_ESTABLISHED"
  ) {
    blockedReasons.push(
      "DEV-311 completion state is not established."
    );
  }

  if (
    resultCompletion.lifecycleState !==
    "GOVERNED_OPERATION_EXECUTION_RESULT_LIFECYCLE_ESTABLISHED"
  ) {
    blockedReasons.push(
      "DEV-311 lifecycle state is not established."
    );
  }

  if (
    resultCompletion.resultState !==
    "GOVERNED_OPERATION_EXECUTION_RESULT_ESTABLISHED"
  ) {
    blockedReasons.push(
      "DEV-311 result state is not established."
    );
  }

  if (
    resultCompletion.receiptState !==
    "EXECUTION_RESULT_RECORDED"
  ) {
    blockedReasons.push(
      "DEV-311 execution result receipt is not recorded."
    );
  }

  if (
    resultCompletion.completionOnly !== true ||
    resultCompletion.completionIsInertData !== true ||
    resultCompletion.resultMutationProhibited !== true ||
    resultCompletion.lifecycleMutationProhibited !== true ||
    resultCompletion.operationReexecutionProhibited !== true ||
    resultCompletion.futureMutationCapableExecutionBoundaryRequired !== true
  ) {
    blockedReasons.push(
      "DEV-311 inert completion boundary invariants are not satisfied."
    );
  }

  if (
    resultCompletion.resultLifecycle === null
  ) {
    blockedReasons.push(
      "DEV-311 result lifecycle lineage is absent."
    );
  }

  if (
    resultCompletion.completionEvidence.length ===
    0
  ) {
    blockedReasons.push(
      "DEV-311 completion evidence is absent."
    );
  }

  if (
    resultCompletion.mayInvokeExecutor !== false ||
    resultCompletion.mayExecuteOperation !== false ||
    resultCompletion.mayRetryExecution !== false ||
    resultCompletion.mayPersistLifecycleState !== false ||
    resultCompletion.mayModifyRepository !== false ||
    resultCompletion.mayDeleteRepositoryContent !== false ||
    resultCompletion.mayStageRepositoryChanges !== false ||
    resultCompletion.mayCommit !== false ||
    resultCompletion.mayPush !== false ||
    resultCompletion.mayDeploy !== false ||
    resultCompletion.mayAccessSecrets !== false ||
    resultCompletion.mayExpandScope !== false ||
    resultCompletion.mayPerformArbitraryShellExecution !== false ||
    resultCompletion.mayPerformNetworkExecution !== false ||
    resultCompletion.mayPerformExternalSideEffects !== false
  ) {
    blockedReasons.push(
      "DEV-311 exposes forbidden execution, persistence, or side-effect authority."
    );
  }

  if (blockedReasons.length > 0) {
    return createDeniedFinalization(
      resultCompletion,
      blockedReasons
    );
  }

  return {
    version: "DEV-312",

    source:
      "governed-executor-integration-operation-execution-result-finalization-foundation-engine",

    objective: OBJECTIVE,

    trusted: true,
    ready: true,
    finalizationEstablished: true,

    defaultPolicy: "DENY",

    finalizationOnly: true,
    finalizationIsInertData: true,
    resultMutationProhibited: true,
    lifecycleMutationProhibited: true,
    completionMutationProhibited: true,
    operationReexecutionProhibited: true,
    futureMutationCapableExecutionBoundaryRequired: true,

    finalizationState:
      "GOVERNED_OPERATION_EXECUTION_RESULT_FINALIZATION_ESTABLISHED",

    completionState:
      resultCompletion.completionState,

    lifecycleState:
      resultCompletion.lifecycleState,

    resultState:
      resultCompletion.resultState,

    receiptState:
      resultCompletion.receiptState,

    resultCompletion,

    finalizationEvidence: [
      ...resultCompletion.completionEvidence,
      "Exact trusted DEV-311 result completion consumed.",
      "Governed operation execution result finalization established.",
      "DEV-312 finalization is immutable inert data.",
      "DEV-312 persisted no lifecycle state.",
      "DEV-312 performed no operation re-execution.",
      "DEV-312 created no mutation authority."
    ],

    provenance: [
      ...resultCompletion.provenance,
      "DEV-312",
      "governed-executor-integration-operation-execution-result-finalization-foundation-engine"
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
