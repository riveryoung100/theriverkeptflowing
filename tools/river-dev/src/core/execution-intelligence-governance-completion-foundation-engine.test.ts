import assert from "node:assert/strict";
import test from "node:test";

import {
  createExecutionIntelligenceGovernanceCompletionFoundation,
} from "./execution-intelligence-governance-completion-foundation-engine";

import type {
  RiverDevExecutionIntelligenceGovernanceCertificationFoundation,
} from "../types";

function createGovernanceCertification(
  overrides: Partial<RiverDevExecutionIntelligenceGovernanceCertificationFoundation> = {},
): RiverDevExecutionIntelligenceGovernanceCertificationFoundation {
  const base: RiverDevExecutionIntelligenceGovernanceCertificationFoundation = {
    version: "1.0.0",
    governanceVerificationId: "verification-alpha",
    certificationId: "certification-alpha",
    trusted: true,
    certified: true,
    certificationSignals: [
      "governance verification trust certified",
    ],
    blockedReasons: [],
    provenance: [
      "governance-verification:verification-alpha",
      "governance-certification-foundation:v1.0.0",
    ],
    authorizationBoundaries: [
      "repository authorization boundary preserved",
      "human authorization boundary maintained",
      "governance certification cannot independently authorize repository modification",
    ],
    scopeBoundaries: [
      "strict scope boundary maintained",
      "governance certification cannot expand execution scope",
    ],
  };

  return {
    ...base,
    ...overrides,
  };
}

test(
  "creates trusted governance completion from trusted certified governance certification",
  () => {
    const result =
      createExecutionIntelligenceGovernanceCompletionFoundation({
        governanceCertification: createGovernanceCertification(),
      });

    assert.equal(result.trusted, true);
    assert.equal(result.completed, true);
    assert.deepEqual(result.blockedReasons, []);
  },
);

test(
  "blocks governance completion from untrusted governance certification",
  () => {
    const result =
      createExecutionIntelligenceGovernanceCompletionFoundation({
        governanceCertification: createGovernanceCertification({
          trusted: false,
        }),
      });

    assert.equal(result.trusted, false);
    assert.equal(result.completed, false);

    assert.ok(
      result.blockedReasons.includes(
        "governance certification is not trusted and certified for completion",
      ),
    );
  },
);

test(
  "blocks governance completion from uncertified governance certification",
  () => {
    const result =
      createExecutionIntelligenceGovernanceCompletionFoundation({
        governanceCertification: createGovernanceCertification({
          certified: false,
        }),
      });

    assert.equal(result.trusted, false);
    assert.equal(result.completed, false);

    assert.ok(
      result.blockedReasons.includes(
        "governance certification is not trusted and certified for completion",
      ),
    );
  },
);

test(
  "blocks governance completion when governance certification contains blocked reasons",
  () => {
    const result =
      createExecutionIntelligenceGovernanceCompletionFoundation({
        governanceCertification: createGovernanceCertification({
          blockedReasons: [
            "predecessor governance certification blocked",
          ],
        }),
      });

    assert.equal(result.trusted, false);
    assert.equal(result.completed, false);

    assert.ok(
      result.blockedReasons.includes(
        "predecessor governance certification blocked",
      ),
    );
  },
);

test(
  "preserves governance completion provenance and authorization boundaries",
  () => {
    const result =
      createExecutionIntelligenceGovernanceCompletionFoundation({
        governanceCertification: createGovernanceCertification(),
      });

    assert.ok(
      result.provenance.includes(
        "governance-verification:verification-alpha",
      ),
    );

    assert.ok(
      result.provenance.includes(
        "governance-certification:certification-alpha",
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
        "governance completion cannot independently authorize repository modification",
      ),
    );

    assert.ok(
      result.authorizationBoundaries.includes(
        "governance completion represents lifecycle closure without granting new execution authority",
      ),
    );

    assert.ok(
      result.scopeBoundaries.includes(
        "strict scope boundary maintained",
      ),
    );

    assert.ok(
      result.scopeBoundaries.includes(
        "governance completion cannot expand execution scope",
      ),
    );
  },
);

test(
  "produces deterministic governance completion output",
  () => {
    const governanceCertification =
      createGovernanceCertification();

    const first =
      createExecutionIntelligenceGovernanceCompletionFoundation({
        governanceCertification,
      });

    const second =
      createExecutionIntelligenceGovernanceCompletionFoundation({
        governanceCertification,
      });

    assert.deepEqual(first, second);
  },
);
