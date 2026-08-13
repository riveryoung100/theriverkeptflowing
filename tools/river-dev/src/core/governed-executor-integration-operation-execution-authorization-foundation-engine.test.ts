import assert from "node:assert/strict";
import test from "node:test";

import type {
  RiverDevGovernedExecutorIntegrationExecutorInvocationFoundationResult
} from "../types";

import {
  createGovernedExecutorIntegrationOperationExecutionAuthorizationFoundation
} from "./governed-executor-integration-operation-execution-authorization-foundation-engine";


function createTrustedInvocation():
RiverDevGovernedExecutorIntegrationExecutorInvocationFoundationResult {

  return {
    version:
      "DEV-306",

    source:
      "governed-executor-integration-executor-invocation-foundation-engine",

    objective:
      "Authorize controlled operation execution.",

    trusted:
      true,

    ready:
      true,

    invoked:
      true,

    defaultPolicy:
      "DENY",

    executorInvocationOnly:
      true,

    invocationResultIsInertData:
      true,

    futureOperationExecutionBoundaryRequired:
      true,

    invocationState:
      "GOVERNED_EXECUTOR_INVOKED",

    authorization: {
      version:
        "DEV-305",

      source:
        "governed-executor-integration-executor-invocation-authorization-foundation-engine",

      objective:
        "Authorize controlled operation execution.",

      trusted:
        true,

      ready:
        true,

      authorized:
        true,

      defaultPolicy:
        "DENY",

      executorInvocationAuthorizationDecisionOnly:
        true,

      authorizationResultIsInertData:
        true,

      futureExecutorInvocationBoundaryRequired:
        true,

      authorizationState:
        "EXECUTOR_INVOCATION_AUTHORIZED",

      enforcement:
        null,

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
        [
          "executor invocation authorization accepted"
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
    },

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
      [
        "executor invocation authorization accepted"
      ],

    executorInvocationEvidence:
      [
        "governed executor invocation accepted"
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

}


test(
  "authorizes operation execution from exact trusted DEV-306 invocation",
  () => {

    const predecessor =
      createTrustedInvocation();

    const result =
      createGovernedExecutorIntegrationOperationExecutionAuthorizationFoundation({
        executorInvocation:
          predecessor
      });

    assert.equal(
      result.version,
      "DEV-307"
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
      result.authorized,
      true
    );

    assert.equal(
      result.authorizationState,
      "OPERATION_EXECUTION_AUTHORIZED"
    );

    assert.equal(
      result.invocation,
      predecessor
    );

    assert.equal(
      result.defaultPolicy,
      "DENY"
    );

    assert.equal(
      result.operationExecutionAuthorizationDecisionOnly,
      true
    );

    assert.equal(
      result.authorizationResultIsInertData,
      true
    );

    assert.equal(
      result.futureOperationExecutionBoundaryRequired,
      true
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
      result.mayPerformExternalSideEffects,
      false
    );

    assert.equal(
      result.operationExecutionAuthorizationEvidence.length >
        0,
      true
    );

  }
);


test(
  "denies operation execution authorization when DEV-306 was not invoked",
  () => {

    const predecessor = {
      ...createTrustedInvocation(),

      invoked:
        false,

      invocationState:
        "GOVERNED_EXECUTOR_NOT_INVOKED" as const
    };

    const result =
      createGovernedExecutorIntegrationOperationExecutionAuthorizationFoundation({
        executorInvocation:
          predecessor
      });

    assert.equal(
      result.authorized,
      false
    );

    assert.equal(
      result.authorizationState,
      "OPERATION_EXECUTION_UNAUTHORIZED"
    );

    assert.equal(
      result.invocation,
      null
    );

    assert.equal(
      result.blockedReasons.length >
        0,
      true
    );

  }
);


test(
  "denies operation execution authorization when DEV-305 authorization is not authorized",
  () => {

    const original =
      createTrustedInvocation();

    if (
      original.authorization ===
      null
    ) {
      throw new TypeError(
        "Expected DEV-305 authorization."
      );
    }

    const predecessor = {
      ...original,

      authorization: {
        ...original.authorization,

        authorized:
          false,

        authorizationState:
          "EXECUTOR_INVOCATION_UNAUTHORIZED" as const
      }
    };

    const result =
      createGovernedExecutorIntegrationOperationExecutionAuthorizationFoundation({
        executorInvocation:
          predecessor
      });

    assert.equal(
      result.authorized,
      false
    );

    assert.equal(
      result.invocation,
      null
    );

  }
);


test(
  "preserves the inert no-side-effect boundary even when authorization succeeds",
  () => {

    const result =
      createGovernedExecutorIntegrationOperationExecutionAuthorizationFoundation({
        executorInvocation:
          createTrustedInvocation()
      });

    assert.equal(
      result.authorized,
      true
    );

    assert.equal(
      result.mayCreateExecutionAuthorization,
      false
    );

    assert.equal(
      result.mayAuthorizeDownstreamAction,
      false
    );

    assert.equal(
      result.mayDispatch,
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
      result.mayAccessSecrets,
      false
    );

    assert.equal(
      result.mayExpandScope,
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
