import assert from "node:assert/strict";
import test from "node:test";

import type {
  RiverDevControlledExecutorInvocationFoundationResult,
  RiverDevOperationExecutionAuthorizationFoundationResult
} from "../types";

import {
  authorizeOperationExecution
} from "./operation-execution-authorization-foundation-engine";

import {
  executeControlledOperation
} from "./controlled-operation-execution-boundary-foundation-engine";

function createValidDev273Predecessor():
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

    controlledDispatch:
      {} as RiverDevControlledExecutorInvocationFoundationResult["controlledDispatch"],

    dispatchAuthorization:
      {} as RiverDevControlledExecutorInvocationFoundationResult["dispatchAuthorization"],

    activeAdmission:
      {} as RiverDevControlledExecutorInvocationFoundationResult["activeAdmission"],

    authorization:
      {} as RiverDevControlledExecutorInvocationFoundationResult["authorization"],

    eligibility:
      {} as RiverDevControlledExecutorInvocationFoundationResult["eligibility"],

    consumption:
      {} as RiverDevControlledExecutorInvocationFoundationResult["consumption"],

    receiptState:
      {} as RiverDevControlledExecutorInvocationFoundationResult["receiptState"],

    executedOperation:
      {} as RiverDevControlledExecutorInvocationFoundationResult["executedOperation"],

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

function createValidPredecessor():
  RiverDevOperationExecutionAuthorizationFoundationResult {
  return authorizeOperationExecution(
    createValidDev273Predecessor()
  );
}

function unsafePredecessor(
  patch: Record<string, unknown>
): RiverDevOperationExecutionAuthorizationFoundationResult {
  return {
    ...createValidPredecessor(),
    ...patch
  } as unknown as RiverDevOperationExecutionAuthorizationFoundationResult;
}

function assertRejected(
  predecessor: RiverDevOperationExecutionAuthorizationFoundationResult
): void {
  const result = executeControlledOperation(predecessor);

  assert.equal(result.version, "DEV-275");
  assert.equal(result.trusted, false);
  assert.equal(result.ready, false);
  assert.equal(result.operationExecuted, false);

  assert.equal(result.defaultPolicy, "DENY");

  assert.equal(
    result.executionState,
    "CONTROLLED_OPERATION_NOT_EXECUTED"
  );

  assert.equal(result.operationExecutionAuthorization, null);
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
  assert.deepEqual(
    result.controlledOperationExecutionEvidence,
    []
  );

  assert.ok(result.blockedReasons.length > 0);

  assert.equal(result.mayCreateExecutionAuthorization, false);
  assert.equal(result.mayAuthorizeDownstreamAction, false);
  assert.equal(result.mayAdmitIntoActiveExecutor, false);
  assert.equal(result.mayActivateAdmission, false);
  assert.equal(result.mayDispatch, false);

  assert.equal(result.mayInvokeExecutor, false);
  assert.equal(result.mayInvokeInspectionDependency, false);
  assert.equal(result.mayRetryExecution, false);
  assert.equal(result.mayPersistLifecycleState, false);

  assert.equal(
    result.mayModifyRepositoryBeyondAuthorizedOperation,
    false
  );

  assert.equal(result.mayDeleteRepositoryContent, false);
  assert.equal(result.mayStageRepositoryChanges, false);
  assert.equal(result.mayCommit, false);
  assert.equal(result.mayPush, false);
  assert.equal(result.mayDeploy, false);

  assert.equal(result.mayAccessSecrets, false);
  assert.equal(result.mayExpandScope, false);
  assert.equal(result.mayPerformArbitraryShellExecution, false);
  assert.equal(result.mayPerformNetworkExecution, false);

  assert.equal(
    result.mayPerformExternalSideEffectsBeyondAuthorizedOperation,
    false
  );

  assert.equal(
    result.futureExecutionReceiptBoundaryRequired,
    true
  );
}

