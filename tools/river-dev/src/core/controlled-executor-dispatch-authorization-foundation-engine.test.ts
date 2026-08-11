import assert from "node:assert/strict";
import test from "node:test";

import {
  buildControlledExecutorDispatchAuthorizationFoundation
} from "./controlled-executor-dispatch-authorization-foundation-engine";

import type {
  RiverDevControlledExecutorDispatchAuthorizationFoundationInput
} from "../types";

function buildInput():
RiverDevControlledExecutorDispatchAuthorizationFoundationInput {
  return {
    invocationRequest: {
      version: "DEV-253",
      source:
        "River Development Agent controlled executor invocation request foundation",
      objective:
        "Construct inert controlled executor invocation request data.",

      trusted: true,
      ready: true,
      requestConstructed: true,

      defaultPolicy: "DENY",
      requestConstructionOnly: true,

      executionBoundary: {} as RiverDevControlledExecutorDispatchAuthorizationFoundationInput[
        "invocationRequest"
      ]["executionBoundary"],

      executionRequest:
        "inspect approved repository state",

      preparedOperation:
        "inspect-approved-repository-state",

      requiredCapability:
        "inspect-approved-repository-state",

      authorizedCapabilities: [
        "inspect-approved-repository-state"
      ],

      requiredCapabilityAuthorized: true,

      approvedExecutionScope: [
        "approved/repository/path"
      ],

      invocationRequestState: [
        "invocation request constructed"
      ],

      provenance: [
        "DEV-253 predecessor provenance"
      ],

      authorizationBoundaries: [
        "authorization boundary preserved"
      ],

      scopeBoundaries: [
        "scope boundary preserved"
      ],

      blockedReasons: [],

      invocationRequestMayCreateAuthorization: false,
      invocationRequestMayExpandScope: false,
      invocationRequestMayInvokeExecutor: false,
      invocationRequestMayExecuteOperation: false,
      invocationRequestMayModifyRepository: false,
      invocationRequestMayDispatch: false,

      futureDispatchBoundaryRequired: true,
      futureExecutorRequiredForSideEffects: true
    }
  };
}

test(
  "authorizes dispatch decision for valid trusted invocation request",
  () => {
    const result =
      buildControlledExecutorDispatchAuthorizationFoundation(
        buildInput()
      );

    assert.equal(result.version, "DEV-254");
    assert.equal(result.defaultPolicy, "DENY");
    assert.equal(result.authorizationDecisionOnly, true);

    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.dispatchAuthorized, true);

    assert.deepEqual(result.blockedReasons, []);
  }
);

test(
  "preserves operation capability scope and provenance",
  () => {
    const input = buildInput();

    const result =
      buildControlledExecutorDispatchAuthorizationFoundation(
        input
      );

    assert.equal(
      result.preparedOperation,
      input.invocationRequest.preparedOperation
    );

    assert.equal(
      result.requiredCapability,
      input.invocationRequest.requiredCapability
    );

    assert.deepEqual(
      result.authorizedCapabilities,
      input.invocationRequest.authorizedCapabilities
    );

    assert.deepEqual(
      result.approvedExecutionScope,
      input.invocationRequest.approvedExecutionScope
    );

    assert.ok(
      result.provenance.includes(
        "DEV-253 predecessor provenance"
      )
    );

    assert.ok(
      result.authorizationBoundaries.includes(
        "authorization boundary preserved"
      )
    );

    assert.ok(
      result.scopeBoundaries.includes(
        "scope boundary preserved"
      )
    );
  }
);

test(
  "records decision-only dispatch authorization boundaries",
  () => {
    const result =
      buildControlledExecutorDispatchAuthorizationFoundation(
        buildInput()
      );

    assert.ok(
      result.authorizationBoundaries.includes(
        "dispatch authorization is decision-only"
      )
    );

    assert.ok(
      result.scopeBoundaries.includes(
        "future dispatch boundary remains separately required"
      )
    );

    assert.ok(
      result.scopeBoundaries.includes(
        "future executor remains separately required for side effects"
      )
    );
  }
);

