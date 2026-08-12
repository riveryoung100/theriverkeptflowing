import assert from "node:assert/strict";
import test from "node:test";

import type {
  RiverDevControlledExecutorOperationExecutionAuthorizationFoundation
} from "../types";

import {
  buildGovernedExecutorIntegrationFoundation
} from "./governed-executor-integration-foundation-engine";

function createAuthorization(
  overrides: Partial<RiverDevControlledExecutorOperationExecutionAuthorizationFoundation> = {}
): RiverDevControlledExecutorOperationExecutionAuthorizationFoundation {
  return {
    version: "DEV-251",
    source: "test-authorization",
    objective: "test governed executor integration",

    trusted: true,
    ready: true,
    authorized: true,

    defaultPolicy: "DENY",
    authorizationDecisionOnly: true,

    operationPreparation: {} as RiverDevControlledExecutorOperationExecutionAuthorizationFoundation["operationPreparation"],

    executionRequest: "test",

    preparedOperation: {} as RiverDevControlledExecutorOperationExecutionAuthorizationFoundation["preparedOperation"],
    requiredCapability: {} as RiverDevControlledExecutorOperationExecutionAuthorizationFoundation["requiredCapability"],

    authorizedCapabilities: [],

    requiredCapabilityAuthorized: true,

    approvedExecutionScope: [],

    authorizationState: [],

    provenance: [
      "DEV-251"
    ],

    authorizationBoundaries: [],
    scopeBoundaries: [],

    blockedReasons: [],

    authorizationMayCreateCapabilityAuthorization: false,
    authorizationMayExpandScope: false,
    authorizationMayExecuteOperation: false,
    authorizationMayModifyRepository: false,

    ...overrides
  };
}

test(
  "defaults to deny semantics and remains decision-only",
  () => {
    const result =
      buildGovernedExecutorIntegrationFoundation({
        executionAuthorization:
          createAuthorization(),
        requestedMode:
          "dry-run"
      });

    assert.equal(
      result.version,
      "DEV-291"
    );

    assert.equal(
      result.defaultPolicy,
      "DENY"
    );

    assert.equal(
      result.integrationDecisionOnly,
      true
    );

    assert.equal(
      result.integrationMayCreateAuthorization,
      false
    );

    assert.equal(
      result.integrationMayExpandScope,
      false
    );

    assert.equal(
      result.integrationMayModifyRepository,
      false
    );

    assert.equal(
      result.integrationMayExecuteOperation,
      false
    );
  }
);

test(
  "preserves dry-run when authorization is trusted and ready",
  () => {
    const result =
      buildGovernedExecutorIntegrationFoundation({
        executionAuthorization:
          createAuthorization(),
        requestedMode:
          "dry-run"
      });

    assert.equal(
      result.authorized,
      true
    );

    assert.equal(
      result.effectiveMode,
      "dry-run"
    );
  }
);

test(
  "permits apply mode only when execution authorization is satisfied",
  () => {
    const result =
      buildGovernedExecutorIntegrationFoundation({
        executionAuthorization:
          createAuthorization(),
        requestedMode:
          "apply"
      });

    assert.equal(
      result.authorized,
      true
    );

    assert.equal(
      result.authorizationSatisfied,
      true
    );

    assert.equal(
      result.effectiveMode,
      "apply"
    );
  }
);

test(
  "fails closed when apply authorization is absent",
  () => {
    const result =
      buildGovernedExecutorIntegrationFoundation({
        executionAuthorization:
          createAuthorization({
            authorized:
              false
          }),
        requestedMode:
          "apply"
      });

    assert.equal(
      result.authorized,
      false
    );

    assert.equal(
      result.effectiveMode,
      "dry-run"
    );

    assert.ok(
      result.blockedReasons.includes(
        "APPLY_NOT_AUTHORIZED"
      )
    );
  }
);

test(
  "fails closed when required capability is unauthorized",
  () => {
    const result =
      buildGovernedExecutorIntegrationFoundation({
        executionAuthorization:
          createAuthorization({
            requiredCapabilityAuthorized:
              false
          }),
        requestedMode:
          "apply"
      });

    assert.equal(
      result.authorized,
      false
    );

    assert.equal(
      result.effectiveMode,
      "dry-run"
    );

    assert.ok(
      result.blockedReasons.includes(
        "REQUIRED_CAPABILITY_NOT_AUTHORIZED"
      )
    );
  }
);

test(
  "fails closed when predecessor authorization is untrusted",
  () => {
    const result =
      buildGovernedExecutorIntegrationFoundation({
        executionAuthorization:
          createAuthorization({
            trusted:
              false
          }),
        requestedMode:
          "apply"
      });

    assert.equal(
      result.trusted,
      false
    );

    assert.equal(
      result.authorized,
      false
    );

    assert.equal(
      result.effectiveMode,
      "dry-run"
    );

    assert.ok(
      result.blockedReasons.includes(
        "EXECUTION_AUTHORIZATION_NOT_TRUSTED"
      )
    );
  }
);
