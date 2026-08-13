import assert from "node:assert/strict";
import test from "node:test";

import {
  enforceGovernedExecutorIntegrationActiveAdmission
} from "./governed-executor-integration-active-admission-enforcement-foundation-engine";

import type {
  RiverDevGovernedExecutorIntegrationActiveAdmissionVerificationFoundationResult
} from "../types";

function validVerification(): RiverDevGovernedExecutorIntegrationActiveAdmissionVerificationFoundationResult {
  return {
    version: "DEV-303",
    source:
      "governed-executor-integration-active-admission-verification-foundation-engine",
    objective: "test fixture",

    trusted: true,
    ready: true,
    verified: true,

    defaultPolicy: "DENY",

    activeAdmissionVerificationDecisionOnly: true,
    verificationResultIsInertData: true,
    futureActiveAdmissionBoundaryRequired: true,

    verificationState:
      "ACTIVE_ADMISSION_AUTHORIZATION_VERIFIED",

    authorization:
      {} as RiverDevGovernedExecutorIntegrationActiveAdmissionVerificationFoundationResult["authorization"],

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
    activeAdmissionVerificationEvidence: ["active admission verification"],

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
  "DEV-304 enforces a valid DEV-303 verification as inert data",
  () => {
    const verification =
      validVerification();

    const result =
      enforceGovernedExecutorIntegrationActiveAdmission({
        activeAdmissionVerification:
          verification
      });

    assert.equal(
      result.version,
      "DEV-304"
    );

    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.enforced, true);

    assert.equal(
      result.defaultPolicy,
      "DENY"
    );

    assert.equal(
      result.activeAdmissionEnforcementDecisionOnly,
      true
    );

    assert.equal(
      result.enforcementResultIsInertData,
      true
    );

    assert.equal(
      result.futureExecutorInvocationBoundaryRequired,
      true
    );

    assert.equal(
      result.enforcementState,
      "ACTIVE_ADMISSION_ENFORCED"
    );

    assert.equal(
      result.verification,
      verification
    );

    assert.deepEqual(
      result.blockedReasons,
      []
    );

    assert.ok(
      result.activeAdmissionEnforcementEvidence.length > 0
    );
  }
);

test(
  "DEV-304 rejects an unverified DEV-303 predecessor",
  () => {
    const value =
      validVerification();

    (
      value as unknown as {
        verified: boolean;
      }
    ).verified = false;

    const result =
      enforceGovernedExecutorIntegrationActiveAdmission({
        activeAdmissionVerification:
          value
      });

    assert.equal(
      result.enforced,
      false
    );

    assert.equal(
      result.enforcementState,
      "ACTIVE_ADMISSION_REJECTED"
    );

    assert.equal(
      result.verification,
      null
    );

    assert.deepEqual(
      result.activeAdmissionEnforcementEvidence,
      []
    );

    assert.ok(
      result.blockedReasons.length > 0
    );
  }
);

test(
  "DEV-304 rejects incomplete DEV-303 evidence continuity",
  () => {
    const value =
      validVerification();

    (
      value as unknown as {
        activeAdmissionVerificationEvidence: string[];
      }
    ).activeAdmissionVerificationEvidence = [];

    const result =
      enforceGovernedExecutorIntegrationActiveAdmission({
        activeAdmissionVerification:
          value
      });

    assert.equal(
      result.enforced,
      false
    );

    assert.equal(
      result.verification,
      null
    );

    assert.deepEqual(
      result.activeAdmissionEnforcementEvidence,
      []
    );

    assert.ok(
      result.blockedReasons.length > 0
    );
  }
);

test(
  "DEV-304 rejects predecessor authority escalation",
  () => {
    const value =
      validVerification();

    (
      value as unknown as {
        mayInvokeExecutor: boolean;
      }
    ).mayInvokeExecutor = true;

    const result =
      enforceGovernedExecutorIntegrationActiveAdmission({
        activeAdmissionVerification:
          value
      });

    assert.equal(
      result.enforced,
      false
    );

    assert.equal(
      result.verification,
      null
    );

    assert.ok(
      result.blockedReasons.length > 0
    );
  }
);

test(
  "DEV-304 rejects removal of the future active-admission boundary",
  () => {
    const value =
      validVerification();

    (
      value as unknown as {
        futureActiveAdmissionBoundaryRequired: boolean;
      }
    ).futureActiveAdmissionBoundaryRequired =
      false;

    const result =
      enforceGovernedExecutorIntegrationActiveAdmission({
        activeAdmissionVerification:
          value
      });

    assert.equal(
      result.enforced,
      false
    );

    assert.equal(
      result.verification,
      null
    );

    assert.ok(
      result.blockedReasons.length > 0
    );
  }
);

test(
  "DEV-304 creates zero active-admission dispatch or execution authority",
  () => {
    const result =
      enforceGovernedExecutorIntegrationActiveAdmission({
        activeAdmissionVerification:
          validVerification()
      });

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
      result.mayInvokeInspectionDependency,
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
  }
);

test(
  "DEV-304 creates zero repository authority",
  () => {
    const result =
      enforceGovernedExecutorIntegrationActiveAdmission({
        activeAdmissionVerification:
          validVerification()
      });

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
  }
);

test(
  "DEV-304 creates zero secret scope shell network or external authority",
  () => {
    const result =
      enforceGovernedExecutorIntegrationActiveAdmission({
        activeAdmissionVerification:
          validVerification()
      });

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

test(
  "DEV-304 produces deterministic enforcement output",
  () => {
    const predecessor =
      validVerification();

    const first =
      enforceGovernedExecutorIntegrationActiveAdmission({
        activeAdmissionVerification:
          predecessor
      });

    const second =
      enforceGovernedExecutorIntegrationActiveAdmission({
        activeAdmissionVerification:
          predecessor
      });

    assert.deepEqual(
      first,
      second
    );
  }
);
