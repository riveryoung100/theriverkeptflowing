import type {
  RiverDevControlledExecutorExecutionReceiptVerificationFoundation,
  RiverDevControlledExecutorVerifiedReceiptAcceptanceFoundationInput,
  RiverDevControlledExecutorVerifiedReceiptAcceptanceFoundationResult
} from "../types";

const VERSION = "DEV-259" as const;

const SOURCE =
  "controlled-executor-verified-receipt-acceptance-foundation-engine" as const;

const OBJECTIVE =
  "Deterministically accept or reject a verified DEV-258 execution receipt verification result as inert downstream decision data without granting execution authorization, dispatch, execution, mutation, scope expansion, or external side-effect authority.";

const EXPECTED_VERIFICATION_VERSION =
  "DEV-258";

const EXPECTED_RECEIPT_VERSION =
  "DEV-257";

const EXPECTED_OPERATION =
  "inspect-approved-repository-state";

const RECOGNIZED_RECEIPT_STATES =
  new Set([
    "EXECUTION_SUCCEEDED",
    "EXECUTION_FAILED",
    "EXECUTION_NOT_ATTEMPTED"
  ]);

function isPresent(
  value: unknown
): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "object") {
    return Object.keys(
      value as Record<string, unknown>
    ).length > 0;
  }

  return true;
}

function prohibitedAuthorityGranted(
  verification: RiverDevControlledExecutorExecutionReceiptVerificationFoundation
): boolean {
  return (
    verification.mayExecuteOperation !== false ||
    verification.mayInvokeInspectionDependency !== false ||
    verification.mayRetryExecution !== false ||
    verification.mayPersistLifecycleState !== false ||
    verification.mayModifyRepository !== false ||
    verification.mayDeleteRepositoryContent !== false ||
    verification.mayStageRepositoryChanges !== false ||
    verification.mayCommit !== false ||
    verification.mayPush !== false ||
    verification.mayDeploy !== false ||
    verification.mayAccessSecrets !== false ||
    verification.mayExpandScope !== false ||
    verification.mayPerformArbitraryShellExecution !== false ||
    verification.mayPerformExternalSideEffects !== false
  );
}

export function evaluateControlledExecutorVerifiedReceiptAcceptanceFoundation(
  input: RiverDevControlledExecutorVerifiedReceiptAcceptanceFoundationInput
): RiverDevControlledExecutorVerifiedReceiptAcceptanceFoundationResult {
  const verification =
    input.verification;

  const blockedReasons: string[] =
    [];

  const acceptanceEvidence: string[] =
    [];

  if (verification.version !== EXPECTED_VERIFICATION_VERSION) {
    blockedReasons.push(
      "DEV-258 verification version is not exact."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-258 verification version is exact."
    );
  }

  if (verification.trusted !== true) {
    blockedReasons.push(
      "DEV-258 verification is not trusted."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-258 verification is trusted."
    );
  }

  if (verification.ready !== true) {
    blockedReasons.push(
      "DEV-258 verification is not ready."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-258 verification is ready."
    );
  }

  if (verification.verified !== true) {
    blockedReasons.push(
      "DEV-258 receipt is not verified."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-258 receipt is verified."
    );
  }

  if (verification.defaultPolicy !== "DENY") {
    blockedReasons.push(
      "DEV-258 default policy is not DENY."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-258 default policy remains DENY."
    );
  }

  if (verification.verificationOnly !== true) {
    blockedReasons.push(
      "DEV-258 is not verification-only."
    );
  } else {
    acceptanceEvidence.push(
      "DEV-258 remains verification-only."
    );
  }

  const receiptVersion =
    verification.receipt?.version;

  if (receiptVersion !== EXPECTED_RECEIPT_VERSION) {
    blockedReasons.push(
      "Embedded receipt version is not DEV-257."
    );
  } else {
    acceptanceEvidence.push(
      "Embedded receipt version is DEV-257."
    );
  }

  if (verification.executedOperation !== EXPECTED_OPERATION) {
    blockedReasons.push(
      "Executed operation is not approved."
    );
  } else {
    acceptanceEvidence.push(
      "Executed operation is approved."
    );
  }

  if (
    !verification.receiptState ||
    !RECOGNIZED_RECEIPT_STATES.has(
      verification.receiptState
    )
  ) {
    blockedReasons.push(
      "Receipt state is not recognized."
    );
  } else {
    acceptanceEvidence.push(
      "Receipt state is recognized."
    );
  }

  if (!isPresent(verification.approvedExecutionScope)) {
    blockedReasons.push(
      "Approved execution scope is missing."
    );
  } else {
    acceptanceEvidence.push(
      "Approved execution scope is present."
    );
  }

  if (!isPresent(verification.provenance)) {
    blockedReasons.push(
      "Verification provenance is missing."
    );
  } else {
    acceptanceEvidence.push(
      "Verification provenance is present."
    );
  }

  if (!isPresent(verification.authorizationBoundaries)) {
    blockedReasons.push(
      "Authorization boundaries are missing."
    );
  } else {
    acceptanceEvidence.push(
      "Authorization boundaries are present."
    );
  }

  if (!isPresent(verification.scopeBoundaries)) {
    blockedReasons.push(
      "Scope boundaries are missing."
    );
  } else {
    acceptanceEvidence.push(
      "Scope boundaries are present."
    );
  }

  if (prohibitedAuthorityGranted(verification)) {
    blockedReasons.push(
      "A prohibited predecessor authority is granted."
    );
  } else {
    acceptanceEvidence.push(
      "All prohibited predecessor authorities remain denied."
    );
  }

  const accepted =
    blockedReasons.length === 0;

  return {
    version: VERSION,
    source: SOURCE,
    objective: OBJECTIVE,

    trusted: accepted,
    ready: accepted,
    accepted,

    defaultPolicy: "DENY",
    acceptanceDecisionOnly: true,

    verification,

    receiptState:
      RECOGNIZED_RECEIPT_STATES.has(
        verification.receiptState
      )
        ? verification.receiptState
        : null,

    executedOperation:
      verification.executedOperation === EXPECTED_OPERATION
        ? EXPECTED_OPERATION
        : null,

    approvedExecutionScope:
      verification.approvedExecutionScope,

    provenance:
      verification.provenance,

    authorizationBoundaries:
      verification.authorizationBoundaries,

    scopeBoundaries:
      verification.scopeBoundaries,

    acceptanceState:
      accepted
        ? "VERIFIED_RECEIPT_ACCEPTED"
        : "VERIFIED_RECEIPT_REJECTED",

    acceptanceEvidence,
    blockedReasons,

    mayCreateExecutionAuthorization: false,
    mayDispatch: false,
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
