import assert from "node:assert/strict";
import test from "node:test";

import {
  buildControlledExecutionCertificationFoundation
} from "./controlled-execution-certification-foundation-engine";

import type {
  RiverDevControlledExecutionVerificationFoundationResult
} from "../types";


const validPredecessor =
  (): RiverDevControlledExecutionVerificationFoundationResult => ({
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
  });


const run = (
  predecessor: RiverDevControlledExecutionVerificationFoundationResult
) =>
  buildControlledExecutionCertificationFoundation({
    predecessor
  });


const expectDenied = (
  predecessor: RiverDevControlledExecutionVerificationFoundationResult,
  reason: string
): void => {
  const result = run(predecessor);

  assert.equal(result.version, "DEV-285");
  assert.equal(result.trusted, false);
  assert.equal(result.ready, false);
  assert.equal(result.executionCertified, false);

  assert.equal(
    result.executionCertificationState,
    "CONTROLLED_EXECUTION_NOT_CERTIFIED"
  );

  assert.equal(result.controlledExecutionVerification, null);

  assert.deepEqual(result.approvedExecutionScope, []);
  assert.deepEqual(result.provenance, []);
  assert.deepEqual(
    result.controlledExecutionCertificationEvidence,
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
    result.futureControlledExecutionSealBoundaryRequired,
    true
  );
};


test(
  "DEV-285 certifies only a valid exact DEV-284 predecessor",
  () => {
    const predecessor = validPredecessor();

    const result = run(predecessor);

    assert.equal(result.version, "DEV-285");
    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.executionCertified, true);

    assert.equal(
      result.executionCertificationState,
      "CONTROLLED_EXECUTION_CERTIFIED"
    );

    assert.equal(
      result.controlledExecutionVerification,
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
      result.controlledExecutionVerificationEvidence,
      predecessor.controlledExecutionVerificationEvidence
    );

    assert.deepEqual(
      result.controlledExecutionCertificationEvidence,
      [
        ...predecessor.controlledExecutionVerificationEvidence,
        "DEV-285:CONTROLLED_EXECUTION_CERTIFIED"
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
      result.futureControlledExecutionSealBoundaryRequired,
      true
    );
  }
);


test("DEV-285 rejects wrong predecessor version", () => {
  const predecessor = validPredecessor() as any;
  predecessor.version = "DEV-283";

  expectDenied(predecessor, "INVALID_DEV_284_VERSION");
});


test("DEV-285 rejects untrusted predecessor", () => {
  const predecessor = validPredecessor();
  predecessor.trusted = false;

  expectDenied(
    predecessor,
    "UNTRUSTED_DEV_284_PREDECESSOR"
  );
});


test("DEV-285 rejects unready predecessor", () => {
  const predecessor = validPredecessor();
  predecessor.ready = false;

  expectDenied(
    predecessor,
    "UNREADY_DEV_284_PREDECESSOR"
  );
});


test("DEV-285 rejects unverified predecessor", () => {
  const predecessor = validPredecessor();
  predecessor.executionVerified = false;

  expectDenied(
    predecessor,
    "DEV_284_EXECUTION_NOT_VERIFIED"
  );
});


test("DEV-285 rejects wrong verification state", () => {
  const predecessor = validPredecessor();

  predecessor.executionVerificationState =
    "CONTROLLED_EXECUTION_NOT_VERIFIED";

  expectDenied(
    predecessor,
    "INVALID_DEV_284_VERIFICATION_STATE"
  );
});


test(
  "DEV-285 rejects non-deterministic verification result",
  () => {
    const predecessor = validPredecessor() as any;

    predecessor.executionVerificationResultIsDeterministicData =
      false;

    expectDenied(
      predecessor,
      "NON_DETERMINISTIC_DEV_284_VERIFICATION_RESULT"
    );
  }
);


test(
  "DEV-285 rejects predecessor outside verification boundary",
  () => {
    const predecessor = validPredecessor() as any;

    predecessor.controlledExecutionVerificationBoundaryOnly =
      false;

    expectDenied(
      predecessor,
      "INVALID_DEV_284_VERIFICATION_BOUNDARY"
    );
  }
);


