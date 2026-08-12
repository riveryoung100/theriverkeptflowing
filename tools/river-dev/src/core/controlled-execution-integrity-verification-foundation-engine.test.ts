import assert from "node:assert/strict";
import test from "node:test";

import {
  buildControlledExecutionIntegrityVerificationFoundation
} from "./controlled-execution-integrity-verification-foundation-engine";

import type {
  RiverDevControlledExecutionIntegrityFoundationResult
} from "../types";


const validPredecessor =
(): RiverDevControlledExecutionIntegrityFoundationResult => ({
  version: "DEV-287",

  trusted: true,
  ready: true,
  executionIntegrityEstablished: true,

  defaultPolicy: "DENY",

  controlledExecutionIntegrityBoundaryOnly: true,
  executionIntegrityResultIsDeterministicData: true,

  executionIntegrityState:
    "CONTROLLED_EXECUTION_INTEGRITY_ESTABLISHED",


  controlledExecutionSeal: {} as never,
  controlledExecutionCertification: {} as never,
  controlledExecutionVerification: {} as never,
  controlledExecutionAttestation: {} as never,
  controlledExecutionAudit: {} as never,
  controlledExecutionArchive: {} as never,
  controlledExecutionClosure: {} as never,
  controlledExecutionFinalization: {} as never,
  controlledExecutionCompletion: {} as never,
  controlledOperationExecutionLifecycle: {} as never,
  controlledOperationExecutionReceipt: {} as never,
  controlledOperationExecution: {} as never,
  operationExecutionAuthorization: {} as never,
  controlledExecutorInvocation: {} as never,
  controlledDispatch: {} as never,
  dispatchAuthorization: {} as never,
  activeAdmission: {} as never,
  authorization: {} as never,
  eligibility: {} as never,
  consumption: {} as never,
  receiptState: {} as never,
  executedOperation: {} as never,

  approvedExecutionScope: [
    "DEV-287:APPROVED_EXECUTION_SCOPE"
  ],

  provenance: [
    "DEV-287:PROVENANCE"
  ],

  controlledDispatchEvidence: [
    "DEV-287:CONTROLLED_DISPATCH_EVIDENCE"
  ],

  executorInvocationAuthorizationEvidence: [
    "DEV-287:EXECUTOR_INVOCATION_AUTHORIZATION_EVIDENCE"
  ],

  controlledExecutorInvocationEvidence: [
    "DEV-287:CONTROLLED_EXECUTOR_INVOCATION_EVIDENCE"
  ],

  operationExecutionAuthorizationEvidence: [
    "DEV-287:OPERATION_EXECUTION_AUTHORIZATION_EVIDENCE"
  ],

  controlledOperationExecutionEvidence: [
    "DEV-287:CONTROLLED_OPERATION_EXECUTION_EVIDENCE"
  ],

  controlledOperationExecutionReceiptEvidence: [
    "DEV-287:CONTROLLED_OPERATION_EXECUTION_RECEIPT_EVIDENCE"
  ],

  controlledOperationExecutionLifecycleEvidence: [
    "DEV-287:CONTROLLED_OPERATION_EXECUTION_LIFECYCLE_EVIDENCE"
  ],

  controlledExecutionCompletionEvidence: [
    "DEV-287:CONTROLLED_EXECUTION_COMPLETION_EVIDENCE"
  ],

  controlledExecutionFinalizationEvidence: [
    "DEV-287:CONTROLLED_EXECUTION_FINALIZATION_EVIDENCE"
  ],

  controlledExecutionClosureEvidence: [
    "DEV-287:CONTROLLED_EXECUTION_CLOSURE_EVIDENCE"
  ],

  controlledExecutionArchiveEvidence: [
    "DEV-287:CONTROLLED_EXECUTION_ARCHIVE_EVIDENCE"
  ],

  controlledExecutionAuditEvidence: [
    "DEV-287:CONTROLLED_EXECUTION_AUDIT_EVIDENCE"
  ],

  controlledExecutionAttestationEvidence: [
    "DEV-287:CONTROLLED_EXECUTION_ATTESTATION_EVIDENCE"
  ],

  controlledExecutionVerificationEvidence: [
    "DEV-287:CONTROLLED_EXECUTION_VERIFICATION_EVIDENCE"
  ],

  controlledExecutionCertificationEvidence: [
    "DEV-287:CONTROLLED_EXECUTION_CERTIFICATION_EVIDENCE"
  ],

  controlledExecutionSealEvidence: [
    "DEV-287:CONTROLLED_EXECUTION_SEAL_EVIDENCE"
  ],

  controlledExecutionIntegrityEvidence: [
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
});


const run = (
  predecessor: RiverDevControlledExecutionIntegrityFoundationResult
) =>
  buildControlledExecutionIntegrityVerificationFoundation({
    predecessor
  });


test(
  "DEV-288 verifies only a valid exact DEV-287 predecessor",
  () => {
    const predecessor = validPredecessor();

    const result = run(predecessor);

    assert.equal(result.version, "DEV-288");
    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.executionIntegrityVerified, true);

    assert.equal(result.defaultPolicy, "DENY");

    assert.equal(
      result.controlledExecutionIntegrityVerificationBoundaryOnly,
      true
    );

    assert.equal(
      result.executionIntegrityVerificationResultIsDeterministicData,
      true
    );

    assert.equal(
      result.executionIntegrityVerificationState,
      "CONTROLLED_EXECUTION_INTEGRITY_VERIFIED"
    );

    assert.equal(
      result.controlledExecutionIntegrity,
      predecessor
    );

    assert.deepEqual(
      result.approvedExecutionScope,
      predecessor.approvedExecutionScope
    );

    assert.deepEqual(
      result.provenance,
      predecessor.provenance
    );

    assert.deepEqual(
      result.controlledExecutionIntegrityEvidence,
      predecessor.controlledExecutionIntegrityEvidence
    );

    assert.deepEqual(
      result.controlledExecutionIntegrityVerificationEvidence,
      [
        ...predecessor.controlledExecutionIntegrityEvidence,
        "DEV-288:CONTROLLED_EXECUTION_INTEGRITY_VERIFIED"
      ]
    );

    assert.deepEqual(result.blockedReasons, []);

    assert.equal(
      result.futureControlledExecutionIntegrityCertificationBoundaryRequired,
      true
    );
  }
);


