import assert from "node:assert/strict";
import test from "node:test";

import type {
  RiverDevControlledExecutionAuditFoundationResult
} from "../types";

import {
  buildControlledExecutionAttestationFoundation
} from "./controlled-execution-attestation-foundation-engine";

function validPredecessor():
  RiverDevControlledExecutionAuditFoundationResult {
  return {
    version: "DEV-282",

    trusted: true,
    ready: true,
    executionAudited: true,

    defaultPolicy: "DENY",

    controlledExecutionAuditBoundaryOnly: true,
    executionAuditResultIsDeterministicData: true,

    executionAuditState: "CONTROLLED_EXECUTION_AUDITED",

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
    provenance: ["DEV-282"],

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

    futureControlledExecutionAttestationBoundaryRequired: true
  };
}

function run(
  predecessor: RiverDevControlledExecutionAuditFoundationResult
) {
  return buildControlledExecutionAttestationFoundation({
    predecessor
  });
}

test(
  "DEV-283 attests only a valid exact DEV-282 predecessor",
  () => {
    const predecessor = validPredecessor();

    const result = run(predecessor);

    assert.equal(result.version, "DEV-283");
    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.executionAttested, true);

    assert.equal(
      result.executionAttestationState,
      "CONTROLLED_EXECUTION_ATTESTED"
    );

    assert.equal(result.controlledExecutionAudit, predecessor);

    assert.deepEqual(
      result.approvedExecutionScope,
      predecessor.approvedExecutionScope
    );

    assert.deepEqual(
      result.provenance,
      predecessor.provenance
    );

    assert.deepEqual(
      result.controlledExecutionAuditEvidence,
      predecessor.controlledExecutionAuditEvidence
    );

    assert.deepEqual(
      result.controlledExecutionAttestationEvidence,
      [
        ...predecessor.controlledExecutionAuditEvidence,
        "DEV-283:CONTROLLED_EXECUTION_ATTESTED"
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
      result.futureControlledExecutionVerificationBoundaryRequired,
      true
    );
  }
);

test("DEV-283 rejects wrong predecessor version", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "version", "DEV-281");

  const result = run(predecessor);

  assert.deepEqual(result.blockedReasons, [
    "INVALID_DEV_282_VERSION"
  ]);
});

test("DEV-283 rejects untrusted predecessor", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "trusted", false);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "UNTRUSTED_DEV_282_PREDECESSOR"
  ]);
});

test("DEV-283 rejects unready predecessor", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "ready", false);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "UNREADY_DEV_282_PREDECESSOR"
  ]);
});

test("DEV-283 rejects unaudited predecessor", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "executionAudited", false);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "DEV_282_EXECUTION_NOT_AUDITED"
  ]);
});

test("DEV-283 rejects wrong audit state", () => {
  const predecessor = validPredecessor();

  Reflect.set(predecessor, "executionAuditState", "CONTROLLED_EXECUTION_NOT_AUDITED");

  assert.deepEqual(run(predecessor).blockedReasons, [
    "INVALID_DEV_282_AUDIT_STATE"
  ]);
});

test("DEV-283 rejects non-deterministic audit result", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "executionAuditResultIsDeterministicData", false);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "NON_DETERMINISTIC_DEV_282_AUDIT_RESULT"
  ]);
});

test("DEV-283 rejects predecessor outside audit boundary", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledExecutionAuditBoundaryOnly", false);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "INVALID_DEV_282_AUDIT_BOUNDARY"
  ]);
});

test("DEV-283 rejects missing execution archive", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledExecutionArchive", null);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_EXECUTION_ARCHIVE"
  ]);
});

test("DEV-283 rejects missing execution closure", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledExecutionClosure", null);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_EXECUTION_CLOSURE"
  ]);
});

test("DEV-283 rejects missing execution finalization", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledExecutionFinalization", null);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_EXECUTION_FINALIZATION"
  ]);
});

test("DEV-283 rejects missing execution completion", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledExecutionCompletion", null);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_EXECUTION_COMPLETION"
  ]);
});

test("DEV-283 rejects missing execution lifecycle", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledOperationExecutionLifecycle", null);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_EXECUTION_LIFECYCLE"
  ]);
});

test("DEV-283 rejects missing execution receipt", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledOperationExecutionReceipt", null);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_EXECUTION_RECEIPT"
  ]);
});

test("DEV-283 rejects missing controlled operation execution", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledOperationExecution", null);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_CONTROLLED_OPERATION_EXECUTION"
  ]);
});

test("DEV-283 rejects missing operation execution authorization", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "operationExecutionAuthorization", null);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_OPERATION_EXECUTION_AUTHORIZATION"
  ]);
});

test("DEV-283 rejects missing controlled executor invocation", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledExecutorInvocation", null);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_CONTROLLED_EXECUTOR_INVOCATION"
  ]);
});

test("DEV-283 rejects missing controlled dispatch", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledDispatch", null);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_CONTROLLED_DISPATCH"
  ]);
});

test("DEV-283 rejects missing dispatch authorization", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "dispatchAuthorization", null);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_DISPATCH_AUTHORIZATION"
  ]);
});

test("DEV-283 rejects missing active admission", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "activeAdmission", null);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_ACTIVE_ADMISSION"
  ]);
});

test("DEV-283 rejects missing authorization", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "authorization", null);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_AUTHORIZATION"
  ]);
});

test("DEV-283 rejects missing eligibility", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "eligibility", null);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_ELIGIBILITY"
  ]);
});

test("DEV-283 rejects missing consumption", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "consumption", null);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_CONSUMPTION"
  ]);
});

