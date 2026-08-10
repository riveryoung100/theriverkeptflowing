import test from "node:test";
import assert from "node:assert/strict";

import type {
  RiverDevExecutionIntelligenceGovernanceIntegrationFoundation,
} from "../types";

import {
  createExecutionIntelligenceGovernanceCoordinationFoundation,
} from "./execution-intelligence-governance-coordination-foundation-engine";

function createGovernanceIntegration(
  overrides: Partial<RiverDevExecutionIntelligenceGovernanceIntegrationFoundation> = {},
): RiverDevExecutionIntelligenceGovernanceIntegrationFoundation {
  return {
    version: "1.0.0",

    source:
      "river-development-agent-execution-intelligence-governance-integration",

    objective:
      "Preserve controlled execution intelligence governance",

    trusted: true,

    integrated: true,

    consolidation:
      {} as RiverDevExecutionIntelligenceGovernanceIntegrationFoundation["consolidation"],

    integrationState: [
      "governance consolidation record accepted",
      "governed lifecycle state integrated",
    ],

    integrationSignals: [
      "governance consolidation provenance accepted for integration",
      "governance consolidation trust accepted for integration",
      "governance consolidation state accepted for integration",
      "consolidated governed lifecycle state integrated",
    ],

    provenance: [
      "governance-consolidation-foundation:v1.0.0",
      "governance integration provenance preserved",
    ],

    authorizationBoundaries: [
      "repository authorization boundary preserved",
      "human authorization boundary maintained",
      "governance integration cannot independently authorize repository modification",
      "governance integration cannot independently authorize execution",
      "integration connects and incorporates consolidated governed lifecycle state without creating autonomous execution authority",
    ],

    scopeBoundaries: [
      "strict scope boundary maintained",
      "governance integration cannot expand execution scope",
    ],

    blockedReasons: [],

    ...overrides,
  };
}

test(
  "creates trusted governance coordination from trusted integrated governance state",
  () => {
    const result =
      createExecutionIntelligenceGovernanceCoordinationFoundation({
        governanceIntegration:
          createGovernanceIntegration(),
      });

    assert.equal(result.trusted, true);
    assert.equal(result.coordinated, true);
    assert.deepEqual(result.blockedReasons, []);

    assert.ok(
      result.coordinationState.includes(
        "governed lifecycle state coordinated",
      ),
    );
  },
);

test(
  "blocks trusted governance coordination from untrusted integration",
  () => {
    const result =
      createExecutionIntelligenceGovernanceCoordinationFoundation({
        governanceIntegration:
          createGovernanceIntegration({
            trusted: false,
          }),
      });

    assert.equal(result.trusted, false);
    assert.equal(result.coordinated, false);
    assert.ok(result.blockedReasons.length > 0);
  },
);

test(
  "blocks trusted governance coordination from non-integrated state",
  () => {
    const result =
      createExecutionIntelligenceGovernanceCoordinationFoundation({
        governanceIntegration:
          createGovernanceIntegration({
            integrated: false,
          }),
      });

    assert.equal(result.trusted, false);
    assert.equal(result.coordinated, false);
    assert.ok(result.blockedReasons.length > 0);
  },
);

test(
  "blocks trusted governance coordination when integration has blocked reasons",
  () => {
    const result =
      createExecutionIntelligenceGovernanceCoordinationFoundation({
        governanceIntegration:
          createGovernanceIntegration({
            blockedReasons: [
              "governance integration blocked",
            ],
          }),
      });

    assert.equal(result.trusted, false);
    assert.equal(result.coordinated, false);
    assert.ok(result.blockedReasons.length > 0);
  },
);

test(
  "preserves governance integration provenance and boundaries",
  () => {
    const result =
      createExecutionIntelligenceGovernanceCoordinationFoundation({
        governanceIntegration:
          createGovernanceIntegration(),
      });

    assert.ok(
      result.provenance.includes(
        "governance-consolidation-foundation:v1.0.0",
      ),
    );

    assert.ok(
      result.provenance.includes(
        "governance-integration-foundation:v1.0.0",
      ),
    );

    assert.ok(
      result.authorizationBoundaries.includes(
        "repository authorization boundary preserved",
      ),
    );

    assert.ok(
      result.authorizationBoundaries.includes(
        "human authorization boundary maintained",
      ),
    );

    assert.ok(
      result.authorizationBoundaries.includes(
        "governance coordination cannot independently authorize repository modification",
      ),
    );

    assert.ok(
      result.authorizationBoundaries.includes(
        "governance coordination cannot independently authorize execution",
      ),
    );

    assert.ok(
      result.authorizationBoundaries.includes(
        "coordination organizes integrated governed lifecycle state without creating autonomous execution authority",
      ),
    );

    assert.ok(
      result.scopeBoundaries.includes(
        "strict scope boundary maintained",
      ),
    );

    assert.ok(
      result.scopeBoundaries.includes(
        "governance coordination cannot expand execution scope",
      ),
    );
  },
);

test(
  "records governance coordination signals",
  () => {
    const result =
      createExecutionIntelligenceGovernanceCoordinationFoundation({
        governanceIntegration:
          createGovernanceIntegration(),
      });

    assert.ok(
      result.coordinationSignals.includes(
        "governance integration provenance accepted for coordination",
      ),
    );

    assert.ok(
      result.coordinationSignals.includes(
        "governance integration trust accepted for coordination",
      ),
    );

    assert.ok(
      result.coordinationSignals.includes(
        "governance integration state accepted for coordination",
      ),
    );

    assert.ok(
      result.coordinationSignals.includes(
        "integrated governed lifecycle state coordinated",
      ),
    );
  },
);

test(
  "produces deterministic governance coordination output",
  () => {
    const governanceIntegration =
      createGovernanceIntegration();

    const first =
      createExecutionIntelligenceGovernanceCoordinationFoundation({
        governanceIntegration,
      });

    const second =
      createExecutionIntelligenceGovernanceCoordinationFoundation({
        governanceIntegration,
      });

    assert.deepEqual(first, second);
  },
);
