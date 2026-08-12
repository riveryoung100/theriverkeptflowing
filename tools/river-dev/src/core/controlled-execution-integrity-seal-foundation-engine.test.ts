import assert from "node:assert/strict";
import test from "node:test";

import type {
  RiverDevControlledExecutionIntegrityCertificationFoundationResult
} from "../types";

import {
  buildControlledExecutionIntegritySealFoundation
} from "./controlled-execution-integrity-seal-foundation-engine";

const createCertifiedPredecessor =
  (): RiverDevControlledExecutionIntegrityCertificationFoundationResult => {
    return {
      version: "DEV-289",

      trusted: true,
      ready: true,
      executionIntegrityCertified: true,

      defaultPolicy: "DENY",

      controlledExecutionIntegrityCertificationBoundaryOnly: true,
      executionIntegrityCertificationResultIsDeterministicData: true,

      executionIntegrityCertificationState:
        "CONTROLLED_EXECUTION_INTEGRITY_CERTIFIED",

      controlledExecutionIntegrityVerification: null,
      controlledExecutionIntegrity: null,

      controlledExecutionSeal: null,
      controlledExecutionCertification: null,
      controlledExecutionVerification: null,
      controlledExecutionAttestation: null,
      controlledExecutionAudit: null,
      controlledExecutionArchive: null,
      controlledExecutionClosure: null,
      controlledExecutionFinalization: null,
      controlledExecutionCompletion: null,

      controlledOperationExecutionLifecycle: null,
      controlledOperationExecutionReceipt: null,
      controlledOperationExecution: null,
      operationExecutionAuthorization: null,
      controlledExecutorInvocation: null,
      controlledDispatch: null,
      dispatchAuthorization: null,
      activeAdmission: null,
      authorization: null,
      eligibility: null,
      consumption: null,
      receiptState: null,
      executedOperation: null,

      approvedExecutionScope: [],
      provenance: [
        "DEV-289:TEST_PROVENANCE"
      ],

      controlledDispatchEvidence: [],
      executorInvocationAuthorizationEvidence: [],
      controlledExecutorInvocationEvidence: [],
      operationExecutionAuthorizationEvidence: [],
      controlledOperationExecutionEvidence: [],
      controlledOperationExecutionReceiptEvidence: [],
      controlledOperationExecutionLifecycleEvidence: [],
      controlledExecutionCompletionEvidence: [],
      controlledExecutionFinalizationEvidence: [],
      controlledExecutionClosureEvidence: [],
      controlledExecutionArchiveEvidence: [],
      controlledExecutionAuditEvidence: [],
      controlledExecutionAttestationEvidence: [],
      controlledExecutionVerificationEvidence: [],
      controlledExecutionCertificationEvidence: [],
      controlledExecutionSealEvidence: [],
      controlledExecutionIntegrityEvidence: [],
      controlledExecutionIntegrityVerificationEvidence: [],
      controlledExecutionIntegrityCertificationEvidence: [
        "DEV-289:CONTROLLED_EXECUTION_INTEGRITY_CERTIFIED"
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
      mayPerformExternalSideEffects: false
    };
  };

test(
  "DEV-290 fails closed when DEV-289 predecessor is absent",
  () => {
    const result =
      buildControlledExecutionIntegritySealFoundation({
        controlledExecutionIntegrityCertification: null
      });

    assert.equal(result.version, "DEV-290");
    assert.equal(result.trusted, false);
    assert.equal(result.ready, false);
    assert.equal(result.executionIntegritySealed, false);

    assert.equal(
      result.executionIntegritySealState,
      "CONTROLLED_EXECUTION_INTEGRITY_NOT_SEALED"
    );

    assert.equal(result.defaultPolicy, "DENY");

    assert.equal(
      result.terminalControlledExecutionIntegrityBoundary,
      true
    );

    assert.equal(
      result.futureControlledExecutionIntegrityBoundaryRequired,
      false
    );

    assert.equal(result.mayExecuteOperation, false);
    assert.equal(result.mayModifyRepository, false);
    assert.equal(result.mayPush, false);
    assert.equal(result.mayDeploy, false);
    assert.equal(result.mayAccessSecrets, false);
    assert.equal(result.mayPerformNetworkExecution, false);
    assert.equal(result.mayPerformExternalSideEffects, false);

    assert.ok(result.blockedReasons.length > 0);
  }
);

test(
  "DEV-290 seals a valid exact DEV-289 certification predecessor",
  () => {
    const predecessor =
      createCertifiedPredecessor();

    const result =
      buildControlledExecutionIntegritySealFoundation({
        controlledExecutionIntegrityCertification: predecessor
      });

    assert.equal(result.version, "DEV-290");
    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.executionIntegritySealed, true);

    assert.equal(
      result.executionIntegritySealState,
      "CONTROLLED_EXECUTION_INTEGRITY_SEALED"
    );

    assert.equal(result.defaultPolicy, "DENY");

    assert.equal(
      result.controlledExecutionIntegritySealBoundaryOnly,
      true
    );

    assert.equal(
      result.executionIntegritySealResultIsDeterministicData,
      true
    );

    assert.equal(
      result.terminalControlledExecutionIntegrityBoundary,
      true
    );

    assert.equal(
      result.futureControlledExecutionIntegrityBoundaryRequired,
      false
    );

    assert.deepEqual(result.blockedReasons, []);

    assert.deepEqual(
      result.controlledExecutionIntegritySealEvidence,
      [
        "DEV-289:CONTROLLED_EXECUTION_INTEGRITY_CERTIFIED",
        "DEV-290:CONTROLLED_EXECUTION_INTEGRITY_SEALED"
      ]
    );

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
  }
);

