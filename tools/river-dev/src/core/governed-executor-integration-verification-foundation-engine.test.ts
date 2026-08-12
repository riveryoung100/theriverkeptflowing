import assert from "node:assert/strict";
import test from "node:test";

import type {
  RiverDevGovernedExecutorIntegrationFoundation
} from "../types";

import {
  buildGovernedExecutorIntegrationVerificationFoundation
} from "./governed-executor-integration-verification-foundation-engine";

function createIntegration(
  overrides: Partial<RiverDevGovernedExecutorIntegrationFoundation> = {}
): RiverDevGovernedExecutorIntegrationFoundation {
  return {
    version: "DEV-291",
    source:
      "governed-executor-integration-foundation",

    trusted: true,
    ready: true,
    authorized: true,

    defaultPolicy: "DENY",
    integrationDecisionOnly: true,

    requestedMode: "dry-run",
    effectiveMode: "dry-run",

    executionAuthorization:
      {} as RiverDevGovernedExecutorIntegrationFoundation["executionAuthorization"],

    authorizationRequiredForApply: true,
    authorizationSatisfied: true,

    blockedReasons: [],

    provenance: [
      "DEV-291"
    ],

    integrationMayCreateAuthorization: false,
    integrationMayExpandScope: false,
    integrationMayModifyRepository: false,
    integrationMayExecuteOperation: false,

    ...overrides
  };
}

test(
  "verifies a valid dry-run integration decision",
  () => {
    const result =
      buildGovernedExecutorIntegrationVerificationFoundation({
        governedExecutorIntegration:
          createIntegration()
      });

    assert.equal(result.verified, true);
    assert.equal(result.defaultPolicy, "DENY");
    assert.equal(result.verificationDecisionOnly, true);
  }
);

test(
  "verifies a valid authorized apply integration decision",
  () => {
    const result =
      buildGovernedExecutorIntegrationVerificationFoundation({
        governedExecutorIntegration:
          createIntegration({
            requestedMode: "apply",
            effectiveMode: "apply",
            trusted: true,
            ready: true,
            authorized: true,
            authorizationSatisfied: true
          })
      });

    assert.equal(result.verified, true);
  }
);

test(
  "fails closed for unauthorized effective apply",
  () => {
    const result =
      buildGovernedExecutorIntegrationVerificationFoundation({
        governedExecutorIntegration:
          createIntegration({
            requestedMode: "apply",
            effectiveMode: "apply",
            authorized: false
          })
      });

    assert.equal(result.verified, false);

    assert.ok(
      result.blockedReasons.includes(
        "UNAUTHORIZED_APPLY_EFFECTIVE_MODE"
      )
    );
  }
);

test(
  "fails closed for unsatisfied authorization effective apply",
  () => {
    const result =
      buildGovernedExecutorIntegrationVerificationFoundation({
        governedExecutorIntegration:
          createIntegration({
            requestedMode: "apply",
            effectiveMode: "apply",
            authorizationSatisfied: false
          })
      });

    assert.equal(result.verified, false);
  }
);

test(
  "fails closed for untrusted effective apply",
  () => {
    const result =
      buildGovernedExecutorIntegrationVerificationFoundation({
        governedExecutorIntegration:
          createIntegration({
            requestedMode: "apply",
            effectiveMode: "apply",
            trusted: false
          })
      });

    assert.equal(result.verified, false);
  }
);

test(
  "fails closed for unready effective apply",
  () => {
    const result =
      buildGovernedExecutorIntegrationVerificationFoundation({
        governedExecutorIntegration:
          createIntegration({
            requestedMode: "apply",
            effectiveMode: "apply",
            ready: false
          })
      });

    assert.equal(result.verified, false);
  }
);

test(
  "verification remains inert and grants no execution authority",
  () => {
    const result =
      buildGovernedExecutorIntegrationVerificationFoundation({
        governedExecutorIntegration:
          createIntegration()
      });

    assert.equal(
      result.verificationMayCreateAuthorization,
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
      result.verificationMayExecuteOperation,
      false
    );

    assert.equal(
      result.verificationMayPush,
      false
    );

    assert.equal(
      result.verificationMayDeploy,
      false
    );
  }
);

test(
  "produces deterministic verification output",
  () => {
    const predecessor =
      createIntegration({
        requestedMode: "apply",
        effectiveMode: "apply"
      });

    const first =
      buildGovernedExecutorIntegrationVerificationFoundation({
        governedExecutorIntegration:
          predecessor
      });

    const second =
      buildGovernedExecutorIntegrationVerificationFoundation({
        governedExecutorIntegration:
          predecessor
      });

    assert.deepEqual(first, second);
  }
);
