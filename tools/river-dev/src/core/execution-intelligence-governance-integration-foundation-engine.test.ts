import test from "node:test";
import assert from "node:assert/strict";

import type {
  RiverDevExecutionIntelligenceGovernanceConsolidationFoundation,
} from "../types";

import {
  createExecutionIntelligenceGovernanceIntegrationFoundation,
} from "./execution-intelligence-governance-integration-foundation-engine";

function createGovernanceConsolidation(
  overrides: Partial<RiverDevExecutionIntelligenceGovernanceConsolidationFoundation> = {},
): RiverDevExecutionIntelligenceGovernanceConsolidationFoundation {
  return {
    version: "1.0.0",

    source:
      "river-development-agent-execution-intelligence-governance-consolidation",

    objective:
      "Preserve controlled execution intelligence governance",

    trusted: true,

    consolidated: true,

    preservation: {} as RiverDevExecutionIntelligenceGovernanceConsolidationFoundation["preservation"],

    consolidationState: [
      "governance preservation record accepted",
      "governed lifecycle state consolidated",
    ],

    consolidationSignals: [
      "governance preservation provenance accepted for consolidation",
      "governance preservation trust accepted for consolidation",
      "governance preservation state accepted for consolidation",
      "preserved governed lifecycle state consolidated",
    ],

    provenance: [
      "governance-preservation-foundation:v1.0.0",
      "governance consolidation provenance preserved",
    ],

    authorizationBoundaries: [
      "repository authorization boundary preserved",
      "human authorization boundary maintained",
      "governance consolidation cannot independently authorize repository modification",
      "governance consolidation cannot independently authorize execution",
    ],

    scopeBoundaries: [
      "strict scope boundary maintained",
      "governance consolidation cannot expand execution scope",
    ],

    blockedReasons: [],

    ...overrides,
  };
}

test(
  "creates trusted governance integration from trusted consolidated governance state",
  () => {
    const result =
      createExecutionIntelligenceGovernanceIntegrationFoundation({
        governanceConsolidation: createGovernanceConsolidation(),
      });

    assert.equal(result.trusted, true);
    assert.equal(result.integrated, true);
    assert.deepEqual(result.blockedReasons, []);

    assert.ok(
      result.integrationState.includes(
        "governed lifecycle state integrated",
      ),
    );
  },
);

test(
  "blocks trusted governance integration from untrusted consolidation",
  () => {
    const result =
      createExecutionIntelligenceGovernanceIntegrationFoundation({
        governanceConsolidation:
          createGovernanceConsolidation({
            trusted: false,
          }),
      });

    assert.equal(result.trusted, false);
    assert.equal(result.integrated, false);
    assert.ok(result.blockedReasons.length > 0);
  },
);

test(
  "blocks trusted governance integration from non-consolidated state",
  () => {
    const result =
      createExecutionIntelligenceGovernanceIntegrationFoundation({
        governanceConsolidation:
          createGovernanceConsolidation({
            consolidated: false,
          }),
      });

    assert.equal(result.trusted, false);
    assert.equal(result.integrated, false);
    assert.ok(result.blockedReasons.length > 0);
  },
);

test(
  "blocks trusted governance integration when consolidation has blocked reasons",
  () => {
    const result =
      createExecutionIntelligenceGovernanceIntegrationFoundation({
        governanceConsolidation:
          createGovernanceConsolidation({
            blockedReasons: [
              "governance consolidation blocked",
            ],
          }),
      });

    assert.equal(result.trusted, false);
    assert.equal(result.integrated, false);
    assert.ok(result.blockedReasons.length > 0);
  },
);

test(
  "preserves governance consolidation provenance and boundaries",
  () => {
    const result =
      createExecutionIntelligenceGovernanceIntegrationFoundation({
        governanceConsolidation:
          createGovernanceConsolidation(),
      });

    assert.ok(
      result.provenance.includes(
        "governance-preservation-foundation:v1.0.0",
      ),
    );

    assert.ok(
      result.provenance.includes(
        "governance-consolidation-foundation:v1.0.0",
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
        "governance integration cannot independently authorize repository modification",
      ),
    );

    assert.ok(
      result.authorizationBoundaries.includes(
        "governance integration cannot independently authorize execution",
      ),
    );

    assert.ok(
      result.authorizationBoundaries.includes(
        "integration connects and incorporates consolidated governed lifecycle state without creating autonomous execution authority",
      ),
    );

    assert.ok(
      result.scopeBoundaries.includes(
        "strict scope boundary maintained",
      ),
    );

    assert.ok(
      result.scopeBoundaries.includes(
        "governance integration cannot expand execution scope",
      ),
    );
  },
);

test(
  "records governance integration signals",
  () => {
    const result =
      createExecutionIntelligenceGovernanceIntegrationFoundation({
        governanceConsolidation:
          createGovernanceConsolidation(),
      });

    assert.ok(
      result.integrationSignals.includes(
        "governance consolidation provenance accepted for integration",
      ),
    );

    assert.ok(
      result.integrationSignals.includes(
        "governance consolidation trust accepted for integration",
      ),
    );

    assert.ok(
      result.integrationSignals.includes(
        "governance consolidation state accepted for integration",
      ),
    );

    assert.ok(
      result.integrationSignals.includes(
        "consolidated governed lifecycle state integrated",
      ),
    );
  },
);

test(
  "produces deterministic governance integration output",
  () => {
    const governanceConsolidation =
      createGovernanceConsolidation();

    const first =
      createExecutionIntelligenceGovernanceIntegrationFoundation({
        governanceConsolidation,
      });

    const second =
      createExecutionIntelligenceGovernanceIntegrationFoundation({
        governanceConsolidation,
      });

    assert.deepEqual(first, second);
  },
);
