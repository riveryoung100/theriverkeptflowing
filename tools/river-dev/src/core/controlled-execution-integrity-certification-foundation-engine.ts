import type {
  RiverDevControlledExecutionIntegrityCertificationFoundationResult,
  RiverDevControlledExecutionIntegrityVerificationFoundationResult
} from "../types";


export interface BuildControlledExecutionIntegrityCertificationFoundationInput {
  predecessor:
    RiverDevControlledExecutionIntegrityVerificationFoundationResult;
}


const authorityFields = [
  "mayCreateExecutionAuthorization",
  "mayAuthorizeDownstreamAction",
  "mayAdmitIntoActiveExecutor",
  "mayActivateAdmission",
  "mayDispatch",
  "mayInvokeExecutor",
  "mayExecuteOperation",
  "mayInvokeInspectionDependency",
  "mayRetryExecution",
  "mayPersistLifecycleState",
  "mayModifyRepository",
  "mayDeleteRepositoryContent",
  "mayStageRepositoryChanges",
  "mayCommit",
  "mayPush",
  "mayDeploy",
  "mayAccessSecrets",
  "mayExpandScope",
  "mayPerformArbitraryShellExecution",
  "mayPerformNetworkExecution",
  "mayPerformExternalSideEffects"
] as const;


const deniedResult = (
  blockedReason: string
): RiverDevControlledExecutionIntegrityCertificationFoundationResult => ({
  version: "DEV-289",

  trusted: false,
  ready: false,
  executionIntegrityCertified: false,

  defaultPolicy: "DENY",

  controlledExecutionIntegrityCertificationBoundaryOnly: true,
  executionIntegrityCertificationResultIsDeterministicData: true,

  executionIntegrityCertificationState:
    "CONTROLLED_EXECUTION_INTEGRITY_NOT_CERTIFIED",

  controlledExecutionIntegrityVerification: null,
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
  controlledExecutionIntegrityCertificationEvidence: [],

  blockedReasons: [blockedReason],

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

});


