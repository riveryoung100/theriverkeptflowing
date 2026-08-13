import assert from "node:assert/strict";
import test from "node:test";

import {
  establishGovernedExecutorIntegrationOperationExecutionFoundation
} from "./governed-executor-integration-operation-execution-foundation-engine";

import type {
  RiverDevGovernedExecutorIntegrationOperationExecutionAuthorizationFoundationResult
} from "../types";

function createAuthorization(
  overrides: Partial<RiverDevGovernedExecutorIntegrationOperationExecutionAuthorizationFoundationResult> = {}
): RiverDevGovernedExecutorIntegrationOperationExecutionAuthorizationFoundationResult {
  const invocation = {} as RiverDevGovernedExecutorIntegrationOperationExecutionAuthorizationFoundationResult["invocation"];

  return {
    version: "DEV-307",
    source:
      "governed-executor-integration-operation-execution-authorization-foundation-engine",
    objective: "test",

    trusted: true,
    ready: true,
    authorized: true,

    defaultPolicy: "DENY",

    operationExecutionAuthorizationDecisionOnly: true,
    authorizationResultIsInertData: true,
    futureOperationExecutionBoundaryRequired: true,

    authorizationState:
      "OPERATION_EXECUTION_AUTHORIZED",

    invocation,

    predecessorVerificationState: [],
    predecessorVerificationEvidence: [],
    predecessorAcceptanceEvidence: [],
    predecessorHandoffEvidence: [],
    verificationEvidence: [],
    acceptanceEvidence: [],
    packagingEvidence: [],
    packageVerificationEvidence: [],
    admissionEvidence: [],
    consumptionEvidence: [],
    activeAdmissionEligibilityEvidence: [],
    activeAdmissionAuthorizationEvidence: [],
    activeAdmissionVerificationEvidence: [],
    activeAdmissionEnforcementEvidence: [],
    executorInvocationAuthorizationEvidence: [],
    executorInvocationEvidence: [],
    operationExecutionAuthorizationEvidence: [
      "DEV-307 authorization test evidence."
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

    ...overrides
  };
}

test(
  "establishes governed operation execution from exact trusted DEV-307 authorization",
  () => {
    const result =
      establishGovernedExecutorIntegrationOperationExecutionFoundation({
        operationExecutionAuthorization:
          createAuthorization()
      });

    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.executed, true);

    assert.equal(
      result.executionState,
      "GOVERNED_OPERATION_EXECUTION_ESTABLISHED"
    );

    assert.deepEqual(
      result.blockedReasons,
      []
    );
  }
);

test(
  "denies operation execution when DEV-307 did not authorize execution",
  () => {
    const result =
      establishGovernedExecutorIntegrationOperationExecutionFoundation({
        operationExecutionAuthorization:
          createAuthorization({
            authorized: false,
            authorizationState:
              "OPERATION_EXECUTION_UNAUTHORIZED"
          })
      });

    assert.equal(result.trusted, false);
    assert.equal(result.ready, false);
    assert.equal(result.executed, false);

    assert.equal(
      result.executionState,
      "GOVERNED_OPERATION_EXECUTION_NOT_ESTABLISHED"
    );

    assert.ok(result.blockedReasons.length > 0);
  }
);

test(
  "denies operation execution when trusted DEV-306 invocation is absent",
  () => {
    const result =
      establishGovernedExecutorIntegrationOperationExecutionFoundation({
        operationExecutionAuthorization:
          createAuthorization({
            invocation: null
          })
      });

    assert.equal(result.executed, false);

    assert.ok(
      result.blockedReasons.includes(
        "Trusted governed executor invocation is absent."
      )
    );
  }
);

test(
  "preserves the inert no-side-effect boundary when execution is established",
  () => {
    const result =
      establishGovernedExecutorIntegrationOperationExecutionFoundation({
        operationExecutionAuthorization:
          createAuthorization()
      });

    assert.equal(result.executed, true);

    assert.equal(
      result.executionResultIsInertData,
      true
    );

    assert.equal(
      result.futureMutationCapableExecutionBoundaryRequired,
      true
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
