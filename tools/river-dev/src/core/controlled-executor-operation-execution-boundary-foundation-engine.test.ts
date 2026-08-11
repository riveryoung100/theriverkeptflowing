import assert from "node:assert/strict";
import test from "node:test";

import type {
  RiverDevControlledExecutorOperationExecutionAuthorizationFoundation,
  RiverDevControlledExecutorOperationExecutionBoundaryFoundationInput
} from "../types";

import {
  buildControlledExecutorOperationExecutionBoundaryFoundation
} from "./controlled-executor-operation-execution-boundary-foundation-engine";

function buildTrustedAuthorization(
  overrides: Partial<RiverDevControlledExecutorOperationExecutionAuthorizationFoundation> = {}
): RiverDevControlledExecutorOperationExecutionAuthorizationFoundation {
  return {
    version: "DEV-251",
    source: "DEV-251 deterministic test fixture",
    objective: "Provide trusted execution authorization evidence.",

    trusted: true,
    ready: true,
    authorized: true,

    defaultPolicy: "DENY",
    authorizationDecisionOnly: true,

    operationPreparation:
      {} as RiverDevControlledExecutorOperationExecutionAuthorizationFoundation["operationPreparation"],

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
      "approved execution scope"
    ],

    authorizationState: [
      "execution authorization decision established"
    ],

    provenance: [
      "human authorization evidence",
      "repository authorization evidence",
      "explicit approval evidence"
    ],

    authorizationBoundaries: [
      "explicit approval required"
    ],

    scopeBoundaries: [
      "approved execution scope"
    ],

    blockedReasons: [],

    authorizationMayCreateCapabilityAuthorization: false,
    authorizationMayExpandScope: false,
    authorizationMayExecuteOperation: false,
    authorizationMayModifyRepository: false,

    ...overrides
  };
}

function buildInput(
  overrides: Partial<RiverDevControlledExecutorOperationExecutionBoundaryFoundationInput> = {}
): RiverDevControlledExecutorOperationExecutionBoundaryFoundationInput {
  return {
    executionAuthorization:
      buildTrustedAuthorization(),

    ...overrides
  };
}

test(
  "establishes future executor eligibility deterministically",
  () => {
    const result =
      buildControlledExecutorOperationExecutionBoundaryFoundation(
        buildInput()
      );

    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.eligible, true);
    assert.equal(result.defaultPolicy, "DENY");
    assert.equal(result.boundaryDecisionOnly, true);
    assert.deepEqual(result.blockedReasons, []);
  }
);

test(
  "untrusted execution authorization fails closed",
  () => {
    const result =
      buildControlledExecutorOperationExecutionBoundaryFoundation({
        executionAuthorization:
          buildTrustedAuthorization({
            trusted: false
          })
      });

    assert.equal(result.trusted, false);
    assert.equal(result.ready, false);
    assert.equal(result.eligible, false);

    assert.ok(
      result.blockedReasons.includes(
        "DEV-251 execution authorization is not trusted"
      )
    );
  }
);

test(
  "not-ready execution authorization fails closed",
  () => {
    const result =
      buildControlledExecutorOperationExecutionBoundaryFoundation({
        executionAuthorization:
          buildTrustedAuthorization({
            ready: false
          })
      });

    assert.equal(result.eligible, false);

    assert.ok(
      result.blockedReasons.includes(
        "DEV-251 execution authorization is not ready"
      )
    );
  }
);

test(
  "unauthorized execution decision fails closed",
  () => {
    const result =
      buildControlledExecutorOperationExecutionBoundaryFoundation({
        executionAuthorization:
          buildTrustedAuthorization({
            authorized: false
          })
      });

    assert.equal(result.eligible, false);

    assert.ok(
      result.blockedReasons.includes(
        "DEV-251 execution decision is not authorized"
      )
    );
  }
);

test(
  "deny-by-default predecessor policy is required",
  () => {
    const authorization =
      {
        ...buildTrustedAuthorization(),
        defaultPolicy: "ALLOW"
      } as unknown as RiverDevControlledExecutorOperationExecutionAuthorizationFoundation;

    const result =
      buildControlledExecutorOperationExecutionBoundaryFoundation({
        executionAuthorization: authorization
      });

    assert.equal(result.eligible, false);

    assert.ok(
      result.blockedReasons.includes(
        "DEV-251 deny-by-default policy is not preserved"
      )
    );
  }
);

test(
  "authorization-decision-only predecessor is required",
  () => {
    const authorization =
      {
        ...buildTrustedAuthorization(),
        authorizationDecisionOnly: false
      } as unknown as RiverDevControlledExecutorOperationExecutionAuthorizationFoundation;

    const result =
      buildControlledExecutorOperationExecutionBoundaryFoundation({
        executionAuthorization: authorization
      });

    assert.equal(result.eligible, false);

    assert.ok(
      result.blockedReasons.includes(
        "DEV-251 authorization-decision-only boundary is not preserved"
      )
    );
  }
);

test(
  "predecessor blockers fail closed",
  () => {
    const result =
      buildControlledExecutorOperationExecutionBoundaryFoundation({
        executionAuthorization:
          buildTrustedAuthorization({
            blockedReasons: [
              "upstream blocker"
            ]
          })
      });

    assert.equal(result.eligible, false);

    assert.ok(
      result.blockedReasons.includes(
        "DEV-251 execution authorization contains blocked reasons"
      )
    );
  }
);

test(
  "missing execution request fails closed",
  () => {
    const result =
      buildControlledExecutorOperationExecutionBoundaryFoundation({
        executionAuthorization:
          buildTrustedAuthorization({
            executionRequest: "   "
          })
      });

    assert.equal(result.eligible, false);

    assert.ok(
      result.blockedReasons.includes(
        "governed execution-request evidence is missing"
      )
    );
  }
);

