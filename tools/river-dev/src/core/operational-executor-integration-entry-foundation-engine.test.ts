import assert from "node:assert/strict";
import test from "node:test";

import {
  establishOperationalExecutorIntegrationEntryFoundation
} from "./operational-executor-integration-entry-foundation-engine";

test(
  "admits dry-run without mutation authorization",
  () => {

    const result =
      establishOperationalExecutorIntegrationEntryFoundation({
        requestedMode:
          "dry-run",

        authorization:
          null
      });

    assert.equal(
      result.entryState,
      "DRY_RUN_ADMITTED"
    );

    assert.equal(
      result.admitted,
      true
    );

    assert.equal(
      result.effectiveMode,
      "dry-run"
    );

    assert.equal(
      result.governedApplyAuthorized,
      false
    );

    assert.equal(
      result.operationalExecutionPerformed,
      false
    );
  }
);

test(
  "denies apply when governed authorization is absent",
  () => {

    const result =
      establishOperationalExecutorIntegrationEntryFoundation({
        requestedMode:
          "apply",

        authorization:
          null
      });

    assert.equal(
      result.entryState,
      "APPLY_DENIED"
    );

    assert.equal(
      result.admitted,
      false
    );

    assert.equal(
      result.effectiveMode,
      "dry-run"
    );

    assert.equal(
      result.authorizationState,
      "AUTHORIZATION_ABSENT"
    );

    assert.equal(
      result.requestedApplyIsAuthorization,
      false
    );
  }
);

test(
  "denies apply when governed authorization is unauthorized",
  () => {

    const result =
      establishOperationalExecutorIntegrationEntryFoundation({
        requestedMode:
          "apply",

        authorization: {
          authorizationState:
            "OPERATION_EXECUTION_UNAUTHORIZED"
        }
      });

    assert.equal(
      result.entryState,
      "APPLY_DENIED"
    );

    assert.equal(
      result.governedAuthorizationPresent,
      true
    );

    assert.equal(
      result.governedApplyAuthorized,
      false
    );

    assert.equal(
      result.operationalExecutionPerformed,
      false
    );
  }
);

test(
  "admits apply only with preexisting OPERATION_EXECUTION_AUTHORIZED state",
  () => {

    const result =
      establishOperationalExecutorIntegrationEntryFoundation({
        requestedMode:
          "apply",

        authorization: {
          authorizationState:
            "OPERATION_EXECUTION_AUTHORIZED"
        }
      });

    assert.equal(
      result.entryState,
      "APPLY_ADMITTED"
    );

    assert.equal(
      result.admitted,
      true
    );

    assert.equal(
      result.effectiveMode,
      "apply"
    );

    assert.equal(
      result.governedApplyAuthorized,
      true
    );

    assert.equal(
      result.createsAuthorization,
      false
    );

    assert.equal(
      result.upgradesAuthorization,
      false
    );
  }
);

test(
  "never grants broad repository authority or performs execution",
  () => {

    const result =
      establishOperationalExecutorIntegrationEntryFoundation({
        requestedMode:
          "apply",

        authorization: {
          authorizationState:
            "OPERATION_EXECUTION_AUTHORIZED"
        }
      });

    assert.equal(
      result.grantsArbitraryRepositoryMutation,
      false
    );

    assert.equal(
      result.requestedApplyIsAuthorization,
      false
    );

    assert.equal(
      result.operationalExecutionPerformed,
      false
    );

    assert.equal(
      result.defaultPolicy,
      "DENY"
    );
  }
);