test(
  "DEV-275 executes only a valid exact DEV-274 authorized predecessor",
  () => {
    const predecessor = createValidPredecessor();

    assert.equal(predecessor.trusted, true);
    assert.equal(predecessor.ready, true);
    assert.equal(
      predecessor.operationExecutionAuthorized,
      true
    );

    const result = executeControlledOperation(predecessor);

    assert.equal(result.version, "DEV-275");
    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.operationExecuted, true);

    assert.equal(result.defaultPolicy, "DENY");

    assert.equal(
      result.controlledOperationExecutionBoundaryOnly,
      true
    );

    assert.equal(
      result.executionResultIsDeterministicData,
      true
    );

    assert.equal(
      result.executionState,
      "CONTROLLED_OPERATION_EXECUTED"
    );

    assert.equal(
      result.operationExecutionAuthorization,
      predecessor
    );

    assert.equal(
      result.controlledExecutorInvocation,
      predecessor.controlledExecutorInvocation
    );

    assert.equal(
      result.controlledDispatch,
      predecessor.controlledDispatch
    );

    assert.equal(
      result.dispatchAuthorization,
      predecessor.dispatchAuthorization
    );

    assert.equal(
      result.activeAdmission,
      predecessor.activeAdmission
    );

    assert.equal(
      result.authorization,
      predecessor.authorization
    );

    assert.equal(
      result.eligibility,
      predecessor.eligibility
    );

    assert.equal(
      result.consumption,
      predecessor.consumption
    );

    assert.equal(
      result.receiptState,
      predecessor.receiptState
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
      [...predecessor.provenance, "DEV-275"]
    );

    assert.deepEqual(
      result.controlledDispatchEvidence,
      predecessor.controlledDispatchEvidence
    );

    assert.deepEqual(
      result.executorInvocationAuthorizationEvidence,
      predecessor.executorInvocationAuthorizationEvidence
    );

    assert.deepEqual(
      result.controlledExecutorInvocationEvidence,
      predecessor.controlledExecutorInvocationEvidence
    );

    assert.deepEqual(
      result.operationExecutionAuthorizationEvidence,
      predecessor.operationExecutionAuthorizationEvidence
    );

    assert.ok(
      result.controlledOperationExecutionEvidence.length > 0
    );

    assert.deepEqual(result.blockedReasons, []);

    assert.equal(result.singleAuthorizedOperationOnly, true);
    assert.equal(result.scopeMustRemainExact, true);
    assert.equal(
      result.predecessorEvidenceMustRemainPresent,
      true
    );

    assert.equal(result.mayCreateExecutionAuthorization, false);
    assert.equal(result.mayAuthorizeDownstreamAction, false);
    assert.equal(result.mayAdmitIntoActiveExecutor, false);
    assert.equal(result.mayActivateAdmission, false);
    assert.equal(result.mayDispatch, false);

    assert.equal(result.mayInvokeExecutor, false);
    assert.equal(result.mayInvokeInspectionDependency, false);
    assert.equal(result.mayRetryExecution, false);
    assert.equal(result.mayPersistLifecycleState, false);

    assert.equal(
      result.mayModifyRepositoryBeyondAuthorizedOperation,
      false
    );

    assert.equal(result.mayDeleteRepositoryContent, false);
    assert.equal(result.mayStageRepositoryChanges, false);
    assert.equal(result.mayCommit, false);
    assert.equal(result.mayPush, false);
    assert.equal(result.mayDeploy, false);

    assert.equal(result.mayAccessSecrets, false);
    assert.equal(result.mayExpandScope, false);
    assert.equal(result.mayPerformArbitraryShellExecution, false);
    assert.equal(result.mayPerformNetworkExecution, false);

    assert.equal(
      result.mayPerformExternalSideEffectsBeyondAuthorizedOperation,
      false
    );

    assert.equal(
      result.futureExecutionReceiptBoundaryRequired,
      true
    );
  }
);

test("DEV-275 rejects wrong predecessor version", () => {
  assertRejected(
    unsafePredecessor({
      version: "DEV-999"
    })
  );
});

