import assert from "node:assert/strict";
import test from "node:test";

import {
  establishGovernedExecutorIntegrationOperationExecutionClosureFoundation
} from "./governed-executor-integration-operation-execution-closure-foundation-engine";

import type {
  RiverDevGovernedExecutorIntegrationOperationExecutionResultFinalizationFoundationResult
} from "../types";

function createTrustedDev312Finalization(
  overrides:
    Partial<RiverDevGovernedExecutorIntegrationOperationExecutionResultFinalizationFoundationResult> = {}
): RiverDevGovernedExecutorIntegrationOperationExecutionResultFinalizationFoundationResult {

  const resultCompletion =
    {} as NonNullable<
      RiverDevGovernedExecutorIntegrationOperationExecutionResultFinalizationFoundationResult[
        "resultCompletion"
      ]
    >;

  const base:
    RiverDevGovernedExecutorIntegrationOperationExecutionResultFinalizationFoundationResult = {

      version:
        "DEV-312",

      source:
        "governed-executor-integration-operation-execution-result-finalization-foundation-engine",

      objective:
        "test",

      trusted:
        true,

      ready:
        true,

      finalizationEstablished:
        true,

      defaultPolicy:
        "DENY",

      finalizationOnly:
        true,

      finalizationIsInertData:
        true,

      resultMutationProhibited:
        true,

      lifecycleMutationProhibited:
        true,

      completionMutationProhibited:
        true,

      operationReexecutionProhibited:
        true,

      futureMutationCapableExecutionBoundaryRequired:
        true,

      finalizationState:
        "GOVERNED_OPERATION_EXECUTION_RESULT_FINALIZATION_ESTABLISHED",

      completionState:
        "GOVERNED_OPERATION_EXECUTION_RESULT_COMPLETION_ESTABLISHED",

      lifecycleState:
        "GOVERNED_OPERATION_EXECUTION_RESULT_LIFECYCLE_ESTABLISHED",

      resultState:
        "GOVERNED_OPERATION_EXECUTION_RESULT_ESTABLISHED",

      receiptState:
        "EXECUTION_RESULT_RECORDED",

      resultCompletion,

      finalizationEvidence: [
        "trusted DEV-312 finalization"
      ],

      provenance: [
        "DEV-311",
        "DEV-312"
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
  "closes governed execution chain from exact trusted DEV-312 finalization",
  () => {

    const result =
      establishGovernedExecutorIntegrationOperationExecutionClosureFoundation({
        resultFinalization:
          createTrustedDev312Finalization()
      });

    assert.equal(result.version, "DEV-313");
    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.closureEstablished, true);

    assert.equal(
      result.closureState,
      "GOVERNED_OPERATION_EXECUTION_CLOSURE_ESTABLISHED"
    );

    assert.equal(
      result.operationalIntegrationRequiredNext,
      true
    );

    assert.deepEqual(
      result.blockedReasons,
      []
    );
  }
);

test(
  "denies closure when DEV-312 finalization is not established",
  () => {

    const result =
      establishGovernedExecutorIntegrationOperationExecutionClosureFoundation({
        resultFinalization:
          createTrustedDev312Finalization({
            finalizationEstablished:
              false,

            ready:
              false,

            finalizationState:
              "GOVERNED_OPERATION_EXECUTION_RESULT_FINALIZATION_NOT_ESTABLISHED"
          })
      });

    assert.equal(result.trusted, false);
    assert.equal(result.closureEstablished, false);
    assert.equal(result.resultFinalization, null);
  }
);

test(
  "denies closure when DEV-312 completion lineage is absent",
  () => {

    const result =
      establishGovernedExecutorIntegrationOperationExecutionClosureFoundation({
        resultFinalization:
          createTrustedDev312Finalization({
            resultCompletion:
              null
          })
      });

    assert.equal(result.closureEstablished, false);

    assert.ok(
      result.blockedReasons.includes(
        "DEV-312 completion lineage is absent."
      )
    );
  }
);

test(
  "denies closure when DEV-312 exposes execution authority",
  () => {

    const finalization = {
      ...createTrustedDev312Finalization(),

      mayExecuteOperation:
        true
    } as unknown as
      RiverDevGovernedExecutorIntegrationOperationExecutionResultFinalizationFoundationResult;

    const result =
      establishGovernedExecutorIntegrationOperationExecutionClosureFoundation({
        resultFinalization:
          finalization
      });

    assert.equal(result.closureEstablished, false);
  }
);

test(
  "preserves inert closure semantics and forces operational integration next",
  () => {

    const result =
      establishGovernedExecutorIntegrationOperationExecutionClosureFoundation({
        resultFinalization:
          createTrustedDev312Finalization()
      });

    assert.equal(result.closureOnly, true);
    assert.equal(result.closureIsInertData, true);

    assert.equal(result.resultMutationProhibited, true);
    assert.equal(result.lifecycleMutationProhibited, true);
    assert.equal(result.completionMutationProhibited, true);
    assert.equal(result.finalizationMutationProhibited, true);
    assert.equal(result.operationReexecutionProhibited, true);

    assert.equal(
      result.operationalIntegrationRequiredNext,
      true
    );

    assert.equal(result.mayPersistLifecycleState, false);
    assert.equal(result.mayInvokeExecutor, false);
    assert.equal(result.mayExecuteOperation, false);
    assert.equal(result.mayModifyRepository, false);
    assert.equal(result.mayCommit, false);
    assert.equal(result.mayPush, false);
    assert.equal(result.mayDeploy, false);
    assert.equal(result.mayPerformExternalSideEffects, false);
  }
);
