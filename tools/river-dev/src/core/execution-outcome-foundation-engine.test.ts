import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionOutcome
} from "./execution-outcome-foundation-engine";

test(
"creates successful outcome from completed authorized lifecycle",
() => {

const outcome =
createExecutionOutcome({

version:
"1.0.0",

source:
"execution-lifecycle-test",

objective:
"Build capability",

active:
true,

executionSource:
"river-development-agent-execution-intelligence",

state:
"ready",

lifecycle:
[],

lifecycleSteps:
[
"execution completed"
],

safetyChecks:
[
"verify authorization"
],

authorized:
true,

blockedReasons:
[]

});

assert.equal(
outcome.outcome,
"successful"
);

assert.equal(
outcome.authorized,
true
);

assert.equal(
outcome.objective,
"Build capability"
);

assert.equal(
outcome.executionResult[0],
"execution lifecycle completed"
);

}
);


test(
"blocks outcome from blocked lifecycle",
() => {

const outcome =
createExecutionOutcome({

version:
"1.0.0",

source:
"execution-lifecycle-test",

objective:
"Unsafe capability",

active:
false,

executionSource:
"river-development-agent-execution-intelligence",

state:
"blocked",

lifecycle:
[],

lifecycleSteps:
[
"halt execution"
],

safetyChecks:
[],

authorized:
false,

blockedReasons:
[
"authorization missing"
]

});

assert.equal(
outcome.outcome,
"blocked"
);

assert.equal(
outcome.authorized,
false
);

assert.equal(
outcome.executionResult[0],
"execution outcome blocked"
);

}
);


test(
"preserves outcome provenance",
() => {

const outcome =
createExecutionOutcome({

version:
"1.0.0",

source:
"execution-lifecycle-test",

objective:
"Provenance test",

active:
true,

executionSource:
"river-development-agent-execution-intelligence",

state:
"ready",

lifecycle:
[],

lifecycleSteps:
[],

safetyChecks:
[],

authorized:
true,

blockedReasons:
[]

});

assert.equal(
outcome.source,
"river-development-agent-execution-outcome"
);

assert.equal(
outcome.lifecycleSource,
"river-development-agent-execution-lifecycle"
);

}
);