test(
  "DEV-288 denied result is deterministic inert data",
  () => {
    const predecessor = validPredecessor();

    predecessor.trusted = false;

    const first = run(predecessor);
    const second = run(predecessor);

    assert.deepEqual(first, second);

    assert.equal(first.version, "DEV-288");
    assert.equal(first.trusted, false);
    assert.equal(first.ready, false);
    assert.equal(first.executionIntegrityVerified, false);

    assert.equal(
      first.executionIntegrityVerificationState,
      "CONTROLLED_EXECUTION_INTEGRITY_NOT_VERIFIED"
    );

    assert.equal(first.controlledExecutionIntegrity, null);

    assert.deepEqual(first.approvedExecutionScope, []);
    assert.deepEqual(first.provenance, []);

    assert.deepEqual(
      first.controlledExecutionIntegrityVerificationEvidence,
      []
    );

    assert.deepEqual(
      first.blockedReasons,
      ["UNTRUSTED_DEV_287_PREDECESSOR"]
    );
  }
);


test(
  "DEV-288 rejects wrong predecessor version",
  () => {
    const predecessor = validPredecessor();

    (predecessor as { version: string }).version = "DEV-286";

    const result = run(predecessor);

    assert.deepEqual(
      result.blockedReasons,
      ["INVALID_DEV_287_VERSION"]
    );
  }
);


test(
  "DEV-288 rejects untrusted predecessor",
  () => {
    const predecessor = validPredecessor();
    predecessor.trusted = false;

    assert.deepEqual(
      run(predecessor).blockedReasons,
      ["UNTRUSTED_DEV_287_PREDECESSOR"]
    );
  }
);


test(
  "DEV-288 rejects unready predecessor",
  () => {
    const predecessor = validPredecessor();
    predecessor.ready = false;

    assert.deepEqual(
      run(predecessor).blockedReasons,
      ["UNREADY_DEV_287_PREDECESSOR"]
    );
  }
);


