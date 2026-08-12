import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGovernedExecutorIntegrationHandoffFoundation
} from "./governed-executor-integration-handoff-foundation-engine";

import type {
  RiverDevGovernedExecutorIntegrationAcceptanceFoundation
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

    verification: {} as
      RiverDevGovernedExecutorIntegrationAcceptanceFoundation["verification"],

    verificationState: [
      "verification-state"
    ],

    verificationEvidence: [
      "verification-evidence"
    ],

    acceptanceEvidence: [
      "acceptance-evidence"
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

test(
  "DEV-294 creates an inert handoff from an exact accepted DEV-293 result",
  () => {
    const acceptance =
      buildAcceptance();

    const result =
      buildGovernedExecutorIntegrationHandoffFoundation({
        acceptance
      });

    assert.equal(result.version, "DEV-294");

    assert.equal(
      result.source,
      "governed-executor-integration-handoff-foundation"
    );

    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.handoffReady, true);

    assert.equal(result.defaultPolicy, "DENY");
    assert.equal(result.handoffOnly, true);
    assert.equal(
      result.handoffResultIsInertData,
      true
    );

    assert.equal(
      result.futureDownstreamBoundaryRequired,
      true
    );

    assert.equal(
      result.handoffState,
      "GOVERNED_EXECUTOR_INTEGRATION_HANDOFF_READY"
    );

    assert.deepEqual(
      result.verificationState,
      acceptance.verificationState
    );

    assert.deepEqual(
      result.verificationEvidence,
      acceptance.verificationEvidence
    );

    assert.deepEqual(
      result.acceptanceEvidence,
      acceptance.acceptanceEvidence
    );

    assert.ok(result.handoffEvidence.length > 0);
    assert.deepEqual(result.blockedReasons, []);
  }
);

test(
  "DEV-294 rejects a DEV-293 result that was not accepted",
  () => {
    const acceptance =
      buildAcceptance();

    const malformed = {
      ...acceptance,
      accepted: false,
      acceptanceState:
        "GOVERNED_EXECUTOR_INTEGRATION_REJECTED" as const
    };

    const result =
      buildGovernedExecutorIntegrationHandoffFoundation({
        acceptance: malformed
      });

    assert.equal(result.trusted, false);
    assert.equal(result.ready, false);
    assert.equal(result.handoffReady, false);

    assert.equal(
      result.handoffState,
      "GOVERNED_EXECUTOR_INTEGRATION_HANDOFF_BLOCKED"
    );

    assert.equal(
      result.blockedReasons.length > 0,
      true
    );

    assert.deepEqual(result.verificationState, []);
    assert.deepEqual(result.verificationEvidence, []);
    assert.deepEqual(result.acceptanceEvidence, []);
    assert.deepEqual(result.handoffEvidence, []);
  }
);

test(
  "DEV-294 rejects predecessor blocked reasons",
  () => {
    const acceptance = {
      ...buildAcceptance(),
      blockedReasons: [
        "predecessor blocked"
      ]
    };

    const result =
      buildGovernedExecutorIntegrationHandoffFoundation({
        acceptance
      });

    assert.equal(result.handoffReady, false);

    assert.equal(
      result.blockedReasons.some(
        (reason) =>
          reason.includes(
            "must contain no blocked reasons"
          )
      ),
      true
    );
  }
);

test(
  "DEV-294 handoff remains inert and grants no downstream authority",
  () => {
    const result =
      buildGovernedExecutorIntegrationHandoffFoundation({
        acceptance: buildAcceptance()
      });

    assert.equal(
      result.handoffMayCreateAuthorization,
      false
    );

    assert.equal(
      result.handoffMayAuthorizeDownstreamAction,
      false
    );

    assert.equal(
      result.handoffMayExpandScope,
      false
    );

    assert.equal(
      result.handoffMayModifyRepository,
      false
    );

    assert.equal(
      result.handoffMayInvokeExecutor,
      false
    );

    assert.equal(
      result.handoffMayExecuteOperation,
      false
    );

    assert.equal(result.handoffMayPush, false);
    assert.equal(result.handoffMayDeploy, false);
  }
);
