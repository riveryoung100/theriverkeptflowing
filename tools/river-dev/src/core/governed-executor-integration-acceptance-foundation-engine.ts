import type {
  RiverDevGovernedExecutorIntegrationAcceptanceFoundation,
  RiverDevGovernedExecutorIntegrationAcceptanceFoundationInput
} from "../types";

const VERSION = "DEV-293" as const;

const SOURCE =
  "governed-executor-integration-acceptance-foundation" as const;

export function buildGovernedExecutorIntegrationAcceptanceFoundation(
  input: RiverDevGovernedExecutorIntegrationAcceptanceFoundationInput
): RiverDevGovernedExecutorIntegrationAcceptanceFoundation {
  const verification =
    input.verification;

  const blockedReasons: string[] = [];
  const acceptanceEvidence: string[] = [];

  if (verification.version !== "DEV-292") {
    blockedReasons.push(
      "Verification predecessor must be DEV-292."
    );
  } else {
    acceptanceEvidence.push(
      "Verification predecessor identity is DEV-292."
    );
  }

  if (
    verification.source !==
    "governed-executor-integration-verification-foundation"
  ) {
    blockedReasons.push(
      "Verification predecessor source is invalid."
    );
  } else {
    acceptanceEvidence.push(
      "Verification predecessor source is valid."
    );
  }

  if (verification.defaultPolicy !== "DENY") {
    blockedReasons.push(
      "DEV-292 verification must preserve default DENY."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-292 verification preserves default DENY."
    );
  }

  if (!verification.verificationDecisionOnly) {
    blockedReasons.push(
      "DEV-292 verification must remain decision-only."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-292 verification remains decision-only."
    );
  }

  if (!verification.trusted) {
    blockedReasons.push(
      "DEV-292 verification must be trusted."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-292 verification is trusted."
    );
  }

  if (!verification.ready) {
    blockedReasons.push(
      "DEV-292 verification must be ready."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-292 verification is ready."
    );
  }

  if (!verification.verified) {
    blockedReasons.push(
      "DEV-292 verification must be verified."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-292 verification is verified."
    );
  }

  if (verification.blockedReasons.length > 0) {
    blockedReasons.push(
      "DEV-292 verification must contain no blocked reasons."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-292 verification contains no blocked reasons."
    );
  }

  if (
    verification.verificationMayCreateAuthorization ||
    verification.verificationMayExpandScope ||
    verification.verificationMayModifyRepository ||
    verification.verificationMayExecuteOperation ||
    verification.verificationMayPush ||
    verification.verificationMayDeploy
  ) {
    blockedReasons.push(
      "DEV-292 verification grants prohibited authority."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-292 prohibited authorities remain denied."
    );
  }

  const accepted =
    blockedReasons.length === 0;

  return {
    version: VERSION,
    source: SOURCE,

    trusted: accepted,
    ready: accepted,
    accepted,

    defaultPolicy: "DENY",
    acceptanceDecisionOnly: true,
    acceptanceResultIsInertData: true,

    acceptanceState:
      accepted
        ? "GOVERNED_EXECUTOR_INTEGRATION_ACCEPTED"
        : "GOVERNED_EXECUTOR_INTEGRATION_REJECTED",

    verification,

    verificationState:
      accepted
        ? [...verification.verificationState]
        : [],

    verificationEvidence:
      accepted
        ? [...verification.verificationEvidence]
        : [],

    acceptanceEvidence:
      accepted
        ? acceptanceEvidence
        : [],

    blockedReasons,

    acceptanceMayCreateAuthorization: false,
    acceptanceMayExpandScope: false,
    acceptanceMayModifyRepository: false,
    acceptanceMayExecuteOperation: false,
    acceptanceMayPush: false,
    acceptanceMayDeploy: false
  };
}
