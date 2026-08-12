import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRiverDevControlledExecutionAuditFoundation
} from "./controlled-execution-audit-foundation-engine";

import type {
  RiverDevControlledExecutionArchiveFoundationResult
} from "../types";

function validPredecessor(): RiverDevControlledExecutionArchiveFoundationResult {
  return {
    version: "DEV-281",

    trusted: true,
    ready: true,
    executionArchived: true,

    defaultPolicy: "DENY",

    controlledExecutionArchiveBoundaryOnly: true,
    executionArchiveResultIsDeterministicData: true,

    executionArchiveState: "CONTROLLED_EXECUTION_ARCHIVED",

    controlledExecutionClosure: {} as RiverDevControlledExecutionArchiveFoundationResult["controlledExecutionClosure"],
    controlledExecutionFinalization: {} as RiverDevControlledExecutionArchiveFoundationResult["controlledExecutionFinalization"],
    controlledExecutionCompletion: {} as RiverDevControlledExecutionArchiveFoundationResult["controlledExecutionCompletion"],
    controlledOperationExecutionLifecycle: {} as RiverDevControlledExecutionArchiveFoundationResult["controlledOperationExecutionLifecycle"],
    controlledOperationExecutionReceipt: {} as RiverDevControlledExecutionArchiveFoundationResult["controlledOperationExecutionReceipt"],
    controlledOperationExecution: {} as RiverDevControlledExecutionArchiveFoundationResult["controlledOperationExecution"],
    operationExecutionAuthorization: {} as RiverDevControlledExecutionArchiveFoundationResult["operationExecutionAuthorization"],
    controlledExecutorInvocation: {} as RiverDevControlledExecutionArchiveFoundationResult["controlledExecutorInvocation"],
    controlledDispatch: {} as RiverDevControlledExecutionArchiveFoundationResult["controlledDispatch"],
    dispatchAuthorization: {} as RiverDevControlledExecutionArchiveFoundationResult["dispatchAuthorization"],
    activeAdmission: {} as RiverDevControlledExecutionArchiveFoundationResult["activeAdmission"],
    authorization: {} as RiverDevControlledExecutionArchiveFoundationResult["authorization"],
    eligibility: {} as RiverDevControlledExecutionArchiveFoundationResult["eligibility"],
    consumption: {} as RiverDevControlledExecutionArchiveFoundationResult["consumption"],
    receiptState: {} as RiverDevControlledExecutionArchiveFoundationResult["receiptState"],
    executedOperation: {} as RiverDevControlledExecutionArchiveFoundationResult["executedOperation"],

    approvedExecutionScope: ["controlled-operation"],
    provenance: ["DEV-281"],

    controlledDispatchEvidence: ["dispatch"],
    executorInvocationAuthorizationEvidence: ["executor-authorization"],
    controlledExecutorInvocationEvidence: ["executor-invocation"],
    operationExecutionAuthorizationEvidence: ["operation-authorization"],
    controlledOperationExecutionEvidence: ["operation-execution"],
    controlledOperationExecutionReceiptEvidence: ["execution-receipt"],
    controlledOperationExecutionLifecycleEvidence: ["execution-lifecycle"],
    controlledExecutionCompletionEvidence: ["execution-completion"],
    controlledExecutionFinalizationEvidence: ["execution-finalization"],
    controlledExecutionClosureEvidence: ["execution-closure"],
    controlledExecutionArchiveEvidence: ["execution-archive"],

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

    futureControlledExecutionAuditBoundaryRequired: true
  };
}

function expectDenied(
  predecessor: RiverDevControlledExecutionArchiveFoundationResult,
  reason: string
): void {
  const result =
    buildRiverDevControlledExecutionAuditFoundation(predecessor);

  assert.equal(result.trusted, false);
  assert.equal(result.ready, false);
  assert.equal(result.executionAudited, false);
  assert.equal(
    result.executionAuditState,
    "CONTROLLED_EXECUTION_NOT_AUDITED"
  );
  assert.deepEqual(result.blockedReasons, [reason]);
}

