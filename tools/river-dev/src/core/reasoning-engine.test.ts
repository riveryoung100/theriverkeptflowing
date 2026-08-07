import assert from "node:assert/strict";
import test from "node:test";

import {
createExecutionReasoning
} from "./reasoning-engine";

test(
"creates validated reasoning from understood intelligence",
() => {

const reasoning =
createExecutionReasoning(
{
version:
"1.0.0",

objective:
"Reasoning test",

understood:
true,

steps: [

{
category:
"implementation",

state:
"understood",

explanation:
"execution understanding complete"

}

],

blockedReasons:
[]

}
);

assert.equal(
reasoning.version,
"1.0.0"
);

assert.equal(
reasoning.steps[0]!.state,
"reasoned"
);

assert.equal(
reasoning.validated,
true
);

}
);


test(
"blocks reasoning from blocked intelligence",
() => {

const reasoning =
createExecutionReasoning(
{
version:
"1.0.0",

objective:
"Blocked reasoning test",

understood:
false,

steps: [

{
category:
"implementation",

state:
"blocked",

explanation:
"execution understanding blocked"

}

],

blockedReasons:
[
"execution understanding blocked"
]

}
);

assert.equal(
reasoning.validated,
false
);

assert.equal(
reasoning.steps[0]!.state,
"blocked"
);

assert.equal(
reasoning.blockedReasons.length,
1
);

}
);


test(
"requires confirmation for gated intelligence",
() => {

const reasoning =
createExecutionReasoning(
{
version:
"1.0.0",

objective:
"Confirmation reasoning test",

understood:
false,

steps: [

{
category:
"approval",

state:
"confirmation-required",

explanation:
"human confirmation required"

}

],

blockedReasons:
[]

}
);

assert.equal(
reasoning.validated,
false
);

assert.equal(
reasoning.steps[0]!.state,
"confirmation-required"
);

}
);
