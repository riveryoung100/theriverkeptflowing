import assert from "node:assert/strict";
import test from "node:test";

import type {
  RiverDevControlledOperationExecutionBoundaryFoundationResult
} from "../types";

import {
  createControlledOperationExecutionReceipt
} from "./controlled-operation-execution-receipt-foundation-engine";

function validPredecessor(): RiverDevControlledOperationExecutionBoundaryFoundationResult {
  return {
    version: "DEV-275",

    trusted: true,
    ready: true,
    operationExecuted: true,

    defaultPolicy: "DENY",

    controlledOperationExecutionBoundaryOnly: true,
    executionResultIsDeterministicData: true,

    executionState: "CONTROLLED_OPERATION_EXECUTED",

    operationExecutionAuthorization: {} as RiverDevControlledOperationExecutionBoundaryFoundationResult["operationExecutionAuthorization"],
    controlledExecutorInvocation: {} as RiverDevControlledOperationExecutionBoundaryFoundationResult["controlledExecutorInvocation"],
    controlledDispatch: {} as RiverDevControlledOperationExecutionBoundaryFoundationResult["controlledDispatch"],
    dispatchAuthorization: {} as RiverDevControlledOperationExecutionBoundaryFoundationResult["dispatchAuthorization"],
    activeAdmission: {} as RiverDevControlledOperationExecutionBoundaryFoundationResult["activeAdmission"],
    authorization: {} as RiverDevControlledOperationExecutionBoundaryFoundationResult["authorization"],
    eligibility: {} as RiverDevControlledOperationExecutionBoundaryFoundationResult["eligibility"],
    consumption: {} as RiverDevControlledOperationExecutionBoundaryFoundationResult["consumption"],
    receiptState: {} as RiverDevControlledOperationExecutionBoundaryFoundationResult["receiptState"],
    executedOperation: {} as RiverDevControlledOperationExecutionBoundaryFoundationResult["executedOperation"],

    approvedExecutionScope: ["operation:test"],
    provenance: ["DEV-274", "DEV-275"],

    controlledDispatchEvidence: ["dispatch-evidence"],
    executorInvocationAuthorizationEvidence: ["invocation-authorization-evidence"],
    controlledExecutorInvocationEvidence: ["controlled-invocation-evidence"],
    operationExecutionAuthorizationEvidence: ["operation-authorization-evidence"],
    controlledOperationExecutionEvidence: ["operation-execution-evidence"],

    blockedReasons: [],

    singleAuthorizedOperationOnly: true,
    scopeMustRemainExact: true,
    predecessorEvidenceMustRemainPresent: true,

    mayCreateExecutionAuthorization: false,
    mayAuthorizeDownstreamAction: false,
    mayAdmitIntoActiveExecutor: false,
    mayActivateAdmission: false,
    mayDispatch: false,

    mayInvokeExecutor: false,
    mayInvokeInspectionDependency: false,
    mayRetryExecution: false,
    mayPersistLifecycleState: false,

    mayModifyRepositoryBeyondAuthorizedOperation: false,
    mayDeleteRepositoryContent: false,
    mayStageRepositoryChanges: false,
    mayCommit: false,
    mayPush: false,
    mayDeploy: false,

    mayAccessSecrets: false,
    mayExpandScope: false,
    mayPerformArbitraryShellExecution: false,
    mayPerformNetworkExecution: false,
    mayPerformExternalSideEffectsBeyondAuthorizedOperation: false,

    futureExecutionReceiptBoundaryRequired: true
  };
}

