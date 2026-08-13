import type {
  RiverDevGovernedExecutorIntegrationOperationExecutionAuthorizationFoundationResult,
  RiverDevGovernedExecutorIntegrationOperationExecutionFoundationInput,
  RiverDevGovernedExecutorIntegrationOperationExecutionFoundationResult
} from "../types";

const OBJECTIVE =
  "Establish an inert governed operation-execution representation from exact trusted DEV-307 authorization without performing any side effect.";

function deny(
  authorization:
    RiverDevGovernedExecutorIntegrationOperationExecutionAuthorizationFoundationResult,
  blockedReasons: readonly string[]
): RiverDevGovernedExecutorIntegrationOperationExecutionFoundationResult {
  return {
    version: "DEV-308",
    source:
      "governed-executor-integration-operation-execution-foundation-engine",
    objective: OBJECTIVE,

    trusted: false,
    ready: false,
    executed: false,

    defaultPolicy: "DENY",

    operationExecutionOnly: true,
    executionResultIsInertData: true,
    futureMutationCapableExecutionBoundaryRequired: true,

    executionState:
      "GOVERNED_OPERATION_EXECUTION_NOT_ESTABLISHED",

    authorization: null,

    predecessorVerificationState:
      authorization.predecessorVerificationState,
    predecessorVerificationEvidence:
      authorization.predecessorVerificationEvidence,
    predecessorAcceptanceEvidence:
      authorization.predecessorAcceptanceEvidence,
    predecessorHandoffEvidence:
      authorization.predecessorHandoffEvidence,
    verificationEvidence:
      authorization.verificationEvidence,
    acceptanceEvidence:
      authorization.acceptanceEvidence,
    packagingEvidence:
      authorization.packagingEvidence,
    packageVerificationEvidence:
      authorization.packageVerificationEvidence,
    admissionEvidence:
      authorization.admissionEvidence,
    consumptionEvidence:
      authorization.consumptionEvidence,
    activeAdmissionEligibilityEvidence:
      authorization.activeAdmissionEligibilityEvidence,
    activeAdmissionAuthorizationEvidence:
      authorization.activeAdmissionAuthorizationEvidence,
    activeAdmissionVerificationEvidence:
      authorization.activeAdmissionVerificationEvidence,
    activeAdmissionEnforcementEvidence:
      authorization.activeAdmissionEnforcementEvidence,
    executorInvocationAuthorizationEvidence:
      authorization.executorInvocationAuthorizationEvidence,
    executorInvocationEvidence:
      authorization.executorInvocationEvidence,
    operationExecutionAuthorizationEvidence:
      authorization.operationExecutionAuthorizationEvidence,

    operationExecutionEvidence: [],

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

export function establishGovernedExecutorIntegrationOperationExecutionFoundation(
  input: RiverDevGovernedExecutorIntegrationOperationExecutionFoundationInput
): RiverDevGovernedExecutorIntegrationOperationExecutionFoundationResult {
  const authorization =
    input.operationExecutionAuthorization;

  const blockedReasons: string[] = [];

  if (authorization.version !== "DEV-307") {
    blockedReasons.push(
      "Operation execution authorization is not exact DEV-307."
    );
  }

  if (
    authorization.source !==
    "governed-executor-integration-operation-execution-authorization-foundation-engine"
  ) {
    blockedReasons.push(
      "Operation execution authorization source is not trusted."
    );
  }

  if (!authorization.trusted) {
    blockedReasons.push(
      "Operation execution authorization is not trusted."
    );
  }

  if (!authorization.ready) {
    blockedReasons.push(
      "Operation execution authorization is not ready."
    );
  }

  if (!authorization.authorized) {
    blockedReasons.push(
      "Operation execution was not authorized."
    );
  }

  if (
    authorization.authorizationState !==
    "OPERATION_EXECUTION_AUTHORIZED"
  ) {
    blockedReasons.push(
      "Operation execution authorization state is not authorized."
    );
  }

  if (authorization.invocation === null) {
    blockedReasons.push(
      "Trusted governed executor invocation is absent."
    );
  }

  if (blockedReasons.length > 0) {
    return deny(
      authorization,
      blockedReasons
    );
  }

  return {
    version: "DEV-308",
    source:
      "governed-executor-integration-operation-execution-foundation-engine",
    objective: OBJECTIVE,

    trusted: true,
    ready: true,
    executed: true,

    defaultPolicy: "DENY",

    operationExecutionOnly: true,
    executionResultIsInertData: true,
    futureMutationCapableExecutionBoundaryRequired: true,

    executionState:
      "GOVERNED_OPERATION_EXECUTION_ESTABLISHED",

    authorization,

    predecessorVerificationState:
      authorization.predecessorVerificationState,
    predecessorVerificationEvidence:
      authorization.predecessorVerificationEvidence,
    predecessorAcceptanceEvidence:
      authorization.predecessorAcceptanceEvidence,
    predecessorHandoffEvidence:
      authorization.predecessorHandoffEvidence,
    verificationEvidence:
      authorization.verificationEvidence,
    acceptanceEvidence:
      authorization.acceptanceEvidence,
    packagingEvidence:
      authorization.packagingEvidence,
    packageVerificationEvidence:
      authorization.packageVerificationEvidence,
    admissionEvidence:
      authorization.admissionEvidence,
    consumptionEvidence:
      authorization.consumptionEvidence,
    activeAdmissionEligibilityEvidence:
      authorization.activeAdmissionEligibilityEvidence,
    activeAdmissionAuthorizationEvidence:
      authorization.activeAdmissionAuthorizationEvidence,
    activeAdmissionVerificationEvidence:
      authorization.activeAdmissionVerificationEvidence,
    activeAdmissionEnforcementEvidence:
      authorization.activeAdmissionEnforcementEvidence,
    executorInvocationAuthorizationEvidence:
      authorization.executorInvocationAuthorizationEvidence,
    executorInvocationEvidence:
      authorization.executorInvocationEvidence,
    operationExecutionAuthorizationEvidence:
      authorization.operationExecutionAuthorizationEvidence,

    operationExecutionEvidence: [
      "Exact trusted DEV-307 operation execution authorization consumed.",
      "Governed operation execution representation established.",
      "DEV-308 execution result remains inert data.",
      "No mutation-capable dependency was invoked."
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
