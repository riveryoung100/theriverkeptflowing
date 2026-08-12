import assert from "node:assert/strict";
import test from "node:test";

import {
  buildControlledExecutionIntegrityFoundation
} from "./controlled-execution-integrity-foundation-engine";

import {
  buildControlledExecutionSealFoundation
} from "./controlled-execution-seal-foundation-engine";

import type {
  RiverDevControlledExecutionCertificationFoundationResult,
  RiverDevControlledExecutionSealFoundationResult
} from "../types";
const validCertificationPredecessor =
  (): RiverDevControlledExecutionCertificationFoundationResult => ({
    version: "DEV-285",

    trusted: true,
    ready: true,
    executionCertified: true,

    defaultPolicy: "DENY",

    controlledExecutionCertificationBoundaryOnly: true,
    executionCertificationResultIsDeterministicData: true,

    executionCertificationState: "CONTROLLED_EXECUTION_CERTIFIED",

    controlledExecutionVerification:
      {
          version: "DEV-284",

          trusted: true,
          ready: true,
          executionVerified: true,

          defaultPolicy: "DENY",

          controlledExecutionVerificationBoundaryOnly: true,
          executionVerificationResultIsDeterministicData: true,

          executionVerificationState: "CONTROLLED_EXECUTION_VERIFIED",

          controlledExecutionAttestation: {} as any,
          controlledExecutionAudit: {} as any,
          controlledExecutionArchive: {} as any,
          controlledExecutionClosure: {} as any,
          controlledExecutionFinalization: {} as any,
          controlledExecutionCompletion: {} as any,
          controlledOperationExecutionLifecycle: {} as any,
          controlledOperationExecutionReceipt: {} as any,
          controlledOperationExecution: {} as any,
          operationExecutionAuthorization: {} as any,
          controlledExecutorInvocation: {} as any,
          controlledDispatch: {} as any,
          dispatchAuthorization: {} as any,
          activeAdmission: {} as any,
          authorization: {} as any,
          eligibility: {} as any,
          consumption: {} as any,
          receiptState: {} as any,
          executedOperation: {} as any,

          approvedExecutionScope: ["operation:verified"],
          provenance: ["DEV-284:test-provenance"],

          controlledDispatchEvidence: ["dispatch"],
          executorInvocationAuthorizationEvidence: [
            "executor-invocation-authorization"
          ],
          controlledExecutorInvocationEvidence: [
            "controlled-executor-invocation"
          ],
          operationExecutionAuthorizationEvidence: [
            "operation-execution-authorization"
          ],
          controlledOperationExecutionEvidence: [
            "controlled-operation-execution"
          ],
          controlledOperationExecutionReceiptEvidence: [
            "controlled-operation-execution-receipt"
          ],
          controlledOperationExecutionLifecycleEvidence: [
            "controlled-operation-execution-lifecycle"
          ],
          controlledExecutionCompletionEvidence: [
            "controlled-execution-completion"
          ],
          controlledExecutionFinalizationEvidence: [
            "controlled-execution-finalization"
          ],
          controlledExecutionClosureEvidence: [
            "controlled-execution-closure"
          ],
          controlledExecutionArchiveEvidence: [
            "controlled-execution-archive"
          ],
          controlledExecutionAuditEvidence: [
            "controlled-execution-audit"
          ],
          controlledExecutionAttestationEvidence: [
            "controlled-execution-attestation"
          ],
          controlledExecutionVerificationEvidence: [
            "DEV-284:CONTROLLED_EXECUTION_VERIFIED"
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

          futureControlledExecutionCertificationBoundaryRequired: true
        },



    controlledExecutionAttestation: {} as any,
    controlledExecutionAudit: {} as any,
    controlledExecutionArchive: {} as any,
    controlledExecutionClosure: {} as any,
    controlledExecutionFinalization: {} as any,
    controlledExecutionCompletion: {} as any,
    controlledOperationExecutionLifecycle: {} as any,
    controlledOperationExecutionReceipt: {} as any,
    controlledOperationExecution: {} as any,
    operationExecutionAuthorization: {} as any,
    controlledExecutorInvocation: {} as any,
    controlledDispatch: {} as any,
    dispatchAuthorization: {} as any,
    activeAdmission: {} as any,
    authorization: {} as any,
    eligibility: {} as any,
    consumption: {} as any,
    receiptState: {} as any,
    executedOperation: {} as any,

    approvedExecutionScope: ["operation:verified"],
    provenance: ["DEV-286:test-provenance"],

    controlledDispatchEvidence: ["dispatch"],
    executorInvocationAuthorizationEvidence: [
      "executor-invocation-authorization"
    ],
    controlledExecutorInvocationEvidence: [
      "controlled-executor-invocation"
    ],
    operationExecutionAuthorizationEvidence: [
      "operation-execution-authorization"
    ],
    controlledOperationExecutionEvidence: [
      "controlled-operation-execution"
    ],
    controlledOperationExecutionReceiptEvidence: [
      "controlled-operation-execution-receipt"
    ],
    controlledOperationExecutionLifecycleEvidence: [
      "controlled-operation-execution-lifecycle"
    ],
    controlledExecutionCompletionEvidence: [
      "controlled-execution-completion"
    ],
    controlledExecutionFinalizationEvidence: [
      "controlled-execution-finalization"
    ],
    controlledExecutionClosureEvidence: [
      "controlled-execution-closure"
    ],
    controlledExecutionArchiveEvidence: [
      "controlled-execution-archive"
    ],
    controlledExecutionAuditEvidence: [
      "controlled-execution-audit"
    ],
    controlledExecutionAttestationEvidence: [
      "controlled-execution-attestation"
    ],
    controlledExecutionVerificationEvidence: [
      "DEV-284:CONTROLLED_EXECUTION_VERIFIED"
    ],

    controlledExecutionCertificationEvidence: [
      "DEV-285:CONTROLLED_EXECUTION_CERTIFIED"
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

    futureControlledExecutionSealBoundaryRequired: true
  });



const validPredecessor =
  (): RiverDevControlledExecutionSealFoundationResult => {
    const result =
      buildControlledExecutionSealFoundation({
        predecessor: validCertificationPredecessor()
      });

    if (
      !result.trusted ||
      !result.ready ||
      !result.executionSealed ||
      result.executionSealState !==
        "CONTROLLED_EXECUTION_SEALED"
    ) {
      throw new Error(
        "TEST_FIXTURE_DEV_286_SEAL_CONSTRUCTION_FAILED"
      );
    }

    return result;
  };
const run = (
  predecessor: RiverDevControlledExecutionSealFoundationResult
) =>
  buildControlledExecutionIntegrityFoundation({
    predecessor
  });

const expectDenied = (
  predecessor: RiverDevControlledExecutionSealFoundationResult,
  reason: string
): void => {
  const result = run(predecessor);

  assert.equal(result.version, "DEV-287");
  assert.equal(result.trusted, false);
  assert.equal(result.ready, false);
  assert.equal(result.executionIntegrityEstablished, false);

  assert.equal(
    result.executionIntegrityState,
    "CONTROLLED_EXECUTION_INTEGRITY_NOT_ESTABLISHED"
  );

  assert.equal(result.controlledExecutionSeal, null);

  assert.deepEqual(result.approvedExecutionScope, []);
  assert.deepEqual(result.provenance, []);
  assert.deepEqual(
    result.controlledExecutionIntegrityEvidence,
    []
  );

  assert.deepEqual(result.blockedReasons, [reason]);

  assert.equal(result.mayInvokeExecutor, false);
  assert.equal(result.mayExecuteOperation, false);
  assert.equal(result.mayRetryExecution, false);
  assert.equal(result.mayPersistLifecycleState, false);
  assert.equal(result.mayModifyRepository, false);
  assert.equal(result.mayCommit, false);
  assert.equal(result.mayPush, false);
  assert.equal(result.mayPerformExternalSideEffects, false);

  assert.equal(
    result.futureControlledExecutionIntegrityVerificationBoundaryRequired,
    true
  );
};

test(
  "DEV-287 establishes integrity only from a valid exact DEV-286 predecessor",
  () => {
    const predecessor = validPredecessor();

    const result = run(predecessor);

    assert.equal(result.version, "DEV-287");
    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.executionIntegrityEstablished, true);

    assert.equal(
      result.controlledExecutionIntegrityBoundaryOnly,
      true
    );

    assert.equal(
      result.executionIntegrityResultIsDeterministicData,
      true
    );

    assert.equal(
      result.executionIntegrityState,
      "CONTROLLED_EXECUTION_INTEGRITY_ESTABLISHED"
    );

    assert.equal(
      result.controlledExecutionSeal,
      predecessor
    );

    assert.equal(
      result.controlledExecutionCertification,
      predecessor.controlledExecutionCertification
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
      result.controlledExecutionSealEvidence,
      predecessor.controlledExecutionSealEvidence
    );

    assert.deepEqual(
      result.controlledExecutionIntegrityEvidence,
      [
        ...predecessor.controlledExecutionSealEvidence,
        "DEV-287:CONTROLLED_EXECUTION_INTEGRITY_ESTABLISHED"
      ]
    );

    assert.deepEqual(result.blockedReasons, []);

    assert.equal(result.mayCreateExecutionAuthorization, false);
    assert.equal(result.mayAuthorizeDownstreamAction, false);
    assert.equal(result.mayAdmitIntoActiveExecutor, false);
    assert.equal(result.mayActivateAdmission, false);
    assert.equal(result.mayDispatch, false);

    assert.equal(result.mayInvokeExecutor, false);
    assert.equal(result.mayExecuteOperation, false);
    assert.equal(result.mayInvokeInspectionDependency, false);
    assert.equal(result.mayRetryExecution, false);
    assert.equal(result.mayPersistLifecycleState, false);

    assert.equal(result.mayModifyRepository, false);
    assert.equal(result.mayDeleteRepositoryContent, false);
    assert.equal(result.mayStageRepositoryChanges, false);
    assert.equal(result.mayCommit, false);
    assert.equal(result.mayPush, false);
    assert.equal(result.mayDeploy, false);

    assert.equal(result.mayAccessSecrets, false);
    assert.equal(result.mayExpandScope, false);
    assert.equal(
      result.mayPerformArbitraryShellExecution,
      false
    );
    assert.equal(result.mayPerformNetworkExecution, false);
    assert.equal(
      result.mayPerformExternalSideEffects,
      false
    );

    assert.equal(
      result.futureControlledExecutionIntegrityVerificationBoundaryRequired,
      true
    );
  }
);

test("DEV-287 rejects wrong predecessor version", () => {
  const predecessor = validPredecessor() as any;
  predecessor.version = "DEV-285";

  expectDenied(predecessor, "INVALID_DEV_286_VERSION");
});

test("DEV-287 rejects untrusted predecessor", () => {
  const predecessor = validPredecessor();
  predecessor.trusted = false;

  expectDenied(
    predecessor,
    "UNTRUSTED_DEV_286_PREDECESSOR"
  );
});

test("DEV-287 rejects unready predecessor", () => {
  const predecessor = validPredecessor();
  predecessor.ready = false;

  expectDenied(
    predecessor,
    "UNREADY_DEV_286_PREDECESSOR"
  );
});

test("DEV-287 rejects unsealed predecessor", () => {
  const predecessor = validPredecessor();
  predecessor.executionSealed = false;

  expectDenied(
    predecessor,
    "DEV_286_EXECUTION_NOT_SEALED"
  );
});

test("DEV-287 rejects wrong seal state", () => {
  const predecessor = validPredecessor();

  predecessor.executionSealState =
    "CONTROLLED_EXECUTION_NOT_SEALED";

  expectDenied(
    predecessor,
    "INVALID_DEV_286_SEAL_STATE"
  );
});

test(
  "DEV-287 rejects non-deterministic seal result",
  () => {
    const predecessor = validPredecessor() as any;

    predecessor.executionSealResultIsDeterministicData =
      false;

    expectDenied(
      predecessor,
      "NON_DETERMINISTIC_DEV_286_SEAL_RESULT"
    );
  }
);

test(
  "DEV-287 rejects predecessor outside seal boundary",
  () => {
    const predecessor = validPredecessor() as any;

    predecessor.controlledExecutionSealBoundaryOnly =
      false;

    expectDenied(
      predecessor,
      "INVALID_DEV_286_SEAL_BOUNDARY"
    );
  }
);

const nullableProperties: Array<
  [
    keyof RiverDevControlledExecutionSealFoundationResult,
    string
  ]
> = [
  [
    "controlledExecutionCertification",
    "MISSING_DEV_286_EXECUTION_CERTIFICATION"
  ],
  [
    "controlledExecutionVerification",
    "MISSING_DEV_286_EXECUTION_VERIFICATION"
  ],
  [
    "controlledExecutionAttestation",
    "MISSING_DEV_286_EXECUTION_ATTESTATION"
  ],
  [
    "controlledExecutionAudit",
    "MISSING_DEV_286_EXECUTION_AUDIT"
  ],
  [
    "controlledExecutionArchive",
    "MISSING_DEV_286_EXECUTION_ARCHIVE"
  ],
  [
    "controlledExecutionClosure",
    "MISSING_DEV_286_EXECUTION_CLOSURE"
  ],
  [
    "controlledExecutionFinalization",
    "MISSING_DEV_286_EXECUTION_FINALIZATION"
  ],
  [
    "controlledExecutionCompletion",
    "MISSING_DEV_286_EXECUTION_COMPLETION"
  ],
  [
    "controlledOperationExecutionLifecycle",
    "MISSING_DEV_286_EXECUTION_LIFECYCLE"
  ],
  [
    "controlledOperationExecutionReceipt",
    "MISSING_DEV_286_EXECUTION_RECEIPT"
  ],
  [
    "controlledOperationExecution",
    "MISSING_DEV_286_CONTROLLED_OPERATION_EXECUTION"
  ],
  [
    "operationExecutionAuthorization",
    "MISSING_DEV_286_OPERATION_EXECUTION_AUTHORIZATION"
  ],
  [
    "controlledExecutorInvocation",
    "MISSING_DEV_286_CONTROLLED_EXECUTOR_INVOCATION"
  ],
  [
    "controlledDispatch",
    "MISSING_DEV_286_CONTROLLED_DISPATCH"
  ],
  [
    "dispatchAuthorization",
    "MISSING_DEV_286_DISPATCH_AUTHORIZATION"
  ],
  [
    "activeAdmission",
    "MISSING_DEV_286_ACTIVE_ADMISSION"
  ],
  [
    "authorization",
    "MISSING_DEV_286_AUTHORIZATION"
  ],
  [
    "eligibility",
    "MISSING_DEV_286_ELIGIBILITY"
  ],
  [
    "consumption",
    "MISSING_DEV_286_CONSUMPTION"
  ],
  [
    "receiptState",
    "MISSING_DEV_286_RECEIPT_STATE"
  ],
  [
    "executedOperation",
    "MISSING_DEV_286_EXECUTED_OPERATION"
  ]
];

for (const [property, reason] of nullableProperties) {
  test(`DEV-287 rejects missing ${String(property)}`, () => {
    const predecessor = validPredecessor() as any;
    predecessor[property] = null;

    expectDenied(predecessor, reason);
  });
}

test(
  "DEV-287 rejects empty approved execution scope",
  () => {
    const predecessor = validPredecessor();
    predecessor.approvedExecutionScope = [];

    expectDenied(
      predecessor,
      "EMPTY_DEV_286_APPROVED_EXECUTION_SCOPE"
    );
  }
);

test("DEV-287 rejects empty provenance", () => {
  const predecessor = validPredecessor();
  predecessor.provenance = [];

  expectDenied(
    predecessor,
    "EMPTY_DEV_286_PROVENANCE"
  );
});

const evidenceProperties: Array<
  [
    keyof RiverDevControlledExecutionSealFoundationResult,
    string
  ]
> = [
  [
    "controlledDispatchEvidence",
    "MISSING_DEV_286_CONTROLLED_DISPATCH_EVIDENCE"
  ],
  [
    "executorInvocationAuthorizationEvidence",
    "MISSING_DEV_286_EXECUTOR_INVOCATION_AUTHORIZATION_EVIDENCE"
  ],
  [
    "controlledExecutorInvocationEvidence",
    "MISSING_DEV_286_CONTROLLED_EXECUTOR_INVOCATION_EVIDENCE"
  ],
  [
    "operationExecutionAuthorizationEvidence",
    "MISSING_DEV_286_OPERATION_EXECUTION_AUTHORIZATION_EVIDENCE"
  ],
  [
    "controlledOperationExecutionEvidence",
    "MISSING_DEV_286_CONTROLLED_OPERATION_EXECUTION_EVIDENCE"
  ],
  [
    "controlledOperationExecutionReceiptEvidence",
    "MISSING_DEV_286_CONTROLLED_OPERATION_EXECUTION_RECEIPT_EVIDENCE"
  ],
  [
    "controlledOperationExecutionLifecycleEvidence",
    "MISSING_DEV_286_CONTROLLED_OPERATION_EXECUTION_LIFECYCLE_EVIDENCE"
  ],
  [
    "controlledExecutionCompletionEvidence",
    "MISSING_DEV_286_EXECUTION_COMPLETION_EVIDENCE"
  ],
  [
    "controlledExecutionFinalizationEvidence",
    "MISSING_DEV_286_EXECUTION_FINALIZATION_EVIDENCE"
  ],
  [
    "controlledExecutionClosureEvidence",
    "MISSING_DEV_286_EXECUTION_CLOSURE_EVIDENCE"
  ],
  [
    "controlledExecutionArchiveEvidence",
    "MISSING_DEV_286_EXECUTION_ARCHIVE_EVIDENCE"
  ],
  [
    "controlledExecutionAuditEvidence",
    "MISSING_DEV_286_EXECUTION_AUDIT_EVIDENCE"
  ],
  [
    "controlledExecutionAttestationEvidence",
    "MISSING_DEV_286_EXECUTION_ATTESTATION_EVIDENCE"
  ],
  [
    "controlledExecutionVerificationEvidence",
    "MISSING_DEV_286_EXECUTION_VERIFICATION_EVIDENCE"
  ],
  [
    "controlledExecutionCertificationEvidence",
    "MISSING_DEV_286_EXECUTION_CERTIFICATION_EVIDENCE"
  ],
  [
    "controlledExecutionSealEvidence",
    "MISSING_DEV_286_EXECUTION_SEAL_EVIDENCE"
  ]
];

for (const [property, reason] of evidenceProperties) {
  test(`DEV-287 rejects empty ${String(property)}`, () => {
    const predecessor = validPredecessor() as any;
    predecessor[property] = [];

    expectDenied(predecessor, reason);
  });
}

test("DEV-287 rejects blocked predecessor", () => {
  const predecessor = validPredecessor();
  predecessor.blockedReasons = ["blocked"];

  expectDenied(
    predecessor,
    "BLOCKED_DEV_286_PREDECESSOR"
  );
});

const authorityProperties: Array<
  [
    keyof RiverDevControlledExecutionSealFoundationResult,
    string
  ]
> = [
  [
    "mayCreateExecutionAuthorization",
    "DEV_286_EXECUTION_AUTHORIZATION_AUTHORITY_PRESENT"
  ],
  [
    "mayAuthorizeDownstreamAction",
    "DEV_286_DOWNSTREAM_AUTHORIZATION_AUTHORITY_PRESENT"
  ],
  [
    "mayAdmitIntoActiveExecutor",
    "DEV_286_EXECUTOR_ADMISSION_AUTHORITY_PRESENT"
  ],
  [
    "mayActivateAdmission",
    "DEV_286_ADMISSION_ACTIVATION_AUTHORITY_PRESENT"
  ],
  [
    "mayDispatch",
    "DEV_286_DISPATCH_AUTHORITY_PRESENT"
  ],
  [
    "mayInvokeExecutor",
    "DEV_286_EXECUTOR_AUTHORITY_PRESENT"
  ],
  [
    "mayExecuteOperation",
    "DEV_286_EXECUTION_AUTHORITY_PRESENT"
  ],
  [
    "mayInvokeInspectionDependency",
    "DEV_286_INSPECTION_DEPENDENCY_AUTHORITY_PRESENT"
  ],
  [
    "mayRetryExecution",
    "DEV_286_RETRY_AUTHORITY_PRESENT"
  ],
  [
    "mayPersistLifecycleState",
    "DEV_286_LIFECYCLE_PERSISTENCE_AUTHORITY_PRESENT"
  ],
  [
    "mayModifyRepository",
    "DEV_286_REPOSITORY_MUTATION_AUTHORITY_PRESENT"
  ],
  [
    "mayDeleteRepositoryContent",
    "DEV_286_REPOSITORY_DELETE_AUTHORITY_PRESENT"
  ],
  [
    "mayStageRepositoryChanges",
    "DEV_286_REPOSITORY_STAGING_AUTHORITY_PRESENT"
  ],
  [
    "mayCommit",
    "DEV_286_COMMIT_AUTHORITY_PRESENT"
  ],
  [
    "mayPush",
    "DEV_286_PUSH_AUTHORITY_PRESENT"
  ],
  [
    "mayDeploy",
    "DEV_286_DEPLOY_AUTHORITY_PRESENT"
  ],
  [
    "mayAccessSecrets",
    "DEV_286_SECRET_ACCESS_AUTHORITY_PRESENT"
  ],
  [
    "mayExpandScope",
    "DEV_286_SCOPE_EXPANSION_AUTHORITY_PRESENT"
  ],
  [
    "mayPerformArbitraryShellExecution",
    "DEV_286_ARBITRARY_SHELL_AUTHORITY_PRESENT"
  ],
  [
    "mayPerformNetworkExecution",
    "DEV_286_NETWORK_EXECUTION_AUTHORITY_PRESENT"
  ],
  [
    "mayPerformExternalSideEffects",
    "DEV_286_EXTERNAL_SIDE_EFFECT_AUTHORITY_PRESENT"
  ]
];

for (const [property, reason] of authorityProperties) {
  test(`DEV-287 rejects authority ${String(property)}`, () => {
    const predecessor = validPredecessor() as any;
    predecessor[property] = true;

    expectDenied(predecessor, reason);
  });
}

test(
  "DEV-287 rejects missing future integrity boundary",
  () => {
    const predecessor = validPredecessor() as any;

    predecessor.futureControlledExecutionIntegrityBoundaryRequired =
      false;

    expectDenied(
      predecessor,
      "MISSING_DEV_286_FUTURE_INTEGRITY_BOUNDARY"
    );
  }
);

test(
  "DEV-287 preserves predecessor evidence without mutation",
  () => {
    const predecessor = validPredecessor();

    const scopeBefore = [
      ...predecessor.approvedExecutionScope
    ];

    const provenanceBefore = [
      ...predecessor.provenance
    ];

    const sealEvidenceBefore = [
      ...predecessor.controlledExecutionSealEvidence
    ];

    const result = run(predecessor);

    assert.deepEqual(
      result.approvedExecutionScope,
      predecessor.approvedExecutionScope
    );

    assert.deepEqual(
      result.provenance,
      predecessor.provenance
    );

    assert.deepEqual(
      result.controlledExecutionSealEvidence,
      predecessor.controlledExecutionSealEvidence
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
      result.controlledExecutionSealEvidence,
      predecessor.controlledExecutionSealEvidence
    );

    assert.deepEqual(
      predecessor.approvedExecutionScope,
      scopeBefore
    );

    assert.deepEqual(
      predecessor.provenance,
      provenanceBefore
    );

    assert.deepEqual(
      predecessor.controlledExecutionSealEvidence,
      sealEvidenceBefore
    );
  }
);
