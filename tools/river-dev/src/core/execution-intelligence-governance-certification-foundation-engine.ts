import type {
  RiverDevExecutionIntelligenceGovernanceCertificationFoundation,
  RiverDevExecutionIntelligenceGovernanceCertificationFoundationInput,
} from "../types";

function stableUnique(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function deriveGovernanceVerificationId(
  input: RiverDevExecutionIntelligenceGovernanceCertificationFoundationInput,
): string {
  const governanceVerification =
    input.governanceVerification as unknown as Record<string, unknown>;

  const candidateKeys = [
    "verificationId",
    "governanceVerificationId",
    "id",
    "foundationId",
  ];

  for (const key of candidateKeys) {
    const value = governanceVerification[key];

    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return "governance-verification-foundation";
}

export function createExecutionIntelligenceGovernanceCertificationFoundation(
  input: RiverDevExecutionIntelligenceGovernanceCertificationFoundationInput,
): RiverDevExecutionIntelligenceGovernanceCertificationFoundation {
  const { governanceVerification } = input;

  const predecessorTrusted =
    governanceVerification.trusted === true &&
    governanceVerification.verified === true &&
    governanceVerification.blockedReasons.length === 0;

  const blockedReasons = stableUnique([
    ...governanceVerification.blockedReasons,
    ...(
      predecessorTrusted
        ? []
        : ["governance verification is not trusted and verified for certification"]
    ),
  ]);

  const trusted =
    governanceVerification.trusted === true &&
    governanceVerification.verified === true &&
    governanceVerification.blockedReasons.length === 0 &&
    blockedReasons.length === 0;

  const governanceVerificationId = deriveGovernanceVerificationId(input);

  const certificationSignals = stableUnique([
    "governance verification provenance certified",
    "governance verification trust certified",
    "governance verification status certified",
    "human authorization boundary maintained",
    "repository authorization boundary preserved",
    "strict scope boundary maintained",
  ]);

  const authorizationBoundaries = stableUnique([
    "governance certification cannot independently authorize repository modification",
    "human authorization boundary maintained",
    "repository authorization boundary preserved",
  ]);

  const scopeBoundaries = stableUnique([
    "governance certification cannot expand execution scope",
    "strict scope boundary maintained",
  ]);

  const provenance = stableUnique([
    ...governanceVerification.provenance,
    `governance-verification:${governanceVerificationId}`,
    "governance-certification-foundation:v1.0.0",
  ]);

  const certificationId = [
    "governance-certification",
    governanceVerificationId,
    trusted ? "trusted" : "blocked",
  ].join(":");

  return {
    version: "1.0.0",
    governanceVerificationId,
    certificationId,
    trusted,
    certified: trusted,
    certificationSignals,
    blockedReasons,
    provenance,
    authorizationBoundaries,
    scopeBoundaries,
  };
}
