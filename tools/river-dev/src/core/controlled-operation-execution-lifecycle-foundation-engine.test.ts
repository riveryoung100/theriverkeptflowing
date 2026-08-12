import assert from "node:assert/strict";
import test from "node:test";

import type {
  RiverDevControlledOperationExecutionReceiptFoundationResult
} from "../types";

import {
  establishControlledOperationExecutionLifecycle
} from "./controlled-operation-execution-lifecycle-foundation-engine";

function validPredecessor(): RiverDevControlledOperationExecutionReceiptFoundationResult {
  return {
    version: "DEV-276",

    trusted: true,
    ready: true,
    executionReceiptCreated: true,

    defaultPolicy: "DENY",

    controlledOperationExecutionReceiptBoundaryOnly: true,
    executionReceiptResultIsDeterministicData: true,

    executionReceiptState:
      "CONTROLLED_OPERATION_EXECUTION_RECEIPT_CREATED",

    controlledOperationExecution:
      {} as RiverDevControlledOperationExecutionReceiptFoundationResult["controlledOperationExecution"],

    operationExecutionAuthorization:
      {} as RiverDevControlledOperationExecutionReceiptFoundationResult["operationExecutionAuthorization"],

    controlledExecutorInvocation:
      {} as RiverDevControlledOperationExecutionReceiptFoundationResult["controlledExecutorInvocation"],

    controlledDispatch:
      {} as RiverDevControlledOperationExecutionReceiptFoundationResult["controlledDispatch"],

    dispatchAuthorization:
      {} as RiverDevControlledOperationExecutionReceiptFoundationResult["dispatchAuthorization"],

    activeAdmission:
      {} as RiverDevControlledOperationExecutionReceiptFoundationResult["activeAdmission"],

    authorization:
      {} as RiverDevControlledOperationExecutionReceiptFoundationResult["authorization"],

    eligibility:
      {} as RiverDevControlledOperationExecutionReceiptFoundationResult["eligibility"],

    consumption:
      {} as RiverDevControlledOperationExecutionReceiptFoundationResult["consumption"],

    receiptState:
      {} as RiverDevControlledOperationExecutionReceiptFoundationResult["receiptState"],

    executedOperation:
      {} as RiverDevControlledOperationExecutionReceiptFoundationResult["executedOperation"],

    approvedExecutionScope: ["operation:test"],
    provenance: ["DEV-275", "DEV-276"],

    controlledDispatchEvidence: ["dispatch-evidence"],
    executorInvocationAuthorizationEvidence: ["invocation-authorization-evidence"],
    controlledExecutorInvocationEvidence: ["controlled-invocation-evidence"],
    operationExecutionAuthorizationEvidence: ["operation-authorization-evidence"],
    controlledOperationExecutionEvidence: ["operation-execution-evidence"],
    controlledOperationExecutionReceiptEvidence: ["execution-receipt-evidence"],

    blockedReasons: [],

    singleExecutionReceiptOnly: true,
    receiptMustPreserveExactExecutionScope: true,
    receiptMustPreservePredecessorEvidence: true,
    receiptMustPreserveExecutionEvidence: true,

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

    futureExecutionLifecycleBoundaryRequired: true
  };
}

function expectRejected(
  predecessor: RiverDevControlledOperationExecutionReceiptFoundationResult
): void {
  const result =
    establishControlledOperationExecutionLifecycle(predecessor);

  assert.equal(result.trusted, false);
  assert.equal(result.ready, false);
  assert.equal(result.executionLifecycleEstablished, false);

  assert.equal(
    result.executionLifecycleState,
    "CONTROLLED_OPERATION_EXECUTION_LIFECYCLE_NOT_ESTABLISHED"
  );

  assert.equal(result.controlledOperationExecutionReceipt, null);
  assert.equal(result.controlledOperationExecutionLifecycleEvidence.length, 0);
  assert.ok(result.blockedReasons.length > 0);

  assert.equal(result.mayInvokeExecutor, false);
  assert.equal(result.mayExecuteOperation, false);
  assert.equal(result.mayRetryExecution, false);
  assert.equal(result.mayPersistLifecycleState, false);
  assert.equal(result.mayModifyRepository, false);
  assert.equal(result.mayCommit, false);
  assert.equal(result.mayPush, false);
  assert.equal(result.mayPerformExternalSideEffects, false);
}

