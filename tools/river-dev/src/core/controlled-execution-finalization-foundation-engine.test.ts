import assert from "node:assert/strict";
import test from "node:test";

import {
  establishControlledExecutionFinalizationFoundation
} from "./controlled-execution-finalization-foundation-engine";

import type {
  RiverDevControlledExecutionCompletionFoundationResult
} from "../types";

function validPredecessor(): RiverDevControlledExecutionCompletionFoundationResult {
  return {
    version: "DEV-278",

    trusted: true,
    ready: true,
    executionCompleted: true,

    defaultPolicy: "DENY",

    controlledExecutionCompletionBoundaryOnly: true,
    executionCompletionResultIsDeterministicData: true,

    executionCompletionState: "CONTROLLED_EXECUTION_COMPLETED",

    controlledOperationExecutionLifecycle: {} as RiverDevControlledExecutionCompletionFoundationResult["controlledOperationExecutionLifecycle"],
    controlledOperationExecutionReceipt: {} as RiverDevControlledExecutionCompletionFoundationResult["controlledOperationExecutionReceipt"],
    controlledOperationExecution: {} as RiverDevControlledExecutionCompletionFoundationResult["controlledOperationExecution"],
    operationExecutionAuthorization: {} as RiverDevControlledExecutionCompletionFoundationResult["operationExecutionAuthorization"],
    controlledExecutorInvocation: {} as RiverDevControlledExecutionCompletionFoundationResult["controlledExecutorInvocation"],
    controlledDispatch: {} as RiverDevControlledExecutionCompletionFoundationResult["controlledDispatch"],
    dispatchAuthorization: {} as RiverDevControlledExecutionCompletionFoundationResult["dispatchAuthorization"],
    activeAdmission: {} as RiverDevControlledExecutionCompletionFoundationResult["activeAdmission"],
    authorization: {} as RiverDevControlledExecutionCompletionFoundationResult["authorization"],
    eligibility: {} as RiverDevControlledExecutionCompletionFoundationResult["eligibility"],
    consumption: {} as RiverDevControlledExecutionCompletionFoundationResult["consumption"],
    receiptState: {} as RiverDevControlledExecutionCompletionFoundationResult["receiptState"],
    executedOperation: {} as RiverDevControlledExecutionCompletionFoundationResult["executedOperation"],

    approvedExecutionScope: ["operation:authorized"],
    provenance: ["DEV-278:test"],

    controlledDispatchEvidence: ["dispatch"],
    executorInvocationAuthorizationEvidence: ["executor-authorization"],
    controlledExecutorInvocationEvidence: ["executor"],
    operationExecutionAuthorizationEvidence: ["operation-authorization"],
    controlledOperationExecutionEvidence: ["execution"],
    controlledOperationExecutionReceiptEvidence: ["receipt"],
    controlledOperationExecutionLifecycleEvidence: ["lifecycle"],
    controlledExecutionCompletionEvidence: [
      "DEV-278:CONTROLLED_EXECUTION_COMPLETED"
    ],

    blockedReasons: [],

    singleCompletionTransitionOnly: true,
    completionMustPreserveExactExecutionScope: true,
    completionMustPreserveLifecycleEvidence: true,
    completionMustPreserveReceiptEvidence: true,
    completionMustPreserveExecutionEvidence: true,
    completionMustPreservePredecessorEvidence: true,

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

    futureControlledExecutionFinalizationBoundaryRequired: true
  };
}

test(
  "DEV-279 finalizes only a valid exact DEV-278 predecessor",
  () => {
    const predecessor = validPredecessor();

    const result =
      establishControlledExecutionFinalizationFoundation(predecessor);

    assert.equal(result.version, "DEV-279");
    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.executionFinalized, true);

    assert.equal(
      result.executionFinalizationState,
      "CONTROLLED_EXECUTION_FINALIZED"
    );

    assert.equal(
      result.controlledExecutionCompletion,
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
      result.controlledExecutionCompletionEvidence,
      predecessor.controlledExecutionCompletionEvidence
    );

    assert.deepEqual(
      result.controlledExecutionFinalizationEvidence,
      ["DEV-279:CONTROLLED_EXECUTION_FINALIZED"]
    );

    assert.deepEqual(result.blockedReasons, []);

    assert.equal(result.mayInvokeExecutor, false);
    assert.equal(result.mayExecuteOperation, false);
    assert.equal(result.mayRetryExecution, false);
    assert.equal(result.mayPersistLifecycleState, false);
    assert.equal(result.mayModifyRepository, false);
    assert.equal(result.mayCommit, false);
    assert.equal(result.mayPush, false);
    assert.equal(result.mayPerformExternalSideEffects, false);

    assert.equal(
      result.futureControlledExecutionClosureBoundaryRequired,
      true
    );
  }
);

