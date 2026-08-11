import assert from "node:assert/strict";
import test from "node:test";

import type {
  RiverDevControlledExecutorOperationExecutionAuthorizationFoundationInput,
  RiverDevControlledExecutorOperationPreparationFoundation
} from "../types";

import {
  buildControlledExecutorOperationExecutionAuthorizationFoundation
} from "./controlled-executor-operation-execution-authorization-foundation-engine";

function buildTrustedPreparation(
  overrides: Partial<RiverDevControlledExecutorOperationPreparationFoundation> = {}
): RiverDevControlledExecutorOperationPreparationFoundation {
  return {
    version: "DEV-250",
    source: "DEV-250 deterministic test fixture",
    objective: "Provide trusted prepared operation evidence.",

    trusted: true,
    ready: true,
    prepared: true,

    defaultPolicy: "DENY",
    preparationOnly: true,

    operationAdmission:
      {} as RiverDevControlledExecutorOperationPreparationFoundation["operationAdmission"],

    executionRequest:
      "inspect approved repository state",

    preparedOperation:
      "inspect-approved-repository-state",

    requiredCapability:
      "inspect-approved-repository-state",

    authorizedCapabilities: [
      "inspect-approved-repository-state"
    ],

    approvedExecutionScope: [
      "approved execution scope"
    ],

    preparationState: [
      "operation prepared"
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

    preparationMayCreateAuthorization: false,
    preparationMayExpandScope: false,
    preparationMayExecuteOperation: false,
    preparationMayModifyRepository: false,

    ...overrides
  };
}

function buildInput(
  overrides: Partial<RiverDevControlledExecutorOperationExecutionAuthorizationFoundationInput> = {}
): RiverDevControlledExecutorOperationExecutionAuthorizationFoundationInput {
  return {
    operationPreparation:
      buildTrustedPreparation(),

    ...overrides
  };
}

test(
  "authorizes a trusted ready prepared operation deterministically",
  () => {
    const result =
      buildControlledExecutorOperationExecutionAuthorizationFoundation(
        buildInput()
      );

    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.authorized, true);
    assert.equal(result.defaultPolicy, "DENY");
    assert.equal(result.authorizationDecisionOnly, true);
    assert.deepEqual(result.blockedReasons, []);
  }
);

test(
  "untrusted preparation fails closed",
  () => {
    const result =
      buildControlledExecutorOperationExecutionAuthorizationFoundation({
        operationPreparation:
          buildTrustedPreparation({
            trusted: false
          })
      });

    assert.equal(result.trusted, false);
    assert.equal(result.ready, false);
    assert.equal(result.authorized, false);

    assert.ok(
      result.blockedReasons.includes(
        "DEV-250 operation preparation is not trusted"
      )
    );
  }
);

test(
  "not-ready preparation fails closed",
  () => {
    const result =
      buildControlledExecutorOperationExecutionAuthorizationFoundation({
        operationPreparation:
          buildTrustedPreparation({
            ready: false
          })
      });

    assert.equal(result.ready, false);
    assert.equal(result.authorized, false);

    assert.ok(
      result.blockedReasons.includes(
        "DEV-250 operation preparation is not ready"
      )
    );
  }
);

test(
  "unprepared operation fails closed",
  () => {
    const result =
      buildControlledExecutorOperationExecutionAuthorizationFoundation({
        operationPreparation:
          buildTrustedPreparation({
            prepared: false
          })
      });

    assert.equal(result.authorized, false);

    assert.ok(
      result.blockedReasons.includes(
        "DEV-250 operation was not prepared"
      )
    );
  }
);

test(
  "deny-by-default predecessor policy is required",
  () => {
    const preparation =
      buildTrustedPreparation();

    const invalid =
      {
        ...preparation,
        defaultPolicy: "ALLOW"
      } as unknown as RiverDevControlledExecutorOperationPreparationFoundation;

    const result =
      buildControlledExecutorOperationExecutionAuthorizationFoundation({
        operationPreparation: invalid
      });

    assert.equal(result.authorized, false);

    assert.ok(
      result.blockedReasons.includes(
        "DEV-250 deny-by-default preparation policy is not preserved"
      )
    );
  }
);

test(
  "preparation-only predecessor boundary is required",
  () => {
    const preparation =
      buildTrustedPreparation();

    const invalid =
      {
        ...preparation,
        preparationOnly: false
      } as unknown as RiverDevControlledExecutorOperationPreparationFoundation;

    const result =
      buildControlledExecutorOperationExecutionAuthorizationFoundation({
        operationPreparation: invalid
      });

    assert.equal(result.authorized, false);

    assert.ok(
      result.blockedReasons.includes(
        "DEV-250 preparation-only boundary is not preserved"
      )
    );
  }
);

test(
  "predecessor blockers fail closed",
  () => {
    const result =
      buildControlledExecutorOperationExecutionAuthorizationFoundation({
        operationPreparation:
          buildTrustedPreparation({
            blockedReasons: [
              "upstream blocker"
            ]
          })
      });

    assert.equal(result.authorized, false);

    assert.ok(
      result.blockedReasons.includes(
        "DEV-250 operation preparation contains blocked reasons"
      )
    );
  }
);

test(
  "missing governed execution request fails closed",
  () => {
    const result =
      buildControlledExecutorOperationExecutionAuthorizationFoundation({
        operationPreparation:
          buildTrustedPreparation({
            executionRequest: "   "
          })
      });

    assert.equal(result.authorized, false);

    assert.ok(
      result.blockedReasons.includes(
        "governed execution-request evidence is missing"
      )
    );
  }
);