function expectRejected(
  predecessor: RiverDevControlledOperationExecutionBoundaryFoundationResult
): void {
  const result = createControlledOperationExecutionReceipt(predecessor);

  assert.equal(result.trusted, false);
  assert.equal(result.ready, false);
  assert.equal(result.executionReceiptCreated, false);
  assert.equal(
    result.executionReceiptState,
    "CONTROLLED_OPERATION_EXECUTION_RECEIPT_NOT_CREATED"
  );
  assert.equal(result.controlledOperationExecution, null);
  assert.equal(result.controlledOperationExecutionReceiptEvidence.length, 0);
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

test("DEV-276 creates a receipt only from a valid exact DEV-275 predecessor", () => {
  const predecessor = validPredecessor();

  const result = createControlledOperationExecutionReceipt(predecessor);

  assert.equal(result.version, "DEV-276");
  assert.equal(result.trusted, true);
  assert.equal(result.ready, true);
  assert.equal(result.executionReceiptCreated, true);

  assert.equal(result.defaultPolicy, "DENY");

  assert.equal(result.controlledOperationExecutionReceiptBoundaryOnly, true);
  assert.equal(result.executionReceiptResultIsDeterministicData, true);

  assert.equal(
    result.executionReceiptState,
    "CONTROLLED_OPERATION_EXECUTION_RECEIPT_CREATED"
  );

  assert.equal(result.controlledOperationExecution, predecessor);

  assert.deepEqual(
    result.approvedExecutionScope,
    predecessor.approvedExecutionScope
  );

  assert.notEqual(
    result.approvedExecutionScope,
    predecessor.approvedExecutionScope
  );

  assert.deepEqual(
    result.controlledOperationExecutionEvidence,
    predecessor.controlledOperationExecutionEvidence
  );

  assert.notEqual(
    result.controlledOperationExecutionEvidence,
    predecessor.controlledOperationExecutionEvidence
  );

  assert.deepEqual(
    result.provenance,
    [...predecessor.provenance, "DEV-276"]
  );

  assert.equal(
    result.controlledOperationExecutionReceiptEvidence.length,
    3
  );

  assert.deepEqual(result.blockedReasons, []);

  assert.equal(result.singleExecutionReceiptOnly, true);
  assert.equal(result.receiptMustPreserveExactExecutionScope, true);
  assert.equal(result.receiptMustPreservePredecessorEvidence, true);
  assert.equal(result.receiptMustPreserveExecutionEvidence, true);

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

  assert.equal(result.futureExecutionLifecycleBoundaryRequired, true);
});

test("DEV-276 rejects wrong predecessor version", () => {
  const predecessor = validPredecessor();

  (predecessor as unknown as { version: string }).version = "DEV-274";

  expectRejected(predecessor);
});

test("DEV-276 rejects untrusted predecessor", () => {
  const predecessor = validPredecessor();
  predecessor.trusted = false;

  expectRejected(predecessor);
});

test("DEV-276 rejects unready predecessor", () => {
  const predecessor = validPredecessor();
  predecessor.ready = false;

  expectRejected(predecessor);
});

test("DEV-276 rejects predecessor without executed operation", () => {
  const predecessor = validPredecessor();
  predecessor.operationExecuted = false;

  expectRejected(predecessor);
});

test("DEV-276 rejects wrong execution state", () => {
  const predecessor = validPredecessor();

  predecessor.executionState =
    "CONTROLLED_OPERATION_NOT_EXECUTED";

  expectRejected(predecessor);
});

test("DEV-276 rejects non-deterministic execution predecessor", () => {
  const predecessor = validPredecessor();

  (predecessor as unknown as {
    executionResultIsDeterministicData: boolean;
  }).executionResultIsDeterministicData = false;

  expectRejected(predecessor);
});

test("DEV-276 rejects predecessor outside controlled execution boundary", () => {
  const predecessor = validPredecessor();

  (predecessor as unknown as {
    controlledOperationExecutionBoundaryOnly: boolean;
  }).controlledOperationExecutionBoundaryOnly = false;

  expectRejected(predecessor);
});

test("DEV-276 rejects predecessor without single-operation invariant", () => {
  const predecessor = validPredecessor();

  (predecessor as unknown as {
    singleAuthorizedOperationOnly: boolean;
  }).singleAuthorizedOperationOnly = false;

  expectRejected(predecessor);
});

test("DEV-276 rejects predecessor without exact-scope invariant", () => {
  const predecessor = validPredecessor();

  (predecessor as unknown as {
    scopeMustRemainExact: boolean;
  }).scopeMustRemainExact = false;

  expectRejected(predecessor);
});

test("DEV-276 rejects predecessor without evidence-preservation invariant", () => {
  const predecessor = validPredecessor();

  (predecessor as unknown as {
    predecessorEvidenceMustRemainPresent: boolean;
  }).predecessorEvidenceMustRemainPresent = false;

  expectRejected(predecessor);
});

test("DEV-276 rejects missing operation execution authorization", () => {
  const predecessor = validPredecessor();
  predecessor.operationExecutionAuthorization = null;

  expectRejected(predecessor);
});

test("DEV-276 rejects missing controlled executor invocation", () => {
  const predecessor = validPredecessor();
  predecessor.controlledExecutorInvocation = null;

  expectRejected(predecessor);
});

test("DEV-276 rejects missing controlled dispatch", () => {
  const predecessor = validPredecessor();
  predecessor.controlledDispatch = null;

  expectRejected(predecessor);
});

test("DEV-276 rejects missing dispatch authorization", () => {
  const predecessor = validPredecessor();
  predecessor.dispatchAuthorization = null;

  expectRejected(predecessor);
});

test("DEV-276 rejects missing active admission", () => {
  const predecessor = validPredecessor();
  predecessor.activeAdmission = null;

  expectRejected(predecessor);
});

test("DEV-276 rejects missing authorization", () => {
  const predecessor = validPredecessor();
  predecessor.authorization = null;

  expectRejected(predecessor);
});

test("DEV-276 rejects missing eligibility", () => {
  const predecessor = validPredecessor();
  predecessor.eligibility = null;

  expectRejected(predecessor);
});

test("DEV-276 rejects missing consumption", () => {
  const predecessor = validPredecessor();
  predecessor.consumption = null;

  expectRejected(predecessor);
});

test("DEV-276 rejects missing receipt state", () => {
  const predecessor = validPredecessor();
  predecessor.receiptState = null;

  expectRejected(predecessor);
});

test("DEV-276 rejects missing executed operation", () => {
  const predecessor = validPredecessor();
  predecessor.executedOperation = null;

  expectRejected(predecessor);
});

test("DEV-276 rejects empty approved execution scope", () => {
  const predecessor = validPredecessor();
  predecessor.approvedExecutionScope = [];

  expectRejected(predecessor);
});

test("DEV-276 rejects empty provenance", () => {
  const predecessor = validPredecessor();
  predecessor.provenance = [];

  expectRejected(predecessor);
});

test("DEV-276 rejects missing controlled dispatch evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledDispatchEvidence = [];

  expectRejected(predecessor);
});

