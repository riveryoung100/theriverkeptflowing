import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGovernedExecutorIntegrationHandoffAcceptanceFoundation
} from "./governed-executor-integration-handoff-acceptance-foundation-engine";

import type {
  RiverDevGovernedExecutorIntegrationHandoffVerificationFoundation
} from "../types";

function createVerification():
RiverDevGovernedExecutorIntegrationHandoffVerificationFoundation {
  return {
    version: "DEV-295",
    source:
      "governed-executor-integration-handoff-verification-foundation",

    trusted: true,
    ready: true,
    verified: true,

    defaultPolicy: "DENY",
    verificationOnly: true,
    verificationResultIsInertData: true,
    futureDownstreamBoundaryRequired: true,

    verificationState:
      "GOVERNED_EXECUTOR_INTEGRATION_HANDOFF_VERIFIED",

    handoff: {} as
      RiverDevGovernedExecutorIntegrationHandoffVerificationFoundation[
        "handoff"
      ],

    predecessorVerificationState: [
      "GOVERNED_EXECUTOR_INTEGRATION_VERIFIED"
    ],

    predecessorVerificationEvidence: [
      "verification-evidence"
    ],

    predecessorAcceptanceEvidence: [
      "acceptance-evidence"
    ],

    predecessorHandoffEvidence: [
      "handoff-evidence"
    ],

    verificationEvidence: [
      "Exact DEV-294 governed executor integration handoff verified."
    ],

    blockedReasons: [],

    verificationMayCreateAuthorization: false,
    verificationMayAuthorizeDownstreamAction: false,
    verificationMayExpandScope: false,
    verificationMayModifyRepository: false,
    verificationMayInvokeExecutor: false,
    verificationMayExecuteOperation: false,
    verificationMayPush: false,
    verificationMayDeploy: false
  };
}

test(
  "DEV-296 accepts an exact trusted DEV-295 verification as inert decision data",
  () => {
    const verification =
      createVerification();

    const result =
      buildGovernedExecutorIntegrationHandoffAcceptanceFoundation({
        verification
      });

    assert.equal(result.version, "DEV-296");
    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.accepted, true);

    assert.equal(
      result.acceptanceState,
      "GOVERNED_EXECUTOR_INTEGRATION_HANDOFF_ACCEPTED"
    );

    assert.equal(result.defaultPolicy, "DENY");
    assert.equal(result.acceptanceDecisionOnly, true);
    assert.equal(result.acceptanceResultIsInertData, true);
    assert.equal(result.futureDownstreamBoundaryRequired, true);

    assert.deepEqual(
      result.predecessorVerificationState,
      verification.predecessorVerificationState
    );

    assert.deepEqual(
      result.verificationEvidence,
      verification.verificationEvidence
    );

    assert.equal(result.blockedReasons.length, 0);
    assert.ok(result.acceptanceEvidence.length > 0);

    assert.equal(result.acceptanceMayCreateAuthorization, false);
    assert.equal(result.acceptanceMayAuthorizeDownstreamAction, false);
    assert.equal(result.acceptanceMayExpandScope, false);
    assert.equal(result.acceptanceMayModifyRepository, false);
    assert.equal(result.acceptanceMayInvokeExecutor, false);
    assert.equal(result.acceptanceMayExecuteOperation, false);
    assert.equal(result.acceptanceMayPush, false);
    assert.equal(result.acceptanceMayDeploy, false);
  }
);

test(
  "DEV-296 rejects an unverified DEV-295 predecessor",
  () => {
    const verification =
      createVerification();

    verification.verified = false;
    verification.verificationState =
      "GOVERNED_EXECUTOR_INTEGRATION_HANDOFF_NOT_VERIFIED";

    const result =
      buildGovernedExecutorIntegrationHandoffAcceptanceFoundation({
        verification
      });

    assert.equal(result.trusted, false);
    assert.equal(result.ready, false);
    assert.equal(result.accepted, false);

    assert.equal(
      result.acceptanceState,
      "GOVERNED_EXECUTOR_INTEGRATION_HANDOFF_REJECTED"
    );

    assert.ok(result.blockedReasons.length > 0);
    assert.deepEqual(result.acceptanceEvidence, []);
    assert.deepEqual(result.verificationEvidence, []);
  }
);

test(
  "DEV-296 rejects DEV-295 verification containing blocked reasons",
  () => {
    const verification =
      createVerification();

    verification.blockedReasons.push(
      "predecessor blocked"
    );

    const result =
      buildGovernedExecutorIntegrationHandoffAcceptanceFoundation({
        verification
      });

    assert.equal(result.accepted, false);

    assert.ok(
      result.blockedReasons.some(
        reason =>
          reason.includes("blocked reasons")
      )
    );
  }
);

test(
  "DEV-296 preserves zero downstream authority",
  () => {
    const result =
      buildGovernedExecutorIntegrationHandoffAcceptanceFoundation({
        verification: createVerification()
      });

    assert.equal(result.acceptanceMayCreateAuthorization, false);
    assert.equal(result.acceptanceMayAuthorizeDownstreamAction, false);
    assert.equal(result.acceptanceMayExpandScope, false);
    assert.equal(result.acceptanceMayModifyRepository, false);
    assert.equal(result.acceptanceMayInvokeExecutor, false);
    assert.equal(result.acceptanceMayExecuteOperation, false);
    assert.equal(result.acceptanceMayPush, false);
    assert.equal(result.acceptanceMayDeploy, false);
  }
);
