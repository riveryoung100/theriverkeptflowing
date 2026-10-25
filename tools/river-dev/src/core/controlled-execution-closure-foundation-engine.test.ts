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
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "version", "DEV-278");

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
  assert.equal(result.trusted, false);
});

test("DEV-280 rejects untrusted predecessor", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "trusted", false);

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects unready predecessor", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "ready", false);

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects predecessor without finalized execution", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "executionFinalized", false);

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects wrong finalization state", () => {
  const predecessor = validPredecessor();

  Reflect.set(predecessor, "executionFinalizationState", "CONTROLLED_EXECUTION_NOT_FINALIZED");

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects non-deterministic finalization predecessor", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "executionFinalizationResultIsDeterministicData", false);

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects predecessor outside finalization boundary", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledExecutionFinalizationBoundaryOnly", false);

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects missing execution completion", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledExecutionCompletion", null);

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects missing execution lifecycle", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledOperationExecutionLifecycle", null);

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects missing execution receipt", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledOperationExecutionReceipt", null);

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects missing controlled operation execution", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledOperationExecution", null);

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects missing executed operation", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "executedOperation", null);

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects empty approved execution scope", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "approvedExecutionScope", []);

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects empty provenance", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "provenance", []);

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects missing finalization evidence", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledExecutionFinalizationEvidence", []);

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects missing completion evidence", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledExecutionCompletionEvidence", []);

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects missing lifecycle evidence", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledOperationExecutionLifecycleEvidence", []);

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects missing receipt evidence", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledOperationExecutionReceiptEvidence", []);

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects missing execution evidence", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledOperationExecutionEvidence", []);

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects blocked predecessor", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "blockedReasons", ["blocked"]);

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects predecessor with executor authority", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "mayInvokeExecutor", true);

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects predecessor with execution authority", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "mayExecuteOperation", true);

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects predecessor with retry authority", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "mayRetryExecution", true);

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test(
  "DEV-280 rejects predecessor with lifecycle persistence authority",
  () => {
    const predecessor = validPredecessor();
    Reflect.set(predecessor, "mayPersistLifecycleState", true);

    const result =
      establishControlledExecutionClosureFoundation(predecessor);

    assert.equal(result.executionClosed, false);
  }
);

test(
  "DEV-280 rejects predecessor with repository mutation authority",
  () => {
    const predecessor = validPredecessor();
    Reflect.set(predecessor, "mayModifyRepository", true);

    const result =
      establishControlledExecutionClosureFoundation(predecessor);

    assert.equal(result.executionClosed, false);
  }
);

test("DEV-280 rejects predecessor with commit authority", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "mayCommit", true);

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test("DEV-280 rejects predecessor with push authority", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "mayPush", true);

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});

test(
  "DEV-280 rejects predecessor with external side-effect authority",
  () => {
    const predecessor = validPredecessor();
    Reflect.set(predecessor, "mayPerformExternalSideEffects", true);

    const result =
      establishControlledExecutionClosureFoundation(predecessor);

    assert.equal(result.executionClosed, false);
  }
);

test("DEV-280 rejects missing future closure boundary", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "futureControlledExecutionClosureBoundaryRequired", false);

  const result =
    establishControlledExecutionClosureFoundation(predecessor);

  assert.equal(result.executionClosed, false);
});
