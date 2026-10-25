import assert from "node:assert/strict";
import test from "node:test";

import type {
  RiverDevControlledExecutionAttestationFoundationResult
} from "../types";

import {
  buildControlledExecutionVerificationFoundation
} from "./controlled-execution-verification-foundation-engine";

function validPredecessor():
  RiverDevControlledExecutionAttestationFoundationResult {
  return {
    version: "DEV-283",

    trusted: true,
    ready: true,
    executionAttested: true,

    defaultPolicy: "DENY",

    controlledExecutionAttestationBoundaryOnly: true,
    executionAttestationResultIsDeterministicData: true,

    executionAttestationState: "CONTROLLED_EXECUTION_ATTESTED",

    controlledExecutionAudit: {} as unknown as import("../types").RiverDevControlledExecutionAuditFoundationResult | null,
    controlledExecutionArchive: {} as unknown as import("../types").RiverDevControlledExecutionArchiveFoundationResult | null,
    controlledExecutionClosure: {} as unknown as import("../types").RiverDevControlledExecutionClosureFoundationResult | null,
    controlledExecutionFinalization: {} as unknown as import("../types").RiverDevControlledExecutionFinalizationFoundationResult | null,
    controlledExecutionCompletion: {} as unknown as import("../types").RiverDevControlledExecutionCompletionFoundationResult | null,
    controlledOperationExecutionLifecycle: {} as unknown as import("../types").RiverDevControlledOperationExecutionLifecycleFoundationResult | null,
    controlledOperationExecutionReceipt: {} as unknown as import("../types").RiverDevControlledOperationExecutionReceiptFoundationResult | null,
    controlledOperationExecution: {} as unknown as import("../types").RiverDevControlledOperationExecutionBoundaryFoundationResult | null,
    operationExecutionAuthorization: {} as unknown as import("../types").RiverDevOperationExecutionAuthorizationFoundationResult | null,
    controlledExecutorInvocation: {} as unknown as import("../types").RiverDevControlledExecutorInvocationFoundationResult | null,
    controlledDispatch: {} as unknown as import("../types").RiverDevControlledExecutorDispatchFoundationResult | null,
    dispatchAuthorization: {} as unknown as import("../types").RiverDevControlledExecutorActiveAdmissionDispatchAuthorizationFoundationResult | null,
    activeAdmission: {} as unknown as import("../types").RiverDevControlledExecutorActiveAdmissionFoundationResult | null,
    authorization: {} as unknown as import("../types").RiverDevControlledExecutorActiveAdmissionAuthorizationFoundationResult | null,
    eligibility: {} as unknown as import("../types").RiverDevControlledExecutorActiveAdmissionEligibilityFoundationResult | null,
    consumption: {} as unknown as import("../types").RiverDevControlledExecutorVerifiedPackageDownstreamAdmissionConsumptionFoundationResult | null,
    receiptState: {} as unknown as string | null,
    executedOperation: {} as unknown as string | null,

    approvedExecutionScope: ["controlled-operation"],
    provenance: ["DEV-283"],

    controlledDispatchEvidence: ["dispatch"],
    executorInvocationAuthorizationEvidence: ["executor-auth"],
    controlledExecutorInvocationEvidence: ["executor-invocation"],
    operationExecutionAuthorizationEvidence: ["operation-auth"],
    controlledOperationExecutionEvidence: ["operation-execution"],
    controlledOperationExecutionReceiptEvidence: ["receipt"],
    controlledOperationExecutionLifecycleEvidence: ["lifecycle"],
    controlledExecutionCompletionEvidence: ["completion"],
    controlledExecutionFinalizationEvidence: ["finalization"],
    controlledExecutionClosureEvidence: ["closure"],
    controlledExecutionArchiveEvidence: ["archive"],
    controlledExecutionAuditEvidence: ["audit"],
    controlledExecutionAttestationEvidence: ["attestation"],

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
}

function run(
  predecessor: RiverDevControlledExecutionAttestationFoundationResult
) {
  return buildControlledExecutionVerificationFoundation({
    predecessor
  });
}

function expectDenied(
  predecessor: RiverDevControlledExecutionAttestationFoundationResult,
  reason: string
): void {
  const result = run(predecessor);

  assert.equal(result.trusted, false);
  assert.equal(result.ready, false);
  assert.equal(result.executionVerified, false);

  assert.equal(
    result.executionVerificationState,
    "CONTROLLED_EXECUTION_NOT_VERIFIED"
  );

  assert.deepEqual(result.blockedReasons, [reason]);
}

test(
  "DEV-284 verifies only a valid exact DEV-283 predecessor",
  () => {
    const predecessor = validPredecessor();

    const result = run(predecessor);

    assert.equal(result.version, "DEV-284");
    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.executionVerified, true);

    assert.equal(
      result.executionVerificationState,
      "CONTROLLED_EXECUTION_VERIFIED"
    );

    assert.equal(
      result.controlledExecutionAttestation,
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
      result.controlledExecutionAttestationEvidence,
      predecessor.controlledExecutionAttestationEvidence
    );

    assert.deepEqual(
      result.controlledExecutionVerificationEvidence,
      [
        ...predecessor.controlledExecutionAttestationEvidence,
        "DEV-284:CONTROLLED_EXECUTION_VERIFIED"
      ]
    );

    assert.deepEqual(result.blockedReasons, []);

    assert.equal(result.mayInvokeExecutor, false);
    assert.equal(result.mayExecuteOperation, false);
    assert.equal(result.mayRetryExecution, false);
    assert.equal(result.mayPersistLifecycleState, false);
    assert.equal(result.mayModifyRepository, false);
    assert.equal(result.mayCommit, false);
    assert.equal(result.mayPush, false);
    assert.equal(
      result.mayPerformExternalSideEffects,
      false
    );

    assert.equal(
      result.futureControlledExecutionCertificationBoundaryRequired,
      true
    );
  }
);

