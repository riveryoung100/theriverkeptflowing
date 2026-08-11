import type {
  RiverDevControlledExecutorActiveAdmissionAuthorizationFoundationResult,
  RiverDevControlledExecutorActiveAdmissionFoundationResult,
} from "../types";

const VERSION = "DEV-269" as const;

const EMPTY: readonly string[] = Object.freeze([]);

function nonEmpty(values: readonly string[]): boolean {
  return values.length > 0;
}

function reject(
  blockedReasons: readonly string[],
): RiverDevControlledExecutorActiveAdmissionFoundationResult {
  return {
    version: VERSION,
    trusted: false,
    ready: false,
    admitted: false,
    defaultPolicy: "DENY",
    controlledActiveAdmissionOnly: true,
    admissionState: "ACTIVE_ADMISSION_REJECTED",
    authorization: null,
    eligibility: null,
    consumption: null,
    receiptState: null,
    executedOperation: null,
    approvedExecutionScope: EMPTY,
    provenance: EMPTY,
    authorizationBoundaries: EMPTY,
    scopeBoundaries: EMPTY,
    verificationEvidence: EMPTY,
    acceptanceEvidence: EMPTY,
    packagingEvidence: EMPTY,
    packageVerificationEvidence: EMPTY,
    admissionEvidence: EMPTY,
    consumptionEvidence: EMPTY,
    activeAdmissionEligibilityEvidence: EMPTY,
    activeAdmissionAuthorizationEvidence: EMPTY,
    controlledActiveAdmissionEvidence: EMPTY,
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
    mayPerformExternalSideEffects: false,
    futureDispatchAuthorizationBoundaryRequired: true,
  };
}

