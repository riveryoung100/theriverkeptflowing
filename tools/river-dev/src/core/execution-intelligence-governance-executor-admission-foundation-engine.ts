import type {
  RiverDevExecutionIntelligenceGovernanceExecutorAdmissionFoundation,
  RiverDevExecutionIntelligenceGovernanceExecutorAdmissionFoundationInput
} from "../types";

const VERSION = "1.0.0";

const SOURCE =
  "river-development-agent-controlled-execution-intelligence-governance-executor-admission-foundation";

const OBJECTIVE =
  "Determine fail-closed governed executor admission from trusted handoff-ready execution evidence without performing command execution or repository modification.";

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

export function buildExecutionIntelligenceGovernanceExecutorAdmissionFoundation(
  input: RiverDevExecutionIntelligenceGovernanceExecutorAdmissionFoundationInput
): RiverDevExecutionIntelligenceGovernanceExecutorAdmissionFoundation {
  const executionHandoff = input.executionHandoff;

  const blockedReasons: string[] = [
    ...executionHandoff.blockedReasons
  ];

  if (!executionHandoff.trusted) {
    blockedReasons.push(
      "executor admission requires trusted execution-handoff evidence"
    );
  }

  if (!executionHandoff.ready) {
    blockedReasons.push(
      "executor admission requires ready execution-handoff evidence"
    );
  }

  if (!executionHandoff.authorized) {
    blockedReasons.push(
      "executor admission requires preserved execution authorization"
    );
  }

  if (!executionHandoff.dispatchReady) {
    blockedReasons.push(
      "executor admission requires preserved dispatch readiness"
    );
  }

  if (!executionHandoff.handoffReady) {
    blockedReasons.push(
      "executor admission requires explicit handoff readiness"
    );
  }

  if (executionHandoff.executionRequest.length === 0) {
    blockedReasons.push(
      "executor admission requires governed execution-request evidence"
    );
  }

  const finalBlockedReasons =
    unique(blockedReasons);

  const executorAdmitted =
    executionHandoff.trusted &&
    executionHandoff.ready &&
    executionHandoff.authorized &&
    executionHandoff.dispatchReady &&
    executionHandoff.handoffReady &&
    executionHandoff.executionRequest.length > 0 &&
    finalBlockedReasons.length === 0;

  const admissionState = executorAdmitted
    ? [
        "trusted execution-handoff evidence accepted",
        "execution-handoff readiness accepted",
        "execution authorization evidence preserved",
        "dispatch readiness evidence preserved",
        "governed execution-request evidence preserved",
        "executor admission established",
        "executor admission remains eligibility only",
        "executor admission does not grant command execution authority",
        "executor admission does not grant repository modification authority",
        "executor admission does not grant commit authority",
        "executor admission does not grant push authority",
        "executor admission does not grant deployment authority",
        "executor admission does not grant autonomous execution authority",
        "executor admission cannot expand approved execution scope"
      ]
    : [
        "executor admission denied",
        "executor admission fails closed",
        "executor admission does not grant command execution authority",
        "executor admission does not grant repository modification authority",
        "executor admission does not grant commit authority",
        "executor admission does not grant push authority",
        "executor admission does not grant deployment authority",
        "executor admission does not grant autonomous execution authority",
        "executor admission cannot expand approved execution scope"
      ];

  return {
    version: VERSION,
    source: SOURCE,
    objective: OBJECTIVE,

    trusted:
      executionHandoff.trusted,

    ready:
      executionHandoff.ready,

    authorized:
      executionHandoff.authorized,

    dispatchReady:
      executionHandoff.dispatchReady,

    handoffReady:
      executionHandoff.handoffReady,

    executorAdmitted,

    executionHandoff,

    executionRequest: [
      ...executionHandoff.executionRequest
    ],

    admissionState,

    provenance: unique([
      ...executionHandoff.provenance,
      SOURCE,
      "executor admission preserves human authorization evidence",
      "executor admission preserves repository authorization evidence",
      "executor admission preserves explicit approval evidence",
      "executor admission preserves approved execution scope"
    ]),

    authorizationBoundaries: unique([
      ...executionHandoff.authorizationBoundaries,
      "executor admission requires trusted execution-handoff evidence",
      "executor admission requires explicit handoff readiness",
      "executor admission does not grant command execution authority",
      "executor admission does not grant repository modification authority",
      "executor admission does not grant commit authority",
      "executor admission does not grant push authority",
      "executor admission does not grant deployment authority",
      "executor admission does not grant autonomous execution authority"
    ]),

    scopeBoundaries: unique([
      ...executionHandoff.scopeBoundaries,
      "executor admission preserves approved execution scope",
      "executor admission cannot expand approved execution scope"
    ]),

    blockedReasons: finalBlockedReasons
  };
}
