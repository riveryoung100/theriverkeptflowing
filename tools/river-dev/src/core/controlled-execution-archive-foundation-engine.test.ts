import assert from "node:assert/strict";
import test from "node:test";

import type {
  RiverDevControlledExecutionClosureFoundationResult
} from "../types";

import {
  establishControlledExecutionArchiveFoundation
} from "./controlled-execution-archive-foundation-engine";

function validPredecessor():
  RiverDevControlledExecutionClosureFoundationResult {
  return {
    version: "DEV-280",

    trusted: true,
    ready: true,
    executionClosed: true,

    defaultPolicy: "DENY",

    controlledExecutionClosureBoundaryOnly: true,
    executionClosureResultIsDeterministicData: true,

    executionClosureState: "CONTROLLED_EXECUTION_CLOSED",

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

    approvedExecutionScope: ["operation:test"],
    provenance: ["DEV-280:test"],

    controlledDispatchEvidence: ["dispatch"],
    executorInvocationAuthorizationEvidence: ["executor-auth"],
    controlledExecutorInvocationEvidence: ["executor"],
    operationExecutionAuthorizationEvidence: ["operation-auth"],
    controlledOperationExecutionEvidence: ["execution"],
    controlledOperationExecutionReceiptEvidence: ["receipt"],
    controlledOperationExecutionLifecycleEvidence: ["lifecycle"],
    controlledExecutionCompletionEvidence: ["completion"],
    controlledExecutionFinalizationEvidence: ["finalization"],
    controlledExecutionClosureEvidence: [
      "DEV-280_CONTROLLED_EXECUTION_CLOSED"
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

    futureControlledExecutionArchiveBoundaryRequired: true
  };
}

test(
  "DEV-281 archives only a valid exact DEV-280 predecessor",
  () => {
    const predecessor = validPredecessor();

    const result =
      establishControlledExecutionArchiveFoundation(predecessor);

    assert.equal(result.version, "DEV-281");
    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.executionArchived, true);

    assert.equal(
      result.executionArchiveState,
      "CONTROLLED_EXECUTION_ARCHIVED"
    );

    assert.equal(
      result.controlledExecutionClosure,
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
      result.controlledExecutionClosureEvidence,
      predecessor.controlledExecutionClosureEvidence
    );

    assert.deepEqual(
      result.controlledExecutionArchiveEvidence,
      [
        ...predecessor.controlledExecutionClosureEvidence,
        "DEV-281_CONTROLLED_EXECUTION_ARCHIVED"
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
    assert.equal(result.mayPerformExternalSideEffects, false);

    assert.equal(
      result.futureControlledExecutionAuditBoundaryRequired,
      true
    );
  }
);

test("DEV-281 rejects wrong predecessor version", () => {
  const predecessor = validPredecessor() as any;
  predecessor.version = "DEV-279";

  const result =
    establishControlledExecutionArchiveFoundation(predecessor);

  assert.equal(result.executionArchived, false);
  assert.equal(result.trusted, false);
});

test("DEV-281 rejects untrusted predecessor", () => {
  const predecessor = validPredecessor();
  predecessor.trusted = false;

  const result =
    establishControlledExecutionArchiveFoundation(predecessor);

  assert.equal(result.executionArchived, false);
});

test("DEV-281 rejects unready predecessor", () => {
  const predecessor = validPredecessor();
  predecessor.ready = false;

  const result =
    establishControlledExecutionArchiveFoundation(predecessor);

  assert.equal(result.executionArchived, false);
});

test("DEV-281 rejects predecessor without closed execution", () => {
  const predecessor = validPredecessor();
  predecessor.executionClosed = false;

  const result =
    establishControlledExecutionArchiveFoundation(predecessor);

  assert.equal(result.executionArchived, false);
});

test("DEV-281 rejects wrong closure state", () => {
  const predecessor = validPredecessor();

  predecessor.executionClosureState =
    "CONTROLLED_EXECUTION_NOT_CLOSED";

  const result =
    establishControlledExecutionArchiveFoundation(predecessor);

  assert.equal(result.executionArchived, false);
});

test("DEV-281 rejects non-deterministic closure predecessor", () => {
  const predecessor = validPredecessor() as any;
  predecessor.executionClosureResultIsDeterministicData = false;

  const result =
    establishControlledExecutionArchiveFoundation(predecessor);

  assert.equal(result.executionArchived, false);
});

test("DEV-281 rejects predecessor outside closure boundary", () => {
  const predecessor = validPredecessor() as any;
  predecessor.controlledExecutionClosureBoundaryOnly = false;

  const result =
    establishControlledExecutionArchiveFoundation(predecessor);

  assert.equal(result.executionArchived, false);
});

test("DEV-281 rejects missing finalization", () => {
  const predecessor = validPredecessor();
  predecessor.controlledExecutionFinalization = null;

  const result =
    establishControlledExecutionArchiveFoundation(predecessor);

  assert.equal(result.executionArchived, false);
});

test("DEV-281 rejects missing completion", () => {
  const predecessor = validPredecessor();
  predecessor.controlledExecutionCompletion = null;

  const result =
    establishControlledExecutionArchiveFoundation(predecessor);

  assert.equal(result.executionArchived, false);
});

test("DEV-281 rejects missing lifecycle", () => {
  const predecessor = validPredecessor();
  predecessor.controlledOperationExecutionLifecycle = null;

  const result =
    establishControlledExecutionArchiveFoundation(predecessor);

  assert.equal(result.executionArchived, false);
});

test("DEV-281 rejects missing execution receipt", () => {
  const predecessor = validPredecessor();
  predecessor.controlledOperationExecutionReceipt = null;

  const result =
    establishControlledExecutionArchiveFoundation(predecessor);

  assert.equal(result.executionArchived, false);
});

test("DEV-281 rejects missing controlled operation execution", () => {
  const predecessor = validPredecessor();
  predecessor.controlledOperationExecution = null;

  const result =
    establishControlledExecutionArchiveFoundation(predecessor);

  assert.equal(result.executionArchived, false);
});

test("DEV-281 rejects missing executed operation", () => {
  const predecessor = validPredecessor();
  predecessor.executedOperation = null;

  const result =
    establishControlledExecutionArchiveFoundation(predecessor);

  assert.equal(result.executionArchived, false);
});

test("DEV-281 rejects empty approved execution scope", () => {
  const predecessor = validPredecessor();
  predecessor.approvedExecutionScope = [];

  const result =
    establishControlledExecutionArchiveFoundation(predecessor);

  assert.equal(result.executionArchived, false);
});

test("DEV-281 rejects empty provenance", () => {
  const predecessor = validPredecessor();
  predecessor.provenance = [];

  const result =
    establishControlledExecutionArchiveFoundation(predecessor);

  assert.equal(result.executionArchived, false);
});

test("DEV-281 rejects missing controlled dispatch evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledDispatchEvidence = [];

  const result =
    establishControlledExecutionArchiveFoundation(predecessor);

  assert.equal(result.executionArchived, false);
});

test(
  "DEV-281 rejects missing executor invocation authorization evidence",
  () => {
    const predecessor = validPredecessor();
    predecessor.executorInvocationAuthorizationEvidence = [];

    const result =
      establishControlledExecutionArchiveFoundation(predecessor);

    assert.equal(result.executionArchived, false);
  }
);

test(
  "DEV-281 rejects missing controlled executor invocation evidence",
  () => {
    const predecessor = validPredecessor();
    predecessor.controlledExecutorInvocationEvidence = [];

    const result =
      establishControlledExecutionArchiveFoundation(predecessor);

    assert.equal(result.executionArchived, false);
  }
);

test(
  "DEV-281 rejects missing operation execution authorization evidence",
  () => {
    const predecessor = validPredecessor();
    predecessor.operationExecutionAuthorizationEvidence = [];

    const result =
      establishControlledExecutionArchiveFoundation(predecessor);

    assert.equal(result.executionArchived, false);
  }
);

test("DEV-281 rejects missing execution evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledOperationExecutionEvidence = [];

  const result =
    establishControlledExecutionArchiveFoundation(predecessor);

  assert.equal(result.executionArchived, false);
});