export function establishControlledExecutorActiveAdmissionFoundation(
  authorization:
    RiverDevControlledExecutorActiveAdmissionAuthorizationFoundationResult,
): RiverDevControlledExecutorActiveAdmissionFoundationResult {
  const blockedReasons: string[] = [];

  if (authorization.version !== "DEV-268") {
    blockedReasons.push("DEV-268 authorization version is required");
  }

  if (!authorization.trusted) {
    blockedReasons.push("authorization must be trusted");
  }

  if (!authorization.ready) {
    blockedReasons.push("authorization must be ready");
  }

  if (!authorization.authorized) {
    blockedReasons.push("authorization must be authorized");
  }

  if (authorization.defaultPolicy !== "DENY") {
    blockedReasons.push("authorization default policy must remain DENY");
  }

  if (!authorization.activeAdmissionAuthorizationDecisionOnly) {
    blockedReasons.push(
      "authorization must remain an active-admission authorization decision only",
    );
  }

  if (!authorization.authorizationResultIsInertData) {
    blockedReasons.push("authorization result must remain inert data");
  }

  if (
    authorization.authorizationState !==
    "ACTIVE_ADMISSION_AUTHORIZED"
  ) {
    blockedReasons.push(
      "ACTIVE_ADMISSION_AUTHORIZED predecessor state is required",
    );
  }

  if (authorization.eligibility === null) {
    blockedReasons.push("DEV-267 eligibility lineage is required");
  }

  if (authorization.consumption === null) {
    blockedReasons.push("DEV-266 consumption lineage is required");
  }

  if (authorization.receiptState === null) {
    blockedReasons.push("receipt state lineage is required");
  }

  if (authorization.executedOperation === null) {
    blockedReasons.push("executed operation lineage is required");
  }

  if (!nonEmpty(authorization.approvedExecutionScope)) {
    blockedReasons.push("approved execution scope is required");
  }

  if (!nonEmpty(authorization.provenance)) {
    blockedReasons.push("provenance is required");
  }

  if (!nonEmpty(authorization.authorizationBoundaries)) {
    blockedReasons.push("authorization boundaries are required");
  }

  if (!nonEmpty(authorization.scopeBoundaries)) {
    blockedReasons.push("scope boundaries are required");
  }

  if (!nonEmpty(authorization.verificationEvidence)) {
    blockedReasons.push("verification evidence is required");
  }

  if (!nonEmpty(authorization.acceptanceEvidence)) {
    blockedReasons.push("acceptance evidence is required");
  }

  if (!nonEmpty(authorization.packagingEvidence)) {
    blockedReasons.push("packaging evidence is required");
  }

  if (!nonEmpty(authorization.packageVerificationEvidence)) {
    blockedReasons.push("package verification evidence is required");
  }

  if (!nonEmpty(authorization.admissionEvidence)) {
    blockedReasons.push("admission evidence is required");
  }

  if (!nonEmpty(authorization.consumptionEvidence)) {
    blockedReasons.push("consumption evidence is required");
  }

  if (!nonEmpty(authorization.activeAdmissionEligibilityEvidence)) {
    blockedReasons.push("active-admission eligibility evidence is required");
  }

  if (!nonEmpty(authorization.activeAdmissionAuthorizationEvidence)) {
    blockedReasons.push(
      "active-admission authorization evidence is required",
    );
  }

  if (authorization.blockedReasons.length !== 0) {
    blockedReasons.push("authorized predecessor must have no blocked reasons");
  }

  const predecessorAuthorities = [
    authorization.mayCreateExecutionAuthorization,
    authorization.mayAuthorizeDownstreamAction,
    authorization.mayAdmitIntoActiveExecutor,
    authorization.mayActivateAdmission,
    authorization.mayDispatch,
    authorization.mayInvokeExecutor,
    authorization.mayExecuteOperation,
    authorization.mayInvokeInspectionDependency,
    authorization.mayRetryExecution,
    authorization.mayPersistLifecycleState,
    authorization.mayModifyRepository,
    authorization.mayDeleteRepositoryContent,
    authorization.mayStageRepositoryChanges,
    authorization.mayCommit,
    authorization.mayPush,
    authorization.mayDeploy,
    authorization.mayAccessSecrets,
    authorization.mayExpandScope,
    authorization.mayPerformArbitraryShellExecution,
    authorization.mayPerformExternalSideEffects,
  ];

  if (predecessorAuthorities.some(Boolean)) {
    blockedReasons.push(
      "DEV-268 predecessor must grant no execution or mutation authority",
    );
  }

  if (!authorization.futureActiveAdmissionBoundaryRequired) {
    blockedReasons.push(
      "DEV-268 active-admission boundary requirement must be preserved",
    );
  }

  if (blockedReasons.length > 0) {
    return reject(Object.freeze([...blockedReasons]));
  }

  const controlledActiveAdmissionEvidence = Object.freeze([
    ...authorization.activeAdmissionAuthorizationEvidence,
    "DEV-269:AUTHORIZED_PREDECESSOR_VALIDATED",
    "DEV-269:CONTROLLED_ACTIVE_ADMISSION_ACCEPTED",
    "DEV-269:DISPATCH_AUTHORITY_NOT_GRANTED",
    "DEV-269:EXECUTOR_INVOCATION_AUTHORITY_NOT_GRANTED",
    "DEV-269:EXECUTION_AUTHORITY_NOT_GRANTED",
  ]);

  return {
    version: VERSION,
    trusted: true,
    ready: true,
    admitted: true,
    defaultPolicy: "DENY",
    controlledActiveAdmissionOnly: true,
    admissionState: "ACTIVE_ADMISSION_ACCEPTED",
    authorization,
    eligibility: authorization.eligibility,
    consumption: authorization.consumption,
    receiptState: authorization.receiptState,
    executedOperation: authorization.executedOperation,
    approvedExecutionScope: authorization.approvedExecutionScope,
    provenance: authorization.provenance,
    authorizationBoundaries: authorization.authorizationBoundaries,
    scopeBoundaries: authorization.scopeBoundaries,
    verificationEvidence: authorization.verificationEvidence,
    acceptanceEvidence: authorization.acceptanceEvidence,
    packagingEvidence: authorization.packagingEvidence,
    packageVerificationEvidence: authorization.packageVerificationEvidence,
    admissionEvidence: authorization.admissionEvidence,
    consumptionEvidence: authorization.consumptionEvidence,
    activeAdmissionEligibilityEvidence:
      authorization.activeAdmissionEligibilityEvidence,
    activeAdmissionAuthorizationEvidence:
      authorization.activeAdmissionAuthorizationEvidence,
    controlledActiveAdmissionEvidence,
    blockedReasons: EMPTY,
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
    mayPerformExternalSideEffects: false,
    futureDispatchAuthorizationBoundaryRequired: true,
  };
}
