import type {
  RiverDevGovernedExecutorIntegrationOperationExecutionFoundationResult,
  RiverDevGovernedExecutorIntegrationOperationExecutionResultFoundationInput,
  RiverDevGovernedExecutorIntegrationOperationExecutionResultFoundationResult
} from "../types";

const OBJECTIVE =
  "Record an immutable inert governed operation-execution result from exact trusted DEV-308 execution without re-executing the operation.";

function createDeniedResult(
  operationExecution:
    RiverDevGovernedExecutorIntegrationOperationExecutionFoundationResult,
  blockedReasons: readonly string[]
): RiverDevGovernedExecutorIntegrationOperationExecutionResultFoundationResult {
  return {
    version: "DEV-309",
    source:
      "governed-executor-integration-operation-execution-result-foundation-engine",
    objective: OBJECTIVE,

    trusted: false,
    ready: false,
    resultEstablished: false,

    defaultPolicy: "DENY",

    resultOnly: true,
    resultIsInertData: true,
    operationReexecutionProhibited: true,
    futureMutationCapableExecutionBoundaryRequired: true,

    resultState:
      "GOVERNED_OPERATION_EXECUTION_RESULT_NOT_ESTABLISHED",

    receiptState:
      "EXECUTION_RESULT_NOT_RECORDED",

    operationExecution: null,

    predecessorVerificationState:
      operationExecution.predecessorVerificationState,

    predecessorVerificationEvidence:
      operationExecution.predecessorVerificationEvidence,

    predecessorAcceptanceEvidence:
      operationExecution.predecessorAcceptanceEvidence,

    predecessorHandoffEvidence:
      operationExecution.predecessorHandoffEvidence,

    verificationEvidence:
      operationExecution.verificationEvidence,

    acceptanceEvidence:
      operationExecution.acceptanceEvidence,

    packagingEvidence:
      operationExecution.packagingEvidence,

    packageVerificationEvidence:
      operationExecution.packageVerificationEvidence,

    admissionEvidence:
      operationExecution.admissionEvidence,

    consumptionEvidence:
      operationExecution.consumptionEvidence,

    activeAdmissionEligibilityEvidence:
      operationExecution.activeAdmissionEligibilityEvidence,

    activeAdmissionAuthorizationEvidence:
      operationExecution.activeAdmissionAuthorizationEvidence,

    activeAdmissionVerificationEvidence:
      operationExecution.activeAdmissionVerificationEvidence,

    activeAdmissionEnforcementEvidence:
      operationExecution.activeAdmissionEnforcementEvidence,

    executorInvocationAuthorizationEvidence:
      operationExecution.executorInvocationAuthorizationEvidence,

    executorInvocationEvidence:
      operationExecution.executorInvocationEvidence,

    operationExecutionAuthorizationEvidence:
      operationExecution.operationExecutionAuthorizationEvidence,

    operationExecutionEvidence:
      operationExecution.operationExecutionEvidence,

    operationExecutionResultEvidence: [],

    provenance: [
      "DEV-309",
      "governed-executor-integration-operation-execution-result-foundation-engine"
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

export function establishGovernedExecutorIntegrationOperationExecutionResultFoundation(
  input:
    RiverDevGovernedExecutorIntegrationOperationExecutionResultFoundationInput
): RiverDevGovernedExecutorIntegrationOperationExecutionResultFoundationResult {

  const operationExecution =
    input.operationExecution;

  const blockedReasons: string[] = [];

  if (
    operationExecution.version !==
    "DEV-308"
  ) {
    blockedReasons.push(
      "Operation execution result requires exact DEV-308 execution."
    );
  }

  if (
    operationExecution.source !==
    "governed-executor-integration-operation-execution-foundation-engine"
  ) {
    blockedReasons.push(
      "DEV-308 operation execution source is not trusted."
    );
  }

  if (
    operationExecution.defaultPolicy !==
    "DENY"
  ) {
    blockedReasons.push(
      "DEV-308 default policy must remain DENY."
    );
  }

  if (
    operationExecution.trusted !== true
  ) {
    blockedReasons.push(
      "DEV-308 operation execution is not trusted."
    );
  }

  if (
    operationExecution.ready !== true
  ) {
    blockedReasons.push(
      "DEV-308 operation execution is not ready."
    );
  }

  if (
    operationExecution.executed !== true
  ) {
    blockedReasons.push(
      "DEV-308 governed operation execution was not established."
    );
  }

  if (
    operationExecution.executionState !==
    "GOVERNED_OPERATION_EXECUTION_ESTABLISHED"
  ) {
    blockedReasons.push(
      "DEV-308 execution state is not established."
    );
  }

  if (
    operationExecution.operationExecutionOnly !== true ||
    operationExecution.executionResultIsInertData !== true ||
    operationExecution.futureMutationCapableExecutionBoundaryRequired !== true
  ) {
    blockedReasons.push(
      "DEV-308 inert execution boundary invariants are not satisfied."
    );
  }

  if (
    operationExecution.authorization === null
  ) {
    blockedReasons.push(
      "DEV-308 operation execution authorization lineage is absent."
    );
  }

  if (
    operationExecution.mayInvokeExecutor !== false ||
    operationExecution.mayExecuteOperation !== false ||
    operationExecution.mayRetryExecution !== false ||
    operationExecution.mayPersistLifecycleState !== false ||
    operationExecution.mayModifyRepository !== false ||
    operationExecution.mayDeleteRepositoryContent !== false ||
    operationExecution.mayStageRepositoryChanges !== false ||
    operationExecution.mayCommit !== false ||
    operationExecution.mayPush !== false ||
    operationExecution.mayDeploy !== false ||
    operationExecution.mayAccessSecrets !== false ||
    operationExecution.mayExpandScope !== false ||
    operationExecution.mayPerformArbitraryShellExecution !== false ||
    operationExecution.mayPerformNetworkExecution !== false ||
    operationExecution.mayPerformExternalSideEffects !== false
  ) {
    blockedReasons.push(
      "DEV-308 exposes forbidden execution or side-effect authority."
    );
  }

  if (
    operationExecution.operationExecutionEvidence.length ===
    0
  ) {
    blockedReasons.push(
      "DEV-308 operation execution evidence is absent."
    );
  }

  if (blockedReasons.length > 0) {
    return createDeniedResult(
      operationExecution,
      blockedReasons
    );
  }

  return {
    version: "DEV-309",
    source:
      "governed-executor-integration-operation-execution-result-foundation-engine",
    objective: OBJECTIVE,

    trusted: true,
    ready: true,
    resultEstablished: true,

    defaultPolicy: "DENY",

    resultOnly: true,
    resultIsInertData: true,
    operationReexecutionProhibited: true,
    futureMutationCapableExecutionBoundaryRequired: true,

    resultState:
      "GOVERNED_OPERATION_EXECUTION_RESULT_ESTABLISHED",

    receiptState:
      "EXECUTION_RESULT_RECORDED",

    operationExecution,

    predecessorVerificationState:
      operationExecution.predecessorVerificationState,

    predecessorVerificationEvidence:
      operationExecution.predecessorVerificationEvidence,

    predecessorAcceptanceEvidence:
      operationExecution.predecessorAcceptanceEvidence,

    predecessorHandoffEvidence:
      operationExecution.predecessorHandoffEvidence,

    verificationEvidence:
      operationExecution.verificationEvidence,

    acceptanceEvidence:
      operationExecution.acceptanceEvidence,

    packagingEvidence:
      operationExecution.packagingEvidence,

    packageVerificationEvidence:
      operationExecution.packageVerificationEvidence,

    admissionEvidence:
      operationExecution.admissionEvidence,

    consumptionEvidence:
      operationExecution.consumptionEvidence,

    activeAdmissionEligibilityEvidence:
      operationExecution.activeAdmissionEligibilityEvidence,

    activeAdmissionAuthorizationEvidence:
      operationExecution.activeAdmissionAuthorizationEvidence,

    activeAdmissionVerificationEvidence:
      operationExecution.activeAdmissionVerificationEvidence,

    activeAdmissionEnforcementEvidence:
      operationExecution.activeAdmissionEnforcementEvidence,

    executorInvocationAuthorizationEvidence:
      operationExecution.executorInvocationAuthorizationEvidence,

    executorInvocationEvidence:
      operationExecution.executorInvocationEvidence,

    operationExecutionAuthorizationEvidence:
      operationExecution.operationExecutionAuthorizationEvidence,

    operationExecutionEvidence:
      operationExecution.operationExecutionEvidence,

    operationExecutionResultEvidence: [
      ...operationExecution.operationExecutionEvidence,
      "Exact trusted DEV-308 operation execution consumed.",
      "Governed operation execution result recorded.",
      "DEV-309 result is immutable inert data.",
      "DEV-309 performed no operation re-execution.",
      "DEV-309 invoked no mutation-capable dependency."
    ],

    provenance: [
      "DEV-308",
      operationExecution.source,
      "DEV-309",
      "governed-executor-integration-operation-execution-result-foundation-engine"
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