test("DEV-281 rejects missing receipt evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledOperationExecutionReceiptEvidence = [];

  const result =
    establishControlledExecutionArchiveFoundation(predecessor);

  assert.equal(result.executionArchived, false);
});

test("DEV-281 rejects missing lifecycle evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledOperationExecutionLifecycleEvidence = [];

  const result =
    establishControlledExecutionArchiveFoundation(predecessor);

  assert.equal(result.executionArchived, false);
});

test("DEV-281 rejects missing completion evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledExecutionCompletionEvidence = [];

  const result =
    establishControlledExecutionArchiveFoundation(predecessor);

  assert.equal(result.executionArchived, false);
});

test("DEV-281 rejects missing finalization evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledExecutionFinalizationEvidence = [];

  const result =
    establishControlledExecutionArchiveFoundation(predecessor);

  assert.equal(result.executionArchived, false);
});

test("DEV-281 rejects missing closure evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledExecutionClosureEvidence = [];

  const result =
    establishControlledExecutionArchiveFoundation(predecessor);

  assert.equal(result.executionArchived, false);
});

test("DEV-281 rejects blocked predecessor", () => {
  const predecessor = validPredecessor();
  predecessor.blockedReasons = ["blocked"];

  const result =
    establishControlledExecutionArchiveFoundation(predecessor);

  assert.equal(result.executionArchived, false);
});