test(
  "missing authorized capability evidence fails closed",
  () => {
    const result =
      buildControlledExecutorOperationExecutionAuthorizationFoundation({
        operationPreparation:
          buildTrustedPreparation({
            authorizedCapabilities: []
          })
      });

    assert.equal(result.authorized, false);

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
      buildControlledExecutorOperationExecutionAuthorizationFoundation({
        operationPreparation:
          buildTrustedPreparation({
            approvedExecutionScope: []
          })
      });

    assert.equal(result.authorized, false);

    assert.ok(
      result.blockedReasons.includes(
        "approved execution scope evidence is missing"
      )
    );
  }
);

test(
  "required capability must remain authorized",
  () => {
    const result =
      buildControlledExecutorOperationExecutionAuthorizationFoundation({
        operationPreparation:
          buildTrustedPreparation({
            authorizedCapabilities: [
              "validate-approved-repository-change"
            ]
          })
      });

    assert.equal(
      result.requiredCapabilityAuthorized,
      false
    );

    assert.equal(result.authorized, false);

    assert.ok(
      result.blockedReasons.includes(
        "required capability is not authorized: inspect-approved-repository-state"
      )
    );
  }
);

test(
  "prepared operation must match required capability",
  () => {
    const result =
      buildControlledExecutorOperationExecutionAuthorizationFoundation({
        operationPreparation:
          buildTrustedPreparation({
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

    assert.equal(result.authorized, false);

    assert.ok(
      result.blockedReasons.includes(
        "prepared operation does not match required capability"
      )
    );
  }
);

test(
  "approved execution scope is preserved without expansion",
  () => {
    const input =
      buildInput({
        operationPreparation:
          buildTrustedPreparation({
            approvedExecutionScope: [
              "scope-b",
              "scope-a",
              "scope-a"
            ]
          })
      });

    const result =
      buildControlledExecutorOperationExecutionAuthorizationFoundation(
        input
      );

    assert.deepEqual(
      result.approvedExecutionScope,
      [
        "scope-a",
        "scope-b"
      ]
    );

    assert.ok(
      result.scopeBoundaries.includes(
        "execution authorization cannot expand approved execution scope"
      )
    );
  }
);

test(
  "authorization provenance is preserved and extended",
  () => {
    const input =
      buildInput();

    const result =
      buildControlledExecutorOperationExecutionAuthorizationFoundation(
        input
      );

    for (
      const evidence of
      input.operationPreparation.provenance
    ) {
      assert.ok(
        result.provenance.includes(evidence)
      );
    }

    assert.ok(
      result.provenance.includes(
        "version:DEV-251"
      )
    );

    assert.ok(
      result.provenance.includes(
        "prepared-operation:inspect-approved-repository-state"
      )
    );

    assert.ok(
      result.provenance.includes(
        "execution-authorization:authorized"
      )
    );
  }
);

test(
  "authorization evidence is normalized deterministically",
  () => {
    const result =
      buildControlledExecutorOperationExecutionAuthorizationFoundation({
        operationPreparation:
          buildTrustedPreparation({
            authorizedCapabilities: [
              "validate-approved-repository-change",
              "inspect-approved-repository-state",
              "inspect-approved-repository-state"
            ],

            approvedExecutionScope: [
              "scope-b",
              "scope-a",
              "scope-b"
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
  "execution authorization does not mutate predecessor arrays",
  () => {
    const preparation =
      buildTrustedPreparation();

    const originalCapabilities =
      [...preparation.authorizedCapabilities];

    const originalScope =
      [...preparation.approvedExecutionScope];

    const originalProvenance =
      [...preparation.provenance];

    buildControlledExecutorOperationExecutionAuthorizationFoundation({
      operationPreparation: preparation
    });

    assert.deepEqual(
      preparation.authorizedCapabilities,
      originalCapabilities
    );

    assert.deepEqual(
      preparation.approvedExecutionScope,
      originalScope
    );

    assert.deepEqual(
      preparation.provenance,
      originalProvenance
    );
  }
);

test(
  "execution authorization grants no execution authority",
  () => {
    const result =
      buildControlledExecutorOperationExecutionAuthorizationFoundation(
        buildInput()
      );

    const requiredBoundaries = [
      "execution authorization does not grant command execution authority",
      "execution authorization does not grant repository modification authority",
      "execution authorization does not grant repository deletion authority",
      "execution authorization does not grant commit authority",
      "execution authorization does not grant push authority",
      "execution authorization does not grant deployment authority",
      "execution authorization does not grant secret access authority",
      "execution authorization does not grant autonomous execution authority"
    ];

    for (const boundary of requiredBoundaries) {
      assert.ok(
        result.authorizationBoundaries.includes(
          boundary
        )
      );
    }

    assert.equal(
      result.authorizationMayExecuteOperation,
      false
    );

    assert.equal(
      result.authorizationMayModifyRepository,
      false
    );
  }
);

test(
  "execution authorization cannot create authorization or expand scope",
  () => {
    const result =
      buildControlledExecutorOperationExecutionAuthorizationFoundation(
        buildInput()
      );

    assert.equal(
      result.authorizationMayCreateCapabilityAuthorization,
      false
    );

    assert.equal(
      result.authorizationMayExpandScope,
      false
    );

    assert.ok(
      result.scopeBoundaries.includes(
        "execution authorization cannot create capability authorization"
      )
    );
  }
);
