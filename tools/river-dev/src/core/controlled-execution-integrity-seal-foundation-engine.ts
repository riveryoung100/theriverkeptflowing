import type {
  RiverDevControlledExecutionIntegrityCertificationFoundationResult,
  RiverDevControlledExecutionIntegritySealFoundationResult
} from "../types";

export interface RiverDevControlledExecutionIntegritySealFoundationInput {
  controlledExecutionIntegrityCertification:
    RiverDevControlledExecutionIntegrityCertificationFoundationResult | null;
}

const cloneStrings = (
  values: readonly string[] | undefined
): string[] => {
  return values ? [...values] : [];
};

const block = (
  predecessor:
    | RiverDevControlledExecutionIntegrityCertificationFoundationResult
    | null,
  blockedReasons: string[]
): RiverDevControlledExecutionIntegritySealFoundationResult => {
  return {
    version: "DEV-290",

    trusted: false,
    ready: false,
    executionIntegritySealed: false,

    defaultPolicy: "DENY",

    controlledExecutionIntegritySealBoundaryOnly: true,
    executionIntegritySealResultIsDeterministicData: true,

    executionIntegritySealState:
      "CONTROLLED_EXECUTION_INTEGRITY_NOT_SEALED",

    terminalControlledExecutionIntegrityBoundary: true,
    futureControlledExecutionIntegrityBoundaryRequired: false,

    controlledExecutionIntegrityCertification:
      predecessor,

    controlledExecutionIntegrityVerification:
      predecessor?.controlledExecutionIntegrityVerification ?? null,

    controlledExecutionIntegrity:
      predecessor?.controlledExecutionIntegrity ?? null,

    controlledExecutionSeal:
      predecessor?.controlledExecutionSeal ?? null,

    controlledExecutionCertification:
      predecessor?.controlledExecutionCertification ?? null,

    controlledExecutionVerification:
      predecessor?.controlledExecutionVerification ?? null,

    controlledExecutionAttestation:
      predecessor?.controlledExecutionAttestation ?? null,

    controlledExecutionAudit:
      predecessor?.controlledExecutionAudit ?? null,

    controlledExecutionArchive:
      predecessor?.controlledExecutionArchive ?? null,

    controlledExecutionClosure:
      predecessor?.controlledExecutionClosure ?? null,

    controlledExecutionFinalization:
      predecessor?.controlledExecutionFinalization ?? null,

    controlledExecutionCompletion:
      predecessor?.controlledExecutionCompletion ?? null,

    controlledOperationExecutionLifecycle:
      predecessor?.controlledOperationExecutionLifecycle ?? null,

    controlledOperationExecutionReceipt:
      predecessor?.controlledOperationExecutionReceipt ?? null,

    controlledOperationExecution:
      predecessor?.controlledOperationExecution ?? null,

    operationExecutionAuthorization:
      predecessor?.operationExecutionAuthorization ?? null,

    controlledExecutorInvocation:
      predecessor?.controlledExecutorInvocation ?? null,

    controlledDispatch:
      predecessor?.controlledDispatch ?? null,

    dispatchAuthorization:
      predecessor?.dispatchAuthorization ?? null,

    activeAdmission:
      predecessor?.activeAdmission ?? null,

    authorization:
      predecessor?.authorization ?? null,

    eligibility:
      predecessor?.eligibility ?? null,

    consumption:
      predecessor?.consumption ?? null,

    receiptState:
      predecessor?.receiptState ?? null,

    executedOperation:
      predecessor?.executedOperation ?? null,

    approvedExecutionScope:
      cloneStrings(predecessor?.approvedExecutionScope),

    provenance:
      cloneStrings(predecessor?.provenance),

    controlledDispatchEvidence:
      cloneStrings(predecessor?.controlledDispatchEvidence),

    executorInvocationAuthorizationEvidence:
      cloneStrings(predecessor?.executorInvocationAuthorizationEvidence),

    controlledExecutorInvocationEvidence:
      cloneStrings(predecessor?.controlledExecutorInvocationEvidence),

    operationExecutionAuthorizationEvidence:
      cloneStrings(predecessor?.operationExecutionAuthorizationEvidence),

    controlledOperationExecutionEvidence:
      cloneStrings(predecessor?.controlledOperationExecutionEvidence),

    controlledOperationExecutionReceiptEvidence:
      cloneStrings(predecessor?.controlledOperationExecutionReceiptEvidence),

    controlledOperationExecutionLifecycleEvidence:
      cloneStrings(predecessor?.controlledOperationExecutionLifecycleEvidence),

    controlledExecutionCompletionEvidence:
      cloneStrings(predecessor?.controlledExecutionCompletionEvidence),

    controlledExecutionFinalizationEvidence:
      cloneStrings(predecessor?.controlledExecutionFinalizationEvidence),

    controlledExecutionClosureEvidence:
      cloneStrings(predecessor?.controlledExecutionClosureEvidence),

    controlledExecutionArchiveEvidence:
      cloneStrings(predecessor?.controlledExecutionArchiveEvidence),

    controlledExecutionAuditEvidence:
      cloneStrings(predecessor?.controlledExecutionAuditEvidence),

    controlledExecutionAttestationEvidence:
      cloneStrings(predecessor?.controlledExecutionAttestationEvidence),

    controlledExecutionVerificationEvidence:
      cloneStrings(predecessor?.controlledExecutionVerificationEvidence),

    controlledExecutionCertificationEvidence:
      cloneStrings(predecessor?.controlledExecutionCertificationEvidence),

    controlledExecutionSealEvidence:
      cloneStrings(predecessor?.controlledExecutionSealEvidence),

    controlledExecutionIntegrityEvidence:
      cloneStrings(predecessor?.controlledExecutionIntegrityEvidence),

    controlledExecutionIntegrityVerificationEvidence:
      cloneStrings(
        predecessor?.controlledExecutionIntegrityVerificationEvidence
      ),

    controlledExecutionIntegrityCertificationEvidence:
      cloneStrings(
        predecessor?.controlledExecutionIntegrityCertificationEvidence
      ),

    controlledExecutionIntegritySealEvidence: [],

    blockedReasons: [...blockedReasons],

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

export const buildControlledExecutionIntegritySealFoundation = (
  input: RiverDevControlledExecutionIntegritySealFoundationInput
): RiverDevControlledExecutionIntegritySealFoundationResult => {
  const predecessor =
    input.controlledExecutionIntegrityCertification;

  const blockedReasons: string[] = [];

  if (!predecessor) {
    blockedReasons.push(
      "DEV-289 controlled execution integrity certification is required."
    );

    return block(null, blockedReasons);
  }

  if (predecessor.version !== "DEV-289") {
    blockedReasons.push(
      "Exact DEV-289 predecessor is required."
    );
  }

  if (predecessor.trusted !== true) {
    blockedReasons.push(
      "DEV-289 predecessor must be trusted."
    );
  }

  if (predecessor.ready !== true) {
    blockedReasons.push(
      "DEV-289 predecessor must be ready."
    );
  }

  if (predecessor.executionIntegrityCertified !== true) {
    blockedReasons.push(
      "DEV-289 execution integrity must be certified."
    );
  }

  if (predecessor.defaultPolicy !== "DENY") {
    blockedReasons.push(
      "DEV-289 predecessor must remain default-deny."
    );
  }

  if (
    predecessor.controlledExecutionIntegrityCertificationBoundaryOnly !==
    true
  ) {
    blockedReasons.push(
      "DEV-289 certification boundary contract is invalid."
    );
  }

  if (
    predecessor.executionIntegrityCertificationResultIsDeterministicData !==
    true
  ) {
    blockedReasons.push(
      "DEV-289 certification result must be deterministic data."
    );
  }

  if (
    predecessor.executionIntegrityCertificationState !==
    "CONTROLLED_EXECUTION_INTEGRITY_CERTIFIED"
  ) {
    blockedReasons.push(
      "DEV-289 certification state is invalid."
    );
  }

  if (predecessor.blockedReasons.length !== 0) {
    blockedReasons.push(
      "DEV-289 predecessor contains blocked reasons."
    );
  }

  if (predecessor.mayExecuteOperation !== false) {
    blockedReasons.push(
      "DEV-289 predecessor exposes execution authority."
    );
  }

  if (predecessor.mayModifyRepository !== false) {
    blockedReasons.push(
      "DEV-289 predecessor exposes repository mutation authority."
    );
  }

  if (predecessor.mayPush !== false) {
    blockedReasons.push(
      "DEV-289 predecessor exposes push authority."
    );
  }

  if (predecessor.mayDeploy !== false) {
    blockedReasons.push(
      "DEV-289 predecessor exposes deployment authority."
    );
  }

  if (predecessor.mayAccessSecrets !== false) {
    blockedReasons.push(
      "DEV-289 predecessor exposes secret-access authority."
    );
  }

  if (predecessor.mayPerformNetworkExecution !== false) {
    blockedReasons.push(
      "DEV-289 predecessor exposes network execution authority."
    );
  }

  if (predecessor.mayPerformExternalSideEffects !== false) {
    blockedReasons.push(
      "DEV-289 predecessor exposes external side-effect authority."
    );
  }

  if (blockedReasons.length !== 0) {
    return block(predecessor, blockedReasons);
  }

  return {
    ...block(predecessor, []),

    trusted: true,
    ready: true,
    executionIntegritySealed: true,

    executionIntegritySealState:
      "CONTROLLED_EXECUTION_INTEGRITY_SEALED",

    controlledExecutionIntegritySealEvidence: [
      ...cloneStrings(
        predecessor.controlledExecutionIntegrityCertificationEvidence
      ),
      "DEV-290:CONTROLLED_EXECUTION_INTEGRITY_SEALED"
    ]
  };
};