test("DEV-282 audits only a valid exact DEV-281 predecessor", () => {
  const predecessor = validPredecessor();

  const result =
    buildRiverDevControlledExecutionAuditFoundation(predecessor);

  assert.equal(result.version, "DEV-282");
  assert.equal(result.trusted, true);
  assert.equal(result.ready, true);
  assert.equal(result.executionAudited, true);

  assert.equal(
    result.executionAuditState,
    "CONTROLLED_EXECUTION_AUDITED"
  );

  assert.equal(result.controlledExecutionArchive, predecessor);

  assert.deepEqual(
    result.approvedExecutionScope,
    predecessor.approvedExecutionScope
  );

  assert.deepEqual(result.provenance, predecessor.provenance);

  assert.ok(result.controlledExecutionAuditEvidence.length > 0);

  assert.equal(
    result.futureControlledExecutionAttestationBoundaryRequired,
    true
  );

  assert.deepEqual(result.blockedReasons, []);
});

test("DEV-282 rejects wrong predecessor version", () => {
  const predecessor = validPredecessor();

  (predecessor as { version: string }).version = "DEV-280";

  expectDenied(
    predecessor,
    "INVALID_DEV_281_PREDECESSOR_VERSION"
  );
});

test("DEV-282 rejects untrusted predecessor", () => {
  const predecessor = validPredecessor();
  predecessor.trusted = false;

  expectDenied(predecessor, "UNTRUSTED_DEV_281_PREDECESSOR");
});

test("DEV-282 rejects unready predecessor", () => {
  const predecessor = validPredecessor();
  predecessor.ready = false;

  expectDenied(predecessor, "UNREADY_DEV_281_PREDECESSOR");
});

test("DEV-282 rejects predecessor without archived execution", () => {
  const predecessor = validPredecessor();
  predecessor.executionArchived = false;

  expectDenied(predecessor, "DEV_281_EXECUTION_NOT_ARCHIVED");
});

test("DEV-282 rejects wrong archive state", () => {
  const predecessor = validPredecessor();

  predecessor.executionArchiveState =
    "CONTROLLED_EXECUTION_NOT_ARCHIVED";

  expectDenied(predecessor, "INVALID_DEV_281_ARCHIVE_STATE");
});

test("DEV-282 rejects predecessor outside archive boundary", () => {
  const predecessor = validPredecessor();

  (predecessor as {
    controlledExecutionArchiveBoundaryOnly: boolean;
  }).controlledExecutionArchiveBoundaryOnly = false;

  expectDenied(predecessor, "DEV_281_OUTSIDE_ARCHIVE_BOUNDARY");
});

test("DEV-282 rejects non-deterministic archive predecessor", () => {
  const predecessor = validPredecessor();

  (predecessor as {
    executionArchiveResultIsDeterministicData: boolean;
  }).executionArchiveResultIsDeterministicData = false;

  expectDenied(
    predecessor,
    "NON_DETERMINISTIC_DEV_281_ARCHIVE_RESULT"
  );
});

test("DEV-282 rejects missing execution closure", () => {
  const predecessor = validPredecessor();
  predecessor.controlledExecutionClosure = null;

  expectDenied(predecessor, "MISSING_DEV_281_EXECUTION_CLOSURE");
});

test("DEV-282 rejects missing execution finalization", () => {
  const predecessor = validPredecessor();
  predecessor.controlledExecutionFinalization = null;

  expectDenied(
    predecessor,
    "MISSING_DEV_281_EXECUTION_FINALIZATION"
  );
});

test("DEV-282 rejects missing execution completion", () => {
  const predecessor = validPredecessor();
  predecessor.controlledExecutionCompletion = null;

  expectDenied(
    predecessor,
    "MISSING_DEV_281_EXECUTION_COMPLETION"
  );
});

test("DEV-282 rejects missing execution lifecycle", () => {
  const predecessor = validPredecessor();
  predecessor.controlledOperationExecutionLifecycle = null;

  expectDenied(
    predecessor,
    "MISSING_DEV_281_EXECUTION_LIFECYCLE"
  );
});

test("DEV-282 rejects missing execution receipt", () => {
  const predecessor = validPredecessor();
  predecessor.controlledOperationExecutionReceipt = null;

  expectDenied(
    predecessor,
    "MISSING_DEV_281_EXECUTION_RECEIPT"
  );
});