export const buildControlledExecutionIntegrityCertificationFoundation = (
  input: BuildControlledExecutionIntegrityCertificationFoundationInput
): RiverDevControlledExecutionIntegrityCertificationFoundationResult => {

  const predecessor = input.predecessor;

  if (predecessor.version !== "DEV-288") {
    return deniedResult("INVALID_DEV_288_VERSION");
  }

  if (!predecessor.trusted) {
    return deniedResult("UNTRUSTED_DEV_288_PREDECESSOR");
  }

  if (!predecessor.ready) {
    return deniedResult("UNREADY_DEV_288_PREDECESSOR");
  }

  if (!predecessor.executionIntegrityVerified) {
    return deniedResult("DEV_288_EXECUTION_INTEGRITY_NOT_VERIFIED");
  }

  if (predecessor.defaultPolicy !== "DENY") {
    return deniedResult("INVALID_DEV_288_DEFAULT_POLICY");
  }

  if (
    predecessor.controlledExecutionIntegrityVerificationBoundaryOnly !== true
  ) {
    return deniedResult("INVALID_DEV_288_INTEGRITY_VERIFICATION_BOUNDARY");
  }

  if (
    predecessor.executionIntegrityVerificationResultIsDeterministicData !== true
  ) {
    return deniedResult(
      "NON_DETERMINISTIC_DEV_288_INTEGRITY_VERIFICATION_RESULT"
    );
  }

  if (
    predecessor.executionIntegrityVerificationState !==
    "CONTROLLED_EXECUTION_INTEGRITY_VERIFIED"
  ) {
    return deniedResult("INVALID_DEV_288_INTEGRITY_VERIFICATION_STATE");
  }

  if (!predecessor.controlledExecutionIntegrity) {
    return deniedResult("MISSING_DEV_288_CONTROLLED_EXECUTION_INTEGRITY");
  }

  const requiredObjects = [
    ["controlledExecutionSeal", "MISSING_DEV_288_EXECUTION_SEAL"],
    [
      "controlledExecutionCertification",
      "MISSING_DEV_288_EXECUTION_CERTIFICATION"
    ],
    [
      "controlledExecutionVerification",
      "MISSING_DEV_288_EXECUTION_VERIFICATION"
    ],
    [
      "controlledExecutionAttestation",
      "MISSING_DEV_288_EXECUTION_ATTESTATION"
    ],
    ["controlledExecutionAudit", "MISSING_DEV_288_EXECUTION_AUDIT"],
    ["controlledExecutionArchive", "MISSING_DEV_288_EXECUTION_ARCHIVE"],
    ["controlledExecutionClosure", "MISSING_DEV_288_EXECUTION_CLOSURE"],
    [
      "controlledExecutionFinalization",
      "MISSING_DEV_288_EXECUTION_FINALIZATION"
    ],
    [
      "controlledExecutionCompletion",
      "MISSING_DEV_288_EXECUTION_COMPLETION"
    ],
    [
      "controlledOperationExecutionLifecycle",
      "MISSING_DEV_288_EXECUTION_LIFECYCLE"
    ],
    [
      "controlledOperationExecutionReceipt",
      "MISSING_DEV_288_EXECUTION_RECEIPT"
    ],
    [
      "controlledOperationExecution",
      "MISSING_DEV_288_CONTROLLED_OPERATION_EXECUTION"
    ],
    [
      "operationExecutionAuthorization",
      "MISSING_DEV_288_OPERATION_EXECUTION_AUTHORIZATION"
    ],
    [
      "controlledExecutorInvocation",
      "MISSING_DEV_288_CONTROLLED_EXECUTOR_INVOCATION"
    ],
    ["controlledDispatch", "MISSING_DEV_288_CONTROLLED_DISPATCH"],
    [
      "dispatchAuthorization",
      "MISSING_DEV_288_DISPATCH_AUTHORIZATION"
    ],
    ["activeAdmission", "MISSING_DEV_288_ACTIVE_ADMISSION"],
    ["authorization", "MISSING_DEV_288_AUTHORIZATION"],
    ["eligibility", "MISSING_DEV_288_ELIGIBILITY"],
    ["consumption", "MISSING_DEV_288_CONSUMPTION"],
    ["receiptState", "MISSING_DEV_288_RECEIPT_STATE"],
    ["executedOperation", "MISSING_DEV_288_EXECUTED_OPERATION"]
  ] as const;

  for (const [property, reason] of requiredObjects) {
    if (
      (predecessor as unknown as Record<string, unknown>)[property] ==
      null
    ) {
      return deniedResult(reason);
    }
  }

  if (predecessor.approvedExecutionScope.length === 0) {
    return deniedResult("EMPTY_DEV_288_APPROVED_EXECUTION_SCOPE");
  }

  if (predecessor.provenance.length === 0) {
    return deniedResult("EMPTY_DEV_288_PROVENANCE");
  }

  const requiredEvidence = [
    [
      "controlledDispatchEvidence",
      "MISSING_DEV_288_CONTROLLED_DISPATCH_EVIDENCE"
    ],
    [
      "executorInvocationAuthorizationEvidence",
      "MISSING_DEV_288_EXECUTOR_INVOCATION_AUTHORIZATION_EVIDENCE"
    ],
    [
      "controlledExecutorInvocationEvidence",
      "MISSING_DEV_288_CONTROLLED_EXECUTOR_INVOCATION_EVIDENCE"
    ],
    [
      "operationExecutionAuthorizationEvidence",
      "MISSING_DEV_288_OPERATION_EXECUTION_AUTHORIZATION_EVIDENCE"
    ],
    [
      "controlledOperationExecutionEvidence",
      "MISSING_DEV_288_CONTROLLED_OPERATION_EXECUTION_EVIDENCE"
    ],
    [
      "controlledOperationExecutionReceiptEvidence",
      "MISSING_DEV_288_CONTROLLED_OPERATION_EXECUTION_RECEIPT_EVIDENCE"
    ],
    [
      "controlledOperationExecutionLifecycleEvidence",
      "MISSING_DEV_288_CONTROLLED_OPERATION_EXECUTION_LIFECYCLE_EVIDENCE"
    ],
    [
      "controlledExecutionCompletionEvidence",
      "MISSING_DEV_288_EXECUTION_COMPLETION_EVIDENCE"
    ],
    [
      "controlledExecutionFinalizationEvidence",
      "MISSING_DEV_288_EXECUTION_FINALIZATION_EVIDENCE"
    ],
    [
      "controlledExecutionClosureEvidence",
      "MISSING_DEV_288_EXECUTION_CLOSURE_EVIDENCE"
    ],
    [
      "controlledExecutionArchiveEvidence",
      "MISSING_DEV_288_EXECUTION_ARCHIVE_EVIDENCE"
    ],
    [
      "controlledExecutionAuditEvidence",
      "MISSING_DEV_288_EXECUTION_AUDIT_EVIDENCE"
    ],
    [
      "controlledExecutionAttestationEvidence",
      "MISSING_DEV_288_EXECUTION_ATTESTATION_EVIDENCE"
    ],
    [
      "controlledExecutionVerificationEvidence",
      "MISSING_DEV_288_EXECUTION_VERIFICATION_EVIDENCE"
    ],
    [
      "controlledExecutionCertificationEvidence",
      "MISSING_DEV_288_EXECUTION_CERTIFICATION_EVIDENCE"
    ],
    [
      "controlledExecutionSealEvidence",
      "MISSING_DEV_288_EXECUTION_SEAL_EVIDENCE"
    ],
    [
      "controlledExecutionIntegrityEvidence",
      "MISSING_DEV_288_EXECUTION_INTEGRITY_EVIDENCE"
    ],
    [
      "controlledExecutionIntegrityVerificationEvidence",
      "MISSING_DEV_288_EXECUTION_INTEGRITY_VERIFICATION_EVIDENCE"
    ]
  ] as const;

  for (const [property, reason] of requiredEvidence) {
    const evidence =
      (predecessor as unknown as Record<string, unknown>)[property];

    if (!Array.isArray(evidence) || evidence.length === 0) {
      return deniedResult(reason);
    }
  }

  if (predecessor.blockedReasons.length !== 0) {
    return deniedResult("BLOCKED_DEV_288_PREDECESSOR");
  }

  for (const property of authorityFields) {
    if (
      (predecessor as unknown as Record<string, unknown>)[property] !==
      false
    ) {
      return deniedResult(`DEV_288_AUTHORITY_PRESENT:${property}`);
    }
  }

  if (
    predecessor.futureControlledExecutionIntegrityCertificationBoundaryRequired
    !== true
  ) {
    return deniedResult(
      "MISSING_DEV_288_FUTURE_INTEGRITY_CERTIFICATION_BOUNDARY"
    );
  }

  return {
    version: "DEV-289",

    trusted: true,
    ready: true,
    executionIntegrityCertified: true,

    defaultPolicy: "DENY",

    controlledExecutionIntegrityCertificationBoundaryOnly: true,
    executionIntegrityCertificationResultIsDeterministicData: true,

    executionIntegrityCertificationState:
      "CONTROLLED_EXECUTION_INTEGRITY_CERTIFIED",

    controlledExecutionIntegrityVerification:
      predecessor,
    controlledExecutionIntegrity: predecessor.controlledExecutionIntegrity,

    controlledExecutionSeal:
      predecessor.controlledExecutionSeal,

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

    controlledExecutionIntegrityVerificationEvidence:
      [...predecessor.controlledExecutionIntegrityVerificationEvidence],

    controlledExecutionIntegrityCertificationEvidence: [
      ...predecessor.controlledExecutionIntegrityVerificationEvidence,
      "DEV-289:CONTROLLED_EXECUTION_INTEGRITY_CERTIFIED"
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

  };
};
