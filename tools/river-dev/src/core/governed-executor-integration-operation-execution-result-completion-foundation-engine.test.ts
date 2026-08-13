import assert from "node:assert/strict";
import test from "node:test";

import {
  establishGovernedExecutorIntegrationOperationExecutionResultCompletionFoundation
} from "./governed-executor-integration-operation-execution-result-completion-foundation-engine";

import type {
  RiverDevGovernedExecutorIntegrationOperationExecutionResultLifecycleFoundationResult
} from "../types";

function createTrustedDev310Lifecycle(
  overrides:
    Partial<RiverDevGovernedExecutorIntegrationOperationExecutionResultLifecycleFoundationResult> = {}
): RiverDevGovernedExecutorIntegrationOperationExecutionResultLifecycleFoundationResult {

  const operationExecutionResult =
    {} as NonNullable<
      RiverDevGovernedExecutorIntegrationOperationExecutionResultLifecycleFoundationResult[
        "operationExecutionResult"
      ]
    >;

  const base:
    RiverDevGovernedExecutorIntegrationOperationExecutionResultLifecycleFoundationResult = {

      version:
        "DEV-310",

      source:
        "governed-executor-integration-operation-execution-result-lifecycle-foundation-engine",

      objective:
        "test",

      trusted:
        true,

      ready:
        true,

      lifecycleEstablished:
        true,

      defaultPolicy:
        "DENY",

      lifecycleOnly:
        true,

      lifecycleIsInertData:
        true,

      resultMutationProhibited:
        true,

      operationReexecutionProhibited:
        true,

      futureMutationCapableExecutionBoundaryRequired:
        true,

      lifecycleState:
        "GOVERNED_OPERATION_EXECUTION_RESULT_LIFECYCLE_ESTABLISHED",

      resultState:
        "GOVERNED_OPERATION_EXECUTION_RESULT_ESTABLISHED",

      receiptState:
        "EXECUTION_RESULT_RECORDED",

      operationExecutionResult,

      lifecycleEvidence: [
        "trusted DEV-310 lifecycle"
      ],

      provenance: [
        "DEV-309",
        "DEV-310"
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
  "establishes governed result completion from exact trusted DEV-310 lifecycle",
  () => {

    const result =
      establishGovernedExecutorIntegrationOperationExecutionResultCompletionFoundation({
        resultLifecycle:
          createTrustedDev310Lifecycle()
      });

    assert.equal(
      result.version,
      "DEV-311"
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
      result.completionEstablished,
      true
    );

    assert.equal(
      result.completionState,
      "GOVERNED_OPERATION_EXECUTION_RESULT_COMPLETION_ESTABLISHED"
    );

    assert.deepEqual(
      result.blockedReasons,
      []
    );
  }
);


test(
  "denies completion when DEV-310 lifecycle was not established",
  () => {

    const result =
      establishGovernedExecutorIntegrationOperationExecutionResultCompletionFoundation({
        resultLifecycle:
          createTrustedDev310Lifecycle({
            lifecycleEstablished:
              false,

            ready:
              false,

            lifecycleState:
              "GOVERNED_OPERATION_EXECUTION_RESULT_LIFECYCLE_NOT_ESTABLISHED"
          })
      });

    assert.equal(
      result.trusted,
      false
    );

    assert.equal(
      result.ready,
      false
    );

    assert.equal(
      result.completionEstablished,
      false
    );

    assert.equal(
      result.resultLifecycle,
      null
    );
  }
);


test(
  "denies completion when DEV-310 result lineage is absent",
  () => {

    const result =
      establishGovernedExecutorIntegrationOperationExecutionResultCompletionFoundation({
        resultLifecycle:
          createTrustedDev310Lifecycle({
            operationExecutionResult:
              null
          })
      });

    assert.equal(
      result.completionEstablished,
      false
    );

    assert.ok(
      result.blockedReasons.includes(
        "DEV-310 operation execution result lineage is absent."
      )
    );
  }
);


test(
  "denies completion when DEV-310 exposes persistence authority",
  () => {

    const lifecycle = {
      ...createTrustedDev310Lifecycle(),
      mayPersistLifecycleState:
        true
    } as unknown as
      RiverDevGovernedExecutorIntegrationOperationExecutionResultLifecycleFoundationResult;

    const result =
      establishGovernedExecutorIntegrationOperationExecutionResultCompletionFoundation({
        resultLifecycle:
          lifecycle
      });

    assert.equal(
      result.completionEstablished,
      false
    );
  }
);


test(
  "preserves immutable inert no-side-effect completion semantics",
  () => {

    const result =
      establishGovernedExecutorIntegrationOperationExecutionResultCompletionFoundation({
        resultLifecycle:
          createTrustedDev310Lifecycle()
      });

    assert.equal(result.completionOnly, true);
    assert.equal(result.completionIsInertData, true);
    assert.equal(result.resultMutationProhibited, true);
    assert.equal(result.lifecycleMutationProhibited, true);
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