test(
  "missing authorized capabilities fails closed",
  () => {
    const result =
      buildControlledExecutorOperationExecutionBoundaryFoundation({
        executionAuthorization:
          buildTrustedAuthorization({
            authorizedCapabilities: []
          })
      });

    assert.equal(result.eligible, false);

    assert.ok(
      result.blockedReasons.includes(
        "authorized capability evidence is missing"
      )
    );
  }
);

test(
  "missing approved execution scope fails closed",
  () => {
    const result =
      buildControlledExecutorOperationExecutionBoundaryFoundation({
        executionAuthorization:
          buildTrustedAuthorization({
            approvedExecutionScope: []
          })
      });

    assert.equal(result.eligible, false);

    assert.ok(
      result.blockedReasons.includes(
        "approved execution scope evidence is missing"
      )
    );
  }
);

test(
  "required capability authorization flag must remain true",
  () => {
    const result =
      buildControlledExecutorOperationExecutionBoundaryFoundation({
        executionAuthorization:
          buildTrustedAuthorization({
            requiredCapabilityAuthorized: false
          })
      });

    assert.equal(
      result.requiredCapabilityAuthorized,
      false
    );

    assert.equal(result.eligible, false);
  }
);

test(
  "required capability must remain in authorized capability evidence",
  () => {
    const result =
      buildControlledExecutorOperationExecutionBoundaryFoundation({
        executionAuthorization:
          buildTrustedAuthorization({
            authorizedCapabilities: [
              "validate-approved-repository-change"
            ]
          })
      });

    assert.equal(
      result.requiredCapabilityAuthorized,
      false
    );

    assert.equal(result.eligible, false);
  }
);

test(
  "prepared operation must match required capability",
  () => {
    const result =
      buildControlledExecutorOperationExecutionBoundaryFoundation({
        executionAuthorization:
          buildTrustedAuthorization({
            preparedOperation:
              "prepare-approved-repository-change",

            requiredCapability:
              "inspect-approved-repository-state",

            authorizedCapabilities: [
              "inspect-approved-repository-state",
              "prepare-approved-repository-change"
            ]
          })
      });

    assert.equal(result.eligible, false);

    assert.ok(
      result.blockedReasons.includes(
        "authorized prepared operation does not match required capability"
      )
    );
  }
);

test(
  "approved execution scope is preserved deterministically",
  () => {
    const result =
      buildControlledExecutorOperationExecutionBoundaryFoundation({
        executionAuthorization:
          buildTrustedAuthorization({
            approvedExecutionScope: [
              "scope-b",
              "scope-a",
              "scope-a"
            ]
          })
      });

    assert.deepEqual(
      result.approvedExecutionScope,
      [
        "scope-a",
        "scope-b"
      ]
    );
  }
);

test(
  "authorized capabilities are preserved deterministically",
  () => {
    const result =
      buildControlledExecutorOperationExecutionBoundaryFoundation({
        executionAuthorization:
          buildTrustedAuthorization({
            authorizedCapabilities: [
              "validate-approved-repository-change",
              "inspect-approved-repository-state",
              "inspect-approved-repository-state"
            ]
          })
      });

    assert.deepEqual(
      result.authorizedCapabilities,
      [
        "inspect-approved-repository-state",
        "validate-approved-repository-change"
      ]
    );
  }
);

test(
  "authorization provenance is preserved and extended",
  () => {
    const input =
      buildInput();

    const result =
      buildControlledExecutorOperationExecutionBoundaryFoundation(
        input
      );

    for (
      const evidence of
      input.executionAuthorization.provenance
    ) {
      assert.ok(
        result.provenance.includes(evidence)
      );
    }

    assert.ok(
      result.provenance.includes(
        "version:DEV-252"
      )
    );

    assert.ok(
      result.provenance.includes(
        "execution-boundary-eligible:true"
      )
    );
  }
);

test(
  "boundary evaluation does not mutate predecessor arrays",
  () => {
    const authorization =
      buildTrustedAuthorization();

    const capabilities =
      [...authorization.authorizedCapabilities];

    const scope =
      [...authorization.approvedExecutionScope];

    const provenance =
      [...authorization.provenance];

    buildControlledExecutorOperationExecutionBoundaryFoundation({
      executionAuthorization: authorization
    });

    assert.deepEqual(
      authorization.authorizedCapabilities,
      capabilities
    );

    assert.deepEqual(
      authorization.approvedExecutionScope,
      scope
    );

    assert.deepEqual(
      authorization.provenance,
      provenance
    );
  }
);

test(
  "execution boundary grants no execution authority",
  () => {
    const result =
      buildControlledExecutorOperationExecutionBoundaryFoundation(
        buildInput()
      );

    assert.equal(
      result.boundaryMayExecuteOperation,
      false
    );

    assert.equal(
      result.boundaryMayModifyRepository,
      false
    );

    assert.equal(
      result.boundaryMayInvokeExecutor,
      false
    );

    assert.ok(
      result.authorizationBoundaries.includes(
        "execution boundary cannot invoke the future executor"
      )
    );
  }
);

test(
  "execution boundary cannot create authorization or expand scope",
  () => {
    const result =
      buildControlledExecutorOperationExecutionBoundaryFoundation(
        buildInput()
      );

    assert.equal(
      result.boundaryMayCreateAuthorization,
      false
    );

    assert.equal(
      result.boundaryMayExpandScope,
      false
    );

    assert.equal(
      result.futureExecutorRequiredForSideEffects,
      true
    );

    assert.ok(
      result.scopeBoundaries.includes(
        "future executor remains separately required for side effects"
      )
    );
  }
);