test("DEV-279 rejects wrong predecessor version", () => {
  const predecessor = validPredecessor() as any;
  predecessor.version = "DEV-277";

  const result =
    establishControlledExecutionFinalizationFoundation(predecessor);

  assert.equal(result.executionFinalized, false);
  assert.equal(result.trusted, false);
});

test("DEV-279 rejects untrusted predecessor", () => {
  const predecessor = validPredecessor();
  predecessor.trusted = false;

  const result =
    establishControlledExecutionFinalizationFoundation(predecessor);

  assert.equal(result.executionFinalized, false);
});

test("DEV-279 rejects unready predecessor", () => {
  const predecessor = validPredecessor();
  predecessor.ready = false;

  const result =
    establishControlledExecutionFinalizationFoundation(predecessor);

  assert.equal(result.executionFinalized, false);
});

test("DEV-279 rejects predecessor without completed execution", () => {
  const predecessor = validPredecessor();
  predecessor.executionCompleted = false;

  const result =
    establishControlledExecutionFinalizationFoundation(predecessor);

  assert.equal(result.executionFinalized, false);
});

test("DEV-279 rejects wrong completion state", () => {
  const predecessor = validPredecessor();
  predecessor.executionCompletionState =
    "CONTROLLED_EXECUTION_NOT_COMPLETED";

  const result =
    establishControlledExecutionFinalizationFoundation(predecessor);

  assert.equal(result.executionFinalized, false);
});

test("DEV-279 rejects non-deterministic completion predecessor", () => {
  const predecessor = validPredecessor() as any;
  predecessor.executionCompletionResultIsDeterministicData = false;

  const result =
    establishControlledExecutionFinalizationFoundation(predecessor);

  assert.equal(result.executionFinalized, false);
});

test("DEV-279 rejects predecessor outside completion boundary", () => {
  const predecessor = validPredecessor() as any;
  predecessor.controlledExecutionCompletionBoundaryOnly = false;

  const result =
    establishControlledExecutionFinalizationFoundation(predecessor);

  assert.equal(result.executionFinalized, false);
});

test("DEV-279 rejects missing execution lifecycle", () => {
  const predecessor = validPredecessor();
  predecessor.controlledOperationExecutionLifecycle = null;

  const result =
    establishControlledExecutionFinalizationFoundation(predecessor);

  assert.equal(result.executionFinalized, false);
});

test("DEV-279 rejects missing execution receipt", () => {
  const predecessor = validPredecessor();
  predecessor.controlledOperationExecutionReceipt = null;

  const result =
    establishControlledExecutionFinalizationFoundation(predecessor);

  assert.equal(result.executionFinalized, false);
});

test("DEV-279 rejects missing controlled operation execution", () => {
  const predecessor = validPredecessor();
  predecessor.controlledOperationExecution = null;

  const result =
    establishControlledExecutionFinalizationFoundation(predecessor);

  assert.equal(result.executionFinalized, false);
});

test("DEV-279 rejects missing executed operation", () => {
  const predecessor = validPredecessor();
  predecessor.executedOperation = null;

  const result =
    establishControlledExecutionFinalizationFoundation(predecessor);

  assert.equal(result.executionFinalized, false);
});

test("DEV-279 rejects empty approved execution scope", () => {
  const predecessor = validPredecessor();
  predecessor.approvedExecutionScope = [];

  const result =
    establishControlledExecutionFinalizationFoundation(predecessor);

  assert.equal(result.executionFinalized, false);
});

