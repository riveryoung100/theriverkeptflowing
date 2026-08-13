import assert from "node:assert/strict";
import test from "node:test";

import { verifyGovernedExecutorIntegrationActiveAdmissionAuthorization } from "./governed-executor-integration-active-admission-verification-foundation-engine";

import type { RiverDevGovernedExecutorIntegrationActiveAdmissionAuthorizationFoundationResult } from "../types";

function validAuthorization(): RiverDevGovernedExecutorIntegrationActiveAdmissionAuthorizationFoundationResult {
  return {
    version: "DEV-302",
    source:
      "governed-executor-integration-active-admission-authorization-foundation-engine",
    objective: "test fixture",
    trusted: true,
    ready: true,
    authorized: true,
    defaultPolicy: "DENY",
    activeAdmissionAuthorizationDecisionOnly: true,
    authorizationResultIsInertData: true,
    futureActiveAdmissionBoundaryRequired: true,
    authorizationState: "ACTIVE_ADMISSION_AUTHORIZED",

    eligibility:
      {} as RiverDevGovernedExecutorIntegrationActiveAdmissionAuthorizationFoundationResult["eligibility"],

    consumption:
      {} as RiverDevGovernedExecutorIntegrationActiveAdmissionAuthorizationFoundationResult["consumption"],

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
    activeAdmissionAuthorizationEvidence: ["authorization"],

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
  };
}

test("DEV-303 verifies an exact trusted DEV-302 authorization result", () => {
  const value = validAuthorization();

  const result = verifyGovernedExecutorIntegrationActiveAdmissionAuthorization({
    activeAdmissionAuthorization: value,
  });

  assert.equal(result.version, "DEV-303");
  assert.equal(result.trusted, true);
  assert.equal(result.ready, true);
  assert.equal(result.verified, true);

  assert.equal(
    result.verificationState,
    "ACTIVE_ADMISSION_AUTHORIZATION_VERIFIED",
  );

  assert.equal(result.defaultPolicy, "DENY");

  assert.equal(result.activeAdmissionVerificationDecisionOnly, true);

  assert.equal(result.verificationResultIsInertData, true);

  assert.equal(result.futureActiveAdmissionBoundaryRequired, true);

  assert.equal(result.authorization, value);

  assert.deepEqual(result.blockedReasons, []);

  assert.ok(result.activeAdmissionVerificationEvidence.length > 0);
});

test("DEV-303 rejects an unauthorized DEV-302 predecessor", () => {
  const value = validAuthorization();

  (
    value as unknown as {
      authorized: boolean;
    }
  ).authorized = false;

  const result = verifyGovernedExecutorIntegrationActiveAdmissionAuthorization({
    activeAdmissionAuthorization: value,
  });

  assert.equal(result.verified, false);

  assert.equal(
    result.verificationState,
    "ACTIVE_ADMISSION_AUTHORIZATION_UNVERIFIED",
  );

  assert.equal(result.authorization, null);

  assert.deepEqual(result.activeAdmissionVerificationEvidence, []);

  assert.ok(result.blockedReasons.length > 0);
});

test("DEV-303 rejects missing DEV-302 evidence continuity", () => {
  const value = validAuthorization();

  (
    value as unknown as {
      activeAdmissionAuthorizationEvidence: string[];
    }
  ).activeAdmissionAuthorizationEvidence = [];

  const result = verifyGovernedExecutorIntegrationActiveAdmissionAuthorization({
    activeAdmissionAuthorization: value,
  });

  assert.equal(result.verified, false);

  assert.equal(result.authorization, null);

  assert.deepEqual(result.activeAdmissionVerificationEvidence, []);
});

test("DEV-303 rejects predecessor authority escalation", () => {
  const value = validAuthorization();

  (
    value as unknown as {
      mayActivateAdmission: boolean;
    }
  ).mayActivateAdmission = true;

  const result = verifyGovernedExecutorIntegrationActiveAdmissionAuthorization({
    activeAdmissionAuthorization: value,
  });

  assert.equal(result.verified, false);
  assert.equal(result.authorization, null);

  assert.ok(result.blockedReasons.length > 0);
});

test("DEV-303 creates zero active-admission dispatch or execution authority", () => {
  const result = verifyGovernedExecutorIntegrationActiveAdmissionAuthorization({
    activeAdmissionAuthorization: validAuthorization(),
  });

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

test("DEV-303 creates zero repository authority", () => {
  const result = verifyGovernedExecutorIntegrationActiveAdmissionAuthorization({
    activeAdmissionAuthorization: validAuthorization(),
  });

  assert.equal(result.mayModifyRepository, false);
  assert.equal(result.mayDeleteRepositoryContent, false);
  assert.equal(result.mayStageRepositoryChanges, false);
  assert.equal(result.mayCommit, false);
  assert.equal(result.mayPush, false);
  assert.equal(result.mayDeploy, false);
});

test("DEV-303 creates zero secret scope shell network or external authority", () => {
  const result = verifyGovernedExecutorIntegrationActiveAdmissionAuthorization({
    activeAdmissionAuthorization: validAuthorization(),
  });

  assert.equal(result.mayAccessSecrets, false);
  assert.equal(result.mayExpandScope, false);
  assert.equal(result.mayPerformArbitraryShellExecution, false);
  assert.equal(result.mayPerformNetworkExecution, false);
  assert.equal(result.mayPerformExternalSideEffects, false);
});

test("DEV-303 produces deterministic verification output", () => {
  const predecessor = validAuthorization();

  const first = verifyGovernedExecutorIntegrationActiveAdmissionAuthorization({
    activeAdmissionAuthorization: predecessor,
  });

  const second = verifyGovernedExecutorIntegrationActiveAdmissionAuthorization({
    activeAdmissionAuthorization: predecessor,
  });

  assert.deepEqual(first, second);
});
