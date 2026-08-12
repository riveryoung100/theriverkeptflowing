import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateGovernedExecutorIntegrationPackagedHandoffVerificationFoundation
} from "./governed-executor-integration-packaged-handoff-verification-foundation-engine";

import type {
  RiverDevGovernedExecutorIntegrationAcceptedHandoffPackagingFoundationResult
} from "../types";

function validPackaging():
RiverDevGovernedExecutorIntegrationAcceptedHandoffPackagingFoundationResult {
  return {
    version: "DEV-297",

    source:
      "governed-executor-integration-accepted-handoff-packaging-foundation-engine",

    objective:
      "valid DEV-297 fixture",

    trusted: true,
    ready: true,
    packaged: true,

    defaultPolicy: "DENY",
    handoffPackagingOnly: true,
    packageIsInertData: true,
    futureDownstreamBoundaryRequired: true,

    packagingState:
      "GOVERNED_EXECUTOR_INTEGRATION_ACCEPTED_HANDOFF_PACKAGE_READY",

    acceptance:
      {} as
        RiverDevGovernedExecutorIntegrationAcceptedHandoffPackagingFoundationResult[
          "acceptance"
        ],

    predecessorVerificationState: [
      "GOVERNED_EXECUTOR_INTEGRATION_VERIFIED"
    ],

    predecessorVerificationEvidence: [
      "predecessor-verification-evidence"
    ],

    predecessorAcceptanceEvidence: [
      "predecessor-acceptance-evidence"
    ],

    predecessorHandoffEvidence: [
      "predecessor-handoff-evidence"
    ],

    verificationEvidence: [
      "handoff-verification-evidence"
    ],

    acceptanceEvidence: [
      "handoff-acceptance-evidence"
    ],

    packagingEvidence: [
      "handoff-packaging-evidence"
    ],

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

function evaluate(
  packaging =
    validPackaging()
) {
  return evaluateGovernedExecutorIntegrationPackagedHandoffVerificationFoundation({
    packaging
  });
}

test(
  "DEV-298 verifies an exact trusted DEV-297 package as inert data",
  () => {
    const packaging =
      validPackaging();

    const result =
      evaluate(packaging);

    assert.equal(result.version, "DEV-298");
    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.verified, true);

    assert.equal(
      result.verificationState,
      "GOVERNED_EXECUTOR_INTEGRATION_PACKAGED_HANDOFF_VERIFIED"
    );

    assert.equal(result.defaultPolicy, "DENY");
    assert.equal(result.verificationOnly, true);
    assert.equal(
      result.verificationResultIsInertData,
      true
    );

    assert.equal(
      result.futureAdmissionBoundaryRequired,
      true
    );

    assert.deepEqual(
      result.predecessorVerificationState,
      packaging.predecessorVerificationState
    );

    assert.deepEqual(
      result.packagingEvidence,
      packaging.packagingEvidence
    );

    assert.ok(
      result.packageVerificationEvidence.length > 0
    );

    assert.deepEqual(result.blockedReasons, []);
  }
);

test(
  "DEV-298 rejects a non-ready DEV-297 package",
  () => {
    const packaging =
      validPackaging();

    (
      packaging as unknown as {
        ready: boolean;
        packaged: boolean;
      }
    ).ready = false;

    (
      packaging as unknown as {
        packaged: boolean;
      }
    ).packaged = false;

    const result =
      evaluate(packaging);

    assert.equal(result.trusted, false);
    assert.equal(result.ready, false);
    assert.equal(result.verified, false);

    assert.equal(
      result.verificationState,
      "GOVERNED_EXECUTOR_INTEGRATION_PACKAGED_HANDOFF_VERIFICATION_BLOCKED"
    );

    assert.ok(result.blockedReasons.length > 0);
  }
);

test(
  "DEV-298 rejects DEV-297 blocked reasons",
  () => {
    const packaging =
      validPackaging();

    (
      packaging as unknown as {
        blockedReasons: string[];
      }
    ).blockedReasons = [
      "predecessor blocked"
    ];

    const result =
      evaluate(packaging);

    assert.equal(result.verified, false);

    assert.ok(
      result.blockedReasons.some(
        reason =>
          reason.includes("blocked reasons")
      )
    );
  }
);

test(
  "DEV-298 rejects missing DEV-297 evidence continuity",
  () => {
    const packaging =
      validPackaging();

    (
      packaging as unknown as {
        predecessorHandoffEvidence: string[];
      }
    ).predecessorHandoffEvidence = [];

    (
      packaging as unknown as {
        packagingEvidence: string[];
      }
    ).packagingEvidence = [];

    const result =
      evaluate(packaging);

    assert.equal(result.verified, false);
    assert.ok(result.blockedReasons.length >= 2);
  }
);

test(
  "DEV-298 rejects inherited DEV-297 authority",
  () => {
    const packaging =
      validPackaging();

    (
      packaging as unknown as {
        mayInvokeExecutor: boolean;
      }
    ).mayInvokeExecutor =
      true;

    const result =
      evaluate(packaging);

    assert.equal(result.verified, false);

    assert.ok(
      result.blockedReasons.some(
        reason =>
          reason.includes(
            "prohibited authority"
          )
      )
    );
  }
);

test(
  "DEV-298 releases no preserved evidence when verification is blocked",
  () => {
    const packaging =
      validPackaging();

    (
      packaging as unknown as {
        trusted: boolean;
      }
    ).trusted =
      false;

    const result =
      evaluate(packaging);

    assert.equal(result.verified, false);

    assert.deepEqual(
      result.predecessorVerificationState,
      []
    );

    assert.deepEqual(
      result.predecessorVerificationEvidence,
      []
    );

    assert.deepEqual(
      result.predecessorAcceptanceEvidence,
      []
    );

    assert.deepEqual(
      result.predecessorHandoffEvidence,
      []
    );

    assert.deepEqual(
      result.verificationEvidence,
      []
    );

    assert.deepEqual(
      result.acceptanceEvidence,
      []
    );

    assert.deepEqual(
      result.packagingEvidence,
      []
    );

    assert.deepEqual(
      result.packageVerificationEvidence,
      []
    );
  }
);

test(
  "DEV-298 creates zero downstream authority",
  () => {
    const result =
      evaluate();

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
    assert.equal(
      result.mayDeleteRepositoryContent,
      false
    );
    assert.equal(
      result.mayStageRepositoryChanges,
      false
    );
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
  }
);