test("DEV-279 rejects empty provenance", () => {
  const predecessor = validPredecessor();
  predecessor.provenance = [];

  const result =
    establishControlledExecutionFinalizationFoundation(predecessor);

  assert.equal(result.executionFinalized, false);
});

test("DEV-279 rejects missing completion evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledExecutionCompletionEvidence = [];

  const result =
    establishControlledExecutionFinalizationFoundation(predecessor);

  assert.equal(result.executionFinalized, false);
});

test("DEV-279 rejects missing lifecycle evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledOperationExecutionLifecycleEvidence = [];

  const result =
    establishControlledExecutionFinalizationFoundation(predecessor);

  assert.equal(result.executionFinalized, false);
});

test("DEV-279 rejects missing receipt evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledOperationExecutionReceiptEvidence = [];

  const result =
    establishControlledExecutionFinalizationFoundation(predecessor);

  assert.equal(result.executionFinalized, false);
});

test("DEV-279 rejects missing execution evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledOperationExecutionEvidence = [];

  const result =
    establishControlledExecutionFinalizationFoundation(predecessor);

  assert.equal(result.executionFinalized, false);
});

test("DEV-279 rejects blocked predecessor", () => {
  const predecessor = validPredecessor();
  predecessor.blockedReasons = ["blocked"];

  const result =
    establishControlledExecutionFinalizationFoundation(predecessor);

  assert.equal(result.executionFinalized, false);
});

test("DEV-279 rejects predecessor with executor authority", () => {
  const predecessor = validPredecessor() as any;
  predecessor.mayInvokeExecutor = true;

  const result =
    establishControlledExecutionFinalizationFoundation(predecessor);

  assert.equal(result.executionFinalized, false);
});

test("DEV-279 rejects predecessor with execution authority", () => {
  const predecessor = validPredecessor() as any;
  predecessor.mayExecuteOperation = true;

  const result =
    establishControlledExecutionFinalizationFoundation(predecessor);

  assert.equal(result.executionFinalized, false);
});

test("DEV-279 rejects predecessor with retry authority", () => {
  const predecessor = validPredecessor() as any;
  predecessor.mayRetryExecution = true;

  const result =
    establishControlledExecutionFinalizationFoundation(predecessor);

  assert.equal(result.executionFinalized, false);
});

test("DEV-279 rejects predecessor with lifecycle persistence authority", () => {
  const predecessor = validPredecessor() as any;
  predecessor.mayPersistLifecycleState = true;

  const result =
    establishControlledExecutionFinalizationFoundation(predecessor);

  assert.equal(result.executionFinalized, false);
});

test("DEV-279 rejects predecessor with repository mutation authority", () => {
  const predecessor = validPredecessor() as any;
  predecessor.mayModifyRepository = true;

  const result =
    establishControlledExecutionFinalizationFoundation(predecessor);

  assert.equal(result.executionFinalized, false);
});

test("DEV-279 rejects predecessor with commit authority", () => {
  const predecessor = validPredecessor() as any;
  predecessor.mayCommit = true;

  const result =
    establishControlledExecutionFinalizationFoundation(predecessor);

  assert.equal(result.executionFinalized, false);
});

test("DEV-279 rejects predecessor with push authority", () => {
  const predecessor = validPredecessor() as any;
  predecessor.mayPush = true;

  const result =
    establishControlledExecutionFinalizationFoundation(predecessor);

  assert.equal(result.executionFinalized, false);
});

test("DEV-279 rejects predecessor with external side-effect authority", () => {
  const predecessor = validPredecessor() as any;
  predecessor.mayPerformExternalSideEffects = true;

  const result =
    establishControlledExecutionFinalizationFoundation(predecessor);

  assert.equal(result.executionFinalized, false);
});

test("DEV-279 rejects missing future finalization boundary", () => {
  const predecessor = validPredecessor() as any;
  predecessor.futureControlledExecutionFinalizationBoundaryRequired =
    false;

  const result =
    establishControlledExecutionFinalizationFoundation(predecessor);

  assert.equal(result.executionFinalized, false);
});
