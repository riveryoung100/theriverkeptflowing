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
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "version", "DEV-276");

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects untrusted predecessor", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "trusted", false);

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects unready predecessor", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "ready", false);

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects predecessor without established lifecycle", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "executionLifecycleEstablished", false);

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects wrong lifecycle state", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "executionLifecycleState", "CONTROLLED_OPERATION_EXECUTION_LIFECYCLE_NOT_ESTABLISHED");

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects non-deterministic lifecycle predecessor", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "executionLifecycleResultIsDeterministicData", false);

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects predecessor outside lifecycle boundary", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledOperationExecutionLifecycleBoundaryOnly", false);

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects missing execution receipt", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledOperationExecutionReceipt", null);

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects missing controlled operation execution", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledOperationExecution", null);

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects missing executed operation", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "executedOperation", null);

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects empty approved execution scope", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "approvedExecutionScope", []);

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects empty provenance", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "provenance", []);

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects missing lifecycle evidence", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "controlledOperationExecutionLifecycleEvidence", []);

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects blocked predecessor", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "blockedReasons", ["blocked"]);

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects predecessor with executor authority", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "mayInvokeExecutor", true);

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects predecessor with execution authority", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "mayExecuteOperation", true);

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects predecessor with retry authority", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "mayRetryExecution", true);

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects predecessor with lifecycle persistence authority", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "mayPersistLifecycleState", true);

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects predecessor with repository mutation authority", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "mayModifyRepository", true);

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects predecessor with external side-effect authority", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "mayPerformExternalSideEffects", true);

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});

test("DEV-278 rejects missing future completion boundary", () => {
  const predecessor = validPredecessor();
  Reflect.set(predecessor, "futureControlledExecutionCompletionBoundaryRequired", false);

  const result =
    establishControlledExecutionCompletionFoundation(predecessor);

  assert.equal(result.executionCompleted, false);
});
