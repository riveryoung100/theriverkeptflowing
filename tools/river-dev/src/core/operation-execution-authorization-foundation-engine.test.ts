import assert from "node:assert/strict";
import test from "node:test";

import type {
  RiverDevControlledExecutorInvocationFoundationResult
} from "../types";

import {
  authorizeOperationExecution
} from "./operation-execution-authorization-foundation-engine";

function createValidPredecessor():
  RiverDevControlledExecutorInvocationFoundationResult {
  return {
    version: "DEV-273",

    trusted: true,
    ready: true,
    invoked: true,

    defaultPolicy: "DENY",

    controlledExecutorInvocationBoundaryOnly: true,
    controlledExecutorInvocationResultIsInertData: true,

    invocationState: "CONTROLLED_EXECUTOR_INVOKED",

    invocationAuthorization:
      {} as RiverDevControlledExecutorInvocationFoundationResult["invocationAuthorization"],

    controlledDispatch: {} as RiverDevControlledExecutorInvocationFoundationResult["controlledDispatch"],
    dispatchAuthorization: {} as RiverDevControlledExecutorInvocationFoundationResult["dispatchAuthorization"],
    activeAdmission: {} as RiverDevControlledExecutorInvocationFoundationResult["activeAdmission"],
    authorization: {} as RiverDevControlledExecutorInvocationFoundationResult["authorization"],
    eligibility: {} as RiverDevControlledExecutorInvocationFoundationResult["eligibility"],
    consumption: {} as RiverDevControlledExecutorInvocationFoundationResult["consumption"],
    receiptState: {} as RiverDevControlledExecutorInvocationFoundationResult["receiptState"],
    executedOperation: {} as RiverDevControlledExecutorInvocationFoundationResult["executedOperation"],

    approvedExecutionScope: [
      "tools/river-dev/src/core/example.ts"
    ],

    provenance: [
      "DEV-272",
      "DEV-273"
    ],

    controlledDispatchEvidence: [
      "dispatch-evidence"
    ],

    executorInvocationAuthorizationEvidence: [
      "invocation-authorization-evidence"
    ],

    controlledExecutorInvocationEvidence: [
      "controlled-invocation-evidence"
    ],

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

    futureExecutionBoundaryRequired: true
  };
}

function unsafePredecessor(
  patch: Record<string, unknown>
): RiverDevControlledExecutorInvocationFoundationResult {
  return {
    ...createValidPredecessor(),
    ...patch
  } as unknown as RiverDevControlledExecutorInvocationFoundationResult;
}

function assertRejected(
  predecessor: RiverDevControlledExecutorInvocationFoundationResult
): void {
  const result = authorizeOperationExecution(predecessor);

  assert.equal(result.version, "DEV-274");
  assert.equal(result.trusted, false);
  assert.equal(result.ready, false);
  assert.equal(result.operationExecutionAuthorized, false);

  assert.equal(
    result.operationExecutionAuthorizationState,
    "OPERATION_EXECUTION_UNAUTHORIZED"
  );

  assert.equal(result.controlledExecutorInvocation, null);
  assert.equal(result.controlledDispatch, null);
  assert.equal(result.dispatchAuthorization, null);
  assert.equal(result.activeAdmission, null);
  assert.equal(result.authorization, null);
  assert.equal(result.eligibility, null);
  assert.equal(result.consumption, null);
  assert.equal(result.receiptState, null);
  assert.equal(result.executedOperation, null);

  assert.deepEqual(result.approvedExecutionScope, []);
  assert.deepEqual(result.provenance, []);

  assert.deepEqual(result.controlledDispatchEvidence, []);
  assert.deepEqual(
    result.executorInvocationAuthorizationEvidence,
    []
  );
  assert.deepEqual(
    result.controlledExecutorInvocationEvidence,
    []
  );
  assert.deepEqual(
    result.operationExecutionAuthorizationEvidence,
    []
  );

  assert.ok(result.blockedReasons.length > 0);

  assert.equal(result.mayInvokeExecutor, false);
  assert.equal(result.mayExecuteOperation, false);
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
    result.futureControlledOperationExecutionBoundaryRequired,
    true
  );
}

