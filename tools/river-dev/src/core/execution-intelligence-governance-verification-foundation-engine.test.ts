import assert from "node:assert/strict";
import test from "node:test";

import {
  createExecutionIntelligenceGovernanceVerificationFoundation,
} from "./execution-intelligence-governance-verification-foundation-engine";

import type {
  RiverDevExecutionIntelligenceGovernanceAssuranceFoundation,
} from "../types";

function createGovernanceAssurance(
  overrides: Partial<RiverDevExecutionIntelligenceGovernanceAssuranceFoundation> = {},
): RiverDevExecutionIntelligenceGovernanceAssuranceFoundation {
  const base = {
    version: "1.0.0",
    assuranceId: "assurance-alpha",
    trusted: true,
    assured: true,
    assuranceSignals: ["stabilization trust assured"],
    blockedReasons: [],
    provenance: ["governance-stabilization:stabilization-alpha"],
    authorizationBoundaries: [
      "repository authorization boundary preserved",
      "human authorization boundary maintained",
    ],
    scopeBoundaries: ["strict scope boundary maintained"],
  };

  return {
    ...base,
    ...overrides,
  } as unknown as RiverDevExecutionIntelligenceGovernanceAssuranceFoundation;
}

test(
  "creates trusted governance verification from trusted governance assurance",
  () => {
    const result =
      createExecutionIntelligenceGovernanceVerificationFoundation({
        governanceAssurance: createGovernanceAssurance(),
      });

    assert.equal(result.trusted, true);
    assert.equal(result.verified, true);
    assert.deepEqual(result.blockedReasons, []);
  },
);

test(
  "blocks governance verification from untrusted governance assurance",
  () => {
    const result =
      createExecutionIntelligenceGovernanceVerificationFoundation({
        governanceAssurance: createGovernanceAssurance({
          trusted: false,
        }),
      });

    assert.equal(result.trusted, false);
    assert.equal(result.verified, false);

    assert.ok(
      result.blockedReasons.includes(
        "governance assurance is not trusted for verification",
      ),
    );
  },
);

test(
  "blocks governance verification when governance assurance contains blocked reasons",
  () => {
    const result =
      createExecutionIntelligenceGovernanceVerificationFoundation({
        governanceAssurance: createGovernanceAssurance({
          blockedReasons: ["predecessor governance assurance blocked"],
        }),
      });

    assert.equal(result.trusted, false);
    assert.equal(result.verified, false);

    assert.ok(
      result.blockedReasons.includes(
        "predecessor governance assurance blocked",
      ),
    );
  },
);

test(
  "preserves governance verification provenance and authorization boundaries",
  () => {
    const result =
      createExecutionIntelligenceGovernanceVerificationFoundation({
        governanceAssurance: createGovernanceAssurance(),
      });

    assert.ok(
      result.provenance.includes(
        "governance-stabilization:stabilization-alpha",
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
  "produces deterministic governance verification output",
  () => {
    const governanceAssurance = createGovernanceAssurance();

    const first =
      createExecutionIntelligenceGovernanceVerificationFoundation({
        governanceAssurance,
      });

    const second =
      createExecutionIntelligenceGovernanceVerificationFoundation({
        governanceAssurance,
      });

    assert.deepEqual(first, second);
  },
);
