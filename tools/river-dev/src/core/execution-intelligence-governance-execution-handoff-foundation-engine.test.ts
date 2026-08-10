import assert from "node:assert/strict";
import test from "node:test";

import {
  buildExecutionIntelligenceGovernanceExecutionHandoffFoundation
} from "./execution-intelligence-governance-execution-handoff-foundation-engine";

import type {
  RiverDevExecutionIntelligenceGovernanceExecutionDispatchFoundation
} from "../types";

function createDispatch(
  overrides: Partial<RiverDevExecutionIntelligenceGovernanceExecutionDispatchFoundation> = {}
): RiverDevExecutionIntelligenceGovernanceExecutionDispatchFoundation {
  const base =
    {
      version: "1.0.0",
      source: "dev-244-test-dispatch",
      objective: "Test dispatch readiness.",

      trusted: true,
      ready: true,
      authorized: true,
      dispatchReady: true,

      executionRuntime: {} as RiverDevExecutionIntelligenceGovernanceExecutionDispatchFoundation["executionRuntime"],

      executionRequest: [
        "repository:path:tools/river-dev/src/example.ts"
      ],

      dispatchState: [
        "dispatch readiness established"
      ],

      provenance: [
        "human authorization evidence",
        "repository authorization evidence",
        "explicit approval evidence"
      ],

      authorizationBoundaries: [
        "explicit approval required"
      ],

      scopeBoundaries: [
        "approved execution scope"
      ],

      blockedReasons: []
    } satisfies RiverDevExecutionIntelligenceGovernanceExecutionDispatchFoundation;

  return {
    ...base,
    ...overrides
  };
}

test(
  "establishes handoff readiness for a trusted authorized dispatch-ready record",
  () => {
    const executionDispatch =
      createDispatch();

    const result =
      buildExecutionIntelligenceGovernanceExecutionHandoffFoundation({
        executionDispatch
      });

    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.authorized, true);
    assert.equal(result.dispatchReady, true);
    assert.equal(result.handoffReady, true);
    assert.deepEqual(
      result.executionRequest,
      executionDispatch.executionRequest
    );
    assert.deepEqual(result.blockedReasons, []);
  }
);

test(
  "fails closed when execution-dispatch evidence is untrusted",
  () => {
    const result =
      buildExecutionIntelligenceGovernanceExecutionHandoffFoundation({
        executionDispatch:
          createDispatch({
            trusted: false
          })
      });

    assert.equal(result.handoffReady, false);

    assert.ok(
      result.blockedReasons.includes(
        "execution handoff requires trusted execution-dispatch evidence"
      )
    );
  }
);

test(
  "fails closed when execution-dispatch evidence is not ready",
  () => {
    const result =
      buildExecutionIntelligenceGovernanceExecutionHandoffFoundation({
        executionDispatch:
          createDispatch({
            ready: false
          })
      });

    assert.equal(result.handoffReady, false);

    assert.ok(
      result.blockedReasons.includes(
        "execution handoff requires ready execution-dispatch evidence"
      )
    );
  }
);

test(
  "fails closed when execution authorization is absent",
  () => {
    const result =
      buildExecutionIntelligenceGovernanceExecutionHandoffFoundation({
        executionDispatch:
          createDispatch({
            authorized: false
          })
      });

    assert.equal(result.handoffReady, false);

    assert.ok(
      result.blockedReasons.includes(
        "execution handoff requires preserved execution authorization"
      )
    );
  }
);

test(
  "fails closed when explicit dispatch readiness is absent",
  () => {
    const result =
      buildExecutionIntelligenceGovernanceExecutionHandoffFoundation({
        executionDispatch:
          createDispatch({
            dispatchReady: false
          })
      });

    assert.equal(result.handoffReady, false);

    assert.ok(
      result.blockedReasons.includes(
        "execution handoff requires explicit dispatch readiness"
      )
    );
  }
);

test(
  "fails closed when governed execution-request evidence is empty",
  () => {
    const result =
      buildExecutionIntelligenceGovernanceExecutionHandoffFoundation({
        executionDispatch:
          createDispatch({
            executionRequest: []
          })
      });

    assert.equal(result.handoffReady, false);

    assert.ok(
      result.blockedReasons.includes(
        "execution handoff requires governed execution-request evidence"
      )
    );
  }
);

test(
  "preserves predecessor blockers and fails closed",
  () => {
    const predecessorBlocker =
      "predecessor governance blocker";

    const result =
      buildExecutionIntelligenceGovernanceExecutionHandoffFoundation({
        executionDispatch:
          createDispatch({
            blockedReasons: [
              predecessorBlocker
            ]
          })
      });

    assert.equal(result.handoffReady, false);

    assert.ok(
      result.blockedReasons.includes(
        predecessorBlocker
      )
    );
  }
);

test(
  "preserves provenance authorization boundaries and approved scope",
  () => {
    const executionDispatch =
      createDispatch();

    const result =
      buildExecutionIntelligenceGovernanceExecutionHandoffFoundation({
        executionDispatch
      });

    for (const value of executionDispatch.provenance) {
      assert.ok(result.provenance.includes(value));
    }

    for (
      const value of
      executionDispatch.authorizationBoundaries
    ) {
      assert.ok(
        result.authorizationBoundaries.includes(value)
      );
    }

    for (const value of executionDispatch.scopeBoundaries) {
      assert.ok(
        result.scopeBoundaries.includes(value)
      );
    }

    assert.ok(
      result.provenance.includes(
        "execution handoff preserves human authorization evidence"
      )
    );

    assert.ok(
      result.provenance.includes(
        "execution handoff preserves repository authorization evidence"
      )
    );

    assert.ok(
      result.provenance.includes(
        "execution handoff preserves explicit approval evidence"
      )
    );

    assert.ok(
      result.provenance.includes(
        "execution handoff preserves approved execution scope"
      )
    );
  }
);

test(
  "handoff readiness grants no execution or scope-expansion authority",
  () => {
    const result =
      buildExecutionIntelligenceGovernanceExecutionHandoffFoundation({
        executionDispatch:
          createDispatch()
      });

    assert.equal(result.handoffReady, true);

    const boundaries = [
      ...result.authorizationBoundaries,
      ...result.scopeBoundaries,
      ...result.handoffState
    ];

    assert.ok(
      boundaries.includes(
        "execution handoff does not grant command execution authority"
      )
    );

    assert.ok(
      boundaries.includes(
        "execution handoff does not grant repository modification authority"
      )
    );

    assert.ok(
      boundaries.includes(
        "execution handoff does not grant commit authority"
      )
    );

    assert.ok(
      boundaries.includes(
        "execution handoff does not grant push authority"
      )
    );

    assert.ok(
      boundaries.includes(
        "execution handoff does not grant deployment authority"
      )
    );

    assert.ok(
      boundaries.includes(
        "execution handoff does not grant autonomous execution authority"
      )
    );

    assert.ok(
      boundaries.includes(
        "execution handoff cannot expand approved execution scope"
      )
    );
  }
);