test("DEV-282 rejects missing controlled operation execution", () => {
  const predecessor = validPredecessor();
  predecessor.controlledOperationExecution = null;

  expectDenied(
    predecessor,
    "MISSING_DEV_281_CONTROLLED_OPERATION_EXECUTION"
  );
});

test("DEV-282 rejects missing operation execution authorization", () => {
  const predecessor = validPredecessor();
  predecessor.operationExecutionAuthorization = null;

  expectDenied(
    predecessor,
    "MISSING_DEV_281_OPERATION_EXECUTION_AUTHORIZATION"
  );
});

test("DEV-282 rejects missing controlled executor invocation", () => {
  const predecessor = validPredecessor();
  predecessor.controlledExecutorInvocation = null;

  expectDenied(
    predecessor,
    "MISSING_DEV_281_CONTROLLED_EXECUTOR_INVOCATION"
  );
});

test("DEV-282 rejects missing controlled dispatch", () => {
  const predecessor = validPredecessor();
  predecessor.controlledDispatch = null;

  expectDenied(
    predecessor,
    "MISSING_DEV_281_CONTROLLED_DISPATCH"
  );
});

test("DEV-282 rejects missing dispatch authorization", () => {
  const predecessor = validPredecessor();
  predecessor.dispatchAuthorization = null;

  expectDenied(
    predecessor,
    "MISSING_DEV_281_DISPATCH_AUTHORIZATION"
  );
});

test("DEV-282 rejects missing active admission", () => {
  const predecessor = validPredecessor();
  predecessor.activeAdmission = null;

  expectDenied(predecessor, "MISSING_DEV_281_ACTIVE_ADMISSION");
});

test("DEV-282 rejects missing authorization", () => {
  const predecessor = validPredecessor();
  predecessor.authorization = null;

  expectDenied(predecessor, "MISSING_DEV_281_AUTHORIZATION");
});

test("DEV-282 rejects missing eligibility", () => {
  const predecessor = validPredecessor();
  predecessor.eligibility = null;

  expectDenied(predecessor, "MISSING_DEV_281_ELIGIBILITY");
});

test("DEV-282 rejects missing consumption", () => {
  const predecessor = validPredecessor();
  predecessor.consumption = null;

  expectDenied(predecessor, "MISSING_DEV_281_CONSUMPTION");
});

test("DEV-282 rejects missing receipt state", () => {
  const predecessor = validPredecessor();
  predecessor.receiptState = null;

  expectDenied(predecessor, "MISSING_DEV_281_RECEIPT_STATE");
});

test("DEV-282 rejects missing executed operation", () => {
  const predecessor = validPredecessor();
  predecessor.executedOperation = null;

  expectDenied(
    predecessor,
    "MISSING_DEV_281_EXECUTED_OPERATION"
  );
});

test("DEV-282 rejects empty approved execution scope", () => {
  const predecessor = validPredecessor();
  predecessor.approvedExecutionScope = [];

  expectDenied(
    predecessor,
    "EMPTY_DEV_281_APPROVED_EXECUTION_SCOPE"
  );
});

test("DEV-282 rejects empty provenance", () => {
  const predecessor = validPredecessor();
  predecessor.provenance = [];

  expectDenied(predecessor, "EMPTY_DEV_281_PROVENANCE");
});

test("DEV-282 rejects missing controlled dispatch evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledDispatchEvidence = [];

  expectDenied(
    predecessor,
    "MISSING_DEV_281_CONTROLLED_DISPATCH_EVIDENCE"
  );
});

test("DEV-282 rejects missing executor authorization evidence", () => {
  const predecessor = validPredecessor();
  predecessor.executorInvocationAuthorizationEvidence = [];

  expectDenied(
    predecessor,
    "MISSING_DEV_281_EXECUTOR_INVOCATION_AUTHORIZATION_EVIDENCE"
  );
});

test("DEV-282 rejects missing controlled executor invocation evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledExecutorInvocationEvidence = [];

  expectDenied(
    predecessor,
    "MISSING_DEV_281_CONTROLLED_EXECUTOR_INVOCATION_EVIDENCE"
  );
});

