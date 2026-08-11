import type {
  RiverDevControlledExecutorCapability,
  RiverDevControlledExecutorOperationPreparationFoundation,
  RiverDevControlledExecutorOperationPreparationFoundationInput
} from "../types";

const VERSION = "DEV-250";

const SOURCE =
  "river-development-agent-controlled-executor-operation-preparation-foundation";

const OBJECTIVE =
  "Deterministically prepare a trusted admitted controlled executor operation while preserving authorization provenance, capability evidence, approved execution scope, and strict separation between preparation and execution.";

function normalizeStrings(values: readonly string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    )
  ).sort((left, right) => left.localeCompare(right));
}

function normalizeCapabilities(
  capabilities: readonly RiverDevControlledExecutorCapability[]
): RiverDevControlledExecutorCapability[] {
  return [...capabilities].sort((left, right) =>
    JSON.stringify(left).localeCompare(JSON.stringify(right))
  );
}

export function buildControlledExecutorOperationPreparationFoundation(
  input: RiverDevControlledExecutorOperationPreparationFoundationInput
): RiverDevControlledExecutorOperationPreparationFoundation {
  const operationAdmission = input.operationAdmission;

  const executionRequest =
    operationAdmission.executionRequest.trim();

  const authorizedCapabilities =
    normalizeCapabilities(operationAdmission.authorizedCapabilities);

  const approvedExecutionScope =
    normalizeStrings(operationAdmission.approvedExecutionScope);

  const blockedReasons: string[] = [];

  if (operationAdmission.trusted !== true) {
    blockedReasons.push(
      "operation admission must be trusted before preparation"
    );
  }

  if (operationAdmission.ready !== true) {
    blockedReasons.push(
      "operation admission must be ready before preparation"
    );
  }

  if (operationAdmission.admitted !== true) {
    blockedReasons.push(
      "operation must be explicitly admitted before preparation"
    );
  }

  if (operationAdmission.defaultPolicy !== "DENY") {
    blockedReasons.push(
      "operation admission must preserve deny-by-default policy"
    );
  }

  if (operationAdmission.admissionDecisionOnly !== true) {
    blockedReasons.push(
      "operation admission must remain an admission decision only"
    );
  }

  if (
    operationAdmission.operationRepresentedByAuthorizedCapability !==
    true
  ) {
    blockedReasons.push(
      "operation must be represented by an authorized capability"
    );
  }

  if (operationAdmission.blockedReasons.length > 0) {
    blockedReasons.push(
      "operation admission contains predecessor blocking reasons"
    );
  }

  if (executionRequest.length === 0) {
    blockedReasons.push(
      "governed execution request is required for preparation"
    );
  }

  if (authorizedCapabilities.length === 0) {
    blockedReasons.push(
      "authorized capability evidence is required for preparation"
    );
  }

  const requiredCapabilityAuthorized =
    authorizedCapabilities.some(
      (capability) =>
        JSON.stringify(capability) ===
        JSON.stringify(operationAdmission.requiredCapability)
    );

  if (!requiredCapabilityAuthorized) {
    blockedReasons.push(
      "required capability must be present in authorized capability evidence"
    );
  }

  const normalizedBlockedReasons =
    normalizeStrings(blockedReasons);

  const trusted =
    normalizedBlockedReasons.length === 0;

  const ready =
    trusted;

  const prepared =
    ready;

  const preparationState =
    prepared
      ? [
          "operation admission trusted",
          "operation admission ready",
          "operation explicitly admitted",
          "deny-by-default policy preserved",
          "required capability authorized",
          "approved execution scope preserved",
          "operation prepared without execution"
        ]
      : [
          "operation preparation blocked",
          ...normalizedBlockedReasons
        ];

  const provenance =
    normalizeStrings([
      ...operationAdmission.provenance,
      "DEV-250 preparation derived from DEV-249 operation admission"
    ]);

  const authorizationBoundaries =
    normalizeStrings([
      ...operationAdmission.authorizationBoundaries,
      "operation preparation does not grant command execution authority",
      "operation preparation does not grant repository modification authority",
      "operation preparation does not grant repository deletion authority",
      "operation preparation does not grant commit authority",
      "operation preparation does not grant push authority",
      "operation preparation does not grant deployment authority",
      "operation preparation does not grant secret access authority",
      "operation preparation does not grant autonomous execution authority"
    ]);

  const scopeBoundaries =
    normalizeStrings([
      ...operationAdmission.scopeBoundaries,
      "operation preparation cannot expand approved execution scope",
      "operation preparation cannot create capability authorization",
      "operation preparation cannot execute the prepared operation"
    ]);

  return {
    version: VERSION,
    source: SOURCE,
    objective: OBJECTIVE,

    trusted,
    ready,
    prepared,

    defaultPolicy: "DENY",
    preparationOnly: true,

    operationAdmission,

    executionRequest,

    preparedOperation: operationAdmission.proposedOperation,
    requiredCapability: operationAdmission.requiredCapability,

    authorizedCapabilities,
    approvedExecutionScope,

    preparationState:
      normalizeStrings(preparationState),

    provenance,
    authorizationBoundaries,
    scopeBoundaries,

    blockedReasons: normalizedBlockedReasons,

    preparationMayCreateAuthorization: false,
    preparationMayExpandScope: false,
    preparationMayExecuteOperation: false,
    preparationMayModifyRepository: false
  };
}
