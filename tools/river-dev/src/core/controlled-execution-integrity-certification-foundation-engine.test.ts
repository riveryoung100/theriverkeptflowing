import assert from "node:assert/strict";
import test from "node:test";

import {
  buildControlledExecutionIntegrityCertificationFoundation
} from "./controlled-execution-integrity-certification-foundation-engine";

import type {
  RiverDevControlledExecutionIntegrityVerificationFoundationResult
} from "../types";


const validPredecessor =
(): RiverDevControlledExecutionIntegrityVerificationFoundationResult => ({
  version: "DEV-288",

  trusted: true,
  ready: true,
  executionIntegrityVerified: true,

  defaultPolicy: "DENY",

  controlledExecutionIntegrityVerificationBoundaryOnly: true,
  executionIntegrityVerificationResultIsDeterministicData: true,

  executionIntegrityVerificationState:
    "CONTROLLED_EXECUTION_INTEGRITY_VERIFIED",

  controlledExecutionIntegrity: {} as never,

  controlledExecutionSeal: {} as never,
  controlledExecutionCertification: {} as never,
  controlledExecutionVerification: {} as never,
  controlledExecutionAttestation: {} as never,
  controlledExecutionAudit: {} as never,
  controlledExecutionArchive: {} as never,
  controlledExecutionClosure: {} as never,
  controlledExecutionFinalization: {} as never,
  controlledExecutionCompletion: {} as never,
  controlledOperationExecutionLifecycle: {} as never,
  controlledOperationExecutionReceipt: {} as never,
  controlledOperationExecution: {} as never,
  operationExecutionAuthorization: {} as never,
  controlledExecutorInvocation: {} as never,
  controlledDispatch: {} as never,
  dispatchAuthorization: {} as never,
  activeAdmission: {} as never,
  authorization: {} as never,
  eligibility: {} as never,
  consumption: {} as never,
  receiptState: {} as never,
  executedOperation: {} as never,

  approvedExecutionScope: [
    "DEV-288:APPROVED_EXECUTION_SCOPE"
  ],

  provenance: [
    "DEV-288:PROVENANCE"
  ],

  controlledDispatchEvidence: ["DEV-288:DISPATCH"],
  executorInvocationAuthorizationEvidence: ["DEV-288:INVOCATION_AUTH"],
  controlledExecutorInvocationEvidence: ["DEV-288:INVOCATION"],
  operationExecutionAuthorizationEvidence: ["DEV-288:OP_AUTH"],
  controlledOperationExecutionEvidence: ["DEV-288:OP_EXECUTION"],
  controlledOperationExecutionReceiptEvidence: ["DEV-288:RECEIPT"],
  controlledOperationExecutionLifecycleEvidence: ["DEV-288:LIFECYCLE"],
  controlledExecutionCompletionEvidence: ["DEV-288:COMPLETION"],
  controlledExecutionFinalizationEvidence: ["DEV-288:FINALIZATION"],
  controlledExecutionClosureEvidence: ["DEV-288:CLOSURE"],
  controlledExecutionArchiveEvidence: ["DEV-288:ARCHIVE"],
  controlledExecutionAuditEvidence: ["DEV-288:AUDIT"],
  controlledExecutionAttestationEvidence: ["DEV-288:ATTESTATION"],
  controlledExecutionVerificationEvidence: ["DEV-288:VERIFICATION"],
  controlledExecutionCertificationEvidence: ["DEV-288:CERTIFICATION"],
  controlledExecutionSealEvidence: ["DEV-288:SEAL"],
  controlledExecutionIntegrityEvidence: ["DEV-288:INTEGRITY"],

  controlledExecutionIntegrityVerificationEvidence: [
    "DEV-287:CONTROLLED_EXECUTION_INTEGRITY_ESTABLISHED",
    "DEV-288:CONTROLLED_EXECUTION_INTEGRITY_VERIFIED"
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

  futureControlledExecutionIntegrityCertificationBoundaryRequired: true
});


const run = (
  predecessor:
    RiverDevControlledExecutionIntegrityVerificationFoundationResult
) =>
  buildControlledExecutionIntegrityCertificationFoundation({
    predecessor
  });


test(
  "DEV-289 certifies only a valid exact DEV-288 predecessor",
  () => {
    const predecessor = validPredecessor();

    const result = run(predecessor);

    assert.equal(result.version, "DEV-289");
    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.executionIntegrityCertified, true);

    assert.equal(result.defaultPolicy, "DENY");

    assert.equal(
      result.controlledExecutionIntegrityCertificationBoundaryOnly,
      true
    );

    assert.equal(
      result.executionIntegrityCertificationResultIsDeterministicData,
      true
    );

    assert.equal(
      result.executionIntegrityCertificationState,
      "CONTROLLED_EXECUTION_INTEGRITY_CERTIFIED"
    );

    assert.equal(
      result.controlledExecutionIntegrityVerification,
      predecessor
    );

    assert.deepEqual(
      result.controlledExecutionIntegrityVerificationEvidence,
      predecessor.controlledExecutionIntegrityVerificationEvidence
    );

    assert.deepEqual(
      result.controlledExecutionIntegrityCertificationEvidence,
      [
        ...predecessor.controlledExecutionIntegrityVerificationEvidence,
        "DEV-289:CONTROLLED_EXECUTION_INTEGRITY_CERTIFIED"
      ]
    );

    assert.deepEqual(result.blockedReasons, []);
  }
);