test(
  "DEV-288 rejects predecessor without established integrity",
  () => {
    const predecessor = validPredecessor();
    predecessor.executionIntegrityEstablished = false;

    assert.deepEqual(
      run(predecessor).blockedReasons,
      ["DEV_287_EXECUTION_INTEGRITY_NOT_ESTABLISHED"]
    );
  }
);


test(
  "DEV-288 rejects invalid default policy",
  () => {
    const predecessor = validPredecessor();

    (predecessor as { defaultPolicy: string }).defaultPolicy =
      "ALLOW";

    assert.deepEqual(
      run(predecessor).blockedReasons,
      ["INVALID_DEV_287_DEFAULT_POLICY"]
    );
  }
);


test(
  "DEV-288 rejects predecessor outside integrity boundary",
  () => {
    const predecessor = validPredecessor();

    (
      predecessor as unknown as
      Record<string, unknown>
    ).controlledExecutionIntegrityBoundaryOnly = false;

    assert.deepEqual(
      run(predecessor).blockedReasons,
      ["INVALID_DEV_287_INTEGRITY_BOUNDARY"]
    );
  }
);


test(
  "DEV-288 rejects non-deterministic integrity result",
  () => {
    const predecessor = validPredecessor();

    (
      predecessor as unknown as
      Record<string, unknown>
    ).executionIntegrityResultIsDeterministicData = false;

    assert.deepEqual(
      run(predecessor).blockedReasons,
      ["NON_DETERMINISTIC_DEV_287_INTEGRITY_RESULT"]
    );
  }
);


test(
  "DEV-288 rejects invalid integrity state",
  () => {
    const predecessor = validPredecessor();

    (
      predecessor as {
        executionIntegrityState: string;
      }
    ).executionIntegrityState =
      "CONTROLLED_EXECUTION_INTEGRITY_NOT_ESTABLISHED";

    assert.deepEqual(
      run(predecessor).blockedReasons,
      ["INVALID_DEV_287_INTEGRITY_STATE"]
    );
  }
);


const requiredObjects = [
  ["controlledExecutionSeal", "MISSING_DEV_287_EXECUTION_SEAL"],
  [
    "controlledExecutionCertification",
    "MISSING_DEV_287_EXECUTION_CERTIFICATION"
  ],
  [
    "controlledExecutionVerification",
    "MISSING_DEV_287_EXECUTION_VERIFICATION"
  ],
  [
    "controlledExecutionAttestation",
    "MISSING_DEV_287_EXECUTION_ATTESTATION"
  ],
  [
    "controlledExecutionAudit",
    "MISSING_DEV_287_EXECUTION_AUDIT"
  ],
  [
    "controlledExecutionArchive",
    "MISSING_DEV_287_EXECUTION_ARCHIVE"
  ],
  [
    "controlledExecutionClosure",
    "MISSING_DEV_287_EXECUTION_CLOSURE"
  ],
  [
    "controlledExecutionFinalization",
    "MISSING_DEV_287_EXECUTION_FINALIZATION"
  ],
  [
    "controlledExecutionCompletion",
    "MISSING_DEV_287_EXECUTION_COMPLETION"
  ],
  [
    "controlledOperationExecutionLifecycle",
    "MISSING_DEV_287_EXECUTION_LIFECYCLE"
  ],
  [
    "controlledOperationExecutionReceipt",
    "MISSING_DEV_287_EXECUTION_RECEIPT"
  ],
  [
    "controlledOperationExecution",
    "MISSING_DEV_287_CONTROLLED_OPERATION_EXECUTION"
  ],
  [
    "operationExecutionAuthorization",
    "MISSING_DEV_287_OPERATION_EXECUTION_AUTHORIZATION"
  ],
  [
    "controlledExecutorInvocation",
    "MISSING_DEV_287_CONTROLLED_EXECUTOR_INVOCATION"
  ],
  [
    "controlledDispatch",
    "MISSING_DEV_287_CONTROLLED_DISPATCH"
  ],
  [
    "dispatchAuthorization",
    "MISSING_DEV_287_DISPATCH_AUTHORIZATION"
  ],
  [
    "activeAdmission",
    "MISSING_DEV_287_ACTIVE_ADMISSION"
  ],
  [
    "authorization",
    "MISSING_DEV_287_AUTHORIZATION"
  ],
  [
    "eligibility",
    "MISSING_DEV_287_ELIGIBILITY"
  ],
  [
    "consumption",
    "MISSING_DEV_287_CONSUMPTION"
  ],
  [
    "receiptState",
    "MISSING_DEV_287_RECEIPT_STATE"
  ],
  [
    "executedOperation",
    "MISSING_DEV_287_EXECUTED_OPERATION"
  ]
] as const;


