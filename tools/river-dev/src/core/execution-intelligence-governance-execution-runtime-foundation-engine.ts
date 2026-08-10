import type {
  RiverDevExecutionIntelligenceGovernanceExecutionRuntimeFoundation,
  RiverDevExecutionIntelligenceGovernanceExecutionRuntimeFoundationInput,
} from "../types";

export function createExecutionIntelligenceGovernanceExecutionRuntimeFoundation(
  input: RiverDevExecutionIntelligenceGovernanceExecutionRuntimeFoundationInput
): RiverDevExecutionIntelligenceGovernanceExecutionRuntimeFoundation {
  const { executionControl } = input;

  const trustedControl =
    executionControl.trusted === true;

  const controlled =
    executionControl.controlled === true;

  const authorized =
    executionControl.authorized === true;

  const unblocked =
    executionControl.blockedReasons.length === 0;

  const hasExecutionRequest =
    executionControl.executionRequest.length > 0;

  const ready =
    trustedControl &&
    controlled &&
    authorized &&
    unblocked &&
    hasExecutionRequest;

  const blockedReasons: string[] = [];

  if (!trustedControl) {
    blockedReasons.push(
      "execution control is not trusted"
    );
  }

  if (!controlled) {
    blockedReasons.push(
      "execution control is not controlled"
    );
  }

  if (!authorized) {
    blockedReasons.push(
      "execution control is not authorized"
    );
  }

  if (!unblocked) {
    blockedReasons.push(
      "execution control contains blocking reasons"
    );
  }

  if (!hasExecutionRequest) {
    blockedReasons.push(
      "governed execution request is missing"
    );
  }

  const runtimeState = ready
    ? [
        "governed execution runtime readiness established",
        "trusted execution control preserved",
        "controlled execution boundary preserved",
        "authorized governance eligibility preserved",
        "governed execution request validated",
        "runtime readiness does not grant command execution authority",
        "runtime readiness does not grant repository modification authority",
        "runtime readiness does not grant dispatch authority",
        "runtime readiness does not grant commit authority",
        "runtime readiness does not grant push authority",
        "runtime readiness grants no autonomous execution authority",
        "runtime readiness cannot expand approved execution scope",
      ]
    : [
        "governed execution runtime readiness blocked",
        "runtime readiness does not grant command execution authority",
        "runtime readiness does not grant repository modification authority",
        "runtime readiness does not grant dispatch authority",
        "runtime readiness grants no autonomous execution authority",
      ];

  const provenance = [
    ...executionControl.provenance,
    "DEV-243 governance execution runtime derived from DEV-242 execution control",
    ready
      ? "runtime readiness established from trusted controlled authorized unblocked execution control"
      : "runtime readiness blocked by execution-control eligibility",
    hasExecutionRequest
      ? "governed execution request evidence preserved"
      : "governed execution request evidence missing",
    "runtime readiness remains separate from actual command execution",
  ];

  const authorizationBoundaries = [
    ...executionControl.authorizationBoundaries,
    "runtime readiness requires trusted execution control",
    "runtime readiness requires controlled execution state",
    "runtime readiness requires authorized governance eligibility",
    "runtime readiness requires an unblocked execution-control record",
    "runtime readiness requires a governed execution request",
    "runtime readiness does not grant command execution authority",
    "runtime readiness does not grant repository modification authority",
    "runtime readiness does not grant dispatch authority",
    "runtime readiness does not grant commit authority",
    "runtime readiness does not grant push authority",
    "runtime readiness grants no autonomous execution authority",
  ];

  const scopeBoundaries = [
    ...executionControl.scopeBoundaries,
    "runtime readiness cannot expand approved execution scope",
    "runtime readiness cannot create new repository modification authority",
    "runtime readiness cannot create new command execution authority",
    "runtime readiness cannot create new dispatch authority",
  ];

  return {
    version: "1.0.0",
    source:
      "River Development Agent controlled execution intelligence governance execution runtime foundation",
    objective:
      "Derive deterministic governed runtime-readiness state from trusted controlled authorized DEV-242 execution control without executing commands or modifying the repository.",

    trusted: ready,
    ready,
    authorized,

    executionControl,
    executionRequest: [
      ...executionControl.executionRequest,
    ],

    runtimeState,
    provenance,

    authorizationBoundaries,
    scopeBoundaries,
    blockedReasons,
  };
}
