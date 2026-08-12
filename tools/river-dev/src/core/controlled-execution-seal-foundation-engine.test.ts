import assert from "node:assert/strict";
import test from "node:test";

import {
  buildControlledExecutionSealFoundation
} from "./controlled-execution-seal-foundation-engine";

import type {
  RiverDevControlledExecutionCertificationFoundationResult
} from "../types";


const validPredecessor =
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


const run = (
  predecessor: RiverDevControlledExecutionCertificationFoundationResult
) =>
  buildControlledExecutionSealFoundation({
    predecessor
  });


const expectDenied = (
  predecessor: RiverDevControlledExecutionCertificationFoundationResult,
  reason: string
): void => {
  const result = run(predecessor);

  assert.equal(result.version, "DEV-286");
  assert.equal(result.trusted, false);
  assert.equal(result.ready, false);
  assert.equal(result.executionSealed, false);

  assert.equal(
    result.executionSealState,
    "CONTROLLED_EXECUTION_NOT_SEALED"
  );

  assert.equal(result.controlledExecutionVerification, null);

  assert.deepEqual(result.approvedExecutionScope, []);
  assert.deepEqual(result.provenance, []);
  assert.deepEqual(
    result.controlledExecutionSealEvidence,
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
    result.futureControlledExecutionIntegrityBoundaryRequired,
    true
  );
};


test(
  "DEV-286 certifies only a valid exact DEV-286 predecessor",
  () => {
    const predecessor = validPredecessor();

    const result = run(predecessor);

    assert.equal(result.version, "DEV-286");
    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.executionSealed, true);
  assert.equal(result.controlledExecutionSealBoundaryOnly, true);
  assert.equal(result.executionSealResultIsDeterministicData, true);

    assert.equal(
      result.executionSealState,
      "CONTROLLED_EXECUTION_SEALED"
    );

    assert.equal(
      result.controlledExecutionCertification,
      predecessor
    );

    assert.equal(
      result.controlledExecutionVerification,
      predecessor.controlledExecutionVerification
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
      result.controlledExecutionVerificationEvidence,
      predecessor.controlledExecutionVerificationEvidence
    );

    assert.deepEqual(
      result.controlledExecutionSealEvidence,
      [
        ...predecessor.controlledExecutionCertificationEvidence,
        "DEV-286:CONTROLLED_EXECUTION_SEALED"
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
      result.futureControlledExecutionIntegrityBoundaryRequired,
      true
    );
  }
);


test("DEV-286 rejects wrong predecessor version", () => {
  const predecessor = validPredecessor() as any;
  predecessor.version = "DEV-283";

  expectDenied(predecessor, "INVALID_DEV_285_VERSION");
});


test("DEV-286 rejects untrusted predecessor", () => {
  const predecessor = validPredecessor();
  predecessor.trusted = false;

  expectDenied(
    predecessor,
    "UNTRUSTED_DEV_285_PREDECESSOR"
  );
});


test("DEV-286 rejects unready predecessor", () => {
  const predecessor = validPredecessor();
  predecessor.ready = false;

  expectDenied(
    predecessor,
    "UNREADY_DEV_285_PREDECESSOR"
  );
});


test("DEV-286 rejects unverified predecessor", () => {
  const predecessor = validPredecessor();
  predecessor.executionCertified = false;

  expectDenied(
    predecessor,
    "DEV_285_EXECUTION_NOT_CERTIFIED"
  );
});


test("DEV-286 rejects wrong certification state", () => {
  const predecessor = validPredecessor();

  predecessor.executionCertificationState =
    "CONTROLLED_EXECUTION_NOT_CERTIFIED";

  expectDenied(
    predecessor,
    "INVALID_DEV_285_CERTIFICATION_STATE"
  );
});


test(
  "DEV-286 rejects non-deterministic certification result",
  () => {
    const predecessor = validPredecessor() as any;

    predecessor.executionCertificationResultIsDeterministicData =
      false;

    expectDenied(
      predecessor,
      "NON_DETERMINISTIC_DEV_285_CERTIFICATION_RESULT"
    );
  }
);


test(
  "DEV-286 rejects predecessor outside certification boundary",
  () => {
    const predecessor = validPredecessor() as any;

    predecessor.controlledExecutionCertificationBoundaryOnly =
      false;

    expectDenied(
      predecessor,
      "INVALID_DEV_285_CERTIFICATION_BOUNDARY"
    );
  }
);


