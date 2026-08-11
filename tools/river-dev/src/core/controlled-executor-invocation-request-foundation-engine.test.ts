import assert from "node:assert/strict";
import test from "node:test";

import {
  buildControlledExecutorInvocationRequestFoundation
} from "./controlled-executor-invocation-request-foundation-engine";

import type {
  RiverDevControlledExecutorInvocationRequestFoundationInput,
  RiverDevControlledExecutorOperationExecutionBoundaryFoundation
} from "../types";

function buildBoundary(): RiverDevControlledExecutorOperationExecutionBoundaryFoundation {
  return {
    version: "DEV-252",
    source: "DEV-252 test predecessor",
    objective: "test predecessor",

    trusted: true,
    ready: true,
    eligible: true,

    defaultPolicy: "DENY",
    boundaryDecisionOnly: true,

    executionAuthorization: {} as RiverDevControlledExecutorOperationExecutionBoundaryFoundation["executionAuthorization"],

    executionRequest: "execute approved operation",

    preparedOperation:
      "inspect-approved-repository-state",

    requiredCapability:
      "inspect-approved-repository-state",

    authorizedCapabilities: [
      "inspect-approved-repository-state"
    ],

    requiredCapabilityAuthorized: true,

    approvedExecutionScope: [
      "tools/river-dev/src/core/example.ts"
    ],

    boundaryState: [
      "future executor eligibility established"
    ],

    provenance: [
      "DEV-252"
    ],

    authorizationBoundaries: [
      "execution boundary cannot invoke the future executor"
    ],

    scopeBoundaries: [
      "future executor remains separately required for side effects"
    ],

    blockedReasons: [],

    boundaryMayCreateAuthorization: false,
    boundaryMayExpandScope: false,
    boundaryMayExecuteOperation: false,
    boundaryMayModifyRepository: false,
    boundaryMayInvokeExecutor: false,

    futureExecutorRequiredForSideEffects: true
  };
}

function buildInput(): RiverDevControlledExecutorInvocationRequestFoundationInput {
  return {
    executionBoundary: buildBoundary()
  };
}

test(
  "constructs an inert invocation request from an eligible DEV-252 boundary",
  () => {
    const result =
      buildControlledExecutorInvocationRequestFoundation(
        buildInput()
      );

    assert.equal(result.version, "DEV-253");
    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.requestConstructed, true);
    assert.equal(result.defaultPolicy, "DENY");
    assert.equal(result.requestConstructionOnly, true);
  }
);

test(
  "preserves the exact execution boundary",
  () => {
    const input = buildInput();

    const result =
      buildControlledExecutorInvocationRequestFoundation(
        input
      );

    assert.equal(
      result.executionBoundary,
      input.executionBoundary
    );
  }
);

test(
  "preserves execution request",
  () => {
    const input = buildInput();

    const result =
      buildControlledExecutorInvocationRequestFoundation(
        input
      );

    assert.equal(
      result.executionRequest,
      input.executionBoundary.executionRequest
    );
  }
);

test(
  "preserves exact prepared operation",
  () => {
    const input = buildInput();

    const result =
      buildControlledExecutorInvocationRequestFoundation(
        input
      );

    assert.equal(
      result.preparedOperation,
      input.executionBoundary.preparedOperation
    );
  }
);

test(
  "preserves exact required capability",
  () => {
    const input = buildInput();

    const result =
      buildControlledExecutorInvocationRequestFoundation(
        input
      );

    assert.equal(
      result.requiredCapability,
      input.executionBoundary.requiredCapability
    );
  }
);

test(
  "preserves capability authorization evidence",
  () => {
    const input = buildInput();

    const result =
      buildControlledExecutorInvocationRequestFoundation(
        input
      );

    assert.deepEqual(
      result.authorizedCapabilities,
      input.executionBoundary.authorizedCapabilities
    );

    assert.equal(
      result.requiredCapabilityAuthorized,
      true
    );
  }
);

test(
  "preserves approved execution scope",
  () => {
    const input = buildInput();

    const result =
      buildControlledExecutorInvocationRequestFoundation(
        input
      );

    assert.deepEqual(
      result.approvedExecutionScope,
      input.executionBoundary.approvedExecutionScope
    );
  }
);

test(
  "preserves authorization provenance",
  () => {
    const result =
      buildControlledExecutorInvocationRequestFoundation(
        buildInput()
      );

    assert.ok(
      result.provenance.includes("DEV-252")
    );

    assert.ok(
      result.provenance.includes("DEV-253")
    );
  }
);

test(
  "preserves inherited authorization boundaries",
  () => {
    const result =
      buildControlledExecutorInvocationRequestFoundation(
        buildInput()
      );

    assert.ok(
      result.authorizationBoundaries.includes(
        "execution boundary cannot invoke the future executor"
      )
    );
  }
);

