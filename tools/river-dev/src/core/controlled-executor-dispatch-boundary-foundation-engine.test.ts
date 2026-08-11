import assert from "node:assert/strict";
import test from "node:test";

import {
  buildControlledExecutorDispatchBoundaryFoundation
} from "./controlled-executor-dispatch-boundary-foundation-engine";

import type {
  RiverDevControlledExecutorDispatchBoundaryFoundationInput
} from "../types";

function buildInput():
RiverDevControlledExecutorDispatchBoundaryFoundationInput {
  return {
    dispatchAuthorization: {
      version: "DEV-254",
      source:
        "River Development Agent controlled executor dispatch authorization foundation",
      objective:
        "Provide deterministic dispatch authorization decision.",

      trusted: true,
      ready: true,
      dispatchAuthorized: true,

      defaultPolicy: "DENY",
      authorizationDecisionOnly: true,

      invocationRequest: {} as RiverDevControlledExecutorDispatchBoundaryFoundationInput[
        "dispatchAuthorization"
      ]["invocationRequest"],

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

      dispatchAuthorizationState: [
        "dispatch authorization decision granted"
      ],

      provenance: [
        "DEV-254 predecessor provenance"
      ],

      authorizationBoundaries: [
        "dispatch authorization is decision-only"
      ],

      scopeBoundaries: [
        "approved execution scope preserved"
      ],

      blockedReasons: [],

      dispatchAuthorizationMayCreateAuthorization: false,
      dispatchAuthorizationMayExpandScope: false,
      dispatchAuthorizationMayDispatch: false,
      dispatchAuthorizationMayInvokeExecutor: false,
      dispatchAuthorizationMayExecuteOperation: false,
      dispatchAuthorizationMayModifyRepository: false,

      futureDispatchBoundaryRequired: true,
      futureExecutorRequiredForSideEffects: true
    }
  };
}

test(
  "admits a valid trusted dispatch authorization into inert dispatch boundary",
  () => {
    const result =
      buildControlledExecutorDispatchBoundaryFoundation(
        buildInput()
      );

    assert.equal(result.version, "DEV-255");
    assert.equal(result.defaultPolicy, "DENY");
    assert.equal(result.boundaryAdmissionOnly, true);

    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(
      result.dispatchBoundaryAdmitted,
      true
    );

    assert.deepEqual(result.blockedReasons, []);
  }
);

test(
  "preserves exact dispatch authorization and invocation request",
  () => {
    const input = buildInput();

    const result =
      buildControlledExecutorDispatchBoundaryFoundation(
        input
      );

    assert.equal(
      result.dispatchAuthorization,
      input.dispatchAuthorization
    );

    assert.equal(
      result.invocationRequest,
      input.dispatchAuthorization.invocationRequest
    );
  }
);

test(
  "preserves operation capability and approved execution scope",
  () => {
    const input = buildInput();

    const result =
      buildControlledExecutorDispatchBoundaryFoundation(
        input
      );

    assert.equal(
      result.preparedOperation,
      input.dispatchAuthorization.preparedOperation
    );

    assert.equal(
      result.requiredCapability,
      input.dispatchAuthorization.requiredCapability
    );

    assert.deepEqual(
      result.authorizedCapabilities,
      input.dispatchAuthorization.authorizedCapabilities
    );

    assert.deepEqual(
      result.approvedExecutionScope,
      input.dispatchAuthorization.approvedExecutionScope
    );
  }
);

test(
  "preserves authorization provenance and inherited boundaries",
  () => {
    const result =
      buildControlledExecutorDispatchBoundaryFoundation(
        buildInput()
      );

    assert.ok(
      result.provenance.includes(
        "DEV-254 predecessor provenance"
      )
    );

    assert.ok(
      result.authorizationBoundaries.includes(
        "dispatch authorization is decision-only"
      )
    );

    assert.ok(
      result.scopeBoundaries.includes(
        "approved execution scope preserved"
      )
    );
  }
);

