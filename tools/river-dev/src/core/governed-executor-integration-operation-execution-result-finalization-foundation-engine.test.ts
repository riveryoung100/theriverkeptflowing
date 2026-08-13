import assert from "node:assert/strict";
import test from "node:test";

import {
  establishGovernedExecutorIntegrationOperationExecutionResultFinalizationFoundation
} from "./governed-executor-integration-operation-execution-result-finalization-foundation-engine";

import type {
  RiverDevGovernedExecutorIntegrationOperationExecutionResultCompletionFoundationResult
} from "../types";

function createTrustedDev311Completion(
  overrides:
    Partial<RiverDevGovernedExecutorIntegrationOperationExecutionResultCompletionFoundationResult> = {}
): RiverDevGovernedExecutorIntegrationOperationExecutionResultCompletionFoundationResult {

  const resultLifecycle =
    {} as NonNullable<
      RiverDevGovernedExecutorIntegrationOperationExecutionResultCompletionFoundationResult[
        "resultLifecycle"
      ]
    >;

  const base:
    RiverDevGovernedExecutorIntegrationOperationExecutionResultCompletionFoundationResult = {

      version:
        "DEV-311",

      source:
        "governed-executor-integration-operation-execution-result-completion-foundation-engine",

      objective:
        "test",

      trusted:
        true,

      ready:
        true,

      completionEstablished:
        true,

      defaultPolicy:
        "DENY",

      completionOnly:
        true,

      completionIsInertData:
        true,

      resultMutationProhibited:
        true,

      lifecycleMutationProhibited:
        true,

      operationReexecutionProhibited:
        true,

      futureMutationCapableExecutionBoundaryRequired:
        true,

      completionState:
        "GOVERNED_OPERATION_EXECUTION_RESULT_COMPLETION_ESTABLISHED",

      lifecycleState:
        "GOVERNED_OPERATION_EXECUTION_RESULT_LIFECYCLE_ESTABLISHED",

      resultState:
        "GOVERNED_OPERATION_EXECUTION_RESULT_ESTABLISHED",

      receiptState:
        "EXECUTION_RESULT_RECORDED",

      resultLifecycle,

      completionEvidence: [
        "trusted DEV-311 completion"
      ],

      provenance: [
        "DEV-310",
        "DEV-311"
      ],

      blockedReasons:
        [],

      mayCreateExecutionAuthorization:
        false,

      mayAuthorizeDownstreamAction:
        false,

      mayAdmitIntoActiveExecutor:
        false,

      mayActivateAdmission:
        false,

      mayDispatch:
        false,

      mayInvokeExecutor:
        false,

      mayExecuteOperation:
        false,

      mayInvokeInspectionDependency:
        false,

      mayRetryExecution:
        false,

      mayPersistLifecycleState:
        false,

      mayModifyRepository:
        false,

      mayDeleteRepositoryContent:
        false,

      mayStageRepositoryChanges:
        false,

      mayCommit:
        false,

      mayPush:
        false,

      mayDeploy:
        false,

      mayAccessSecrets:
        false,

      mayExpandScope:
        false,

      mayPerformArbitraryShellExecution:
        false,

      mayPerformNetworkExecution:
        false,

      mayPerformExternalSideEffects:
        false
    };

  return {
    ...base,
    ...overrides
  };
}


test(
  "establishes governed result finalization from exact trusted DEV-311 completion",
  () => {

    const result =
      establishGovernedExecutorIntegrationOperationExecutionResultFinalizationFoundation({
        resultCompletion:
          createTrustedDev311Completion()
      });

    assert.equal(
      result.version,
      "DEV-312"
    );

    assert.equal(
      result.trusted,
      true
    );

    assert.equal(
      result.ready,
      true
    );

    assert.equal(
      result.finalizationEstablished,
      true
    );

    assert.equal(
      result.finalizationState,
      "GOVERNED_OPERATION_EXECUTION_RESULT_FINALIZATION_ESTABLISHED"
    );

    assert.deepEqual(
      result.blockedReasons,
      []
    );
  }
);


test(
  "denies finalization when DEV-311 completion was not established",
  () => {

    const result =
      establishGovernedExecutorIntegrationOperationExecutionResultFinalizationFoundation({
        resultCompletion:
          createTrustedDev311Completion({
            completionEstablished:
              false,

            ready:
              false,

            completionState:
              "GOVERNED_OPERATION_EXECUTION_RESULT_COMPLETION_NOT_ESTABLISHED"
          })
      });

    assert.equal(
      result.trusted,
      false
    );

    assert.equal(
      result.finalizationEstablished,
      false
    );

    assert.equal(
      result.resultCompletion,
      null
    );
  }
);


test(
  "denies finalization when DEV-311 lifecycle lineage is absent",
  () => {

    const result =
      establishGovernedExecutorIntegrationOperationExecutionResultFinalizationFoundation({
        resultCompletion:
          createTrustedDev311Completion({
            resultLifecycle:
              null
          })
      });

    assert.equal(
      result.finalizationEstablished,
      false
    );

    assert.ok(
      result.blockedReasons.includes(
        "DEV-311 result lifecycle lineage is absent."
      )
    );
  }
);


test(
  "denies finalization when DEV-311 exposes persistence authority",
  () => {

    const completion = {
      ...createTrustedDev311Completion(),

      mayPersistLifecycleState:
        true
    } as unknown as
      RiverDevGovernedExecutorIntegrationOperationExecutionResultCompletionFoundationResult;

    const result =
      establishGovernedExecutorIntegrationOperationExecutionResultFinalizationFoundation({
        resultCompletion:
          completion
      });

    assert.equal(
      result.finalizationEstablished,
      false
    );
  }
);


test(
  "preserves immutable inert no-side-effect finalization semantics",
  () => {

    const result =
      establishGovernedExecutorIntegrationOperationExecutionResultFinalizationFoundation({
        resultCompletion:
          createTrustedDev311Completion()
      });

    assert.equal(result.finalizationOnly, true);
    assert.equal(result.finalizationIsInertData, true);
    assert.equal(result.resultMutationProhibited, true);
    assert.equal(result.lifecycleMutationProhibited, true);
    assert.equal(result.completionMutationProhibited, true);
    assert.equal(result.operationReexecutionProhibited, true);

    assert.equal(
      result.mayPersistLifecycleState,
      false
    );

    assert.equal(
      result.mayInvokeExecutor,
      false
    );

    assert.equal(
      result.mayExecuteOperation,
      false
    );

    assert.equal(
      result.mayModifyRepository,
      false
    );

    assert.equal(
      result.mayCommit,
      false
    );

    assert.equal(
      result.mayPush,
      false
    );

    assert.equal(
      result.mayDeploy,
      false
    );

    assert.equal(
      result.mayPerformExternalSideEffects,
      false
    );
  }
);
