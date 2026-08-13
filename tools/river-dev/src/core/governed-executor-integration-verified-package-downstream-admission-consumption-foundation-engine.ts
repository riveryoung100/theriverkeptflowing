import type {
  RiverDevGovernedExecutorIntegrationVerifiedPackageDownstreamAdmissionFoundationResult,
  RiverDevGovernedExecutorIntegrationVerifiedPackageDownstreamAdmissionConsumptionFoundationResult
} from "../types";

const OBJECTIVE =
  "Consume an exact trusted DEV-299 governed executor integration verified-package downstream-admission result as inert data without creating downstream authority.";

const SUCCESS_EVIDENCE =
  "DEV-300 accepted exact trusted DEV-299 downstream admission for inert consumption.";

const authorityInherited = (
  admission: RiverDevGovernedExecutorIntegrationVerifiedPackageDownstreamAdmissionFoundationResult
): boolean =>
  admission.mayCreateExecutionAuthorization !== false ||
  admission.mayAuthorizeDownstreamAction !== false ||
  admission.mayDispatch !== false ||
  admission.mayInvokeExecutor !== false ||
  admission.mayExecuteOperation !== false ||
  admission.mayInvokeInspectionDependency !== false ||
  admission.mayRetryExecution !== false ||
  admission.mayPersistLifecycleState !== false ||
  admission.mayModifyRepository !== false ||
  admission.mayDeleteRepositoryContent !== false ||
  admission.mayStageRepositoryChanges !== false ||
  admission.mayCommit !== false ||
  admission.mayPush !== false ||
  admission.mayDeploy !== false ||
  admission.mayAccessSecrets !== false ||
  admission.mayExpandScope !== false ||
  admission.mayPerformArbitraryShellExecution !== false ||
  admission.mayPerformExternalSideEffects !== false;

const missingEvidence = (
  admission: RiverDevGovernedExecutorIntegrationVerifiedPackageDownstreamAdmissionFoundationResult
): boolean =>
  admission.predecessorVerificationEvidence.length === 0 ||
  admission.predecessorAcceptanceEvidence.length === 0 ||
  admission.predecessorHandoffEvidence.length === 0 ||
  admission.verificationEvidence.length === 0 ||
  admission.acceptanceEvidence.length === 0 ||
  admission.packagingEvidence.length === 0 ||
  admission.packageVerificationEvidence.length === 0 ||
  admission.admissionEvidence.length === 0;

export const consumeGovernedExecutorIntegrationVerifiedPackageDownstreamAdmission = (
  admission: RiverDevGovernedExecutorIntegrationVerifiedPackageDownstreamAdmissionFoundationResult
): RiverDevGovernedExecutorIntegrationVerifiedPackageDownstreamAdmissionConsumptionFoundationResult => {
  const blockedReasons: string[] = [];

  if (admission.version !== "DEV-299") {
    blockedReasons.push("DEV-299 predecessor identity is invalid.");
  }

  if (!admission.trusted) {
    blockedReasons.push("DEV-299 predecessor is not trusted.");
  }

  if (!admission.ready) {
    blockedReasons.push("DEV-299 predecessor is not ready.");
  }

  if (!admission.admissionEligible) {
    blockedReasons.push("DEV-299 predecessor is admission-ineligible.");
  }

  if (
    admission.admissionState !==
    "GOVERNED_EXECUTOR_INTEGRATION_VERIFIED_PACKAGE_ADMISSION_ELIGIBLE"
  ) {
    blockedReasons.push("DEV-299 admission state is not eligible.");
  }

  if (admission.blockedReasons.length !== 0) {
    blockedReasons.push("DEV-299 predecessor contains blocked reasons.");
  }

  if (missingEvidence(admission)) {
    blockedReasons.push("DEV-299 evidence continuity is incomplete.");
  }

  if (authorityInherited(admission)) {
    blockedReasons.push("DEV-299 predecessor contains inherited authority.");
  }

  const consumed = blockedReasons.length === 0;

  return {
    version: "DEV-300",
    source:
      "governed-executor-integration-verified-package-downstream-admission-consumption-foundation-engine",

    objective: OBJECTIVE,

    trusted: consumed,
    ready: consumed,
    consumed,

    defaultPolicy: "DENY",
    admissionConsumptionDecisionOnly: true,
    consumptionResultIsInertData: true,
    futureActiveAdmissionEligibilityBoundaryRequired: true,

    consumptionState: consumed
      ? "GOVERNED_EXECUTOR_INTEGRATION_VERIFIED_PACKAGE_ADMISSION_CONSUMPTION_ACCEPTED"
      : "GOVERNED_EXECUTOR_INTEGRATION_VERIFIED_PACKAGE_ADMISSION_CONSUMPTION_REJECTED",

    admission,
    verification: admission.verification,

    predecessorVerificationState: [
      ...admission.predecessorVerificationState
    ],
    predecessorVerificationEvidence: [
      ...admission.predecessorVerificationEvidence
    ],
    predecessorAcceptanceEvidence: [
      ...admission.predecessorAcceptanceEvidence
    ],
    predecessorHandoffEvidence: [
      ...admission.predecessorHandoffEvidence
    ],

    verificationEvidence: [
      ...admission.verificationEvidence
    ],
    acceptanceEvidence: [
      ...admission.acceptanceEvidence
    ],
    packagingEvidence: [
      ...admission.packagingEvidence
    ],
    packageVerificationEvidence: [
      ...admission.packageVerificationEvidence
    ],
    admissionEvidence: [
      ...admission.admissionEvidence
    ],
    consumptionEvidence: consumed
      ? [SUCCESS_EVIDENCE]
      : [],

    blockedReasons,

    mayCreateExecutionAuthorization: false,
    mayAuthorizeDownstreamAction: false,
    mayAdmitIntoActiveExecutor: false,
    mayActivateAdmission: false,
    mayDispatch: false,
    mayInvokeExecutor: false,
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
    mayPerformNetworkExecution: false,
    mayPerformExternalSideEffects: false
  };
};
