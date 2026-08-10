import type {
  RiverDevExecutionIntelligenceGovernanceConsolidationFoundation,
  RiverDevExecutionIntelligenceGovernanceConsolidationFoundationInput,
} from "../types";

export function createExecutionIntelligenceGovernanceConsolidationFoundation(
  input: RiverDevExecutionIntelligenceGovernanceConsolidationFoundationInput,
): RiverDevExecutionIntelligenceGovernanceConsolidationFoundation {
  const { governancePreservation } = input;

  const trusted =
    governancePreservation.trusted === true &&
    governancePreservation.preserved === true &&
    governancePreservation.blockedReasons.length === 0;

  const blockedReasons = trusted
    ? []
    : [
        ...governancePreservation.blockedReasons,
        "governance preservation is not trusted and preserved for consolidation",
      ];

  return {
    version: "1.0.0",

    source:
      "river-development-agent-controlled-execution-intelligence-governance-consolidation-foundation",

    objective:
      "Consolidate trusted preserved governance lifecycle state while preserving provenance, authorization boundaries, strict scope control, and non-autonomous execution authority.",

    trusted,

    consolidated: trusted,

    preservation: governancePreservation,

    consolidationState: trusted
      ? [
          "governance preservation record accepted",
          "governance lifecycle state consolidated",
          "controlled governance boundary preserved",
        ]
      : [
          "governance consolidation restricted",
          "governance preservation review required",
        ],

    consolidationSignals: trusted
      ? [
          "governance preservation provenance accepted for consolidation",
          "governance preservation trust accepted for consolidation",
          "governance preservation state accepted for consolidation",
          "preserved governed lifecycle state consolidated",
        ]
      : [
          "governance preservation failed consolidation trust requirements",
        ],

    provenance: [
      ...governancePreservation.provenance,
      "governance-preservation:" + governancePreservation.preservationId,
      "governance-consolidation-foundation:v1.0.0",
    ],

    authorizationBoundaries: [
      ...governancePreservation.authorizationBoundaries,
      "repository authorization boundary preserved",
      "human authorization boundary maintained",
      "governance consolidation cannot independently authorize repository modification",
      "governance consolidation cannot independently authorize execution",
      "consolidation organizes and unifies governed lifecycle state without creating autonomous execution authority",
    ],

    scopeBoundaries: [
      ...governancePreservation.scopeBoundaries,
      "strict scope boundary maintained",
      "governance consolidation cannot expand execution scope",
    ],

    blockedReasons,
  };
}