test(
  "DEV-289 denied result is deterministic inert data",
  () => {
    const predecessor = validPredecessor();
    predecessor.trusted = false;

    const first = run(predecessor);
    const second = run(predecessor);

    assert.deepEqual(first, second);

    assert.equal(first.trusted, false);
    assert.equal(first.ready, false);
    assert.equal(first.executionIntegrityCertified, false);

    assert.equal(
      first.executionIntegrityCertificationState,
      "CONTROLLED_EXECUTION_INTEGRITY_NOT_CERTIFIED"
    );

    assert.equal(
      first.controlledExecutionIntegrityVerification,
      null
    );

    assert.deepEqual(
      first.blockedReasons,
      ["UNTRUSTED_DEV_288_PREDECESSOR"]
    );
  }
);


test(
  "DEV-289 rejects wrong predecessor version",
  () => {
    const predecessor = validPredecessor();

    (predecessor as { version: string }).version = "DEV-287";

    assert.deepEqual(
      run(predecessor).blockedReasons,
      ["INVALID_DEV_288_VERSION"]
    );
  }
);


test(
  "DEV-289 rejects unverified predecessor",
  () => {
    const predecessor = validPredecessor();
    predecessor.executionIntegrityVerified = false;

    assert.deepEqual(
      run(predecessor).blockedReasons,
      ["DEV_288_EXECUTION_INTEGRITY_NOT_VERIFIED"]
    );
  }
);


test(
  "DEV-289 rejects blocked predecessor",
  () => {
    const predecessor = validPredecessor();

    predecessor.blockedReasons = ["PREDECESSOR_BLOCKED"];

    assert.deepEqual(
      run(predecessor).blockedReasons,
      ["BLOCKED_DEV_288_PREDECESSOR"]
    );
  }
);


test(
  "DEV-289 rejects empty integrity verification evidence",
  () => {
    const predecessor = validPredecessor();

    predecessor.controlledExecutionIntegrityVerificationEvidence = [];

    assert.deepEqual(
      run(predecessor).blockedReasons,
      [
        "MISSING_DEV_288_EXECUTION_INTEGRITY_VERIFICATION_EVIDENCE"
      ]
    );
  }
);


test(
  "DEV-289 rejects missing certification boundary",
  () => {
    const predecessor = validPredecessor();

    (
      predecessor as unknown as
      Record<string, unknown>
    ).futureControlledExecutionIntegrityCertificationBoundaryRequired =
      false;

    assert.deepEqual(
      run(predecessor).blockedReasons,
      [
        "MISSING_DEV_288_FUTURE_INTEGRITY_CERTIFICATION_BOUNDARY"
      ]
    );
  }
);


const authorityFields = [
  "mayCreateExecutionAuthorization",
  "mayAuthorizeDownstreamAction",
  "mayAdmitIntoActiveExecutor",
  "mayActivateAdmission",
  "mayDispatch",
  "mayInvokeExecutor",
  "mayExecuteOperation",
  "mayInvokeInspectionDependency",
  "mayRetryExecution",
  "mayPersistLifecycleState",
  "mayModifyRepository",
  "mayDeleteRepositoryContent",
  "mayStageRepositoryChanges",
  "mayCommit",
  "mayPush",
  "mayDeploy",
  "mayAccessSecrets",
  "mayExpandScope",
  "mayPerformArbitraryShellExecution",
  "mayPerformNetworkExecution",
  "mayPerformExternalSideEffects"
] as const;


for (const property of authorityFields) {
  test(`DEV-289 rejects authority ${property}`, () => {
    const predecessor = validPredecessor();

    (
      predecessor as unknown as
      Record<string, unknown>
    )[property] = true;

    const result = run(predecessor);

    assert.equal(result.executionIntegrityCertified, false);
    assert.equal(result.trusted, false);
    assert.equal(result.ready, false);

    assert.deepEqual(
      result.blockedReasons,
      [`DEV_288_AUTHORITY_PRESENT:${property}`]
    );
  });
}


test(
  "DEV-289 grants no execution authority",
  () => {
    const result = run(validPredecessor());

    const authorityValues = authorityFields.map(
      (property) =>
        (result as unknown as Record<string, unknown>)[property]
    );

    assert.equal(
      authorityValues.every((value) => value === false),
      true
    );
  }
);


test(
  "DEV-289 preserves predecessor evidence without mutation",
  () => {
    const predecessor = validPredecessor();

    const originalScope = [
      ...predecessor.approvedExecutionScope
    ];

    const originalVerificationEvidence = [
      ...predecessor.controlledExecutionIntegrityVerificationEvidence
    ];

    const result = run(predecessor);

    assert.deepEqual(
      predecessor.approvedExecutionScope,
      originalScope
    );

    assert.deepEqual(
      predecessor.controlledExecutionIntegrityVerificationEvidence,
      originalVerificationEvidence
    );

    assert.notEqual(
      result.approvedExecutionScope,
      predecessor.approvedExecutionScope
    );

    assert.notEqual(
      result.controlledExecutionIntegrityVerificationEvidence,
      predecessor.controlledExecutionIntegrityVerificationEvidence
    );
  }
);