test(
  "fails closed when invocation request is untrusted",
  () => {
    const input = buildInput();
    input.invocationRequest.trusted = false;

    const result =
      buildControlledExecutorDispatchAuthorizationFoundation(
        input
      );

    assert.equal(result.dispatchAuthorized, false);
    assert.equal(result.ready, false);

    assert.ok(
      result.blockedReasons.includes(
        "invocation request is not trusted"
      )
    );
  }
);

test(
  "fails closed when invocation request is not ready",
  () => {
    const input = buildInput();
    input.invocationRequest.ready = false;

    const result =
      buildControlledExecutorDispatchAuthorizationFoundation(
        input
      );

    assert.equal(result.dispatchAuthorized, false);

    assert.ok(
      result.blockedReasons.includes(
        "invocation request is not ready"
      )
    );
  }
);

test(
  "fails closed when invocation request is not constructed",
  () => {
    const input = buildInput();
    input.invocationRequest.requestConstructed = false;

    const result =
      buildControlledExecutorDispatchAuthorizationFoundation(
        input
      );

    assert.equal(result.dispatchAuthorized, false);

    assert.ok(
      result.blockedReasons.includes(
        "invocation request is not constructed"
      )
    );
  }
);

test(
  "fails closed when predecessor blockers exist",
  () => {
    const input = buildInput();

    input.invocationRequest.blockedReasons.push(
      "predecessor blocker"
    );

    const result =
      buildControlledExecutorDispatchAuthorizationFoundation(
        input
      );

    assert.equal(result.dispatchAuthorized, false);

    assert.ok(
      result.blockedReasons.includes(
        "invocation request contains blockers"
      )
    );
  }
);

test(
  "fails closed without governed execution request",
  () => {
    const input = buildInput();
    input.invocationRequest.executionRequest = "";

    const result =
      buildControlledExecutorDispatchAuthorizationFoundation(
        input
      );

    assert.equal(result.dispatchAuthorized, false);

    assert.ok(
      result.blockedReasons.includes(
        "governed execution request is missing"
      )
    );
  }
);

test(
  "fails closed without authorized capability evidence",
  () => {
    const input = buildInput();

    input.invocationRequest.authorizedCapabilities =
      [];

    const result =
      buildControlledExecutorDispatchAuthorizationFoundation(
        input
      );

    assert.equal(result.dispatchAuthorized, false);

    assert.ok(
      result.blockedReasons.includes(
        "authorized capability evidence is missing"
      )
    );
  }
);

test(
  "fails closed when required capability is unauthorized",
  () => {
    const input = buildInput();

    input.invocationRequest.requiredCapabilityAuthorized =
      false;

    const result =
      buildControlledExecutorDispatchAuthorizationFoundation(
        input
      );

    assert.equal(result.dispatchAuthorized, false);

    assert.ok(
      result.blockedReasons.includes(
        "required capability is not authorized"
      )
    );
  }
);

test(
  "fails closed when required capability evidence does not match",
  () => {
    const input = buildInput();

    input.invocationRequest.authorizedCapabilities = [
      "prepare-approved-repository-change"
    ];

    const result =
      buildControlledExecutorDispatchAuthorizationFoundation(
        input
      );

    assert.equal(result.dispatchAuthorized, false);

    assert.ok(
      result.blockedReasons.includes(
        "required capability is absent from authorized capability evidence"
      )
    );
  }
);

test(
  "fails closed without approved execution scope",
  () => {
    const input = buildInput();

    input.invocationRequest.approvedExecutionScope =
      [];

    const result =
      buildControlledExecutorDispatchAuthorizationFoundation(
        input
      );

    assert.equal(result.dispatchAuthorized, false);

    assert.ok(
      result.blockedReasons.includes(
        "approved execution scope is missing"
      )
    );
  }
);