for (const [property, reason] of requiredObjects) {
  test(`DEV-288 rejects missing ${property}`, () => {
    const predecessor = validPredecessor();

    (predecessor as unknown as Record<string, unknown>)[property] =
      null;

    assert.deepEqual(
      run(predecessor).blockedReasons,
      [reason]
    );
  });
}


test(
  "DEV-288 rejects empty approved execution scope",
  () => {
    const predecessor = validPredecessor();
    predecessor.approvedExecutionScope = [];

    assert.deepEqual(
      run(predecessor).blockedReasons,
      ["EMPTY_DEV_287_APPROVED_EXECUTION_SCOPE"]
    );
  }
);


test(
  "DEV-288 rejects empty provenance",
  () => {
    const predecessor = validPredecessor();
    predecessor.provenance = [];

    assert.deepEqual(
      run(predecessor).blockedReasons,
      ["EMPTY_DEV_287_PROVENANCE"]
    );
  }
);


const requiredEvidence = [
  [
    "controlledDispatchEvidence",
    "MISSING_DEV_287_CONTROLLED_DISPATCH_EVIDENCE"
  ],
  [
    "executorInvocationAuthorizationEvidence",
    "MISSING_DEV_287_EXECUTOR_INVOCATION_AUTHORIZATION_EVIDENCE"
  ],
  [
    "controlledExecutorInvocationEvidence",
    "MISSING_DEV_287_CONTROLLED_EXECUTOR_INVOCATION_EVIDENCE"
  ],
  [
    "operationExecutionAuthorizationEvidence",
    "MISSING_DEV_287_OPERATION_EXECUTION_AUTHORIZATION_EVIDENCE"
  ],
  [
    "controlledOperationExecutionEvidence",
    "MISSING_DEV_287_CONTROLLED_OPERATION_EXECUTION_EVIDENCE"
  ],
  [
    "controlledOperationExecutionReceiptEvidence",
    "MISSING_DEV_287_CONTROLLED_OPERATION_EXECUTION_RECEIPT_EVIDENCE"
  ],
  [
    "controlledOperationExecutionLifecycleEvidence",
    "MISSING_DEV_287_CONTROLLED_OPERATION_EXECUTION_LIFECYCLE_EVIDENCE"
  ],
  [
    "controlledExecutionCompletionEvidence",
    "MISSING_DEV_287_EXECUTION_COMPLETION_EVIDENCE"
  ],
  [
    "controlledExecutionFinalizationEvidence",
    "MISSING_DEV_287_EXECUTION_FINALIZATION_EVIDENCE"
  ],
  [
    "controlledExecutionClosureEvidence",
    "MISSING_DEV_287_EXECUTION_CLOSURE_EVIDENCE"
  ],
  [
    "controlledExecutionArchiveEvidence",
    "MISSING_DEV_287_EXECUTION_ARCHIVE_EVIDENCE"
  ],
  [
    "controlledExecutionAuditEvidence",
    "MISSING_DEV_287_EXECUTION_AUDIT_EVIDENCE"
  ],
  [
    "controlledExecutionAttestationEvidence",
    "MISSING_DEV_287_EXECUTION_ATTESTATION_EVIDENCE"
  ],
  [
    "controlledExecutionVerificationEvidence",
    "MISSING_DEV_287_EXECUTION_VERIFICATION_EVIDENCE"
  ],
  [
    "controlledExecutionCertificationEvidence",
    "MISSING_DEV_287_EXECUTION_CERTIFICATION_EVIDENCE"
  ],
  [
    "controlledExecutionSealEvidence",
    "MISSING_DEV_287_EXECUTION_SEAL_EVIDENCE"
  ],
  [
    "controlledExecutionIntegrityEvidence",
    "MISSING_DEV_287_EXECUTION_INTEGRITY_EVIDENCE"
  ]
] as const;


