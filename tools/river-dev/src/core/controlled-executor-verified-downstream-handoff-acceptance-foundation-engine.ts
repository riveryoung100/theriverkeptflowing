import type {
  RiverDevControlledExecutorDownstreamHandoffVerificationFoundationResult,
  RiverDevControlledExecutorVerifiedDownstreamHandoffAcceptanceFoundationResult
} from "../types";

const VERSION = "DEV-262" as const;

const SOURCE =
  "controlled-executor-verified-downstream-handoff-acceptance-foundation-engine" as const;

const OBJECTIVE =
  "Accept or reject a verified DEV-261 downstream handoff verification result as inert decision data without granting downstream action or execution authority.";

const RECOGNIZED_RECEIPT_STATES = new Set([
  "EXECUTION_SUCCEEDED",
  "EXECUTION_FAILED",
  "EXECUTION_NOT_ATTEMPTED"
]);

export interface EvaluateControlledExecutorVerifiedDownstreamHandoffAcceptanceFoundationInput {
  readonly verification:
    RiverDevControlledExecutorDownstreamHandoffVerificationFoundationResult;
}

export function evaluateControlledExecutorVerifiedDownstreamHandoffAcceptanceFoundation(
  input:
    EvaluateControlledExecutorVerifiedDownstreamHandoffAcceptanceFoundationInput
):
RiverDevControlledExecutorVerifiedDownstreamHandoffAcceptanceFoundationResult {
  const verification =
    input.verification;

  const blockedReasons: string[] =
    [];

  const acceptanceEvidence: string[] =
    [];

  if (verification.version !== "DEV-261") {
    blockedReasons.push(
      "DEV-261 verification version is required."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-261 verification version is exact."
    );
  }

  if (!verification.trusted) {
    blockedReasons.push(
      "DEV-261 verification must be trusted."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-261 verification is trusted."
    );
  }

  if (!verification.ready) {
    blockedReasons.push(
      "DEV-261 verification must be ready."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-261 verification is ready."
    );
  }

  if (!verification.verified) {
    blockedReasons.push(
      "DEV-261 handoff must be verified."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-261 handoff is verified."
    );
  }

  if (verification.defaultPolicy !== "DENY") {
    blockedReasons.push(
      "DEV-261 verification must remain DENY-by-default."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-261 default policy remains DENY."
    );
  }

  if (!verification.verificationDecisionOnly) {
    blockedReasons.push(
      "DEV-261 verification must remain decision-only."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-261 remains verification-decision-only."
    );
  }

  if (!verification.verificationResultIsInertData) {
    blockedReasons.push(
      "DEV-261 verification result must remain inert data."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-261 verification result remains inert data."
    );
  }

  if (
    verification.verificationState !==
    "DOWNSTREAM_HANDOFF_VERIFIED"
  ) {
    blockedReasons.push(
      "DEV-261 verification state must be DOWNSTREAM_HANDOFF_VERIFIED."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-261 verification state is verified."
    );
  }

  if (
    verification.receiptState === null ||
    !RECOGNIZED_RECEIPT_STATES.has(
      verification.receiptState
    )
  ) {
    blockedReasons.push(
      "DEV-261 receipt state must be recognized."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-261 receipt state is recognized."
    );
  }

  if (
    verification.executedOperation === null ||
    verification.executedOperation.trim().length === 0
  ) {
    blockedReasons.push(
      "DEV-261 executed operation is required."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-261 executed operation is present."
    );
  }

  if (
    verification.approvedExecutionScope.length === 0
  ) {
    blockedReasons.push(
      "DEV-261 approved execution scope is required."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-261 approved execution scope is present."
    );
  }

  if (verification.provenance.length === 0) {
    blockedReasons.push(
      "DEV-261 provenance is required."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-261 provenance is present."
    );
  }

  if (
    verification.authorizationBoundaries.length === 0
  ) {
    blockedReasons.push(
      "DEV-261 authorization boundaries are required."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-261 authorization boundaries are present."
    );
  }

  if (
    verification.scopeBoundaries.length === 0
  ) {
    blockedReasons.push(
      "DEV-261 scope boundaries are required."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-261 scope boundaries are present."
    );
  }

  if (
    verification.verificationEvidence.length === 0
  ) {
    blockedReasons.push(
      "DEV-261 verification evidence is required."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-261 verification evidence is present."
    );
  }

  if (verification.blockedReasons.length > 0) {
    blockedReasons.push(
      "DEV-261 verification must contain no blocked reasons."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-261 verification contains no blocked reasons."
    );
  }

  if (
    verification.mayCreateExecutionAuthorization ||
    verification.mayAuthorizeDownstreamAction ||
    verification.mayDispatch ||
    verification.mayInvokeExecutor ||
    verification.mayExecuteOperation ||
    verification.mayInvokeInspectionDependency ||
    verification.mayRetryExecution ||
    verification.mayPersistLifecycleState ||
    verification.mayModifyRepository ||
    verification.mayDeleteRepositoryContent ||
    verification.mayStageRepositoryChanges ||
    verification.mayCommit ||
    verification.mayPush ||
    verification.mayDeploy ||
    verification.mayAccessSecrets ||
    verification.mayExpandScope ||
    verification.mayPerformArbitraryShellExecution ||
    verification.mayPerformExternalSideEffects
  ) {
    blockedReasons.push(
      "DEV-261 verification grants prohibited authority."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-261 prohibited authorities remain denied."
    );
  }

  if (
    !verification.futureDownstreamBoundaryRequired
  ) {
    blockedReasons.push(
      "DEV-261 must require a future downstream boundary."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-261 requires a future downstream boundary."
    );
  }

  const accepted =
    blockedReasons.length === 0;

  return {
    version:
      VERSION,

    source:
      SOURCE,

    objective:
      OBJECTIVE,

    trusted:
      accepted,

    ready:
      accepted,

    accepted,

    defaultPolicy:
      "DENY",

    acceptanceDecisionOnly:
      true,

    acceptanceResultIsInertData:
      true,

    acceptanceState:
      accepted
        ? "VERIFIED_DOWNSTREAM_HANDOFF_ACCEPTED"
        : "VERIFIED_DOWNSTREAM_HANDOFF_REJECTED",

    verification,

    receiptState:
      accepted
        ? verification.receiptState
        : null,

    executedOperation:
      accepted
        ? verification.executedOperation
        : null,

    approvedExecutionScope:
      accepted
        ? [...verification.approvedExecutionScope]
        : [],

    provenance:
      accepted
        ? [...verification.provenance]
        : [],

    authorizationBoundaries:
      accepted
        ? [...verification.authorizationBoundaries]
        : [],

    scopeBoundaries:
      accepted
        ? [...verification.scopeBoundaries]
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