test(
  "DEV-290 rejects a predecessor that is not certified",
  () => {
    const predecessor =
      createCertifiedPredecessor();

    (
      predecessor as unknown as Record<string, unknown>
    ).executionIntegrityCertified = false;

    const result =
      buildControlledExecutionIntegritySealFoundation({
        controlledExecutionIntegrityCertification: predecessor
      });

    assert.equal(result.trusted, false);
    assert.equal(result.ready, false);
    assert.equal(result.executionIntegritySealed, false);

    assert.equal(
      result.executionIntegritySealState,
      "CONTROLLED_EXECUTION_INTEGRITY_NOT_SEALED"
    );

    assert.ok(result.blockedReasons.length > 0);
    assert.equal(result.mayExecuteOperation, false);
  }
);

test(
  "DEV-290 rejects a predecessor with blocked reasons",
  () => {
    const predecessor =
      createCertifiedPredecessor();

    predecessor.blockedReasons.push(
      "TEST_BLOCKED_REASON"
    );

    const result =
      buildControlledExecutionIntegritySealFoundation({
        controlledExecutionIntegrityCertification: predecessor
      });

    assert.equal(result.executionIntegritySealed, false);
    assert.ok(result.blockedReasons.length > 0);
    assert.equal(result.mayExecuteOperation, false);
    assert.equal(result.mayPerformExternalSideEffects, false);
  }
);

test(
  "DEV-290 rejects predecessor execution authority",
  () => {
    const predecessor =
      createCertifiedPredecessor();

    (
      predecessor as unknown as Record<string, unknown>
    ).mayExecuteOperation = true;

    const result =
      buildControlledExecutionIntegritySealFoundation({
        controlledExecutionIntegrityCertification: predecessor
      });

    assert.equal(result.executionIntegritySealed, false);
    assert.ok(result.blockedReasons.length > 0);

    assert.equal(result.mayExecuteOperation, false);
    assert.equal(result.mayModifyRepository, false);
    assert.equal(result.mayPush, false);
    assert.equal(result.mayDeploy, false);
  }
);

