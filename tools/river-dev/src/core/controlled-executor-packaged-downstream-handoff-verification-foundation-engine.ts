import type {
  RiverDevControlledExecutorAcceptedDownstreamHandoffPackagingFoundationResult,
  RiverDevControlledExecutorPackagedDownstreamHandoffVerificationFoundationResult
} from "../types";

const VERSION = "DEV-264" as const;

const SOURCE =
  "controlled-executor-packaged-downstream-handoff-verification-foundation-engine" as const;

const OBJECTIVE =
  "Verify an inert DEV-263 accepted downstream handoff package before any future downstream boundary may consume it, without granting downstream action or execution authority.";

const RECOGNIZED_RECEIPT_STATES = new Set([
  "EXECUTION_SUCCEEDED",
  "EXECUTION_FAILED",
  "EXECUTION_NOT_ATTEMPTED"
]);

export interface EvaluateControlledExecutorPackagedDownstreamHandoffVerificationFoundationInput {
  readonly package:
    RiverDevControlledExecutorAcceptedDownstreamHandoffPackagingFoundationResult;
}

export function evaluateControlledExecutorPackagedDownstreamHandoffVerificationFoundation(
  input:
    EvaluateControlledExecutorPackagedDownstreamHandoffVerificationFoundationInput
):
RiverDevControlledExecutorPackagedDownstreamHandoffVerificationFoundationResult {
  const packagedHandoff =
    input.package;

  const blockedReasons: string[] =
    [];

  const packageVerificationEvidence: string[] =
    [];

  if (packagedHandoff.version !== "DEV-263") {
    blockedReasons.push(
      "DEV-263 package version is required."
    );
  } else {
    packageVerificationEvidence.push(
      "DEV-263 package version is exact."
    );
  }

  if (!packagedHandoff.trusted) {
    blockedReasons.push(
      "DEV-263 package must be trusted."
    );
  } else {
    packageVerificationEvidence.push(
      "DEV-263 package is trusted."
    );
  }

  if (!packagedHandoff.ready) {
    blockedReasons.push(
      "DEV-263 package must be ready."
    );
  } else {
    packageVerificationEvidence.push(
      "DEV-263 package is ready."
    );
  }

  if (!packagedHandoff.packaged) {
    blockedReasons.push(
      "DEV-263 handoff must be packaged."
    );
  } else {
    packageVerificationEvidence.push(
      "DEV-263 handoff is packaged."
    );
  }

  if (packagedHandoff.defaultPolicy !== "DENY") {
    blockedReasons.push(
      "DEV-263 package must remain DENY-by-default."
    );
  } else {
    packageVerificationEvidence.push(
      "DEV-263 default policy remains DENY."
    );
  }

  if (!packagedHandoff.handoffPackagingOnly) {
    blockedReasons.push(
      "DEV-263 must remain handoff-packaging-only."
    );
  } else {
    packageVerificationEvidence.push(
      "DEV-263 remains handoff-packaging-only."
    );
  }

  if (!packagedHandoff.packageIsInertData) {
    blockedReasons.push(
      "DEV-263 package must remain inert data."
    );
  } else {
    packageVerificationEvidence.push(
      "DEV-263 package remains inert data."
    );
  }

  if (
    packagedHandoff.packagingState !==
    "ACCEPTED_DOWNSTREAM_HANDOFF_PACKAGE_READY"
  ) {
    blockedReasons.push(
      "DEV-263 packaging state must be ACCEPTED_DOWNSTREAM_HANDOFF_PACKAGE_READY."
    );
  } else {
    packageVerificationEvidence.push(
      "DEV-263 packaging state is ready."
    );
  }

  if (
    packagedHandoff.acceptance === null ||
    packagedHandoff.acceptance === undefined
  ) {
    blockedReasons.push(
      "DEV-263 preserved acceptance is required."
    );
  } else {
    packageVerificationEvidence.push(
      "DEV-263 preserved acceptance is present."
    );
  }

  if (
    packagedHandoff.receiptState === null ||
    !RECOGNIZED_RECEIPT_STATES.has(
      packagedHandoff.receiptState
    )
  ) {
    blockedReasons.push(
      "DEV-263 receipt state must be recognized."
    );
  } else {
    packageVerificationEvidence.push(
      "DEV-263 receipt state is recognized."
    );
  }

  if (
    packagedHandoff.executedOperation === null ||
    packagedHandoff.executedOperation.trim().length === 0
  ) {
    blockedReasons.push(
      "DEV-263 executed operation is required."
    );
  } else {
    packageVerificationEvidence.push(
      "DEV-263 executed operation is present."
    );
  }

  if (
    packagedHandoff.approvedExecutionScope.length === 0
  ) {
    blockedReasons.push(
      "DEV-263 approved execution scope is required."
    );
  } else {
    packageVerificationEvidence.push(
      "DEV-263 approved execution scope is present."
    );
  }

  if (packagedHandoff.provenance.length === 0) {
    blockedReasons.push(
      "DEV-263 provenance is required."
    );
  } else {
    packageVerificationEvidence.push(
      "DEV-263 provenance is present."
    );
  }

  if (
    packagedHandoff.authorizationBoundaries.length === 0
  ) {
    blockedReasons.push(
      "DEV-263 authorization boundaries are required."
    );
  } else {
    packageVerificationEvidence.push(
      "DEV-263 authorization boundaries are present."
    );
  }

  if (
    packagedHandoff.scopeBoundaries.length === 0
  ) {
    blockedReasons.push(
      "DEV-263 scope boundaries are required."
    );
  } else {
    packageVerificationEvidence.push(
      "DEV-263 scope boundaries are present."
    );
  }

  if (
    packagedHandoff.verificationEvidence.length === 0
  ) {
    blockedReasons.push(
      "DEV-263 verification evidence is required."
    );
  } else {
    packageVerificationEvidence.push(
      "DEV-263 verification evidence is present."
    );
  }

  if (
    packagedHandoff.acceptanceEvidence.length === 0
  ) {
    blockedReasons.push(
      "DEV-263 acceptance evidence is required."
    );
  } else {
    packageVerificationEvidence.push(
      "DEV-263 acceptance evidence is present."
    );
  }

  if (
    packagedHandoff.packagingEvidence.length === 0
  ) {
    blockedReasons.push(
      "DEV-263 packaging evidence is required."
    );
  } else {
    packageVerificationEvidence.push(
      "DEV-263 packaging evidence is present."
    );
  }

  if (packagedHandoff.blockedReasons.length > 0) {
    blockedReasons.push(
      "DEV-263 package must contain no blocked reasons."
    );
  } else {
    packageVerificationEvidence.push(
      "DEV-263 package contains no blocked reasons."
    );
  }

  if (
    packagedHandoff.mayCreateExecutionAuthorization ||
    packagedHandoff.mayAuthorizeDownstreamAction ||
    packagedHandoff.mayDispatch ||
    packagedHandoff.mayInvokeExecutor ||
    packagedHandoff.mayExecuteOperation ||
    packagedHandoff.mayInvokeInspectionDependency ||
    packagedHandoff.mayRetryExecution ||
    packagedHandoff.mayPersistLifecycleState ||
    packagedHandoff.mayModifyRepository ||
    packagedHandoff.mayDeleteRepositoryContent ||
    packagedHandoff.mayStageRepositoryChanges ||
    packagedHandoff.mayCommit ||
    packagedHandoff.mayPush ||
    packagedHandoff.mayDeploy ||
    packagedHandoff.mayAccessSecrets ||
    packagedHandoff.mayExpandScope ||
    packagedHandoff.mayPerformArbitraryShellExecution ||
    packagedHandoff.mayPerformExternalSideEffects
  ) {
    blockedReasons.push(
      "DEV-263 package grants prohibited authority."
    );
  } else {
    packageVerificationEvidence.push(
      "DEV-263 prohibited authorities remain denied."
    );
  }

  if (
    !packagedHandoff.futureDownstreamBoundaryRequired
  ) {
    blockedReasons.push(
      "DEV-263 must require a future downstream boundary."
    );
  } else {
    packageVerificationEvidence.push(
      "DEV-263 requires a future downstream boundary."
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

    packageVerificationOnly:
      true,

    verificationResultIsInertData:
      true,

    verificationState:
      verified
        ? "PACKAGED_DOWNSTREAM_HANDOFF_VERIFIED"
        : "PACKAGED_DOWNSTREAM_HANDOFF_REJECTED",

    package:
      packagedHandoff,

    receiptState:
      verified
        ? packagedHandoff.receiptState
        : null,

    executedOperation:
      verified
        ? packagedHandoff.executedOperation
        : null,

    approvedExecutionScope:
      verified
        ? [...packagedHandoff.approvedExecutionScope]
        : [],

    provenance:
      verified
        ? [...packagedHandoff.provenance]
        : [],

    authorizationBoundaries:
      verified
        ? [...packagedHandoff.authorizationBoundaries]
        : [],

    scopeBoundaries:
      verified
        ? [...packagedHandoff.scopeBoundaries]
        : [],

    verificationEvidence:
      verified
        ? [...packagedHandoff.verificationEvidence]
        : [],

    acceptanceEvidence:
      verified
        ? [...packagedHandoff.acceptanceEvidence]
        : [],

    packagingEvidence:
      verified
        ? [...packagedHandoff.packagingEvidence]
        : [],

    packageVerificationEvidence:
      verified
        ? packageVerificationEvidence
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