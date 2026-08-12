import type {
  RiverDevControlledExecutionIntegrityFoundationResult,
  RiverDevControlledExecutionIntegrityVerificationFoundationResult
} from "../types";

export interface RiverDevControlledExecutionIntegrityVerificationFoundationInput {
  predecessor: RiverDevControlledExecutionIntegrityFoundationResult;
}

const denied = (
  reason: string
): RiverDevControlledExecutionIntegrityVerificationFoundationResult => ({
  version: "DEV-288",

  trusted: false,
  ready: false,
  executionIntegrityVerified: false,

  defaultPolicy: "DENY",

  controlledExecutionIntegrityVerificationBoundaryOnly: true,
  executionIntegrityVerificationResultIsDeterministicData: true,

  executionIntegrityVerificationState:
    "CONTROLLED_EXECUTION_INTEGRITY_NOT_VERIFIED",

  controlledExecutionIntegrity: null,
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
  controlledExecutionIntegrityVerificationEvidence: [],

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

  futureControlledExecutionIntegrityCertificationBoundaryRequired: true
});

export const buildControlledExecutionIntegrityVerificationFoundation = (
  input: RiverDevControlledExecutionIntegrityVerificationFoundationInput
): RiverDevControlledExecutionIntegrityVerificationFoundationResult => {
  const predecessor = input.predecessor;

  if (predecessor.version !== "DEV-287") {
    return denied("INVALID_DEV_287_VERSION");
  }

  if (!predecessor.trusted) {
    return denied("UNTRUSTED_DEV_287_PREDECESSOR");
  }

  if (!predecessor.ready) {
    return denied("UNREADY_DEV_287_PREDECESSOR");
  }

  if (!predecessor.executionIntegrityEstablished) {
    return denied("DEV_287_EXECUTION_INTEGRITY_NOT_ESTABLISHED");
  }

  if (predecessor.defaultPolicy !== "DENY") {
    return denied("INVALID_DEV_287_DEFAULT_POLICY");
  }

  if (!predecessor.controlledExecutionIntegrityBoundaryOnly) {
    return denied("INVALID_DEV_287_INTEGRITY_BOUNDARY");
  }

  if (!predecessor.executionIntegrityResultIsDeterministicData) {
    return denied("NON_DETERMINISTIC_DEV_287_INTEGRITY_RESULT");
  }

  if (
    predecessor.executionIntegrityState !==
    "CONTROLLED_EXECUTION_INTEGRITY_ESTABLISHED"
  ) {
    return denied("INVALID_DEV_287_INTEGRITY_STATE");
  }

  const requiredObjects: Array<
    [unknown, string]
  > = [
    [
      predecessor.controlledExecutionSeal,
      "MISSING_DEV_287_EXECUTION_SEAL"
    ],
    [
      predecessor.controlledExecutionCertification,
      "MISSING_DEV_287_EXECUTION_CERTIFICATION"
    ],
    [
      predecessor.controlledExecutionVerification,
      "MISSING_DEV_287_EXECUTION_VERIFICATION"
    ],
    [
      predecessor.controlledExecutionAttestation,
      "MISSING_DEV_287_EXECUTION_ATTESTATION"
    ],
    [
      predecessor.controlledExecutionAudit,
      "MISSING_DEV_287_EXECUTION_AUDIT"
    ],
    [
      predecessor.controlledExecutionArchive,
      "MISSING_DEV_287_EXECUTION_ARCHIVE"
    ],
    [
      predecessor.controlledExecutionClosure,
      "MISSING_DEV_287_EXECUTION_CLOSURE"
    ],
    [
      predecessor.controlledExecutionFinalization,
      "MISSING_DEV_287_EXECUTION_FINALIZATION"
    ],
    [
      predecessor.controlledExecutionCompletion,
      "MISSING_DEV_287_EXECUTION_COMPLETION"
    ],
    [
      predecessor.controlledOperationExecutionLifecycle,
      "MISSING_DEV_287_EXECUTION_LIFECYCLE"
    ],
    [
      predecessor.controlledOperationExecutionReceipt,
      "MISSING_DEV_287_EXECUTION_RECEIPT"
    ],
    [
      predecessor.controlledOperationExecution,
      "MISSING_DEV_287_CONTROLLED_OPERATION_EXECUTION"
    ],
    [
      predecessor.operationExecutionAuthorization,
      "MISSING_DEV_287_OPERATION_EXECUTION_AUTHORIZATION"
    ],
    [
      predecessor.controlledExecutorInvocation,
      "MISSING_DEV_287_CONTROLLED_EXECUTOR_INVOCATION"
    ],
    [
      predecessor.controlledDispatch,
      "MISSING_DEV_287_CONTROLLED_DISPATCH"
    ],
    [
      predecessor.dispatchAuthorization,
      "MISSING_DEV_287_DISPATCH_AUTHORIZATION"
    ],
    [
      predecessor.activeAdmission,
      "MISSING_DEV_287_ACTIVE_ADMISSION"
    ],
    [
      predecessor.authorization,
      "MISSING_DEV_287_AUTHORIZATION"
    ],
    [
      predecessor.eligibility,
      "MISSING_DEV_287_ELIGIBILITY"
    ],
    [
      predecessor.consumption,
      "MISSING_DEV_287_CONSUMPTION"
    ],
    [
      predecessor.receiptState,
      "MISSING_DEV_287_RECEIPT_STATE"
    ],
    [
      predecessor.executedOperation,
      "MISSING_DEV_287_EXECUTED_OPERATION"
    ]
  ];

  for (const [value, reason] of requiredObjects) {
    if (value === null) {
      return denied(reason);
    }
  }

  if (predecessor.approvedExecutionScope.length === 0) {
    return denied("EMPTY_DEV_287_APPROVED_EXECUTION_SCOPE");
  }

  if (predecessor.provenance.length === 0) {
    return denied("EMPTY_DEV_287_PROVENANCE");
  }

  const evidenceChecks: Array<
    [string[], string]
  > = [
    [
      predecessor.controlledDispatchEvidence,
      "MISSING_DEV_287_CONTROLLED_DISPATCH_EVIDENCE"
    ],
    [
      predecessor.executorInvocationAuthorizationEvidence,
      "MISSING_DEV_287_EXECUTOR_INVOCATION_AUTHORIZATION_EVIDENCE"
    ],
    [
      predecessor.controlledExecutorInvocationEvidence,
      "MISSING_DEV_287_CONTROLLED_EXECUTOR_INVOCATION_EVIDENCE"
    ],
    [
      predecessor.operationExecutionAuthorizationEvidence,
      "MISSING_DEV_287_OPERATION_EXECUTION_AUTHORIZATION_EVIDENCE"
    ],
    [
      predecessor.controlledOperationExecutionEvidence,
      "MISSING_DEV_287_CONTROLLED_OPERATION_EXECUTION_EVIDENCE"
    ],
    [
      predecessor.controlledOperationExecutionReceiptEvidence,
      "MISSING_DEV_287_CONTROLLED_OPERATION_EXECUTION_RECEIPT_EVIDENCE"
    ],
    [
      predecessor.controlledOperationExecutionLifecycleEvidence,
      "MISSING_DEV_287_CONTROLLED_OPERATION_EXECUTION_LIFECYCLE_EVIDENCE"
    ],
    [
      predecessor.controlledExecutionCompletionEvidence,
      "MISSING_DEV_287_EXECUTION_COMPLETION_EVIDENCE"
    ],
    [
      predecessor.controlledExecutionFinalizationEvidence,
      "MISSING_DEV_287_EXECUTION_FINALIZATION_EVIDENCE"
    ],
    [
      predecessor.controlledExecutionClosureEvidence,
      "MISSING_DEV_287_EXECUTION_CLOSURE_EVIDENCE"
    ],
    [
      predecessor.controlledExecutionArchiveEvidence,
      "MISSING_DEV_287_EXECUTION_ARCHIVE_EVIDENCE"
    ],
    [
      predecessor.controlledExecutionAuditEvidence,
      "MISSING_DEV_287_EXECUTION_AUDIT_EVIDENCE"
    ],
    [
      predecessor.controlledExecutionAttestationEvidence,
      "MISSING_DEV_287_EXECUTION_ATTESTATION_EVIDENCE"
    ],
    [
      predecessor.controlledExecutionVerificationEvidence,
      "MISSING_DEV_287_EXECUTION_VERIFICATION_EVIDENCE"
    ],
    [
      predecessor.controlledExecutionCertificationEvidence,
      "MISSING_DEV_287_EXECUTION_CERTIFICATION_EVIDENCE"
    ],
    [
      predecessor.controlledExecutionSealEvidence,
      "MISSING_DEV_287_EXECUTION_SEAL_EVIDENCE"
    ],
    [
      predecessor.controlledExecutionIntegrityEvidence,
      "MISSING_DEV_287_EXECUTION_INTEGRITY_EVIDENCE"
    ]
  ];

  for (const [evidence, reason] of evidenceChecks) {
    if (evidence.length === 0) {
      return denied(reason);
    }
  }

  if (predecessor.blockedReasons.length !== 0) {
    return denied("BLOCKED_DEV_287_PREDECESSOR");
  }

  const authorityChecks: Array<
    [boolean, string]
  > = [
    [
      predecessor.mayCreateExecutionAuthorization,
      "DEV_287_EXECUTION_AUTHORIZATION_CREATION_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayAuthorizeDownstreamAction,
      "DEV_287_DOWNSTREAM_AUTHORIZATION_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayAdmitIntoActiveExecutor,
      "DEV_287_ACTIVE_EXECUTOR_ADMISSION_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayActivateAdmission,
      "DEV_287_ADMISSION_ACTIVATION_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayDispatch,
      "DEV_287_DISPATCH_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayInvokeExecutor,
      "DEV_287_EXECUTOR_INVOCATION_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayExecuteOperation,
      "DEV_287_OPERATION_EXECUTION_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayInvokeInspectionDependency,
      "DEV_287_INSPECTION_DEPENDENCY_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayRetryExecution,
      "DEV_287_EXECUTION_RETRY_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayPersistLifecycleState,
      "DEV_287_LIFECYCLE_PERSISTENCE_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayModifyRepository,
      "DEV_287_REPOSITORY_MODIFICATION_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayDeleteRepositoryContent,
      "DEV_287_REPOSITORY_DELETION_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayStageRepositoryChanges,
      "DEV_287_REPOSITORY_STAGING_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayCommit,
      "DEV_287_COMMIT_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayPush,
      "DEV_287_PUSH_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayDeploy,
      "DEV_287_DEPLOY_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayAccessSecrets,
      "DEV_287_SECRET_ACCESS_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayExpandScope,
      "DEV_287_SCOPE_EXPANSION_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayPerformArbitraryShellExecution,
      "DEV_287_ARBITRARY_SHELL_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayPerformNetworkExecution,
      "DEV_287_NETWORK_EXECUTION_AUTHORITY_PRESENT"
    ],
    [
      predecessor.mayPerformExternalSideEffects,
      "DEV_287_EXTERNAL_SIDE_EFFECT_AUTHORITY_PRESENT"
    ]
  ];

  for (const [authorityPresent, reason] of authorityChecks) {
    if (authorityPresent) {
      return denied(reason);
    }
  }

  if (
    !predecessor
      .futureControlledExecutionIntegrityVerificationBoundaryRequired
  ) {
    return denied(
      "MISSING_DEV_287_FUTURE_INTEGRITY_VERIFICATION_BOUNDARY"
    );
  }

  return {
    version: "DEV-288",

    trusted: true,
    ready: true,
    executionIntegrityVerified: true,

    defaultPolicy: "DENY",

    controlledExecutionIntegrityVerificationBoundaryOnly: true,
    executionIntegrityVerificationResultIsDeterministicData: true,

    executionIntegrityVerificationState:
      "CONTROLLED_EXECUTION_INTEGRITY_VERIFIED",

    controlledExecutionIntegrity: predecessor,
    controlledExecutionSeal: predecessor.controlledExecutionSeal,
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

    controlledExecutionIntegrityEvidence:
      [...predecessor.controlledExecutionIntegrityEvidence],

    controlledExecutionIntegrityVerificationEvidence: [
      ...predecessor.controlledExecutionIntegrityEvidence,
      "DEV-288:CONTROLLED_EXECUTION_INTEGRITY_VERIFIED"
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

    futureControlledExecutionIntegrityCertificationBoundaryRequired: true
  };
};
