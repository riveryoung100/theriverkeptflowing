import type {
  RiverDevControlledExecutorCapability,
  RiverDevControlledExecutorCapabilityFoundation,
  RiverDevControlledExecutorCapabilityFoundationInput,
} from "../types";

const RECOGNIZED_CAPABILITIES: readonly RiverDevControlledExecutorCapability[] =
  Object.freeze([
    "inspect-approved-repository-state",
    "prepare-approved-repository-change",
    "validate-approved-repository-change",
  ]);

function hasNonEmptyExecutionRequest(
  executionRequest: readonly string[],
): boolean {
  return executionRequest.some(
    (entry) => typeof entry === "string" && entry.trim().length > 0,
  );
}

export function buildControlledExecutorCapabilityFoundation(
  input: RiverDevControlledExecutorCapabilityFoundationInput,
): RiverDevControlledExecutorCapabilityFoundation {
  const executorAdmission = input.executorAdmission;

  const blockedReasons: string[] = [];

  if (executorAdmission.trusted !== true) {
    blockedReasons.push(
      "executor admission must be trusted before capability eligibility can be derived",
    );
  }

  if (executorAdmission.ready !== true) {
    blockedReasons.push(
      "executor admission must be ready before capability eligibility can be derived",
    );
  }

  if (executorAdmission.authorized !== true) {
    blockedReasons.push(
      "executor admission must preserve authorization before capability eligibility can be derived",
    );
  }

  if (executorAdmission.dispatchReady !== true) {
    blockedReasons.push(
      "executor admission must preserve dispatch readiness before capability eligibility can be derived",
    );
  }

  if (executorAdmission.handoffReady !== true) {
    blockedReasons.push(
      "executor admission must preserve execution handoff readiness before capability eligibility can be derived",
    );
  }

  if (executorAdmission.executorAdmitted !== true) {
    blockedReasons.push(
      "executor admission is required before capability eligibility can be derived",
    );
  }

  if (executorAdmission.blockedReasons.length > 0) {
    blockedReasons.push(
      "executor admission must be unblocked before capability eligibility can be derived",
    );
  }

  if (!hasNonEmptyExecutionRequest(executorAdmission.executionRequest)) {
    blockedReasons.push(
      "governed execution request evidence is required before capability eligibility can be derived",
    );
  }

  const trusted =
    executorAdmission.trusted === true &&
    executorAdmission.ready === true &&
    executorAdmission.authorized === true &&
    executorAdmission.dispatchReady === true &&
    executorAdmission.handoffReady === true &&
    executorAdmission.executorAdmitted === true &&
    executorAdmission.blockedReasons.length === 0 &&
    hasNonEmptyExecutionRequest(executorAdmission.executionRequest);

  const ready =
    trusted &&
    blockedReasons.length === 0;

  const eligibleCapabilities:
    readonly RiverDevControlledExecutorCapability[] =
    ready
      ? RECOGNIZED_CAPABILITIES
      : Object.freeze([]);

  const capabilityState: readonly string[] =
    ready
      ? Object.freeze([
          "capability policy is deny-by-default",
          "capability eligibility requires trusted executor admission",
          "inspection capability is eligible but not authorized",
          "change preparation capability is eligible but not authorized",
          "change validation capability is eligible but not authorized",
          "capability eligibility does not grant command execution authority",
          "capability eligibility does not grant repository modification authority",
          "capability eligibility does not grant repository deletion authority",
          "capability eligibility does not grant commit authority",
          "capability eligibility does not grant push authority",
          "capability eligibility does not grant deployment authority",
          "capability eligibility does not grant secret access authority",
          "capability eligibility does not grant autonomous execution authority",
          "capability eligibility cannot expand approved execution scope",
        ])
      : Object.freeze([
          "capability policy is deny-by-default",
          "capability eligibility is blocked",
          "no controlled executor capability is eligible",
          "capability eligibility does not grant execution authority",
        ]);

  return Object.freeze({
    version: "DEV-247",
    source:
      "River Development Agent controlled executor capability foundation",
    objective:
      "Derive deterministic fail-closed controlled executor capability eligibility from trusted executor-admission evidence without authorizing or performing execution.",

    trusted,
    ready,

    authorized:
      executorAdmission.authorized === true,

    executorAdmitted:
      executorAdmission.executorAdmitted === true,

    defaultPolicy: "DENY",
    capabilityEligibilityOnly: true,

    executorAdmission,

    executionRequest:
      Object.freeze([
        ...executorAdmission.executionRequest,
      ]),

    recognizedCapabilities:
      RECOGNIZED_CAPABILITIES,

    eligibleCapabilities:
      Object.freeze([
        ...eligibleCapabilities,
      ]),

    capabilityState,

    provenance:
      Object.freeze([
        ...executorAdmission.provenance,
        "DEV-247 capability eligibility derived from DEV-246 executor admission",
      ]),

    authorizationBoundaries:
      Object.freeze([
        ...executorAdmission.authorizationBoundaries,
        "capability eligibility does not grant command execution authority",
        "capability eligibility does not grant repository modification authority",
        "capability eligibility does not grant repository deletion authority",
        "capability eligibility does not grant commit authority",
        "capability eligibility does not grant push authority",
        "capability eligibility does not grant deployment authority",
        "capability eligibility does not grant secret access authority",
        "capability eligibility does not grant autonomous execution authority",
      ]),

    scopeBoundaries:
      Object.freeze([
        ...executorAdmission.scopeBoundaries,
        "capability eligibility cannot expand approved execution scope",
      ]),

    blockedReasons:
      Object.freeze([
        ...blockedReasons,
      ]),
  });
}
