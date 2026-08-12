import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGovernedExecutorIntegrationAcceptanceFoundation
} from "./governed-executor-integration-acceptance-foundation-engine";

import type {
  RiverDevGovernedExecutorIntegrationVerificationFoundation
} from "../types";

function createVerification(
  overrides: Partial<RiverDevGovernedExecutorIntegrationVerificationFoundation> = {}
): RiverDevGovernedExecutorIntegrationVerificationFoundation {
  return {
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
      "DEV-292 verification evidence."
    ],

    blockedReasons: [],

    verificationMayCreateAuthorization: false,
    verificationMayExpandScope: false,
    verificationMayModifyRepository: false,
    verificationMayExecuteOperation: false,
    verificationMayPush: false,
    verificationMayDeploy: false,

    ...overrides
  };
}

test(
  "DEV-293 accepts an exact trusted ready verified DEV-292 result",
  () => {
    const verification =
      createVerification();

    const result =
      buildGovernedExecutorIntegrationAcceptanceFoundation({
        verification
      });

    assert.equal(result.version, "DEV-293");
    assert.equal(
      result.source,
      "governed-executor-integration-acceptance-foundation"
    );

    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.accepted, true);

    assert.equal(result.defaultPolicy, "DENY");
    assert.equal(result.acceptanceDecisionOnly, true);
    assert.equal(result.acceptanceResultIsInertData, true);

    assert.equal(
      result.acceptanceState,
      "GOVERNED_EXECUTOR_INTEGRATION_ACCEPTED"
    );

    assert.deepEqual(
      result.verificationState,
      verification.verificationState
    );

    assert.deepEqual(
      result.verificationEvidence,
      verification.verificationEvidence
    );

    assert.ok(result.acceptanceEvidence.length > 0);
    assert.deepEqual(result.blockedReasons, []);

    assert.equal(
      result.acceptanceMayCreateAuthorization,
      false
    );

    assert.equal(
      result.acceptanceMayExpandScope,
      false
    );

    assert.equal(
      result.acceptanceMayModifyRepository,
      false
    );

    assert.equal(
      result.acceptanceMayExecuteOperation,
      false
    );

    assert.equal(result.acceptanceMayPush, false);
    assert.equal(result.acceptanceMayDeploy, false);
  }
);

test(
  "DEV-293 rejects an unverified predecessor",
  () => {
    const result =
      buildGovernedExecutorIntegrationAcceptanceFoundation({
        verification:
          createVerification({
            verified: false
          })
      });

    assert.equal(result.accepted, false);
    assert.equal(result.trusted, false);
    assert.equal(result.ready, false);

    assert.equal(
      result.acceptanceState,
      "GOVERNED_EXECUTOR_INTEGRATION_REJECTED"
    );

    assert.ok(
      result.blockedReasons.includes(
        "DEV-292 verification must be verified."
      )
    );

    assert.deepEqual(result.verificationState, []);
    assert.deepEqual(result.verificationEvidence, []);
    assert.deepEqual(result.acceptanceEvidence, []);
  }
);

test(
  "DEV-293 rejects predecessor blocked reasons",
  () => {
    const result =
      buildGovernedExecutorIntegrationAcceptanceFoundation({
        verification:
          createVerification({
            blockedReasons: [
              "Synthetic DEV-292 block."
            ]
          })
      });

    assert.equal(result.accepted, false);

    assert.ok(
      result.blockedReasons.includes(
        "DEV-292 verification must contain no blocked reasons."
      )
    );
  }
);

test(
  "DEV-293 remains inert and grants no new authority",
  () => {
    const result =
      buildGovernedExecutorIntegrationAcceptanceFoundation({
        verification:
          createVerification()
      });

    assert.equal(result.acceptanceDecisionOnly, true);
    assert.equal(result.acceptanceResultIsInertData, true);

    assert.equal(
      result.acceptanceMayCreateAuthorization,
      false
    );

    assert.equal(result.acceptanceMayExpandScope, false);
    assert.equal(result.acceptanceMayModifyRepository, false);
    assert.equal(result.acceptanceMayExecuteOperation, false);
    assert.equal(result.acceptanceMayPush, false);
    assert.equal(result.acceptanceMayDeploy, false);
  }
);
