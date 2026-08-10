import assert from "node:assert/strict";
import test from "node:test";

import {
  createExecutionIntelligenceGovernanceCertificationFoundation,
} from "./execution-intelligence-governance-certification-foundation-engine";

import type {
  RiverDevExecutionIntelligenceGovernanceVerificationFoundation,
} from "../types";

function createGovernanceVerification(
  overrides: Partial<RiverDevExecutionIntelligenceGovernanceVerificationFoundation> = {},
): RiverDevExecutionIntelligenceGovernanceVerificationFoundation {
  const base: RiverDevExecutionIntelligenceGovernanceVerificationFoundation = {
    version: "1.0.0",
    governanceAssuranceId: "assurance-alpha",
    verificationId: "verification-alpha",
    trusted: true,
    verified: true,
    verificationSignals: [
      "governance assurance trust verified",
    ],
    blockedReasons: [],
    provenance: [
      "governance-assurance:assurance-alpha",
      "governance-verification-foundation:v1.0.0",
    ],
    authorizationBoundaries: [
      "repository authorization boundary preserved",
      "human authorization boundary maintained",
    ],
    scopeBoundaries: [
      "strict scope boundary maintained",
    ],
  };

  return {
    ...base,
    ...overrides,
  };
}

test(
  "creates trusted governance certification from trusted verified governance verification",
  () => {
    const result =
      createExecutionIntelligenceGovernanceCertificationFoundation({
        governanceVerification: createGovernanceVerification(),
      });

    assert.equal(result.trusted, true);
    assert.equal(result.certified, true);
    assert.deepEqual(result.blockedReasons, []);
  },
);

test(
  "blocks governance certification from untrusted governance verification",
  () => {
    const result =
      createExecutionIntelligenceGovernanceCertificationFoundation({
        governanceVerification: createGovernanceVerification({
          trusted: false,
        }),
      });

    assert.equal(result.trusted, false);
    assert.equal(result.certified, false);

    assert.ok(
      result.blockedReasons.includes(
        "governance verification is not trusted and verified for certification",
      ),
    );
  },
);

test(
  "blocks governance certification from unverified governance verification",
  () => {
    const result =
      createExecutionIntelligenceGovernanceCertificationFoundation({
        governanceVerification: createGovernanceVerification({
          verified: false,
        }),
      });

    assert.equal(result.trusted, false);
    assert.equal(result.certified, false);

    assert.ok(
      result.blockedReasons.includes(
        "governance verification is not trusted and verified for certification",
      ),
    );
  },
);

test(
  "blocks governance certification when governance verification contains blocked reasons",
  () => {
    const result =
      createExecutionIntelligenceGovernanceCertificationFoundation({
        governanceVerification: createGovernanceVerification({
          blockedReasons: [
            "predecessor governance verification blocked",
          ],
        }),
      });

    assert.equal(result.trusted, false);
    assert.equal(result.certified, false);

    assert.ok(
      result.blockedReasons.includes(
        "predecessor governance verification blocked",
      ),
    );
  },
);

test(
  "preserves governance certification provenance and authorization boundaries",
  () => {
    const result =
      createExecutionIntelligenceGovernanceCertificationFoundation({
        governanceVerification: createGovernanceVerification(),
      });

    assert.ok(
      result.provenance.includes(
        "governance-assurance:assurance-alpha",
      ),
    );

    assert.ok(
      result.provenance.includes(
        "governance-verification:verification-alpha",
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
      result.scopeBoundaries.includes(
        "strict scope boundary maintained",
      ),
    );
  },
);

test(
  "produces deterministic governance certification output",
  () => {
    const governanceVerification = createGovernanceVerification();

    const first =
      createExecutionIntelligenceGovernanceCertificationFoundation({
        governanceVerification,
      });

    const second =
      createExecutionIntelligenceGovernanceCertificationFoundation({
        governanceVerification,
      });

    assert.deepEqual(first, second);
  },
);
