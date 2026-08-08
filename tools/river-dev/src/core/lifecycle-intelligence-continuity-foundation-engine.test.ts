import assert from "node:assert/strict";
import test from "node:test";

import {
createLifecycleIntelligenceContinuity
} from "./lifecycle-intelligence-continuity-foundation-engine";

test(
"creates trusted continuity from trusted resilience",
() => {

const continuity =
createLifecycleIntelligenceContinuity(
{
version:
"1.0.0",

objective:
"Continuity test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-resilience",

resilience:
[
{
taskId:
"resilience-boundary",

state:
"resilient",

reason:
"verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
continuity.version,
"1.0.0"
);

assert.equal(
continuity.trusted,
true
);

assert.equal(
continuity.continuity[0]!.taskId,
"resilience-boundary"
);

assert.equal(
continuity.continuity[0]!.state,
"continuous"
);

assert.equal(
continuity.source,
"controlled-execution-lifecycle-intelligence-resilience"
);

}
);


test(
"blocks continuity from blocked resilience",
() => {

const continuity =
createLifecycleIntelligenceContinuity(
{
version:
"1.0.0",

objective:
"Blocked continuity test",

trusted:
false,

source:
"controlled-execution-lifecycle-intelligence-resilience",

resilience:
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
continuity.trusted,
false
);

assert.equal(
continuity.continuity[0]!.state,
"blocked"
);

assert.equal(
continuity.blockedReasons.length,
1
);

}
);


test(
"preserves resilience provenance in continuity",
() => {

const continuity =
createLifecycleIntelligenceContinuity(
{
version:
"1.0.0",

objective:
"Provenance continuity test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-resilience",

resilience:
[
{
taskId:
"final-review",

state:
"resilient",

reason:
"human verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
continuity.continuity[0]!.reason,
"human verified"
);

}
);