test("DEV-284 rejects wrong predecessor version", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "version", "DEV-282");

  expectDenied(predecessor, "INVALID_DEV_283_VERSION");
});

test("DEV-284 rejects untrusted predecessor", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "trusted", false);

  expectDenied(
    predecessor,
    "UNTRUSTED_DEV_283_PREDECESSOR"
  );
});

test("DEV-284 rejects unready predecessor", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "ready", false);

  expectDenied(
    predecessor,
    "UNREADY_DEV_283_PREDECESSOR"
  );
});

test("DEV-284 rejects unattested predecessor", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "executionAttested", false);

  expectDenied(
    predecessor,
    "DEV_283_EXECUTION_NOT_ATTESTED"
  );
});

test("DEV-284 rejects wrong attestation state", () => {
  const predecessor = validPredecessor();

  Reflect.set(predecessor, "executionAttestationState", "CONTROLLED_EXECUTION_NOT_ATTESTED");

  expectDenied(
    predecessor,
    "INVALID_DEV_283_ATTESTATION_STATE"
  );
});

test(
  "DEV-284 rejects non-deterministic attestation result",
  () => {
    const predecessor = validPredecessor();

    Reflect.set(predecessor, "executionAttestationResultIsDeterministicData", false);

    expectDenied(
      predecessor,
      "NON_DETERMINISTIC_DEV_283_ATTESTATION_RESULT"
    );
  }
);

test(
  "DEV-284 rejects predecessor outside attestation boundary",
  () => {
    const predecessor = validPredecessor();

    Reflect.set(predecessor, "controlledExecutionAttestationBoundaryOnly", false);

    expectDenied(
      predecessor,
      "INVALID_DEV_283_ATTESTATION_BOUNDARY"
    );
  }
);

