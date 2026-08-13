import type {
  RiverDevGovernedExecutorIntegrationOperationExecutionAuthorizationFoundationInput,
  RiverDevGovernedExecutorIntegrationOperationExecutionAuthorizationFoundationResult
} from "../types";

export function createGovernedExecutorIntegrationOperationExecutionAuthorizationFoundation(
  input: RiverDevGovernedExecutorIntegrationOperationExecutionAuthorizationFoundationInput
): RiverDevGovernedExecutorIntegrationOperationExecutionAuthorizationFoundationResult {

  const predecessor =
    input.executorInvocation;

  const blockedReasons: string[] = [];

  if (
    predecessor.version !== "DEV-306"
  ) {
    blockedReasons.push(
      "DEV-307 requires an exact DEV-306 predecessor."
    );
  }

  if (
    predecessor.source !==
    "governed-executor-integration-executor-invocation-foundation-engine"
  ) {
    blockedReasons.push(
      "DEV-307 requires the trusted DEV-306 executor invocation source."
    );
  }

  if (
    predecessor.defaultPolicy !== "DENY"
  ) {
    blockedReasons.push(
      "DEV-306 predecessor default policy must remain DENY."
    );
  }

  if (
    predecessor.executorInvocationOnly !== true ||
    predecessor.invocationResultIsInertData !== true ||
    predecessor.futureOperationExecutionBoundaryRequired !== true
  ) {
    blockedReasons.push(
      "DEV-306 invocation boundary invariants are not satisfied."
    );
  }

  if (
    predecessor.trusted !== true
  ) {
    blockedReasons.push(
      "DEV-306 predecessor is not trusted."
    );
  }

  if (
    predecessor.ready !== true
  ) {
    blockedReasons.push(
      "DEV-306 predecessor is not ready."
    );
  }

  if (
    predecessor.invoked !== true ||
    predecessor.invocationState !==
      "GOVERNED_EXECUTOR_INVOKED"
  ) {
    blockedReasons.push(
      "Governed executor invocation was not established."
    );
  }

  if (
    predecessor.authorization === null
  ) {
    blockedReasons.push(
      "DEV-306 predecessor does not contain executor invocation authorization."
    );
  }
  else {

    if (
      predecessor.authorization.version !==
        "DEV-305" ||
      predecessor.authorization.source !==
        "governed-executor-integration-executor-invocation-authorization-foundation-engine"
    ) {
      blockedReasons.push(
        "DEV-306 predecessor contains an invalid DEV-305 authorization."
      );
    }

    if (
      predecessor.authorization.trusted !== true ||
      predecessor.authorization.ready !== true ||
      predecessor.authorization.authorized !== true ||
      predecessor.authorization.authorizationState !==
        "EXECUTOR_INVOCATION_AUTHORIZED"
    ) {
      blockedReasons.push(
        "Executor invocation authorization is not fully authorized."
      );
    }

  }

  const trusted =
    blockedReasons.length === 0;

  const ready =
    trusted;

  const authorized =
    trusted &&
    ready;

  const operationExecutionAuthorizationEvidence =
    authorized
      ? [
          "Exact DEV-306 governed executor invocation accepted.",
          "DEV-306 invocation remains trusted and ready.",
          "DEV-305 executor invocation authorization remains trusted and authorized.",
          "Operation execution authorization decision established as inert data.",
          "Actual operation execution remains prohibited at DEV-307."
        ]
      : [];

  return {
    version:
      "DEV-307",

    source:
      "governed-executor-integration-operation-execution-authorization-foundation-engine",

    objective:
      predecessor.objective,

    trusted,
    ready,
    authorized,

    defaultPolicy:
      "DENY",

    operationExecutionAuthorizationDecisionOnly:
      true,

    authorizationResultIsInertData:
      true,

    futureOperationExecutionBoundaryRequired:
      true,

    authorizationState:
      authorized
        ? "OPERATION_EXECUTION_AUTHORIZED"
        : "OPERATION_EXECUTION_UNAUTHORIZED",

    invocation:
      trusted
        ? predecessor
        : null,

    predecessorVerificationState:
      predecessor.predecessorVerificationState,

    predecessorVerificationEvidence:
      predecessor.predecessorVerificationEvidence,

    predecessorAcceptanceEvidence:
      predecessor.predecessorAcceptanceEvidence,

    predecessorHandoffEvidence:
      predecessor.predecessorHandoffEvidence,

    verificationEvidence:
      predecessor.verificationEvidence,

    acceptanceEvidence:
      predecessor.acceptanceEvidence,

    packagingEvidence:
      predecessor.packagingEvidence,

    packageVerificationEvidence:
      predecessor.packageVerificationEvidence,

    admissionEvidence:
      predecessor.admissionEvidence,

    consumptionEvidence:
      predecessor.consumptionEvidence,

    activeAdmissionEligibilityEvidence:
      predecessor.activeAdmissionEligibilityEvidence,

    activeAdmissionAuthorizationEvidence:
      predecessor.activeAdmissionAuthorizationEvidence,

    activeAdmissionVerificationEvidence:
      predecessor.activeAdmissionVerificationEvidence,

    activeAdmissionEnforcementEvidence:
      predecessor.activeAdmissionEnforcementEvidence,

    executorInvocationAuthorizationEvidence:
      predecessor.executorInvocationAuthorizationEvidence,

    executorInvocationEvidence:
      predecessor.executorInvocationEvidence,

    operationExecutionAuthorizationEvidence,

    blockedReasons,

    mayCreateExecutionAuthorization:
      false,

    mayAuthorizeDownstreamAction:
      false,

    mayAdmitIntoActiveExecutor:
      false,

    mayActivateAdmission:
      false,

    mayDispatch:
      false,

    mayInvokeExecutor:
      false,

    mayExecuteOperation:
      false,

    mayInvokeInspectionDependency:
      false,

    mayRetryExecution:
      false,

    mayPersistLifecycleState:
      false,

    mayModifyRepository:
      false,

    mayDeleteRepositoryContent:
      false,

    mayStageRepositoryChanges:
      false,

    mayCommit:
      false,

    mayPush:
      false,

    mayDeploy:
      false,

    mayAccessSecrets:
      false,

    mayExpandScope:
      false,

    mayPerformArbitraryShellExecution:
      false,

    mayPerformNetworkExecution:
      false,

    mayPerformExternalSideEffects:
      false
  };

}