const nullableCases: Array<[
  keyof RiverDevControlledExecutionVerificationFoundationResult,
  string
]> = [
  [
    "controlledExecutionAttestation",
    "MISSING_DEV_284_EXECUTION_ATTESTATION"
  ],
  [
    "controlledExecutionAudit",
    "MISSING_DEV_284_EXECUTION_AUDIT"
  ],
  [
    "controlledExecutionArchive",
    "MISSING_DEV_284_EXECUTION_ARCHIVE"
  ],
  [
    "controlledExecutionClosure",
    "MISSING_DEV_284_EXECUTION_CLOSURE"
  ],
  [
    "controlledExecutionFinalization",
    "MISSING_DEV_284_EXECUTION_FINALIZATION"
  ],
  [
    "controlledExecutionCompletion",
    "MISSING_DEV_284_EXECUTION_COMPLETION"
  ],
  [
    "controlledOperationExecutionLifecycle",
    "MISSING_DEV_284_EXECUTION_LIFECYCLE"
  ],
  [
    "controlledOperationExecutionReceipt",
    "MISSING_DEV_284_EXECUTION_RECEIPT"
  ],
  [
    "controlledOperationExecution",
    "MISSING_DEV_284_CONTROLLED_OPERATION_EXECUTION"
  ],
  [
    "operationExecutionAuthorization",
    "MISSING_DEV_284_OPERATION_EXECUTION_AUTHORIZATION"
  ],
  [
    "controlledExecutorInvocation",
    "MISSING_DEV_284_CONTROLLED_EXECUTOR_INVOCATION"
  ],
  [
    "controlledDispatch",
    "MISSING_DEV_284_CONTROLLED_DISPATCH"
  ],
  [
    "dispatchAuthorization",
    "MISSING_DEV_284_DISPATCH_AUTHORIZATION"
  ],
  [
    "activeAdmission",
    "MISSING_DEV_284_ACTIVE_ADMISSION"
  ],
  [
    "authorization",
    "MISSING_DEV_284_AUTHORIZATION"
  ],
  [
    "eligibility",
    "MISSING_DEV_284_ELIGIBILITY"
  ],
  [
    "consumption",
    "MISSING_DEV_284_CONSUMPTION"
  ],
  [
    "receiptState",
    "MISSING_DEV_284_RECEIPT_STATE"
  ],
  [
    "executedOperation",
    "MISSING_DEV_284_EXECUTED_OPERATION"
  ]
];


for (const [property, reason] of nullableCases) {
  test(`DEV-285 rejects missing ${String(property)}`, () => {
    const predecessor = validPredecessor() as any;
    predecessor[property] = null;

    expectDenied(predecessor, reason);
  });
}


test("DEV-285 rejects empty approved execution scope", () => {
  const predecessor = validPredecessor();
  predecessor.approvedExecutionScope = [];

  expectDenied(
    predecessor,
    "EMPTY_DEV_284_APPROVED_EXECUTION_SCOPE"
  );
});


test("DEV-285 rejects empty provenance", () => {
  const predecessor = validPredecessor();
  predecessor.provenance = [];

  expectDenied(
    predecessor,
    "EMPTY_DEV_284_PROVENANCE"
  );
});


const evidenceCases: Array<[
  keyof RiverDevControlledExecutionVerificationFoundationResult,
  string
]> = [
  [
    "controlledDispatchEvidence",
    "MISSING_DEV_284_CONTROLLED_DISPATCH_EVIDENCE"
  ],
  [
    "executorInvocationAuthorizationEvidence",
    "MISSING_DEV_284_EXECUTOR_INVOCATION_AUTHORIZATION_EVIDENCE"
  ],
  [
    "controlledExecutorInvocationEvidence",
    "MISSING_DEV_284_CONTROLLED_EXECUTOR_INVOCATION_EVIDENCE"
  ],
  [
    "operationExecutionAuthorizationEvidence",
    "MISSING_DEV_284_OPERATION_EXECUTION_AUTHORIZATION_EVIDENCE"
  ],
  [
    "controlledOperationExecutionEvidence",
    "MISSING_DEV_284_CONTROLLED_OPERATION_EXECUTION_EVIDENCE"
  ],
  [
    "controlledOperationExecutionReceiptEvidence",
    "MISSING_DEV_284_CONTROLLED_OPERATION_EXECUTION_RECEIPT_EVIDENCE"
  ],
  [
    "controlledOperationExecutionLifecycleEvidence",
    "MISSING_DEV_284_CONTROLLED_OPERATION_EXECUTION_LIFECYCLE_EVIDENCE"
  ],
  [
    "controlledExecutionCompletionEvidence",
    "MISSING_DEV_284_EXECUTION_COMPLETION_EVIDENCE"
  ],
  [
    "controlledExecutionFinalizationEvidence",
    "MISSING_DEV_284_EXECUTION_FINALIZATION_EVIDENCE"
  ],
  [
    "controlledExecutionClosureEvidence",
    "MISSING_DEV_284_EXECUTION_CLOSURE_EVIDENCE"
  ],
  [
    "controlledExecutionArchiveEvidence",
    "MISSING_DEV_284_EXECUTION_ARCHIVE_EVIDENCE"
  ],
  [
    "controlledExecutionAuditEvidence",
    "MISSING_DEV_284_EXECUTION_AUDIT_EVIDENCE"
  ],
  [
    "controlledExecutionAttestationEvidence",
    "MISSING_DEV_284_EXECUTION_ATTESTATION_EVIDENCE"
  ],
  [
    "controlledExecutionVerificationEvidence",
    "MISSING_DEV_284_EXECUTION_VERIFICATION_EVIDENCE"
  ]
];


