import assert from "node:assert/strict";
import test from "node:test";

import {
  establishGovernedExecutorIntegrationOperationExecutionResultLifecycleFoundation
} from "./governed-executor-integration-operation-execution-result-lifecycle-foundation-engine";

import type {
  RiverDevGovernedExecutorIntegrationOperationExecutionResultFoundationResult
} from "../types";

function createTrustedDev309Result(
  overrides:
    Partial<RiverDevGovernedExecutorIntegrationOperationExecutionResultFoundationResult> = {}
): RiverDevGovernedExecutorIntegrationOperationExecutionResultFoundationResult {

  const operationExecution = {
    version: "DEV-308",
    source:
      "governed-executor-integration-operation-execution-foundation-engine",
    objective: "test",
    trusted: true,
    ready: true,
    executed: true,
    defaultPolicy: "DENY",
    operationExecutionOnly: true,
    executionResultIsInertData: true,
    futureMutationCapableExecutionBoundaryRequired: true,
    executionState:
      "GOVERNED_OPERATION_EXECUTION_ESTABLISHED",
    authorization: {} as never,
    predecessorVerificationState: "VERIFIED" as never,
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
    operationExecutionAuthorizationEvidence: [],
    operationExecutionEvidence: [
      "trusted DEV-308 execution"
    ],
    provenance: [],
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
  } as unknown as NonNullable<
    RiverDevGovernedExecutorIntegrationOperationExecutionResultFoundationResult["operationExecution"]
  >;

  const base:
    RiverDevGovernedExecutorIntegrationOperationExecutionResultFoundationResult = {
      version: "DEV-309",
      source:
        "governed-executor-integration-operation-execution-result-foundation-engine",
      objective: "test",

      trusted: true,
      ready: true,
      resultEstablished: true,

      defaultPolicy: "DENY",

      resultOnly: true,
      resultIsInertData: true,
      operationReexecutionProhibited: true,
      futureMutationCapableExecutionBoundaryRequired: true,

      resultState:
        "GOVERNED_OPERATION_EXECUTION_RESULT_ESTABLISHED",

      receiptState:
        "EXECUTION_RESULT_RECORDED",

      operationExecution,

      predecessorVerificationState:
        operationExecution.predecessorVerificationState,

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
      operationExecutionAuthorizationEvidence: [],
      operationExecutionEvidence: [
        "trusted DEV-308 execution"
      ],

      operationExecutionResultEvidence: [
        "trusted DEV-309 result"
      ],

      provenance: [
        "DEV-308",
        "DEV-309"
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

  return {
    ...base,
    ...overrides
  };
}

test(
  "establishes governed result lifecycle from exact trusted DEV-309 result",
  () => {

    const lifecycle =
      establishGovernedExecutorIntegrationOperationExecutionResultLifecycleFoundation({
        operationExecutionResult:
          createTrustedDev309Result()
      });

    assert.equal(lifecycle.trusted, true);
    assert.equal(lifecycle.ready, true);
    assert.equal(lifecycle.lifecycleEstablished, true);

    assert.equal(
      lifecycle.lifecycleState,
      "GOVERNED_OPERATION_EXECUTION_RESULT_LIFECYCLE_ESTABLISHED"
    );

    assert.deepEqual(
      lifecycle.blockedReasons,
      []
    );
  }
);

test(
  "denies lifecycle establishment when DEV-309 result was not established",
  () => {

    const lifecycle =
      establishGovernedExecutorIntegrationOperationExecutionResultLifecycleFoundation({
        operationExecutionResult:
          createTrustedDev309Result({
            resultEstablished: false,
            ready: false,
            resultState:
              "GOVERNED_OPERATION_EXECUTION_RESULT_NOT_ESTABLISHED"
          })
      });

    assert.equal(lifecycle.trusted, false);
    assert.equal(lifecycle.lifecycleEstablished, false);

    assert.equal(
      lifecycle.operationExecutionResult,
      null
    );
  }
);

test(
  "denies lifecycle establishment when DEV-309 result lineage is absent",
  () => {

    const lifecycle =
      establishGovernedExecutorIntegrationOperationExecutionResultLifecycleFoundation({
        operationExecutionResult:
          createTrustedDev309Result({
            operationExecution: null
          })
      });

    assert.equal(lifecycle.trusted, false);
    assert.equal(lifecycle.lifecycleEstablished, false);

    assert.ok(
      lifecycle.blockedReasons.includes(
        "DEV-309 operation execution lineage is absent."
      )
    );
  }
);

test(
  "denies lifecycle establishment when DEV-309 exposes persistence authority",
  () => {

    const lifecycle =
      establishGovernedExecutorIntegrationOperationExecutionResultLifecycleFoundation({
        operationExecutionResult:
          createTrustedDev309Result({
            mayPersistLifecycleState: true as false
          })
      });

    assert.equal(lifecycle.trusted, false);
    assert.equal(lifecycle.lifecycleEstablished, false);
  }
);

test(
  "preserves immutable inert no-side-effect lifecycle semantics",
  () => {

    const lifecycle =
      establishGovernedExecutorIntegrationOperationExecutionResultLifecycleFoundation({
        operationExecutionResult:
          createTrustedDev309Result()
      });

    assert.equal(lifecycle.lifecycleOnly, true);
    assert.equal(lifecycle.lifecycleIsInertData, true);
    assert.equal(lifecycle.resultMutationProhibited, true);
    assert.equal(lifecycle.operationReexecutionProhibited, true);

    assert.equal(
      lifecycle.mayPersistLifecycleState,
      false
    );

    assert.equal(
      lifecycle.mayExecuteOperation,
      false
    );

    assert.equal(
      lifecycle.mayModifyRepository,
      false
    );

    assert.equal(
      lifecycle.mayCommit,
      false
    );

    assert.equal(
      lifecycle.mayPush,
      false
    );

    assert.equal(
      lifecycle.mayDeploy,
      false
    );

    assert.equal(
      lifecycle.mayPerformExternalSideEffects,
      false
    );
  }
);