test("DEV-284 rejects missing execution audit", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledExecutionAudit", null);

  expectDenied(
    predecessor,
    "MISSING_DEV_283_EXECUTION_AUDIT"
  );
});

test("DEV-284 rejects missing execution archive", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledExecutionArchive", null);

  expectDenied(
    predecessor,
    "MISSING_DEV_283_EXECUTION_ARCHIVE"
  );
});

test("DEV-284 rejects missing execution closure", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledExecutionClosure", null);

  expectDenied(
    predecessor,
    "MISSING_DEV_283_EXECUTION_CLOSURE"
  );
});

test("DEV-284 rejects missing execution finalization", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledExecutionFinalization", null);

  expectDenied(
    predecessor,
    "MISSING_DEV_283_EXECUTION_FINALIZATION"
  );
});

test("DEV-284 rejects missing execution completion", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledExecutionCompletion", null);

  expectDenied(
    predecessor,
    "MISSING_DEV_283_EXECUTION_COMPLETION"
  );
});

test("DEV-284 rejects missing execution lifecycle", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledOperationExecutionLifecycle", null);

  expectDenied(
    predecessor,
    "MISSING_DEV_283_EXECUTION_LIFECYCLE"
  );
});

test("DEV-284 rejects missing execution receipt", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledOperationExecutionReceipt", null);

  expectDenied(
    predecessor,
    "MISSING_DEV_283_EXECUTION_RECEIPT"
  );
});

test(
  "DEV-284 rejects missing controlled operation execution",
  () => {
    const predecessor = validPredecessor();
    Reflect.set(predecessor, "controlledOperationExecution", null);

    expectDenied(
      predecessor,
      "MISSING_DEV_283_CONTROLLED_OPERATION_EXECUTION"
    );
  }
);

test(
  "DEV-284 rejects missing operation execution authorization",
  () => {
    const predecessor = validPredecessor();
    Reflect.set(predecessor, "operationExecutionAuthorization", null);

    expectDenied(
      predecessor,
      "MISSING_DEV_283_OPERATION_EXECUTION_AUTHORIZATION"
    );
  }
);

test(
  "DEV-284 rejects missing controlled executor invocation",
  () => {
    const predecessor = validPredecessor();
    Reflect.set(predecessor, "controlledExecutorInvocation", null);

    expectDenied(
      predecessor,
      "MISSING_DEV_283_CONTROLLED_EXECUTOR_INVOCATION"
    );
  }
);

test("DEV-284 rejects missing controlled dispatch", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledDispatch", null);

  expectDenied(
    predecessor,
    "MISSING_DEV_283_CONTROLLED_DISPATCH"
  );
});

test("DEV-284 rejects missing dispatch authorization", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "dispatchAuthorization", null);

  expectDenied(
    predecessor,
    "MISSING_DEV_283_DISPATCH_AUTHORIZATION"
  );
});

test("DEV-284 rejects missing active admission", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "activeAdmission", null);

  expectDenied(
    predecessor,
    "MISSING_DEV_283_ACTIVE_ADMISSION"
  );
});

test("DEV-284 rejects missing authorization", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "authorization", null);

  expectDenied(
    predecessor,
    "MISSING_DEV_283_AUTHORIZATION"
  );
});

test("DEV-284 rejects missing eligibility", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "eligibility", null);

  expectDenied(
    predecessor,
    "MISSING_DEV_283_ELIGIBILITY"
  );
});

test("DEV-284 rejects missing consumption", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "consumption", null);

  expectDenied(
    predecessor,
    "MISSING_DEV_283_CONSUMPTION"
  );
});

test("DEV-284 rejects missing receipt state", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "receiptState", null);

  expectDenied(
    predecessor,
    "MISSING_DEV_283_RECEIPT_STATE"
  );
});

test("DEV-284 rejects missing executed operation", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "executedOperation", null);

  expectDenied(
    predecessor,
    "MISSING_DEV_283_EXECUTED_OPERATION"
  );
});

