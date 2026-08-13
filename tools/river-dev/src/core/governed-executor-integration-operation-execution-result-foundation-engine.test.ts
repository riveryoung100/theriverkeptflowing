import assert from "node:assert/strict";
import test from "node:test";

import {
  establishGovernedExecutorIntegrationOperationExecutionResultFoundation
} from "./governed-executor-integration-operation-execution-result-foundation-engine";

import type {
  RiverDevGovernedExecutorIntegrationOperationExecutionFoundationResult
} from "../types";

function createExecution(
  overrides:
    Partial<RiverDevGovernedExecutorIntegrationOperationExecutionFoundationResult> = {}
): RiverDevGovernedExecutorIntegrationOperationExecutionFoundationResult {

  return {
    version:
      "DEV-308",

    source:
      "governed-executor-integration-operation-execution-foundation-engine",

    objective:
      "test",

    trusted:
      true,

    ready:
      true,

    executed:
      true,

    defaultPolicy:
      "DENY",

    operationExecutionOnly:
      true,

    executionResultIsInertData:
      true,

    futureMutationCapableExecutionBoundaryRequired:
      true,

    executionState:
      "GOVERNED_OPERATION_EXECUTION_ESTABLISHED",

    authorization:
      {} as RiverDevGovernedExecutorIntegrationOperationExecutionFoundationResult["authorization"],

    predecessorVerificationState:
      [],

    predecessorVerificationEvidence:
      [],

    predecessorAcceptanceEvidence:
      [],

    predecessorHandoffEvidence:
      [],

    verificationEvidence:
      [],

    acceptanceEvidence:
      [],

    packagingEvidence:
      [],

    packageVerificationEvidence:
      [],

    admissionEvidence:
      [],

    consumptionEvidence:
      [],

    activeAdmissionEligibilityEvidence:
      [],

    activeAdmissionAuthorizationEvidence:
      [],

    activeAdmissionVerificationEvidence:
      [],

    activeAdmissionEnforcementEvidence:
      [],

    executorInvocationAuthorizationEvidence:
      [],

    executorInvocationEvidence:
      [],

    operationExecutionAuthorizationEvidence:
      ["authorization evidence"],

    operationExecutionEvidence:
      ["operation execution established"],

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
      false,

    ...overrides
  };
}


test(
  "records a governed operation execution result from exact trusted DEV-308 execution",
  () => {

    const execution =
      createExecution();

    const result =
      establishGovernedExecutorIntegrationOperationExecutionResultFoundation({
        operationExecution:
          execution
      });

    assert.equal(
      result.version,
      "DEV-309"
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
      result.resultEstablished,
      true
    );

    assert.equal(
      result.resultState,
      "GOVERNED_OPERATION_EXECUTION_RESULT_ESTABLISHED"
    );

    assert.equal(
      result.receiptState,
      "EXECUTION_RESULT_RECORDED"
    );

    assert.equal(
      result.operationExecution,
      execution
    );

    assert.equal(
      result.operationExecutionResultEvidence.length >
        0,
      true
    );

    assert.deepEqual(
      result.blockedReasons,
      []
    );

  }
);


test(
  "denies result establishment when DEV-308 execution was not established",
  () => {

    const result =
      establishGovernedExecutorIntegrationOperationExecutionResultFoundation({
        operationExecution:
          createExecution({
            executed:
              false,

            executionState:
              "GOVERNED_OPERATION_EXECUTION_NOT_ESTABLISHED"
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
      result.resultEstablished,
      false
    );

    assert.equal(
      result.resultState,
      "GOVERNED_OPERATION_EXECUTION_RESULT_NOT_ESTABLISHED"
    );

    assert.equal(
      result.receiptState,
      "EXECUTION_RESULT_NOT_RECORDED"
    );

    assert.equal(
      result.operationExecution,
      null
    );

    assert.equal(
      result.blockedReasons.length > 0,
      true
    );

  }
);


test(
  "denies result establishment when DEV-308 authorization lineage is absent",
  () => {

    const result =
      establishGovernedExecutorIntegrationOperationExecutionResultFoundation({
        operationExecution:
          createExecution({
            authorization:
              null
          })
      });

    assert.equal(
      result.resultEstablished,
      false
    );

    assert.ok(
      result.blockedReasons.includes(
        "DEV-308 operation execution authorization lineage is absent."
      )
    );

  }
);


test(
  "denies result establishment when DEV-308 exposes execution authority",
  () => {

    const execution = {
      ...createExecution(),
      mayExecuteOperation:
        true
    } as unknown as RiverDevGovernedExecutorIntegrationOperationExecutionFoundationResult;

    const result =
      establishGovernedExecutorIntegrationOperationExecutionResultFoundation({
        operationExecution:
          execution
      });

    assert.equal(
      result.resultEstablished,
      false
    );

    assert.equal(
      result.mayExecuteOperation,
      false
    );

  }
);


test(
  "preserves immutable inert no-side-effect result semantics",
  () => {

    const result =
      establishGovernedExecutorIntegrationOperationExecutionResultFoundation({
        operationExecution:
          createExecution()
      });

    assert.equal(
      result.resultEstablished,
      true
    );

    assert.equal(
      result.resultOnly,
      true
    );

    assert.equal(
      result.resultIsInertData,
      true
    );

    assert.equal(
      result.operationReexecutionProhibited,
      true
    );

    assert.equal(
      result.futureMutationCapableExecutionBoundaryRequired,
      true
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
      result.mayRetryExecution,
      false
    );

    assert.equal(
      result.mayPersistLifecycleState,
      false
    );

    assert.equal(
      result.mayModifyRepository,
      false
    );

    assert.equal(
      result.mayDeleteRepositoryContent,
      false
    );

    assert.equal(
      result.mayStageRepositoryChanges,
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
      result.mayPerformArbitraryShellExecution,
      false
    );

    assert.equal(
      result.mayPerformNetworkExecution,
      false
    );

    assert.equal(
      result.mayPerformExternalSideEffects,
      false
    );

  }
);
