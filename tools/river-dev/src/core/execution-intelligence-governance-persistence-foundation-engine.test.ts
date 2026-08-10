import assert from "node:assert/strict";
import test from "node:test";

import {
  createExecutionIntelligenceGovernancePersistenceFoundation,
} from "./execution-intelligence-governance-persistence-foundation-engine";

import type {
  RiverDevExecutionIntelligenceGovernanceContinuationFoundation,
} from "../types";

function createGovernanceContinuation(
  overrides: Partial<RiverDevExecutionIntelligenceGovernanceContinuationFoundation> = {},
): RiverDevExecutionIntelligenceGovernanceContinuationFoundation {
  const base: RiverDevExecutionIntelligenceGovernanceContinuationFoundation = {
    version: "1.0.0",
    governanceCompletionId: "completion-alpha",
    continuationId: "continuation-alpha",
    trusted: true,
    continuing: true,
    continuationSignals: [
      "governed continuation eligibility recorded",
    ],
    blockedReasons: [],
    provenance: [
      "governance-completion:completion-alpha",
      "governance-continuation-foundation:v1.0.0",
    ],
    authorizationBoundaries: [
      "repository authorization boundary preserved",
      "human authorization boundary maintained",
      "governance continuation cannot independently authorize repository modification",
      "governance continuation cannot independently authorize execution",
    ],
    scopeBoundaries: [
      "strict scope boundary maintained",
      "governance continuation cannot expand execution scope",
    ],
  };

  return {
    ...base,
    ...overrides,
  };
}

test(
  "creates trusted governance persistence from trusted continuing governance continuation",
  () => {
    const result =
      createExecutionIntelligenceGovernancePersistenceFoundation({
        governanceContinuation: createGovernanceContinuation(),
      });

    assert.equal(result.trusted, true);
    assert.equal(result.persisted, true);
    assert.deepEqual(result.blockedReasons, []);
    assert.equal(
      result.governanceContinuationId,
      "continuation-alpha",
    );
    assert.equal(
      result.persistenceId,
      "governance-persistence:continuation-alpha:trusted",
    );
  },
);

test(
  "blocks governance persistence from untrusted governance continuation",
  () => {
    const result =
      createExecutionIntelligenceGovernancePersistenceFoundation({
        governanceContinuation: createGovernanceContinuation({
          trusted: false,
        }),
      });

    assert.equal(result.trusted, false);
    assert.equal(result.persisted, false);

    assert.ok(
      result.blockedReasons.includes(
        "governance continuation is not trusted and continuing for persistence",
      ),
    );
  },
);

test(
  "blocks governance persistence from non-continuing governance continuation",
  () => {
    const result =
      createExecutionIntelligenceGovernancePersistenceFoundation({
        governanceContinuation: createGovernanceContinuation({
          continuing: false,
        }),
      });

    assert.equal(result.trusted, false);
    assert.equal(result.persisted, false);

    assert.ok(
      result.blockedReasons.includes(
        "governance continuation is not trusted and continuing for persistence",
      ),
    );
  },
);

test(
  "blocks governance persistence when governance continuation contains blocked reasons",
  () => {
    const result =
      createExecutionIntelligenceGovernancePersistenceFoundation({
        governanceContinuation: createGovernanceContinuation({
          blockedReasons: [
            "predecessor governance continuation blocked",
          ],
        }),
      });

    assert.equal(result.trusted, false);
    assert.equal(result.persisted, false);

    assert.ok(
      result.blockedReasons.includes(
        "predecessor governance continuation blocked",
      ),
    );

    assert.ok(
      result.blockedReasons.includes(
        "governance continuation is not trusted and continuing for persistence",
      ),
    );
  },
);

test(
  "preserves governance persistence provenance and authorization boundaries",
  () => {
    const result =
      createExecutionIntelligenceGovernancePersistenceFoundation({
        governanceContinuation: createGovernanceContinuation(),
      });

    assert.ok(
      result.provenance.includes(
        "governance-completion:completion-alpha",
      ),
    );

    assert.ok(
      result.provenance.includes(
        "governance-continuation:continuation-alpha",
      ),
    );

    assert.ok(
      result.provenance.includes(
        "governance-persistence-foundation:v1.0.0",
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
        "governance persistence cannot independently authorize repository modification",
      ),
    );

    assert.ok(
      result.authorizationBoundaries.includes(
        "governance persistence cannot independently authorize execution",
      ),
    );

    assert.ok(
      result.authorizationBoundaries.includes(
        "persistence represents durable governed lifecycle state, not autonomous execution authority",
      ),
    );

    assert.ok(
      result.scopeBoundaries.includes(
        "strict scope boundary maintained",
      ),
    );

    assert.ok(
      result.scopeBoundaries.includes(
        "governance persistence cannot expand execution scope",
      ),
    );
  },
);

test(
  "records governance persistence signals",
  () => {
    const result =
      createExecutionIntelligenceGovernancePersistenceFoundation({
        governanceContinuation: createGovernanceContinuation(),
      });

    assert.ok(
      result.persistenceSignals.includes(
        "governance continuation provenance accepted for persistence",
      ),
    );

    assert.ok(
      result.persistenceSignals.includes(
        "governance continuation trust accepted for persistence",
      ),
    );

    assert.ok(
      result.persistenceSignals.includes(
        "governance continuation state accepted for persistence",
      ),
    );

    assert.ok(
      result.persistenceSignals.includes(
        "durable governed lifecycle state recorded",
      ),
    );
  },
);

test(
  "produces deterministic governance persistence output",
  () => {
    const governanceContinuation =
      createGovernanceContinuation();

    const first =
      createExecutionIntelligenceGovernancePersistenceFoundation({
        governanceContinuation,
      });

    const second =
      createExecutionIntelligenceGovernancePersistenceFoundation({
        governanceContinuation,
      });

    assert.deepEqual(first, second);
  },
);
