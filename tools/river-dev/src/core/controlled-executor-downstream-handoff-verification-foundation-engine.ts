import type {
  RiverDevControlledExecutorAcceptedReceiptHandoffFoundation,
  RiverDevControlledExecutorDownstreamHandoffVerificationFoundationResult
} from "../types";

const VERSION = "DEV-261" as const;

const SOURCE =
  "controlled-executor-downstream-handoff-verification-foundation-engine" as const;

const OBJECTIVE =
  "Verify the integrity and admissibility of an inert DEV-260 accepted-receipt handoff without granting downstream action or execution authority.";

const RECOGNIZED_RECEIPT_STATES = new Set([
  "EXECUTION_SUCCEEDED",
  "EXECUTION_FAILED",
  "EXECUTION_NOT_ATTEMPTED"
]);

export interface EvaluateControlledExecutorDownstreamHandoffVerificationFoundationInput {
  readonly handoff:
    RiverDevControlledExecutorAcceptedReceiptHandoffFoundation;
}

export function evaluateControlledExecutorDownstreamHandoffVerificationFoundation(
  input:
    EvaluateControlledExecutorDownstreamHandoffVerificationFoundationInput
):
RiverDevControlledExecutorDownstreamHandoffVerificationFoundationResult {
  const handoff =
    input.handoff;

  const blockedReasons: string[] =
    [];

  const verificationEvidence: string[] =
    [];

  if (handoff.version !== "DEV-260") {
    blockedReasons.push(
      "DEV-260 handoff version is required."
    );
  } else {
    verificationEvidence.push(
      "DEV-260 handoff version is exact."
    );
  }

  if (!handoff.trusted) {
    blockedReasons.push(
      "DEV-260 handoff must be trusted."
    );
  } else {
    verificationEvidence.push(
      "DEV-260 handoff is trusted."
    );
  }

  if (!handoff.ready) {
    blockedReasons.push(
      "DEV-260 handoff must be ready."
    );
  } else {
    verificationEvidence.push(
      "DEV-260 handoff is ready."
    );
  }

  if (handoff.defaultPolicy !== "DENY") {
    blockedReasons.push(
      "DEV-260 handoff must remain DENY-by-default."
    );
  } else {
    verificationEvidence.push(
      "DEV-260 default policy remains DENY."
    );
  }

  if (!handoff.handoffConstructionOnly) {
    blockedReasons.push(
      "DEV-260 must remain handoff-construction-only."
    );
  } else {
    verificationEvidence.push(
      "DEV-260 remains handoff-construction-only."
    );
  }

  if (!handoff.handoffIsInertData) {
    blockedReasons.push(
      "DEV-260 handoff must remain inert data."
    );
  } else {
    verificationEvidence.push(
      "DEV-260 handoff remains inert data."
    );
  }

  if (
    handoff.handoffState !==
    "ACCEPTED_RECEIPT_HANDOFF_READY"
  ) {
    blockedReasons.push(
      "DEV-260 handoff state must be ACCEPTED_RECEIPT_HANDOFF_READY."
    );
  } else {
    verificationEvidence.push(
      "DEV-260 handoff state is ready."
    );
  }

  if (
    handoff.receiptState === null ||
    !RECOGNIZED_RECEIPT_STATES.has(
      handoff.receiptState
    )
  ) {
    blockedReasons.push(
      "DEV-260 preserved receipt state must be recognized."
    );
  } else {
    verificationEvidence.push(
      "DEV-260 preserved receipt state is recognized."
    );
  }

  if (
    handoff.executedOperation === null ||
    handoff.executedOperation.trim().length === 0
  ) {
    blockedReasons.push(
      "DEV-260 preserved executed operation is required."
    );
  } else {
    verificationEvidence.push(
      "DEV-260 preserved executed operation is present."
    );
  }

  if (
    handoff.approvedExecutionScope.length === 0
  ) {
    blockedReasons.push(
      "DEV-260 approved execution scope is required."
    );
  } else {
    verificationEvidence.push(
      "DEV-260 approved execution scope is present."
    );
  }

  if (handoff.provenance.length === 0) {
    blockedReasons.push(
      "DEV-260 provenance is required."
    );
  } else {
    verificationEvidence.push(
      "DEV-260 provenance is present."
    );
  }

  if (
    handoff.authorizationBoundaries.length === 0
  ) {
    blockedReasons.push(
      "DEV-260 authorization boundaries are required."
    );
  } else {
    verificationEvidence.push(
      "DEV-260 authorization boundaries are present."
    );
  }

  if (
    handoff.scopeBoundaries.length === 0
  ) {
    blockedReasons.push(
      "DEV-260 scope boundaries are required."
    );
  } else {
    verificationEvidence.push(
      "DEV-260 scope boundaries are present."
    );
  }

  if (
    handoff.mayCreateExecutionAuthorization ||
    handoff.mayAuthorizeDownstreamAction ||
    handoff.mayDispatch ||
    handoff.mayInvokeExecutor ||
    handoff.mayExecuteOperation ||
    handoff.mayInvokeInspectionDependency ||
    handoff.mayRetryExecution ||
    handoff.mayPersistLifecycleState ||
    handoff.mayModifyRepository ||
    handoff.mayDeleteRepositoryContent ||
    handoff.mayStageRepositoryChanges ||
    handoff.mayCommit ||
    handoff.mayPush ||
    handoff.mayDeploy ||
    handoff.mayAccessSecrets ||
    handoff.mayExpandScope ||
    handoff.mayPerformArbitraryShellExecution ||
    handoff.mayPerformExternalSideEffects
  ) {
    blockedReasons.push(
      "DEV-260 handoff grants prohibited authority."
    );
  } else {
    verificationEvidence.push(
      "DEV-260 prohibited authorities remain denied."
    );
  }

  if (
    !handoff.futureDownstreamBoundaryRequired
  ) {
    blockedReasons.push(
      "DEV-260 must require a future downstream boundary."
    );
  } else {
    verificationEvidence.push(
      "DEV-260 requires a future downstream boundary."
    );
  }

  const verified =
    blockedReasons.length === 0;

  return {
    version:
      VERSION,

    source:
      SOURCE,

    objective:
      OBJECTIVE,

    trusted:
      verified,

    ready:
      verified,

    verified,

    defaultPolicy:
      "DENY",

    verificationDecisionOnly:
      true,

    verificationResultIsInertData:
      true,

    verificationState:
      verified
        ? "DOWNSTREAM_HANDOFF_VERIFIED"
        : "DOWNSTREAM_HANDOFF_REJECTED",

    handoff,

    receiptState:
      verified
        ? handoff.receiptState
        : null,

    executedOperation:
      verified
        ? handoff.executedOperation
        : null,

    approvedExecutionScope:
      verified
        ? [...handoff.approvedExecutionScope]
        : [],

    provenance:
      verified
        ? [...handoff.provenance]
        : [],

    authorizationBoundaries:
      verified
        ? [...handoff.authorizationBoundaries]
        : [],

    scopeBoundaries:
      verified
        ? [...handoff.scopeBoundaries]
        : [],

    verificationEvidence:
      verified
        ? verificationEvidence
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