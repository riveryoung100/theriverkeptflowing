import assert from "node:assert/strict";
import test from "node:test";

import {
  createExecutionIntelligenceGovernancePreservationFoundation,
} from "./execution-intelligence-governance-preservation-foundation-engine";

import type {
  RiverDevExecutionIntelligenceGovernancePersistenceFoundation,
} from "../types";

function createGovernancePersistence(
  overrides: Partial<RiverDevExecutionIntelligenceGovernancePersistenceFoundation> = {},
): RiverDevExecutionIntelligenceGovernancePersistenceFoundation {
  const base: RiverDevExecutionIntelligenceGovernancePersistenceFoundation = {
    version: "1.0.0",
    governanceContinuationId: "continuation-alpha",
    persistenceId: "persistence-alpha",
    trusted: true,
    persisted: true,
    persistenceSignals: [
      "durable governed lifecycle state recorded",
    ],
    blockedReasons: [],
    provenance: [
      "governance-continuation:continuation-alpha",
      "governance-persistence-foundation:v1.0.0",
    ],
    authorizationBoundaries: [
      "repository authorization boundary preserved",
      "human authorization boundary maintained",
      "governance persistence cannot independently authorize repository modification",
      "governance persistence cannot independently authorize execution",
      "persistence represents durable governed lifecycle state, not autonomous execution authority",
    ],
    scopeBoundaries: [
      "strict scope boundary maintained",
      "governance persistence cannot expand execution scope",
    ],
  };

  return {
    ...base,
    ...overrides,
  };
}

test(
  "creates trusted governance preservation from trusted persisted governance persistence",
  () => {
    const result =
      createExecutionIntelligenceGovernancePreservationFoundation({
        governancePersistence: createGovernancePersistence(),
      });

    assert.equal(result.trusted, true);
    assert.equal(result.preserved, true);
    assert.deepEqual(result.blockedReasons, []);

    assert.equal(
      result.governancePersistenceId,
      "persistence-alpha",
    );

    assert.equal(
      result.preservationId,
      "governance-preservation:persistence-alpha:trusted",
    );
  },
);

test(
  "blocks governance preservation from untrusted governance persistence",
  () => {
    const result =
      createExecutionIntelligenceGovernancePreservationFoundation({
        governancePersistence: createGovernancePersistence({
          trusted: false,
        }),
      });

    assert.equal(result.trusted, false);
    assert.equal(result.preserved, false);

    assert.ok(
      result.blockedReasons.includes(
        "governance persistence is not trusted and persisted for preservation",
      ),
    );
  },
);

test(
  "blocks governance preservation from non-persisted governance persistence",
  () => {
    const result =
      createExecutionIntelligenceGovernancePreservationFoundation({
        governancePersistence: createGovernancePersistence({
          persisted: false,
        }),
      });

    assert.equal(result.trusted, false);
    assert.equal(result.preserved, false);

    assert.ok(
      result.blockedReasons.includes(
        "governance persistence is not trusted and persisted for preservation",
      ),
    );
  },
);

test(
  "blocks governance preservation when governance persistence contains blocked reasons",
  () => {
    const result =
      createExecutionIntelligenceGovernancePreservationFoundation({
        governancePersistence: createGovernancePersistence({
          blockedReasons: [
            "predecessor governance persistence blocked",
          ],
        }),
      });

    assert.equal(result.trusted, false);
    assert.equal(result.preserved, false);

    assert.ok(
      result.blockedReasons.includes(
        "predecessor governance persistence blocked",
      ),
    );

    assert.ok(
      result.blockedReasons.includes(
        "governance persistence is not trusted and persisted for preservation",
      ),
    );
  },
);

test(
  "preserves governance preservation provenance and authorization boundaries",
  () => {
    const result =
      createExecutionIntelligenceGovernancePreservationFoundation({
        governancePersistence: createGovernancePersistence(),
      });

    assert.ok(
      result.provenance.includes(
        "governance-continuation:continuation-alpha",
      ),
    );

    assert.ok(
      result.provenance.includes(
        "governance-persistence:persistence-alpha",
      ),
    );

    assert.ok(
      result.provenance.includes(
        "governance-preservation-foundation:v1.0.0",
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
        "governance preservation cannot independently authorize repository modification",
      ),
    );

    assert.ok(
      result.authorizationBoundaries.includes(
        "governance preservation cannot independently authorize execution",
      ),
    );

    assert.ok(
      result.authorizationBoundaries.includes(
        "preservation protects durable governed lifecycle state without creating autonomous execution authority",
      ),
    );

    assert.ok(
      result.scopeBoundaries.includes(
        "strict scope boundary maintained",
      ),
    );

    assert.ok(
      result.scopeBoundaries.includes(
        "governance preservation cannot expand execution scope",
      ),
    );
  },
);

test(
  "records governance preservation signals",
  () => {
    const result =
      createExecutionIntelligenceGovernancePreservationFoundation({
        governancePersistence: createGovernancePersistence(),
      });

    assert.ok(
      result.preservationSignals.includes(
        "governance persistence provenance accepted for preservation",
      ),
    );

    assert.ok(
      result.preservationSignals.includes(
        "governance persistence trust accepted for preservation",
      ),
    );

    assert.ok(
      result.preservationSignals.includes(
        "governance persistence state accepted for preservation",
      ),
    );

    assert.ok(
      result.preservationSignals.includes(
        "durable governed lifecycle meaning preserved",
      ),
    );
  },
);

test(
  "produces deterministic governance preservation output",
  () => {
    const governancePersistence =
      createGovernancePersistence();

    const first =
      createExecutionIntelligenceGovernancePreservationFoundation({
        governancePersistence,
      });

    const second =
      createExecutionIntelligenceGovernancePreservationFoundation({
        governancePersistence,
      });

    assert.deepEqual(first, second);
  },
);
