import assert from "node:assert/strict";
import test from "node:test";

import {
  verifyGovernedExecutorIntegrationHandoffFoundation
} from "./governed-executor-integration-handoff-verification-foundation-engine";

import {
  buildGovernedExecutorIntegrationHandoffFoundation
} from "./governed-executor-integration-handoff-foundation-engine";

import type {
  RiverDevGovernedExecutorIntegrationAcceptanceFoundation,
  RiverDevGovernedExecutorIntegrationHandoffFoundation,
  RiverDevGovernedExecutorIntegrationVerificationFoundation
} from "../types";

function buildAcceptance():
RiverDevGovernedExecutorIntegrationAcceptanceFoundation {
  return {
    version: "DEV-293",
    source: "governed-executor-integration-acceptance-foundation",

    trusted: true,
    ready: true,
    accepted: true,

    defaultPolicy: "DENY",
    acceptanceDecisionOnly: true,
    acceptanceResultIsInertData: true,

    acceptanceState:
      "GOVERNED_EXECUTOR_INTEGRATION_ACCEPTED",

    verification: {
      version: "DEV-292",
      source:
        "governed-executor-integration-verification-foundation",

      trusted: true,
      ready: true,
      verified: true,

      defaultPolicy: "DENY",
      verificationDecisionOnly: true,

      governedExecutorIntegration: {} as
        RiverDevGovernedExecutorIntegrationVerificationFoundation[
          "governedExecutorIntegration"
        ],

      verificationState: [
        "GOVERNED_EXECUTOR_INTEGRATION_VERIFIED"
      ],

      verificationEvidence: [
        "verification evidence"
      ],

      blockedReasons: [],

      verificationMayCreateAuthorization: false,
      verificationMayExpandScope: false,
      verificationMayModifyRepository: false,
      verificationMayExecuteOperation: false,
      verificationMayPush: false,
      verificationMayDeploy: false
    },

    verificationState: [
      "GOVERNED_EXECUTOR_INTEGRATION_VERIFIED"
    ],

    verificationEvidence: [
      "verification evidence"
    ],

    acceptanceEvidence: [
      "acceptance evidence"
    ],

    blockedReasons: [],

    acceptanceMayCreateAuthorization: false,
    acceptanceMayExpandScope: false,
    acceptanceMayModifyRepository: false,
    acceptanceMayExecuteOperation: false,
    acceptanceMayPush: false,
    acceptanceMayDeploy: false
  };
}

function buildHandoff():
RiverDevGovernedExecutorIntegrationHandoffFoundation {
  return buildGovernedExecutorIntegrationHandoffFoundation({
    acceptance: buildAcceptance()
  });
}

test(
  "DEV-295 verifies an exact ready DEV-294 inert handoff",
  () => {
    const handoff = buildHandoff();

    const result =
      verifyGovernedExecutorIntegrationHandoffFoundation({
        handoff
      });

    assert.equal(result.version, "DEV-295");
    assert.equal(
      result.source,
      "governed-executor-integration-handoff-verification-foundation"
    );

    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.verified, true);

    assert.equal(result.defaultPolicy, "DENY");
    assert.equal(result.verificationOnly, true);
    assert.equal(
      result.verificationResultIsInertData,
      true
    );

    assert.equal(
      result.verificationState,
      "GOVERNED_EXECUTOR_INTEGRATION_HANDOFF_VERIFIED"
    );

    assert.deepEqual(
      result.predecessorVerificationState,
      handoff.verificationState
    );

    assert.deepEqual(
      result.predecessorVerificationEvidence,
      handoff.verificationEvidence
    );

    assert.deepEqual(
      result.predecessorAcceptanceEvidence,
      handoff.acceptanceEvidence
    );

    assert.deepEqual(
      result.predecessorHandoffEvidence,
      handoff.handoffEvidence
    );

    assert.ok(result.verificationEvidence.length > 0);
    assert.deepEqual(result.blockedReasons, []);
  }
);

test(
  "DEV-295 fails closed when DEV-294 handoff readiness is malformed",
  () => {
    const malformed = {
      ...buildHandoff(),
      handoffReady: false
    } as RiverDevGovernedExecutorIntegrationHandoffFoundation;

    const result =
      verifyGovernedExecutorIntegrationHandoffFoundation({
        handoff: malformed
      });

    assert.equal(result.trusted, false);
    assert.equal(result.ready, false);
    assert.equal(result.verified, false);

    assert.equal(
      result.verificationState,
      "GOVERNED_EXECUTOR_INTEGRATION_HANDOFF_NOT_VERIFIED"
    );

    assert.ok(result.blockedReasons.length > 0);
    assert.deepEqual(result.verificationEvidence, []);
  }
);

test(
  "DEV-295 fails closed when DEV-294 contains predecessor blocking",
  () => {
    const malformed = {
      ...buildHandoff(),
      blockedReasons: [
        "predecessor blocked"
      ]
    };

    const result =
      verifyGovernedExecutorIntegrationHandoffFoundation({
        handoff: malformed
      });

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
  "DEV-295 verification remains inert and grants no downstream authority",
  () => {
    const result =
      verifyGovernedExecutorIntegrationHandoffFoundation({
        handoff: buildHandoff()
      });

    assert.equal(
      result.verificationMayCreateAuthorization,
      false
    );

    assert.equal(
      result.verificationMayAuthorizeDownstreamAction,
      false
    );

    assert.equal(
      result.verificationMayExpandScope,
      false
    );

    assert.equal(
      result.verificationMayModifyRepository,
      false
    );

    assert.equal(
      result.verificationMayInvokeExecutor,
      false
    );

    assert.equal(
      result.verificationMayExecuteOperation,
      false
    );

    assert.equal(result.verificationMayPush, false);
    assert.equal(result.verificationMayDeploy, false);
  }
);