for (const [property, reason] of requiredEvidence) {
  test(`DEV-288 rejects empty ${property}`, () => {
    const predecessor = validPredecessor();

    (
      predecessor as unknown as
      Record<string, unknown>
    )[property] = [];

    assert.deepEqual(
      run(predecessor).blockedReasons,
      [reason]
    );
  });
}


test(
  "DEV-288 rejects blocked predecessor",
  () => {
    const predecessor = validPredecessor();

    predecessor.blockedReasons = [
      "PREDECESSOR_BLOCKED"
    ];

    assert.deepEqual(
      run(predecessor).blockedReasons,
      ["BLOCKED_DEV_287_PREDECESSOR"]
    );
  }
);


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


for (const property of authorityFields) {
  test(`DEV-288 rejects authority ${property}`, () => {
    const predecessor = validPredecessor();

    (
      predecessor as unknown as
      Record<string, unknown>
    )[property] = true;

    const result = run(predecessor);

    assert.equal(result.executionIntegrityVerified, false);
    assert.equal(result.trusted, false);
    assert.equal(result.ready, false);

    assert.equal(result.blockedReasons.length, 1);
  });
}


test(
  "DEV-288 rejects missing future integrity verification boundary",
  () => {
    const predecessor = validPredecessor();

    (
      predecessor as unknown as
      Record<string, unknown>
    ).futureControlledExecutionIntegrityVerificationBoundaryRequired =
      false;

    assert.deepEqual(
      run(predecessor).blockedReasons,
      ["MISSING_DEV_287_FUTURE_INTEGRITY_VERIFICATION_BOUNDARY"]
    );
  }
);


test(
  "DEV-288 grants no execution authority",
  () => {
    const result = run(validPredecessor());

    const authorityValues = [
      result.mayCreateExecutionAuthorization,
      result.mayAuthorizeDownstreamAction,
      result.mayAdmitIntoActiveExecutor,
      result.mayActivateAdmission,
      result.mayDispatch,
      result.mayInvokeExecutor,
      result.mayExecuteOperation,
      result.mayInvokeInspectionDependency,
      result.mayRetryExecution,
      result.mayPersistLifecycleState,
      result.mayModifyRepository,
      result.mayDeleteRepositoryContent,
      result.mayStageRepositoryChanges,
      result.mayCommit,
      result.mayPush,
      result.mayDeploy,
      result.mayAccessSecrets,
      result.mayExpandScope,
      result.mayPerformArbitraryShellExecution,
      result.mayPerformNetworkExecution,
      result.mayPerformExternalSideEffects
    ];

    assert.equal(
      authorityValues.every((value) => value === false),
      true
    );
  }
);


test(
  "DEV-288 preserves predecessor evidence without mutation",
  () => {
    const predecessor = validPredecessor();

    const originalScope = [
      ...predecessor.approvedExecutionScope
    ];

    const originalProvenance = [
      ...predecessor.provenance
    ];

    const originalIntegrityEvidence = [
      ...predecessor.controlledExecutionIntegrityEvidence
    ];

    const result = run(predecessor);

    assert.deepEqual(
      predecessor.approvedExecutionScope,
      originalScope
    );

    assert.deepEqual(
      predecessor.provenance,
      originalProvenance
    );

    assert.deepEqual(
      predecessor.controlledExecutionIntegrityEvidence,
      originalIntegrityEvidence
    );

    assert.notEqual(
      result.approvedExecutionScope,
      predecessor.approvedExecutionScope
    );

    assert.notEqual(
      result.provenance,
      predecessor.provenance
    );

    assert.notEqual(
      result.controlledExecutionIntegrityEvidence,
      predecessor.controlledExecutionIntegrityEvidence
    );
  }
);
