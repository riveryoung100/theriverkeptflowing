import type {
  RiverDevGovernedExecutorIntegrationOperationExecutionClosureFoundationInput,
  RiverDevGovernedExecutorIntegrationOperationExecutionClosureFoundationResult,
  RiverDevGovernedExecutorIntegrationOperationExecutionResultFinalizationFoundationResult
} from "../types";

const OBJECTIVE =
  "Close the inert governed operation-execution chain from exact trusted DEV-312 finalization and establish the explicit handoff boundary into operational executor integration.";

function createDeniedClosure(
  resultFinalization:
    RiverDevGovernedExecutorIntegrationOperationExecutionResultFinalizationFoundationResult,
  blockedReasons: readonly string[]
): RiverDevGovernedExecutorIntegrationOperationExecutionClosureFoundationResult {

  return {
    version: "DEV-313",

    source:
      "governed-executor-integration-operation-execution-closure-foundation-engine",

    objective: OBJECTIVE,

    trusted: false,
    ready: false,
    closureEstablished: false,

    defaultPolicy: "DENY",

    closureOnly: true,
    closureIsInertData: true,

    resultMutationProhibited: true,
    lifecycleMutationProhibited: true,
    completionMutationProhibited: true,
    finalizationMutationProhibited: true,
    operationReexecutionProhibited: true,

    operationalIntegrationRequiredNext: true,

    closureState:
      "GOVERNED_OPERATION_EXECUTION_CLOSURE_NOT_ESTABLISHED",

    finalizationState:
      resultFinalization.finalizationState,

    completionState:
      resultFinalization.completionState,

    lifecycleState:
      resultFinalization.lifecycleState,

    resultState:
      resultFinalization.resultState,

    receiptState:
      resultFinalization.receiptState,

    resultFinalization: null,

    closureEvidence: [],

    provenance: [
      "DEV-313",
      "governed-executor-integration-operation-execution-closure-foundation-engine"
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

export function establishGovernedExecutorIntegrationOperationExecutionClosureFoundation(
  input:
    RiverDevGovernedExecutorIntegrationOperationExecutionClosureFoundationInput
): RiverDevGovernedExecutorIntegrationOperationExecutionClosureFoundationResult {

  const resultFinalization =
    input.resultFinalization;

  const blockedReasons: string[] = [];

  if (
    resultFinalization.version !==
    "DEV-312"
  ) {
    blockedReasons.push(
      "Operation execution closure requires exact DEV-312 finalization."
    );
  }

  if (
    resultFinalization.source !==
    "governed-executor-integration-operation-execution-result-finalization-foundation-engine"
  ) {
    blockedReasons.push(
      "DEV-312 finalization source is not trusted."
    );
  }

  if (
    resultFinalization.defaultPolicy !==
    "DENY"
  ) {
    blockedReasons.push(
      "DEV-312 default policy must remain DENY."
    );
  }

  if (
    resultFinalization.trusted !== true ||
    resultFinalization.ready !== true ||
    resultFinalization.finalizationEstablished !== true
  ) {
    blockedReasons.push(
      "DEV-312 governed result finalization is not established."
    );
  }

  if (
    resultFinalization.finalizationState !==
    "GOVERNED_OPERATION_EXECUTION_RESULT_FINALIZATION_ESTABLISHED"
  ) {
    blockedReasons.push(
      "DEV-312 finalization state is not established."
    );
  }

  if (
    resultFinalization.completionState !==
    "GOVERNED_OPERATION_EXECUTION_RESULT_COMPLETION_ESTABLISHED"
  ) {
    blockedReasons.push(
      "DEV-312 completion state is not established."
    );
  }

  if (
    resultFinalization.lifecycleState !==
    "GOVERNED_OPERATION_EXECUTION_RESULT_LIFECYCLE_ESTABLISHED"
  ) {
    blockedReasons.push(
      "DEV-312 lifecycle state is not established."
    );
  }

  if (
    resultFinalization.resultState !==
    "GOVERNED_OPERATION_EXECUTION_RESULT_ESTABLISHED"
  ) {
    blockedReasons.push(
      "DEV-312 result state is not established."
    );
  }

  if (
    resultFinalization.receiptState !==
    "EXECUTION_RESULT_RECORDED"
  ) {
    blockedReasons.push(
      "DEV-312 execution result receipt is not recorded."
    );
  }

  if (
    resultFinalization.finalizationOnly !== true ||
    resultFinalization.finalizationIsInertData !== true ||
    resultFinalization.resultMutationProhibited !== true ||
    resultFinalization.lifecycleMutationProhibited !== true ||
    resultFinalization.completionMutationProhibited !== true ||
    resultFinalization.operationReexecutionProhibited !== true
  ) {
    blockedReasons.push(
      "DEV-312 inert finalization boundary invariants are not satisfied."
    );
  }

  if (
    resultFinalization.resultCompletion === null
  ) {
    blockedReasons.push(
      "DEV-312 completion lineage is absent."
    );
  }

  if (
    resultFinalization.finalizationEvidence.length ===
    0
  ) {
    blockedReasons.push(
      "DEV-312 finalization evidence is absent."
    );
  }

  if (
    resultFinalization.mayInvokeExecutor !== false ||
    resultFinalization.mayExecuteOperation !== false ||
    resultFinalization.mayRetryExecution !== false ||
    resultFinalization.mayPersistLifecycleState !== false ||
    resultFinalization.mayModifyRepository !== false ||
    resultFinalization.mayDeleteRepositoryContent !== false ||
    resultFinalization.mayStageRepositoryChanges !== false ||
    resultFinalization.mayCommit !== false ||
    resultFinalization.mayPush !== false ||
    resultFinalization.mayDeploy !== false ||
    resultFinalization.mayAccessSecrets !== false ||
    resultFinalization.mayExpandScope !== false ||
    resultFinalization.mayPerformArbitraryShellExecution !== false ||
    resultFinalization.mayPerformNetworkExecution !== false ||
    resultFinalization.mayPerformExternalSideEffects !== false
  ) {
    blockedReasons.push(
      "DEV-312 exposes forbidden execution, persistence, or side-effect authority."
    );
  }

  if (blockedReasons.length > 0) {
    return createDeniedClosure(
      resultFinalization,
      blockedReasons
    );
  }

  return {
    version: "DEV-313",

    source:
      "governed-executor-integration-operation-execution-closure-foundation-engine",

    objective: OBJECTIVE,

    trusted: true,
    ready: true,
    closureEstablished: true,

    defaultPolicy: "DENY",

    closureOnly: true,
    closureIsInertData: true,

    resultMutationProhibited: true,
    lifecycleMutationProhibited: true,
    completionMutationProhibited: true,
    finalizationMutationProhibited: true,
    operationReexecutionProhibited: true,

    operationalIntegrationRequiredNext: true,

    closureState:
      "GOVERNED_OPERATION_EXECUTION_CLOSURE_ESTABLISHED",

    finalizationState:
      resultFinalization.finalizationState,

    completionState:
      resultFinalization.completionState,

    lifecycleState:
      resultFinalization.lifecycleState,

    resultState:
      resultFinalization.resultState,

    receiptState:
      resultFinalization.receiptState,

    resultFinalization,

    closureEvidence: [
      ...resultFinalization.finalizationEvidence,
      "Exact trusted DEV-312 finalization consumed.",
      "Governed operation execution closure established.",
      "Inert execution-result chain closed.",
      "No persistence authority created.",
      "No repository mutation authority created.",
      "Next required boundary is operational executor integration."
    ],

    provenance: [
      ...resultFinalization.provenance,
      "DEV-313",
      "governed-executor-integration-operation-execution-closure-foundation-engine"
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