test(
  "fails closed if predecessor already grants dispatch authority",
  () => {
    const input = buildInput();

    const mutable =
      input.invocationRequest as unknown as {
        invocationRequestMayDispatch: boolean;
      };

    mutable.invocationRequestMayDispatch = true;

    const result =
      buildControlledExecutorDispatchAuthorizationFoundation(
        input
      );

    assert.equal(result.dispatchAuthorized, false);

    assert.ok(
      result.blockedReasons.includes(
        "invocation request already grants dispatch authority"
      )
    );
  }
);

test(
  "fails closed if future dispatch boundary is removed",
  () => {
    const input = buildInput();

    const mutable =
      input.invocationRequest as unknown as {
        futureDispatchBoundaryRequired: boolean;
      };

    mutable.futureDispatchBoundaryRequired = false;

    const result =
      buildControlledExecutorDispatchAuthorizationFoundation(
        input
      );

    assert.equal(result.dispatchAuthorized, false);

    assert.ok(
      result.blockedReasons.includes(
        "future dispatch boundary is not required"
      )
    );
  }
);

test(
  "fails closed if future executor requirement is removed",
  () => {
    const input = buildInput();

    const mutable =
      input.invocationRequest as unknown as {
        futureExecutorRequiredForSideEffects: boolean;
      };

    mutable.futureExecutorRequiredForSideEffects =
      false;

    const result =
      buildControlledExecutorDispatchAuthorizationFoundation(
        input
      );

    assert.equal(result.dispatchAuthorized, false);

    assert.ok(
      result.blockedReasons.includes(
        "future executor is not required for side effects"
      )
    );
  }
);

test(
  "dispatch authorization grants no dispatch or execution authority",
  () => {
    const result =
      buildControlledExecutorDispatchAuthorizationFoundation(
        buildInput()
      );

    assert.equal(
      result.dispatchAuthorizationMayCreateAuthorization,
      false
    );

    assert.equal(
      result.dispatchAuthorizationMayExpandScope,
      false
    );

    assert.equal(
      result.dispatchAuthorizationMayDispatch,
      false
    );

    assert.equal(
      result.dispatchAuthorizationMayInvokeExecutor,
      false
    );

    assert.equal(
      result.dispatchAuthorizationMayExecuteOperation,
      false
    );

    assert.equal(
      result.dispatchAuthorizationMayModifyRepository,
      false
    );
  }
);

test(
  "future dispatch boundary and executor remain separately required",
  () => {
    const result =
      buildControlledExecutorDispatchAuthorizationFoundation(
        buildInput()
      );

    assert.equal(
      result.futureDispatchBoundaryRequired,
      true
    );

    assert.equal(
      result.futureExecutorRequiredForSideEffects,
      true
    );
  }
);

test(
  "does not mutate predecessor arrays",
  () => {
    const input = buildInput();

    const originalAuthorizedCapabilities = [
      ...input.invocationRequest.authorizedCapabilities
    ];

    const originalScope = [
      ...input.invocationRequest.approvedExecutionScope
    ];

    const originalProvenance = [
      ...input.invocationRequest.provenance
    ];

    const originalAuthorizationBoundaries = [
      ...input.invocationRequest.authorizationBoundaries
    ];

    const originalScopeBoundaries = [
      ...input.invocationRequest.scopeBoundaries
    ];

    buildControlledExecutorDispatchAuthorizationFoundation(
      input
    );

    assert.deepEqual(
      input.invocationRequest.authorizedCapabilities,
      originalAuthorizedCapabilities
    );

    assert.deepEqual(
      input.invocationRequest.approvedExecutionScope,
      originalScope
    );

    assert.deepEqual(
      input.invocationRequest.provenance,
      originalProvenance
    );

    assert.deepEqual(
      input.invocationRequest.authorizationBoundaries,
      originalAuthorizationBoundaries
    );

    assert.deepEqual(
      input.invocationRequest.scopeBoundaries,
      originalScopeBoundaries
    );
  }
);
