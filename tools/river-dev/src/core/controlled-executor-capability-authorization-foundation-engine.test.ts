import assert from "node:assert/strict";
import test from "node:test";

import type {
  RiverDevControlledExecutorCapability,
  RiverDevControlledExecutorCapabilityAuthorizationFoundationInput,
  RiverDevControlledExecutorCapabilityFoundation
} from "../types";

import {
  buildControlledExecutorCapabilityAuthorizationFoundation
} from "./controlled-executor-capability-authorization-foundation-engine";

const ALL_CAPABILITIES: readonly RiverDevControlledExecutorCapability[] = [
  "inspect-approved-repository-state",
  "prepare-approved-repository-change",
  "validate-approved-repository-change"
];

function buildTrustedCapabilityFoundation(
  overrides: Partial<RiverDevControlledExecutorCapabilityFoundation> = {}
): RiverDevControlledExecutorCapabilityFoundation {
  return {
    version: "DEV-247",
    source: "DEV-247 deterministic test fixture",
    objective: "Provide trusted capability eligibility.",

    trusted: true,
    ready: true,
    authorized: true,
    executorAdmitted: true,

    defaultPolicy: "DENY",
    capabilityEligibilityOnly: true,

    executorAdmission:
      {} as RiverDevControlledExecutorCapabilityFoundation["executorAdmission"],

    executionRequest: [
      "inspect approved repository state"
    ],

    recognizedCapabilities: [
      ...ALL_CAPABILITIES
    ],

    eligibleCapabilities: [
      ...ALL_CAPABILITIES
    ],

    capabilityState: [
      "capability eligibility established"
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
  overrides: Partial<RiverDevControlledExecutorCapabilityAuthorizationFoundationInput> = {}
): RiverDevControlledExecutorCapabilityAuthorizationFoundationInput {
  return {
    capabilityFoundation:
      buildTrustedCapabilityFoundation(),

    authorizationRequest: {
      requestedCapabilities: [
        "inspect-approved-repository-state"
      ],

      authorizationEvidence: [
        "human approved inspection capability",
        "repository scope authorization preserved"
      ]
    },

    ...overrides
  };
}

test(
  "authorizes eligible requested capability with evidence",
  () => {
    const result =
      buildControlledExecutorCapabilityAuthorizationFoundation(
        buildInput()
      );

    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.authorized, true);
    assert.equal(result.executorAdmitted, true);
    assert.equal(result.defaultPolicy, "DENY");
    assert.equal(result.authorizationDecisionOnly, true);

    assert.deepEqual(
      result.authorizedCapabilities,
      [
        "inspect-approved-repository-state"
      ]
    );

    assert.deepEqual(
      result.deniedCapabilities,
      []
    );

    assert.deepEqual(
      result.blockedReasons,
      []
    );
  }
);

test(
  "multiple eligible requested capabilities are authorized deterministically",
  () => {
    const result =
      buildControlledExecutorCapabilityAuthorizationFoundation(
        buildInput({
          authorizationRequest: {
            requestedCapabilities: [
              "validate-approved-repository-change",
              "inspect-approved-repository-state",
              "prepare-approved-repository-change",
              "inspect-approved-repository-state"
            ],

            authorizationEvidence: [
              "explicit approval evidence"
            ]
          }
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
  "untrusted predecessor fails closed",
  () => {
    const result =
      buildControlledExecutorCapabilityAuthorizationFoundation(
        buildInput({
          capabilityFoundation:
            buildTrustedCapabilityFoundation({
              trusted: false
            })
        })
      );

    assert.equal(result.authorized, false);
    assert.equal(result.ready, false);
    assert.deepEqual(result.authorizedCapabilities, []);

    assert.ok(
      result.blockedReasons.includes(
        "DEV-247 capability foundation is not trusted"
      )
    );
  }
);

test(
  "not-ready predecessor fails closed",
  () => {
    const result =
      buildControlledExecutorCapabilityAuthorizationFoundation(
        buildInput({
          capabilityFoundation:
            buildTrustedCapabilityFoundation({
              ready: false
            })
        })
      );

    assert.equal(result.authorized, false);
    assert.deepEqual(result.authorizedCapabilities, []);

    assert.ok(
      result.blockedReasons.includes(
        "DEV-247 capability foundation is not ready"
      )
    );
  }
);

test(
  "missing preserved authorization fails closed",
  () => {
    const result =
      buildControlledExecutorCapabilityAuthorizationFoundation(
        buildInput({
          capabilityFoundation:
            buildTrustedCapabilityFoundation({
              authorized: false
            })
        })
      );

    assert.equal(result.authorized, false);
    assert.deepEqual(result.authorizedCapabilities, []);

    assert.ok(
      result.blockedReasons.includes(
        "DEV-247 authorization evidence is not preserved"
      )
    );
  }
);

test(
  "missing executor admission fails closed",
  () => {
    const result =
      buildControlledExecutorCapabilityAuthorizationFoundation(
        buildInput({
          capabilityFoundation:
            buildTrustedCapabilityFoundation({
              executorAdmitted: false
            })
        })
      );

    assert.equal(result.authorized, false);
    assert.deepEqual(result.authorizedCapabilities, []);

    assert.ok(
      result.blockedReasons.includes(
        "DEV-247 executor admission is not preserved"
      )
    );
  }
);

test(
  "predecessor blockers fail closed",
  () => {
    const result =
      buildControlledExecutorCapabilityAuthorizationFoundation(
        buildInput({
          capabilityFoundation:
            buildTrustedCapabilityFoundation({
              blockedReasons: [
                "predecessor governance blocker"
              ]
            })
        })
      );

    assert.equal(result.authorized, false);
    assert.deepEqual(result.authorizedCapabilities, []);

    assert.ok(
      result.blockedReasons.includes(
        "DEV-247 capability foundation contains blocked reasons"
      )
    );
  }
);

test(
  "missing governed execution request fails closed",
  () => {
    const result =
      buildControlledExecutorCapabilityAuthorizationFoundation(
        buildInput({
          capabilityFoundation:
            buildTrustedCapabilityFoundation({
              executionRequest: []
            })
        })
      );

    assert.equal(result.authorized, false);

    assert.ok(
      result.blockedReasons.includes(
        "governed execution request evidence is missing"
      )
    );
  }
);

test(
  "missing eligible capabilities fails closed",
  () => {
    const result =
      buildControlledExecutorCapabilityAuthorizationFoundation(
        buildInput({
          capabilityFoundation:
            buildTrustedCapabilityFoundation({
              eligibleCapabilities: []
            })
        })
      );

    assert.equal(result.authorized, false);

    assert.ok(
      result.blockedReasons.includes(
        "eligible capability evidence is missing"
      )
    );
  }
);

test(
  "empty authorization request fails closed",
  () => {
    const result =
      buildControlledExecutorCapabilityAuthorizationFoundation(
        buildInput({
          authorizationRequest: {
            requestedCapabilities: [],
            authorizationEvidence: [
              "approval evidence"
            ]
          }
        })
      );

    assert.equal(result.authorized, false);

    assert.ok(
      result.blockedReasons.includes(
        "capability authorization request is empty"
      )
    );
  }
);

test(
  "missing authorization evidence fails closed",
  () => {
    const result =
      buildControlledExecutorCapabilityAuthorizationFoundation(
        buildInput({
          authorizationRequest: {
            requestedCapabilities: [
              "inspect-approved-repository-state"
            ],
            authorizationEvidence: []
          }
        })
      );

    assert.equal(result.authorized, false);

    assert.ok(
      result.blockedReasons.includes(
        "capability authorization evidence is missing"
      )
    );
  }
);

test(
  "ineligible requested capability is denied and blocks authorization",
  () => {
    const result =
      buildControlledExecutorCapabilityAuthorizationFoundation(
        buildInput({
          capabilityFoundation:
            buildTrustedCapabilityFoundation({
              eligibleCapabilities: [
                "inspect-approved-repository-state"
              ]
            }),

          authorizationRequest: {
            requestedCapabilities: [
              "inspect-approved-repository-state",
              "prepare-approved-repository-change"
            ],

            authorizationEvidence: [
              "explicit approval evidence"
            ]
          }
        })
      );

    assert.equal(result.authorized, false);
    assert.deepEqual(result.authorizedCapabilities, []);

    assert.ok(
      result.deniedCapabilities.includes(
        "prepare-approved-repository-change"
      )
    );

    assert.ok(
      result.blockedReasons.includes(
        "requested capability is not eligible: prepare-approved-repository-change"
      )
    );
  }
);

test(
  "authorization evidence and predecessor provenance are preserved",
  () => {
    const input =
      buildInput();

    const result =
      buildControlledExecutorCapabilityAuthorizationFoundation(
        input
      );

    for (
      const evidence of
      input.capabilityFoundation.provenance
    ) {
      assert.ok(
        result.provenance.includes(evidence)
      );
    }

    for (
      const evidence of
      input.authorizationRequest.authorizationEvidence
    ) {
      assert.ok(
        result.provenance.includes(evidence)
      );
    }
  }
);

test(
  "authorization remains within inherited capability and scope boundaries",
  () => {
    const input =
      buildInput();

    const result =
      buildControlledExecutorCapabilityAuthorizationFoundation(
        input
      );

    for (
      const capability of
      result.authorizedCapabilities
    ) {
      assert.ok(
        result.eligibleCapabilities.includes(
          capability
        )
      );
    }

    assert.ok(
      result.scopeBoundaries.includes(
        "capability authorization cannot expand approved execution scope"
      )
    );

    assert.ok(
      result.scopeBoundaries.includes(
        "capability authorization cannot expand DEV-247 capability eligibility"
      )
    );
  }
);

test(
  "authorization decision grants no execution authority",
  () => {
    const result =
      buildControlledExecutorCapabilityAuthorizationFoundation(
        buildInput()
      );

    const requiredBoundaries = [
      "capability authorization does not grant command execution authority",
      "capability authorization does not grant repository modification authority",
      "capability authorization does not grant repository deletion authority",
      "capability authorization does not grant commit authority",
      "capability authorization does not grant push authority",
      "capability authorization does not grant deployment authority",
      "capability authorization does not grant secret access authority",
      "capability authorization does not grant autonomous execution authority"
    ];

    for (const boundary of requiredBoundaries) {
      assert.ok(
        result.authorizationBoundaries.includes(
          boundary
        )
      );
    }
  }
);
