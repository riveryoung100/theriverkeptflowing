import type {
  RiverDevControlledExecutorCapability,
  RiverDevControlledExecutorOperationExecutionAuthorizationFoundation,
  RiverDevControlledExecutorOperationExecutionAuthorizationFoundationInput
} from "../types";

const VERSION = "DEV-251";

const SOURCE =
  "DEV-251 controlled executor operation execution authorization foundation";

const OBJECTIVE =
  "Derive a deterministic fail-closed execution-authorization decision over an exact trusted ready prepared DEV-250 operation without executing it or modifying repository state.";

const EXECUTION_AUTHORIZATION_BOUNDARIES = [
  "execution authorization requires trusted DEV-250 preparation evidence",
  "execution authorization requires ready DEV-250 preparation evidence",
  "execution authorization requires an explicitly prepared DEV-250 operation",
  "execution authorization requires unblocked DEV-250 preparation evidence",
  "execution authorization requires governed execution-request evidence",
  "execution authorization requires authorized capability evidence",
  "execution authorization requires approved execution scope evidence",
  "execution authorization does not grant command execution authority",
  "execution authorization does not grant repository modification authority",
  "execution authorization does not grant repository deletion authority",
  "execution authorization does not grant commit authority",
  "execution authorization does not grant push authority",
  "execution authorization does not grant deployment authority",
  "execution authorization does not grant secret access authority",
  "execution authorization does not grant autonomous execution authority"
] as const;

const EXECUTION_SCOPE_BOUNDARIES = [
  "execution authorization cannot expand approved execution scope",
  "execution authorization cannot create capability authorization",
  "execution authorization applies only to the exact DEV-250 prepared operation"
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

export function buildControlledExecutorOperationExecutionAuthorizationFoundation(
  input: RiverDevControlledExecutorOperationExecutionAuthorizationFoundationInput
): RiverDevControlledExecutorOperationExecutionAuthorizationFoundation {
  const operationPreparation =
    input.operationPreparation;

  const blockedReasons: string[] = [];

  if (operationPreparation.trusted !== true) {
    blockedReasons.push(
      "DEV-250 operation preparation is not trusted"
    );
  }

  if (operationPreparation.ready !== true) {
    blockedReasons.push(
      "DEV-250 operation preparation is not ready"
    );
  }

  if (operationPreparation.prepared !== true) {
    blockedReasons.push(
      "DEV-250 operation was not prepared"
    );
  }

  if (operationPreparation.defaultPolicy !== "DENY") {
    blockedReasons.push(
      "DEV-250 deny-by-default preparation policy is not preserved"
    );
  }

  if (operationPreparation.preparationOnly !== true) {
    blockedReasons.push(
      "DEV-250 preparation-only boundary is not preserved"
    );
  }

  if (operationPreparation.blockedReasons.length > 0) {
    blockedReasons.push(
      "DEV-250 operation preparation contains blocked reasons"
    );
  }

  const executionRequest =
    operationPreparation.executionRequest.trim();

  if (executionRequest.length === 0) {
    blockedReasons.push(
      "governed execution-request evidence is missing"
    );
  }

  const authorizedCapabilities =
    normalizeCapabilities(
      operationPreparation.authorizedCapabilities
    );

  if (authorizedCapabilities.length === 0) {
    blockedReasons.push(
      "authorized capability evidence is missing"
    );
  }

  const approvedExecutionScope =
    normalizeStrings(
      operationPreparation.approvedExecutionScope
    );

  if (approvedExecutionScope.length === 0) {
    blockedReasons.push(
      "approved execution scope evidence is missing"
    );
  }

  const requiredCapabilityAuthorized =
    authorizedCapabilities.includes(
      operationPreparation.requiredCapability
    );

  if (!requiredCapabilityAuthorized) {
    blockedReasons.push(
      `required capability is not authorized: ${operationPreparation.requiredCapability}`
    );
  }

  if (
    operationPreparation.preparedOperation !==
    operationPreparation.requiredCapability
  ) {
    blockedReasons.push(
      "prepared operation does not match required capability"
    );
  }

  const normalizedBlockedReasons =
    normalizeStrings(blockedReasons);

  const trusted =
    operationPreparation.trusted === true;

  const ready =
    trusted &&
    operationPreparation.ready === true &&
    operationPreparation.prepared === true &&
    normalizedBlockedReasons.length === 0;

  const authorized =
    ready &&
    requiredCapabilityAuthorized;

  const authorizationState =
    normalizeStrings([
      authorized
        ? "execution authorization decision established"
        : "execution authorization denied",
      `prepared-operation:${operationPreparation.preparedOperation}`,
      `required-capability:${operationPreparation.requiredCapability}`,
      `required-capability-authorized:${requiredCapabilityAuthorized}`
    ]);

  const provenance =
    normalizeStrings([
      ...operationPreparation.provenance,
      `version:${VERSION}`,
      `prepared-operation:${operationPreparation.preparedOperation}`,
      `required-capability:${operationPreparation.requiredCapability}`,
      `execution-authorization:${authorized ? "authorized" : "denied"}`
    ]);

  const authorizationBoundaries =
    normalizeStrings([
      ...operationPreparation.authorizationBoundaries,
      ...EXECUTION_AUTHORIZATION_BOUNDARIES
    ]);

  const scopeBoundaries =
    normalizeStrings([
      ...operationPreparation.scopeBoundaries,
      ...EXECUTION_SCOPE_BOUNDARIES
    ]);

  return {
    version: VERSION,
    source: SOURCE,
    objective: OBJECTIVE,

    trusted,
    ready,
    authorized,

    defaultPolicy: "DENY",
    authorizationDecisionOnly: true,

    operationPreparation,

    executionRequest,

    preparedOperation:
      operationPreparation.preparedOperation,

    requiredCapability:
      operationPreparation.requiredCapability,

    authorizedCapabilities:
      [...authorizedCapabilities],

    requiredCapabilityAuthorized,

    approvedExecutionScope:
      [...approvedExecutionScope],

    authorizationState:
      [...authorizationState],

    provenance:
      [...provenance],

    authorizationBoundaries:
      [...authorizationBoundaries],

    scopeBoundaries:
      [...scopeBoundaries],

    blockedReasons:
      [...normalizedBlockedReasons],

    authorizationMayCreateCapabilityAuthorization: false,
    authorizationMayExpandScope: false,
    authorizationMayExecuteOperation: false,
    authorizationMayModifyRepository: false
  };
}
