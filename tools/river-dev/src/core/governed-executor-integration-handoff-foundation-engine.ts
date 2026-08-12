import type {
  RiverDevGovernedExecutorIntegrationHandoffFoundation,
  RiverDevGovernedExecutorIntegrationHandoffFoundationInput
} from "../types";

const VERSION = "DEV-294" as const;

const SOURCE =
  "governed-executor-integration-handoff-foundation" as const;

export function buildGovernedExecutorIntegrationHandoffFoundation(
  input: RiverDevGovernedExecutorIntegrationHandoffFoundationInput
): RiverDevGovernedExecutorIntegrationHandoffFoundation {
  const acceptance =
    input.acceptance;

  const blockedReasons: string[] = [];
  const handoffEvidence: string[] = [];

  if (acceptance.version !== "DEV-293") {
    blockedReasons.push(
      "Acceptance predecessor must be DEV-293."
    );
  } else {
    handoffEvidence.push(
      "Acceptance predecessor identity is DEV-293."
    );
  }

  if (
    acceptance.source !==
    "governed-executor-integration-acceptance-foundation"
  ) {
    blockedReasons.push(
      "Acceptance predecessor source is invalid."
    );
  } else {
    handoffEvidence.push(
      "Acceptance predecessor source is valid."
    );
  }

  if (acceptance.defaultPolicy !== "DENY") {
    blockedReasons.push(
      "DEV-293 acceptance must preserve default DENY."
    );
  } else {
    handoffEvidence.push(
      "DEV-293 acceptance preserves default DENY."
    );
  }

  if (!acceptance.acceptanceDecisionOnly) {
    blockedReasons.push(
      "DEV-293 acceptance must remain decision-only."
    );
  } else {
    handoffEvidence.push(
      "DEV-293 acceptance remains decision-only."
    );
  }

  if (!acceptance.acceptanceResultIsInertData) {
    blockedReasons.push(
      "DEV-293 acceptance result must remain inert data."
    );
  } else {
    handoffEvidence.push(
      "DEV-293 acceptance result remains inert data."
    );
  }

  if (!acceptance.trusted) {
    blockedReasons.push(
      "DEV-293 acceptance must be trusted."
    );
  } else {
    handoffEvidence.push(
      "DEV-293 acceptance is trusted."
    );
  }

  if (!acceptance.ready) {
    blockedReasons.push(
      "DEV-293 acceptance must be ready."
    );
  } else {
    handoffEvidence.push(
      "DEV-293 acceptance is ready."
    );
  }

  if (!acceptance.accepted) {
    blockedReasons.push(
      "DEV-293 acceptance must be accepted."
    );
  } else {
    handoffEvidence.push(
      "DEV-293 acceptance is accepted."
    );
  }

  if (
    acceptance.acceptanceState !==
    "GOVERNED_EXECUTOR_INTEGRATION_ACCEPTED"
  ) {
    blockedReasons.push(
      "DEV-293 acceptance state must be GOVERNED_EXECUTOR_INTEGRATION_ACCEPTED."
    );
  } else {
    handoffEvidence.push(
      "DEV-293 acceptance state is accepted."
    );
  }

  if (acceptance.blockedReasons.length > 0) {
    blockedReasons.push(
      "DEV-293 acceptance must contain no blocked reasons."
    );
  } else {
    handoffEvidence.push(
      "DEV-293 acceptance contains no blocked reasons."
    );
  }

  if (
    acceptance.acceptanceMayCreateAuthorization ||
    acceptance.acceptanceMayExpandScope ||
    acceptance.acceptanceMayModifyRepository ||
    acceptance.acceptanceMayExecuteOperation ||
    acceptance.acceptanceMayPush ||
    acceptance.acceptanceMayDeploy
  ) {
    blockedReasons.push(
      "DEV-293 acceptance grants prohibited authority."
    );
  } else {
    handoffEvidence.push(
      "DEV-293 prohibited authorities remain denied."
    );
  }

  const handoffReady =
    blockedReasons.length === 0;

  return {
    version: VERSION,
    source: SOURCE,

    trusted: handoffReady,
    ready: handoffReady,
    handoffReady,

    defaultPolicy: "DENY",
    handoffOnly: true,
    handoffResultIsInertData: true,
    futureDownstreamBoundaryRequired: true,

    handoffState:
      handoffReady
        ? "GOVERNED_EXECUTOR_INTEGRATION_HANDOFF_READY"
        : "GOVERNED_EXECUTOR_INTEGRATION_HANDOFF_BLOCKED",

    acceptance,

    verificationState:
      handoffReady
        ? [...acceptance.verificationState]
        : [],

    verificationEvidence:
      handoffReady
        ? [...acceptance.verificationEvidence]
        : [],

    acceptanceEvidence:
      handoffReady
        ? [...acceptance.acceptanceEvidence]
        : [],

    handoffEvidence:
      handoffReady
        ? handoffEvidence
        : [],

    blockedReasons,

    handoffMayCreateAuthorization: false,
    handoffMayAuthorizeDownstreamAction: false,
    handoffMayExpandScope: false,
    handoffMayModifyRepository: false,
    handoffMayInvokeExecutor: false,
    handoffMayExecuteOperation: false,
    handoffMayPush: false,
    handoffMayDeploy: false
  };
}
