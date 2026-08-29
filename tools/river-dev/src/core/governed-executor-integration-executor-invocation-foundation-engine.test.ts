import assert from "node:assert/strict";
import test from "node:test";

import type {
  RiverDevGovernedExecutorIntegrationExecutorInvocationAuthorizationFoundationResult
} from "../types";

import {
  invokeGovernedExecutor
} from "./governed-executor-integration-executor-invocation-foundation-engine";

function createAuthorizedPredecessor():
  RiverDevGovernedExecutorIntegrationExecutorInvocationAuthorizationFoundationResult {
  return {
    version: "DEV-305",
    source:
      "governed-executor-integration-executor-invocation-authorization-foundation-engine",
    objective: "test",

    trusted: true,
    ready: true,
    authorized: true,

    defaultPolicy: "DENY",

    executorInvocationAuthorizationDecisionOnly: true,
    authorizationResultIsInertData: true,
    futureExecutorInvocationBoundaryRequired: true,

    authorizationState: "EXECUTOR_INVOCATION_AUTHORIZED",

    enforcement: {} as RiverDevGovernedExecutorIntegrationExecutorInvocationAuthorizationFoundationResult["enforcement"],

    predecessorVerificationState: ["verified"],
    predecessorVerificationEvidence: ["verification"],
    predecessorAcceptanceEvidence: ["acceptance"],
    predecessorHandoffEvidence: ["handoff"],
    verificationEvidence: ["verification"],
    acceptanceEvidence: ["acceptance"],
    packagingEvidence: ["packaging"],
    packageVerificationEvidence: ["package-verification"],
    admissionEvidence: ["admission"],
    consumptionEvidence: ["consumption"],
    activeAdmissionEligibilityEvidence: ["eligibility"],
    activeAdmissionAuthorizationEvidence: ["active-authorization"],
    activeAdmissionVerificationEvidence: ["active-verification"],
    activeAdmissionEnforcementEvidence: ["enforcement"],
    executorInvocationAuthorizationEvidence: [
      "executor-invocation-authorized"
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
}

test(
  "DEV-306 represents an exactly authorized governed executor invocation as inert data",
  () => {
    const predecessor =
      createAuthorizedPredecessor();

    const result =
      invokeGovernedExecutor(predecessor);

    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.invoked, true);

    assert.equal(
      result.invocationState,
      "GOVERNED_EXECUTOR_INVOKED"
    );

    assert.equal(
      result.authorization,
      predecessor
    );

    assert.equal(
      result.executorInvocationOnly,
      true
    );

    assert.equal(
      result.invocationResultIsInertData,
      true
    );

    assert.equal(
      result.futureOperationExecutionBoundaryRequired,
      true
    );

    assert.equal(
      result.executorInvocationEvidence.length > 0,
      true
    );

    assert.equal(result.blockedReasons.length, 0);

    assert.equal(result.mayInvokeExecutor, false);
    assert.equal(result.mayExecuteOperation, false);
    assert.equal(result.mayModifyRepository, false);
    assert.equal(result.mayPush, false);
    assert.equal(result.mayDeploy, false);
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

test(
  "DEV-306 defaults to deny when DEV-305 authorization is not authorized",
  () => {
    const predecessor = {
      ...createAuthorizedPredecessor(),
      authorized: false,
      authorizationState:
        "EXECUTOR_INVOCATION_UNAUTHORIZED"
    } as RiverDevGovernedExecutorIntegrationExecutorInvocationAuthorizationFoundationResult;

    const result =
      invokeGovernedExecutor(predecessor);

    assert.equal(result.trusted, false);
    assert.equal(result.ready, false);
    assert.equal(result.invoked, false);

    assert.equal(
      result.invocationState,
      "GOVERNED_EXECUTOR_NOT_INVOKED"
    );

    assert.equal(result.authorization, null);

    assert.equal(
      result.blockedReasons.length > 0,
      true
    );

    assert.equal(result.mayInvokeExecutor, false);
    assert.equal(result.mayExecuteOperation, false);
  }
);

test(
  "DEV-306 rejects a predecessor exposing executor invocation authority",
  () => {
    const predecessor = {
      ...createAuthorizedPredecessor(),
      mayInvokeExecutor: true
    } as unknown as RiverDevGovernedExecutorIntegrationExecutorInvocationAuthorizationFoundationResult;

    const result =
      invokeGovernedExecutor(predecessor);

    assert.equal(result.invoked, false);
    assert.equal(result.trusted, false);
    assert.equal(result.ready, false);
    assert.equal(
      result.blockedReasons.length > 0,
      true
    );
  }
);

test(
  "DEV-306 rejects a predecessor exposing operation execution authority",
  () => {
    const predecessor = {
      ...createAuthorizedPredecessor(),
      mayExecuteOperation: true
    } as unknown as RiverDevGovernedExecutorIntegrationExecutorInvocationAuthorizationFoundationResult;

    const result =
      invokeGovernedExecutor(predecessor);

    assert.equal(result.invoked, false);
    assert.equal(result.mayExecuteOperation, false);
  }
);

test(
  "DEV-306 rejects missing executor invocation authorization evidence",
  () => {
    const predecessor = {
      ...createAuthorizedPredecessor(),
      executorInvocationAuthorizationEvidence: []
    };

    const result =
      invokeGovernedExecutor(predecessor);

    assert.equal(result.invoked, false);
    assert.equal(
      result.blockedReasons.length > 0,
      true
    );
  }
);

test(
  "DEV-306 rejects a missing future invocation boundary",
  () => {
    const predecessor = {
      ...createAuthorizedPredecessor(),
      futureExecutorInvocationBoundaryRequired: false
    } as unknown as RiverDevGovernedExecutorIntegrationExecutorInvocationAuthorizationFoundationResult;

    const result =
      invokeGovernedExecutor(predecessor);

    assert.equal(result.invoked, false);
    assert.equal(result.trusted, false);
  }
);
