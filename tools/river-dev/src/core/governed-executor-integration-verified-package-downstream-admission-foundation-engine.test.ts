import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateGovernedExecutorIntegrationVerifiedPackageDownstreamAdmissionFoundation
} from "./governed-executor-integration-verified-package-downstream-admission-foundation-engine";

import type {
  RiverDevGovernedExecutorIntegrationPackagedHandoffVerificationFoundationResult
} from "../types";

function createTrustedVerification():
RiverDevGovernedExecutorIntegrationPackagedHandoffVerificationFoundationResult {
  return {
    version: "DEV-298",
    source:
      "governed-executor-integration-packaged-handoff-verification-foundation-engine",
    objective: "trusted DEV-298 fixture",

    trusted: true,
    ready: true,
    verified: true,

    defaultPolicy: "DENY",
    verificationOnly: true,
    verificationResultIsInertData: true,
    futureAdmissionBoundaryRequired: true,

    verificationState:
      "GOVERNED_EXECUTOR_INTEGRATION_PACKAGED_HANDOFF_VERIFIED",

    packaging: {} as
      RiverDevGovernedExecutorIntegrationPackagedHandoffVerificationFoundationResult["packaging"],

    predecessorVerificationState: ["verified"],
    predecessorVerificationEvidence: ["predecessor verification"],
    predecessorAcceptanceEvidence: ["predecessor acceptance"],
    predecessorHandoffEvidence: ["predecessor handoff"],

    verificationEvidence: ["verification"],
    acceptanceEvidence: ["acceptance"],
    packagingEvidence: ["packaging"],
    packageVerificationEvidence: ["package verification"],

    blockedReasons: [],

    mayCreateExecutionAuthorization: false,
    mayAuthorizeDownstreamAction: false,
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
    mayPerformExternalSideEffects: false
  };
}

test(
  "DEV-299 admits an exact trusted DEV-298 verification as inert eligibility data",
  () => {
    const verification =
      createTrustedVerification();

    const result =
      evaluateGovernedExecutorIntegrationVerifiedPackageDownstreamAdmissionFoundation({
        verification
      });

    assert.equal(result.version, "DEV-299");
    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.admissionEligible, true);

    assert.equal(
      result.admissionState,
      "GOVERNED_EXECUTOR_INTEGRATION_VERIFIED_PACKAGE_ADMISSION_ELIGIBLE"
    );

    assert.equal(result.defaultPolicy, "DENY");
    assert.equal(
      result.downstreamAdmissionEligibilityOnly,
      true
    );
    assert.equal(
      result.admissionResultIsInertData,
      true
    );

    assert.equal(result.blockedReasons.length, 0);

    assert.ok(result.admissionEvidence.length > 0);
    assert.ok(
      result.packageVerificationEvidence.length > 0
    );
  }
);

test(
  "DEV-299 rejects an unverified DEV-298 predecessor",
  () => {
    const verification =
      createTrustedVerification();

    (
      verification as unknown as {
        verified: boolean;
      }
    ).verified = false;

    const result =
      evaluateGovernedExecutorIntegrationVerifiedPackageDownstreamAdmissionFoundation({
        verification
      });

    assert.equal(result.admissionEligible, false);

    assert.equal(
      result.admissionState,
      "GOVERNED_EXECUTOR_INTEGRATION_VERIFIED_PACKAGE_ADMISSION_BLOCKED"
    );

    assert.ok(result.blockedReasons.length > 0);
    assert.equal(result.admissionEvidence.length, 0);
  }
);

test(
  "DEV-299 rejects DEV-298 blocked reasons",
  () => {
    const verification =
      createTrustedVerification();

    (
      verification as unknown as {
        blockedReasons: string[];
      }
    ).blockedReasons = [
      "predecessor blocked"
    ];

    const result =
      evaluateGovernedExecutorIntegrationVerifiedPackageDownstreamAdmissionFoundation({
        verification
      });

    assert.equal(result.admissionEligible, false);
    assert.ok(result.blockedReasons.length > 0);
    assert.equal(result.admissionEvidence.length, 0);
  }
);

test(
  "DEV-299 rejects missing DEV-298 evidence continuity",
  () => {
    const verification =
      createTrustedVerification();

    (
      verification as unknown as {
        packageVerificationEvidence: string[];
      }
    ).packageVerificationEvidence = [];

    const result =
      evaluateGovernedExecutorIntegrationVerifiedPackageDownstreamAdmissionFoundation({
        verification
      });

    assert.equal(result.admissionEligible, false);
    assert.ok(result.blockedReasons.length > 0);

    assert.equal(
      result.packageVerificationEvidence.length,
      0
    );
  }
);

test(
  "DEV-299 rejects inherited DEV-298 authority",
  () => {
    const verification =
      createTrustedVerification();

    (
      verification as unknown as {
        mayInvokeExecutor: boolean;
      }
    ).mayInvokeExecutor = true;

    const result =
      evaluateGovernedExecutorIntegrationVerifiedPackageDownstreamAdmissionFoundation({
        verification
      });

    assert.equal(result.admissionEligible, false);
    assert.ok(result.blockedReasons.length > 0);
  }
);

test(
  "DEV-299 releases no preserved evidence when admission is blocked",
  () => {
    const verification =
      createTrustedVerification();

    (
      verification as unknown as {
        ready: boolean;
      }
    ).ready = false;

    const result =
      evaluateGovernedExecutorIntegrationVerifiedPackageDownstreamAdmissionFoundation({
        verification
      });

    assert.equal(result.admissionEligible, false);

    assert.equal(
      result.predecessorVerificationState.length,
      0
    );

    assert.equal(
      result.predecessorVerificationEvidence.length,
      0
    );

    assert.equal(
      result.predecessorAcceptanceEvidence.length,
      0
    );

    assert.equal(
      result.predecessorHandoffEvidence.length,
      0
    );

    assert.equal(result.verificationEvidence.length, 0);
    assert.equal(result.acceptanceEvidence.length, 0);
    assert.equal(result.packagingEvidence.length, 0);

    assert.equal(
      result.packageVerificationEvidence.length,
      0
    );

    assert.equal(result.admissionEvidence.length, 0);
  }
);

test(
  "DEV-299 creates zero downstream authority",
  () => {
    const result =
      evaluateGovernedExecutorIntegrationVerifiedPackageDownstreamAdmissionFoundation({
        verification: createTrustedVerification()
      });

    assert.equal(
      result.mayCreateExecutionAuthorization,
      false
    );

    assert.equal(
      result.mayAuthorizeDownstreamAction,
      false
    );

    assert.equal(result.mayDispatch, false);
    assert.equal(result.mayInvokeExecutor, false);
    assert.equal(result.mayExecuteOperation, false);

    assert.equal(
      result.mayInvokeInspectionDependency,
      false
    );

    assert.equal(result.mayRetryExecution, false);

    assert.equal(
      result.mayPersistLifecycleState,
      false
    );

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
      result.mayPerformExternalSideEffects,
      false
    );

    assert.equal(
      result.futureDownstreamAdmissionConsumptionBoundaryRequired,
      true
    );
  }
);
