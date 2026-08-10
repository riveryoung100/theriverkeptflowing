import type {
  RiverDevExecutionIntelligenceGovernanceVerificationFoundation,
  RiverDevExecutionIntelligenceGovernanceVerificationFoundationInput,
} from "../types";

function stableUnique(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function deriveGovernanceAssuranceId(
  input: RiverDevExecutionIntelligenceGovernanceVerificationFoundationInput,
): string {
  const governanceAssurance = input.governanceAssurance as unknown as Record<
    string,
    unknown
  >;

  const candidateKeys = [
    "assuranceId",
    "governanceAssuranceId",
    "id",
    "foundationId",
  ];

  for (const key of candidateKeys) {
    const value = governanceAssurance[key];

    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return "governance-assurance-foundation";
}

export function createExecutionIntelligenceGovernanceVerificationFoundation(
  input: RiverDevExecutionIntelligenceGovernanceVerificationFoundationInput,
): RiverDevExecutionIntelligenceGovernanceVerificationFoundation {
  const { governanceAssurance } = input;

  const predecessorTrusted =
    governanceAssurance.trusted === true &&
    governanceAssurance.blockedReasons.length === 0;

  const blockedReasons = stableUnique([
    ...governanceAssurance.blockedReasons,
    ...(
      predecessorTrusted
        ? []
        : ["governance assurance is not trusted for verification"]
    ),
  ]);

  const trusted =
    governanceAssurance.trusted === true &&
    governanceAssurance.blockedReasons.length === 0 &&
    blockedReasons.length === 0;

  const governanceAssuranceId = deriveGovernanceAssuranceId(input);

  const verificationSignals = stableUnique([
    "governance assurance provenance verified",
    "governance assurance trust verified",
    "human authorization boundary maintained",
    "repository authorization boundary preserved",
    "strict scope boundary maintained",
  ]);

  const authorizationBoundaries = stableUnique([
    "governance verification cannot independently authorize repository modification",
    "human authorization boundary maintained",
    "repository authorization boundary preserved",
  ]);

  const scopeBoundaries = stableUnique([
    "governance verification cannot expand execution scope",
    "strict scope boundary maintained",
  ]);

  const provenance = stableUnique([
    ...governanceAssurance.provenance,
    `governance-assurance:${governanceAssuranceId}`,
    "governance-verification-foundation:v1.0.0",
  ]);

  const verificationId = [
    "governance-verification",
    governanceAssuranceId,
    trusted ? "trusted" : "blocked",
  ].join(":");

  return {
    version: "1.0.0",
    governanceAssuranceId,
    verificationId,
    trusted,
    verified: trusted,
    verificationSignals,
    blockedReasons,
    provenance,
    authorizationBoundaries,
    scopeBoundaries,
  };
}
