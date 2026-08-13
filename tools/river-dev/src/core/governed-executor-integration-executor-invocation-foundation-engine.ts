import {
  RiverDevGovernedExecutorIntegrationExecutorInvocationAuthorizationFoundationResult,
  RiverDevGovernedExecutorIntegrationExecutorInvocationFoundationResult
} from "../types";

function blockedResult(
  reason: string
): RiverDevGovernedExecutorIntegrationExecutorInvocationFoundationResult {
  return {
    version: "DEV-306",
    source:
      "governed-executor-integration-executor-invocation-foundation-engine",
    objective:
      "Represent an exactly authorized governed executor invocation as inert data without executing an operation.",

    trusted: false,
    ready: false,
    invoked: false,

    defaultPolicy: "DENY",

    executorInvocationOnly: true,
    invocationResultIsInertData: true,
    futureOperationExecutionBoundaryRequired: true,

    invocationState: "GOVERNED_EXECUTOR_NOT_INVOKED",

    authorization: null,

    predecessorVerificationState: [],
    predecessorVerificationEvidence: [],
    predecessorAcceptanceEvidence: [],
    predecessorHandoffEvidence: [],
    verificationEvidence: [],
    acceptanceEvidence: [],
    packagingEvidence: [],
    packageVerificationEvidence: [],
    admissionEvidence: [],
    consumptionEvidence: [],
    activeAdmissionEligibilityEvidence: [],
    activeAdmissionAuthorizationEvidence: [],
    activeAdmissionVerificationEvidence: [],
    activeAdmissionEnforcementEvidence: [],
    executorInvocationAuthorizationEvidence: [],
    executorInvocationEvidence: [],

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
    mayPerformExternalSideEffects: false
  };
}

export function invokeGovernedExecutor(
  predecessor: RiverDevGovernedExecutorIntegrationExecutorInvocationAuthorizationFoundationResult
): RiverDevGovernedExecutorIntegrationExecutorInvocationFoundationResult {
  if (
    predecessor.version !== "DEV-305" ||
    predecessor.source !==
      "governed-executor-integration-executor-invocation-authorization-foundation-engine"
  ) {
    return blockedResult(
      "DEV-306 requires the exact DEV-305 executor invocation authorization contract."
    );
  }

  if (
    predecessor.trusted !== true ||
    predecessor.ready !== true ||
    predecessor.authorized !== true
  ) {
    return blockedResult(
      "DEV-305 predecessor is not trusted, ready, and authorized."
    );
  }

  if (
    predecessor.authorizationState !==
    "EXECUTOR_INVOCATION_AUTHORIZED"
  ) {
    return blockedResult(
      "DEV-305 predecessor is not in EXECUTOR_INVOCATION_AUTHORIZED state."
    );
  }

  if (
    predecessor.executorInvocationAuthorizationDecisionOnly !== true ||
    predecessor.authorizationResultIsInertData !== true
  ) {
    return blockedResult(
      "DEV-305 predecessor authorization contract is not inert decision data."
    );
  }

  if (
    predecessor.futureExecutorInvocationBoundaryRequired !== true
  ) {
    return blockedResult(
      "DEV-305 predecessor does not require the DEV-306 invocation boundary."
    );
  }

  if (
    predecessor.mayInvokeExecutor !== false ||
    predecessor.mayExecuteOperation !== false ||
    predecessor.mayModifyRepository !== false ||
    predecessor.mayPerformArbitraryShellExecution !== false ||
    predecessor.mayPerformNetworkExecution !== false ||
    predecessor.mayPerformExternalSideEffects !== false
  ) {
    return blockedResult(
      "DEV-305 predecessor exposes forbidden execution or side-effect authority."
    );
  }

  if (
    predecessor.enforcement === null ||
    predecessor.executorInvocationAuthorizationEvidence.length === 0
  ) {
    return blockedResult(
      "DEV-305 predecessor lacks required authorization lineage evidence."
    );
  }

  return {
    version: "DEV-306",
    source:
      "governed-executor-integration-executor-invocation-foundation-engine",
    objective:
      "Represent an exactly authorized governed executor invocation as inert data without executing an operation.",

    trusted: true,
    ready: true,
    invoked: true,

    defaultPolicy: "DENY",

    executorInvocationOnly: true,
    invocationResultIsInertData: true,
    futureOperationExecutionBoundaryRequired: true,

    invocationState: "GOVERNED_EXECUTOR_INVOKED",

    authorization: predecessor,

    predecessorVerificationState: [
      ...predecessor.predecessorVerificationState
    ],
    predecessorVerificationEvidence: [
      ...predecessor.predecessorVerificationEvidence
    ],
    predecessorAcceptanceEvidence: [
      ...predecessor.predecessorAcceptanceEvidence
    ],
    predecessorHandoffEvidence: [
      ...predecessor.predecessorHandoffEvidence
    ],
    verificationEvidence: [
      ...predecessor.verificationEvidence
    ],
    acceptanceEvidence: [
      ...predecessor.acceptanceEvidence
    ],
    packagingEvidence: [
      ...predecessor.packagingEvidence
    ],
    packageVerificationEvidence: [
      ...predecessor.packageVerificationEvidence
    ],
    admissionEvidence: [
      ...predecessor.admissionEvidence
    ],
    consumptionEvidence: [
      ...predecessor.consumptionEvidence
    ],
    activeAdmissionEligibilityEvidence: [
      ...predecessor.activeAdmissionEligibilityEvidence
    ],
    activeAdmissionAuthorizationEvidence: [
      ...predecessor.activeAdmissionAuthorizationEvidence
    ],
    activeAdmissionVerificationEvidence: [
      ...predecessor.activeAdmissionVerificationEvidence
    ],
    activeAdmissionEnforcementEvidence: [
      ...predecessor.activeAdmissionEnforcementEvidence
    ],
    executorInvocationAuthorizationEvidence: [
      ...predecessor.executorInvocationAuthorizationEvidence
    ],

    executorInvocationEvidence: [
      ...predecessor.executorInvocationAuthorizationEvidence,
      "DEV-306 exact DEV-305 executor invocation authorization accepted.",
      "DEV-306 governed executor invocation represented as inert data only.",
      "DEV-306 performed no operation execution or external side effect.",
      "DEV-306 requires a future controlled operation execution boundary."
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
