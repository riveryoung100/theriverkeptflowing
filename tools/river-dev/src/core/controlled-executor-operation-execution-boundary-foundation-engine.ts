import type {
  RiverDevControlledExecutorCapability,
  RiverDevControlledExecutorOperationExecutionBoundaryFoundation,
  RiverDevControlledExecutorOperationExecutionBoundaryFoundationInput
} from "../types";

const VERSION = "DEV-252";

const SOURCE =
  "DEV-252 controlled executor operation execution boundary foundation";

const OBJECTIVE =
  "Deterministically derive fail-closed executor-boundary eligibility for an exact authorized DEV-251 operation without invoking an executor or performing command or repository execution.";

const AUTHORIZATION_BOUNDARIES = [
  "execution boundary requires trusted DEV-251 execution authorization",
  "execution boundary requires ready DEV-251 execution authorization",
  "execution boundary requires an authorized DEV-251 execution decision",
  "execution boundary requires DEV-251 authorization-decision-only semantics",
  "execution boundary requires unblocked authorization evidence",
  "execution boundary requires governed execution-request evidence",
  "execution boundary requires authorized capability evidence",
  "execution boundary requires approved execution scope evidence",
  "execution boundary does not grant command execution authority",
  "execution boundary does not grant repository modification authority",
  "execution boundary does not grant repository deletion authority",
  "execution boundary does not grant commit authority",
  "execution boundary does not grant push authority",
  "execution boundary does not grant deployment authority",
  "execution boundary does not grant secret access authority",
  "execution boundary does not grant autonomous execution authority",
  "execution boundary cannot invoke the future executor"
] as const;

const SCOPE_BOUNDARIES = [
  "execution boundary cannot expand approved execution scope",
  "execution boundary cannot create capability authorization",
  "execution boundary applies only to the exact authorized prepared operation",
  "future executor remains separately required for side effects"
] as const;

function normalizeStrings(
  values: readonly string[]
): string[] {
  return [
    ...new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    )
  ].sort((left, right) =>
    left.localeCompare(right)
  );
}

function normalizeCapabilities(
  values: readonly RiverDevControlledExecutorCapability[]
): RiverDevControlledExecutorCapability[] {
  return [
    ...new Set(values)
  ].sort((left, right) =>
    left.localeCompare(right)
  );
}

export function buildControlledExecutorOperationExecutionBoundaryFoundation(
  input: RiverDevControlledExecutorOperationExecutionBoundaryFoundationInput
): RiverDevControlledExecutorOperationExecutionBoundaryFoundation {
  const executionAuthorization =
    input.executionAuthorization;

  const blockedReasons: string[] = [];

  if (executionAuthorization.trusted !== true) {
    blockedReasons.push(
      "DEV-251 execution authorization is not trusted"
    );
  }

  if (executionAuthorization.ready !== true) {
    blockedReasons.push(
      "DEV-251 execution authorization is not ready"
    );
  }

  if (executionAuthorization.authorized !== true) {
    blockedReasons.push(
      "DEV-251 execution decision is not authorized"
    );
  }

  if (executionAuthorization.defaultPolicy !== "DENY") {
    blockedReasons.push(
      "DEV-251 deny-by-default policy is not preserved"
    );
  }

  if (
    executionAuthorization.authorizationDecisionOnly !==
    true
  ) {
    blockedReasons.push(
      "DEV-251 authorization-decision-only boundary is not preserved"
    );
  }

  if (executionAuthorization.blockedReasons.length > 0) {
    blockedReasons.push(
      "DEV-251 execution authorization contains blocked reasons"
    );
  }

  const executionRequest =
    executionAuthorization.executionRequest.trim();

  if (executionRequest.length === 0) {
    blockedReasons.push(
      "governed execution-request evidence is missing"
    );
  }

  const authorizedCapabilities =
    normalizeCapabilities(
      executionAuthorization.authorizedCapabilities
    );

  if (authorizedCapabilities.length === 0) {
    blockedReasons.push(
      "authorized capability evidence is missing"
    );
  }

  const approvedExecutionScope =
    normalizeStrings(
      executionAuthorization.approvedExecutionScope
    );

  if (approvedExecutionScope.length === 0) {
    blockedReasons.push(
      "approved execution scope evidence is missing"
    );
  }

  const requiredCapabilityAuthorized =
    executionAuthorization.requiredCapabilityAuthorized ===
      true &&
    authorizedCapabilities.includes(
      executionAuthorization.requiredCapability
    );

  if (!requiredCapabilityAuthorized) {
    blockedReasons.push(
      `required capability is not authorized at execution boundary: ${executionAuthorization.requiredCapability}`
    );
  }

  if (
    executionAuthorization.preparedOperation !==
    executionAuthorization.requiredCapability
  ) {
    blockedReasons.push(
      "authorized prepared operation does not match required capability"
    );
  }

  const normalizedBlockedReasons =
    normalizeStrings(blockedReasons);

  const trusted =
    executionAuthorization.trusted === true;

  const ready =
    trusted &&
    executionAuthorization.ready === true &&
    executionAuthorization.authorized === true &&
    normalizedBlockedReasons.length === 0;

  const eligible =
    ready &&
    requiredCapabilityAuthorized;

  const boundaryState =
    normalizeStrings([
      eligible
        ? "future executor eligibility established"
        : "future executor eligibility denied",
      `prepared-operation:${executionAuthorization.preparedOperation}`,
      `required-capability:${executionAuthorization.requiredCapability}`,
      `required-capability-authorized:${requiredCapabilityAuthorized}`,
      `executor-invocation:false`
    ]);

  const provenance =
    normalizeStrings([
      ...executionAuthorization.provenance,
      `version:${VERSION}`,
      `prepared-operation:${executionAuthorization.preparedOperation}`,
      `required-capability:${executionAuthorization.requiredCapability}`,
      `execution-boundary-eligible:${eligible}`
    ]);

  const authorizationBoundaries =
    normalizeStrings([
      ...executionAuthorization.authorizationBoundaries,
      ...AUTHORIZATION_BOUNDARIES
    ]);

  const scopeBoundaries =
    normalizeStrings([
      ...executionAuthorization.scopeBoundaries,
      ...SCOPE_BOUNDARIES
    ]);

  return {
    version: VERSION,
    source: SOURCE,
    objective: OBJECTIVE,

    trusted,
    ready,
    eligible,

    defaultPolicy: "DENY",
    boundaryDecisionOnly: true,

    executionAuthorization,

    executionRequest,

    preparedOperation:
      executionAuthorization.preparedOperation,

    requiredCapability:
      executionAuthorization.requiredCapability,

    authorizedCapabilities:
      [...authorizedCapabilities],

    requiredCapabilityAuthorized,

    approvedExecutionScope:
      [...approvedExecutionScope],

    boundaryState:
      [...boundaryState],

    provenance:
      [...provenance],

    authorizationBoundaries:
      [...authorizationBoundaries],

    scopeBoundaries:
      [...scopeBoundaries],

    blockedReasons:
      [...normalizedBlockedReasons],

    boundaryMayCreateAuthorization: false,
    boundaryMayExpandScope: false,
    boundaryMayExecuteOperation: false,
    boundaryMayModifyRepository: false,
    boundaryMayInvokeExecutor: false,

    futureExecutorRequiredForSideEffects: true
  };
}
