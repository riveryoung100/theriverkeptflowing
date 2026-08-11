import type {
  RiverDevControlledExecutorCapability,
  RiverDevControlledExecutorOperationAdmissionFoundation,
  RiverDevControlledExecutorOperationAdmissionFoundationInput
} from "../types";

const VERSION = "DEV-249";

const SOURCE =
  "river-development-agent-controlled-executor-operation-admission-foundation";

const OPERATION_AUTHORIZATION_BOUNDARIES = [
  "operation admission is deny by default",
  "operation admission requires trusted DEV-248 capability authorization",
  "operation admission requires ready DEV-248 capability authorization",
  "operation admission requires preserved executor admission",
  "operation admission requires an unblocked DEV-248 authorization record",
  "operation admission requires governed execution-request evidence",
  "operation admission requires authorized capability evidence",
  "proposed operation must map exactly to an authorized capability",
  "operation admission cannot create capability authorization",
  "operation admission does not grant command execution authority",
  "operation admission does not grant repository modification authority",
  "operation admission does not grant repository deletion authority",
  "operation admission does not grant commit authority",
  "operation admission does not grant push authority",
  "operation admission does not grant deployment authority",
  "operation admission does not grant secret access authority",
  "operation admission does not grant autonomous execution authority"
] as const;

const OPERATION_SCOPE_BOUNDARIES = [
  "operation admission remains bound to inherited approved execution scope",
  "operation admission cannot expand approved execution scope",
  "operation admission cannot expand DEV-248 authorized capabilities"
] as const;

function normalizeStrings(
  values: readonly string[]
): readonly string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    )
  ).sort();
}

function normalizeCapabilities(
  values: readonly RiverDevControlledExecutorCapability[]
): readonly RiverDevControlledExecutorCapability[] {
  return Array.from(new Set(values)).sort();
}

export function buildControlledExecutorOperationAdmissionFoundation(
  input: RiverDevControlledExecutorOperationAdmissionFoundationInput
): RiverDevControlledExecutorOperationAdmissionFoundation {

  const capabilityAuthorization =
    input.capabilityAuthorization;

  const admissionRequest =
    input.admissionRequest;

  const executionRequestEntries =
    normalizeStrings(
      capabilityAuthorization.executionRequest
    );

  const authorizedCapabilities =
    normalizeCapabilities(
      capabilityAuthorization.authorizedCapabilities
    );

  const blockedReasons: string[] = [];

  if (capabilityAuthorization.trusted !== true) {
    blockedReasons.push(
      "DEV-248 capability authorization is not trusted"
    );
  }

  if (capabilityAuthorization.ready !== true) {
    blockedReasons.push(
      "DEV-248 capability authorization is not ready"
    );
  }

  if (capabilityAuthorization.authorized !== true) {
    blockedReasons.push(
      "DEV-248 capability authorization decision is not authorized"
    );
  }

  if (capabilityAuthorization.executorAdmitted !== true) {
    blockedReasons.push(
      "DEV-248 executor admission is not preserved"
    );
  }

  if (capabilityAuthorization.defaultPolicy !== "DENY") {
    blockedReasons.push(
      "DEV-248 authorization policy is not deny by default"
    );
  }

  if (
    capabilityAuthorization.authorizationDecisionOnly !==
    true
  ) {
    blockedReasons.push(
      "DEV-248 authorization semantics are not decision only"
    );
  }

  if (capabilityAuthorization.blockedReasons.length > 0) {
    blockedReasons.push(
      "DEV-248 capability authorization contains blocked reasons"
    );
  }

  if (executionRequestEntries.length === 0) {
    blockedReasons.push(
      "governed execution-request evidence is missing"
    );
  }

  if (authorizedCapabilities.length === 0) {
    blockedReasons.push(
      "authorized capability evidence is missing"
    );
  }

  const operationMatchesRequiredCapability =
    admissionRequest.operation ===
    admissionRequest.requiredCapability;

  if (!operationMatchesRequiredCapability) {
    blockedReasons.push(
      "proposed operation does not match required capability"
    );
  }

  const authorizedCapabilitySet =
    new Set<RiverDevControlledExecutorCapability>(
      authorizedCapabilities
    );

  const operationRepresentedByAuthorizedCapability =
    operationMatchesRequiredCapability &&
    authorizedCapabilitySet.has(
      admissionRequest.requiredCapability
    );

  if (!operationRepresentedByAuthorizedCapability) {
    blockedReasons.push(
      `proposed operation is not represented by an authorized capability: ${admissionRequest.operation}`
    );
  }

  const normalizedBlockedReasons =
    normalizeStrings(blockedReasons);

  const admitted =
    normalizedBlockedReasons.length === 0 &&
    operationRepresentedByAuthorizedCapability;

  const trusted =
    capabilityAuthorization.trusted === true &&
    normalizedBlockedReasons.length === 0;

  const ready =
    admitted;

  const approvedExecutionScope =
    normalizeStrings([
      ...capabilityAuthorization.scopeBoundaries
    ]);

  const provenance =
    normalizeStrings([
      ...capabilityAuthorization.provenance,
      `source:${SOURCE}`,
      `version:${VERSION}`,
      `proposed-operation:${admissionRequest.operation}`,
      `required-capability:${admissionRequest.requiredCapability}`
    ]);

  return {
    trusted,
    ready,
    admitted,

    defaultPolicy: "DENY",
    admissionDecisionOnly: true,

    executionRequest:
      executionRequestEntries.join(" | "),

    proposedOperation:
      admissionRequest.operation,

    requiredCapability:
      admissionRequest.requiredCapability,

    authorizedCapabilities:
      [...authorizedCapabilities],

    operationRepresentedByAuthorizedCapability,

    approvedExecutionScope:
      [...approvedExecutionScope],

    provenance:
      [...provenance],

    authorizationBoundaries:
      [...OPERATION_AUTHORIZATION_BOUNDARIES],

    scopeBoundaries:
      [...OPERATION_SCOPE_BOUNDARIES],

    blockedReasons:
      [...normalizedBlockedReasons],

    admissionMayCreateAuthorization: false,
    admissionMayExpandScope: false,
    admissionMayExecuteOperation: false
  };
}