test("DEV-283 rejects missing receipt state", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "receiptState", null);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_RECEIPT_STATE"
  ]);
});

test("DEV-283 rejects missing executed operation", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "executedOperation", null);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_EXECUTED_OPERATION"
  ]);
});

test("DEV-283 rejects empty approved execution scope", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "approvedExecutionScope", []);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "EMPTY_DEV_282_APPROVED_EXECUTION_SCOPE"
  ]);
});

test("DEV-283 rejects empty provenance", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "provenance", []);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "EMPTY_DEV_282_PROVENANCE"
  ]);
});

test("DEV-283 rejects missing controlled dispatch evidence", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledDispatchEvidence", []);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_CONTROLLED_DISPATCH_EVIDENCE"
  ]);
});

test(
  "DEV-283 rejects missing executor invocation authorization evidence",
  () => {
    const predecessor = validPredecessor();
    Reflect.set(predecessor, "executorInvocationAuthorizationEvidence", []);

    assert.deepEqual(run(predecessor).blockedReasons, [
      "MISSING_DEV_282_EXECUTOR_INVOCATION_AUTHORIZATION_EVIDENCE"
    ]);
  }
);

test(
  "DEV-283 rejects missing controlled executor invocation evidence",
  () => {
    const predecessor = validPredecessor();
    Reflect.set(predecessor, "controlledExecutorInvocationEvidence", []);

    assert.deepEqual(run(predecessor).blockedReasons, [
      "MISSING_DEV_282_CONTROLLED_EXECUTOR_INVOCATION_EVIDENCE"
    ]);
  }
);

test(
  "DEV-283 rejects missing operation execution authorization evidence",
  () => {
    const predecessor = validPredecessor();
    Reflect.set(predecessor, "operationExecutionAuthorizationEvidence", []);

    assert.deepEqual(run(predecessor).blockedReasons, [
      "MISSING_DEV_282_OPERATION_EXECUTION_AUTHORIZATION_EVIDENCE"
    ]);
  }
);

test(
  "DEV-283 rejects missing controlled operation execution evidence",
  () => {
    const predecessor = validPredecessor();
    Reflect.set(predecessor, "controlledOperationExecutionEvidence", []);

    assert.deepEqual(run(predecessor).blockedReasons, [
      "MISSING_DEV_282_CONTROLLED_OPERATION_EXECUTION_EVIDENCE"
    ]);
  }
);

test("DEV-283 rejects missing execution receipt evidence", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledOperationExecutionReceiptEvidence", []);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_CONTROLLED_OPERATION_EXECUTION_RECEIPT_EVIDENCE"
  ]);
});

test("DEV-283 rejects missing execution lifecycle evidence", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledOperationExecutionLifecycleEvidence", []);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_CONTROLLED_OPERATION_EXECUTION_LIFECYCLE_EVIDENCE"
  ]);
});

test("DEV-283 rejects missing execution completion evidence", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledExecutionCompletionEvidence", []);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_EXECUTION_COMPLETION_EVIDENCE"
  ]);
});

test("DEV-283 rejects missing execution finalization evidence", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledExecutionFinalizationEvidence", []);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_EXECUTION_FINALIZATION_EVIDENCE"
  ]);
});

test("DEV-283 rejects missing execution closure evidence", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledExecutionClosureEvidence", []);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_EXECUTION_CLOSURE_EVIDENCE"
  ]);
});

test("DEV-283 rejects missing execution archive evidence", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledExecutionArchiveEvidence", []);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_EXECUTION_ARCHIVE_EVIDENCE"
  ]);
});

test("DEV-283 rejects missing execution audit evidence", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledExecutionAuditEvidence", []);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_EXECUTION_AUDIT_EVIDENCE"
  ]);
});

test("DEV-283 rejects blocked predecessor", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "blockedReasons", ["blocked"]);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "BLOCKED_DEV_282_PREDECESSOR"
  ]);
});

test("DEV-283 rejects executor authority", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "mayInvokeExecutor", true);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "DEV_282_EXECUTOR_AUTHORITY_PRESENT"
  ]);
});

test("DEV-283 rejects execution authority", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "mayExecuteOperation", true);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "DEV_282_EXECUTION_AUTHORITY_PRESENT"
  ]);
});

test("DEV-283 rejects retry authority", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "mayRetryExecution", true);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "DEV_282_RETRY_AUTHORITY_PRESENT"
  ]);
});

test("DEV-283 rejects lifecycle persistence authority", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "mayPersistLifecycleState", true);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "DEV_282_LIFECYCLE_PERSISTENCE_AUTHORITY_PRESENT"
  ]);
});

test("DEV-283 rejects repository mutation authority", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "mayModifyRepository", true);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "DEV_282_REPOSITORY_MUTATION_AUTHORITY_PRESENT"
  ]);
});

test("DEV-283 rejects commit authority", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "mayCommit", true);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "DEV_282_COMMIT_AUTHORITY_PRESENT"
  ]);
});

test("DEV-283 rejects push authority", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "mayPush", true);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "DEV_282_PUSH_AUTHORITY_PRESENT"
  ]);
});

test("DEV-283 rejects external side-effect authority", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "mayPerformExternalSideEffects", true);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "DEV_282_EXTERNAL_SIDE_EFFECT_AUTHORITY_PRESENT"
  ]);
});

test("DEV-283 rejects missing future attestation boundary", () => {
  const predecessor = validPredecessor();

  Reflect.set(predecessor, "futureControlledExecutionAttestationBoundaryRequired", false);

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_FUTURE_ATTESTATION_BOUNDARY"
  ]);
});
