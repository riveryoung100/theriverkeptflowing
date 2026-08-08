import assert from "node:assert/strict";
import test from "node:test";

import {
createLifecycleIntelligenceTransition
} from "./lifecycle-intelligence-transition-foundation-engine";

test(
"creates trusted transition from trusted consolidation",
() => {

const transition =
createLifecycleIntelligenceTransition(
{
version:
"1.0.0",

objective:
"Transition test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-consolidation",

consolidation:
[
{
taskId:
"consolidation-boundary",

state:
"consolidated",

reason:
"verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
transition.version,
"1.0.0"
);

assert.equal(
transition.trusted,
true
);

assert.equal(
transition.transition[0]!.taskId,
"consolidation-boundary"
);

assert.equal(
transition.transition[0]!.state,
"transitioned"
);

assert.equal(
transition.source,
"controlled-execution-lifecycle-intelligence-consolidation"
);

}
);

test(
"blocks transition from blocked consolidation",
() => {

const transition =
createLifecycleIntelligenceTransition(
{
version:
"1.0.0",

objective:
"Blocked transition test",

trusted:
false,

source:
"controlled-execution-lifecycle-intelligence-consolidation",

consolidation:
[
{
taskId:
"transition-boundary",

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
transition.trusted,
false
);

assert.equal(
transition.transition[0]!.state,
"blocked"
);

assert.equal(
transition.blockedReasons.length,
1
);

}
);

test(
"preserves consolidation provenance in transition",
() => {

const transition =
createLifecycleIntelligenceTransition(
{
version:
"1.0.0",

objective:
"Provenance transition test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-consolidation",

consolidation:
[
{
taskId:
"final-review",

state:
"consolidated",

reason:
"human verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
transition.transition[0]!.reason,
"human verified"
);

}
);