test(
  "DEV-290 rejects predecessor repository mutation authority",
  () => {
    const predecessor =
      createCertifiedPredecessor();

    (
      predecessor as unknown as Record<string, unknown>
    ).mayModifyRepository = true;

    const result =
      buildControlledExecutionIntegritySealFoundation({
        controlledExecutionIntegrityCertification: predecessor
      });

    assert.equal(result.executionIntegritySealed, false);
    assert.ok(result.blockedReasons.length > 0);
    assert.equal(result.mayModifyRepository, false);
  }
);

test(
  "DEV-290 rejects predecessor push authority",
  () => {
    const predecessor =
      createCertifiedPredecessor();

    (
      predecessor as unknown as Record<string, unknown>
    ).mayPush = true;

    const result =
      buildControlledExecutionIntegritySealFoundation({
        controlledExecutionIntegrityCertification: predecessor
      });

    assert.equal(result.executionIntegritySealed, false);
    assert.ok(result.blockedReasons.length > 0);
    assert.equal(result.mayPush, false);
  }
);

test(
  "DEV-290 rejects predecessor network execution authority",
  () => {
    const predecessor =
      createCertifiedPredecessor();

    (
      predecessor as unknown as Record<string, unknown>
    ).mayPerformNetworkExecution = true;

    const result =
      buildControlledExecutionIntegritySealFoundation({
        controlledExecutionIntegrityCertification: predecessor
      });

    assert.equal(result.executionIntegritySealed, false);
    assert.ok(result.blockedReasons.length > 0);

    assert.equal(
      result.mayPerformNetworkExecution,
      false
    );
  }
);

test(
  "DEV-290 rejects predecessor external side-effect authority",
  () => {
    const predecessor =
      createCertifiedPredecessor();

    (
      predecessor as unknown as Record<string, unknown>
    ).mayPerformExternalSideEffects = true;

    const result =
      buildControlledExecutionIntegritySealFoundation({
        controlledExecutionIntegrityCertification: predecessor
      });

    assert.equal(result.executionIntegritySealed, false);
    assert.ok(result.blockedReasons.length > 0);

    assert.equal(
      result.mayPerformExternalSideEffects,
      false
    );
  }
);

test(
  "DEV-290 produces deterministic data without mutating predecessor evidence",
  () => {
    const predecessor =
      createCertifiedPredecessor();

    const before =
      JSON.stringify(predecessor);

    const first =
      buildControlledExecutionIntegritySealFoundation({
        controlledExecutionIntegrityCertification: predecessor
      });

    const second =
      buildControlledExecutionIntegritySealFoundation({
        controlledExecutionIntegrityCertification: predecessor
      });

    assert.deepEqual(first, second);
    assert.equal(JSON.stringify(predecessor), before);

    assert.notStrictEqual(
      first.controlledExecutionIntegrityCertificationEvidence,
      predecessor.controlledExecutionIntegrityCertificationEvidence
    );

    assert.notStrictEqual(
      first.provenance,
      predecessor.provenance
    );
  }
);

test(
  "DEV-290 terminal seal never grants downstream execution authority",
  () => {
    const result =
      buildControlledExecutionIntegritySealFoundation({
        controlledExecutionIntegrityCertification:
          createCertifiedPredecessor()
      });

    assert.equal(result.executionIntegritySealed, true);

    assert.equal(result.mayCreateExecutionAuthorization, false);
    assert.equal(result.mayAuthorizeDownstreamAction, false);
    assert.equal(result.mayAdmitIntoActiveExecutor, false);
    assert.equal(result.mayActivateAdmission, false);
    assert.equal(result.mayDispatch, false);
    assert.equal(result.mayInvokeExecutor, false);
    assert.equal(result.mayExecuteOperation, false);
    assert.equal(result.mayInvokeInspectionDependency, false);
    assert.equal(result.mayRetryExecution, false);
    assert.equal(result.mayPersistLifecycleState, false);

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
  }
);
