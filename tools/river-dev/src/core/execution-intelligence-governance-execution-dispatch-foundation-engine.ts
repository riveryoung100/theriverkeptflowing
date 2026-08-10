import type {
  RiverDevExecutionIntelligenceGovernanceExecutionDispatchFoundation,
  RiverDevExecutionIntelligenceGovernanceExecutionDispatchFoundationInput
} from "../types";

const VERSION = "dev-244-v1";

const SOURCE =
  "river-development-agent-controlled-execution-intelligence-governance-execution-dispatch-foundation";

const OBJECTIVE =
  "Produce deterministic governed dispatch-readiness state from a trusted ready governance execution-runtime record without performing command execution, repository modification, commit, push, deployment, autonomous execution, or scope expansion.";

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

export function buildExecutionIntelligenceGovernanceExecutionDispatchFoundation(
  input: RiverDevExecutionIntelligenceGovernanceExecutionDispatchFoundationInput
): RiverDevExecutionIntelligenceGovernanceExecutionDispatchFoundation {
  const executionRuntime = input.executionRuntime;

  const blockedReasons: string[] = [
    ...executionRuntime.blockedReasons
  ];

  if (!executionRuntime.trusted) {
    blockedReasons.push(
      "dispatch readiness requires a trusted governance execution-runtime record"
    );
  }

  if (!executionRuntime.ready) {
    blockedReasons.push(
      "dispatch readiness requires explicit runtime readiness"
    );
  }

  if (!executionRuntime.authorized) {
    blockedReasons.push(
      "dispatch readiness requires preserved execution authorization"
    );
  }

  if (executionRuntime.executionRequest.length === 0) {
    blockedReasons.push(
      "dispatch readiness requires preserved governed execution-request evidence"
    );
  }

  const normalizedBlockedReasons =
    unique(blockedReasons);

  const trusted =
    executionRuntime.trusted &&
    normalizedBlockedReasons.length === 0;

  const ready =
    executionRuntime.ready &&
    normalizedBlockedReasons.length === 0;

  const authorized =
    executionRuntime.authorized &&
    normalizedBlockedReasons.length === 0;

  const dispatchReady =
    trusted &&
    ready &&
    authorized &&
    executionRuntime.executionRequest.length > 0;

  const dispatchState: string[] = [
    dispatchReady
      ? "governed execution request is dispatch-ready"
      : "governed execution request is not dispatch-ready",
    "dispatch readiness preserves DEV-243 runtime provenance",
    "dispatch readiness preserves governed execution-request evidence",
    "dispatch readiness preserves human authorization evidence",
    "dispatch readiness preserves repository authorization evidence",
    "dispatch readiness preserves explicit approval evidence",
    "dispatch readiness preserves approved execution scope",
    "dispatch readiness does not grant command execution authority",
    "dispatch readiness does not grant shell execution authority",
    "dispatch readiness does not grant repository modification authority",
    "dispatch readiness does not grant commit authority",
    "dispatch readiness does not grant push authority",
    "dispatch readiness does not grant deployment authority",
    "dispatch readiness does not grant autonomous execution authority",
    "dispatch readiness cannot expand approved execution scope"
  ];

  return {
    version: VERSION,
    source: SOURCE,
    objective: OBJECTIVE,

    trusted,
    ready,
    authorized,
    dispatchReady,

    executionRuntime,
    executionRequest: [
      ...executionRuntime.executionRequest
    ],

    dispatchState,

    provenance: unique([
      ...executionRuntime.provenance,
      SOURCE
    ]),

    authorizationBoundaries: unique([
      ...executionRuntime.authorizationBoundaries,
      "dispatch readiness requires trusted DEV-243 runtime evidence",
      "dispatch readiness requires explicit DEV-243 runtime readiness",
      "dispatch readiness preserves execution authorization evidence",
      "dispatch readiness does not grant command execution authority",
      "dispatch readiness does not grant shell execution authority",
      "dispatch readiness does not grant repository modification authority",
      "dispatch readiness does not grant commit authority",
      "dispatch readiness does not grant push authority",
      "dispatch readiness does not grant deployment authority",
      "dispatch readiness does not grant autonomous execution authority"
    ]),

    scopeBoundaries: unique([
      ...executionRuntime.scopeBoundaries,
      "dispatch readiness preserves approved execution scope",
      "dispatch readiness cannot expand approved execution scope"
    ]),

    blockedReasons: normalizedBlockedReasons
  };
}
