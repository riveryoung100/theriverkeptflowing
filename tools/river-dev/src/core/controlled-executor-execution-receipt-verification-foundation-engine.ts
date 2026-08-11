import type {
  RiverDevControlledExecutorExecutionReceiptVerificationFoundation,
  RiverDevControlledExecutorExecutionReceiptVerificationFoundationInput
} from "../types";

const VERSION = "DEV-258" as const;

const SOURCE =
  "River Development Agent controlled executor execution receipt verification foundation";

const OBJECTIVE =
  "Deterministically verify a DEV-257 execution receipt as inert data without executing, retrying, invoking inspection, persisting lifecycle state, mutating repository state, staging, committing, pushing, deploying, accessing secrets, expanding scope, or performing external side effects.";

const EXPECTED_OPERATION =
  "inspect-approved-repository-state" as const;

export function verifyControlledExecutorExecutionReceipt(
  input:
    RiverDevControlledExecutorExecutionReceiptVerificationFoundationInput
): RiverDevControlledExecutorExecutionReceiptVerificationFoundation {
  const receipt =
    input.receipt;

  const blockedReasons: string[] = [];

  if (receipt.version !== "DEV-257") {
    blockedReasons.push(
      "receipt version is not DEV-257"
    );
  }

  if (!receipt.trusted) {
    blockedReasons.push(
      "receipt is not trusted"
    );
  }

  if (!receipt.ready) {
    blockedReasons.push(
      "receipt is not ready"
    );
  }

  if (receipt.defaultPolicy !== "DENY") {
    blockedReasons.push(
      "receipt does not preserve deny-by-default policy"
    );
  }

  if (receipt.receiptConstructionOnly !== true) {
    blockedReasons.push(
      "receipt does not preserve receipt-construction-only semantics"
    );
  }

  if (
    receipt.executedOperation !==
    EXPECTED_OPERATION
  ) {
    blockedReasons.push(
      "receipt operation is not the approved read-only inspection operation"
    );
  }

  if (
    receipt.approvedExecutionScope.length ===
    0
  ) {
    blockedReasons.push(
      "approved execution scope is missing"
    );
  }

  if (
    receipt.provenance.length ===
    0
  ) {
    blockedReasons.push(
      "authorization provenance is missing"
    );
  }

  if (
    receipt.authorizationBoundaries.length ===
    0
  ) {
    blockedReasons.push(
      "authorization boundaries are missing"
    );
  }

  if (
    receipt.scopeBoundaries.length ===
    0
  ) {
    blockedReasons.push(
      "scope boundaries are missing"
    );
  }

  if (
    receipt.receiptState ===
    "EXECUTION_SUCCEEDED"
  ) {

    if (!receipt.executionAttempted) {
      blockedReasons.push(
        "successful receipt claims execution was not attempted"
      );
    }

    if (!receipt.executionSucceeded) {
      blockedReasons.push(
        "successful receipt does not claim execution success"
      );
    }

    if (receipt.inspectionResult === null) {
      blockedReasons.push(
        "successful receipt is missing inspection result"
      );
    }

  } else if (
    receipt.receiptState ===
    "EXECUTION_FAILED"
  ) {

    if (!receipt.executionAttempted) {
      blockedReasons.push(
        "failed receipt claims execution was not attempted"
      );
    }

    if (receipt.executionSucceeded) {
      blockedReasons.push(
        "failed receipt incorrectly claims execution success"
      );
    }

    if (receipt.inspectionResult !== null) {
      blockedReasons.push(
        "failed receipt unexpectedly contains inspection result"
      );
    }

  } else if (
    receipt.receiptState ===
    "EXECUTION_NOT_ATTEMPTED"
  ) {

    if (receipt.executionAttempted) {
      blockedReasons.push(
        "non-attempted receipt incorrectly claims execution attempt"
      );
    }

    if (receipt.executionSucceeded) {
      blockedReasons.push(
        "non-attempted receipt incorrectly claims execution success"
      );
    }

  } else {

    blockedReasons.push(
      "receipt state is not recognized"
    );
  }

  if (receipt.mayExecuteOperation !== false) {
    blockedReasons.push(
      "receipt grants execution authority"
    );
  }

  if (
    receipt.mayInvokeInspectionDependency !==
    false
  ) {
    blockedReasons.push(
      "receipt grants inspection invocation authority"
    );
  }

  if (receipt.mayRetryExecution !== false) {
    blockedReasons.push(
      "receipt grants retry authority"
    );
  }

  if (
    receipt.mayPersistLifecycleState !==
    false
  ) {
    blockedReasons.push(
      "receipt grants lifecycle-state persistence"
    );
  }

  if (receipt.mayModifyRepository !== false) {
    blockedReasons.push(
      "receipt grants repository modification"
    );
  }

  if (
    receipt.mayDeleteRepositoryContent !==
    false
  ) {
    blockedReasons.push(
      "receipt grants repository deletion"
    );
  }

  if (
    receipt.mayStageRepositoryChanges !==
    false
  ) {
    blockedReasons.push(
      "receipt grants staging authority"
    );
  }

  if (receipt.mayCommit !== false) {
    blockedReasons.push(
      "receipt grants commit authority"
    );
  }

  if (receipt.mayPush !== false) {
    blockedReasons.push(
      "receipt grants push authority"
    );
  }

  if (receipt.mayDeploy !== false) {
    blockedReasons.push(
      "receipt grants deployment authority"
    );
  }

  if (receipt.mayAccessSecrets !== false) {
    blockedReasons.push(
      "receipt grants secret access"
    );
  }

  if (receipt.mayExpandScope !== false) {
    blockedReasons.push(
      "receipt grants scope expansion"
    );
  }

  if (
    receipt.mayPerformArbitraryShellExecution !==
    false
  ) {
    blockedReasons.push(
      "receipt grants arbitrary shell execution"
    );
  }

  if (
    receipt.mayPerformExternalSideEffects !==
    false
  ) {
    blockedReasons.push(
      "receipt grants external side effects"
    );
  }

  const verified =
    blockedReasons.length === 0;

  return {
    version: VERSION,
    source: SOURCE,
    objective: OBJECTIVE,

    trusted:
      verified,

    ready:
      verified,

    verified,

    defaultPolicy:
      "DENY",

    verificationOnly:
      true,

    receipt,

    receiptState:
      receipt.receiptState,

    executedOperation:
      receipt.executedOperation,

    approvedExecutionScope: [
      ...receipt.approvedExecutionScope
    ],

    provenance: [
      ...receipt.provenance,
      "DEV-258 verification derived from DEV-257 execution receipt"
    ],

    authorizationBoundaries: [
      ...receipt.authorizationBoundaries,
      "DEV-258 verification authority is inert only"
    ],

    scopeBoundaries: [
      ...receipt.scopeBoundaries,
      "DEV-258 cannot expand approved execution scope"
    ],

    verificationState:
      verified
        ? [
            "DEV-257 receipt identity verified",
            "receipt-state consistency verified",
            "execution-state consistency verified",
            "inspection-result consistency verified",
            "authority exclusion verified",
            "DEV-258 receipt verification succeeded"
          ]
        : [
            "DEV-258 receipt verification denied"
          ],

    blockedReasons,

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
      false
  };
}