test("DEV-277 establishes lifecycle only from a valid exact DEV-276 predecessor", () => {
  const predecessor = validPredecessor();

  const result =
    establishControlledOperationExecutionLifecycle(predecessor);

  assert.equal(result.version, "DEV-277");
  assert.equal(result.trusted, true);
  assert.equal(result.ready, true);
  assert.equal(result.executionLifecycleEstablished, true);

  assert.equal(result.defaultPolicy, "DENY");

  assert.equal(
    result.controlledOperationExecutionLifecycleBoundaryOnly,
    true
  );

  assert.equal(
    result.executionLifecycleResultIsDeterministicData,
    true
  );

  assert.equal(
    result.executionLifecycleState,
    "CONTROLLED_OPERATION_EXECUTION_LIFECYCLE_ESTABLISHED"
  );

  assert.equal(
    result.controlledOperationExecutionReceipt,
    predecessor
  );

  assert.deepEqual(
    result.approvedExecutionScope,
    predecessor.approvedExecutionScope
  );

  assert.notEqual(
    result.approvedExecutionScope,
    predecessor.approvedExecutionScope
  );

  assert.deepEqual(
    result.controlledOperationExecutionReceiptEvidence,
    predecessor.controlledOperationExecutionReceiptEvidence
  );

  assert.notEqual(
    result.controlledOperationExecutionReceiptEvidence,
    predecessor.controlledOperationExecutionReceiptEvidence
  );

  assert.deepEqual(
    result.provenance,
    [...predecessor.provenance, "DEV-277"]
  );

  assert.equal(
    result.controlledOperationExecutionLifecycleEvidence.length,
    3
  );

  assert.deepEqual(result.blockedReasons, []);

  assert.equal(result.singleLifecycleTransitionOnly, true);
  assert.equal(result.lifecycleMustPreserveExactExecutionScope, true);
  assert.equal(result.lifecycleMustPreserveReceiptEvidence, true);
  assert.equal(result.lifecycleMustPreserveExecutionEvidence, true);
  assert.equal(result.lifecycleMustPreservePredecessorEvidence, true);

  assert.equal(result.mayInvokeExecutor, false);
  assert.equal(result.mayExecuteOperation, false);
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
  assert.equal(result.mayPerformArbitraryShellExecution, false);
  assert.equal(result.mayPerformNetworkExecution, false);
  assert.equal(result.mayPerformExternalSideEffects, false);

  assert.equal(
    result.futureControlledExecutionCompletionBoundaryRequired,
    true
  );
});

test("DEV-277 rejects wrong predecessor version", () => {
  const predecessor = validPredecessor();

  (predecessor as unknown as { version: string }).version =
    "DEV-275";

  expectRejected(predecessor);
});

test("DEV-277 rejects untrusted predecessor", () => {
  const predecessor = validPredecessor();
  predecessor.trusted = false;

  expectRejected(predecessor);
});

test("DEV-277 rejects unready predecessor", () => {
  const predecessor = validPredecessor();
  predecessor.ready = false;

  expectRejected(predecessor);
});

test("DEV-277 rejects predecessor without execution receipt", () => {
  const predecessor = validPredecessor();
  predecessor.executionReceiptCreated = false;

  expectRejected(predecessor);
});

test("DEV-277 rejects wrong receipt state", () => {
  const predecessor = validPredecessor();

  predecessor.executionReceiptState =
    "CONTROLLED_OPERATION_EXECUTION_RECEIPT_NOT_CREATED";

  expectRejected(predecessor);
});

test("DEV-277 rejects non-deterministic receipt predecessor", () => {
  const predecessor = validPredecessor();

  (predecessor as unknown as {
    executionReceiptResultIsDeterministicData: boolean;
  }).executionReceiptResultIsDeterministicData = false;

  expectRejected(predecessor);
});

