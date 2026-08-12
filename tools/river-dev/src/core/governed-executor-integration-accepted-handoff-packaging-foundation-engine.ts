import type {
  RiverDevGovernedExecutorIntegrationHandoffAcceptanceFoundation,
  RiverDevGovernedExecutorIntegrationAcceptedHandoffPackagingFoundationResult
} from "../types";

const VERSION = "DEV-297" as const;

const SOURCE =
  "governed-executor-integration-accepted-handoff-packaging-foundation-engine" as const;

const OBJECTIVE =
  "Package an accepted DEV-296 governed executor integration handoff acceptance result into inert data for a future downstream boundary without granting authorization, downstream action, executor invocation, operation execution, repository mutation, push, deployment, or external side-effect authority.";

export interface EvaluateGovernedExecutorIntegrationAcceptedHandoffPackagingFoundationInput {
  readonly acceptance:
    RiverDevGovernedExecutorIntegrationHandoffAcceptanceFoundation;
}

export function evaluateGovernedExecutorIntegrationAcceptedHandoffPackagingFoundation(
  input:
    EvaluateGovernedExecutorIntegrationAcceptedHandoffPackagingFoundationInput
):
RiverDevGovernedExecutorIntegrationAcceptedHandoffPackagingFoundationResult {
  const acceptance =
    input.acceptance;

  const blockedReasons: string[] =
    [];

  const packagingEvidence: string[] =
    [];

  if (acceptance.version !== "DEV-296") {
    blockedReasons.push(
      "DEV-296 acceptance version is required."
    );
  } else {
    packagingEvidence.push(
      "DEV-296 acceptance version is exact."
    );
  }

  if (
    acceptance.source !==
    "governed-executor-integration-handoff-acceptance-foundation"
  ) {
    blockedReasons.push(
      "DEV-296 acceptance source is invalid."
    );
  } else {
    packagingEvidence.push(
      "DEV-296 acceptance source is exact."
    );
  }

  if (acceptance.trusted !== true) {
    blockedReasons.push(
      "DEV-296 acceptance must be trusted."
    );
  } else {
    packagingEvidence.push(
      "DEV-296 acceptance is trusted."
    );
  }

  if (acceptance.ready !== true) {
    blockedReasons.push(
      "DEV-296 acceptance must be ready."
    );
  } else {
    packagingEvidence.push(
      "DEV-296 acceptance is ready."
    );
  }

  if (acceptance.accepted !== true) {
    blockedReasons.push(
      "DEV-296 handoff must be accepted."
    );
  } else {
    packagingEvidence.push(
      "DEV-296 handoff is accepted."
    );
  }

  if (acceptance.defaultPolicy !== "DENY") {
    blockedReasons.push(
      "DEV-296 acceptance must remain DENY-by-default."
    );
  } else {
    packagingEvidence.push(
      "DEV-296 default policy remains DENY."
    );
  }

  if (acceptance.acceptanceDecisionOnly !== true) {
    blockedReasons.push(
      "DEV-296 acceptance must remain decision-only."
    );
  } else {
    packagingEvidence.push(
      "DEV-296 acceptance remains decision-only."
    );
  }

  if (
    acceptance.acceptanceResultIsInertData !==
    true
  ) {
    blockedReasons.push(
      "DEV-296 acceptance result must remain inert data."
    );
  } else {
    packagingEvidence.push(
      "DEV-296 acceptance result remains inert data."
    );
  }

  if (
    acceptance.futureDownstreamBoundaryRequired !==
    true
  ) {
    blockedReasons.push(
      "DEV-296 acceptance must require a future downstream boundary."
    );
  } else {
    packagingEvidence.push(
      "DEV-296 future downstream boundary requirement is preserved."
    );
  }

  if (
    acceptance.acceptanceState !==
    "GOVERNED_EXECUTOR_INTEGRATION_HANDOFF_ACCEPTED"
  ) {
    blockedReasons.push(
      "DEV-296 acceptance state must be accepted."
    );
  } else {
    packagingEvidence.push(
      "DEV-296 acceptance state is accepted."
    );
  }

  if (acceptance.blockedReasons.length !== 0) {
    blockedReasons.push(
      "DEV-296 acceptance must contain no blocked reasons."
    );
  } else {
    packagingEvidence.push(
      "DEV-296 acceptance contains no blocked reasons."
    );
  }

  if (
    acceptance.predecessorVerificationState.length ===
    0
  ) {
    blockedReasons.push(
      "DEV-296 predecessor verification state is required."
    );
  } else {
    packagingEvidence.push(
      "DEV-296 predecessor verification state is present."
    );
  }

  if (
    acceptance.predecessorVerificationEvidence.length ===
    0
  ) {
    blockedReasons.push(
      "DEV-296 predecessor verification evidence is required."
    );
  } else {
    packagingEvidence.push(
      "DEV-296 predecessor verification evidence is present."
    );
  }

  if (
    acceptance.predecessorAcceptanceEvidence.length ===
    0
  ) {
    blockedReasons.push(
      "DEV-296 predecessor acceptance evidence is required."
    );
  } else {
    packagingEvidence.push(
      "DEV-296 predecessor acceptance evidence is present."
    );
  }

  if (
    acceptance.predecessorHandoffEvidence.length ===
    0
  ) {
    blockedReasons.push(
      "DEV-296 predecessor handoff evidence is required."
    );
  } else {
    packagingEvidence.push(
      "DEV-296 predecessor handoff evidence is present."
    );
  }

  if (acceptance.verificationEvidence.length === 0) {
    blockedReasons.push(
      "DEV-296 verification evidence is required."
    );
  } else {
    packagingEvidence.push(
      "DEV-296 verification evidence is present."
    );
  }

  if (acceptance.acceptanceEvidence.length === 0) {
    blockedReasons.push(
      "DEV-296 acceptance evidence is required."
    );
  } else {
    packagingEvidence.push(
      "DEV-296 acceptance evidence is present."
    );
  }

  if (
    acceptance.acceptanceMayCreateAuthorization !== false ||
    acceptance.acceptanceMayAuthorizeDownstreamAction !== false ||
    acceptance.acceptanceMayExpandScope !== false ||
    acceptance.acceptanceMayModifyRepository !== false ||
    acceptance.acceptanceMayInvokeExecutor !== false ||
    acceptance.acceptanceMayExecuteOperation !== false ||
    acceptance.acceptanceMayPush !== false ||
    acceptance.acceptanceMayDeploy !== false
  ) {
    blockedReasons.push(
      "DEV-296 acceptance grants prohibited authority."
    );
  } else {
    packagingEvidence.push(
      "DEV-296 prohibited authorities remain denied."
    );
  }

  const packaged =
    blockedReasons.length === 0;

  return {
    version: VERSION,
    source: SOURCE,
    objective: OBJECTIVE,

    trusted: packaged,
    ready: packaged,
    packaged,

    defaultPolicy: "DENY",
    handoffPackagingOnly: true,
    packageIsInertData: true,
    futureDownstreamBoundaryRequired: true,

    packagingState:
      packaged
        ? "GOVERNED_EXECUTOR_INTEGRATION_ACCEPTED_HANDOFF_PACKAGE_READY"
        : "GOVERNED_EXECUTOR_INTEGRATION_ACCEPTED_HANDOFF_PACKAGE_BLOCKED",

    acceptance,

    predecessorVerificationState:
      packaged
        ? [...acceptance.predecessorVerificationState]
        : [],

    predecessorVerificationEvidence:
      packaged
        ? [...acceptance.predecessorVerificationEvidence]
        : [],

    predecessorAcceptanceEvidence:
      packaged
        ? [...acceptance.predecessorAcceptanceEvidence]
        : [],

    predecessorHandoffEvidence:
      packaged
        ? [...acceptance.predecessorHandoffEvidence]
        : [],

    verificationEvidence:
      packaged
        ? [...acceptance.verificationEvidence]
        : [],

    acceptanceEvidence:
      packaged
        ? [...acceptance.acceptanceEvidence]
        : [],

    packagingEvidence:
      packaged
        ? packagingEvidence
        : [],

    blockedReasons,

    mayCreateExecutionAuthorization: false,
    mayAuthorizeDownstreamAction: false,
    mayDispatch: false,
    mayInvokeExecutor: false,
    mayExecuteOperation: false,
    mayInvokeInspectionDependency: false,
    mayRetryExecution: false,
    mayPersistLifecycleState: false,

    mayModifyRepository: false,
    mayDeleteRepositoryContent: false,
    mayStageRepositoryChanges: false,
    mayCommit: false,
    mayPush: false,
    mayDeploy: false,

    mayAccessSecrets: false,
    mayExpandScope: false,
    mayPerformArbitraryShellExecution: false,
    mayPerformExternalSideEffects: false
  };
}
