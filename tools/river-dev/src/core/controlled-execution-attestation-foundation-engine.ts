import type {
  RiverDevControlledExecutionAttestationFoundationResult,
  RiverDevControlledExecutionAuditFoundationResult
} from "../types";

export interface RiverDevControlledExecutionAttestationFoundationInput {
  predecessor: RiverDevControlledExecutionAuditFoundationResult;
}

const denied = (
  reason: string
): RiverDevControlledExecutionAttestationFoundationResult => ({
  version: "DEV-283",

  trusted: false,
  ready: false,
  executionAttested: false,

  defaultPolicy: "DENY",

  controlledExecutionAttestationBoundaryOnly: true,
  executionAttestationResultIsDeterministicData: true,

  executionAttestationState: "CONTROLLED_EXECUTION_NOT_ATTESTED",

  controlledExecutionAudit: null,
  controlledExecutionArchive: null,
  controlledExecutionClosure: null,
  controlledExecutionFinalization: null,
  controlledExecutionCompletion: null,
  controlledOperationExecutionLifecycle: null,
  controlledOperationExecutionReceipt: null,
  controlledOperationExecution: null,
  operationExecutionAuthorization: null,
  controlledExecutorInvocation: null,
  controlledDispatch: null,
  dispatchAuthorization: null,
  activeAdmission: null,
  authorization: null,
  eligibility: null,
  consumption: null,
  receiptState: null,
  executedOperation: null,

  approvedExecutionScope: [],
  provenance: [],

  controlledDispatchEvidence: [],
  executorInvocationAuthorizationEvidence: [],
  controlledExecutorInvocationEvidence: [],
  operationExecutionAuthorizationEvidence: [],
  controlledOperationExecutionEvidence: [],
  controlledOperationExecutionReceiptEvidence: [],
  controlledOperationExecutionLifecycleEvidence: [],
  controlledExecutionCompletionEvidence: [],
  controlledExecutionFinalizationEvidence: [],
  controlledExecutionClosureEvidence: [],
  controlledExecutionArchiveEvidence: [],
  controlledExecutionAuditEvidence: [],
  controlledExecutionAttestationEvidence: [],

  blockedReasons: [reason],

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
  mayPerformExternalSideEffects: false,

  futureControlledExecutionVerificationBoundaryRequired: true
});