test("DEV-277 rejects predecessor outside receipt boundary", () => {
  const predecessor = validPredecessor();

  (predecessor as unknown as {
    controlledOperationExecutionReceiptBoundaryOnly: boolean;
  }).controlledOperationExecutionReceiptBoundaryOnly = false;

  expectRejected(predecessor);
});

test("DEV-277 rejects missing controlled operation execution", () => {
  const predecessor = validPredecessor();
  predecessor.controlledOperationExecution = null;

  expectRejected(predecessor);
});

test("DEV-277 rejects missing executed operation", () => {
  const predecessor = validPredecessor();
  predecessor.executedOperation = null;

  expectRejected(predecessor);
});

test("DEV-277 rejects empty approved execution scope", () => {
  const predecessor = validPredecessor();
  predecessor.approvedExecutionScope = [];

  expectRejected(predecessor);
});

test("DEV-277 rejects empty provenance", () => {
  const predecessor = validPredecessor();
  predecessor.provenance = [];

  expectRejected(predecessor);
});

test("DEV-277 rejects missing controlled dispatch evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledDispatchEvidence = [];

  expectRejected(predecessor);
});

test("DEV-277 rejects missing controlled executor invocation evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledExecutorInvocationEvidence = [];

  expectRejected(predecessor);
});

test("DEV-277 rejects missing operation execution authorization evidence", () => {
  const predecessor = validPredecessor();
  predecessor.operationExecutionAuthorizationEvidence = [];

  expectRejected(predecessor);
});

test("DEV-277 rejects missing controlled operation execution evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledOperationExecutionEvidence = [];

  expectRejected(predecessor);
});

test("DEV-277 rejects missing controlled operation execution receipt evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledOperationExecutionReceiptEvidence = [];

  expectRejected(predecessor);
});

test("DEV-277 rejects blocked predecessor", () => {
  const predecessor = validPredecessor();
  predecessor.blockedReasons = ["blocked"];

  expectRejected(predecessor);
});

test("DEV-277 rejects predecessor with executor authority", () => {
  const predecessor = validPredecessor();

  (predecessor as unknown as {
    mayInvokeExecutor: boolean;
  }).mayInvokeExecutor = true;

  expectRejected(predecessor);
});

test("DEV-277 rejects predecessor with execution authority", () => {
  const predecessor = validPredecessor();

  (predecessor as unknown as {
    mayExecuteOperation: boolean;
  }).mayExecuteOperation = true;

  expectRejected(predecessor);
});

test("DEV-277 rejects predecessor with retry authority", () => {
  const predecessor = validPredecessor();

  (predecessor as unknown as {
    mayRetryExecution: boolean;
  }).mayRetryExecution = true;

  expectRejected(predecessor);
});

test("DEV-277 rejects predecessor with lifecycle persistence authority", () => {
  const predecessor = validPredecessor();

  (predecessor as unknown as {
    mayPersistLifecycleState: boolean;
  }).mayPersistLifecycleState = true;

  expectRejected(predecessor);
});

test("DEV-277 rejects predecessor with repository mutation authority", () => {
  const predecessor = validPredecessor();

  (predecessor as unknown as {
    mayModifyRepository: boolean;
  }).mayModifyRepository = true;

  expectRejected(predecessor);
});

test("DEV-277 rejects predecessor with external side-effect authority", () => {
  const predecessor = validPredecessor();

  (predecessor as unknown as {
    mayPerformExternalSideEffects: boolean;
  }).mayPerformExternalSideEffects = true;

  expectRejected(predecessor);
});

test("DEV-277 rejects missing future execution lifecycle boundary", () => {
  const predecessor = validPredecessor();

  (predecessor as unknown as {
    futureExecutionLifecycleBoundaryRequired: boolean;
  }).futureExecutionLifecycleBoundaryRequired = false;

  expectRejected(predecessor);
});
