import type {
  RiverDevControlledExecutorAcceptedReceiptHandoffFoundation,
  RiverDevControlledExecutorVerifiedReceiptAcceptanceFoundationResult
} from "../types";

const VERSION = "DEV-260" as const;

const SOURCE =
  "controlled-executor-accepted-receipt-handoff-foundation-engine" as const;

const OBJECTIVE =
  "Construct an inert handoff from an accepted DEV-259 verified execution receipt decision without granting downstream action authority.";

const RECOGNIZED_RECEIPT_STATES = new Set([
  "EXECUTION_SUCCEEDED",
  "EXECUTION_FAILED",
  "EXECUTION_NOT_ATTEMPTED"
]);

export interface EvaluateControlledExecutorAcceptedReceiptHandoffFoundationInput {
  readonly acceptance:
    RiverDevControlledExecutorVerifiedReceiptAcceptanceFoundationResult;
}

export function
evaluateControlledExecutorAcceptedReceiptHandoffFoundation(
  input:
    EvaluateControlledExecutorAcceptedReceiptHandoffFoundationInput
):
RiverDevControlledExecutorAcceptedReceiptHandoffFoundation {
  const acceptance =
    input.acceptance;

  const blockedReasons: string[] =
    [];

  if (acceptance.version !== "DEV-259") {
    blockedReasons.push(
      "DEV-259 acceptance version is required."
    );
  }

  if (!acceptance.trusted) {
    blockedReasons.push(
      "DEV-259 acceptance must be trusted."
    );
  }

  if (!acceptance.ready) {
    blockedReasons.push(
      "DEV-259 acceptance must be ready."
    );
  }

  if (!acceptance.accepted) {
    blockedReasons.push(
      "DEV-259 verified receipt must be accepted."
    );
  }

  if (acceptance.defaultPolicy !== "DENY") {
    blockedReasons.push(
      "DEV-259 acceptance must remain DENY-by-default."
    );
  }

  if (!acceptance.acceptanceDecisionOnly) {
    blockedReasons.push(
      "DEV-259 acceptance must remain decision-only."
    );
  }

  if (
    acceptance.acceptanceState !==
    "VERIFIED_RECEIPT_ACCEPTED"
  ) {
    blockedReasons.push(
      "DEV-259 acceptance state must be VERIFIED_RECEIPT_ACCEPTED."
    );
  }

  if (
    acceptance.receiptState === null ||
    !RECOGNIZED_RECEIPT_STATES.has(
      acceptance.receiptState
    )
  ) {
    blockedReasons.push(
      "DEV-259 receipt state must be recognized."
    );
  }

  if (
    acceptance.executedOperation === null ||
    acceptance.executedOperation.length === 0
  ) {
    blockedReasons.push(
      "DEV-259 executed operation is required."
    );
  }

  if (
    acceptance.approvedExecutionScope.length === 0
  ) {
    blockedReasons.push(
      "DEV-259 approved execution scope is required."
    );
  }

  if (acceptance.provenance.length === 0) {
    blockedReasons.push(
      "DEV-259 provenance is required."
    );
  }

  if (
    acceptance.authorizationBoundaries.length === 0
  ) {
    blockedReasons.push(
      "DEV-259 authorization boundaries are required."
    );
  }

  if (
    acceptance.scopeBoundaries.length === 0
  ) {
    blockedReasons.push(
      "DEV-259 scope boundaries are required."
    );
  }

  const prohibitedAuthorityGranted =
    acceptance.mayCreateExecutionAuthorization ||
    acceptance.mayDispatch ||
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
    acceptance.mayPerformExternalSideEffects;

  if (prohibitedAuthorityGranted) {
    blockedReasons.push(
      "DEV-259 acceptance grants prohibited downstream authority."
    );
  }

  const ready =
    blockedReasons.length === 0;

  return {
    version:
      VERSION,

    source:
      SOURCE,

    objective:
      OBJECTIVE,

    trusted:
      ready,

    ready,

    defaultPolicy:
      "DENY",

    handoffConstructionOnly:
      true,

    handoffIsInertData:
      true,

    handoffState:
      ready
        ? "ACCEPTED_RECEIPT_HANDOFF_READY"
        : "ACCEPTED_RECEIPT_HANDOFF_BLOCKED",

    acceptance,

    receiptState:
      ready
        ? acceptance.receiptState
        : null,

    executedOperation:
      ready
        ? acceptance.executedOperation
        : null,

    approvedExecutionScope:
      ready
        ? [...acceptance.approvedExecutionScope]
        : [],

    provenance:
      ready
        ? [...acceptance.provenance]
        : [],

    authorizationBoundaries:
      ready
        ? [...acceptance.authorizationBoundaries]
        : [],

    scopeBoundaries:
      ready
        ? [...acceptance.scopeBoundaries]
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