test("DEV-276 rejects missing executor invocation authorization evidence", () => {
  const predecessor = validPredecessor();
  predecessor.executorInvocationAuthorizationEvidence = [];

  expectRejected(predecessor);
});

test("DEV-276 rejects missing controlled executor invocation evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledExecutorInvocationEvidence = [];

  expectRejected(predecessor);
});

test("DEV-276 rejects missing operation execution authorization evidence", () => {
  const predecessor = validPredecessor();
  predecessor.operationExecutionAuthorizationEvidence = [];

  expectRejected(predecessor);
});

test("DEV-276 rejects missing controlled operation execution evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledOperationExecutionEvidence = [];

  expectRejected(predecessor);
});

test("DEV-276 rejects blocked predecessor", () => {
  const predecessor = validPredecessor();
  predecessor.blockedReasons = ["blocked"];

  expectRejected(predecessor);
});

test("DEV-276 rejects predecessor with executor invocation authority", () => {
  const predecessor = validPredecessor();

  (predecessor as unknown as {
    mayInvokeExecutor: boolean;
  }).mayInvokeExecutor = true;

  expectRejected(predecessor);
});

test("DEV-276 rejects predecessor with retry authority", () => {
  const predecessor = validPredecessor();

  (predecessor as unknown as {
    mayRetryExecution: boolean;
  }).mayRetryExecution = true;

  expectRejected(predecessor);
});

test("DEV-276 rejects predecessor with repository mutation authority", () => {
  const predecessor = validPredecessor();

  (predecessor as unknown as {
    mayModifyRepositoryBeyondAuthorizedOperation: boolean;
  }).mayModifyRepositoryBeyondAuthorizedOperation = true;

  expectRejected(predecessor);
});

test("DEV-276 rejects predecessor with external side-effect authority", () => {
  const predecessor = validPredecessor();

  (predecessor as unknown as {
    mayPerformExternalSideEffectsBeyondAuthorizedOperation: boolean;
  }).mayPerformExternalSideEffectsBeyondAuthorizedOperation = true;

  expectRejected(predecessor);
});

test("DEV-276 rejects missing future execution receipt boundary", () => {
  const predecessor = validPredecessor();

  (predecessor as unknown as {
    futureExecutionReceiptBoundaryRequired: boolean;
  }).futureExecutionReceiptBoundaryRequired = false;

  expectRejected(predecessor);
});
