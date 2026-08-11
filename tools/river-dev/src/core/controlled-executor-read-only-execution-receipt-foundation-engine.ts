import type {
  RiverDevControlledExecutorReadOnlyExecutionReceiptFoundation,
  RiverDevControlledExecutorReadOnlyExecutionReceiptFoundationInput,
  RiverDevControlledExecutorReadOnlyExecutionReceiptState
} from "../types";

const VERSION = "DEV-257" as const;

const SOURCE =
  "River Development Agent controlled executor read-only execution receipt foundation";

const OBJECTIVE =
  "Construct a deterministic inert audit receipt from a DEV-256 read-only execution result without executing, retrying, invoking inspection, persisting lifecycle state, mutating repository state, staging, committing, pushing, deploying, accessing secrets, expanding scope, or causing external side effects.";

const EXPECTED_OPERATION =
  "inspect-approved-repository-state" as const;

export function buildControlledExecutorReadOnlyExecutionReceipt(
  input:
    RiverDevControlledExecutorReadOnlyExecutionReceiptFoundationInput
): RiverDevControlledExecutorReadOnlyExecutionReceiptFoundation {
  const executionResult =
    input.executionResult;

  const blockedReasons: string[] = [];

  if (executionResult.version !== "DEV-256") {
    blockedReasons.push(
      "execution result version is not DEV-256"
    );
  }

  if (executionResult.defaultPolicy !== "DENY") {
    blockedReasons.push(
      "execution result does not preserve deny-by-default policy"
    );
  }

  if (executionResult.readOnlyExecutionOnly !== true) {
    blockedReasons.push(
      "execution result does not preserve read-only execution semantics"
    );
  }

  if (
    executionResult.executedOperation !==
    EXPECTED_OPERATION
  ) {
    blockedReasons.push(
      "execution result operation is not the approved read-only inspection operation"
    );
  }

  if (
    executionResult.approvedExecutionScope.length ===
    0
  ) {
    blockedReasons.push(
      "approved execution scope is missing"
    );
  }

  if (
    executionResult.provenance.length ===
    0
  ) {
    blockedReasons.push(
      "authorization provenance is missing"
    );
  }

  if (
    executionResult.authorizationBoundaries.length ===
    0
  ) {
    blockedReasons.push(
      "authorization boundaries are missing"
    );
  }

  if (
    executionResult.scopeBoundaries.length ===
    0
  ) {
    blockedReasons.push(
      "scope boundaries are missing"
    );
  }

  if (
    executionResult.mayPersistLifecycleState !==
    false
  ) {
    blockedReasons.push(
      "execution result grants lifecycle-state persistence"
    );
  }

  if (
    executionResult.mayModifyRepository !==
    false
  ) {
    blockedReasons.push(
      "execution result grants repository modification"
    );
  }

  if (
    executionResult.mayDeleteRepositoryContent !==
    false
  ) {
    blockedReasons.push(
      "execution result grants repository deletion"
    );
  }

  if (
    executionResult.mayStageRepositoryChanges !==
    false
  ) {
    blockedReasons.push(
      "execution result grants staging authority"
    );
  }

  if (
    executionResult.mayCommit !==
    false
  ) {
    blockedReasons.push(
      "execution result grants commit authority"
    );
  }

  if (
    executionResult.mayPush !==
    false
  ) {
    blockedReasons.push(
      "execution result grants push authority"
    );
  }

  if (
    executionResult.mayDeploy !==
    false
  ) {
    blockedReasons.push(
      "execution result grants deployment authority"
    );
  }

  if (
    executionResult.mayAccessSecrets !==
    false
  ) {
    blockedReasons.push(
      "execution result grants secret access"
    );
  }

  if (
    executionResult.mayExpandScope !==
    false
  ) {
    blockedReasons.push(
      "execution result grants scope expansion"
    );
  }

  if (
    executionResult.mayPerformArbitraryShellExecution !==
    false
  ) {
    blockedReasons.push(
      "execution result grants arbitrary shell execution"
    );
  }

  if (
    executionResult.mayPerformUnrelatedExternalSideEffects !==
    false
  ) {
    blockedReasons.push(
      "execution result grants unrelated external side effects"
    );
  }

  let receiptState:
    RiverDevControlledExecutorReadOnlyExecutionReceiptState;

  if (!executionResult.executionAttempted) {
    receiptState =
      "EXECUTION_NOT_ATTEMPTED";

  } else if (executionResult.executionSucceeded) {
    receiptState =
      "EXECUTION_SUCCEEDED";

  } else {
    receiptState =
      "EXECUTION_FAILED";
  }

  const trusted =
    blockedReasons.length === 0;

  return {
    version: VERSION,
    source: SOURCE,
    objective: OBJECTIVE,

    trusted,
    ready: trusted,

    defaultPolicy: "DENY",
    receiptConstructionOnly: true,

    executedOperation:
      executionResult.executedOperation,

    executionAttempted:
      executionResult.executionAttempted,

    executionSucceeded:
      executionResult.executionSucceeded,

    receiptState,

    executionResult,

    inspectionResult:
      executionResult.inspectionResult,

    approvedExecutionScope: [
      ...executionResult.approvedExecutionScope
    ],

    executionState: [
      ...executionResult.executionState,
      `DEV-257 receipt state: ${receiptState}`,
      "receipt construction performed without execution"
    ],

    provenance: [
      ...executionResult.provenance,
      "DEV-257 receipt derived from DEV-256 execution result"
    ],

    authorizationBoundaries: [
      ...executionResult.authorizationBoundaries,
      "DEV-257 may construct receipt data only",
      "DEV-257 cannot invoke inspection or retry execution"
    ],

    scopeBoundaries: [
      ...executionResult.scopeBoundaries,
      "DEV-257 cannot expand approved execution scope",
      "DEV-257 cannot mutate repository or lifecycle state"
    ],

    blockedReasons: [
      ...executionResult.blockedReasons,
      ...blockedReasons
    ],

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
