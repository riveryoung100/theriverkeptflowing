import type {
  RiverDevExecutionIntelligenceGovernanceExecutionHandoffFoundation,
  RiverDevExecutionIntelligenceGovernanceExecutionHandoffFoundationInput
} from "../types";

const VERSION = "1.0.0";

const SOURCE =
  "river-development-agent-controlled-execution-intelligence-governance-execution-handoff-foundation";

const OBJECTIVE =
  "Determine governed execution handoff readiness from a trusted authorized dispatch-ready execution record without performing command or repository execution.";

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

export function buildExecutionIntelligenceGovernanceExecutionHandoffFoundation(
  input: RiverDevExecutionIntelligenceGovernanceExecutionHandoffFoundationInput
): RiverDevExecutionIntelligenceGovernanceExecutionHandoffFoundation {
  const executionDispatch = input.executionDispatch;

  const blockedReasons: string[] = [
    ...executionDispatch.blockedReasons
  ];

  if (!executionDispatch.trusted) {
    blockedReasons.push(
      "execution handoff requires trusted execution-dispatch evidence"
    );
  }

  if (!executionDispatch.ready) {
    blockedReasons.push(
      "execution handoff requires ready execution-dispatch evidence"
    );
  }

  if (!executionDispatch.authorized) {
    blockedReasons.push(
      "execution handoff requires preserved execution authorization"
    );
  }

  if (!executionDispatch.dispatchReady) {
    blockedReasons.push(
      "execution handoff requires explicit dispatch readiness"
    );
  }

  if (executionDispatch.executionRequest.length === 0) {
    blockedReasons.push(
      "execution handoff requires governed execution-request evidence"
    );
  }

  const finalBlockedReasons =
    unique(blockedReasons);

  const handoffReady =
    executionDispatch.trusted &&
    executionDispatch.ready &&
    executionDispatch.authorized &&
    executionDispatch.dispatchReady &&
    executionDispatch.executionRequest.length > 0 &&
    finalBlockedReasons.length === 0;

  const handoffState = handoffReady
    ? [
        "trusted execution-dispatch evidence accepted",
        "execution-dispatch readiness accepted",
        "execution authorization evidence preserved",
        "governed execution-request evidence preserved",
        "execution handoff readiness established",
        "execution handoff remains readiness only",
        "execution handoff does not grant command execution authority",
        "execution handoff does not grant repository modification authority",
        "execution handoff does not grant commit authority",
        "execution handoff does not grant push authority",
        "execution handoff does not grant deployment authority",
        "execution handoff does not grant autonomous execution authority",
        "execution handoff cannot expand approved execution scope"
      ]
    : [
        "execution handoff readiness denied",
        "execution handoff fails closed",
        "execution handoff does not grant command execution authority",
        "execution handoff does not grant repository modification authority",
        "execution handoff does not grant commit authority",
        "execution handoff does not grant push authority",
        "execution handoff does not grant deployment authority",
        "execution handoff does not grant autonomous execution authority",
        "execution handoff cannot expand approved execution scope"
      ];

  return {
    version: VERSION,
    source: SOURCE,
    objective: OBJECTIVE,

    trusted:
      executionDispatch.trusted,

    ready:
      executionDispatch.ready,

    authorized:
      executionDispatch.authorized,

    dispatchReady:
      executionDispatch.dispatchReady,

    handoffReady,

    executionDispatch,

    executionRequest: [
      ...executionDispatch.executionRequest
    ],

    handoffState,

    provenance: unique([
      ...executionDispatch.provenance,
      SOURCE,
      "execution handoff preserves human authorization evidence",
      "execution handoff preserves repository authorization evidence",
      "execution handoff preserves explicit approval evidence",
      "execution handoff preserves approved execution scope"
    ]),

    authorizationBoundaries: unique([
      ...executionDispatch.authorizationBoundaries,
      "execution handoff requires trusted execution-dispatch evidence",
      "execution handoff requires explicit dispatch readiness",
      "execution handoff does not grant command execution authority",
      "execution handoff does not grant repository modification authority",
      "execution handoff does not grant commit authority",
      "execution handoff does not grant push authority",
      "execution handoff does not grant deployment authority",
      "execution handoff does not grant autonomous execution authority"
    ]),

    scopeBoundaries: unique([
      ...executionDispatch.scopeBoundaries,
      "execution handoff preserves approved execution scope",
      "execution handoff cannot expand approved execution scope"
    ]),

    blockedReasons: finalBlockedReasons
  };
}
