import type {
  RiverDevControlledExecutorReadOnlyRepositoryInspectionExecutorFoundation,
  RiverDevControlledExecutorReadOnlyRepositoryInspectionExecutorFoundationInput
} from "../types";

const VERSION = "DEV-256" as const;

const SOURCE =
  "River Development Agent controlled executor read-only repository inspection executor foundation";

const OBJECTIVE =
  "Execute only inspect-approved-repository-state after successful DEV-255 dispatch-boundary admission while denying lifecycle-state persistence, repository mutation, staging, commit, push, deployment, secret access, scope expansion, change preparation, change validation, arbitrary shell execution, and unrelated side effects.";

const ALLOWED_OPERATION =
  "inspect-approved-repository-state" as const;

export async function executeControlledExecutorReadOnlyRepositoryInspection(
  input:
    RiverDevControlledExecutorReadOnlyRepositoryInspectionExecutorFoundationInput
): Promise<
  RiverDevControlledExecutorReadOnlyRepositoryInspectionExecutorFoundation
> {
  const boundary =
    input.dispatchBoundary;

  const blockedReasons: string[] = [];

  if (!boundary.trusted) {
    blockedReasons.push(
      "dispatch boundary is not trusted"
    );
  }

  if (!boundary.ready) {
    blockedReasons.push(
      "dispatch boundary is not ready"
    );
  }

  if (!boundary.dispatchBoundaryAdmitted) {
    blockedReasons.push(
      "dispatch boundary is not admitted"
    );
  }

  if (boundary.defaultPolicy !== "DENY") {
    blockedReasons.push(
      "dispatch boundary does not preserve deny-by-default policy"
    );
  }

  if (boundary.boundaryAdmissionOnly !== true) {
    blockedReasons.push(
      "dispatch boundary does not preserve boundary-admission-only semantics"
    );
  }

  if (boundary.blockedReasons.length > 0) {
    blockedReasons.push(
      "dispatch boundary contains blockers"
    );
  }

  if (
    boundary.preparedOperation !==
    ALLOWED_OPERATION
  ) {
    blockedReasons.push(
      "prepared operation is not the approved read-only inspection operation"
    );
  }

  if (
    boundary.requiredCapability !==
    ALLOWED_OPERATION
  ) {
    blockedReasons.push(
      "required capability does not match approved read-only inspection capability"
    );
  }

  if (
    !boundary.requiredCapabilityAuthorized
  ) {
    blockedReasons.push(
      "required capability is not authorized"
    );
  }

  if (
    !boundary.authorizedCapabilities.includes(
      ALLOWED_OPERATION
    )
  ) {
    blockedReasons.push(
      "approved read-only inspection capability is absent from authorization evidence"
    );
  }

  if (
    boundary.approvedExecutionScope.length ===
    0
  ) {
    blockedReasons.push(
      "approved execution scope is missing"
    );
  }

  if (
    boundary.provenance.length ===
    0
  ) {
    blockedReasons.push(
      "authorization provenance is missing"
    );
  }

  if (
    boundary.dispatchBoundaryMayCreateAuthorization !==
    false
  ) {
    blockedReasons.push(
      "dispatch boundary may create authorization"
    );
  }

  if (
    boundary.dispatchBoundaryMayExpandScope !==
    false
  ) {
    blockedReasons.push(
      "dispatch boundary may expand scope"
    );
  }

  if (
    boundary.dispatchBoundaryMayInvokeExecutor !==
    false
  ) {
    blockedReasons.push(
      "predecessor already grants executor invocation authority"
    );
  }

  if (
    boundary.dispatchBoundaryMayExecuteOperation !==
    false
  ) {
    blockedReasons.push(
      "predecessor already grants operation execution authority"
    );
  }

  if (
    boundary.dispatchBoundaryMayModifyRepository !==
    false
  ) {
    blockedReasons.push(
      "dispatch boundary may modify repository"
    );
  }

  if (
    boundary.dispatchBoundaryMayDeleteRepositoryContent !==
    false
  ) {
    blockedReasons.push(
      "dispatch boundary may delete repository content"
    );
  }

  if (
    boundary.dispatchBoundaryMayCommit !==
    false
  ) {
    blockedReasons.push(
      "dispatch boundary may commit"
    );
  }

  if (
    boundary.dispatchBoundaryMayPush !==
    false
  ) {
    blockedReasons.push(
      "dispatch boundary may push"
    );
  }

  if (
    boundary.dispatchBoundaryMayDeploy !==
    false
  ) {
    blockedReasons.push(
      "dispatch boundary may deploy"
    );
  }

  if (
    boundary.dispatchBoundaryMayAccessSecrets !==
    false
  ) {
    blockedReasons.push(
      "dispatch boundary may access secrets"
    );
  }

  if (
    boundary.dispatchBoundaryMayPerformExternalSideEffects !==
    false
  ) {
    blockedReasons.push(
      "dispatch boundary may perform external side effects"
    );
  }

  const admitted =
    blockedReasons.length === 0;

  if (!admitted) {
    return {
      version: VERSION,

      source: SOURCE,
      objective: OBJECTIVE,

      trusted: false,
      ready: false,

      executionAttempted: false,
      executionSucceeded: false,

      defaultPolicy: "DENY",
      readOnlyExecutionOnly: true,

      executedOperation:
        ALLOWED_OPERATION,

      dispatchBoundary:
        boundary,

      inspectionResult:
        null,

      approvedExecutionScope: [
        ...boundary.approvedExecutionScope
      ],

      executionState: [
        "read-only executor admission denied",
        "inspection execution not attempted",
        "repository modification remains prohibited"
      ],

      provenance: [
        ...boundary.provenance,
        "DEV-256 read-only executor denied before inspection execution"
      ],

      authorizationBoundaries: [
        ...boundary.authorizationBoundaries,
        "DEV-256 execution authority is restricted to inspect-approved-repository-state"
      ],

      scopeBoundaries: [
        ...boundary.scopeBoundaries,
        "DEV-256 may not expand approved execution scope"
      ],

      blockedReasons,

      mayExecuteInspectApprovedRepositoryState:
        true,

      mayExecutePrepareApprovedRepositoryChange:
        false,

      mayExecuteValidateApprovedRepositoryChange:
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

      mayPerformUnrelatedExternalSideEffects:
        false,

      mayExecuteAutonomouslyOutsideApprovedBoundary:
        false
    };
  }

  try {
    const inspectionResult =
      await input.dependencies.inspectRepository(
        input.capturedAt
      );

    return {
      version: VERSION,

      source: SOURCE,
      objective: OBJECTIVE,

      trusted: true,
      ready: true,

      executionAttempted: true,
      executionSucceeded: true,

      defaultPolicy: "DENY",
      readOnlyExecutionOnly: true,

      executedOperation:
        ALLOWED_OPERATION,

      dispatchBoundary:
        boundary,

      inspectionResult,

      approvedExecutionScope: [
        ...boundary.approvedExecutionScope
      ],

      executionState: [
        "DEV-255 dispatch boundary verified",
        "read-only inspection operation verified",
        "read-only repository inspection executed",
        "inspection execution succeeded",
        "repository mutation remains prohibited",
        "lifecycle-state persistence remains prohibited"
      ],

      provenance: [
        ...boundary.provenance,
        "DEV-256 executed inspect-approved-repository-state through injected inspectRepository dependency"
      ],

      authorizationBoundaries: [
        ...boundary.authorizationBoundaries,
        "DEV-256 execution authority is restricted to inspect-approved-repository-state",
        "prepare-approved-repository-change remains prohibited",
        "validate-approved-repository-change remains prohibited"
      ],

      scopeBoundaries: [
        ...boundary.scopeBoundaries,
        "DEV-256 may not expand approved execution scope",
        "DEV-256 may not persist River Dev lifecycle state",
        "DEV-256 may not modify repository state",
        "DEV-256 may not stage, commit, push, or deploy"
      ],

      blockedReasons: [],

      mayExecuteInspectApprovedRepositoryState:
        true,

      mayExecutePrepareApprovedRepositoryChange:
        false,

      mayExecuteValidateApprovedRepositoryChange:
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

      mayPerformUnrelatedExternalSideEffects:
        false,

      mayExecuteAutonomouslyOutsideApprovedBoundary:
        false
    };

  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    return {
      version: VERSION,

      source: SOURCE,
      objective: OBJECTIVE,

      trusted: false,
      ready: false,

      executionAttempted: true,
      executionSucceeded: false,

      defaultPolicy: "DENY",
      readOnlyExecutionOnly: true,

      executedOperation:
        ALLOWED_OPERATION,

      dispatchBoundary:
        boundary,

      inspectionResult:
        null,

      approvedExecutionScope: [
        ...boundary.approvedExecutionScope
      ],

      executionState: [
        "DEV-255 dispatch boundary verified",
        "read-only inspection execution attempted",
        "read-only inspection execution failed",
        "executor failed closed"
      ],

      provenance: [
        ...boundary.provenance,
        "DEV-256 read-only inspection execution failed closed"
      ],

      authorizationBoundaries: [
        ...boundary.authorizationBoundaries,
        "DEV-256 execution failure grants no additional authority"
      ],

      scopeBoundaries: [
        ...boundary.scopeBoundaries,
        "DEV-256 execution failure cannot expand approved execution scope"
      ],

      blockedReasons: [
        `read-only inspection execution failed: ${message}`
      ],

      mayExecuteInspectApprovedRepositoryState:
        true,

      mayExecutePrepareApprovedRepositoryChange:
        false,

      mayExecuteValidateApprovedRepositoryChange:
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

      mayPerformUnrelatedExternalSideEffects:
        false,

      mayExecuteAutonomouslyOutsideApprovedBoundary:
        false
    };
  }
}