test("DEV-284 rejects empty approved execution scope", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "approvedExecutionScope", []);

  expectDenied(
    predecessor,
    "EMPTY_DEV_283_APPROVED_EXECUTION_SCOPE"
  );
});

test("DEV-284 rejects empty provenance", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "provenance", []);

  expectDenied(
    predecessor,
    "EMPTY_DEV_283_PROVENANCE"
  );
});

test(
  "DEV-284 rejects missing controlled dispatch evidence",
  () => {
    const predecessor = validPredecessor();
    Reflect.set(predecessor, "controlledDispatchEvidence", []);

    expectDenied(
      predecessor,
      "MISSING_DEV_283_CONTROLLED_DISPATCH_EVIDENCE"
    );
  }
);

test(
  "DEV-284 rejects missing executor invocation authorization evidence",
  () => {
    const predecessor = validPredecessor();
    Reflect.set(predecessor, "executorInvocationAuthorizationEvidence", []);

    expectDenied(
      predecessor,
      "MISSING_DEV_283_EXECUTOR_INVOCATION_AUTHORIZATION_EVIDENCE"
    );
  }
);

test(
  "DEV-284 rejects missing controlled executor invocation evidence",
  () => {
    const predecessor = validPredecessor();
    Reflect.set(predecessor, "controlledExecutorInvocationEvidence", []);

    expectDenied(
      predecessor,
      "MISSING_DEV_283_CONTROLLED_EXECUTOR_INVOCATION_EVIDENCE"
    );
  }
);

test(
  "DEV-284 rejects missing operation execution authorization evidence",
  () => {
    const predecessor = validPredecessor();
    Reflect.set(predecessor, "operationExecutionAuthorizationEvidence", []);

    expectDenied(
      predecessor,
      "MISSING_DEV_283_OPERATION_EXECUTION_AUTHORIZATION_EVIDENCE"
    );
  }
);

test(
  "DEV-284 rejects missing controlled operation execution evidence",
  () => {
    const predecessor = validPredecessor();
    Reflect.set(predecessor, "controlledOperationExecutionEvidence", []);

    expectDenied(
      predecessor,
      "MISSING_DEV_283_CONTROLLED_OPERATION_EXECUTION_EVIDENCE"
    );
  }
);

test(
  "DEV-284 rejects missing execution receipt evidence",
  () => {
    const predecessor = validPredecessor();
    Reflect.set(predecessor, "controlledOperationExecutionReceiptEvidence", []);

    expectDenied(
      predecessor,
      "MISSING_DEV_283_CONTROLLED_OPERATION_EXECUTION_RECEIPT_EVIDENCE"
    );
  }
);

test(
  "DEV-284 rejects missing execution lifecycle evidence",
  () => {
    const predecessor = validPredecessor();
    Reflect.set(predecessor, "controlledOperationExecutionLifecycleEvidence", []);

    expectDenied(
      predecessor,
      "MISSING_DEV_283_CONTROLLED_OPERATION_EXECUTION_LIFECYCLE_EVIDENCE"
    );
  }
);

test(
  "DEV-284 rejects missing execution completion evidence",
  () => {
    const predecessor = validPredecessor();
    Reflect.set(predecessor, "controlledExecutionCompletionEvidence", []);

    expectDenied(
      predecessor,
      "MISSING_DEV_283_EXECUTION_COMPLETION_EVIDENCE"
    );
  }
);

test(
  "DEV-284 rejects missing execution finalization evidence",
  () => {
    const predecessor = validPredecessor();
    Reflect.set(predecessor, "controlledExecutionFinalizationEvidence", []);

    expectDenied(
      predecessor,
      "MISSING_DEV_283_EXECUTION_FINALIZATION_EVIDENCE"
    );
  }
);

