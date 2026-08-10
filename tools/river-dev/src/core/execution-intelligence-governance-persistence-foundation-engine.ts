import type {
  RiverDevExecutionIntelligenceGovernancePersistenceFoundation,
  RiverDevExecutionIntelligenceGovernancePersistenceFoundationInput,
} from "../types";

function stableUnique(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export function createExecutionIntelligenceGovernancePersistenceFoundation(
  input: RiverDevExecutionIntelligenceGovernancePersistenceFoundationInput,
): RiverDevExecutionIntelligenceGovernancePersistenceFoundation {
  const { governanceContinuation } = input;

  const predecessorEligible =
    governanceContinuation.trusted === true &&
    governanceContinuation.continuing === true &&
    governanceContinuation.blockedReasons.length === 0;

  const blockedReasons = stableUnique([
    ...governanceContinuation.blockedReasons,
    ...(
      predecessorEligible
        ? []
        : [
            "governance continuation is not trusted and continuing for persistence",
          ]
    ),
  ]);

  const trusted =
    governanceContinuation.trusted === true &&
    governanceContinuation.continuing === true &&
    governanceContinuation.blockedReasons.length === 0 &&
    blockedReasons.length === 0;

  const governanceContinuationId =
    governanceContinuation.continuationId;

  const persistenceSignals = stableUnique([
    "governance continuation provenance accepted for persistence",
    "governance continuation trust accepted for persistence",
    "governance continuation state accepted for persistence",
    "durable governed lifecycle state recorded",
    "human authorization boundary maintained",
    "repository authorization boundary preserved",
    "strict scope boundary maintained",
  ]);

  const authorizationBoundaries = stableUnique([
    ...governanceContinuation.authorizationBoundaries,
    "governance persistence cannot independently authorize repository modification",
    "governance persistence cannot independently authorize execution",
    "persistence represents durable governed lifecycle state, not autonomous execution authority",
    "human authorization boundary maintained",
    "repository authorization boundary preserved",
  ]);

  const scopeBoundaries = stableUnique([
    ...governanceContinuation.scopeBoundaries,
    "governance persistence cannot expand execution scope",
    "strict scope boundary maintained",
  ]);

  const provenance = stableUnique([
    ...governanceContinuation.provenance,
    `governance-continuation:${governanceContinuationId}`,
    "governance-persistence-foundation:v1.0.0",
  ]);

  const persistenceId = [
    "governance-persistence",
    governanceContinuationId,
    trusted ? "trusted" : "blocked",
  ].join(":");

  return {
    version: "1.0.0",
    governanceContinuationId,
    persistenceId,
    trusted,
    persisted: trusted,
    persistenceSignals,
    blockedReasons,
    provenance,
    authorizationBoundaries,
    scopeBoundaries,
  };
}