const nullableCases: Array<[
  keyof RiverDevControlledExecutionCertificationFoundationResult,
  string
]> = [
  [
    "controlledExecutionAttestation",
    "MISSING_DEV_285_EXECUTION_ATTESTATION"
  ],
  [
    "controlledExecutionAudit",
    "MISSING_DEV_285_EXECUTION_AUDIT"
  ],
  [
    "controlledExecutionArchive",
    "MISSING_DEV_285_EXECUTION_ARCHIVE"
  ],
  [
    "controlledExecutionClosure",
    "MISSING_DEV_285_EXECUTION_CLOSURE"
  ],
  [
    "controlledExecutionFinalization",
    "MISSING_DEV_285_EXECUTION_FINALIZATION"
  ],
  [
    "controlledExecutionCompletion",
    "MISSING_DEV_285_EXECUTION_COMPLETION"
  ],
  [
    "controlledOperationExecutionLifecycle",
    "MISSING_DEV_285_EXECUTION_LIFECYCLE"
  ],
  [
    "controlledOperationExecutionReceipt",
    "MISSING_DEV_285_EXECUTION_RECEIPT"
  ],
  [
    "controlledOperationExecution",
    "MISSING_DEV_285_CONTROLLED_OPERATION_EXECUTION"
  ],
  [
    "operationExecutionAuthorization",
    "MISSING_DEV_285_OPERATION_EXECUTION_AUTHORIZATION"
  ],
  [
    "controlledExecutorInvocation",
    "MISSING_DEV_285_CONTROLLED_EXECUTOR_INVOCATION"
  ],
  [
    "controlledDispatch",
    "MISSING_DEV_285_CONTROLLED_DISPATCH"
  ],
  [
    "dispatchAuthorization",
    "MISSING_DEV_285_DISPATCH_AUTHORIZATION"
  ],
  [
    "activeAdmission",
    "MISSING_DEV_285_ACTIVE_ADMISSION"
  ],
  [
    "authorization",
    "MISSING_DEV_285_AUTHORIZATION"
  ],
  [
    "eligibility",
    "MISSING_DEV_285_ELIGIBILITY"
  ],
  [
    "consumption",
    "MISSING_DEV_285_CONSUMPTION"
  ],
  [
    "receiptState",
    "MISSING_DEV_285_RECEIPT_STATE"
  ],
  [
    "executedOperation",
    "MISSING_DEV_285_EXECUTED_OPERATION"
  ]
];


for (const [property, reason] of nullableCases) {
  test(`DEV-286 rejects missing ${String(property)}`, () => {
    const predecessor = validPredecessor() as any;
    predecessor[property] = null;

    expectDenied(predecessor, reason);
  });
}


test("DEV-286 rejects empty approved execution scope", () => {
  const predecessor = validPredecessor();
  predecessor.approvedExecutionScope = [];

  expectDenied(
    predecessor,
    "EMPTY_DEV_285_APPROVED_EXECUTION_SCOPE"
  );
});


test("DEV-286 rejects empty provenance", () => {
  const predecessor = validPredecessor();
  predecessor.provenance = [];

  expectDenied(
    predecessor,
    "EMPTY_DEV_285_PROVENANCE"
  );
});


const evidenceCases: Array<[
  keyof RiverDevControlledExecutionCertificationFoundationResult,
  string
]> = [
  [
    "controlledDispatchEvidence",
    "MISSING_DEV_285_CONTROLLED_DISPATCH_EVIDENCE"
  ],
  [
    "executorInvocationAuthorizationEvidence",
    "MISSING_DEV_285_EXECUTOR_INVOCATION_AUTHORIZATION_EVIDENCE"
  ],
  [
    "controlledExecutorInvocationEvidence",
    "MISSING_DEV_285_CONTROLLED_EXECUTOR_INVOCATION_EVIDENCE"
  ],
  [
    "operationExecutionAuthorizationEvidence",
    "MISSING_DEV_285_OPERATION_EXECUTION_AUTHORIZATION_EVIDENCE"
  ],
  [
    "controlledOperationExecutionEvidence",
    "MISSING_DEV_285_CONTROLLED_OPERATION_EXECUTION_EVIDENCE"
  ],
  [
    "controlledOperationExecutionReceiptEvidence",
    "MISSING_DEV_285_CONTROLLED_OPERATION_EXECUTION_RECEIPT_EVIDENCE"
  ],
  [
    "controlledOperationExecutionLifecycleEvidence",
    "MISSING_DEV_285_CONTROLLED_OPERATION_EXECUTION_LIFECYCLE_EVIDENCE"
  ],
  [
    "controlledExecutionCompletionEvidence",
    "MISSING_DEV_285_EXECUTION_COMPLETION_EVIDENCE"
  ],
  [
    "controlledExecutionFinalizationEvidence",
    "MISSING_DEV_285_EXECUTION_FINALIZATION_EVIDENCE"
  ],
  [
    "controlledExecutionClosureEvidence",
    "MISSING_DEV_285_EXECUTION_CLOSURE_EVIDENCE"
  ],
  [
    "controlledExecutionArchiveEvidence",
    "MISSING_DEV_285_EXECUTION_ARCHIVE_EVIDENCE"
  ],
  [
    "controlledExecutionAuditEvidence",
    "MISSING_DEV_285_EXECUTION_AUDIT_EVIDENCE"
  ],
  [
    "controlledExecutionAttestationEvidence",
    "MISSING_DEV_285_EXECUTION_ATTESTATION_EVIDENCE"
  ],
  [
    "controlledExecutionVerificationEvidence",
    "MISSING_DEV_285_EXECUTION_VERIFICATION_EVIDENCE"
  ]
];


