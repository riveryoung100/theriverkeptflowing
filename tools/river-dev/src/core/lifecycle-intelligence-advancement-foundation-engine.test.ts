import assert from "node:assert/strict";
import test from "node:test";

import {
createLifecycleIntelligenceAdvancement
} from "./lifecycle-intelligence-advancement-foundation-engine";

test(
"creates trusted advancement from trusted transition",
() => {

const advancement =
createLifecycleIntelligenceAdvancement(
{
version:
"1.0.0",

objective:
"Advancement test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-transition",

transition:
[
{
taskId:
"transition-boundary",

state:
"transitioned",

reason:
"verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
advancement.version,
"1.0.0"
);

assert.equal(
advancement.trusted,
true
);

assert.equal(
advancement.advancement[0]!.taskId,
"transition-boundary"
);

assert.equal(
advancement.advancement[0]!.state,
"advanced"
);

assert.equal(
advancement.source,
"controlled-execution-lifecycle-intelligence-transition"
);

}
);

test(
"blocks advancement from blocked transition",
() => {

const advancement =
createLifecycleIntelligenceAdvancement(
{
version:
"1.0.0",

objective:
"Blocked advancement test",

trusted:
false,

source:
"controlled-execution-lifecycle-intelligence-transition",

transition:
[
{
taskId:
"advancement-boundary",

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
advancement.trusted,
false
);

assert.equal(
advancement.advancement[0]!.state,
"blocked"
);

assert.equal(
advancement.blockedReasons.length,
1
);

}
);

test(
"preserves transition provenance in advancement",
() => {

const advancement =
createLifecycleIntelligenceAdvancement(
{
version:
"1.0.0",

objective:
"Provenance advancement test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-transition",

transition:
[
{
taskId:
"final-review",

state:
"transitioned",

reason:
"human verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
advancement.advancement[0]!.reason,
"human verified"
);

}
);
