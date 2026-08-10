import test from "node:test";
import assert from "node:assert/strict";

import type {
  RiverDevExecutionIntelligenceGovernanceCoordinationFoundation,
} from "../types";

import {
  createExecutionIntelligenceGovernanceOrchestrationFoundation,
} from "./execution-intelligence-governance-orchestration-foundation-engine";

function createGovernanceCoordination(
  overrides: Partial<RiverDevExecutionIntelligenceGovernanceCoordinationFoundation> = {},
): RiverDevExecutionIntelligenceGovernanceCoordinationFoundation {
  return {
    version: "1.0.0",

    source:
      "river-development-agent-execution-intelligence-governance-coordination",

    objective:
      "Preserve controlled execution intelligence governance",

    trusted: true,

    coordinated: true,

    integration:
      {} as RiverDevExecutionIntelligenceGovernanceCoordinationFoundation["integration"],

    coordinationState: [
      "governance integration record accepted",
      "governed lifecycle state coordinated",
    ],

    coordinationSignals: [
      "governance integration provenance accepted for coordination",
      "governance integration trust accepted for coordination",
      "governance integration state accepted for coordination",
      "integrated governed lifecycle state coordinated",
    ],

    provenance: [
      "governance-integration-foundation:v1.0.0",
      "governance coordination provenance preserved",
    ],

    authorizationBoundaries: [
      "repository authorization boundary preserved",
      "human authorization boundary maintained",
      "governance coordination cannot independently authorize repository modification",
      "governance coordination cannot independently authorize execution",
      "coordination organizes integrated governed lifecycle state without creating autonomous execution authority",
    ],

    scopeBoundaries: [
      "strict scope boundary maintained",
      "governance coordination cannot expand execution scope",
    ],

    blockedReasons: [],

    ...overrides,
  };
}

test(
  "creates trusted governance orchestration from trusted coordinated governance state",
  () => {
    const result =
      createExecutionIntelligenceGovernanceOrchestrationFoundation({
        governanceCoordination:
          createGovernanceCoordination(),
      });

    assert.equal(result.trusted, true);
    assert.equal(result.orchestrated, true);
    assert.deepEqual(result.blockedReasons, []);

    assert.ok(
      result.orchestrationState.includes(
        "governed lifecycle activity orchestrated",
      ),
    );
  },
);

test(
  "blocks trusted governance orchestration from untrusted coordination",
  () => {
    const result =
      createExecutionIntelligenceGovernanceOrchestrationFoundation({
        governanceCoordination:
          createGovernanceCoordination({
            trusted: false,
          }),
      });

    assert.equal(result.trusted, false);
    assert.equal(result.orchestrated, false);
    assert.ok(result.blockedReasons.length > 0);
  },
);

test(
  "blocks trusted governance orchestration from non-coordinated state",
  () => {
    const result =
      createExecutionIntelligenceGovernanceOrchestrationFoundation({
        governanceCoordination:
          createGovernanceCoordination({
            coordinated: false,
          }),
      });

    assert.equal(result.trusted, false);
    assert.equal(result.orchestrated, false);
    assert.ok(result.blockedReasons.length > 0);
  },
);

test(
  "blocks trusted governance orchestration when coordination has blocked reasons",
  () => {
    const result =
      createExecutionIntelligenceGovernanceOrchestrationFoundation({
        governanceCoordination:
          createGovernanceCoordination({
            blockedReasons: [
              "governance coordination blocked",
            ],
          }),
      });

    assert.equal(result.trusted, false);
    assert.equal(result.orchestrated, false);
    assert.ok(result.blockedReasons.length > 0);
  },
);

test(
  "preserves governance coordination provenance and boundaries",
  () => {
    const result =
      createExecutionIntelligenceGovernanceOrchestrationFoundation({
        governanceCoordination:
          createGovernanceCoordination(),
      });

    assert.ok(
      result.provenance.includes(
        "governance-integration-foundation:v1.0.0",
      ),
    );

    assert.ok(
      result.provenance.includes(
        "governance-coordination-foundation:v1.0.0",
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
        "governance orchestration cannot independently authorize repository modification",
      ),
    );

    assert.ok(
      result.authorizationBoundaries.includes(
        "governance orchestration cannot independently authorize execution",
      ),
    );

    assert.ok(
      result.authorizationBoundaries.includes(
        "orchestration organizes coordinated governed lifecycle state without creating autonomous execution authority",
      ),
    );

    assert.ok(
      result.scopeBoundaries.includes(
        "strict scope boundary maintained",
      ),
    );

    assert.ok(
      result.scopeBoundaries.includes(
        "governance orchestration cannot expand execution scope",
      ),
    );
  },
);

test(
  "records governance orchestration signals",
  () => {
    const result =
      createExecutionIntelligenceGovernanceOrchestrationFoundation({
        governanceCoordination:
          createGovernanceCoordination(),
      });

    assert.ok(
      result.orchestrationSignals.includes(
        "governance coordination provenance accepted for orchestration",
      ),
    );

    assert.ok(
      result.orchestrationSignals.includes(
        "governance coordination trust accepted for orchestration",
      ),
    );

    assert.ok(
      result.orchestrationSignals.includes(
        "governance coordination state accepted for orchestration",
      ),
    );

    assert.ok(
      result.orchestrationSignals.includes(
        "coordinated governed lifecycle activity orchestrated",
      ),
    );
  },
);

test(
  "produces deterministic governance orchestration output",
  () => {
    const governanceCoordination =
      createGovernanceCoordination();

    const first =
      createExecutionIntelligenceGovernanceOrchestrationFoundation({
        governanceCoordination,
      });

    const second =
      createExecutionIntelligenceGovernanceOrchestrationFoundation({
        governanceCoordination,
      });

    assert.deepEqual(first, second);
  },
);