for (const [property, reason] of evidenceCases) {
  test(`DEV-285 rejects empty ${String(property)}`, () => {
    const predecessor = validPredecessor() as any;
    predecessor[property] = [];

    expectDenied(predecessor, reason);
  });
}


test("DEV-285 rejects blocked predecessor", () => {
  const predecessor = validPredecessor();
  predecessor.blockedReasons = ["blocked"];

  expectDenied(
    predecessor,
    "BLOCKED_DEV_284_PREDECESSOR"
  );
});


const authorityCases: Array<[
  keyof RiverDevControlledExecutionVerificationFoundationResult,
  string
]> = [
  [
    "mayCreateExecutionAuthorization",
    "DEV_284_EXECUTION_AUTHORIZATION_AUTHORITY_PRESENT"
  ],
  [
    "mayAuthorizeDownstreamAction",
    "DEV_284_DOWNSTREAM_AUTHORIZATION_AUTHORITY_PRESENT"
  ],
  [
    "mayAdmitIntoActiveExecutor",
    "DEV_284_EXECUTOR_ADMISSION_AUTHORITY_PRESENT"
  ],
  [
    "mayActivateAdmission",
    "DEV_284_ADMISSION_ACTIVATION_AUTHORITY_PRESENT"
  ],
  [
    "mayDispatch",
    "DEV_284_DISPATCH_AUTHORITY_PRESENT"
  ],
  [
    "mayInvokeExecutor",
    "DEV_284_EXECUTOR_AUTHORITY_PRESENT"
  ],
  [
    "mayExecuteOperation",
    "DEV_284_EXECUTION_AUTHORITY_PRESENT"
  ],
  [
    "mayInvokeInspectionDependency",
    "DEV_284_INSPECTION_DEPENDENCY_AUTHORITY_PRESENT"
  ],
  [
    "mayRetryExecution",
    "DEV_284_RETRY_AUTHORITY_PRESENT"
  ],
  [
    "mayPersistLifecycleState",
    "DEV_284_LIFECYCLE_PERSISTENCE_AUTHORITY_PRESENT"
  ],
  [
    "mayModifyRepository",
    "DEV_284_REPOSITORY_MUTATION_AUTHORITY_PRESENT"
  ],
  [
    "mayDeleteRepositoryContent",
    "DEV_284_REPOSITORY_DELETE_AUTHORITY_PRESENT"
  ],
  [
    "mayStageRepositoryChanges",
    "DEV_284_REPOSITORY_STAGING_AUTHORITY_PRESENT"
  ],
  [
    "mayCommit",
    "DEV_284_COMMIT_AUTHORITY_PRESENT"
  ],
  [
    "mayPush",
    "DEV_284_PUSH_AUTHORITY_PRESENT"
  ],
  [
    "mayDeploy",
    "DEV_284_DEPLOY_AUTHORITY_PRESENT"
  ],
  [
    "mayAccessSecrets",
    "DEV_284_SECRET_ACCESS_AUTHORITY_PRESENT"
  ],
  [
    "mayExpandScope",
    "DEV_284_SCOPE_EXPANSION_AUTHORITY_PRESENT"
  ],
  [
    "mayPerformArbitraryShellExecution",
    "DEV_284_ARBITRARY_SHELL_AUTHORITY_PRESENT"
  ],
  [
    "mayPerformNetworkExecution",
    "DEV_284_NETWORK_EXECUTION_AUTHORITY_PRESENT"
  ],
  [
    "mayPerformExternalSideEffects",
    "DEV_284_EXTERNAL_SIDE_EFFECT_AUTHORITY_PRESENT"
  ]
];


for (const [property, reason] of authorityCases) {
  test(`DEV-285 rejects authority ${String(property)}`, () => {
    const predecessor = validPredecessor() as any;
    predecessor[property] = true;

    expectDenied(predecessor, reason);
  });
}


test(
  "DEV-285 rejects missing future certification boundary",
  () => {
    const predecessor = validPredecessor() as any;

    predecessor.futureControlledExecutionCertificationBoundaryRequired =
      false;

    expectDenied(
      predecessor,
      "MISSING_DEV_284_FUTURE_CERTIFICATION_BOUNDARY"
    );
  }
);


test(
  "DEV-285 preserves predecessor evidence without mutation",
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
