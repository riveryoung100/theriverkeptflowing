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
  const predecessor = validPredecessor() as any;
  predecessor.version = "DEV-281";

  const result = run(predecessor);

  assert.deepEqual(result.blockedReasons, [
    "INVALID_DEV_282_VERSION"
  ]);
});

test("DEV-283 rejects untrusted predecessor", () => {
  const predecessor = validPredecessor();
  predecessor.trusted = false;

  assert.deepEqual(run(predecessor).blockedReasons, [
    "UNTRUSTED_DEV_282_PREDECESSOR"
  ]);
});

test("DEV-283 rejects unready predecessor", () => {
  const predecessor = validPredecessor();
  predecessor.ready = false;

  assert.deepEqual(run(predecessor).blockedReasons, [
    "UNREADY_DEV_282_PREDECESSOR"
  ]);
});

test("DEV-283 rejects unaudited predecessor", () => {
  const predecessor = validPredecessor();
  predecessor.executionAudited = false;

  assert.deepEqual(run(predecessor).blockedReasons, [
    "DEV_282_EXECUTION_NOT_AUDITED"
  ]);
});

test("DEV-283 rejects wrong audit state", () => {
  const predecessor = validPredecessor();

  predecessor.executionAuditState =
    "CONTROLLED_EXECUTION_NOT_AUDITED";

  assert.deepEqual(run(predecessor).blockedReasons, [
    "INVALID_DEV_282_AUDIT_STATE"
  ]);
});

test("DEV-283 rejects non-deterministic audit result", () => {
  const predecessor = validPredecessor() as any;
  predecessor.executionAuditResultIsDeterministicData = false;

  assert.deepEqual(run(predecessor).blockedReasons, [
    "NON_DETERMINISTIC_DEV_282_AUDIT_RESULT"
  ]);
});

test("DEV-283 rejects predecessor outside audit boundary", () => {
  const predecessor = validPredecessor() as any;
  predecessor.controlledExecutionAuditBoundaryOnly = false;

  assert.deepEqual(run(predecessor).blockedReasons, [
    "INVALID_DEV_282_AUDIT_BOUNDARY"
  ]);
});

test("DEV-283 rejects missing execution archive", () => {
  const predecessor = validPredecessor();
  predecessor.controlledExecutionArchive = null;

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_EXECUTION_ARCHIVE"
  ]);
});

test("DEV-283 rejects missing execution closure", () => {
  const predecessor = validPredecessor();
  predecessor.controlledExecutionClosure = null;

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_EXECUTION_CLOSURE"
  ]);
});

test("DEV-283 rejects missing execution finalization", () => {
  const predecessor = validPredecessor();
  predecessor.controlledExecutionFinalization = null;

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_EXECUTION_FINALIZATION"
  ]);
});

test("DEV-283 rejects missing execution completion", () => {
  const predecessor = validPredecessor();
  predecessor.controlledExecutionCompletion = null;

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_EXECUTION_COMPLETION"
  ]);
});

test("DEV-283 rejects missing execution lifecycle", () => {
  const predecessor = validPredecessor();
  predecessor.controlledOperationExecutionLifecycle = null;

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_EXECUTION_LIFECYCLE"
  ]);
});

test("DEV-283 rejects missing execution receipt", () => {
  const predecessor = validPredecessor();
  predecessor.controlledOperationExecutionReceipt = null;

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_EXECUTION_RECEIPT"
  ]);
});

test("DEV-283 rejects missing controlled operation execution", () => {
  const predecessor = validPredecessor();
  predecessor.controlledOperationExecution = null;

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_CONTROLLED_OPERATION_EXECUTION"
  ]);
});

test("DEV-283 rejects missing operation execution authorization", () => {
  const predecessor = validPredecessor();
  predecessor.operationExecutionAuthorization = null;

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_OPERATION_EXECUTION_AUTHORIZATION"
  ]);
});

test("DEV-283 rejects missing controlled executor invocation", () => {
  const predecessor = validPredecessor();
  predecessor.controlledExecutorInvocation = null;

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_CONTROLLED_EXECUTOR_INVOCATION"
  ]);
});