test(
  "records inert dispatch-ready boundary semantics",
  () => {
    const result =
      buildControlledExecutorDispatchBoundaryFoundation(
        buildInput()
      );

    assert.ok(
      result.dispatchBoundaryState.includes(
        "dispatch-ready envelope established"
      )
    );

    assert.ok(
      result.authorizationBoundaries.includes(
        "dispatch boundary is admission-only"
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
  "fails closed when dispatch authorization is untrusted",
  () => {
    const input = buildInput();
    input.dispatchAuthorization.trusted = false;

    const result =
      buildControlledExecutorDispatchBoundaryFoundation(
        input
      );

    assert.equal(
      result.dispatchBoundaryAdmitted,
      false
    );

    assert.ok(
      result.blockedReasons.includes(
        "dispatch authorization is not trusted"
      )
    );
  }
);

test(
  "fails closed when dispatch authorization is not ready",
  () => {
    const input = buildInput();
    input.dispatchAuthorization.ready = false;

    const result =
      buildControlledExecutorDispatchBoundaryFoundation(
        input
      );

    assert.equal(
      result.dispatchBoundaryAdmitted,
      false
    );

    assert.ok(
      result.blockedReasons.includes(
        "dispatch authorization is not ready"
      )
    );
  }
);

test(
  "fails closed when dispatch is not authorized",
  () => {
    const input = buildInput();

    input.dispatchAuthorization.dispatchAuthorized =
      false;

    const result =
      buildControlledExecutorDispatchBoundaryFoundation(
        input
      );

    assert.equal(
      result.dispatchBoundaryAdmitted,
      false
    );

    assert.ok(
      result.blockedReasons.includes(
        "dispatch is not authorized"
      )
    );
  }
);

test(
  "fails closed when predecessor blockers exist",
  () => {
    const input = buildInput();

    input.dispatchAuthorization.blockedReasons.push(
      "predecessor blocker"
    );

    const result =
      buildControlledExecutorDispatchBoundaryFoundation(
        input
      );

    assert.equal(
      result.dispatchBoundaryAdmitted,
      false
    );

    assert.ok(
      result.blockedReasons.includes(
        "dispatch authorization contains blockers"
      )
    );
  }
);

test(
  "fails closed without governed execution request",
  () => {
    const input = buildInput();

    input.dispatchAuthorization.executionRequest =
      "";

    const result =
      buildControlledExecutorDispatchBoundaryFoundation(
        input
      );

    assert.equal(
      result.dispatchBoundaryAdmitted,
      false
    );

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

    input.dispatchAuthorization.authorizedCapabilities =
      [];

    const result =
      buildControlledExecutorDispatchBoundaryFoundation(
        input
      );

    assert.equal(
      result.dispatchBoundaryAdmitted,
      false
    );

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

    input.dispatchAuthorization.requiredCapabilityAuthorized =
      false;

    const result =
      buildControlledExecutorDispatchBoundaryFoundation(
        input
      );

    assert.equal(
      result.dispatchBoundaryAdmitted,
      false
    );

    assert.ok(
      result.blockedReasons.includes(
        "required capability is not authorized"
      )
    );
  }
);

test(
  "fails closed when required capability is absent from authorized evidence",
  () => {
    const input = buildInput();

    input.dispatchAuthorization.authorizedCapabilities = [
      "prepare-approved-repository-change"
    ];

    const result =
      buildControlledExecutorDispatchBoundaryFoundation(
        input
      );

    assert.equal(
      result.dispatchBoundaryAdmitted,
      false
    );

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

    input.dispatchAuthorization.approvedExecutionScope =
      [];

    const result =
      buildControlledExecutorDispatchBoundaryFoundation(
        input
      );

    assert.equal(
      result.dispatchBoundaryAdmitted,
      false
    );

    assert.ok(
      result.blockedReasons.includes(
        "approved execution scope is missing"
      )
    );
  }
);

test(
  "fails closed without authorization provenance",
  () => {
    const input = buildInput();

    input.dispatchAuthorization.provenance =
      [];

    const result =
      buildControlledExecutorDispatchBoundaryFoundation(
        input
      );

    assert.equal(
      result.dispatchBoundaryAdmitted,
      false
    );

    assert.ok(
      result.blockedReasons.includes(
        "authorization provenance is missing"
      )
    );
  }
);

test(
  "fails closed if predecessor already grants dispatch authority",
  () => {
    const input = buildInput();

    const mutable =
      input.dispatchAuthorization as unknown as {
        dispatchAuthorizationMayDispatch: boolean;
      };

    mutable.dispatchAuthorizationMayDispatch =
      true;

    const result =
      buildControlledExecutorDispatchBoundaryFoundation(
        input
      );

    assert.equal(
      result.dispatchBoundaryAdmitted,
      false
    );

    assert.ok(
      result.blockedReasons.includes(
        "dispatch authorization already grants dispatch authority"
      )
    );
  }
);

test(
  "fails closed if future executor requirement is removed",
  () => {
    const input = buildInput();

    const mutable =
      input.dispatchAuthorization as unknown as {
        futureExecutorRequiredForSideEffects: boolean;
      };

    mutable.futureExecutorRequiredForSideEffects =
      false;

    const result =
      buildControlledExecutorDispatchBoundaryFoundation(
        input
      );

    assert.equal(
      result.dispatchBoundaryAdmitted,
      false
    );

    assert.ok(
      result.blockedReasons.includes(
        "future executor requirement is missing"
      )
    );
  }
);

test(
  "dispatch boundary grants no execution or repository authority",
  () => {
    const result =
      buildControlledExecutorDispatchBoundaryFoundation(
        buildInput()
      );

    assert.equal(
      result.dispatchBoundaryMayCreateAuthorization,
      false
    );

    assert.equal(
      result.dispatchBoundaryMayExpandScope,
      false
    );

    assert.equal(
      result.dispatchBoundaryMayInvokeExecutor,
      false
    );

    assert.equal(
      result.dispatchBoundaryMayExecuteOperation,
      false
    );

    assert.equal(
      result.dispatchBoundaryMayModifyRepository,
      false
    );

    assert.equal(
      result.dispatchBoundaryMayDeleteRepositoryContent,
      false
    );

    assert.equal(
      result.dispatchBoundaryMayCommit,
      false
    );

    assert.equal(
      result.dispatchBoundaryMayPush,
      false
    );

    assert.equal(
      result.dispatchBoundaryMayDeploy,
      false
    );

    assert.equal(
      result.dispatchBoundaryMayAccessSecrets,
      false
    );

    assert.equal(
      result.dispatchBoundaryMayPerformExternalSideEffects,
      false
    );
  }
);

test(
  "future executor remains separately required",
  () => {
    const result =
      buildControlledExecutorDispatchBoundaryFoundation(
        buildInput()
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

    const authorizedCapabilities = [
      ...input.dispatchAuthorization.authorizedCapabilities
    ];

    const approvedExecutionScope = [
      ...input.dispatchAuthorization.approvedExecutionScope
    ];

    const provenance = [
      ...input.dispatchAuthorization.provenance
    ];

    const authorizationBoundaries = [
      ...input.dispatchAuthorization.authorizationBoundaries
    ];

    const scopeBoundaries = [
      ...input.dispatchAuthorization.scopeBoundaries
    ];

    buildControlledExecutorDispatchBoundaryFoundation(
      input
    );

    assert.deepEqual(
      input.dispatchAuthorization.authorizedCapabilities,
      authorizedCapabilities
    );

    assert.deepEqual(
      input.dispatchAuthorization.approvedExecutionScope,
      approvedExecutionScope
    );

    assert.deepEqual(
      input.dispatchAuthorization.provenance,
      provenance
    );

    assert.deepEqual(
      input.dispatchAuthorization.authorizationBoundaries,
      authorizationBoundaries
    );

    assert.deepEqual(
      input.dispatchAuthorization.scopeBoundaries,
      scopeBoundaries
    );
  }
);
