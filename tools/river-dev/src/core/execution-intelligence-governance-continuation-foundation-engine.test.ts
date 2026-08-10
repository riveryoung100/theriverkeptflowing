import assert from "node:assert/strict";
import test from "node:test";

import {
  createExecutionIntelligenceGovernanceContinuationFoundation,
} from "./execution-intelligence-governance-continuation-foundation-engine";

import type {
  RiverDevExecutionIntelligenceGovernanceCompletionFoundation,
} from "../types";

function createGovernanceCompletion(
  overrides: Partial<RiverDevExecutionIntelligenceGovernanceCompletionFoundation> = {},
): RiverDevExecutionIntelligenceGovernanceCompletionFoundation {
  const base: RiverDevExecutionIntelligenceGovernanceCompletionFoundation = {
    version: "1.0.0",
    governanceCertificationId: "certification-alpha",
    completionId: "completion-alpha",
    trusted: true,
    completed: true,
    completionSignals: [
      "governance lifecycle closure recorded",
    ],
    blockedReasons: [],
    provenance: [
      "governance-certification:certification-alpha",
      "governance-completion-foundation:v1.0.0",
    ],
    authorizationBoundaries: [
      "repository authorization boundary preserved",
      "human authorization boundary maintained",
      "governance completion cannot independently authorize repository modification",
      "governance completion represents lifecycle closure without granting new execution authority",
    ],
    scopeBoundaries: [
      "strict scope boundary maintained",
      "governance completion cannot expand execution scope",
    ],
  };

  return {
    ...base,
    ...overrides,
  };
}

test(
  "creates trusted governance continuation from trusted completed governance completion",
  () => {
    const result =
      createExecutionIntelligenceGovernanceContinuationFoundation({
        governanceCompletion: createGovernanceCompletion(),
      });

    assert.equal(result.trusted, true);
    assert.equal(result.continuing, true);
    assert.deepEqual(result.blockedReasons, []);
  },
);

test(
  "blocks governance continuation from untrusted governance completion",
  () => {
    const result =
      createExecutionIntelligenceGovernanceContinuationFoundation({
        governanceCompletion: createGovernanceCompletion({
          trusted: false,
        }),
      });

    assert.equal(result.trusted, false);
    assert.equal(result.continuing, false);

    assert.ok(
      result.blockedReasons.includes(
        "governance completion is not trusted and completed for continuation",
      ),
    );
  },
);

test(
  "blocks governance continuation from incomplete governance completion",
  () => {
    const result =
      createExecutionIntelligenceGovernanceContinuationFoundation({
        governanceCompletion: createGovernanceCompletion({
          completed: false,
        }),
      });

    assert.equal(result.trusted, false);
    assert.equal(result.continuing, false);

    assert.ok(
      result.blockedReasons.includes(
        "governance completion is not trusted and completed for continuation",
      ),
    );
  },
);

test(
  "blocks governance continuation when governance completion contains blocked reasons",
  () => {
    const result =
      createExecutionIntelligenceGovernanceContinuationFoundation({
        governanceCompletion: createGovernanceCompletion({
          blockedReasons: [
            "predecessor governance completion blocked",
          ],
        }),
      });

    assert.equal(result.trusted, false);
    assert.equal(result.continuing, false);

    assert.ok(
      result.blockedReasons.includes(
        "predecessor governance completion blocked",
      ),
    );
  },
);

test(
  "preserves governance continuation provenance and authorization boundaries",
  () => {
    const result =
      createExecutionIntelligenceGovernanceContinuationFoundation({
        governanceCompletion: createGovernanceCompletion(),
      });

    assert.ok(
      result.provenance.includes(
        "governance-certification:certification-alpha",
      ),
    );

    assert.ok(
      result.provenance.includes(
        "governance-completion:completion-alpha",
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
        "governance continuation cannot independently authorize repository modification",
      ),
    );

    assert.ok(
      result.authorizationBoundaries.includes(
        "governance continuation cannot independently authorize execution",
      ),
    );

    assert.ok(
      result.authorizationBoundaries.includes(
        "governance continuation represents eligibility for a subsequent controlled lifecycle step, not execution authority",
      ),
    );

    assert.ok(
      result.scopeBoundaries.includes(
        "strict scope boundary maintained",
      ),
    );

    assert.ok(
      result.scopeBoundaries.includes(
        "governance continuation cannot expand execution scope",
      ),
    );
  },
);

test(
  "produces deterministic governance continuation output",
  () => {
    const governanceCompletion =
      createGovernanceCompletion();

    const first =
      createExecutionIntelligenceGovernanceContinuationFoundation({
        governanceCompletion,
      });

    const second =
      createExecutionIntelligenceGovernanceContinuationFoundation({
        governanceCompletion,
      });

    assert.deepEqual(first, second);
  },
);
