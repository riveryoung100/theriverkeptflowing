import type {
  RiverDevExecutionIntelligenceGovernancePreservationFoundation,
  RiverDevExecutionIntelligenceGovernancePreservationFoundationInput,
} from "../types";

function stableUnique(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export function createExecutionIntelligenceGovernancePreservationFoundation(
  input: RiverDevExecutionIntelligenceGovernancePreservationFoundationInput,
): RiverDevExecutionIntelligenceGovernancePreservationFoundation {
  const { governancePersistence } = input;

  const predecessorEligible =
    governancePersistence.trusted === true &&
    governancePersistence.persisted === true &&
    governancePersistence.blockedReasons.length === 0;

  const blockedReasons = stableUnique([
    ...governancePersistence.blockedReasons,
    ...(
      predecessorEligible
        ? []
        : [
            "governance persistence is not trusted and persisted for preservation",
          ]
    ),
  ]);

  const trusted =
    governancePersistence.trusted === true &&
    governancePersistence.persisted === true &&
    governancePersistence.blockedReasons.length === 0 &&
    blockedReasons.length === 0;

  const governancePersistenceId =
    governancePersistence.persistenceId;

  const preservationSignals = stableUnique([
    "governance persistence provenance accepted for preservation",
    "governance persistence trust accepted for preservation",
    "governance persistence state accepted for preservation",
    "durable governed lifecycle meaning preserved",
    "human authorization boundary maintained",
    "repository authorization boundary preserved",
    "strict scope boundary maintained",
  ]);

  const authorizationBoundaries = stableUnique([
    ...governancePersistence.authorizationBoundaries,
    "governance preservation cannot independently authorize repository modification",
    "governance preservation cannot independently authorize execution",
    "preservation protects durable governed lifecycle state without creating autonomous execution authority",
    "human authorization boundary maintained",
    "repository authorization boundary preserved",
  ]);

  const scopeBoundaries = stableUnique([
    ...governancePersistence.scopeBoundaries,
    "governance preservation cannot expand execution scope",
    "strict scope boundary maintained",
  ]);

  const provenance = stableUnique([
    ...governancePersistence.provenance,
    `governance-persistence:${governancePersistenceId}`,
    "governance-preservation-foundation:v1.0.0",
  ]);

  const preservationId = [
    "governance-preservation",
    governancePersistenceId,
    trusted ? "trusted" : "blocked",
  ].join(":");

  return {
    version: "1.0.0",
    governancePersistenceId,
    preservationId,
    trusted,
    preserved: trusted,
    preservationSignals,
    blockedReasons,
    provenance,
    authorizationBoundaries,
    scopeBoundaries,
  };
}