test(
  "DEV-274 authorizes only a valid exact DEV-273 predecessor",
  () => {
    const predecessor = createValidPredecessor();

    const result = authorizeOperationExecution(predecessor);

    assert.equal(result.version, "DEV-274");
    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.operationExecutionAuthorized, true);

    assert.equal(result.defaultPolicy, "DENY");

    assert.equal(
      result.operationExecutionAuthorizationDecisionOnly,
      true
    );

    assert.equal(
      result.operationExecutionAuthorizationResultIsInertData,
      true
    );

    assert.equal(
      result.operationExecutionAuthorizationState,
      "OPERATION_EXECUTION_AUTHORIZED"
    );

    assert.equal(
      result.controlledExecutorInvocation,
      predecessor
    );

    assert.equal(
      result.controlledDispatch,
      predecessor.controlledDispatch
    );

    assert.equal(
      result.executedOperation,
      predecessor.executedOperation
    );

    assert.deepEqual(
      result.approvedExecutionScope,
      predecessor.approvedExecutionScope
    );

    assert.deepEqual(
      result.provenance,
      [...predecessor.provenance, "DEV-274"]
    );

    assert.deepEqual(
      result.controlledExecutorInvocationEvidence,
      predecessor.controlledExecutorInvocationEvidence
    );

    assert.ok(
      result.operationExecutionAuthorizationEvidence.length > 0
    );

    assert.deepEqual(result.blockedReasons, []);

    assert.equal(result.mayInvokeExecutor, false);
    assert.equal(result.mayExecuteOperation, false);
    assert.equal(result.mayModifyRepository, false);
    assert.equal(result.mayPerformNetworkExecution, false);
    assert.equal(result.mayPerformExternalSideEffects, false);

    assert.equal(
      result.futureControlledOperationExecutionBoundaryRequired,
      true
    );
  }
);

test("DEV-274 rejects wrong predecessor version", () => {
  assertRejected(
    unsafePredecessor({
      version: "DEV-999"
    })
  );
});

test("DEV-274 rejects untrusted predecessor", () => {
  assertRejected(
    unsafePredecessor({
      trusted: false
    })
  );
});

test("DEV-274 rejects unready predecessor", () => {
  assertRejected(
    unsafePredecessor({
      ready: false
    })
  );
});

test("DEV-274 rejects predecessor that was not invoked", () => {
  assertRejected(
    unsafePredecessor({
      invoked: false
    })
  );
});

test("DEV-274 rejects wrong invocation state", () => {
  assertRejected(
    unsafePredecessor({
      invocationState: "CONTROLLED_EXECUTOR_NOT_INVOKED"
    })
  );
});

test("DEV-274 rejects non-inert invocation result", () => {
  assertRejected(
    unsafePredecessor({
      controlledExecutorInvocationResultIsInertData: false
    })
  );
});

test("DEV-274 rejects executor invocation authority", () => {
  assertRejected(
    unsafePredecessor({
      mayInvokeExecutor: true
    })
  );
});

test("DEV-274 rejects operation execution authority", () => {
  assertRejected(
    unsafePredecessor({
      mayExecuteOperation: true
    })
  );
});

test("DEV-274 rejects missing future execution boundary", () => {
  assertRejected(
    unsafePredecessor({
      futureExecutionBoundaryRequired: false
    })
  );
});

test("DEV-274 rejects blocked predecessor", () => {
  assertRejected(
    unsafePredecessor({
      blockedReasons: ["blocked"]
    })
  );
});

test("DEV-274 rejects missing controlled dispatch", () => {
  assertRejected(
    unsafePredecessor({
      controlledDispatch: null
    })
  );
});

test("DEV-274 rejects missing dispatch authorization", () => {
  assertRejected(
    unsafePredecessor({
      dispatchAuthorization: null
    })
  );
});

test("DEV-274 rejects missing active admission", () => {
  assertRejected(
    unsafePredecessor({
      activeAdmission: null
    })
  );
});

test("DEV-274 rejects missing authorization", () => {
  assertRejected(
    unsafePredecessor({
      authorization: null
    })
  );
});

test("DEV-274 rejects missing eligibility", () => {
  assertRejected(
    unsafePredecessor({
      eligibility: null
    })
  );
});

test("DEV-274 rejects missing consumption", () => {
  assertRejected(
    unsafePredecessor({
      consumption: null
    })
  );
});

test("DEV-274 rejects missing receipt state", () => {
  assertRejected(
    unsafePredecessor({
      receiptState: null
    })
  );
});

test("DEV-274 rejects missing executed operation", () => {
  assertRejected(
    unsafePredecessor({
      executedOperation: null
    })
  );
});

test("DEV-274 rejects empty approved execution scope", () => {
  assertRejected(
    unsafePredecessor({
      approvedExecutionScope: []
    })
  );
});

test("DEV-274 rejects empty provenance", () => {
  assertRejected(
    unsafePredecessor({
      provenance: []
    })
  );
});

test(
  "DEV-274 rejects missing controlled executor invocation evidence",
  () => {
    assertRejected(
      unsafePredecessor({
        controlledExecutorInvocationEvidence: []
      })
    );
  }
);