test(
  "DEV-284 rejects missing execution closure evidence",
  () => {
    const predecessor = validPredecessor();
    Reflect.set(predecessor, "controlledExecutionClosureEvidence", []);

    expectDenied(
      predecessor,
      "MISSING_DEV_283_EXECUTION_CLOSURE_EVIDENCE"
    );
  }
);

test(
  "DEV-284 rejects missing execution archive evidence",
  () => {
    const predecessor = validPredecessor();
    Reflect.set(predecessor, "controlledExecutionArchiveEvidence", []);

    expectDenied(
      predecessor,
      "MISSING_DEV_283_EXECUTION_ARCHIVE_EVIDENCE"
    );
  }
);

test(
  "DEV-284 rejects missing execution audit evidence",
  () => {
    const predecessor = validPredecessor();
    Reflect.set(predecessor, "controlledExecutionAuditEvidence", []);

    expectDenied(
      predecessor,
      "MISSING_DEV_283_EXECUTION_AUDIT_EVIDENCE"
    );
  }
);

test(
  "DEV-284 rejects missing execution attestation evidence",
  () => {
    const predecessor = validPredecessor();
    Reflect.set(predecessor, "controlledExecutionAttestationEvidence", []);

    expectDenied(
      predecessor,
      "MISSING_DEV_283_EXECUTION_ATTESTATION_EVIDENCE"
    );
  }
);

test("DEV-284 rejects blocked predecessor", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "blockedReasons", ["blocked"]);

  expectDenied(
    predecessor,
    "BLOCKED_DEV_283_PREDECESSOR"
  );
});

test("DEV-284 rejects executor authority", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "mayInvokeExecutor", true);

  expectDenied(
    predecessor,
    "DEV_283_EXECUTOR_AUTHORITY_PRESENT"
  );
});

test("DEV-284 rejects execution authority", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "mayExecuteOperation", true);

  expectDenied(
    predecessor,
    "DEV_283_EXECUTION_AUTHORITY_PRESENT"
  );
});

test("DEV-284 rejects retry authority", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "mayRetryExecution", true);

  expectDenied(
    predecessor,
    "DEV_283_RETRY_AUTHORITY_PRESENT"
  );
});

test(
  "DEV-284 rejects lifecycle persistence authority",
  () => {
    const predecessor = validPredecessor();
    Reflect.set(predecessor, "mayPersistLifecycleState", true);

    expectDenied(
      predecessor,
      "DEV_283_LIFECYCLE_PERSISTENCE_AUTHORITY_PRESENT"
    );
  }
);

test(
  "DEV-284 rejects repository mutation authority",
  () => {
    const predecessor = validPredecessor();
    Reflect.set(predecessor, "mayModifyRepository", true);

    expectDenied(
      predecessor,
      "DEV_283_REPOSITORY_MUTATION_AUTHORITY_PRESENT"
    );
  }
);

test("DEV-284 rejects commit authority", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "mayCommit", true);

  expectDenied(
    predecessor,
    "DEV_283_COMMIT_AUTHORITY_PRESENT"
  );
});

test("DEV-284 rejects push authority", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "mayPush", true);

  expectDenied(
    predecessor,
    "DEV_283_PUSH_AUTHORITY_PRESENT"
  );
});

test(
  "DEV-284 rejects external side-effect authority",
  () => {
    const predecessor = validPredecessor();
    Reflect.set(predecessor, "mayPerformExternalSideEffects", true);

    expectDenied(
      predecessor,
      "DEV_283_EXTERNAL_SIDE_EFFECT_AUTHORITY_PRESENT"
    );
  }
);

test(
  "DEV-284 rejects missing future verification boundary",
  () => {
    const predecessor = validPredecessor();

    Reflect.set(predecessor, "futureControlledExecutionVerificationBoundaryRequired", false);

    expectDenied(
      predecessor,
      "MISSING_DEV_283_FUTURE_VERIFICATION_BOUNDARY"
    );
  }
);
