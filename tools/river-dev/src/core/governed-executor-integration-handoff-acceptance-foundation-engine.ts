import type {
  RiverDevGovernedExecutorIntegrationHandoffAcceptanceFoundation,
  RiverDevGovernedExecutorIntegrationHandoffAcceptanceFoundationInput
} from "../types";

const VERSION = "DEV-296" as const;

const SOURCE =
  "governed-executor-integration-handoff-acceptance-foundation" as const;

export function buildGovernedExecutorIntegrationHandoffAcceptanceFoundation(
  input: RiverDevGovernedExecutorIntegrationHandoffAcceptanceFoundationInput
): RiverDevGovernedExecutorIntegrationHandoffAcceptanceFoundation {
  const verification =
    input.verification;

  const blockedReasons: string[] = [];
  const acceptanceEvidence: string[] = [];

  if (verification.version !== "DEV-295") {
    blockedReasons.push(
      "Verification predecessor must be DEV-295."
    );
  } else {
    acceptanceEvidence.push(
      "Verification predecessor identity is DEV-295."
    );
  }

  if (
    verification.source !==
    "governed-executor-integration-handoff-verification-foundation"
  ) {
    blockedReasons.push(
      "DEV-295 verification predecessor source is invalid."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-295 verification predecessor source is valid."
    );
  }

  if (verification.defaultPolicy !== "DENY") {
    blockedReasons.push(
      "DEV-295 verification must preserve default DENY."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-295 verification preserves default DENY."
    );
  }

  if (verification.verificationOnly !== true) {
    blockedReasons.push(
      "DEV-295 predecessor must remain verification-only."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-295 predecessor remains verification-only."
    );
  }

  if (verification.verificationResultIsInertData !== true) {
    blockedReasons.push(
      "DEV-295 verification result must remain inert data."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-295 verification result remains inert data."
    );
  }

  if (verification.futureDownstreamBoundaryRequired !== true) {
    blockedReasons.push(
      "DEV-295 verification must require a future downstream boundary."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-295 verification requires a future downstream boundary."
    );
  }

  if (verification.trusted !== true) {
    blockedReasons.push(
      "DEV-295 verification must be trusted."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-295 verification is trusted."
    );
  }

  if (verification.ready !== true) {
    blockedReasons.push(
      "DEV-295 verification must be ready."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-295 verification is ready."
    );
  }

  if (verification.verified !== true) {
    blockedReasons.push(
      "DEV-295 verification must be verified."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-295 verification is verified."
    );
  }

  if (
    verification.verificationState !==
    "GOVERNED_EXECUTOR_INTEGRATION_HANDOFF_VERIFIED"
  ) {
    blockedReasons.push(
      "DEV-295 verification state must be VERIFIED."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-295 verification state is VERIFIED."
    );
  }

  if (verification.blockedReasons.length !== 0) {
    blockedReasons.push(
      "DEV-295 verification must contain no blocked reasons."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-295 verification contains no blocked reasons."
    );
  }

  if (verification.verificationEvidence.length === 0) {
    blockedReasons.push(
      "DEV-295 verification evidence is required."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-295 verification evidence is present."
    );
  }

  if (
    verification.verificationMayCreateAuthorization !== false ||
    verification.verificationMayAuthorizeDownstreamAction !== false ||
    verification.verificationMayExpandScope !== false ||
    verification.verificationMayModifyRepository !== false ||
    verification.verificationMayInvokeExecutor !== false ||
    verification.verificationMayExecuteOperation !== false ||
    verification.verificationMayPush !== false ||
    verification.verificationMayDeploy !== false
  ) {
    blockedReasons.push(
      "DEV-295 verification grants prohibited authority."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-295 prohibited authorities remain denied."
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
    futureDownstreamBoundaryRequired: true,

    acceptanceState:
      accepted
        ? "GOVERNED_EXECUTOR_INTEGRATION_HANDOFF_ACCEPTED"
        : "GOVERNED_EXECUTOR_INTEGRATION_HANDOFF_REJECTED",

    verification,

    predecessorVerificationState:
      accepted
        ? [...verification.predecessorVerificationState]
        : [],

    predecessorVerificationEvidence:
      accepted
        ? [...verification.predecessorVerificationEvidence]
        : [],

    predecessorAcceptanceEvidence:
      accepted
        ? [...verification.predecessorAcceptanceEvidence]
        : [],

    predecessorHandoffEvidence:
      accepted
        ? [...verification.predecessorHandoffEvidence]
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
    acceptanceMayAuthorizeDownstreamAction: false,
    acceptanceMayExpandScope: false,
    acceptanceMayModifyRepository: false,
    acceptanceMayInvokeExecutor: false,
    acceptanceMayExecuteOperation: false,
    acceptanceMayPush: false,
    acceptanceMayDeploy: false
  };
}
