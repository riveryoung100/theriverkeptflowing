import type {
  RiverDevControlledExecutorVerifiedPackageDownstreamAdmissionFoundationResult,
  RiverDevControlledExecutorVerifiedPackageDownstreamAdmissionConsumptionFoundationResult
} from "../types";

const VERSION = "DEV-266" as const;

const SOURCE =
  "controlled-executor-verified-package-downstream-admission-consumption-foundation-engine" as const;

const OBJECTIVE =
  "Consume a DEV-265 downstream-admission eligibility result as inert data and determine whether that result is valid for construction of a future downstream admission-consumption artifact without granting active admission or execution authority.";

const RECOGNIZED_RECEIPT_STATES = new Set([
  "EXECUTION_SUCCEEDED",
  "EXECUTION_FAILED",
  "EXECUTION_NOT_ATTEMPTED"
]);

export interface EvaluateControlledExecutorVerifiedPackageDownstreamAdmissionConsumptionFoundationInput {
  readonly admission:
    RiverDevControlledExecutorVerifiedPackageDownstreamAdmissionFoundationResult;
}

export function evaluateControlledExecutorVerifiedPackageDownstreamAdmissionConsumptionFoundation(
  input:
    EvaluateControlledExecutorVerifiedPackageDownstreamAdmissionConsumptionFoundationInput
):
RiverDevControlledExecutorVerifiedPackageDownstreamAdmissionConsumptionFoundationResult {
  const admission =
    input.admission;

  const blockedReasons: string[] =
    [];

  const consumptionEvidence: string[] =
    [];

  if (admission.version !== "DEV-265") {
    blockedReasons.push(
      "DEV-265 admission version is required."
    );
  } else {
    consumptionEvidence.push(
      "DEV-265 admission version is exact."
    );
  }

  if (!admission.trusted) {
    blockedReasons.push(
      "DEV-265 admission result must be trusted."
    );
  } else {
    consumptionEvidence.push(
      "DEV-265 admission result is trusted."
    );
  }

  if (!admission.ready) {
    blockedReasons.push(
      "DEV-265 admission result must be ready."
    );
  } else {
    consumptionEvidence.push(
      "DEV-265 admission result is ready."
    );
  }

  if (!admission.admissionEligible) {
    blockedReasons.push(
      "DEV-265 admission result must be eligible."
    );
  } else {
    consumptionEvidence.push(
      "DEV-265 admission result is eligible."
    );
  }

  if (admission.defaultPolicy !== "DENY") {
    blockedReasons.push(
      "DEV-265 admission must remain DENY-by-default."
    );
  } else {
    consumptionEvidence.push(
      "DEV-265 default policy remains DENY."
    );
  }

  if (!admission.downstreamAdmissionEligibilityOnly) {
    blockedReasons.push(
      "DEV-265 must remain admission-eligibility-only."
    );
  } else {
    consumptionEvidence.push(
      "DEV-265 remains admission-eligibility-only."
    );
  }

  if (!admission.admissionResultIsInertData) {
    blockedReasons.push(
      "DEV-265 admission result must remain inert data."
    );
  } else {
    consumptionEvidence.push(
      "DEV-265 admission result remains inert data."
    );
  }

  if (
    admission.admissionState !==
    "VERIFIED_PACKAGE_ADMISSION_ELIGIBLE"
  ) {
    blockedReasons.push(
      "DEV-265 admission state must be VERIFIED_PACKAGE_ADMISSION_ELIGIBLE."
    );
  } else {
    consumptionEvidence.push(
      "DEV-265 admission state is eligible."
    );
  }

  if (
    admission.verification === null ||
    admission.verification === undefined
  ) {
    blockedReasons.push(
      "DEV-265 preserved DEV-264 verification is required."
    );
  } else {
    consumptionEvidence.push(
      "DEV-265 preserved DEV-264 verification is present."
    );
  }

  if (
    admission.receiptState === null ||
    !RECOGNIZED_RECEIPT_STATES.has(
      admission.receiptState
    )
  ) {
    blockedReasons.push(
      "DEV-265 receipt state must be recognized."
    );
  } else {
    consumptionEvidence.push(
      "DEV-265 receipt state is recognized."
    );
  }

  if (
    admission.executedOperation === null ||
    admission.executedOperation.trim().length === 0
  ) {
    blockedReasons.push(
      "DEV-265 executed operation is required."
    );
  } else {
    consumptionEvidence.push(
      "DEV-265 executed operation is present."
    );
  }

  if (
    admission.approvedExecutionScope.length === 0
  ) {
    blockedReasons.push(
      "DEV-265 approved execution scope is required."
    );
  } else {
    consumptionEvidence.push(
      "DEV-265 approved execution scope is present."
    );
  }

  if (admission.provenance.length === 0) {
    blockedReasons.push(
      "DEV-265 provenance is required."
    );
  } else {
    consumptionEvidence.push(
      "DEV-265 provenance is present."
    );
  }

  if (
    admission.authorizationBoundaries.length === 0
  ) {
    blockedReasons.push(
      "DEV-265 authorization boundaries are required."
    );
  } else {
    consumptionEvidence.push(
      "DEV-265 authorization boundaries are present."
    );
  }

  if (
    admission.scopeBoundaries.length === 0
  ) {
    blockedReasons.push(
      "DEV-265 scope boundaries are required."
    );
  } else {
    consumptionEvidence.push(
      "DEV-265 scope boundaries are present."
    );
  }

  if (
    admission.verificationEvidence.length === 0
  ) {
    blockedReasons.push(
      "DEV-265 verification evidence is required."
    );
  } else {
    consumptionEvidence.push(
      "DEV-265 verification evidence is present."
    );
  }

  if (
    admission.acceptanceEvidence.length === 0
  ) {
    blockedReasons.push(
      "DEV-265 acceptance evidence is required."
    );
  } else {
    consumptionEvidence.push(
      "DEV-265 acceptance evidence is present."
    );
  }

  if (
    admission.packagingEvidence.length === 0
  ) {
    blockedReasons.push(
      "DEV-265 packaging evidence is required."
    );
  } else {
    consumptionEvidence.push(
      "DEV-265 packaging evidence is present."
    );
  }

  if (
    admission.packageVerificationEvidence.length === 0
  ) {
    blockedReasons.push(
      "DEV-265 package verification evidence is required."
    );
  } else {
    consumptionEvidence.push(
      "DEV-265 package verification evidence is present."
    );
  }

  if (
    admission.admissionEvidence.length === 0
  ) {
    blockedReasons.push(
      "DEV-265 admission evidence is required."
    );
  } else {
    consumptionEvidence.push(
      "DEV-265 admission evidence is present."
    );
  }

  if (admission.blockedReasons.length > 0) {
    blockedReasons.push(
      "DEV-265 admission result must contain no blocked reasons."
    );
  } else {
    consumptionEvidence.push(
      "DEV-265 admission result contains no blocked reasons."
    );
  }

  if (
    admission.mayCreateExecutionAuthorization ||
    admission.mayAuthorizeDownstreamAction ||
    admission.mayAdmitIntoActiveExecutor ||
    admission.mayDispatch ||
    admission.mayInvokeExecutor ||
    admission.mayExecuteOperation ||
    admission.mayInvokeInspectionDependency ||
    admission.mayRetryExecution ||
    admission.mayPersistLifecycleState ||
    admission.mayModifyRepository ||
    admission.mayDeleteRepositoryContent ||
    admission.mayStageRepositoryChanges ||
    admission.mayCommit ||
    admission.mayPush ||
    admission.mayDeploy ||
    admission.mayAccessSecrets ||
    admission.mayExpandScope ||
    admission.mayPerformArbitraryShellExecution ||
    admission.mayPerformExternalSideEffects
  ) {
    blockedReasons.push(
      "DEV-265 admission result grants prohibited authority."
    );
  } else {
    consumptionEvidence.push(
      "DEV-265 prohibited authorities remain denied."
    );
  }

  if (
    !admission.futureDownstreamAdmissionConsumptionBoundaryRequired
  ) {
    blockedReasons.push(
      "DEV-265 must require a future admission-consumption boundary."
    );
  } else {
    consumptionEvidence.push(
      "DEV-265 requires a future admission-consumption boundary."
    );
  }

  const consumable =
    blockedReasons.length === 0;

  return {
    version:
      VERSION,

    source:
      SOURCE,

    objective:
      OBJECTIVE,

    trusted:
      consumable,

    ready:
      consumable,

    consumable,

    defaultPolicy:
      "DENY",

    admissionConsumptionDecisionOnly:
      true,

    consumptionResultIsInertData:
      true,

    consumptionState:
      consumable
        ? "ADMISSION_CONSUMPTION_ACCEPTED"
        : "ADMISSION_CONSUMPTION_REJECTED",

    admission,

    receiptState:
      consumable
        ? admission.receiptState
        : null,

    executedOperation:
      consumable
        ? admission.executedOperation
        : null,

    approvedExecutionScope:
      consumable
        ? [...admission.approvedExecutionScope]
        : [],

    provenance:
      consumable
        ? [...admission.provenance]
        : [],

    authorizationBoundaries:
      consumable
        ? [...admission.authorizationBoundaries]
        : [],

    scopeBoundaries:
      consumable
        ? [...admission.scopeBoundaries]
        : [],

    verificationEvidence:
      consumable
        ? [...admission.verificationEvidence]
        : [],

    acceptanceEvidence:
      consumable
        ? [...admission.acceptanceEvidence]
        : [],

    packagingEvidence:
      consumable
        ? [...admission.packagingEvidence]
        : [],

    packageVerificationEvidence:
      consumable
        ? [...admission.packageVerificationEvidence]
        : [],

    admissionEvidence:
      consumable
        ? [...admission.admissionEvidence]
        : [],

    consumptionEvidence:
      consumable
        ? consumptionEvidence
        : [],

    blockedReasons,

    mayCreateExecutionAuthorization:
      false,

    mayAuthorizeDownstreamAction:
      false,

    mayAdmitIntoActiveExecutor:
      false,

    mayActivateAdmission:
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

    futureActiveAdmissionBoundaryRequired:
      true
  };
}