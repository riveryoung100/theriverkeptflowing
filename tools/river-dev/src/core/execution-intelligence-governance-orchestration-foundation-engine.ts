import type {
  RiverDevExecutionIntelligenceGovernanceOrchestrationFoundation,
  RiverDevExecutionIntelligenceGovernanceOrchestrationFoundationInput,
} from "../types";

export function createExecutionIntelligenceGovernanceOrchestrationFoundation(
  input: RiverDevExecutionIntelligenceGovernanceOrchestrationFoundationInput,
): RiverDevExecutionIntelligenceGovernanceOrchestrationFoundation {
  const {
    governanceCoordination,
  } = input;

  const trusted =
    governanceCoordination.trusted === true &&
    governanceCoordination.coordinated === true &&
    governanceCoordination.blockedReasons.length === 0;

  const blockedReasons =
    trusted
      ? []
      : [
          "governance coordination is not eligible for trusted orchestration",
        ];

  return {
    version: "1.0.0",

    source:
      "river-development-agent-execution-intelligence-governance-orchestration",

    objective:
      governanceCoordination.objective,

    trusted,

    orchestrated:
      trusted,

    coordination:
      governanceCoordination,

    orchestrationState:
      trusted
        ? [
            "governance coordination record accepted",
            "governed lifecycle activity orchestrated",
            "controlled governance orchestration boundary preserved",
          ]
        : [
            "governance orchestration restricted",
            "governance coordination review required",
          ],

    orchestrationSignals:
      trusted
        ? [
            "governance coordination provenance accepted for orchestration",
            "governance coordination trust accepted for orchestration",
            "governance coordination state accepted for orchestration",
            "coordinated governed lifecycle activity orchestrated",
          ]
        : [
            "governance coordination rejected for trusted orchestration",
          ],

    provenance: [
      ...governanceCoordination.provenance,
      "governance-coordination-foundation:v1.0.0",
      "governance orchestration provenance preserved",
    ],

    authorizationBoundaries: [
      ...governanceCoordination.authorizationBoundaries,
      "repository authorization boundary preserved",
      "human authorization boundary maintained",
      "governance orchestration cannot independently authorize repository modification",
      "governance orchestration cannot independently authorize execution",
      "orchestration organizes coordinated governed lifecycle state without creating autonomous execution authority",
    ],

    scopeBoundaries: [
      ...governanceCoordination.scopeBoundaries,
      "strict scope boundary maintained",
      "governance orchestration cannot expand execution scope",
    ],

    blockedReasons,
  };
}
