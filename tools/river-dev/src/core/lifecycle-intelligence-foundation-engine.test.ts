import assert from "node:assert/strict";
import test from "node:test";

import {
createLifecycleIntelligence
} from "./lifecycle-intelligence-foundation-engine";

test(
"creates trusted intelligence from active lifecycle",
() => {

const intelligence =
createLifecycleIntelligence(
{
version:
"1.0.0",

objective:
"Lifecycle intelligence test",

active:
true,

source:
"controlled-execution-completion",

lifecycle:
[
{
taskId:
"lifecycle-boundary",

state:
"active",

reason:
"verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
intelligence.version,
"1.0.0"
);

assert.equal(
intelligence.trusted,
true
);

assert.equal(
intelligence.intelligence[0]!.taskId,
"lifecycle-boundary"
);

assert.equal(
intelligence.intelligence[0]!.state,
"trusted"
);

assert.equal(
intelligence.source,
"controlled-execution-lifecycle"
);

}
);

test(
"blocks intelligence from blocked lifecycle",
() => {

const intelligence =
createLifecycleIntelligence(
{
version:
"1.0.0",

objective:
"Blocked intelligence test",

active:
false,

source:
"controlled-execution-completion",

lifecycle:
[
{
taskId:
"authorization",

state:
"blocked",

reason:
"approval required"
}
],

blockedReasons:
[
"approval required"
]

}
);

assert.equal(
intelligence.trusted,
false
);

assert.equal(
intelligence.intelligence[0]!.state,
"blocked"
);

assert.equal(
intelligence.blockedReasons.length,
1
);

}
);

test(
"preserves lifecycle provenance in intelligence",
() => {

const intelligence =
createLifecycleIntelligence(
{
version:
"1.0.0",

objective:
"Provenance intelligence test",

active:
true,

source:
"controlled-execution-completion",

lifecycle:
[
{
taskId:
"final-review",

state:
"active",

reason:
"human verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
intelligence.intelligence[0]!.reason,
"human verified"
);

}
);
