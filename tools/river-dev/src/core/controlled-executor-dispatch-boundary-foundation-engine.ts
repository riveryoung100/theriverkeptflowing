import type {
  RiverDevControlledExecutorDispatchBoundaryFoundation,
  RiverDevControlledExecutorDispatchBoundaryFoundationInput
} from "../types";

const VERSION = "DEV-255";

const SOURCE =
  "River Development Agent controlled executor dispatch boundary foundation";

const OBJECTIVE =
  "Deterministically admit an exact trusted ready dispatch-authorized DEV-254 record into an inert dispatch-ready boundary envelope while preserving authorization provenance and exact approved execution scope without invoking an executor, executing an operation, mutating repository state, creating authorization, expanding scope, or performing external side effects.";

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

export function buildControlledExecutorDispatchBoundaryFoundation(
  input: RiverDevControlledExecutorDispatchBoundaryFoundationInput
): RiverDevControlledExecutorDispatchBoundaryFoundation {
  const dispatchAuthorization =
    input.dispatchAuthorization;

  const blockedReasons: string[] = [];

  if (!dispatchAuthorization.trusted) {
    blockedReasons.push(
      "dispatch authorization is not trusted"
    );
  }

  if (!dispatchAuthorization.ready) {
    blockedReasons.push(
      "dispatch authorization is not ready"
    );
  }

  if (!dispatchAuthorization.dispatchAuthorized) {
    blockedReasons.push(
      "dispatch is not authorized"
    );
  }

  if (
    dispatchAuthorization.defaultPolicy !== "DENY"
  ) {
    blockedReasons.push(
      "dispatch authorization does not preserve deny-by-default policy"
    );
  }

  if (
    dispatchAuthorization.authorizationDecisionOnly !==
    true
  ) {
    blockedReasons.push(
      "dispatch authorization does not preserve authorization-decision-only semantics"
    );
  }

  if (
    dispatchAuthorization.blockedReasons.length > 0
  ) {
    blockedReasons.push(
      "dispatch authorization contains blockers"
    );
  }

  if (
    dispatchAuthorization.executionRequest.trim().length ===
    0
  ) {
    blockedReasons.push(
      "governed execution request is missing"
    );
  }

  if (
    dispatchAuthorization.authorizedCapabilities.length ===
    0
  ) {
    blockedReasons.push(
      "authorized capability evidence is missing"
    );
  }

  if (
    !dispatchAuthorization.requiredCapabilityAuthorized
  ) {
    blockedReasons.push(
      "required capability is not authorized"
    );
  }

  if (
    !dispatchAuthorization.authorizedCapabilities.includes(
      dispatchAuthorization.requiredCapability
    )
  ) {
    blockedReasons.push(
      "required capability is absent from authorized capability evidence"
    );
  }

  if (
    dispatchAuthorization.approvedExecutionScope.length ===
    0
  ) {
    blockedReasons.push(
      "approved execution scope is missing"
    );
  }

  if (
    dispatchAuthorization.provenance.length ===
    0
  ) {
    blockedReasons.push(
      "authorization provenance is missing"
    );
  }

  if (
    dispatchAuthorization.dispatchAuthorizationMayCreateAuthorization !==
    false
  ) {
    blockedReasons.push(
      "dispatch authorization may create authorization"
    );
  }

  if (
    dispatchAuthorization.dispatchAuthorizationMayExpandScope !==
    false
  ) {
    blockedReasons.push(
      "dispatch authorization may expand scope"
    );
  }

  if (
    dispatchAuthorization.dispatchAuthorizationMayDispatch !==
    false
  ) {
    blockedReasons.push(
      "dispatch authorization already grants dispatch authority"
    );
  }

  if (
    dispatchAuthorization.dispatchAuthorizationMayInvokeExecutor !==
    false
  ) {
    blockedReasons.push(
      "dispatch authorization may invoke executor"
    );
  }

  if (
    dispatchAuthorization.dispatchAuthorizationMayExecuteOperation !==
    false
  ) {
    blockedReasons.push(
      "dispatch authorization may execute operation"
    );
  }

  if (
    dispatchAuthorization.dispatchAuthorizationMayModifyRepository !==
    false
  ) {
    blockedReasons.push(
      "dispatch authorization may modify repository"
    );
  }

  if (
    dispatchAuthorization.futureDispatchBoundaryRequired !==
    true
  ) {
    blockedReasons.push(
      "future dispatch boundary requirement is missing"
    );
  }

  if (
    dispatchAuthorization.futureExecutorRequiredForSideEffects !==
    true
  ) {
    blockedReasons.push(
      "future executor requirement is missing"
    );
  }

  const dispatchBoundaryAdmitted =
    blockedReasons.length === 0;

  const trusted =
    dispatchBoundaryAdmitted;

  const ready =
    dispatchBoundaryAdmitted;

  const dispatchBoundaryState =
    dispatchBoundaryAdmitted
      ? [
          "trusted dispatch authorization verified",
          "ready dispatch authorization verified",
          "dispatch authorization decision verified",
          "authorization-decision-only predecessor verified",
          "required capability authorization verified",
          "approved execution scope verified",
          "authorization provenance verified",
          "dispatch boundary admission granted",
          "dispatch-ready envelope established",
          "executor invocation remains prohibited",
          "future executor remains separately required for side effects"
        ]
      : [
          "dispatch boundary admission denied",
          "executor invocation remains prohibited",
          "future executor remains separately required for side effects"
        ];

  return {
    version: VERSION,
    source: SOURCE,
    objective: OBJECTIVE,

    trusted,
    ready,
    dispatchBoundaryAdmitted,

    defaultPolicy: "DENY",
    boundaryAdmissionOnly: true,

    dispatchAuthorization,

    invocationRequest:
      dispatchAuthorization.invocationRequest,

    executionRequest:
      dispatchAuthorization.executionRequest,

    preparedOperation:
      dispatchAuthorization.preparedOperation,

    requiredCapability:
      dispatchAuthorization.requiredCapability,

    authorizedCapabilities: [
      ...dispatchAuthorization.authorizedCapabilities
    ],

    requiredCapabilityAuthorized:
      dispatchAuthorization.requiredCapabilityAuthorized,

    approvedExecutionScope: [
      ...dispatchAuthorization.approvedExecutionScope
    ],

    dispatchBoundaryState,

    provenance: unique([
      ...dispatchAuthorization.provenance,
      "DEV-255 dispatch-boundary admission derived from DEV-254 dispatch authorization"
    ]),

    authorizationBoundaries: unique([
      ...dispatchAuthorization.authorizationBoundaries,
      "dispatch boundary is admission-only",
      "dispatch boundary cannot create authorization",
      "dispatch boundary cannot invoke executor",
      "dispatch boundary cannot execute operation",
      "dispatch boundary cannot perform external side effects"
    ]),

    scopeBoundaries: unique([
      ...dispatchAuthorization.scopeBoundaries,
      "dispatch boundary cannot expand approved execution scope",
      "dispatch boundary cannot modify repository state",
      "dispatch boundary cannot delete repository state",
      "dispatch boundary cannot commit repository changes",
      "dispatch boundary cannot push repository changes",
      "dispatch boundary cannot deploy",
      "dispatch boundary cannot access secrets",
      "future executor remains separately required for side effects"
    ]),

    blockedReasons,

    dispatchBoundaryMayCreateAuthorization: false,
    dispatchBoundaryMayExpandScope: false,
    dispatchBoundaryMayInvokeExecutor: false,
    dispatchBoundaryMayExecuteOperation: false,
    dispatchBoundaryMayModifyRepository: false,
    dispatchBoundaryMayDeleteRepositoryContent: false,
    dispatchBoundaryMayCommit: false,
    dispatchBoundaryMayPush: false,
    dispatchBoundaryMayDeploy: false,
    dispatchBoundaryMayAccessSecrets: false,
    dispatchBoundaryMayPerformExternalSideEffects: false,

    futureExecutorRequiredForSideEffects: true
  };
}
