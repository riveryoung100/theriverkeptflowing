import assert from "node:assert/strict";
import test from "node:test";

import type {
  RiverDevControlledExecutorCapability,
  RiverDevControlledExecutorCapabilityAuthorizationFoundation,
  RiverDevControlledExecutorOperationAdmissionFoundationInput
} from "../types";

import {
  buildControlledExecutorOperationAdmissionFoundation
} from "./controlled-executor-operation-admission-foundation-engine";

const ALL_CAPABILITIES: RiverDevControlledExecutorCapability[] = [
  "inspect-approved-repository-state",
  "prepare-approved-repository-change",
  "validate-approved-repository-change"
];

function buildTrustedCapabilityAuthorization(
  overrides: Partial<RiverDevControlledExecutorCapabilityAuthorizationFoundation> = {}
): RiverDevControlledExecutorCapabilityAuthorizationFoundation {
  return {
    version: "DEV-248",
    source: "DEV-248 deterministic test fixture",
    objective: "Provide trusted capability authorization evidence.",

    trusted: true,
    ready: true,
    authorized: true,
    executorAdmitted: true,

    defaultPolicy: "DENY",
    authorizationDecisionOnly: true,

    capabilityFoundation:
      {} as RiverDevControlledExecutorCapabilityAuthorizationFoundation["capabilityFoundation"],

    authorizationRequest:
      {} as RiverDevControlledExecutorCapabilityAuthorizationFoundation["authorizationRequest"],

    executionRequest: [
      "inspect approved repository state"
    ],

    eligibleCapabilities: [
      ...ALL_CAPABILITIES
    ],

    requestedCapabilities: [
      "inspect-approved-repository-state"
    ],

    authorizedCapabilities: [
      "inspect-approved-repository-state"
    ],

    deniedCapabilities: [],

    authorizationState: [
      "authorization decision established"
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

    ...overrides
  };
}

function buildInput(
  overrides: Partial<RiverDevControlledExecutorOperationAdmissionFoundationInput> = {}
): RiverDevControlledExecutorOperationAdmissionFoundationInput {
  return {
    capabilityAuthorization:
      buildTrustedCapabilityAuthorization(),

    admissionRequest: {
      operation:
        "inspect-approved-repository-state",

      requiredCapability:
        "inspect-approved-repository-state"
    },

    ...overrides
  };
}

test(
  "admits operation represented by explicitly authorized capability",
  () => {
    const result =
      buildControlledExecutorOperationAdmissionFoundation(
        buildInput()
      );

    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.admitted, true);

    assert.equal(result.defaultPolicy, "DENY");
    assert.equal(result.admissionDecisionOnly, true);

    assert.equal(
      result.operationRepresentedByAuthorizedCapability,
      true
    );

    assert.deepEqual(
      result.authorizedCapabilities,
      [
        "inspect-approved-repository-state"
      ]
    );

    assert.deepEqual(result.blockedReasons, []);
  }
);

test(
  "untrusted capability authorization fails closed",
  () => {
    const result =
      buildControlledExecutorOperationAdmissionFoundation(
        buildInput({
          capabilityAuthorization:
            buildTrustedCapabilityAuthorization({
              trusted: false
            })
        })
      );

    assert.equal(result.trusted, false);
    assert.equal(result.ready, false);
    assert.equal(result.admitted, false);

    assert.ok(
      result.blockedReasons.includes(
        "DEV-248 capability authorization is not trusted"
      )
    );
  }
);

test(
  "not-ready capability authorization fails closed",
  () => {
    const result =
      buildControlledExecutorOperationAdmissionFoundation(
        buildInput({
          capabilityAuthorization:
            buildTrustedCapabilityAuthorization({
              ready: false
            })
        })
      );

    assert.equal(result.ready, false);
    assert.equal(result.admitted, false);

    assert.ok(
      result.blockedReasons.includes(
        "DEV-248 capability authorization is not ready"
      )
    );
  }
);