test("DEV-282 rejects missing operation authorization evidence", () => {
  const predecessor = validPredecessor();
  predecessor.operationExecutionAuthorizationEvidence = [];

  expectDenied(
    predecessor,
    "MISSING_DEV_281_OPERATION_EXECUTION_AUTHORIZATION_EVIDENCE"
  );
});

test("DEV-282 rejects missing controlled operation execution evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledOperationExecutionEvidence = [];

  expectDenied(
    predecessor,
    "MISSING_DEV_281_CONTROLLED_OPERATION_EXECUTION_EVIDENCE"
  );
});

test("DEV-282 rejects missing execution receipt evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledOperationExecutionReceiptEvidence = [];

  expectDenied(
    predecessor,
    "MISSING_DEV_281_CONTROLLED_OPERATION_EXECUTION_RECEIPT_EVIDENCE"
  );
});

test("DEV-282 rejects missing execution lifecycle evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledOperationExecutionLifecycleEvidence = [];

  expectDenied(
    predecessor,
    "MISSING_DEV_281_CONTROLLED_OPERATION_EXECUTION_LIFECYCLE_EVIDENCE"
  );
});

test("DEV-282 rejects missing execution completion evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledExecutionCompletionEvidence = [];

  expectDenied(
    predecessor,
    "MISSING_DEV_281_CONTROLLED_EXECUTION_COMPLETION_EVIDENCE"
  );
});

test("DEV-282 rejects missing execution finalization evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledExecutionFinalizationEvidence = [];

  expectDenied(
    predecessor,
    "MISSING_DEV_281_CONTROLLED_EXECUTION_FINALIZATION_EVIDENCE"
  );
});

test("DEV-282 rejects missing execution closure evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledExecutionClosureEvidence = [];

  expectDenied(
    predecessor,
    "MISSING_DEV_281_CONTROLLED_EXECUTION_CLOSURE_EVIDENCE"
  );
});

test("DEV-282 rejects missing execution archive evidence", () => {
  const predecessor = validPredecessor();
  predecessor.controlledExecutionArchiveEvidence = [];

  expectDenied(
    predecessor,
    "MISSING_DEV_281_CONTROLLED_EXECUTION_ARCHIVE_EVIDENCE"
  );
});

test("DEV-282 rejects blocked predecessor", () => {
  const predecessor = validPredecessor();
  predecessor.blockedReasons = ["blocked"];

  expectDenied(predecessor, "BLOCKED_DEV_281_PREDECESSOR");
});

test("DEV-282 rejects dispatch or admission authority", () => {
  const predecessor = validPredecessor();

  (predecessor as {
    mayDispatch: boolean;
  }).mayDispatch = true;

  expectDenied(
    predecessor,
    "DEV_281_HAS_DISPATCH_OR_ADMISSION_AUTHORITY"
  );
});

test("DEV-282 rejects execution authority", () => {
  const predecessor = validPredecessor();

  (predecessor as {
    mayExecuteOperation: boolean;
  }).mayExecuteOperation = true;

  expectDenied(predecessor, "DEV_281_HAS_EXECUTION_AUTHORITY");
});

test("DEV-282 rejects repository mutation authority", () => {
  const predecessor = validPredecessor();

  (predecessor as {
    mayCommit: boolean;
  }).mayCommit = true;

  expectDenied(
    predecessor,
    "DEV_281_HAS_REPOSITORY_MUTATION_AUTHORITY"
  );
});

test("DEV-282 rejects external side-effect authority", () => {
  const predecessor = validPredecessor();

  (predecessor as {
    mayPerformExternalSideEffects: boolean;
  }).mayPerformExternalSideEffects = true;

  expectDenied(
    predecessor,
    "DEV_281_HAS_EXTERNAL_SIDE_EFFECT_AUTHORITY"
  );
});

test("DEV-282 rejects missing future audit boundary", () => {
  const predecessor = validPredecessor();

  (predecessor as {
    futureControlledExecutionAuditBoundaryRequired: boolean;
  }).futureControlledExecutionAuditBoundaryRequired = false;

  expectDenied(
    predecessor,
    "MISSING_DEV_281_FUTURE_AUDIT_BOUNDARY"
  );
});
