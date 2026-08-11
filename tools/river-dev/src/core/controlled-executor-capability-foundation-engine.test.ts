import assert from "node:assert/strict";
import test from "node:test";

import type {
  RiverDevExecutionIntelligenceGovernanceExecutorAdmissionFoundation,
} from "../types";

import {
  buildControlledExecutorCapabilityFoundation,
} from "./controlled-executor-capability-foundation-engine";

function buildTrustedExecutorAdmission(
  overrides: Partial<RiverDevExecutionIntelligenceGovernanceExecutorAdmissionFoundation> = {},
): RiverDevExecutionIntelligenceGovernanceExecutorAdmissionFoundation {
  return {
    version: "DEV-246",
    source: "DEV-246 deterministic test fixture",
    objective: "Provide trusted executor-admission evidence.",

    trusted: true,
    ready: true,
    authorized: true,
    dispatchReady: true,
    handoffReady: true,
    executorAdmitted: true,

    executionHandoff: {} as RiverDevExecutionIntelligenceGovernanceExecutorAdmissionFoundation["executionHandoff"],

    executionRequest: [
      "inspect approved repository state",
    ],

    admissionState: [
      "executor admission eligibility established",
    ],

    provenance: [
      "human authorization evidence",
      "repository authorization evidence",
      "explicit approval evidence",
    ],

    authorizationBoundaries: [
      "explicit approval required",
      "repository authorization required",
    ],

    scopeBoundaries: [
      "approved execution scope",
    ],

    blockedReasons: [],

    ...overrides,
  };
}

test(
  "trusted admitted executor derives exact capability eligibility",
  () => {
    const executorAdmission =
      buildTrustedExecutorAdmission();

    const result =
      buildControlledExecutorCapabilityFoundation({
        executorAdmission,
      });

    assert.equal(result.version, "DEV-247");
    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.authorized, true);
    assert.equal(result.executorAdmitted, true);

    assert.equal(result.defaultPolicy, "DENY");
    assert.equal(result.capabilityEligibilityOnly, true);

    assert.deepEqual(
      result.recognizedCapabilities,
      [
        "inspect-approved-repository-state",
        "prepare-approved-repository-change",
        "validate-approved-repository-change",
      ],
    );

    assert.deepEqual(
      result.eligibleCapabilities,
      [
        "inspect-approved-repository-state",
        "prepare-approved-repository-change",
        "validate-approved-repository-change",
      ],
    );

    assert.deepEqual(
      result.executionRequest,
      executorAdmission.executionRequest,
    );
  },
);

test(
  "untrusted executor admission fails closed",
  () => {
    const result =
      buildControlledExecutorCapabilityFoundation({
        executorAdmission:
          buildTrustedExecutorAdmission({
            trusted: false,
          }),
      });

    assert.equal(result.trusted, false);
    assert.equal(result.ready, false);
    assert.deepEqual(result.eligibleCapabilities, []);

    assert.ok(
      result.blockedReasons.includes(
        "executor admission must be trusted before capability eligibility can be derived",
      ),
    );
  },
);

test(
  "not-ready executor admission fails closed",
  () => {
    const result =
      buildControlledExecutorCapabilityFoundation({
        executorAdmission:
          buildTrustedExecutorAdmission({
            ready: false,
          }),
      });

    assert.equal(result.ready, false);
    assert.deepEqual(result.eligibleCapabilities, []);

    assert.ok(
      result.blockedReasons.includes(
        "executor admission must be ready before capability eligibility can be derived",
      ),
    );
  },
);

test(
  "missing preserved authorization fails closed",
  () => {
    const result =
      buildControlledExecutorCapabilityFoundation({
        executorAdmission:
          buildTrustedExecutorAdmission({
            authorized: false,
          }),
      });

    assert.equal(result.ready, false);
    assert.equal(result.authorized, false);
    assert.deepEqual(result.eligibleCapabilities, []);

    assert.ok(
      result.blockedReasons.includes(
        "executor admission must preserve authorization before capability eligibility can be derived",
      ),
    );
  },
);

test(
  "missing dispatch readiness fails closed",
  () => {
    const result =
      buildControlledExecutorCapabilityFoundation({
        executorAdmission:
          buildTrustedExecutorAdmission({
            dispatchReady: false,
          }),
      });

    assert.equal(result.ready, false);
    assert.deepEqual(result.eligibleCapabilities, []);

    assert.ok(
      result.blockedReasons.includes(
        "executor admission must preserve dispatch readiness before capability eligibility can be derived",
      ),
    );
  },
);

