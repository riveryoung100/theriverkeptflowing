import test from "node:test";
import assert from "node:assert/strict";

import {
  establishControlledExecutionCompletionFoundation
} from "./controlled-execution-completion-foundation-engine";

import type {
  RiverDevControlledOperationExecutionLifecycleFoundationResult
} from "../types";

function validPredecessor(): RiverDevControlledOperationExecutionLifecycleFoundationResult {
  return {
    version: "DEV-277",

    trusted: true,
    ready: true,
    executionLifecycleEstablished: true,

    defaultPolicy: "DENY",

    controlledOperationExecutionLifecycleBoundaryOnly: true,
    executionLifecycleResultIsDeterministicData: true,

    executionLifecycleState:
      "CONTROLLED_OPERATION_EXECUTION_LIFECYCLE_ESTABLISHED",

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

    approvedExecutionScope: ["operation:test"],
    provenance: ["DEV-277"],

    controlledDispatchEvidence: ["dispatch"],
    executorInvocationAuthorizationEvidence: ["executor-authorization"],
    controlledExecutorInvocationEvidence: ["executor"],
    operationExecutionAuthorizationEvidence: ["operation-authorization"],
    controlledOperationExecutionEvidence: ["execution"],
    controlledOperationExecutionReceiptEvidence: ["receipt"],
    controlledOperationExecutionLifecycleEvidence: ["lifecycle"],

    blockedReasons: [],

    singleLifecycleTransitionOnly: true,
    lifecycleMustPreserveExactExecutionScope: true,
    lifecycleMustPreserveReceiptEvidence: true,
    lifecycleMustPreserveExecutionEvidence: true,
    lifecycleMustPreservePredecessorEvidence: true,

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

    futureControlledExecutionCompletionBoundaryRequired: true
  };
}

test(
  "DEV-278 completes only a valid exact DEV-277 predecessor",
  () => {
    const predecessor = validPredecessor();

    const result =
      establishControlledExecutionCompletionFoundation(predecessor);

    assert.equal(result.version, "DEV-278");
    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.executionCompleted, true);

    assert.equal(
      result.executionCompletionState,
      "CONTROLLED_EXECUTION_COMPLETED"
    );

    assert.deepEqual(
      result.approvedExecutionScope,
      predecessor.approvedExecutionScope
    );

    assert.equal(
      result.controlledOperationExecutionLifecycle,
      predecessor
    );

    assert.equal(
      result.futureControlledExecutionFinalizationBoundaryRequired,
      true
    );

    assert.equal(result.mayExecuteOperation, false);
    assert.equal(result.mayRetryExecution, false);
    assert.equal(result.mayModifyRepository, false);
    assert.equal(result.mayPerformExternalSideEffects, false);
  }
);

test("DEV-278 rejects wrong predecessor version", () => {
  const predecessor = validPredecessor() as any;
  predecessor.version = "DEV-276";

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects untrusted predecessor", () => {
  const predecessor = validPredecessor();
  predecessor.trusted = false;

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects unready predecessor", () => {
  const predecessor = validPredecessor();
  predecessor.ready = false;

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects predecessor without established lifecycle", () => {
  const predecessor = validPredecessor();
  predecessor.executionLifecycleEstablished = false;

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects wrong lifecycle state", () => {
  const predecessor = validPredecessor() as any;
  predecessor.executionLifecycleState =
    "CONTROLLED_OPERATION_EXECUTION_LIFECYCLE_NOT_ESTABLISHED";

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects non-deterministic lifecycle predecessor", () => {
  const predecessor = validPredecessor() as any;
  predecessor.executionLifecycleResultIsDeterministicData = false;

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects predecessor outside lifecycle boundary", () => {
  const predecessor = validPredecessor() as any;
  predecessor.controlledOperationExecutionLifecycleBoundaryOnly = false;

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects missing execution receipt", () => {
  const predecessor = validPredecessor();
  predecessor.controlledOperationExecutionReceipt = null;

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects missing controlled operation execution", () => {
  const predecessor = validPredecessor();
  predecessor.controlledOperationExecution = null;

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects missing executed operation", () => {
  const predecessor = validPredecessor();
  predecessor.executedOperation = null;

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects empty approved execution scope", () => {
  const predecessor = validPredecessor();
  predecessor.approvedExecutionScope = [];

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects empty provenance", () => {
  const predecessor = validPredecessor();
  predecessor.provenance = [];

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects missing lifecycle evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledOperationExecutionLifecycleEvidence = [];

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects blocked predecessor", () => {
  const predecessor = validPredecessor();
  predecessor.blockedReasons = ["blocked"];

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects predecessor with executor authority", () => {
  const predecessor = validPredecessor() as any;
  predecessor.mayInvokeExecutor = true;

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects predecessor with execution authority", () => {
  const predecessor = validPredecessor() as any;
  predecessor.mayExecuteOperation = true;

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects predecessor with retry authority", () => {
  const predecessor = validPredecessor() as any;
  predecessor.mayRetryExecution = true;

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects predecessor with lifecycle persistence authority", () => {
  const predecessor = validPredecessor() as any;
  predecessor.mayPersistLifecycleState = true;

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects predecessor with repository mutation authority", () => {
  const predecessor = validPredecessor() as any;
  predecessor.mayModifyRepository = true;

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects predecessor with external side-effect authority", () => {
  const predecessor = validPredecessor() as any;
  predecessor.mayPerformExternalSideEffects = true;

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects missing future completion boundary", () => {
  const predecessor = validPredecessor() as any;
  predecessor.futureControlledExecutionCompletionBoundaryRequired = false;

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});
