import assert from "node:assert/strict";
import test from "node:test";

import {
  createExecutionIntelligenceGovernanceExecutionRuntimeFoundation,
} from "./execution-intelligence-governance-execution-runtime-foundation-engine";

import type {
  RiverDevExecutionIntelligenceGovernanceExecutionControlFoundation,
} from "../types";

function createValidExecutionControl(): RiverDevExecutionIntelligenceGovernanceExecutionControlFoundation {
  return {
    version: "1.0.0",
    source: "DEV-243 focused test fixture",
    objective: "Provide valid governed execution-control evidence.",

    trusted: true,
    controlled: true,
    authorized: true,

    executionBoundary: {} as RiverDevExecutionIntelligenceGovernanceExecutionControlFoundation["executionBoundary"],

    executionRequest: [
      "execute only within explicitly approved governed scope",
    ],

    executionControlState: [
      "trusted governance execution control established",
    ],

    executionControlSignals: [
      "trusted execution boundary",
      "authorized governance eligibility",
      "governed execution request created",
    ],


    provenance: [
      "fixture provenance",
    ],

    authorizationBoundaries: [
      "fixture authorization boundary",
    ],

    scopeBoundaries: [
      "fixture scope boundary",
    ],

    blockedReasons: [],
  };
}

test("DEV-243 establishes trusted runtime readiness only for fully eligible execution control", () => {
  const executionControl =
    createValidExecutionControl();

  const result =
    createExecutionIntelligenceGovernanceExecutionRuntimeFoundation({
      executionControl,
    });

  assert.equal(result.trusted, true);
  assert.equal(result.ready, true);
  assert.equal(result.authorized, true);

  assert.deepEqual(
    result.executionRequest,
    executionControl.executionRequest
  );

  assert.deepEqual(
    result.blockedReasons,
    []
  );

  assert.ok(
    result.runtimeState.includes(
      "governed execution runtime readiness established"
    )
  );

  assert.ok(
    result.runtimeState.includes(
      "runtime readiness does not grant command execution authority"
    )
  );

  assert.ok(
    result.provenance.includes(
      "fixture provenance"
    )
  );

  assert.ok(
    result.authorizationBoundaries.includes(
      "fixture authorization boundary"
    )
  );

  assert.ok(
    result.scopeBoundaries.includes(
      "fixture scope boundary"
    )
  );
});

test("DEV-243 fails closed for untrusted execution control", () => {
  const executionControl = {
    ...createValidExecutionControl(),
    trusted: false,
  };

  const result =
    createExecutionIntelligenceGovernanceExecutionRuntimeFoundation({
      executionControl,
    });

  assert.equal(result.trusted, false);
  assert.equal(result.ready, false);

  assert.ok(
    result.blockedReasons.includes(
      "execution control is not trusted"
    )
  );
});

test("DEV-243 fails closed for uncontrolled execution control", () => {
  const executionControl = {
    ...createValidExecutionControl(),
    controlled: false,
  };

  const result =
    createExecutionIntelligenceGovernanceExecutionRuntimeFoundation({
      executionControl,
    });

  assert.equal(result.trusted, false);
  assert.equal(result.ready, false);

  assert.ok(
    result.blockedReasons.includes(
      "execution control is not controlled"
    )
  );
});

test("DEV-243 fails closed for unauthorized execution control", () => {
  const executionControl = {
    ...createValidExecutionControl(),
    authorized: false,
  };

  const result =
    createExecutionIntelligenceGovernanceExecutionRuntimeFoundation({
      executionControl,
    });

  assert.equal(result.trusted, false);
  assert.equal(result.ready, false);
  assert.equal(result.authorized, false);

  assert.ok(
    result.blockedReasons.includes(
      "execution control is not authorized"
    )
  );
});

test("DEV-243 fails closed when predecessor control contains blockers", () => {
  const executionControl = {
    ...createValidExecutionControl(),
    blockedReasons: [
      "fixture predecessor blocker",
    ],
  };

  const result =
    createExecutionIntelligenceGovernanceExecutionRuntimeFoundation({
      executionControl,
    });

  assert.equal(result.trusted, false);
  assert.equal(result.ready, false);

  assert.ok(
    result.blockedReasons.includes(
      "execution control contains blocking reasons"
    )
  );
});

test("DEV-243 fails closed when governed execution request is absent", () => {
  const executionControl = {
    ...createValidExecutionControl(),
    executionRequest: [],
  };

  const result =
    createExecutionIntelligenceGovernanceExecutionRuntimeFoundation({
      executionControl,
    });

  assert.equal(result.trusted, false);
  assert.equal(result.ready, false);

  assert.ok(
    result.blockedReasons.includes(
      "governed execution request is missing"
    )
  );
});

test("DEV-243 accumulates blockers deterministically", () => {
  const executionControl = {
    ...createValidExecutionControl(),
    trusted: false,
    controlled: false,
    authorized: false,
    executionRequest: [],
    blockedReasons: [
      "fixture predecessor blocker",
    ],
  };

  const result =
    createExecutionIntelligenceGovernanceExecutionRuntimeFoundation({
      executionControl,
    });

  assert.equal(result.trusted, false);
  assert.equal(result.ready, false);

  assert.deepEqual(
    result.blockedReasons,
    [
      "execution control is not trusted",
      "execution control is not controlled",
      "execution control is not authorized",
      "execution control contains blocking reasons",
      "governed execution request is missing",
    ]
  );
});

test("DEV-243 preserves evidence without granting execution authority", () => {
  const executionControl =
    createValidExecutionControl();

  const result =
    createExecutionIntelligenceGovernanceExecutionRuntimeFoundation({
      executionControl,
    });

  assert.equal(
    result.executionControl,
    executionControl
  );

  assert.ok(
    result.authorizationBoundaries.includes(
      "runtime readiness does not grant command execution authority"
    )
  );

  assert.ok(
    result.authorizationBoundaries.includes(
      "runtime readiness does not grant repository modification authority"
    )
  );

  assert.ok(
    result.authorizationBoundaries.includes(
      "runtime readiness does not grant dispatch authority"
    )
  );

  assert.ok(
    result.scopeBoundaries.includes(
      "runtime readiness cannot expand approved execution scope"
    )
  );
});

test("DEV-243 runtime output is deterministic", () => {
  const executionControl =
    createValidExecutionControl();

  const first =
    createExecutionIntelligenceGovernanceExecutionRuntimeFoundation({
      executionControl,
    });

  const second =
    createExecutionIntelligenceGovernanceExecutionRuntimeFoundation({
      executionControl,
    });

  assert.deepEqual(first, second);
});
