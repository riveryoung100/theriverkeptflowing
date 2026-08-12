import type {
  RiverDevGovernedExecutorIntegrationHandoffFoundation,
  RiverDevGovernedExecutorIntegrationHandoffVerificationFoundation,
  RiverDevGovernedExecutorIntegrationHandoffVerificationFoundationInput
} from "../types";

function buildBlockedResult(
  handoff: RiverDevGovernedExecutorIntegrationHandoffFoundation,
  blockedReasons: string[]
): RiverDevGovernedExecutorIntegrationHandoffVerificationFoundation {
  return {
    version: "DEV-295",
    source:
      "governed-executor-integration-handoff-verification-foundation",

    trusted: false,
    ready: false,
    verified: false,

    defaultPolicy: "DENY",
    verificationOnly: true,
    verificationResultIsInertData: true,
    futureDownstreamBoundaryRequired: true,

    verificationState:
      "GOVERNED_EXECUTOR_INTEGRATION_HANDOFF_NOT_VERIFIED",

    handoff,

    predecessorVerificationState: [],
    predecessorVerificationEvidence: [],
    predecessorAcceptanceEvidence: [],
    predecessorHandoffEvidence: [],

    verificationEvidence: [],
    blockedReasons,

    verificationMayCreateAuthorization: false,
    verificationMayAuthorizeDownstreamAction: false,
    verificationMayExpandScope: false,
    verificationMayModifyRepository: false,
    verificationMayInvokeExecutor: false,
    verificationMayExecuteOperation: false,
    verificationMayPush: false,
    verificationMayDeploy: false
  };
}

export function verifyGovernedExecutorIntegrationHandoffFoundation(
  input:
    RiverDevGovernedExecutorIntegrationHandoffVerificationFoundationInput
): RiverDevGovernedExecutorIntegrationHandoffVerificationFoundation {
  const handoff = input.handoff;

  const blockedReasons: string[] = [];

  if (handoff.version !== "DEV-294") {
    blockedReasons.push(
      "DEV-294 predecessor version is not exact."
    );
  }

  if (
    handoff.source !==
    "governed-executor-integration-handoff-foundation"
  ) {
    blockedReasons.push(
      "DEV-294 predecessor source is not exact."
    );
  }

  if (handoff.defaultPolicy !== "DENY") {
    blockedReasons.push(
      "DEV-294 predecessor default policy is not DENY."
    );
  }

  if (handoff.trusted !== true) {
    blockedReasons.push(
      "DEV-294 predecessor is not trusted."
    );
  }

  if (handoff.ready !== true) {
    blockedReasons.push(
      "DEV-294 predecessor is not ready."
    );
  }

  if (handoff.handoffReady !== true) {
    blockedReasons.push(
      "DEV-294 predecessor handoff is not ready."
    );
  }

  if (
    handoff.handoffState !==
    "GOVERNED_EXECUTOR_INTEGRATION_HANDOFF_READY"
  ) {
    blockedReasons.push(
      "DEV-294 predecessor handoff state is not READY."
    );
  }

  if (handoff.handoffOnly !== true) {
    blockedReasons.push(
      "DEV-294 predecessor is not handoff-only."
    );
  }

  if (handoff.handoffResultIsInertData !== true) {
    blockedReasons.push(
      "DEV-294 predecessor handoff is not inert data."
    );
  }

  if (handoff.futureDownstreamBoundaryRequired !== true) {
    blockedReasons.push(
      "DEV-294 predecessor does not require a downstream boundary."
    );
  }

  if (handoff.blockedReasons.length !== 0) {
    blockedReasons.push(
      "DEV-294 predecessor contains blocked reasons."
    );
  }

  if (
    handoff.handoffMayCreateAuthorization !== false ||
    handoff.handoffMayAuthorizeDownstreamAction !== false ||
    handoff.handoffMayExpandScope !== false ||
    handoff.handoffMayModifyRepository !== false ||
    handoff.handoffMayInvokeExecutor !== false ||
    handoff.handoffMayExecuteOperation !== false ||
    handoff.handoffMayPush !== false ||
    handoff.handoffMayDeploy !== false
  ) {
    blockedReasons.push(
      "DEV-294 predecessor grants prohibited downstream authority."
    );
  }

  if (blockedReasons.length > 0) {
    return buildBlockedResult(
      handoff,
      blockedReasons
    );
  }

  return {
    version: "DEV-295",
    source:
      "governed-executor-integration-handoff-verification-foundation",

    trusted: true,
    ready: true,
    verified: true,

    defaultPolicy: "DENY",
    verificationOnly: true,
    verificationResultIsInertData: true,
    futureDownstreamBoundaryRequired: true,

    verificationState:
      "GOVERNED_EXECUTOR_INTEGRATION_HANDOFF_VERIFIED",

    handoff,

    predecessorVerificationState:
      [...handoff.verificationState],

    predecessorVerificationEvidence:
      [...handoff.verificationEvidence],

    predecessorAcceptanceEvidence:
      [...handoff.acceptanceEvidence],

    predecessorHandoffEvidence:
      [...handoff.handoffEvidence],

    verificationEvidence: [
      "Exact DEV-294 governed executor integration handoff verified.",
      "DEV-294 handoff readiness verified.",
      "DENY-by-default policy preserved.",
      "Inert-data boundary preserved.",
      "No downstream authority inherited or created."
    ],

    blockedReasons: [],

    verificationMayCreateAuthorization: false,
    verificationMayAuthorizeDownstreamAction: false,
    verificationMayExpandScope: false,
    verificationMayModifyRepository: false,
    verificationMayInvokeExecutor: false,
    verificationMayExecuteOperation: false,
    verificationMayPush: false,
    verificationMayDeploy: false
  };
}
