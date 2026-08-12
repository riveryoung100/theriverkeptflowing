import type {
  RiverDevControlledExecutionIntegrityFoundationResult,
  RiverDevControlledExecutionSealFoundationResult
} from "../types";

export interface RiverDevControlledExecutionIntegrityFoundationInput {
  predecessor: RiverDevControlledExecutionSealFoundationResult;
}

const denied = (
  reason: string
): RiverDevControlledExecutionIntegrityFoundationResult => ({
  version: "DEV-287",

  trusted: false,
  ready: false,
  executionIntegrityEstablished: false,

  defaultPolicy: "DENY",

  controlledExecutionIntegrityBoundaryOnly: true,
  executionIntegrityResultIsDeterministicData: true,

  executionIntegrityState:
    "CONTROLLED_EXECUTION_INTEGRITY_NOT_ESTABLISHED",

  controlledExecutionSeal: null,
  controlledExecutionCertification: null,
  controlledExecutionVerification: null,
  controlledExecutionAttestation: null,
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
  controlledExecutionVerificationEvidence: [],
  controlledExecutionCertificationEvidence: [],
  controlledExecutionSealEvidence: [],
  controlledExecutionIntegrityEvidence: [],

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

  futureControlledExecutionIntegrityVerificationBoundaryRequired: true
});

