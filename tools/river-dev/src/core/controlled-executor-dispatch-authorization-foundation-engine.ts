import type {
  RiverDevControlledExecutorDispatchAuthorizationFoundation,
  RiverDevControlledExecutorDispatchAuthorizationFoundationInput
} from "../types";

const VERSION = "DEV-254";

const SOURCE =
  "River Development Agent controlled executor dispatch authorization foundation";

const OBJECTIVE =
  "Deterministically derive whether an exact trusted ready constructed inert invocation request is authorized to proceed toward a separately governed future dispatch boundary without dispatching, invoking an executor, executing an operation, modifying repository state, creating authorization, or expanding scope.";

export function buildControlledExecutorDispatchAuthorizationFoundation(
  input: RiverDevControlledExecutorDispatchAuthorizationFoundationInput
): RiverDevControlledExecutorDispatchAuthorizationFoundation {
  const invocationRequest = input.invocationRequest;

  const blockedReasons: string[] = [];

  if (!invocationRequest.trusted) {
    blockedReasons.push(
      "invocation request is not trusted"
    );
  }

  if (!invocationRequest.ready) {
    blockedReasons.push(
      "invocation request is not ready"
    );
  }

  if (!invocationRequest.requestConstructed) {
    blockedReasons.push(
      "invocation request is not constructed"
    );
  }

  if (
    invocationRequest.defaultPolicy !== "DENY"
  ) {
    blockedReasons.push(
      "invocation request does not preserve deny-by-default policy"
    );
  }

  if (
    invocationRequest.requestConstructionOnly !== true
  ) {
    blockedReasons.push(
      "invocation request does not preserve request-construction-only semantics"
    );
  }

  if (
    invocationRequest.blockedReasons.length > 0
  ) {
    blockedReasons.push(
      "invocation request contains blockers"
    );
  }

  if (
    invocationRequest.executionRequest.trim().length === 0
  ) {
    blockedReasons.push(
      "governed execution request is missing"
    );
  }

  if (
    invocationRequest.authorizedCapabilities.length === 0
  ) {
    blockedReasons.push(
      "authorized capability evidence is missing"
    );
  }

  if (
    !invocationRequest.requiredCapabilityAuthorized
  ) {
    blockedReasons.push(
      "required capability is not authorized"
    );
  }

  if (
    !invocationRequest.authorizedCapabilities.includes(
      invocationRequest.requiredCapability
    )
  ) {
    blockedReasons.push(
      "required capability is absent from authorized capability evidence"
    );
  }

  if (
    invocationRequest.approvedExecutionScope.length === 0
  ) {
    blockedReasons.push(
      "approved execution scope is missing"
    );
  }

  if (
    invocationRequest.invocationRequestMayCreateAuthorization !==
    false
  ) {
    blockedReasons.push(
      "invocation request may create authorization"
    );
  }

  if (
    invocationRequest.invocationRequestMayExpandScope !==
    false
  ) {
    blockedReasons.push(
      "invocation request may expand scope"
    );
  }

  if (
    invocationRequest.invocationRequestMayDispatch !==
    false
  ) {
    blockedReasons.push(
      "invocation request already grants dispatch authority"
    );
  }

  if (
    invocationRequest.invocationRequestMayInvokeExecutor !==
    false
  ) {
    blockedReasons.push(
      "invocation request may invoke executor"
    );
  }

  if (
    invocationRequest.invocationRequestMayExecuteOperation !==
    false
  ) {
    blockedReasons.push(
      "invocation request may execute operation"
    );
  }

  if (
    invocationRequest.invocationRequestMayModifyRepository !==
    false
  ) {
    blockedReasons.push(
      "invocation request may modify repository"
    );
  }

  if (
    invocationRequest.futureDispatchBoundaryRequired !==
    true
  ) {
    blockedReasons.push(
      "future dispatch boundary is not required"
    );
  }

  if (
    invocationRequest.futureExecutorRequiredForSideEffects !==
    true
  ) {
    blockedReasons.push(
      "future executor is not required for side effects"
    );
  }

  const dispatchAuthorized =
    blockedReasons.length === 0;

  const dispatchAuthorizationState =
    dispatchAuthorized
      ? [
          "trusted invocation request verified",
          "ready invocation request verified",
          "constructed invocation request verified",
          "request-construction-only predecessor verified",
          "governed execution request verified",
          "required capability authorization verified",
          "approved execution scope verified",
          "dispatch authorization decision granted",
          "actual dispatch remains separately prohibited",
          "future dispatch boundary remains separately required",
          "future executor remains separately required for side effects"
        ]
      : [
          "dispatch authorization denied",
          "actual dispatch remains separately prohibited",
          "future dispatch boundary remains separately required",
          "future executor remains separately required for side effects"
        ];

  return {
    version: VERSION,
    source: SOURCE,
    objective: OBJECTIVE,

    trusted: dispatchAuthorized,
    ready: dispatchAuthorized,
    dispatchAuthorized,

    defaultPolicy: "DENY",
    authorizationDecisionOnly: true,

    invocationRequest,

    executionRequest:
      invocationRequest.executionRequest,

    preparedOperation:
      invocationRequest.preparedOperation,

    requiredCapability:
      invocationRequest.requiredCapability,

    authorizedCapabilities: [
      ...invocationRequest.authorizedCapabilities
    ],

    requiredCapabilityAuthorized:
      invocationRequest.requiredCapabilityAuthorized,

    approvedExecutionScope: [
      ...invocationRequest.approvedExecutionScope
    ],

    dispatchAuthorizationState,

    provenance: [
      ...invocationRequest.provenance,
      "DEV-254 dispatch authorization decision derived from DEV-253 invocation request"
    ],

    authorizationBoundaries: [
      ...invocationRequest.authorizationBoundaries,
      "dispatch authorization is decision-only",
      "dispatch authorization cannot create capability authorization",
      "dispatch authorization cannot dispatch invocation request",
      "dispatch authorization cannot invoke executor",
      "dispatch authorization cannot execute operation"
    ],

    scopeBoundaries: [
      ...invocationRequest.scopeBoundaries,
      "dispatch authorization cannot expand approved execution scope",
      "dispatch authorization cannot modify repository state",
      "future dispatch boundary remains separately required",
      "future executor remains separately required for side effects"
    ],

    blockedReasons,

    dispatchAuthorizationMayCreateAuthorization: false,
    dispatchAuthorizationMayExpandScope: false,
    dispatchAuthorizationMayDispatch: false,
    dispatchAuthorizationMayInvokeExecutor: false,
    dispatchAuthorizationMayExecuteOperation: false,
    dispatchAuthorizationMayModifyRepository: false,

    futureDispatchBoundaryRequired: true,
    futureExecutorRequiredForSideEffects: true
  };
}
