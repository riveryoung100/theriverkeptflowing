import assert from "node:assert/strict";
import test from "node:test";

import {
  authorizeGovernedExecutorIntegrationActiveAdmission
} from "./governed-executor-integration-active-admission-authorization-foundation-engine";

import type {
  RiverDevGovernedExecutorIntegrationActiveAdmissionEligibilityFoundationResult
} from "../types";

function validEligibility(): RiverDevGovernedExecutorIntegrationActiveAdmissionEligibilityFoundationResult {
  return {
    version: "DEV-301",
    source:
      "governed-executor-integration-active-admission-eligibility-foundation-engine",
    objective: "test fixture",
    trusted: true,
    ready: true,
    eligible: true,
    defaultPolicy: "DENY",
    activeAdmissionEligibilityDecisionOnly: true,
    eligibilityResultIsInertData: true,
    futureActiveAdmissionAuthorizationBoundaryRequired: true,
    eligibilityState: "ACTIVE_ADMISSION_ELIGIBLE",
    consumption:
      {} as RiverDevGovernedExecutorIntegrationActiveAdmissionEligibilityFoundationResult["consumption"],
    predecessorVerificationState: ["verified"],
    predecessorVerificationEvidence: ["predecessor verification"],
    predecessorAcceptanceEvidence: ["predecessor acceptance"],
    predecessorHandoffEvidence: ["predecessor handoff"],
    verificationEvidence: ["verification"],
    acceptanceEvidence: ["acceptance"],
    packagingEvidence: ["packaging"],
    packageVerificationEvidence: ["package verification"],
    admissionEvidence: ["admission"],
    consumptionEvidence: ["consumption"],
    activeAdmissionEligibilityEvidence: ["eligibility"],
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

test("DEV-302 authorizes an exact trusted DEV-301 eligibility result", () => {
  const value = validEligibility();

  const result =
    authorizeGovernedExecutorIntegrationActiveAdmission(value);

  assert.equal(result.version, "DEV-302");
  assert.equal(result.trusted, true);
  assert.equal(result.ready, true);
  assert.equal(result.authorized, true);
  assert.equal(
    result.authorizationState,
    "ACTIVE_ADMISSION_AUTHORIZED"
  );
  assert.equal(result.defaultPolicy, "DENY");
  assert.equal(result.activeAdmissionAuthorizationDecisionOnly, true);
  assert.equal(result.authorizationResultIsInertData, true);
  assert.equal(result.futureActiveAdmissionBoundaryRequired, true);
  assert.equal(result.eligibility, value);
  assert.equal(result.consumption, value.consumption);
  assert.deepEqual(result.blockedReasons, []);
  assert.ok(result.activeAdmissionAuthorizationEvidence.length > 0);
});

test("DEV-302 rejects an ineligible DEV-301 predecessor", () => {
  const value = validEligibility();

  (
    value as unknown as {
      eligible: boolean;
    }
  ).eligible = false;

  const result =
    authorizeGovernedExecutorIntegrationActiveAdmission(value);

  assert.equal(result.authorized, false);
  assert.equal(
    result.authorizationState,
    "ACTIVE_ADMISSION_UNAUTHORIZED"
  );
  assert.equal(result.eligibility, null);
  assert.equal(result.consumption, null);
  assert.deepEqual(result.activeAdmissionAuthorizationEvidence, []);
  assert.ok(result.blockedReasons.length > 0);
});

test("DEV-302 rejects missing DEV-301 evidence continuity", () => {
  const value = validEligibility();

  (
    value as unknown as {
      activeAdmissionEligibilityEvidence: string[];
    }
  ).activeAdmissionEligibilityEvidence = [];

  const result =
    authorizeGovernedExecutorIntegrationActiveAdmission(value);

  assert.equal(result.authorized, false);
  assert.equal(result.eligibility, null);
  assert.deepEqual(result.activeAdmissionAuthorizationEvidence, []);
});

test("DEV-302 rejects predecessor authority escalation", () => {
  const value = validEligibility();

  (
    value as unknown as {
      mayActivateAdmission: boolean;
    }
  ).mayActivateAdmission = true;

  const result =
    authorizeGovernedExecutorIntegrationActiveAdmission(value);

  assert.equal(result.authorized, false);
  assert.equal(result.eligibility, null);
  assert.ok(result.blockedReasons.length > 0);
});

test("DEV-302 creates zero active-admission dispatch or execution authority", () => {
  const result =
    authorizeGovernedExecutorIntegrationActiveAdmission(
      validEligibility()
    );

  assert.equal(result.mayCreateExecutionAuthorization, false);
  assert.equal(result.mayAuthorizeDownstreamAction, false);
  assert.equal(result.mayAdmitIntoActiveExecutor, false);
  assert.equal(result.mayActivateAdmission, false);
  assert.equal(result.mayDispatch, false);
  assert.equal(result.mayInvokeExecutor, false);
  assert.equal(result.mayExecuteOperation, false);
  assert.equal(result.mayInvokeInspectionDependency, false);
  assert.equal(result.mayRetryExecution, false);
  assert.equal(result.mayPersistLifecycleState, false);
});

test("DEV-302 creates zero repository authority", () => {
  const result =
    authorizeGovernedExecutorIntegrationActiveAdmission(
      validEligibility()
    );

  assert.equal(result.mayModifyRepository, false);
  assert.equal(result.mayDeleteRepositoryContent, false);
  assert.equal(result.mayStageRepositoryChanges, false);
  assert.equal(result.mayCommit, false);
  assert.equal(result.mayPush, false);
  assert.equal(result.mayDeploy, false);
});

test("DEV-302 creates zero secret scope shell network or external authority", () => {
  const result =
    authorizeGovernedExecutorIntegrationActiveAdmission(
      validEligibility()
    );

  assert.equal(result.mayAccessSecrets, false);
  assert.equal(result.mayExpandScope, false);
  assert.equal(result.mayPerformArbitraryShellExecution, false);
  assert.equal(result.mayPerformNetworkExecution, false);
  assert.equal(result.mayPerformExternalSideEffects, false);
});
