import type {
  RiverDevControlledExecutorVerifiedDownstreamHandoffAcceptanceFoundationResult,
  RiverDevControlledExecutorAcceptedDownstreamHandoffPackagingFoundationResult
} from "../types";

const VERSION = "DEV-263" as const;

const SOURCE =
  "controlled-executor-accepted-downstream-handoff-packaging-foundation-engine" as const;

const OBJECTIVE =
  "Package an accepted DEV-262 downstream handoff result into inert data for a future downstream boundary without granting downstream action or execution authority.";

const RECOGNIZED_RECEIPT_STATES = new Set([
  "EXECUTION_SUCCEEDED",
  "EXECUTION_FAILED",
  "EXECUTION_NOT_ATTEMPTED"
]);

export interface EvaluateControlledExecutorAcceptedDownstreamHandoffPackagingFoundationInput {
  readonly acceptance:
    RiverDevControlledExecutorVerifiedDownstreamHandoffAcceptanceFoundationResult;
}

export function evaluateControlledExecutorAcceptedDownstreamHandoffPackagingFoundation(
  input:
    EvaluateControlledExecutorAcceptedDownstreamHandoffPackagingFoundationInput
):
RiverDevControlledExecutorAcceptedDownstreamHandoffPackagingFoundationResult {
  const acceptance =
    input.acceptance;

  const blockedReasons: string[] =
    [];

  const packagingEvidence: string[] =
    [];

  if (acceptance.version !== "DEV-262") {
    blockedReasons.push(
      "DEV-262 acceptance version is required."
    );
  } else {
    packagingEvidence.push(
      "DEV-262 acceptance version is exact."
    );
  }

  if (!acceptance.trusted) {
    blockedReasons.push(
      "DEV-262 acceptance must be trusted."
    );
  } else {
    packagingEvidence.push(
      "DEV-262 acceptance is trusted."
    );
  }

  if (!acceptance.ready) {
    blockedReasons.push(
      "DEV-262 acceptance must be ready."
    );
  } else {
    packagingEvidence.push(
      "DEV-262 acceptance is ready."
    );
  }

  if (!acceptance.accepted) {
    blockedReasons.push(
      "DEV-262 downstream handoff must be accepted."
    );
  } else {
    packagingEvidence.push(
      "DEV-262 downstream handoff is accepted."
    );
  }

  if (acceptance.defaultPolicy !== "DENY") {
    blockedReasons.push(
      "DEV-262 acceptance must remain DENY-by-default."
    );
  } else {
    packagingEvidence.push(
      "DEV-262 default policy remains DENY."
    );
  }

  if (!acceptance.acceptanceDecisionOnly) {
    blockedReasons.push(
      "DEV-262 acceptance must remain decision-only."
    );
  } else {
    packagingEvidence.push(
      "DEV-262 remains acceptance-decision-only."
    );
  }

  if (!acceptance.acceptanceResultIsInertData) {
    blockedReasons.push(
      "DEV-262 acceptance result must remain inert data."
    );
  } else {
    packagingEvidence.push(
      "DEV-262 acceptance result remains inert data."
    );
  }

  if (
    acceptance.acceptanceState !==
    "VERIFIED_DOWNSTREAM_HANDOFF_ACCEPTED"
  ) {
    blockedReasons.push(
      "DEV-262 acceptance state must be VERIFIED_DOWNSTREAM_HANDOFF_ACCEPTED."
    );
  } else {
    packagingEvidence.push(
      "DEV-262 acceptance state is accepted."
    );
  }

  if (
    acceptance.receiptState === null ||
    !RECOGNIZED_RECEIPT_STATES.has(
      acceptance.receiptState
    )
  ) {
    blockedReasons.push(
      "DEV-262 receipt state must be recognized."
    );
  } else {
    packagingEvidence.push(
      "DEV-262 receipt state is recognized."
    );
  }

  if (
    acceptance.executedOperation === null ||
    acceptance.executedOperation.trim().length === 0
  ) {
    blockedReasons.push(
      "DEV-262 executed operation is required."
    );
  } else {
    packagingEvidence.push(
      "DEV-262 executed operation is present."
    );
  }

  if (
    acceptance.approvedExecutionScope.length === 0
  ) {
    blockedReasons.push(
      "DEV-262 approved execution scope is required."
    );
  } else {
    packagingEvidence.push(
      "DEV-262 approved execution scope is present."
    );
  }

  if (acceptance.provenance.length === 0) {
    blockedReasons.push(
      "DEV-262 provenance is required."
    );
  } else {
    packagingEvidence.push(
      "DEV-262 provenance is present."
    );
  }

  if (
    acceptance.authorizationBoundaries.length === 0
  ) {
    blockedReasons.push(
      "DEV-262 authorization boundaries are required."
    );
  } else {
    packagingEvidence.push(
      "DEV-262 authorization boundaries are present."
    );
  }

  if (
    acceptance.scopeBoundaries.length === 0
  ) {
    blockedReasons.push(
      "DEV-262 scope boundaries are required."
    );
  } else {
    packagingEvidence.push(
      "DEV-262 scope boundaries are present."
    );
  }

  if (
    acceptance.verificationEvidence.length === 0
  ) {
    blockedReasons.push(
      "DEV-262 verification evidence is required."
    );
  } else {
    packagingEvidence.push(
      "DEV-262 verification evidence is present."
    );
  }

  if (
    acceptance.acceptanceEvidence.length === 0
  ) {
    blockedReasons.push(
      "DEV-262 acceptance evidence is required."
    );
  } else {
    packagingEvidence.push(
      "DEV-262 acceptance evidence is present."
    );
  }

  if (acceptance.blockedReasons.length > 0) {
    blockedReasons.push(
      "DEV-262 acceptance must contain no blocked reasons."
    );
  } else {
    packagingEvidence.push(
      "DEV-262 acceptance contains no blocked reasons."
    );
  }

  if (
    acceptance.mayCreateExecutionAuthorization ||
    acceptance.mayAuthorizeDownstreamAction ||
    acceptance.mayDispatch ||
    acceptance.mayInvokeExecutor ||
    acceptance.mayExecuteOperation ||
    acceptance.mayInvokeInspectionDependency ||
    acceptance.mayRetryExecution ||
    acceptance.mayPersistLifecycleState ||
    acceptance.mayModifyRepository ||
    acceptance.mayDeleteRepositoryContent ||
    acceptance.mayStageRepositoryChanges ||
    acceptance.mayCommit ||
    acceptance.mayPush ||
    acceptance.mayDeploy ||
    acceptance.mayAccessSecrets ||
    acceptance.mayExpandScope ||
    acceptance.mayPerformArbitraryShellExecution ||
    acceptance.mayPerformExternalSideEffects
  ) {
    blockedReasons.push(
      "DEV-262 acceptance grants prohibited authority."
    );
  } else {
    packagingEvidence.push(
      "DEV-262 prohibited authorities remain denied."
    );
  }

  if (
    !acceptance.futureDownstreamBoundaryRequired
  ) {
    blockedReasons.push(
      "DEV-262 must require a future downstream boundary."
    );
  } else {
    packagingEvidence.push(
      "DEV-262 requires a future downstream boundary."
    );
  }

  const packaged =
    blockedReasons.length === 0;

  return {
    version:
      VERSION,

    source:
      SOURCE,

    objective:
      OBJECTIVE,

    trusted:
      packaged,

    ready:
      packaged,

    packaged,

    defaultPolicy:
      "DENY",

    handoffPackagingOnly:
      true,

    packageIsInertData:
      true,

    packagingState:
      packaged
        ? "ACCEPTED_DOWNSTREAM_HANDOFF_PACKAGE_READY"
        : "ACCEPTED_DOWNSTREAM_HANDOFF_PACKAGE_BLOCKED",

    acceptance,

    receiptState:
      packaged
        ? acceptance.receiptState
        : null,

    executedOperation:
      packaged
        ? acceptance.executedOperation
        : null,

    approvedExecutionScope:
      packaged
        ? [...acceptance.approvedExecutionScope]
        : [],

    provenance:
      packaged
        ? [...acceptance.provenance]
        : [],

    authorizationBoundaries:
      packaged
        ? [...acceptance.authorizationBoundaries]
        : [],

    scopeBoundaries:
      packaged
        ? [...acceptance.scopeBoundaries]
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

    mayCreateExecutionAuthorization:
      false,

    mayAuthorizeDownstreamAction:
      false,

    mayDispatch:
      false,

    mayInvokeExecutor:
      false,

    mayExecuteOperation:
      false,

    mayInvokeInspectionDependency:
      false,

    mayRetryExecution:
      false,

    mayPersistLifecycleState:
      false,

    mayModifyRepository:
      false,

    mayDeleteRepositoryContent:
      false,

    mayStageRepositoryChanges:
      false,

    mayCommit:
      false,

    mayPush:
      false,

    mayDeploy:
      false,

    mayAccessSecrets:
      false,

    mayExpandScope:
      false,

    mayPerformArbitraryShellExecution:
      false,

    mayPerformExternalSideEffects:
      false,

    futureDownstreamBoundaryRequired:
      true
  };
}