test("DEV-283 rejects missing controlled dispatch", () => {
  const predecessor = validPredecessor();
  predecessor.controlledDispatch = null;

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_CONTROLLED_DISPATCH"
  ]);
});

test("DEV-283 rejects missing dispatch authorization", () => {
  const predecessor = validPredecessor();
  predecessor.dispatchAuthorization = null;

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_DISPATCH_AUTHORIZATION"
  ]);
});

test("DEV-283 rejects missing active admission", () => {
  const predecessor = validPredecessor();
  predecessor.activeAdmission = null;

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_ACTIVE_ADMISSION"
  ]);
});

test("DEV-283 rejects missing authorization", () => {
  const predecessor = validPredecessor();
  predecessor.authorization = null;

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_AUTHORIZATION"
  ]);
});

test("DEV-283 rejects missing eligibility", () => {
  const predecessor = validPredecessor();
  predecessor.eligibility = null;

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_ELIGIBILITY"
  ]);
});

test("DEV-283 rejects missing consumption", () => {
  const predecessor = validPredecessor();
  predecessor.consumption = null;

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_CONSUMPTION"
  ]);
});

test("DEV-283 rejects missing receipt state", () => {
  const predecessor = validPredecessor();
  predecessor.receiptState = null;

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_RECEIPT_STATE"
  ]);
});

test("DEV-283 rejects missing executed operation", () => {
  const predecessor = validPredecessor();
  predecessor.executedOperation = null;

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_EXECUTED_OPERATION"
  ]);
});

test("DEV-283 rejects empty approved execution scope", () => {
  const predecessor = validPredecessor();
  predecessor.approvedExecutionScope = [];

  assert.deepEqual(run(predecessor).blockedReasons, [
    "EMPTY_DEV_282_APPROVED_EXECUTION_SCOPE"
  ]);
});

test("DEV-283 rejects empty provenance", () => {
  const predecessor = validPredecessor();
  predecessor.provenance = [];

  assert.deepEqual(run(predecessor).blockedReasons, [
    "EMPTY_DEV_282_PROVENANCE"
  ]);
});

test("DEV-283 rejects missing controlled dispatch evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledDispatchEvidence = [];

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_CONTROLLED_DISPATCH_EVIDENCE"
  ]);
});

test(
  "DEV-283 rejects missing executor invocation authorization evidence",
  () => {
    const predecessor = validPredecessor();
    predecessor.executorInvocationAuthorizationEvidence = [];

    assert.deepEqual(run(predecessor).blockedReasons, [
      "MISSING_DEV_282_EXECUTOR_INVOCATION_AUTHORIZATION_EVIDENCE"
    ]);
  }
);

test(
  "DEV-283 rejects missing controlled executor invocation evidence",
  () => {
    const predecessor = validPredecessor();
    predecessor.controlledExecutorInvocationEvidence = [];

    assert.deepEqual(run(predecessor).blockedReasons, [
      "MISSING_DEV_282_CONTROLLED_EXECUTOR_INVOCATION_EVIDENCE"
    ]);
  }
);

test(
  "DEV-283 rejects missing operation execution authorization evidence",
  () => {
    const predecessor = validPredecessor();
    predecessor.operationExecutionAuthorizationEvidence = [];

    assert.deepEqual(run(predecessor).blockedReasons, [
      "MISSING_DEV_282_OPERATION_EXECUTION_AUTHORIZATION_EVIDENCE"
    ]);
  }
);

test(
  "DEV-283 rejects missing controlled operation execution evidence",
  () => {
    const predecessor = validPredecessor();
    predecessor.controlledOperationExecutionEvidence = [];

    assert.deepEqual(run(predecessor).blockedReasons, [
      "MISSING_DEV_282_CONTROLLED_OPERATION_EXECUTION_EVIDENCE"
    ]);
  }
);

test("DEV-283 rejects missing execution receipt evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledOperationExecutionReceiptEvidence = [];

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_CONTROLLED_OPERATION_EXECUTION_RECEIPT_EVIDENCE"
  ]);
});

test("DEV-283 rejects missing execution lifecycle evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledOperationExecutionLifecycleEvidence = [];

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_CONTROLLED_OPERATION_EXECUTION_LIFECYCLE_EVIDENCE"
  ]);
});