test(
  "missing handoff readiness fails closed",
  () => {
    const result =
      buildControlledExecutorCapabilityFoundation({
        executorAdmission:
          buildTrustedExecutorAdmission({
            handoffReady: false,
          }),
      });

    assert.equal(result.ready, false);
    assert.deepEqual(result.eligibleCapabilities, []);

    assert.ok(
      result.blockedReasons.includes(
        "executor admission must preserve execution handoff readiness before capability eligibility can be derived",
      ),
    );
  },
);

test(
  "missing executor admission fails closed",
  () => {
    const result =
      buildControlledExecutorCapabilityFoundation({
        executorAdmission:
          buildTrustedExecutorAdmission({
            executorAdmitted: false,
          }),
      });

    assert.equal(result.ready, false);
    assert.equal(result.executorAdmitted, false);
    assert.deepEqual(result.eligibleCapabilities, []);

    assert.ok(
      result.blockedReasons.includes(
        "executor admission is required before capability eligibility can be derived",
      ),
    );
  },
);

test(
  "predecessor blockers prevent capability eligibility",
  () => {
    const result =
      buildControlledExecutorCapabilityFoundation({
        executorAdmission:
          buildTrustedExecutorAdmission({
            blockedReasons: [
              "predecessor governance blocker",
            ],
          }),
      });

    assert.equal(result.ready, false);
    assert.deepEqual(result.eligibleCapabilities, []);

    assert.ok(
      result.blockedReasons.includes(
        "executor admission must be unblocked before capability eligibility can be derived",
      ),
    );
  },
);

test(
  "missing governed execution request fails closed",
  () => {
    const result =
      buildControlledExecutorCapabilityFoundation({
        executorAdmission:
          buildTrustedExecutorAdmission({
            executionRequest: [],
          }),
      });

    assert.equal(result.ready, false);
    assert.deepEqual(result.eligibleCapabilities, []);

    assert.ok(
      result.blockedReasons.includes(
        "governed execution request evidence is required before capability eligibility can be derived",
      ),
    );
  },
);

test(
  "whitespace-only governed execution request fails closed",
  () => {
    const result =
      buildControlledExecutorCapabilityFoundation({
        executorAdmission:
          buildTrustedExecutorAdmission({
            executionRequest: [
              "   ",
              "",
            ],
          }),
      });

    assert.equal(result.ready, false);
    assert.deepEqual(result.eligibleCapabilities, []);
  },
);

test(
  "authorization provenance and approved scope are preserved",
  () => {
    const executorAdmission =
      buildTrustedExecutorAdmission();

    const result =
      buildControlledExecutorCapabilityFoundation({
        executorAdmission,
      });

    for (const evidence of executorAdmission.provenance) {
      assert.ok(result.provenance.includes(evidence));
    }

    for (
      const boundary
      of executorAdmission.authorizationBoundaries
    ) {
      assert.ok(
        result.authorizationBoundaries.includes(boundary),
      );
    }

    for (
      const boundary
      of executorAdmission.scopeBoundaries
    ) {
      assert.ok(
        result.scopeBoundaries.includes(boundary),
      );
    }

    assert.ok(
      result.provenance.includes(
        "DEV-247 capability eligibility derived from DEV-246 executor admission",
      ),
    );

    assert.ok(
      result.scopeBoundaries.includes(
        "capability eligibility cannot expand approved execution scope",
      ),
    );
  },
);

test(
  "capability eligibility grants no execution authority",
  () => {
    const result =
      buildControlledExecutorCapabilityFoundation({
        executorAdmission:
          buildTrustedExecutorAdmission(),
      });

    const requiredBoundaries = [
      "capability eligibility does not grant command execution authority",
      "capability eligibility does not grant repository modification authority",
      "capability eligibility does not grant repository deletion authority",
      "capability eligibility does not grant commit authority",
      "capability eligibility does not grant push authority",
      "capability eligibility does not grant deployment authority",
      "capability eligibility does not grant secret access authority",
      "capability eligibility does not grant autonomous execution authority",
    ];

    for (const boundary of requiredBoundaries) {
      assert.ok(
        result.authorizationBoundaries.includes(boundary),
      );
    }

    assert.ok(
      result.capabilityState.includes(
        "inspection capability is eligible but not authorized",
      ),
    );

    assert.ok(
      result.capabilityState.includes(
        "change preparation capability is eligible but not authorized",
      ),
    );

    assert.ok(
      result.capabilityState.includes(
        "change validation capability is eligible but not authorized",
      ),
    );
  },
);