for (const [property, reason] of evidenceCases) {
  test(`DEV-286 rejects empty ${String(property)}`, () => {
    const predecessor = validPredecessor() as any;
    predecessor[property] = [];

    expectDenied(predecessor, reason);
  });
}


test("DEV-286 rejects blocked predecessor", () => {
  const predecessor = validPredecessor();
  predecessor.blockedReasons = ["blocked"];

  expectDenied(
    predecessor,
    "BLOCKED_DEV_285_PREDECESSOR"
  );
});


const authorityCases: Array<[
  keyof RiverDevControlledExecutionCertificationFoundationResult,
  string
]> = [
  [
    "mayCreateExecutionAuthorization",
    "DEV_285_EXECUTION_AUTHORIZATION_AUTHORITY_PRESENT"
  ],
  [
    "mayAuthorizeDownstreamAction",
    "DEV_285_DOWNSTREAM_AUTHORIZATION_AUTHORITY_PRESENT"
  ],
  [
    "mayAdmitIntoActiveExecutor",
    "DEV_285_EXECUTOR_ADMISSION_AUTHORITY_PRESENT"
  ],
  [
    "mayActivateAdmission",
    "DEV_285_ADMISSION_ACTIVATION_AUTHORITY_PRESENT"
  ],
  [
    "mayDispatch",
    "DEV_285_DISPATCH_AUTHORITY_PRESENT"
  ],
  [
    "mayInvokeExecutor",
    "DEV_285_EXECUTOR_AUTHORITY_PRESENT"
  ],
  [
    "mayExecuteOperation",
    "DEV_285_EXECUTION_AUTHORITY_PRESENT"
  ],
  [
    "mayInvokeInspectionDependency",
    "DEV_285_INSPECTION_DEPENDENCY_AUTHORITY_PRESENT"
  ],
  [
    "mayRetryExecution",
    "DEV_285_RETRY_AUTHORITY_PRESENT"
  ],
  [
    "mayPersistLifecycleState",
    "DEV_285_LIFECYCLE_PERSISTENCE_AUTHORITY_PRESENT"
  ],
  [
    "mayModifyRepository",
    "DEV_285_REPOSITORY_MUTATION_AUTHORITY_PRESENT"
  ],
  [
    "mayDeleteRepositoryContent",
    "DEV_285_REPOSITORY_DELETE_AUTHORITY_PRESENT"
  ],
  [
    "mayStageRepositoryChanges",
    "DEV_285_REPOSITORY_STAGING_AUTHORITY_PRESENT"
  ],
  [
    "mayCommit",
    "DEV_285_COMMIT_AUTHORITY_PRESENT"
  ],
  [
    "mayPush",
    "DEV_285_PUSH_AUTHORITY_PRESENT"
  ],
  [
    "mayDeploy",
    "DEV_285_DEPLOY_AUTHORITY_PRESENT"
  ],
  [
    "mayAccessSecrets",
    "DEV_285_SECRET_ACCESS_AUTHORITY_PRESENT"
  ],
  [
    "mayExpandScope",
    "DEV_285_SCOPE_EXPANSION_AUTHORITY_PRESENT"
  ],
  [
    "mayPerformArbitraryShellExecution",
    "DEV_285_ARBITRARY_SHELL_AUTHORITY_PRESENT"
  ],
  [
    "mayPerformNetworkExecution",
    "DEV_285_NETWORK_EXECUTION_AUTHORITY_PRESENT"
  ],
  [
    "mayPerformExternalSideEffects",
    "DEV_285_EXTERNAL_SIDE_EFFECT_AUTHORITY_PRESENT"
  ]
];


for (const [property, reason] of authorityCases) {
  test(`DEV-286 rejects authority ${String(property)}`, () => {
    const predecessor = validPredecessor() as any;
    predecessor[property] = true;

    expectDenied(predecessor, reason);
  });
}


test(
  "DEV-286 rejects missing future seal boundary",
  () => {
    const predecessor = validPredecessor() as any;

    predecessor.futureControlledExecutionSealBoundaryRequired =
      false;

    expectDenied(
      predecessor,
      "MISSING_DEV_285_FUTURE_SEAL_BOUNDARY"
    );
  }
);


test(
  "DEV-286 preserves predecessor evidence without mutation",
  () => {
    const predecessor = validPredecessor();

    const originalScope = [
      ...predecessor.approvedExecutionScope
    ];

    const originalProvenance = [
      ...predecessor.provenance
    ];

    const originalVerificationEvidence = [
      ...predecessor.controlledExecutionVerificationEvidence
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
      predecessor.controlledExecutionVerificationEvidence,
      originalVerificationEvidence
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
      result.controlledExecutionVerificationEvidence,
      predecessor.controlledExecutionVerificationEvidence
    );
  }
);
