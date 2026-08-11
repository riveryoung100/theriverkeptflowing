import type {
  RiverDevControlledExecutorPackagedDownstreamHandoffVerificationFoundationResult,
  RiverDevControlledExecutorVerifiedPackageDownstreamAdmissionFoundationResult
} from "../types";

const VERSION = "DEV-265" as const;

const SOURCE =
  "controlled-executor-verified-package-downstream-admission-foundation-engine" as const;

const OBJECTIVE =
  "Determine whether a verified inert DEV-264 package-verification result is eligible for admission to a future downstream boundary without granting downstream action or execution authority.";

const RECOGNIZED_RECEIPT_STATES = new Set([
  "EXECUTION_SUCCEEDED",
  "EXECUTION_FAILED",
  "EXECUTION_NOT_ATTEMPTED"
]);

export interface EvaluateControlledExecutorVerifiedPackageDownstreamAdmissionFoundationInput {
  readonly verification:
    RiverDevControlledExecutorPackagedDownstreamHandoffVerificationFoundationResult;
}

export function evaluateControlledExecutorVerifiedPackageDownstreamAdmissionFoundation(
  input:
    EvaluateControlledExecutorVerifiedPackageDownstreamAdmissionFoundationInput
):
RiverDevControlledExecutorVerifiedPackageDownstreamAdmissionFoundationResult {
  const verification =
    input.verification;

  const blockedReasons: string[] =
    [];

  const admissionEvidence: string[] =
    [];

  if (verification.version !== "DEV-264") {
    blockedReasons.push(
      "DEV-264 verification version is required."
    );
  } else {
    admissionEvidence.push(
      "DEV-264 verification version is exact."
    );
  }

  if (!verification.trusted) {
    blockedReasons.push(
      "DEV-264 verification must be trusted."
    );
  } else {
    admissionEvidence.push(
      "DEV-264 verification is trusted."
    );
  }

  if (!verification.ready) {
    blockedReasons.push(
      "DEV-264 verification must be ready."
    );
  } else {
    admissionEvidence.push(
      "DEV-264 verification is ready."
    );
  }

  if (!verification.verified) {
    blockedReasons.push(
      "DEV-264 verification must be verified."
    );
  } else {
    admissionEvidence.push(
      "DEV-264 verification is verified."
    );
  }

  if (verification.defaultPolicy !== "DENY") {
    blockedReasons.push(
      "DEV-264 verification must remain DENY-by-default."
    );
  } else {
    admissionEvidence.push(
      "DEV-264 default policy remains DENY."
    );
  }

  if (!verification.packageVerificationOnly) {
    blockedReasons.push(
      "DEV-264 must remain package-verification-only."
    );
  } else {
    admissionEvidence.push(
      "DEV-264 remains package-verification-only."
    );
  }

  if (!verification.verificationResultIsInertData) {
    blockedReasons.push(
      "DEV-264 verification result must remain inert data."
    );
  } else {
    admissionEvidence.push(
      "DEV-264 verification result remains inert data."
    );
  }

  if (
    verification.verificationState !==
    "PACKAGED_DOWNSTREAM_HANDOFF_VERIFIED"
  ) {
    blockedReasons.push(
      "DEV-264 verification state must be PACKAGED_DOWNSTREAM_HANDOFF_VERIFIED."
    );
  } else {
    admissionEvidence.push(
      "DEV-264 verification state is verified."
    );
  }

  if (
    verification.package === null ||
    verification.package === undefined
  ) {
    blockedReasons.push(
      "DEV-264 preserved package is required."
    );
  } else {
    admissionEvidence.push(
      "DEV-264 preserved package is present."
    );
  }

  if (
    verification.receiptState === null ||
    !RECOGNIZED_RECEIPT_STATES.has(
      verification.receiptState
    )
  ) {
    blockedReasons.push(
      "DEV-264 receipt state must be recognized."
    );
  } else {
    admissionEvidence.push(
      "DEV-264 receipt state is recognized."
    );
  }

  if (
    verification.executedOperation === null ||
    verification.executedOperation.trim().length === 0
  ) {
    blockedReasons.push(
      "DEV-264 executed operation is required."
    );
  } else {
    admissionEvidence.push(
      "DEV-264 executed operation is present."
    );
  }

  if (
    verification.approvedExecutionScope.length === 0
  ) {
    blockedReasons.push(
      "DEV-264 approved execution scope is required."
    );
  } else {
    admissionEvidence.push(
      "DEV-264 approved execution scope is present."
    );
  }

  if (verification.provenance.length === 0) {
    blockedReasons.push(
      "DEV-264 provenance is required."
    );
  } else {
    admissionEvidence.push(
      "DEV-264 provenance is present."
    );
  }

  if (
    verification.authorizationBoundaries.length === 0
  ) {
    blockedReasons.push(
      "DEV-264 authorization boundaries are required."
    );
  } else {
    admissionEvidence.push(
      "DEV-264 authorization boundaries are present."
    );
  }

  if (
    verification.scopeBoundaries.length === 0
  ) {
    blockedReasons.push(
      "DEV-264 scope boundaries are required."
    );
  } else {
    admissionEvidence.push(
      "DEV-264 scope boundaries are present."
    );
  }

  if (
    verification.verificationEvidence.length === 0
  ) {
    blockedReasons.push(
      "DEV-264 verification evidence is required."
    );
  } else {
    admissionEvidence.push(
      "DEV-264 verification evidence is present."
    );
  }

  if (
    verification.acceptanceEvidence.length === 0
  ) {
    blockedReasons.push(
      "DEV-264 acceptance evidence is required."
    );
  } else {
    admissionEvidence.push(
      "DEV-264 acceptance evidence is present."
    );
  }

  if (
    verification.packagingEvidence.length === 0
  ) {
    blockedReasons.push(
      "DEV-264 packaging evidence is required."
    );
  } else {
    admissionEvidence.push(
      "DEV-264 packaging evidence is present."
    );
  }

  if (
    verification.packageVerificationEvidence.length === 0
  ) {
    blockedReasons.push(
      "DEV-264 package verification evidence is required."
    );
  } else {
    admissionEvidence.push(
      "DEV-264 package verification evidence is present."
    );
  }

  if (verification.blockedReasons.length > 0) {
    blockedReasons.push(
      "DEV-264 verification must contain no blocked reasons."
    );
  } else {
    admissionEvidence.push(
      "DEV-264 verification contains no blocked reasons."
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
      "DEV-264 verification grants prohibited authority."
    );
  } else {
    admissionEvidence.push(
      "DEV-264 prohibited authorities remain denied."
    );
  }

  if (
    !verification.futureDownstreamBoundaryRequired
  ) {
    blockedReasons.push(
      "DEV-264 must require a future downstream boundary."
    );
  } else {
    admissionEvidence.push(
      "DEV-264 requires a future downstream boundary."
    );
  }

  const admissionEligible =
    blockedReasons.length === 0;

  return {
    version:
      VERSION,

    source:
      SOURCE,

    objective:
      OBJECTIVE,

    trusted:
      admissionEligible,

    ready:
      admissionEligible,

    admissionEligible,

    defaultPolicy:
      "DENY",

    downstreamAdmissionEligibilityOnly:
      true,

    admissionResultIsInertData:
      true,

    admissionState:
      admissionEligible
        ? "VERIFIED_PACKAGE_ADMISSION_ELIGIBLE"
        : "VERIFIED_PACKAGE_ADMISSION_REJECTED",

    verification,

    receiptState:
      admissionEligible
        ? verification.receiptState
        : null,

    executedOperation:
      admissionEligible
        ? verification.executedOperation
        : null,

    approvedExecutionScope:
      admissionEligible
        ? [...verification.approvedExecutionScope]
        : [],

    provenance:
      admissionEligible
        ? [...verification.provenance]
        : [],

    authorizationBoundaries:
      admissionEligible
        ? [...verification.authorizationBoundaries]
        : [],

    scopeBoundaries:
      admissionEligible
        ? [...verification.scopeBoundaries]
        : [],

    verificationEvidence:
      admissionEligible
        ? [...verification.verificationEvidence]
        : [],

    acceptanceEvidence:
      admissionEligible
        ? [...verification.acceptanceEvidence]
        : [],

    packagingEvidence:
      admissionEligible
        ? [...verification.packagingEvidence]
        : [],

    packageVerificationEvidence:
      admissionEligible
        ? [...verification.packageVerificationEvidence]
        : [],

    admissionEvidence:
      admissionEligible
        ? admissionEvidence
        : [],

    blockedReasons,

    mayCreateExecutionAuthorization:
      false,

    mayAuthorizeDownstreamAction:
      false,

    mayAdmitIntoActiveExecutor:
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

    futureDownstreamAdmissionConsumptionBoundaryRequired:
      true
  };
}