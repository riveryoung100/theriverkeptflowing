import type {
  RiverDevExecutionIntelligenceGovernanceContinuationFoundation,
  RiverDevExecutionIntelligenceGovernanceContinuationFoundationInput,
} from "../types";

function stableUnique(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function deriveGovernanceCompletionId(
  input: RiverDevExecutionIntelligenceGovernanceContinuationFoundationInput,
): string {
  const governanceCompletion =
    input.governanceCompletion as unknown as Record<string, unknown>;

  const candidateKeys = [
    "completionId",
    "governanceCompletionId",
    "id",
    "foundationId",
  ];

  for (const key of candidateKeys) {
    const value = governanceCompletion[key];

    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return "governance-completion-foundation";
}

export function createExecutionIntelligenceGovernanceContinuationFoundation(
  input: RiverDevExecutionIntelligenceGovernanceContinuationFoundationInput,
): RiverDevExecutionIntelligenceGovernanceContinuationFoundation {
  const { governanceCompletion } = input;

  const predecessorEligible =
    governanceCompletion.trusted === true &&
    governanceCompletion.completed === true &&
    governanceCompletion.blockedReasons.length === 0;

  const blockedReasons = stableUnique([
    ...governanceCompletion.blockedReasons,
    ...(
      predecessorEligible
        ? []
        : [
            "governance completion is not trusted and completed for continuation",
          ]
    ),
  ]);

  const trusted =
    governanceCompletion.trusted === true &&
    governanceCompletion.completed === true &&
    governanceCompletion.blockedReasons.length === 0 &&
    blockedReasons.length === 0;

  const governanceCompletionId =
    deriveGovernanceCompletionId(input);

  const continuationSignals = stableUnique([
    "governance completion provenance accepted for continuation",
    "governance completion trust accepted for continuation",
    "governance completion state accepted for continuation",
    "governed continuation eligibility recorded",
    "human authorization boundary maintained",
    "repository authorization boundary preserved",
    "strict scope boundary maintained",
  ]);

  const authorizationBoundaries = stableUnique([
    ...governanceCompletion.authorizationBoundaries,
    "governance continuation cannot independently authorize repository modification",
    "governance continuation cannot independently authorize execution",
    "governance continuation represents eligibility for a subsequent controlled lifecycle step, not execution authority",
    "human authorization boundary maintained",
    "repository authorization boundary preserved",
  ]);

  const scopeBoundaries = stableUnique([
    ...governanceCompletion.scopeBoundaries,
    "governance continuation cannot expand execution scope",
    "strict scope boundary maintained",
  ]);

  const provenance = stableUnique([
    ...governanceCompletion.provenance,
    `governance-completion:${governanceCompletionId}`,
    "governance-continuation-foundation:v1.0.0",
  ]);

  const continuationId = [
    "governance-continuation",
    governanceCompletionId,
    trusted ? "trusted" : "blocked",
  ].join(":");

  return {
    version: "1.0.0",
    governanceCompletionId,
    continuationId,
    trusted,
    continuing: trusted,
    continuationSignals,
    blockedReasons,
    provenance,
    authorizationBoundaries,
    scopeBoundaries,
  };
}
