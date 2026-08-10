import test from "node:test";
import assert from "node:assert/strict";

import type {
  RiverDevExecutionIntelligenceGovernancePreservationFoundation,
} from "../types";

import {
  createExecutionIntelligenceGovernanceConsolidationFoundation,
} from "./execution-intelligence-governance-consolidation-foundation-engine";

function createGovernancePreservation(
  overrides: Partial<RiverDevExecutionIntelligenceGovernancePreservationFoundation> = {},
): RiverDevExecutionIntelligenceGovernancePreservationFoundation {
  return {
    version: "1.0.0",
    governancePersistenceId: "persistence-alpha",
    preservationId: "preservation-alpha",
    trusted: true,
    preserved: true,
    preservationSignals: [
      "durable governed lifecycle meaning preserved",
    ],
    blockedReasons: [],
    provenance: [
      "governance-continuation:continuation-alpha",
      "governance-persistence:persistence-alpha",
      "governance-preservation-foundation:v1.0.0",
    ],
    authorizationBoundaries: [
      "repository authorization boundary preserved",
      "human authorization boundary maintained",
      "governance preservation cannot independently authorize repository modification",
      "governance preservation cannot independently authorize execution",
      "preservation protects durable governed lifecycle state without creating autonomous execution authority",
    ],
    scopeBoundaries: [
      "strict scope boundary maintained",
      "governance preservation cannot expand execution scope",
    ],
    ...overrides,
  };
}
test(
  "creates trusted governance consolidation from trusted preserved governance preservation",
  () => {
    const result =
      createExecutionIntelligenceGovernanceConsolidationFoundation({
        governancePreservation: createGovernancePreservation(),
      });

    assert.equal(result.trusted, true);
    assert.equal(result.consolidated, true);
    assert.deepEqual(result.blockedReasons, []);
  },
);

test(
  "blocks governance consolidation when governance preservation is untrusted",
  () => {
    const result =
      createExecutionIntelligenceGovernanceConsolidationFoundation({
        governancePreservation: createGovernancePreservation({
          trusted: false,
        }),
      });

    assert.equal(result.trusted, false);
    assert.equal(result.consolidated, false);

    assert.ok(
      result.blockedReasons.includes(
        "governance preservation is not trusted and preserved for consolidation",
      ),
    );
  },
);

test(
  "blocks governance consolidation when governance preservation is not preserved",
  () => {
    const result =
      createExecutionIntelligenceGovernanceConsolidationFoundation({
        governancePreservation: createGovernancePreservation({
          preserved: false,
        }),
      });

    assert.equal(result.trusted, false);
    assert.equal(result.consolidated, false);
  },
);

test(
  "blocks governance consolidation when governance preservation contains blocked reasons",
  () => {
    const result =
      createExecutionIntelligenceGovernanceConsolidationFoundation({
        governancePreservation: createGovernancePreservation({
          blockedReasons: [
            "predecessor governance preservation blocked",
          ],
        }),
      });

    assert.equal(result.trusted, false);
    assert.equal(result.consolidated, false);

    assert.ok(
      result.blockedReasons.includes(
        "predecessor governance preservation blocked",
      ),
    );
  },
);

test(
  "preserves governance preservation provenance and authorization boundaries",
  () => {
    const result =
      createExecutionIntelligenceGovernanceConsolidationFoundation({
        governancePreservation: createGovernancePreservation(),
      });

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
        "governance consolidation cannot independently authorize repository modification",
      ),
    );

    assert.ok(
      result.authorizationBoundaries.includes(
        "governance consolidation cannot independently authorize execution",
      ),
    );

    assert.ok(
      result.authorizationBoundaries.includes(
        "consolidation organizes and unifies governed lifecycle state without creating autonomous execution authority",
      ),
    );

    assert.ok(
      result.scopeBoundaries.includes(
        "strict scope boundary maintained",
      ),
    );

    assert.ok(
      result.scopeBoundaries.includes(
        "governance consolidation cannot expand execution scope",
      ),
    );
  },
);

test(
  "records governance consolidation signals",
  () => {
    const result =
      createExecutionIntelligenceGovernanceConsolidationFoundation({
        governancePreservation: createGovernancePreservation(),
      });

    assert.ok(
      result.consolidationSignals.includes(
        "governance preservation provenance accepted for consolidation",
      ),
    );

    assert.ok(
      result.consolidationSignals.includes(
        "governance preservation trust accepted for consolidation",
      ),
    );

    assert.ok(
      result.consolidationSignals.includes(
        "governance preservation state accepted for consolidation",
      ),
    );

    assert.ok(
      result.consolidationSignals.includes(
        "preserved governed lifecycle state consolidated",
      ),
    );
  },
);

test(
  "produces deterministic governance consolidation output",
  () => {
    const governancePreservation =
      createGovernancePreservation();

    const first =
      createExecutionIntelligenceGovernanceConsolidationFoundation({
        governancePreservation,
      });

    const second =
      createExecutionIntelligenceGovernanceConsolidationFoundation({
        governancePreservation,
      });

    assert.deepEqual(first, second);
  },
);
