import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateGovernedExecutorIntegrationAcceptedHandoffPackagingFoundation
} from "./governed-executor-integration-accepted-handoff-packaging-foundation-engine";

import type {
  RiverDevGovernedExecutorIntegrationHandoffAcceptanceFoundation
} from "../types";

function validAcceptance():
RiverDevGovernedExecutorIntegrationHandoffAcceptanceFoundation {
  return {
    version: "DEV-296",

    source:
      "governed-executor-integration-handoff-acceptance-foundation",

    trusted: true,
    ready: true,
    accepted: true,

    defaultPolicy: "DENY",
    acceptanceDecisionOnly: true,
    acceptanceResultIsInertData: true,
    futureDownstreamBoundaryRequired: true,

    acceptanceState:
      "GOVERNED_EXECUTOR_INTEGRATION_HANDOFF_ACCEPTED",

    verification:
      {} as
        RiverDevGovernedExecutorIntegrationHandoffAcceptanceFoundation[
          "verification"
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

    blockedReasons: [],

    acceptanceMayCreateAuthorization: false,
    acceptanceMayAuthorizeDownstreamAction: false,
    acceptanceMayExpandScope: false,
    acceptanceMayModifyRepository: false,
    acceptanceMayInvokeExecutor: false,
    acceptanceMayExecuteOperation: false,
    acceptanceMayPush: false,
    acceptanceMayDeploy: false
  };
}

function evaluate(
  acceptance =
    validAcceptance()
) {
  return evaluateGovernedExecutorIntegrationAcceptedHandoffPackagingFoundation({
    acceptance
  });
}

test(
  "DEV-297 packages an exact accepted DEV-296 handoff as inert data",
  () => {
    const acceptance =
      validAcceptance();

    const result =
      evaluate(acceptance);

    assert.equal(result.version, "DEV-297");

    assert.equal(
      result.source,
      "governed-executor-integration-accepted-handoff-packaging-foundation-engine"
    );

    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.packaged, true);

    assert.equal(
      result.packagingState,
      "GOVERNED_EXECUTOR_INTEGRATION_ACCEPTED_HANDOFF_PACKAGE_READY"
    );

    assert.equal(result.defaultPolicy, "DENY");
    assert.equal(result.handoffPackagingOnly, true);
    assert.equal(result.packageIsInertData, true);

    assert.equal(
      result.futureDownstreamBoundaryRequired,
      true
    );

    assert.deepEqual(
      result.predecessorVerificationState,
      acceptance.predecessorVerificationState
    );

    assert.deepEqual(
      result.predecessorVerificationEvidence,
      acceptance.predecessorVerificationEvidence
    );

    assert.deepEqual(
      result.predecessorAcceptanceEvidence,
      acceptance.predecessorAcceptanceEvidence
    );

    assert.deepEqual(
      result.predecessorHandoffEvidence,
      acceptance.predecessorHandoffEvidence
    );

    assert.deepEqual(
      result.verificationEvidence,
      acceptance.verificationEvidence
    );

    assert.deepEqual(
      result.acceptanceEvidence,
      acceptance.acceptanceEvidence
    );

    assert.ok(
      result.packagingEvidence.length > 0
    );

    assert.deepEqual(
      result.blockedReasons,
      []
    );
  }
);

test(
  "DEV-297 rejects a non-accepted DEV-296 predecessor",
  () => {
    const acceptance =
      validAcceptance();

    (
      acceptance as unknown as {
        accepted: boolean;
        acceptanceState: string;
      }
    ).accepted = false;

    (
      acceptance as unknown as {
        acceptanceState: string;
      }
    ).acceptanceState =
      "GOVERNED_EXECUTOR_INTEGRATION_HANDOFF_REJECTED";

    const result =
      evaluate(acceptance);

    assert.equal(result.trusted, false);
    assert.equal(result.ready, false);
    assert.equal(result.packaged, false);

    assert.equal(
      result.packagingState,
      "GOVERNED_EXECUTOR_INTEGRATION_ACCEPTED_HANDOFF_PACKAGE_BLOCKED"
    );

    assert.ok(
      result.blockedReasons.length > 0
    );
  }
);

test(
  "DEV-297 rejects DEV-296 blocked reasons",
  () => {
    const acceptance =
      validAcceptance();

    acceptance.blockedReasons.push(
      "predecessor blocked"
    );

    const result =
      evaluate(acceptance);

    assert.equal(result.packaged, false);

    assert.ok(
      result.blockedReasons.some(
        reason =>
          reason.includes("blocked reasons")
      )
    );
  }
);

test(
  "DEV-297 rejects missing DEV-296 evidence continuity",
  () => {
    const acceptance =
      validAcceptance();

    acceptance.predecessorHandoffEvidence.length =
      0;

    acceptance.acceptanceEvidence.length =
      0;

    const result =
      evaluate(acceptance);

    assert.equal(result.packaged, false);

    assert.ok(
      result.blockedReasons.length >= 2
    );
  }
);

test(
  "DEV-297 rejects inherited DEV-296 authority",
  () => {
    const acceptance =
      validAcceptance();

    (
      acceptance as unknown as {
        acceptanceMayInvokeExecutor: boolean;
      }
    ).acceptanceMayInvokeExecutor =
      true;

    const result =
      evaluate(acceptance);

    assert.equal(result.packaged, false);

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
  "DEV-297 releases no preserved evidence when packaging is blocked",
  () => {
    const acceptance =
      validAcceptance();

    (
      acceptance as unknown as {
        trusted: boolean;
      }
    ).trusted =
      false;

    const result =
      evaluate(acceptance);

    assert.equal(result.packaged, false);

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
  }
);

test(
  "DEV-297 creates zero downstream authority",
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
    assert.equal(result.mayPersistLifecycleState, false);

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
  }
);
