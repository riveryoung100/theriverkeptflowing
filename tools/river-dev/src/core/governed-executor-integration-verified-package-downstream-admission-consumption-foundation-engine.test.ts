import assert from "node:assert/strict";
import test from "node:test";

import type {
  RiverDevGovernedExecutorIntegrationVerifiedPackageDownstreamAdmissionFoundationResult
} from "../types";

import {
  consumeGovernedExecutorIntegrationVerifiedPackageDownstreamAdmission
} from "./governed-executor-integration-verified-package-downstream-admission-consumption-foundation-engine";

const makeAdmission =
  (): RiverDevGovernedExecutorIntegrationVerifiedPackageDownstreamAdmissionFoundationResult =>
    ({
      version: "DEV-299",
      source:
        "governed-executor-integration-verified-package-downstream-admission-foundation-engine",
      objective: "test",
      trusted: true,
      ready: true,
      admissionEligible: true,
      defaultPolicy: "DENY",
      downstreamAdmissionEligibilityOnly: true,
      admissionResultIsInertData: true,
      futureDownstreamAdmissionConsumptionBoundaryRequired: true,
      admissionState:
        "GOVERNED_EXECUTOR_INTEGRATION_VERIFIED_PACKAGE_ADMISSION_ELIGIBLE",

      verification: {} as RiverDevGovernedExecutorIntegrationVerifiedPackageDownstreamAdmissionFoundationResult["verification"],

      predecessorVerificationState: ["verified"],
      predecessorVerificationEvidence: ["predecessor verification"],
      predecessorAcceptanceEvidence: ["predecessor acceptance"],
      predecessorHandoffEvidence: ["predecessor handoff"],
      verificationEvidence: ["verification"],
      acceptanceEvidence: ["acceptance"],
      packagingEvidence: ["packaging"],
      packageVerificationEvidence: ["package verification"],
      admissionEvidence: ["admission"],

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
    });

test(
  "DEV-300 consumes an exact trusted DEV-299 admission as inert data",
  () => {
    const result =
      consumeGovernedExecutorIntegrationVerifiedPackageDownstreamAdmission(
        makeAdmission()
      );

    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.consumed, true);
    assert.equal(
      result.consumptionState,
      "GOVERNED_EXECUTOR_INTEGRATION_VERIFIED_PACKAGE_ADMISSION_CONSUMPTION_ACCEPTED"
    );
    assert.equal(result.consumptionResultIsInertData, true);
    assert.equal(result.consumptionEvidence.length > 0, true);
  }
);

test("DEV-300 rejects a non-ready DEV-299 admission", () => {
  const admission = makeAdmission();

  (
    admission as unknown as {
      ready: boolean;
    }
  ).ready = false;

  const result =
    consumeGovernedExecutorIntegrationVerifiedPackageDownstreamAdmission(
      admission
    );

  assert.equal(result.consumed, false);
});

test("DEV-300 rejects an ineligible DEV-299 admission", () => {
  const admission = makeAdmission();

  (
    admission as unknown as {
      admissionEligible: boolean;
    }
  ).admissionEligible = false;

  const result =
    consumeGovernedExecutorIntegrationVerifiedPackageDownstreamAdmission(
      admission
    );

  assert.equal(result.consumed, false);
});

test("DEV-300 rejects DEV-299 blocked reasons", () => {
  const admission = makeAdmission();

  (
    admission as unknown as {
      blockedReasons: string[];
    }
  ).blockedReasons = ["predecessor blocked"];

  const result =
    consumeGovernedExecutorIntegrationVerifiedPackageDownstreamAdmission(
      admission
    );

  assert.equal(result.consumed, false);
});

test("DEV-300 rejects missing evidence continuity", () => {
  const admission = makeAdmission();

  (
    admission as unknown as {
      admissionEvidence: string[];
    }
  ).admissionEvidence = [];

  const result =
    consumeGovernedExecutorIntegrationVerifiedPackageDownstreamAdmission(
      admission
    );

  assert.equal(result.consumed, false);
});

test("DEV-300 rejects inherited DEV-299 authority", () => {
  const admission = makeAdmission();

  (
    admission as unknown as {
      mayPush: boolean;
    }
  ).mayPush = true;

  const result =
    consumeGovernedExecutorIntegrationVerifiedPackageDownstreamAdmission(
      admission
    );

  assert.equal(result.consumed, false);
});

test(
  "DEV-300 blocked consumption releases no successful consumption evidence",
  () => {
    const admission = makeAdmission();

    (
      admission as unknown as {
        ready: boolean;
      }
    ).ready = false;

    const result =
      consumeGovernedExecutorIntegrationVerifiedPackageDownstreamAdmission(
        admission
      );

    assert.deepEqual(result.consumptionEvidence, []);
  }
);

test("DEV-300 creates zero downstream authority", () => {
  const result =
    consumeGovernedExecutorIntegrationVerifiedPackageDownstreamAdmission(
      makeAdmission()
    );

  assert.equal(result.mayCreateExecutionAuthorization, false);
  assert.equal(result.mayAuthorizeDownstreamAction, false);
  assert.equal(result.mayDispatch, false);
  assert.equal(result.mayInvokeExecutor, false);
  assert.equal(result.mayExecuteOperation, false);
  assert.equal(result.mayModifyRepository, false);
  assert.equal(result.mayCommit, false);
  assert.equal(result.mayPush, false);
  assert.equal(result.mayDeploy, false);
  assert.equal(result.mayPerformExternalSideEffects, false);
});

test("DEV-300 cannot activate admission", () => {
  const result =
    consumeGovernedExecutorIntegrationVerifiedPackageDownstreamAdmission(
      makeAdmission()
    );

  assert.equal(result.mayAdmitIntoActiveExecutor, false);
  assert.equal(result.mayActivateAdmission, false);
});

test(
  "DEV-300 requires a future active-admission eligibility boundary",
  () => {
    const result =
      consumeGovernedExecutorIntegrationVerifiedPackageDownstreamAdmission(
        makeAdmission()
      );

    assert.equal(
      result.futureActiveAdmissionEligibilityBoundaryRequired,
      true
    );
  }
);