test(
  "denied DEV-248 authorization decision fails closed",
  () => {
    const result =
      buildControlledExecutorOperationAdmissionFoundation(
        buildInput({
          capabilityAuthorization:
            buildTrustedCapabilityAuthorization({
              authorized: false
            })
        })
      );

    assert.equal(result.admitted, false);

    assert.ok(
      result.blockedReasons.includes(
        "DEV-248 capability authorization decision is not authorized"
      )
    );
  }
);

test(
  "missing preserved executor admission fails closed",
  () => {
    const result =
      buildControlledExecutorOperationAdmissionFoundation(
        buildInput({
          capabilityAuthorization:
            buildTrustedCapabilityAuthorization({
              executorAdmitted: false
            })
        })
      );

    assert.equal(result.admitted, false);

    assert.ok(
      result.blockedReasons.includes(
        "DEV-248 executor admission is not preserved"
      )
    );
  }
);

test(
  "predecessor blockers fail closed",
  () => {
    const result =
      buildControlledExecutorOperationAdmissionFoundation(
        buildInput({
          capabilityAuthorization:
            buildTrustedCapabilityAuthorization({
              blockedReasons: [
                "upstream governance blocker"
              ]
            })
        })
      );

    assert.equal(result.admitted, false);

    assert.ok(
      result.blockedReasons.includes(
        "DEV-248 capability authorization contains blocked reasons"
      )
    );
  }
);

test(
  "missing governed execution request fails closed",
  () => {
    const result =
      buildControlledExecutorOperationAdmissionFoundation(
        buildInput({
          capabilityAuthorization:
            buildTrustedCapabilityAuthorization({
              executionRequest: []
            })
        })
      );

    assert.equal(result.admitted, false);

    assert.ok(
      result.blockedReasons.includes(
        "governed execution-request evidence is missing"
      )
    );
  }
);

test(
  "whitespace-only execution request fails closed",
  () => {
    const result =
      buildControlledExecutorOperationAdmissionFoundation(
        buildInput({
          capabilityAuthorization:
            buildTrustedCapabilityAuthorization({
              executionRequest: [
                " ",
                ""
              ]
            })
        })
      );

    assert.equal(result.admitted, false);

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
      buildControlledExecutorOperationAdmissionFoundation(
        buildInput({
          capabilityAuthorization:
            buildTrustedCapabilityAuthorization({
              authorizedCapabilities: []
            })
        })
      );

    assert.equal(result.admitted, false);

    assert.ok(
      result.blockedReasons.includes(
        "authorized capability evidence is missing"
      )
    );
  }
);

test(
  "operation and required capability must match exactly",
  () => {
    const result =
      buildControlledExecutorOperationAdmissionFoundation(
        buildInput({
          admissionRequest: {
            operation:
              "inspect-approved-repository-state",

            requiredCapability:
              "prepare-approved-repository-change"
          }
        })
      );

    assert.equal(
      result.operationRepresentedByAuthorizedCapability,
      false
    );

    assert.equal(result.admitted, false);

    assert.ok(
      result.blockedReasons.includes(
        "proposed operation does not match required capability"
      )
    );
  }
);

test(
  "operation requiring non-authorized capability is denied",
  () => {
    const result =
      buildControlledExecutorOperationAdmissionFoundation(
        buildInput({
          admissionRequest: {
            operation:
              "prepare-approved-repository-change",

            requiredCapability:
              "prepare-approved-repository-change"
          }
        })
      );

    assert.equal(
      result.operationRepresentedByAuthorizedCapability,
      false
    );

    assert.equal(result.admitted, false);

    assert.ok(
      result.blockedReasons.includes(
        "proposed operation is not represented by an authorized capability: prepare-approved-repository-change"
      )
    );
  }
);

