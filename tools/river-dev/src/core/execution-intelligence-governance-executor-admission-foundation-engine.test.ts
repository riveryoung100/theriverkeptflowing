import assert from "node:assert/strict";
import test from "node:test";

import {
  buildExecutionIntelligenceGovernanceExecutorAdmissionFoundation
} from "./execution-intelligence-governance-executor-admission-foundation-engine";

import type {
  RiverDevExecutionIntelligenceGovernanceExecutionHandoffFoundation
} from "../types";

function createHandoff(
  overrides: Partial<RiverDevExecutionIntelligenceGovernanceExecutionHandoffFoundation> = {}
): RiverDevExecutionIntelligenceGovernanceExecutionHandoffFoundation {
  const base =
    {
      version: "1.0.0",
      source: "dev-245-test-handoff",
      objective: "Test handoff readiness.",

      trusted: true,
      ready: true,
      authorized: true,
      dispatchReady: true,
      handoffReady: true,

      executionDispatch: {} as RiverDevExecutionIntelligenceGovernanceExecutionHandoffFoundation["executionDispatch"],

      executionRequest: [
        "repository:path:tools/river-dev/src/example.ts"
      ],

      handoffState: [
        "handoff readiness established"
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
    } satisfies RiverDevExecutionIntelligenceGovernanceExecutionHandoffFoundation;

  return {
    ...base,
    ...overrides
  };
}

test(
  "admits a trusted authorized dispatch-ready handoff-ready record",
  () => {
    const executionHandoff =
      createHandoff();

    const result =
      buildExecutionIntelligenceGovernanceExecutorAdmissionFoundation({
        executionHandoff
      });

    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.authorized, true);
    assert.equal(result.dispatchReady, true);
    assert.equal(result.handoffReady, true);
    assert.equal(result.executorAdmitted, true);
    assert.deepEqual(
      result.executionRequest,
      executionHandoff.executionRequest
    );
    assert.deepEqual(result.blockedReasons, []);
  }
);

test(
  "fails closed when execution-handoff evidence is untrusted",
  () => {
    const result =
      buildExecutionIntelligenceGovernanceExecutorAdmissionFoundation({
        executionHandoff:
          createHandoff({
            trusted: false
          })
      });

    assert.equal(result.executorAdmitted, false);

    assert.ok(
      result.blockedReasons.includes(
        "executor admission requires trusted execution-handoff evidence"
      )
    );
  }
);

test(
  "fails closed when execution-handoff evidence is not ready",
  () => {
    const result =
      buildExecutionIntelligenceGovernanceExecutorAdmissionFoundation({
        executionHandoff:
          createHandoff({
            ready: false
          })
      });

    assert.equal(result.executorAdmitted, false);

    assert.ok(
      result.blockedReasons.includes(
        "executor admission requires ready execution-handoff evidence"
      )
    );
  }
);

test(
  "fails closed when execution authorization is absent",
  () => {
    const result =
      buildExecutionIntelligenceGovernanceExecutorAdmissionFoundation({
        executionHandoff:
          createHandoff({
            authorized: false
          })
      });

    assert.equal(result.executorAdmitted, false);

    assert.ok(
      result.blockedReasons.includes(
        "executor admission requires preserved execution authorization"
      )
    );
  }
);

test(
  "fails closed when dispatch readiness is absent",
  () => {
    const result =
      buildExecutionIntelligenceGovernanceExecutorAdmissionFoundation({
        executionHandoff:
          createHandoff({
            dispatchReady: false
          })
      });

    assert.equal(result.executorAdmitted, false);

    assert.ok(
      result.blockedReasons.includes(
        "executor admission requires preserved dispatch readiness"
      )
    );
  }
);

test(
  "fails closed when handoff readiness is absent",
  () => {
    const result =
      buildExecutionIntelligenceGovernanceExecutorAdmissionFoundation({
        executionHandoff:
          createHandoff({
            handoffReady: false
          })
      });

    assert.equal(result.executorAdmitted, false);

    assert.ok(
      result.blockedReasons.includes(
        "executor admission requires explicit handoff readiness"
      )
    );
  }
);

test(
  "fails closed when governed execution-request evidence is empty",
  () => {
    const result =
      buildExecutionIntelligenceGovernanceExecutorAdmissionFoundation({
        executionHandoff:
          createHandoff({
            executionRequest: []
          })
      });

    assert.equal(result.executorAdmitted, false);

    assert.ok(
      result.blockedReasons.includes(
        "executor admission requires governed execution-request evidence"
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
      buildExecutionIntelligenceGovernanceExecutorAdmissionFoundation({
        executionHandoff:
          createHandoff({
            blockedReasons: [
              predecessorBlocker
            ]
          })
      });

    assert.equal(result.executorAdmitted, false);

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
    const executionHandoff =
      createHandoff();

    const result =
      buildExecutionIntelligenceGovernanceExecutorAdmissionFoundation({
        executionHandoff
      });

    for (const value of executionHandoff.provenance) {
      assert.ok(result.provenance.includes(value));
    }

    for (const value of executionHandoff.authorizationBoundaries) {
      assert.ok(
        result.authorizationBoundaries.includes(value)
      );
    }

    for (const value of executionHandoff.scopeBoundaries) {
      assert.ok(
        result.scopeBoundaries.includes(value)
      );
    }

    assert.ok(
      result.provenance.includes(
        "executor admission preserves human authorization evidence"
      )
    );

    assert.ok(
      result.provenance.includes(
        "executor admission preserves repository authorization evidence"
      )
    );

    assert.ok(
      result.provenance.includes(
        "executor admission preserves explicit approval evidence"
      )
    );

    assert.ok(
      result.provenance.includes(
        "executor admission preserves approved execution scope"
      )
    );
  }
);

test(
  "executor admission grants no execution or scope-expansion authority",
  () => {
    const result =
      buildExecutionIntelligenceGovernanceExecutorAdmissionFoundation({
        executionHandoff:
          createHandoff()
      });

    assert.equal(result.executorAdmitted, true);

    const boundaries = [
      ...result.authorizationBoundaries,
      ...result.scopeBoundaries,
      ...result.admissionState
    ];

    assert.ok(
      boundaries.includes(
        "executor admission does not grant command execution authority"
      )
    );

    assert.ok(
      boundaries.includes(
        "executor admission does not grant repository modification authority"
      )
    );

    assert.ok(
      boundaries.includes(
        "executor admission does not grant commit authority"
      )
    );

    assert.ok(
      boundaries.includes(
        "executor admission does not grant push authority"
      )
    );

    assert.ok(
      boundaries.includes(
        "executor admission does not grant deployment authority"
      )
    );

    assert.ok(
      boundaries.includes(
        "executor admission does not grant autonomous execution authority"
      )
    );

    assert.ok(
      boundaries.includes(
        "executor admission cannot expand approved execution scope"
      )
    );
  }
);
