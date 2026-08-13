import assert from "node:assert/strict";
import test from "node:test";

import type {
  RiverDevControlledExecutorOperationPreparationFoundation
} from "../types";

import {
  buildControlledExecutorOperationExecutionAuthorizationFoundation
} from "./controlled-executor-operation-execution-authorization-foundation-engine";

import {
  acquireGovernedOperationExecutionAuthorization
} from "./governed-operation-execution-authorization-acquisition-integration";


function buildTrustedPreparation(
  overrides: Partial<RiverDevControlledExecutorOperationPreparationFoundation> = {}
): RiverDevControlledExecutorOperationPreparationFoundation {

  return {
    version:
      "DEV-250",

    source:
      "DEV-250 deterministic DEV-317 test fixture",

    objective:
      "Provide trusted prepared operation evidence.",

    trusted:
      true,

    ready:
      true,

    prepared:
      true,

    defaultPolicy:
      "DENY",

    preparationOnly:
      true,

    operationAdmission:
      {} as RiverDevControlledExecutorOperationPreparationFoundation["operationAdmission"],

    executionRequest:
      "inspect approved repository state",

    preparedOperation:
      "inspect-approved-repository-state",

    requiredCapability:
      "inspect-approved-repository-state",

    authorizedCapabilities: [
      "inspect-approved-repository-state"
    ],

    approvedExecutionScope: [
      "approved execution scope"
    ],

    preparationState: [
      "operation prepared"
    ],

    provenance: [
      "human authorization evidence",
      "repository authorization evidence",
      "explicit approval evidence"
    ],

    authorizationBoundaries: [
      "explicit approval required"
    ],

    scopeBoundaries: [
      "approved execution scope"
    ],

    blockedReasons:
      [],

    preparationMayCreateAuthorization:
      false,

    preparationMayExpandScope:
      false,

    preparationMayExecuteOperation:
      false,

    preparationMayModifyRepository:
      false,

    ...overrides
  };
}


function buildExecutionAuthorization(
  overrides: Partial<RiverDevControlledExecutorOperationPreparationFoundation> = {}
) {

  return buildControlledExecutorOperationExecutionAuthorizationFoundation({
    operationPreparation:
      buildTrustedPreparation(overrides)
  });
}


test(
  "acquires operation execution authorization through the governed integration chain",
  () => {

    const executionAuthorization =
      buildExecutionAuthorization();

    const result =
      acquireGovernedOperationExecutionAuthorization({
        executionAuthorization,
        requestedMode:
          "apply"
      });

    assert.equal(
      executionAuthorization.authorized,
      true
    );

    assert.equal(
      executionAuthorization.requiredCapabilityAuthorized,
      true
    );

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
  }
);


test(
  "preserves dry-run through the governed authorization acquisition chain",
  () => {

    const executionAuthorization =
      buildExecutionAuthorization();

    const result =
      acquireGovernedOperationExecutionAuthorization({
        executionAuthorization,
        requestedMode:
          "dry-run"
      });

    assert.equal(
      executionAuthorization.authorized,
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
      result.mayExecuteOperation,
      false
    );
  }
);


test(
  "fails closed when apply authorization is absent",
  () => {

    const executionAuthorization =
      buildExecutionAuthorization({
        authorizedCapabilities: [
          "validate-approved-repository-change"
        ]
      });

    assert.equal(
      executionAuthorization.authorized,
      false
    );

    assert.equal(
      executionAuthorization.requiredCapabilityAuthorized,
      false
    );

    const result =
      acquireGovernedOperationExecutionAuthorization({
        executionAuthorization,
        requestedMode:
          "apply"
      });

    assert.equal(
      executionAuthorization.authorized,
      false
    );

    assert.equal(
      executionAuthorization.requiredCapabilityAuthorized,
      false
    );

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

    assert.ok(
      result.blockedReasons.length >
        0
    );
  }
);


test(
  "acquisition cannot manufacture authorization or execution authority",
  () => {

    const executionAuthorization =
      buildExecutionAuthorization();

    const result =
      acquireGovernedOperationExecutionAuthorization({
        executionAuthorization,
        requestedMode:
          "apply"
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
      result.mayAdmitIntoActiveExecutor,
      false
    );

    assert.equal(
      result.mayActivateAdmission,
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
