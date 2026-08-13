import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateGovernedExecutorIntegrationActiveAdmissionEligibility
} from "./governed-executor-integration-active-admission-eligibility-foundation-engine";

import type {
  RiverDevGovernedExecutorIntegrationVerifiedPackageDownstreamAdmissionConsumptionFoundationResult
} from "../types";

function validConsumption(): RiverDevGovernedExecutorIntegrationVerifiedPackageDownstreamAdmissionConsumptionFoundationResult {
  return {
    version: "DEV-300",
    source:
      "governed-executor-integration-verified-package-downstream-admission-consumption-foundation-engine",
    objective: "test fixture",
    trusted: true,
    ready: true,
    consumed: true,
    defaultPolicy: "DENY",
    admissionConsumptionDecisionOnly: true,
    consumptionResultIsInertData: true,
    futureActiveAdmissionEligibilityBoundaryRequired: true,
    consumptionState:
      "GOVERNED_EXECUTOR_INTEGRATION_VERIFIED_PACKAGE_ADMISSION_CONSUMPTION_ACCEPTED",
    admission: {} as RiverDevGovernedExecutorIntegrationVerifiedPackageDownstreamAdmissionConsumptionFoundationResult["admission"],
    verification: {} as RiverDevGovernedExecutorIntegrationVerifiedPackageDownstreamAdmissionConsumptionFoundationResult["verification"],
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

test("DEV-301 marks an exact trusted consumed DEV-300 result eligible", () => {
  const value = validConsumption();

  const result =
    evaluateGovernedExecutorIntegrationActiveAdmissionEligibility(
      value
    );

  assert.equal(result.version, "DEV-301");
  assert.equal(result.trusted, true);
  assert.equal(result.ready, true);
  assert.equal(result.eligible, true);
  assert.equal(
    result.eligibilityState,
    "ACTIVE_ADMISSION_ELIGIBLE"
  );
  assert.equal(result.defaultPolicy, "DENY");
  assert.equal(
    result.activeAdmissionEligibilityDecisionOnly,
    true
  );
  assert.equal(result.eligibilityResultIsInertData, true);
  assert.equal(
    result.futureActiveAdmissionAuthorizationBoundaryRequired,
    true
  );
  assert.equal(result.consumption, value);
  assert.deepEqual(
    result.consumptionEvidence,
    value.consumptionEvidence
  );
  assert.ok(
    result.activeAdmissionEligibilityEvidence.length > 0
  );
  assert.deepEqual(result.blockedReasons, []);
});

test("DEV-301 rejects an untrusted DEV-300 result", () => {
  const value = validConsumption();

  (
    value as unknown as {
      trusted: boolean;
    }
  ).trusted = false;

  const result =
    evaluateGovernedExecutorIntegrationActiveAdmissionEligibility(
      value
    );

  assert.equal(result.eligible, false);
  assert.equal(
    result.eligibilityState,
    "ACTIVE_ADMISSION_INELIGIBLE"
  );
  assert.equal(result.consumption, null);
  assert.deepEqual(
    result.activeAdmissionEligibilityEvidence,
    []
  );
  assert.ok(result.blockedReasons.length > 0);
});

test("DEV-301 rejects a non-ready DEV-300 result", () => {
  const value = validConsumption();

  (
    value as unknown as {
      ready: boolean;
    }
  ).ready = false;

  const result =
    evaluateGovernedExecutorIntegrationActiveAdmissionEligibility(
      value
    );

  assert.equal(result.eligible, false);
  assert.equal(result.consumption, null);
});

test("DEV-301 rejects an unconsumed DEV-300 result", () => {
  const value = validConsumption();

  (
    value as unknown as {
      consumed: boolean;
    }
  ).consumed = false;

  const result =
    evaluateGovernedExecutorIntegrationActiveAdmissionEligibility(
      value
    );

  assert.equal(result.eligible, false);
  assert.equal(result.consumption, null);
});

test("DEV-301 rejects a rejected DEV-300 consumption state", () => {
  const value = validConsumption();

  (
    value as unknown as {
      consumptionState: string;
    }
  ).consumptionState =
    "GOVERNED_EXECUTOR_INTEGRATION_VERIFIED_PACKAGE_ADMISSION_CONSUMPTION_REJECTED";

  const result =
    evaluateGovernedExecutorIntegrationActiveAdmissionEligibility(
      value
    );

  assert.equal(result.eligible, false);
  assert.equal(result.consumption, null);
});

test("DEV-301 rejects DEV-300 blocked reasons", () => {
  const value = validConsumption();

  (
    value as unknown as {
      blockedReasons: string[];
    }
  ).blockedReasons = [
    "predecessor blocked"
  ];

  const result =
    evaluateGovernedExecutorIntegrationActiveAdmissionEligibility(
      value
    );

  assert.equal(result.eligible, false);
  assert.equal(result.consumption, null);
});

test("DEV-301 rejects missing evidence continuity", () => {
  const value = validConsumption();

  (
    value as unknown as {
      consumptionEvidence: string[];
    }
  ).consumptionEvidence = [];

  const result =
    evaluateGovernedExecutorIntegrationActiveAdmissionEligibility(
      value
    );

  assert.equal(result.eligible, false);
  assert.equal(result.consumption, null);
  assert.deepEqual(result.consumptionEvidence, []);
});

test("DEV-301 rejects a removed eligibility-boundary requirement", () => {
  const value = validConsumption();

  (
    value as unknown as {
      futureActiveAdmissionEligibilityBoundaryRequired: boolean;
    }
  ).futureActiveAdmissionEligibilityBoundaryRequired =
    false;

  const result =
    evaluateGovernedExecutorIntegrationActiveAdmissionEligibility(
      value
    );

  assert.equal(result.eligible, false);
  assert.equal(result.consumption, null);
});

test("DEV-301 creates zero downstream authority", () => {
  const result =
    evaluateGovernedExecutorIntegrationActiveAdmissionEligibility(
      validConsumption()
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