test(
  "authorized prepare operation is admitted when explicitly authorized",
  () => {
    const result =
      buildControlledExecutorOperationAdmissionFoundation(
        buildInput({
          capabilityAuthorization:
            buildTrustedCapabilityAuthorization({
              authorizedCapabilities: [
                "prepare-approved-repository-change"
              ]
            }),

          admissionRequest: {
            operation:
              "prepare-approved-repository-change",

            requiredCapability:
              "prepare-approved-repository-change"
          }
        })
      );

    assert.equal(result.admitted, true);
    assert.equal(
      result.operationRepresentedByAuthorizedCapability,
      true
    );
    assert.deepEqual(result.blockedReasons, []);
  }
);

test(
  "authorized validation operation is admitted when explicitly authorized",
  () => {
    const result =
      buildControlledExecutorOperationAdmissionFoundation(
        buildInput({
          capabilityAuthorization:
            buildTrustedCapabilityAuthorization({
              authorizedCapabilities: [
                "validate-approved-repository-change"
              ]
            }),

          admissionRequest: {
            operation:
              "validate-approved-repository-change",

            requiredCapability:
              "validate-approved-repository-change"
          }
        })
      );

    assert.equal(result.admitted, true);
    assert.equal(
      result.operationRepresentedByAuthorizedCapability,
      true
    );
  }
);

test(
  "authorized capability ordering is deterministic",
  () => {
    const result =
      buildControlledExecutorOperationAdmissionFoundation(
        buildInput({
          capabilityAuthorization:
            buildTrustedCapabilityAuthorization({
              authorizedCapabilities: [
                "validate-approved-repository-change",
                "inspect-approved-repository-state",
                "prepare-approved-repository-change",
                "inspect-approved-repository-state"
              ]
            })
        })
      );

    assert.deepEqual(
      result.authorizedCapabilities,
      [
        "inspect-approved-repository-state",
        "prepare-approved-repository-change",
        "validate-approved-repository-change"
      ]
    );
  }
);

test(
  "authorization provenance and inherited scope are preserved",
  () => {
    const input =
      buildInput();

    const result =
      buildControlledExecutorOperationAdmissionFoundation(
        input
      );

    for (
      const evidence of
      input.capabilityAuthorization.provenance
    ) {
      assert.ok(
        result.provenance.includes(evidence)
      );
    }

    for (
      const boundary of
      input.capabilityAuthorization.scopeBoundaries
    ) {
      assert.ok(
        result.approvedExecutionScope.includes(
          boundary
        )
      );
    }

    assert.ok(
      result.provenance.includes(
        "proposed-operation:inspect-approved-repository-state"
      )
    );

    assert.ok(
      result.provenance.includes(
        "required-capability:inspect-approved-repository-state"
      )
    );
  }
);

test(
  "operation admission cannot expand authorized capabilities or scope",
  () => {
    const result =
      buildControlledExecutorOperationAdmissionFoundation(
        buildInput()
      );

    assert.ok(
      result.scopeBoundaries.includes(
        "operation admission cannot expand approved execution scope"
      )
    );

    assert.ok(
      result.scopeBoundaries.includes(
        "operation admission cannot expand DEV-248 authorized capabilities"
      )
    );

    assert.equal(
      result.admissionMayCreateAuthorization,
      false
    );

    assert.equal(
      result.admissionMayExpandScope,
      false
    );
  }
);

test(
  "operation admission grants no execution authority",
  () => {
    const result =
      buildControlledExecutorOperationAdmissionFoundation(
        buildInput()
      );

    const requiredBoundaries = [
      "operation admission does not grant command execution authority",
      "operation admission does not grant repository modification authority",
      "operation admission does not grant repository deletion authority",
      "operation admission does not grant commit authority",
      "operation admission does not grant push authority",
      "operation admission does not grant deployment authority",
      "operation admission does not grant secret access authority",
      "operation admission does not grant autonomous execution authority"
    ];

    for (const boundary of requiredBoundaries) {
      assert.ok(
        result.authorizationBoundaries.includes(
          boundary
        )
      );
    }

    assert.equal(
      result.admissionMayExecuteOperation,
      false
    );
  }
);