test("DEV-281 rejects predecessor with executor authority", () => {
  const predecessor = validPredecessor() as any;
  predecessor.mayInvokeExecutor = true;

  const result =
    establishControlledExecutionArchiveFoundation(predecessor);

  assert.equal(result.executionArchived, false);
});

test("DEV-281 rejects predecessor with execution authority", () => {
  const predecessor = validPredecessor() as any;
  predecessor.mayExecuteOperation = true;

  const result =
    establishControlledExecutionArchiveFoundation(predecessor);

  assert.equal(result.executionArchived, false);
});

test("DEV-281 rejects predecessor with retry authority", () => {
  const predecessor = validPredecessor() as any;
  predecessor.mayRetryExecution = true;

  const result =
    establishControlledExecutionArchiveFoundation(predecessor);

  assert.equal(result.executionArchived, false);
});

test(
  "DEV-281 rejects predecessor with lifecycle persistence authority",
  () => {
    const predecessor = validPredecessor() as any;
    predecessor.mayPersistLifecycleState = true;

    const result =
      establishControlledExecutionArchiveFoundation(predecessor);

    assert.equal(result.executionArchived, false);
  }
);

test(
  "DEV-281 rejects predecessor with repository mutation authority",
  () => {
    const predecessor = validPredecessor() as any;
    predecessor.mayModifyRepository = true;

    const result =
      establishControlledExecutionArchiveFoundation(predecessor);

    assert.equal(result.executionArchived, false);
  }
);

test("DEV-281 rejects predecessor with commit authority", () => {
  const predecessor = validPredecessor() as any;
  predecessor.mayCommit = true;

  const result =
    establishControlledExecutionArchiveFoundation(predecessor);

  assert.equal(result.executionArchived, false);
});

test("DEV-281 rejects predecessor with push authority", () => {
  const predecessor = validPredecessor() as any;
  predecessor.mayPush = true;

  const result =
    establishControlledExecutionArchiveFoundation(predecessor);

  assert.equal(result.executionArchived, false);
});

test(
  "DEV-281 rejects predecessor with external side-effect authority",
  () => {
    const predecessor = validPredecessor() as any;
    predecessor.mayPerformExternalSideEffects = true;

    const result =
      establishControlledExecutionArchiveFoundation(predecessor);

    assert.equal(result.executionArchived, false);
  }
);

test("DEV-281 rejects missing future archive boundary", () => {
  const predecessor = validPredecessor() as any;

  predecessor.futureControlledExecutionArchiveBoundaryRequired =
    false;

  const result =
    establishControlledExecutionArchiveFoundation(predecessor);

  assert.equal(result.executionArchived, false);
});
