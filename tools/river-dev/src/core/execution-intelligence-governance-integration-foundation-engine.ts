import type {
  RiverDevExecutionIntelligenceGovernanceIntegrationFoundation,
  RiverDevExecutionIntelligenceGovernanceIntegrationFoundationInput,
} from "../types";

export function createExecutionIntelligenceGovernanceIntegrationFoundation(
  input: RiverDevExecutionIntelligenceGovernanceIntegrationFoundationInput,
): RiverDevExecutionIntelligenceGovernanceIntegrationFoundation {
  const { governanceConsolidation } = input;

  const trusted =
    governanceConsolidation.trusted === true &&
    governanceConsolidation.consolidated === true &&
    governanceConsolidation.blockedReasons.length === 0;

  const integrationState = trusted
    ? [
        "governance consolidation record accepted",
        "governed lifecycle state integrated",
        "controlled governance integration boundary preserved",
      ]
    : [
        "governance integration restricted",
        "governance consolidation review required",
      ];

  const integrationSignals = trusted
    ? [
        "governance consolidation provenance accepted for integration",
        "governance consolidation trust accepted for integration",
        "governance consolidation state accepted for integration",
        "consolidated governed lifecycle state integrated",
      ]
    : [
        "governance consolidation rejected for trusted integration",
      ];

  const blockedReasons = trusted
    ? []
    : [
        "governance consolidation is not eligible for trusted integration",
      ];

  return {
    version: "1.0.0",

    source:
      "river-development-agent-execution-intelligence-governance-integration",

    objective: governanceConsolidation.objective,

    trusted,

    integrated: trusted,

    consolidation: governanceConsolidation,

    integrationState,

    integrationSignals,

    provenance: [
      ...governanceConsolidation.provenance,
      "governance-consolidation-foundation:v1.0.0",
      "governance integration provenance preserved",
    ],

    authorizationBoundaries: [
      ...governanceConsolidation.authorizationBoundaries,
      "repository authorization boundary preserved",
      "human authorization boundary maintained",
      "governance integration cannot independently authorize repository modification",
      "governance integration cannot independently authorize execution",
      "integration connects and incorporates consolidated governed lifecycle state without creating autonomous execution authority",
    ],

    scopeBoundaries: [
      ...governanceConsolidation.scopeBoundaries,
      "strict scope boundary maintained",
      "governance integration cannot expand execution scope",
    ],

    blockedReasons,
  };
}
