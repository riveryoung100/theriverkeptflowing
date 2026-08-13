import assert from "node:assert/strict";
import test from "node:test";

import {
  authorizeGovernedExecutorIntegrationExecutorInvocation
} from "./governed-executor-integration-executor-invocation-authorization-foundation-engine";

import type {
  RiverDevGovernedExecutorIntegrationActiveAdmissionEnforcementFoundationResult
} from "../types";

function buildValidPredecessor(): RiverDevGovernedExecutorIntegrationActiveAdmissionEnforcementFoundationResult {
  return {
    version: "DEV-304",
    source:
      "governed-executor-integration-active-admission-enforcement-foundation-engine",
    objective: "test predecessor",

    trusted: true,
    ready: true,
    enforced: true,

    defaultPolicy: "DENY",

    activeAdmissionEnforcementDecisionOnly: true,
    enforcementResultIsInertData: true,
    futureExecutorInvocationBoundaryRequired: true,

    enforcementState: "ACTIVE_ADMISSION_ENFORCED",

    verification: {} as RiverDevGovernedExecutorIntegrationActiveAdmissionEnforcementFoundationResult["verification"],

    predecessorVerificationState: ["predecessor-verification-state"],
    predecessorVerificationEvidence: ["predecessor-verification-evidence"],
    predecessorAcceptanceEvidence: ["predecessor-acceptance-evidence"],
    predecessorHandoffEvidence: ["predecessor-handoff-evidence"],
    verificationEvidence: ["verification-evidence"],
    acceptanceEvidence: ["acceptance-evidence"],
    packagingEvidence: ["packaging-evidence"],
    packageVerificationEvidence: ["package-verification-evidence"],
    admissionEvidence: ["admission-evidence"],
    consumptionEvidence: ["consumption-evidence"],
    activeAdmissionEligibilityEvidence: ["eligibility-evidence"],
    activeAdmissionAuthorizationEvidence: ["authorization-evidence"],
    activeAdmissionVerificationEvidence: ["active-verification-evidence"],
    activeAdmissionEnforcementEvidence: ["active-enforcement-evidence"],

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

test("DEV-305 authorizes an exact trusted DEV-304 predecessor as inert data only", () => {
  const predecessor = buildValidPredecessor();

  const result =
    authorizeGovernedExecutorIntegrationExecutorInvocation(predecessor);

  assert.equal(result.version, "DEV-305");
  assert.equal(result.trusted, true);
  assert.equal(result.ready, true);
  assert.equal(result.authorized, true);

  assert.equal(
    result.authorizationState,
    "EXECUTOR_INVOCATION_AUTHORIZED"
  );

  assert.equal(
    result.executorInvocationAuthorizationDecisionOnly,
    true
  );

  assert.equal(
    result.authorizationResultIsInertData,
    true
  );

  assert.equal(
    result.futureExecutorInvocationBoundaryRequired,
    true
  );

  assert.equal(result.enforcement, predecessor);
  assert.deepEqual(result.blockedReasons, []);

  assert.ok(
    result.executorInvocationAuthorizationEvidence.length > 0
  );

  assert.equal(result.mayDispatch, false);
  assert.equal(result.mayInvokeExecutor, false);
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
});

test("DEV-305 rejects an untrusted predecessor", () => {
  const predecessor = buildValidPredecessor();

  const mutable = predecessor as unknown as {
    trusted: boolean;
  };

  mutable.trusted = false;

  const result =
    authorizeGovernedExecutorIntegrationExecutorInvocation(predecessor);

  assert.equal(result.authorized, false);
  assert.equal(
    result.authorizationState,
    "EXECUTOR_INVOCATION_UNAUTHORIZED"
  );

  assert.equal(result.enforcement, null);
  assert.ok(result.blockedReasons.length > 0);
  assert.deepEqual(
    result.executorInvocationAuthorizationEvidence,
    []
  );

  assert.equal(result.mayInvokeExecutor, false);
  assert.equal(result.mayExecuteOperation, false);
});

test("DEV-305 rejects a predecessor without the executor invocation boundary requirement", () => {
  const predecessor = buildValidPredecessor();

  const mutable = predecessor as unknown as {
    futureExecutorInvocationBoundaryRequired: boolean;
  };

  mutable.futureExecutorInvocationBoundaryRequired = false;

  const result =
    authorizeGovernedExecutorIntegrationExecutorInvocation(predecessor);

  assert.equal(result.authorized, false);

  assert.ok(
    result.blockedReasons.includes(
      "DEV-304 executor invocation boundary requirement must remain enabled."
    )
  );

  assert.equal(result.mayInvokeExecutor, false);
});

test("DEV-305 rejects inherited executor invocation authority", () => {
  const predecessor = buildValidPredecessor();

  const mutable = predecessor as unknown as {
    mayInvokeExecutor: boolean;
  };

  mutable.mayInvokeExecutor = true;

  const result =
    authorizeGovernedExecutorIntegrationExecutorInvocation(predecessor);

  assert.equal(result.authorized, false);

  assert.ok(
    result.blockedReasons.includes(
      "DEV-304 must create zero inherited or downstream authority."
    )
  );

  assert.equal(result.mayInvokeExecutor, false);
  assert.equal(result.mayExecuteOperation, false);
});

test("DEV-305 rejects incomplete evidence continuity", () => {
  const predecessor = buildValidPredecessor();

  const mutable = predecessor as unknown as {
    activeAdmissionEnforcementEvidence: string[];
  };

  mutable.activeAdmissionEnforcementEvidence = [];

  const result =
    authorizeGovernedExecutorIntegrationExecutorInvocation(predecessor);

  assert.equal(result.authorized, false);

  assert.ok(
    result.blockedReasons.includes(
      "Complete DEV-304 lineage and evidence continuity is required."
    )
  );

  assert.deepEqual(
    result.executorInvocationAuthorizationEvidence,
    []
  );
});