test(
  "preserves inherited scope boundaries",
  () => {
    const result =
      buildControlledExecutorInvocationRequestFoundation(
        buildInput()
      );

    assert.ok(
      result.scopeBoundaries.includes(
        "future executor remains separately required for side effects"
      )
    );
  }
);

test(
  "fails closed when execution boundary is untrusted",
  () => {
    const input = buildInput();
    input.executionBoundary.trusted = false;

    const result =
      buildControlledExecutorInvocationRequestFoundation(
        input
      );

    assert.equal(result.requestConstructed, false);
    assert.equal(result.ready, false);

    assert.ok(
      result.blockedReasons.includes(
        "execution boundary is not trusted"
      )
    );
  }
);

test(
  "fails closed when execution boundary is not ready",
  () => {
    const input = buildInput();
    input.executionBoundary.ready = false;

    const result =
      buildControlledExecutorInvocationRequestFoundation(
        input
      );

    assert.equal(result.requestConstructed, false);

    assert.ok(
      result.blockedReasons.includes(
        "execution boundary is not ready"
      )
    );
  }
);

test(
  "fails closed when execution boundary is not eligible",
  () => {
    const input = buildInput();
    input.executionBoundary.eligible = false;

    const result =
      buildControlledExecutorInvocationRequestFoundation(
        input
      );

    assert.equal(result.requestConstructed, false);

    assert.ok(
      result.blockedReasons.includes(
        "execution boundary is not eligible"
      )
    );
  }
);

test(
  "fails closed when predecessor blockers exist",
  () => {
    const input = buildInput();

    input.executionBoundary.blockedReasons.push(
      "predecessor blocker"
    );

    const result =
      buildControlledExecutorInvocationRequestFoundation(
        input
      );

    assert.equal(result.requestConstructed, false);

    assert.ok(
      result.blockedReasons.includes(
        "execution boundary contains blockers"
      )
    );
  }
);

test(
  "fails closed without governed execution request",
  () => {
    const input = buildInput();
    input.executionBoundary.executionRequest = "";

    const result =
      buildControlledExecutorInvocationRequestFoundation(
        input
      );

    assert.equal(result.requestConstructed, false);

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
    input.executionBoundary.authorizedCapabilities = [];

    const result =
      buildControlledExecutorInvocationRequestFoundation(
        input
      );

    assert.equal(result.requestConstructed, false);

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

    input.executionBoundary.requiredCapabilityAuthorized =
      false;

    const result =
      buildControlledExecutorInvocationRequestFoundation(
        input
      );

    assert.equal(result.requestConstructed, false);

    assert.ok(
      result.blockedReasons.includes(
        "required capability is not authorized"
      )
    );
  }
);

test(
  "fails closed without approved execution scope",
  () => {
    const input = buildInput();
    input.executionBoundary.approvedExecutionScope = [];

    const result =
      buildControlledExecutorInvocationRequestFoundation(
        input
      );

    assert.equal(result.requestConstructed, false);

    assert.ok(
      result.blockedReasons.includes(
        "approved execution scope is missing"
      )
    );
  }
);

test(
  "invocation request grants no dispatch or execution authority",
  () => {
    const result =
      buildControlledExecutorInvocationRequestFoundation(
        buildInput()
      );

    assert.equal(
      result.invocationRequestMayCreateAuthorization,
      false
    );

    assert.equal(
      result.invocationRequestMayExpandScope,
      false
    );

    assert.equal(
      result.invocationRequestMayDispatch,
      false
    );

    assert.equal(
      result.invocationRequestMayInvokeExecutor,
      false
    );

    assert.equal(
      result.invocationRequestMayExecuteOperation,
      false
    );

    assert.equal(
      result.invocationRequestMayModifyRepository,
      false
    );
  }
);

test(
  "future dispatch boundary and executor remain separately required",
  () => {
    const result =
      buildControlledExecutorInvocationRequestFoundation(
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

    const originalAuthorizedCapabilities =
      [...input.executionBoundary.authorizedCapabilities];

    const originalScope =
      [...input.executionBoundary.approvedExecutionScope];

    const originalProvenance =
      [...input.executionBoundary.provenance];

    const originalAuthorizationBoundaries =
      [...input.executionBoundary.authorizationBoundaries];

    const originalScopeBoundaries =
      [...input.executionBoundary.scopeBoundaries];

    buildControlledExecutorInvocationRequestFoundation(
      input
    );

    assert.deepEqual(
      input.executionBoundary.authorizedCapabilities,
      originalAuthorizedCapabilities
    );

    assert.deepEqual(
      input.executionBoundary.approvedExecutionScope,
      originalScope
    );

    assert.deepEqual(
      input.executionBoundary.provenance,
      originalProvenance
    );

    assert.deepEqual(
      input.executionBoundary.authorizationBoundaries,
      originalAuthorizationBoundaries
    );

    assert.deepEqual(
      input.executionBoundary.scopeBoundaries,
      originalScopeBoundaries
    );
  }
);
