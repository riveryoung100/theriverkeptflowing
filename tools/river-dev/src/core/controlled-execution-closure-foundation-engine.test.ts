import assert from "node:assert/strict";
import test from "node:test";

import type {
  RiverDevControlledExecutionFinalizationFoundationResult
} from "../types";

import {
  establishControlledExecutionClosureFoundation
} from "./controlled-execution-closure-foundation-engine";

function validPredecessor():
  RiverDevControlledExecutionFinalizationFoundationResult {
  return {
    version: "DEV-279",

    trusted: true,
    ready: true,
    executionFinalized: true,

    defaultPolicy: "DENY",

    controlledExecutionFinalizationBoundaryOnly: true,
    executionFinalizationResultIsDeterministicData: true,

    executionFinalizationState: "CONTROLLED_EXECUTION_FINALIZED",

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

    approvedExecutionScope: ["operation:test"],
    provenance: ["DEV-279"],

    controlledDispatchEvidence: ["dispatch"],
    executorInvocationAuthorizationEvidence: ["executor-auth"],
    controlledExecutorInvocationEvidence: ["executor"],
    operationExecutionAuthorizationEvidence: ["operation-auth"],
    controlledOperationExecutionEvidence: ["execution"],
    controlledOperationExecutionReceiptEvidence: ["receipt"],

    controlledOperationExecutionLifecycleEvidence: ["lifecycle"],
    controlledExecutionCompletionEvidence: ["completion"],
    controlledExecutionFinalizationEvidence: ["finalization"],

    blockedReasons: [],

    singleFinalizationTransitionOnly: true,
    finalizationMustPreserveExactExecutionScope: true,
    finalizationMustPreserveCompletionEvidence: true,
    finalizationMustPreserveLifecycleEvidence: true,
    finalizationMustPreserveReceiptEvidence: true,
    finalizationMustPreserveExecutionEvidence: true,
    finalizationMustPreservePredecessorEvidence: true,

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

    futureControlledExecutionClosureBoundaryRequired: true
  } as RiverDevControlledExecutionFinalizationFoundationResult;
}

test(
  "DEV-280 closes only a valid exact DEV-279 predecessor",
  () => {
    const predecessor = validPredecessor();

    const result =
      establishControlledExecutionClosureFoundation(predecessor);

    assert.equal(result.version, "DEV-280");
    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.executionClosed, true);

    assert.equal(
      result.executionClosureState,
      "CONTROLLED_EXECUTION_CLOSED"
    );

    assert.equal(
      result.controlledExecutionFinalization,
      predecessor
    );

    assert.deepEqual(
      result.approvedExecutionScope,
      predecessor.approvedExecutionScope
    );

    assert.deepEqual(
      result.controlledExecutionFinalizationEvidence,
      predecessor.controlledExecutionFinalizationEvidence
    );

    assert.deepEqual(result.blockedReasons, []);

    assert.equal(
      result.futureControlledExecutionArchiveBoundaryRequired,
      true
    );
  }
);

test("DEV-280 rejects wrong predecessor version", () => {
  const predecessor = validPredecessor() as any;
  predecessor.version = "DEV-278";

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
  assert.equal(result.trusted, false);
});

test("DEV-280 rejects untrusted predecessor", () => {
  const predecessor = validPredecessor();
  predecessor.trusted = false;

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects unready predecessor", () => {
  const predecessor = validPredecessor();
  predecessor.ready = false;

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects predecessor without finalized execution", () => {
  const predecessor = validPredecessor();
  predecessor.executionFinalized = false;

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects wrong finalization state", () => {
  const predecessor = validPredecessor();

  predecessor.executionFinalizationState =
    "CONTROLLED_EXECUTION_NOT_FINALIZED";

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects non-deterministic finalization predecessor", () => {
  const predecessor = validPredecessor() as any;
  predecessor.executionFinalizationResultIsDeterministicData = false;

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects predecessor outside finalization boundary", () => {
  const predecessor = validPredecessor() as any;
  predecessor.controlledExecutionFinalizationBoundaryOnly = false;

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects missing execution completion", () => {
  const predecessor = validPredecessor();
  predecessor.controlledExecutionCompletion = null;

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects missing execution lifecycle", () => {
  const predecessor = validPredecessor();
  predecessor.controlledOperationExecutionLifecycle = null;

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects missing execution receipt", () => {
  const predecessor = validPredecessor();
  predecessor.controlledOperationExecutionReceipt = null;

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects missing controlled operation execution", () => {
  const predecessor = validPredecessor();
  predecessor.controlledOperationExecution = null;

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects missing executed operation", () => {
  const predecessor = validPredecessor();
  predecessor.executedOperation = null;

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects empty approved execution scope", () => {
  const predecessor = validPredecessor();
  predecessor.approvedExecutionScope = [];

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects empty provenance", () => {
  const predecessor = validPredecessor();
  predecessor.provenance = [];

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects missing finalization evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledExecutionFinalizationEvidence = [];

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects missing completion evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledExecutionCompletionEvidence = [];

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects missing lifecycle evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledOperationExecutionLifecycleEvidence = [];

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects missing receipt evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledOperationExecutionReceiptEvidence = [];

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects missing execution evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledOperationExecutionEvidence = [];

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects blocked predecessor", () => {
  const predecessor = validPredecessor();
  predecessor.blockedReasons = ["blocked"];

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects predecessor with executor authority", () => {
  const predecessor = validPredecessor() as any;
  predecessor.mayInvokeExecutor = true;

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects predecessor with execution authority", () => {
  const predecessor = validPredecessor() as any;
  predecessor.mayExecuteOperation = true;

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects predecessor with retry authority", () => {
  const predecessor = validPredecessor() as any;
  predecessor.mayRetryExecution = true;

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test(
  "DEV-280 rejects predecessor with lifecycle persistence authority",
  () => {
    const predecessor = validPredecessor() as any;
    predecessor.mayPersistLifecycleState = true;

    const result =
      establishControlledExecutionClosureFoundation(predecessor);

    assert.equal(result.executionClosed, false);
  }
);

test(
  "DEV-280 rejects predecessor with repository mutation authority",
  () => {
    const predecessor = validPredecessor() as any;
    predecessor.mayModifyRepository = true;

    const result =
      establishControlledExecutionClosureFoundation(predecessor);

    assert.equal(result.executionClosed, false);
  }
);

test("DEV-280 rejects predecessor with commit authority", () => {
  const predecessor = validPredecessor() as any;
  predecessor.mayCommit = true;

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects predecessor with push authority", () => {
  const predecessor = validPredecessor() as any;
  predecessor.mayPush = true;

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test(
  "DEV-280 rejects predecessor with external side-effect authority",
  () => {
    const predecessor = validPredecessor() as any;
    predecessor.mayPerformExternalSideEffects = true;

    const result =
      establishControlledExecutionClosureFoundation(predecessor);

    assert.equal(result.executionClosed, false);
  }
);

test("DEV-280 rejects missing future closure boundary", () => {
  const predecessor = validPredecessor() as any;
  predecessor.futureControlledExecutionClosureBoundaryRequired =
    false;

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});