export const buildControlledExecutionIntegrityFoundation = (
  input: RiverDevControlledExecutionIntegrityFoundationInput
): RiverDevControlledExecutionIntegrityFoundationResult => {
  const predecessor = input.predecessor;

  if (predecessor.version !== "DEV-286") {
    return denied("INVALID_DEV_286_VERSION");
  }

  if (!predecessor.trusted) {
    return denied("UNTRUSTED_DEV_286_PREDECESSOR");
  }

  if (!predecessor.ready) {
    return denied("UNREADY_DEV_286_PREDECESSOR");
  }

  if (!predecessor.executionSealed) {
    return denied("DEV_286_EXECUTION_NOT_SEALED");
  }

  if (predecessor.defaultPolicy !== "DENY") {
    return denied("INVALID_DEV_286_DEFAULT_POLICY");
  }

  if (!predecessor.controlledExecutionSealBoundaryOnly) {
    return denied("INVALID_DEV_286_SEAL_BOUNDARY");
  }

  if (!predecessor.executionSealResultIsDeterministicData) {
    return denied("NON_DETERMINISTIC_DEV_286_SEAL_RESULT");
  }

  if (
    predecessor.executionSealState !==
    "CONTROLLED_EXECUTION_SEALED"
  ) {
    return denied("INVALID_DEV_286_SEAL_STATE");
  }

  if (predecessor.controlledExecutionCertification === null) {
    return denied("MISSING_DEV_286_EXECUTION_CERTIFICATION");
  }

  if (predecessor.controlledExecutionVerification === null) {
    return denied("MISSING_DEV_286_EXECUTION_VERIFICATION");
  }

  if (predecessor.controlledExecutionAttestation === null) {
    return denied("MISSING_DEV_286_EXECUTION_ATTESTATION");
  }

  if (predecessor.controlledExecutionAudit === null) {
    return denied("MISSING_DEV_286_EXECUTION_AUDIT");
  }

  if (predecessor.controlledExecutionArchive === null) {
    return denied("MISSING_DEV_286_EXECUTION_ARCHIVE");
  }

  if (predecessor.controlledExecutionClosure === null) {
    return denied("MISSING_DEV_286_EXECUTION_CLOSURE");
  }

  if (predecessor.controlledExecutionFinalization === null) {
    return denied("MISSING_DEV_286_EXECUTION_FINALIZATION");
  }

  if (predecessor.controlledExecutionCompletion === null) {
    return denied("MISSING_DEV_286_EXECUTION_COMPLETION");
  }

  if (predecessor.controlledOperationExecutionLifecycle === null) {
    return denied("MISSING_DEV_286_EXECUTION_LIFECYCLE");
  }

  if (predecessor.controlledOperationExecutionReceipt === null) {
    return denied("MISSING_DEV_286_EXECUTION_RECEIPT");
  }

  if (predecessor.controlledOperationExecution === null) {
    return denied(
      "MISSING_DEV_286_CONTROLLED_OPERATION_EXECUTION"
    );
  }

  if (predecessor.operationExecutionAuthorization === null) {
    return denied(
      "MISSING_DEV_286_OPERATION_EXECUTION_AUTHORIZATION"
    );
  }

  if (predecessor.controlledExecutorInvocation === null) {
    return denied(
      "MISSING_DEV_286_CONTROLLED_EXECUTOR_INVOCATION"
    );
  }

  if (predecessor.controlledDispatch === null) {
    return denied("MISSING_DEV_286_CONTROLLED_DISPATCH");
  }

  if (predecessor.dispatchAuthorization === null) {
    return denied("MISSING_DEV_286_DISPATCH_AUTHORIZATION");
  }

  if (predecessor.activeAdmission === null) {
    return denied("MISSING_DEV_286_ACTIVE_ADMISSION");
  }

  if (predecessor.authorization === null) {
    return denied("MISSING_DEV_286_AUTHORIZATION");
  }

  if (predecessor.eligibility === null) {
    return denied("MISSING_DEV_286_ELIGIBILITY");
  }

  if (predecessor.consumption === null) {
    return denied("MISSING_DEV_286_CONSUMPTION");
  }

  if (predecessor.receiptState === null) {
    return denied("MISSING_DEV_286_RECEIPT_STATE");
  }

  if (predecessor.executedOperation === null) {
    return denied("MISSING_DEV_286_EXECUTED_OPERATION");
  }

  if (predecessor.approvedExecutionScope.length === 0) {
    return denied("EMPTY_DEV_286_APPROVED_EXECUTION_SCOPE");
  }

  if (predecessor.provenance.length === 0) {
    return denied("EMPTY_DEV_286_PROVENANCE");
  }

  const evidenceChecks: Array<
    [string[], string]
  > = [
    [
      predecessor.controlledDispatchEvidence,
      "MISSING_DEV_286_CONTROLLED_DISPATCH_EVIDENCE"
    ],
    [
      predecessor.executorInvocationAuthorizationEvidence,
      "MISSING_DEV_286_EXECUTOR_INVOCATION_AUTHORIZATION_EVIDENCE"
    ],
    [
      predecessor.controlledExecutorInvocationEvidence,
      "MISSING_DEV_286_CONTROLLED_EXECUTOR_INVOCATION_EVIDENCE"
    ],
    [
      predecessor.operationExecutionAuthorizationEvidence,
      "MISSING_DEV_286_OPERATION_EXECUTION_AUTHORIZATION_EVIDENCE"
    ],
    [
      predecessor.controlledOperationExecutionEvidence,
      "MISSING_DEV_286_CONTROLLED_OPERATION_EXECUTION_EVIDENCE"
    ],
    [
      predecessor.controlledOperationExecutionReceiptEvidence,
      "MISSING_DEV_286_CONTROLLED_OPERATION_EXECUTION_RECEIPT_EVIDENCE"
    ],
    [
      predecessor.controlledOperationExecutionLifecycleEvidence,
      "MISSING_DEV_286_CONTROLLED_OPERATION_EXECUTION_LIFECYCLE_EVIDENCE"
    ],
    [
      predecessor.controlledExecutionCompletionEvidence,
      "MISSING_DEV_286_EXECUTION_COMPLETION_EVIDENCE"
    ],
    [
      predecessor.controlledExecutionFinalizationEvidence,
      "MISSING_DEV_286_EXECUTION_FINALIZATION_EVIDENCE"
    ],
    [
      predecessor.controlledExecutionClosureEvidence,
      "MISSING_DEV_286_EXECUTION_CLOSURE_EVIDENCE"
    ],
    [
      predecessor.controlledExecutionArchiveEvidence,
      "MISSING_DEV_286_EXECUTION_ARCHIVE_EVIDENCE"
    ],
    [
      predecessor.controlledExecutionAuditEvidence,
      "MISSING_DEV_286_EXECUTION_AUDIT_EVIDENCE"
    ],
    [
      predecessor.controlledExecutionAttestationEvidence,
      "MISSING_DEV_286_EXECUTION_ATTESTATION_EVIDENCE"
    ],
    [
      predecessor.controlledExecutionVerificationEvidence,
      "MISSING_DEV_286_EXECUTION_VERIFICATION_EVIDENCE"
    ],
    [
      predecessor.controlledExecutionCertificationEvidence,
      "MISSING_DEV_286_EXECUTION_CERTIFICATION_EVIDENCE"
    ],
    [
      predecessor.controlledExecutionSealEvidence,
      "MISSING_DEV_286_EXECUTION_SEAL_EVIDENCE"
    ]
  ];

  for (const [evidence, reason] of evidenceChecks) {
    if (evidence.length === 0) {
      return denied(reason);
    }
  }

  if (predecessor.blockedReasons.length !== 0) {
    return denied("BLOCKED_DEV_286_PREDECESSOR");
  }

  const authorityChecks: Array<
    [boolean, string]
  > = [
    [
      predecessor.mayCreateExecutionAuthorization,
      "DEV_286_EXECUTION_AUTHORIZATION_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayAuthorizeDownstreamAction,
      "DEV_286_DOWNSTREAM_AUTHORIZATION_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayAdmitIntoActiveExecutor,
      "DEV_286_EXECUTOR_ADMISSION_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayActivateAdmission,
      "DEV_286_ADMISSION_ACTIVATION_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayDispatch,
      "DEV_286_DISPATCH_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayInvokeExecutor,
      "DEV_286_EXECUTOR_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayExecuteOperation,
      "DEV_286_EXECUTION_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayInvokeInspectionDependency,
      "DEV_286_INSPECTION_DEPENDENCY_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayRetryExecution,
      "DEV_286_RETRY_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayPersistLifecycleState,
      "DEV_286_LIFECYCLE_PERSISTENCE_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayModifyRepository,
      "DEV_286_REPOSITORY_MUTATION_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayDeleteRepositoryContent,
      "DEV_286_REPOSITORY_DELETE_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayStageRepositoryChanges,
      "DEV_286_REPOSITORY_STAGING_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayCommit,
      "DEV_286_COMMIT_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayPush,
      "DEV_286_PUSH_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayDeploy,
      "DEV_286_DEPLOY_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayAccessSecrets,
      "DEV_286_SECRET_ACCESS_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayExpandScope,
      "DEV_286_SCOPE_EXPANSION_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayPerformArbitraryShellExecution,
      "DEV_286_ARBITRARY_SHELL_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayPerformNetworkExecution,
      "DEV_286_NETWORK_EXECUTION_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayPerformExternalSideEffects,
      "DEV_286_EXTERNAL_SIDE_EFFECT_AUTHORITY_PRESENT"
    ]
  ];

  for (const [authorityPresent, reason] of authorityChecks) {
    if (authorityPresent) {
      return denied(reason);
    }
  }

  if (!predecessor.futureControlledExecutionIntegrityBoundaryRequired) {
    return denied(
      "MISSING_DEV_286_FUTURE_INTEGRITY_BOUNDARY"
    );
  }

  return {
    version: "DEV-287",

    trusted: true,
    ready: true,
    executionIntegrityEstablished: true,

    defaultPolicy: "DENY",

    controlledExecutionIntegrityBoundaryOnly: true,
    executionIntegrityResultIsDeterministicData: true,

    executionIntegrityState:
      "CONTROLLED_EXECUTION_INTEGRITY_ESTABLISHED",

    controlledExecutionSeal: predecessor,
    controlledExecutionCertification:
      predecessor.controlledExecutionCertification,
    controlledExecutionVerification:
      predecessor.controlledExecutionVerification,
    controlledExecutionAttestation:
      predecessor.controlledExecutionAttestation,
    controlledExecutionAudit:
      predecessor.controlledExecutionAudit,
    controlledExecutionArchive:
      predecessor.controlledExecutionArchive,
    controlledExecutionClosure:
      predecessor.controlledExecutionClosure,
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
    controlledDispatch:
      predecessor.controlledDispatch,
    dispatchAuthorization:
      predecessor.dispatchAuthorization,
    activeAdmission:
      predecessor.activeAdmission,
    authorization:
      predecessor.authorization,
    eligibility:
      predecessor.eligibility,
    consumption:
      predecessor.consumption,
    receiptState:
      predecessor.receiptState,
    executedOperation:
      predecessor.executedOperation,

    approvedExecutionScope:
      [...predecessor.approvedExecutionScope],

    provenance:
      [...predecessor.provenance],

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

    controlledExecutionAttestationEvidence:
      [...predecessor.controlledExecutionAttestationEvidence],

    controlledExecutionVerificationEvidence:
      [...predecessor.controlledExecutionVerificationEvidence],

    controlledExecutionCertificationEvidence:
      [...predecessor.controlledExecutionCertificationEvidence],

    controlledExecutionSealEvidence:
      [...predecessor.controlledExecutionSealEvidence],

    controlledExecutionIntegrityEvidence: [
      ...predecessor.controlledExecutionSealEvidence,
      "DEV-287:CONTROLLED_EXECUTION_INTEGRITY_ESTABLISHED"
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

    futureControlledExecutionIntegrityVerificationBoundaryRequired: true
  };
};