test("DEV-283 rejects missing execution completion evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledExecutionCompletionEvidence = [];

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_EXECUTION_COMPLETION_EVIDENCE"
  ]);
});

test("DEV-283 rejects missing execution finalization evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledExecutionFinalizationEvidence = [];

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_EXECUTION_FINALIZATION_EVIDENCE"
  ]);
});

test("DEV-283 rejects missing execution closure evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledExecutionClosureEvidence = [];

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_EXECUTION_CLOSURE_EVIDENCE"
  ]);
});

test("DEV-283 rejects missing execution archive evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledExecutionArchiveEvidence = [];

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_EXECUTION_ARCHIVE_EVIDENCE"
  ]);
});

test("DEV-283 rejects missing execution audit evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledExecutionAuditEvidence = [];

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_EXECUTION_AUDIT_EVIDENCE"
  ]);
});

test("DEV-283 rejects blocked predecessor", () => {
  const predecessor = validPredecessor();
  predecessor.blockedReasons = ["blocked"];

  assert.deepEqual(run(predecessor).blockedReasons, [
    "BLOCKED_DEV_282_PREDECESSOR"
  ]);
});

test("DEV-283 rejects executor authority", () => {
  const predecessor = validPredecessor() as any;
  predecessor.mayInvokeExecutor = true;

  assert.deepEqual(run(predecessor).blockedReasons, [
    "DEV_282_EXECUTOR_AUTHORITY_PRESENT"
  ]);
});

test("DEV-283 rejects execution authority", () => {
  const predecessor = validPredecessor() as any;
  predecessor.mayExecuteOperation = true;

  assert.deepEqual(run(predecessor).blockedReasons, [
    "DEV_282_EXECUTION_AUTHORITY_PRESENT"
  ]);
});

test("DEV-283 rejects retry authority", () => {
  const predecessor = validPredecessor() as any;
  predecessor.mayRetryExecution = true;

  assert.deepEqual(run(predecessor).blockedReasons, [
    "DEV_282_RETRY_AUTHORITY_PRESENT"
  ]);
});

test("DEV-283 rejects lifecycle persistence authority", () => {
  const predecessor = validPredecessor() as any;
  predecessor.mayPersistLifecycleState = true;

  assert.deepEqual(run(predecessor).blockedReasons, [
    "DEV_282_LIFECYCLE_PERSISTENCE_AUTHORITY_PRESENT"
  ]);
});

test("DEV-283 rejects repository mutation authority", () => {
  const predecessor = validPredecessor() as any;
  predecessor.mayModifyRepository = true;

  assert.deepEqual(run(predecessor).blockedReasons, [
    "DEV_282_REPOSITORY_MUTATION_AUTHORITY_PRESENT"
  ]);
});

test("DEV-283 rejects commit authority", () => {
  const predecessor = validPredecessor() as any;
  predecessor.mayCommit = true;

  assert.deepEqual(run(predecessor).blockedReasons, [
    "DEV_282_COMMIT_AUTHORITY_PRESENT"
  ]);
});

test("DEV-283 rejects push authority", () => {
  const predecessor = validPredecessor() as any;
  predecessor.mayPush = true;

  assert.deepEqual(run(predecessor).blockedReasons, [
    "DEV_282_PUSH_AUTHORITY_PRESENT"
  ]);
});

test("DEV-283 rejects external side-effect authority", () => {
  const predecessor = validPredecessor() as any;
  predecessor.mayPerformExternalSideEffects = true;

  assert.deepEqual(run(predecessor).blockedReasons, [
    "DEV_282_EXTERNAL_SIDE_EFFECT_AUTHORITY_PRESENT"
  ]);
});

test("DEV-283 rejects missing future attestation boundary", () => {
  const predecessor = validPredecessor() as any;

  predecessor.futureControlledExecutionAttestationBoundaryRequired =
    false;

  assert.deepEqual(run(predecessor).blockedReasons, [
    "MISSING_DEV_282_FUTURE_ATTESTATION_BOUNDARY"
  ]);
});
