import type {
  RiverDevExecutionIntelligenceGovernanceCompletionFoundation,
  RiverDevExecutionIntelligenceGovernanceCompletionFoundationInput,
} from "../types";

function stableUnique(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function deriveGovernanceCertificationId(
  input: RiverDevExecutionIntelligenceGovernanceCompletionFoundationInput,
): string {
  const governanceCertification =
    input.governanceCertification as unknown as Record<string, unknown>;

  const candidateKeys = [
    "certificationId",
    "governanceCertificationId",
    "id",
    "foundationId",
  ];

  for (const key of candidateKeys) {
    const value = governanceCertification[key];

    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return "governance-certification-foundation";
}

export function createExecutionIntelligenceGovernanceCompletionFoundation(
  input: RiverDevExecutionIntelligenceGovernanceCompletionFoundationInput,
): RiverDevExecutionIntelligenceGovernanceCompletionFoundation {
  const { governanceCertification } = input;

  const predecessorTrusted =
    governanceCertification.trusted === true &&
    governanceCertification.certified === true &&
    governanceCertification.blockedReasons.length === 0;

  const blockedReasons = stableUnique([
    ...governanceCertification.blockedReasons,
    ...(
      predecessorTrusted
        ? []
        : ["governance certification is not trusted and certified for completion"]
    ),
  ]);

  const trusted =
    governanceCertification.trusted === true &&
    governanceCertification.certified === true &&
    governanceCertification.blockedReasons.length === 0 &&
    blockedReasons.length === 0;

  const governanceCertificationId =
    deriveGovernanceCertificationId(input);

  const completionSignals = stableUnique([
    "governance certification provenance completed",
    "governance certification trust completed",
    "governance certification status completed",
    "governance lifecycle closure recorded",
    "human authorization boundary maintained",
    "repository authorization boundary preserved",
    "strict scope boundary maintained",
  ]);

  const authorizationBoundaries = stableUnique([
    ...governanceCertification.authorizationBoundaries,
    "governance completion cannot independently authorize repository modification",
    "governance completion represents lifecycle closure without granting new execution authority",
    "human authorization boundary maintained",
    "repository authorization boundary preserved",
  ]);

  const scopeBoundaries = stableUnique([
    ...governanceCertification.scopeBoundaries,
    "governance completion cannot expand execution scope",
    "strict scope boundary maintained",
  ]);

  const provenance = stableUnique([
    ...governanceCertification.provenance,
    `governance-certification:${governanceCertificationId}`,
    "governance-completion-foundation:v1.0.0",
  ]);

  const completionId = [
    "governance-completion",
    governanceCertificationId,
    trusted ? "trusted" : "blocked",
  ].join(":");

  return {
    version: "1.0.0",
    governanceCertificationId,
    completionId,
    trusted,
    completed: trusted,
    completionSignals,
    blockedReasons,
    provenance,
    authorizationBoundaries,
    scopeBoundaries,
  };
}