export const buildControlledExecutionAttestationFoundation = (
  input: RiverDevControlledExecutionAttestationFoundationInput
): RiverDevControlledExecutionAttestationFoundationResult => {
  const predecessor = input.predecessor;

  if (predecessor.version !== "DEV-282") {
    return denied("INVALID_DEV_282_VERSION");
  }

  if (!predecessor.trusted) {
    return denied("UNTRUSTED_DEV_282_PREDECESSOR");
  }

  if (!predecessor.ready) {
    return denied("UNREADY_DEV_282_PREDECESSOR");
  }

  if (!predecessor.executionAudited) {
    return denied("DEV_282_EXECUTION_NOT_AUDITED");
  }

  if (predecessor.defaultPolicy !== "DENY") {
    return denied("INVALID_DEV_282_DEFAULT_POLICY");
  }

  if (!predecessor.controlledExecutionAuditBoundaryOnly) {
    return denied("INVALID_DEV_282_AUDIT_BOUNDARY");
  }

  if (!predecessor.executionAuditResultIsDeterministicData) {
    return denied("NON_DETERMINISTIC_DEV_282_AUDIT_RESULT");
  }

  if (
    predecessor.executionAuditState !==
    "CONTROLLED_EXECUTION_AUDITED"
  ) {
    return denied("INVALID_DEV_282_AUDIT_STATE");
  }

  if (predecessor.controlledExecutionArchive === null) {
    return denied("MISSING_DEV_282_EXECUTION_ARCHIVE");
  }

  if (predecessor.controlledExecutionClosure === null) {
    return denied("MISSING_DEV_282_EXECUTION_CLOSURE");
  }

  if (predecessor.controlledExecutionFinalization === null) {
    return denied("MISSING_DEV_282_EXECUTION_FINALIZATION");
  }

  if (predecessor.controlledExecutionCompletion === null) {
    return denied("MISSING_DEV_282_EXECUTION_COMPLETION");
  }

  if (predecessor.controlledOperationExecutionLifecycle === null) {
    return denied("MISSING_DEV_282_EXECUTION_LIFECYCLE");
  }

  if (predecessor.controlledOperationExecutionReceipt === null) {
    return denied("MISSING_DEV_282_EXECUTION_RECEIPT");
  }

  if (predecessor.controlledOperationExecution === null) {
    return denied("MISSING_DEV_282_CONTROLLED_OPERATION_EXECUTION");
  }

  if (predecessor.operationExecutionAuthorization === null) {
    return denied("MISSING_DEV_282_OPERATION_EXECUTION_AUTHORIZATION");
  }

  if (predecessor.controlledExecutorInvocation === null) {
    return denied("MISSING_DEV_282_CONTROLLED_EXECUTOR_INVOCATION");
  }

  if (predecessor.controlledDispatch === null) {
    return denied("MISSING_DEV_282_CONTROLLED_DISPATCH");
  }

  if (predecessor.dispatchAuthorization === null) {
    return denied("MISSING_DEV_282_DISPATCH_AUTHORIZATION");
  }

  if (predecessor.activeAdmission === null) {
    return denied("MISSING_DEV_282_ACTIVE_ADMISSION");
  }

  if (predecessor.authorization === null) {
    return denied("MISSING_DEV_282_AUTHORIZATION");
  }

  if (predecessor.eligibility === null) {
    return denied("MISSING_DEV_282_ELIGIBILITY");
  }

  if (predecessor.consumption === null) {
    return denied("MISSING_DEV_282_CONSUMPTION");
  }

  if (predecessor.receiptState === null) {
    return denied("MISSING_DEV_282_RECEIPT_STATE");
  }

  if (predecessor.executedOperation === null) {
    return denied("MISSING_DEV_282_EXECUTED_OPERATION");
  }

  if (predecessor.approvedExecutionScope.length === 0) {
    return denied("EMPTY_DEV_282_APPROVED_EXECUTION_SCOPE");
  }

  if (predecessor.provenance.length === 0) {
    return denied("EMPTY_DEV_282_PROVENANCE");
  }

  if (predecessor.controlledDispatchEvidence.length === 0) {
    return denied("MISSING_DEV_282_CONTROLLED_DISPATCH_EVIDENCE");
  }

  if (
    predecessor.executorInvocationAuthorizationEvidence.length === 0
  ) {
    return denied(
      "MISSING_DEV_282_EXECUTOR_INVOCATION_AUTHORIZATION_EVIDENCE"
    );
  }

  if (predecessor.controlledExecutorInvocationEvidence.length === 0) {
    return denied(
      "MISSING_DEV_282_CONTROLLED_EXECUTOR_INVOCATION_EVIDENCE"
    );
  }

  if (
    predecessor.operationExecutionAuthorizationEvidence.length === 0
  ) {
    return denied(
      "MISSING_DEV_282_OPERATION_EXECUTION_AUTHORIZATION_EVIDENCE"
    );
  }

  if (predecessor.controlledOperationExecutionEvidence.length === 0) {
    return denied("MISSING_DEV_282_CONTROLLED_OPERATION_EXECUTION_EVIDENCE");
  }

  if (
    predecessor.controlledOperationExecutionReceiptEvidence.length === 0
  ) {
    return denied(
      "MISSING_DEV_282_CONTROLLED_OPERATION_EXECUTION_RECEIPT_EVIDENCE"
    );
  }

  if (
    predecessor.controlledOperationExecutionLifecycleEvidence.length === 0
  ) {
    return denied(
      "MISSING_DEV_282_CONTROLLED_OPERATION_EXECUTION_LIFECYCLE_EVIDENCE"
    );
  }

  if (predecessor.controlledExecutionCompletionEvidence.length === 0) {
    return denied("MISSING_DEV_282_EXECUTION_COMPLETION_EVIDENCE");
  }

  if (predecessor.controlledExecutionFinalizationEvidence.length === 0) {
    return denied("MISSING_DEV_282_EXECUTION_FINALIZATION_EVIDENCE");
  }

  if (predecessor.controlledExecutionClosureEvidence.length === 0) {
    return denied("MISSING_DEV_282_EXECUTION_CLOSURE_EVIDENCE");
  }

  if (predecessor.controlledExecutionArchiveEvidence.length === 0) {
    return denied("MISSING_DEV_282_EXECUTION_ARCHIVE_EVIDENCE");
  }

  if (predecessor.controlledExecutionAuditEvidence.length === 0) {
    return denied("MISSING_DEV_282_EXECUTION_AUDIT_EVIDENCE");
  }

  if (predecessor.blockedReasons.length !== 0) {
    return denied("BLOCKED_DEV_282_PREDECESSOR");
  }

  if (predecessor.mayCreateExecutionAuthorization) {
    return denied("DEV_282_EXECUTION_AUTHORIZATION_AUTHORITY_PRESENT");
  }

  if (predecessor.mayAuthorizeDownstreamAction) {
    return denied("DEV_282_DOWNSTREAM_AUTHORIZATION_AUTHORITY_PRESENT");
  }

  if (predecessor.mayAdmitIntoActiveExecutor) {
    return denied("DEV_282_EXECUTOR_ADMISSION_AUTHORITY_PRESENT");
  }

  if (predecessor.mayActivateAdmission) {
    return denied("DEV_282_ADMISSION_ACTIVATION_AUTHORITY_PRESENT");
  }

  if (predecessor.mayDispatch) {
    return denied("DEV_282_DISPATCH_AUTHORITY_PRESENT");
  }

  if (predecessor.mayInvokeExecutor) {
    return denied("DEV_282_EXECUTOR_AUTHORITY_PRESENT");
  }

  if (predecessor.mayExecuteOperation) {
    return denied("DEV_282_EXECUTION_AUTHORITY_PRESENT");
  }

  if (predecessor.mayInvokeInspectionDependency) {
    return denied("DEV_282_INSPECTION_DEPENDENCY_AUTHORITY_PRESENT");
  }

  if (predecessor.mayRetryExecution) {
    return denied("DEV_282_RETRY_AUTHORITY_PRESENT");
  }

  if (predecessor.mayPersistLifecycleState) {
    return denied("DEV_282_LIFECYCLE_PERSISTENCE_AUTHORITY_PRESENT");
  }

  if (predecessor.mayModifyRepository) {
    return denied("DEV_282_REPOSITORY_MUTATION_AUTHORITY_PRESENT");
  }

  if (predecessor.mayDeleteRepositoryContent) {
    return denied("DEV_282_REPOSITORY_DELETE_AUTHORITY_PRESENT");
  }

  if (predecessor.mayStageRepositoryChanges) {
    return denied("DEV_282_REPOSITORY_STAGING_AUTHORITY_PRESENT");
  }

  if (predecessor.mayCommit) {
    return denied("DEV_282_COMMIT_AUTHORITY_PRESENT");
  }

  if (predecessor.mayPush) {
    return denied("DEV_282_PUSH_AUTHORITY_PRESENT");
  }

  if (predecessor.mayDeploy) {
    return denied("DEV_282_DEPLOY_AUTHORITY_PRESENT");
  }

  if (predecessor.mayAccessSecrets) {
    return denied("DEV_282_SECRET_ACCESS_AUTHORITY_PRESENT");
  }

  if (predecessor.mayExpandScope) {
    return denied("DEV_282_SCOPE_EXPANSION_AUTHORITY_PRESENT");
  }

  if (predecessor.mayPerformArbitraryShellExecution) {
    return denied("DEV_282_ARBITRARY_SHELL_AUTHORITY_PRESENT");
  }

  if (predecessor.mayPerformNetworkExecution) {
    return denied("DEV_282_NETWORK_EXECUTION_AUTHORITY_PRESENT");
  }

  if (predecessor.mayPerformExternalSideEffects) {
    return denied("DEV_282_EXTERNAL_SIDE_EFFECT_AUTHORITY_PRESENT");
  }

  if (!predecessor.futureControlledExecutionAttestationBoundaryRequired) {
    return denied("MISSING_DEV_282_FUTURE_ATTESTATION_BOUNDARY");
  }

  return {
    version: "DEV-283",

    trusted: true,
    ready: true,
    executionAttested: true,

    defaultPolicy: "DENY",

    controlledExecutionAttestationBoundaryOnly: true,
    executionAttestationResultIsDeterministicData: true,

    executionAttestationState: "CONTROLLED_EXECUTION_ATTESTED",

    controlledExecutionAudit: predecessor,
    controlledExecutionArchive: predecessor.controlledExecutionArchive,
    controlledExecutionClosure: predecessor.controlledExecutionClosure,
    controlledExecutionFinalization:
      predecessor.controlledExecutionFinalization,
    controlledExecutionCompletion:
      predecessor.controlledExecutionCompletion,
    controlledOperationExecutionLifecycle:
      predecessor.controlledOperationExecutionLifecycle,
    controlledOperationExecutionReceipt:
      predecessor.controlledOperationExecutionReceipt,
    controlledOperationExecution:
      predecessor.controlledOperationExecution,
    operationExecutionAuthorization:
      predecessor.operationExecutionAuthorization,
    controlledExecutorInvocation:
      predecessor.controlledExecutorInvocation,
    controlledDispatch: predecessor.controlledDispatch,
    dispatchAuthorization: predecessor.dispatchAuthorization,
    activeAdmission: predecessor.activeAdmission,
    authorization: predecessor.authorization,
    eligibility: predecessor.eligibility,
    consumption: predecessor.consumption,
    receiptState: predecessor.receiptState,
    executedOperation: predecessor.executedOperation,

    approvedExecutionScope: [...predecessor.approvedExecutionScope],
    provenance: [...predecessor.provenance],

    controlledDispatchEvidence:
      [...predecessor.controlledDispatchEvidence],
    executorInvocationAuthorizationEvidence:
      [...predecessor.executorInvocationAuthorizationEvidence],
    controlledExecutorInvocationEvidence:
      [...predecessor.controlledExecutorInvocationEvidence],
    operationExecutionAuthorizationEvidence:
      [...predecessor.operationExecutionAuthorizationEvidence],
    controlledOperationExecutionEvidence:
      [...predecessor.controlledOperationExecutionEvidence],
    controlledOperationExecutionReceiptEvidence:
      [...predecessor.controlledOperationExecutionReceiptEvidence],
    controlledOperationExecutionLifecycleEvidence:
      [...predecessor.controlledOperationExecutionLifecycleEvidence],
    controlledExecutionCompletionEvidence:
      [...predecessor.controlledExecutionCompletionEvidence],
    controlledExecutionFinalizationEvidence:
      [...predecessor.controlledExecutionFinalizationEvidence],
    controlledExecutionClosureEvidence:
      [...predecessor.controlledExecutionClosureEvidence],
    controlledExecutionArchiveEvidence:
      [...predecessor.controlledExecutionArchiveEvidence],
    controlledExecutionAuditEvidence:
      [...predecessor.controlledExecutionAuditEvidence],
    controlledExecutionAttestationEvidence: [
      ...predecessor.controlledExecutionAuditEvidence,
      "DEV-283:CONTROLLED_EXECUTION_ATTESTED"
    ],

    blockedReasons: [],

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
    mayPerformExternalSideEffects: false,

    futureControlledExecutionVerificationBoundaryRequired: true
  };
};
