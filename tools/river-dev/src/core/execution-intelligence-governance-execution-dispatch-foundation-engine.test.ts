import assert from "node:assert/strict";
import test from "node:test";

import type {
  RiverDevExecutionIntelligenceGovernanceExecutionRuntimeFoundation
} from "../types";

import {
  buildExecutionIntelligenceGovernanceExecutionDispatchFoundation
} from "./execution-intelligence-governance-execution-dispatch-foundation-engine";

function createRuntime(
  overrides: Partial<RiverDevExecutionIntelligenceGovernanceExecutionRuntimeFoundation> = {}
): RiverDevExecutionIntelligenceGovernanceExecutionRuntimeFoundation {
  return {
    version: "dev-243-v1",
    source: "dev-243-test-runtime",
    objective: "test runtime",

    trusted: true,
    ready: true,
    authorized: true,

    executionControl: {} as RiverDevExecutionIntelligenceGovernanceExecutionRuntimeFoundation["executionControl"],

    executionRequest: [
      "test governed execution request"
    ],

    runtimeState: [
      "runtime ready"
    ],

    provenance: [
      "dev-243-test-runtime"
    ],

    authorizationBoundaries: [
      "human authorization evidence preserved",
      "repository authorization evidence preserved",
      "explicit approval evidence preserved"
    ],

    scopeBoundaries: [
      "approved execution scope preserved"
    ],

    blockedReasons: [],

    ...overrides
  };
}

test("produces trusted dispatch readiness from trusted ready authorized runtime evidence", () => {
  const runtime =
    createRuntime();

  const result =
    buildExecutionIntelligenceGovernanceExecutionDispatchFoundation({
      executionRuntime: runtime
    });

  assert.equal(result.trusted, true);
  assert.equal(result.ready, true);
  assert.equal(result.authorized, true);
  assert.equal(result.dispatchReady, true);
  assert.deepEqual(
    result.executionRequest,
    runtime.executionRequest
  );
  assert.deepEqual(result.blockedReasons, []);
});

test("fails closed when runtime is untrusted", () => {
  const result =
    buildExecutionIntelligenceGovernanceExecutionDispatchFoundation({
      executionRuntime: createRuntime({
        trusted: false
      })
    });

  assert.equal(result.dispatchReady, false);
  assert.equal(result.trusted, false);
  assert.ok(
    result.blockedReasons.includes(
      "dispatch readiness requires a trusted governance execution-runtime record"
    )
  );
});

test("fails closed when runtime is not ready", () => {
  const result =
    buildExecutionIntelligenceGovernanceExecutionDispatchFoundation({
      executionRuntime: createRuntime({
        ready: false
      })
    });

  assert.equal(result.dispatchReady, false);
  assert.equal(result.ready, false);
  assert.ok(
    result.blockedReasons.includes(
      "dispatch readiness requires explicit runtime readiness"
    )
  );
});

test("fails closed when execution authorization is absent", () => {
  const result =
    buildExecutionIntelligenceGovernanceExecutionDispatchFoundation({
      executionRuntime: createRuntime({
        authorized: false
      })
    });

  assert.equal(result.dispatchReady, false);
  assert.equal(result.authorized, false);
  assert.ok(
    result.blockedReasons.includes(
      "dispatch readiness requires preserved execution authorization"
    )
  );
});

test("fails closed when governed execution-request evidence is absent", () => {
  const result =
    buildExecutionIntelligenceGovernanceExecutionDispatchFoundation({
      executionRuntime: createRuntime({
        executionRequest: []
      })
    });

  assert.equal(result.dispatchReady, false);
  assert.ok(
    result.blockedReasons.includes(
      "dispatch readiness requires preserved governed execution-request evidence"
    )
  );
});

test("preserves predecessor blockers and fails closed", () => {
  const result =
    buildExecutionIntelligenceGovernanceExecutionDispatchFoundation({
      executionRuntime: createRuntime({
        blockedReasons: [
          "predecessor governance blocker"
        ]
      })
    });

  assert.equal(result.dispatchReady, false);
  assert.ok(
    result.blockedReasons.includes(
      "predecessor governance blocker"
    )
  );
});

test("preserves runtime provenance and governed execution request", () => {
  const runtime =
    createRuntime({
      provenance: [
        "authorization-boundary",
        "approval-boundary",
        "execution-boundary",
        "execution-control",
        "execution-runtime"
      ],
      executionRequest: [
        "governed-request-a",
        "governed-request-b"
      ]
    });

  const result =
    buildExecutionIntelligenceGovernanceExecutionDispatchFoundation({
      executionRuntime: runtime
    });

  for (const entry of runtime.provenance) {
    assert.ok(result.provenance.includes(entry));
  }

  assert.deepEqual(
    result.executionRequest,
    runtime.executionRequest
  );
});

test("preserves authorization and approved-scope boundaries", () => {
  const runtime =
    createRuntime({
      authorizationBoundaries: [
        "human authorization evidence preserved",
        "repository authorization evidence preserved",
        "explicit approval evidence preserved"
      ],
      scopeBoundaries: [
        "approved execution scope preserved"
      ]
    });

  const result =
    buildExecutionIntelligenceGovernanceExecutionDispatchFoundation({
      executionRuntime: runtime
    });

  for (const boundary of runtime.authorizationBoundaries) {
    assert.ok(
      result.authorizationBoundaries.includes(boundary)
    );
  }

  for (const boundary of runtime.scopeBoundaries) {
    assert.ok(
      result.scopeBoundaries.includes(boundary)
    );
  }

  assert.ok(
    result.scopeBoundaries.includes(
      "dispatch readiness cannot expand approved execution scope"
    )
  );
});

test("dispatch readiness grants no execution or repository authority", () => {
  const result =
    buildExecutionIntelligenceGovernanceExecutionDispatchFoundation({
      executionRuntime: createRuntime()
    });

  const boundaries =
    [
      ...result.dispatchState,
      ...result.authorizationBoundaries,
      ...result.scopeBoundaries
    ].join("\n");

  assert.match(
    boundaries,
    /does not grant command execution authority/
  );

  assert.match(
    boundaries,
    /does not grant shell execution authority/
  );

  assert.match(
    boundaries,
    /does not grant repository modification authority/
  );

  assert.match(
    boundaries,
    /does not grant commit authority/
  );

  assert.match(
    boundaries,
    /does not grant push authority/
  );

  assert.match(
    boundaries,
    /does not grant deployment authority/
  );

  assert.match(
    boundaries,
    /does not grant autonomous execution authority/
  );

  assert.match(
    boundaries,
    /cannot expand approved execution scope/
  );
});