test("DEV-275 rejects untrusted predecessor", () => {
  assertRejected(
    unsafePredecessor({
      trusted: false
    })
  );
});

test("DEV-275 rejects unready predecessor", () => {
  assertRejected(
    unsafePredecessor({
      ready: false
    })
  );
});

test(
  "DEV-275 rejects unauthorized operation execution",
  () => {
    assertRejected(
      unsafePredecessor({
        operationExecutionAuthorized: false
      })
    );
  }
);

test(
  "DEV-275 rejects wrong authorization state",
  () => {
    assertRejected(
      unsafePredecessor({
        operationExecutionAuthorizationState:
          "OPERATION_EXECUTION_UNAUTHORIZED"
      })
    );
  }
);

test(
  "DEV-275 rejects non-decision authorization predecessor",
  () => {
    assertRejected(
      unsafePredecessor({
        operationExecutionAuthorizationDecisionOnly: false
      })
    );
  }
);

test(
  "DEV-275 rejects non-inert authorization predecessor",
  () => {
    assertRejected(
      unsafePredecessor({
        operationExecutionAuthorizationResultIsInertData: false
      })
    );
  }
);

test(
  "DEV-275 rejects predecessor with executor authority",
  () => {
    assertRejected(
      unsafePredecessor({
        mayInvokeExecutor: true
      })
    );
  }
);

test(
  "DEV-275 rejects predecessor with operation authority",
  () => {
    assertRejected(
      unsafePredecessor({
        mayExecuteOperation: true
      })
    );
  }
);

test(
  "DEV-275 rejects missing future controlled execution boundary",
  () => {
    assertRejected(
      unsafePredecessor({
        futureControlledOperationExecutionBoundaryRequired: false
      })
    );
  }
);

test("DEV-275 rejects blocked predecessor", () => {
  assertRejected(
    unsafePredecessor({
      blockedReasons: ["blocked"]
    })
  );
});

test(
  "DEV-275 rejects missing controlled executor invocation",
  () => {
    assertRejected(
      unsafePredecessor({
        controlledExecutorInvocation: null
      })
    );
  }
);

test(
  "DEV-275 rejects missing controlled dispatch",
  () => {
    assertRejected(
      unsafePredecessor({
        controlledDispatch: null
      })
    );
  }
);

test(
  "DEV-275 rejects missing dispatch authorization",
  () => {
    assertRejected(
      unsafePredecessor({
        dispatchAuthorization: null
      })
    );
  }
);

test(
  "DEV-275 rejects missing active admission",
  () => {
    assertRejected(
      unsafePredecessor({
        activeAdmission: null
      })
    );
  }
);

test("DEV-275 rejects missing authorization", () => {
  assertRejected(
    unsafePredecessor({
      authorization: null
    })
  );
});

test("DEV-275 rejects missing eligibility", () => {
  assertRejected(
    unsafePredecessor({
      eligibility: null
    })
  );
});

test("DEV-275 rejects missing consumption", () => {
  assertRejected(
    unsafePredecessor({
      consumption: null
    })
  );
});

test("DEV-275 rejects missing receipt state", () => {
  assertRejected(
    unsafePredecessor({
      receiptState: null
    })
  );
});

test("DEV-275 rejects missing executed operation", () => {
  assertRejected(
    unsafePredecessor({
      executedOperation: null
    })
  );
});

test(
  "DEV-275 rejects empty approved execution scope",
  () => {
    assertRejected(
      unsafePredecessor({
        approvedExecutionScope: []
      })
    );
  }
);

test("DEV-275 rejects empty provenance", () => {
  assertRejected(
    unsafePredecessor({
      provenance: []
    })
  );
});

test(
  "DEV-275 rejects missing operation execution authorization evidence",
  () => {
    assertRejected(
      unsafePredecessor({
        operationExecutionAuthorizationEvidence: []
      })
    );
  }
);
