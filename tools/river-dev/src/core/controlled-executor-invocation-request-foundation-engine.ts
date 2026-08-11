import type {
  RiverDevControlledExecutorInvocationRequestFoundation,
  RiverDevControlledExecutorInvocationRequestFoundationInput
} from "../types";

const VERSION = "DEV-253";

const SOURCE =
  "River Development Agent controlled executor invocation request foundation";

const OBJECTIVE =
  "Construct an inert fail-closed executor invocation request from an eligible DEV-252 execution boundary while preserving exact operation, capability, authorization, scope, provenance, and inherited execution constraints without dispatching or invoking an executor.";

const AUTHORIZATION_BOUNDARIES = [
  "invocation request cannot create capability authorization",
  "invocation request cannot invoke the future executor",
  "invocation request cannot dispatch itself",
  "invocation request cannot execute the prepared operation",
  "invocation request cannot modify repository state"
];

const SCOPE_BOUNDARIES = [
  "invocation request cannot expand approved execution scope",
  "future dispatch boundary remains separately required",
  "future executor remains separately required for side effects"
];

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

export function buildControlledExecutorInvocationRequestFoundation(
  input: RiverDevControlledExecutorInvocationRequestFoundationInput
): RiverDevControlledExecutorInvocationRequestFoundation {
  const boundary = input.executionBoundary;

  const blockedReasons: string[] = [];

  if (!boundary.trusted) {
    blockedReasons.push("execution boundary is not trusted");
  }

  if (!boundary.ready) {
    blockedReasons.push("execution boundary is not ready");
  }

  if (!boundary.eligible) {
    blockedReasons.push("execution boundary is not eligible");
  }

  if (boundary.boundaryDecisionOnly !== true) {
    blockedReasons.push(
      "execution boundary does not preserve boundary-decision-only semantics"
    );
  }

  if (boundary.blockedReasons.length > 0) {
    blockedReasons.push("execution boundary contains blockers");
  }

  if (
    typeof boundary.executionRequest !== "string" ||
    boundary.executionRequest.trim().length === 0
  ) {
    blockedReasons.push("governed execution request is missing");
  }

  if (!boundary.preparedOperation) {
    blockedReasons.push("prepared operation is missing");
  }

  if (!boundary.requiredCapability) {
    blockedReasons.push("required capability is missing");
  }

  if (
    !Array.isArray(boundary.authorizedCapabilities) ||
    boundary.authorizedCapabilities.length === 0
  ) {
    blockedReasons.push("authorized capability evidence is missing");
  }

  if (!boundary.requiredCapabilityAuthorized) {
    blockedReasons.push("required capability is not authorized");
  }

  if (
    !Array.isArray(boundary.approvedExecutionScope) ||
    boundary.approvedExecutionScope.length === 0
  ) {
    blockedReasons.push("approved execution scope is missing");
  }

  const requestConstructed =
    blockedReasons.length === 0;

  const trusted =
    boundary.trusted === true;

  const ready =
    trusted &&
    boundary.ready === true &&
    boundary.eligible === true &&
    boundary.boundaryDecisionOnly === true &&
    requestConstructed;

  const invocationRequestState = [
    requestConstructed
      ? "executor invocation request constructed"
      : "executor invocation request denied",
    "request construction only",
    "dispatch not authorized",
    "executor invocation not authorized",
    "operation execution not authorized"
  ];

  return {
    version: VERSION,
    source: SOURCE,
    objective: OBJECTIVE,

    trusted,
    ready,
    requestConstructed,

    defaultPolicy: "DENY",
    requestConstructionOnly: true,

    executionBoundary: boundary,

    executionRequest: boundary.executionRequest,

    preparedOperation: boundary.preparedOperation,
    requiredCapability: boundary.requiredCapability,

    authorizedCapabilities: [
      ...boundary.authorizedCapabilities
    ],

    requiredCapabilityAuthorized:
      boundary.requiredCapabilityAuthorized,

    approvedExecutionScope: [
      ...boundary.approvedExecutionScope
    ],

    invocationRequestState,

    provenance: [
      ...boundary.provenance,
      VERSION,
      SOURCE
    ],

    authorizationBoundaries: unique([
      ...boundary.authorizationBoundaries,
      ...AUTHORIZATION_BOUNDARIES
    ]),

    scopeBoundaries: unique([
      ...boundary.scopeBoundaries,
      ...SCOPE_BOUNDARIES
    ]),

    blockedReasons,

    invocationRequestMayCreateAuthorization: false,
    invocationRequestMayExpandScope: false,
    invocationRequestMayInvokeExecutor: false,
    invocationRequestMayExecuteOperation: false,
    invocationRequestMayModifyRepository: false,
    invocationRequestMayDispatch: false,

    futureDispatchBoundaryRequired: true,
    futureExecutorRequiredForSideEffects: true
  };
}
