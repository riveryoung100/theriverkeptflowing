import assert from "node:assert/strict";
import test from "node:test";

import {
createLifecycleIntelligenceResilience
} from "./lifecycle-intelligence-resilience-foundation-engine";

test(
"creates trusted resilience from trusted reliability",
() => {

const resilience =
createLifecycleIntelligenceResilience(
{
version:
"1.0.0",

objective:
"Resilience test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-compliance",

reliability:
[
{
taskId:
"reliability-boundary",

state:
"reliable",

reason:
"verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
resilience.version,
"1.0.0"
);

assert.equal(
resilience.trusted,
true
);

assert.equal(
resilience.resilience[0]!.taskId,
"reliability-boundary"
);

assert.equal(
resilience.resilience[0]!.state,
"resilient"
);

assert.equal(
resilience.source,
"controlled-execution-lifecycle-intelligence-reliability"
);

}
);

test(
"blocks resilience from blocked reliability",
() => {

const resilience =
createLifecycleIntelligenceResilience(
{
version:
"1.0.0",

objective:
"Blocked resilience test",

trusted:
false,

source:
"controlled-execution-lifecycle-intelligence-compliance",

reliability:
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
resilience.trusted,
false
);

assert.equal(
resilience.resilience[0]!.state,
"blocked"
);

assert.equal(
resilience.blockedReasons.length,
1
);

}
);

test(
"preserves reliability provenance in resilience",
() => {

const resilience =
createLifecycleIntelligenceResilience(
{
version:
"1.0.0",

objective:
"Provenance resilience test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-compliance",

reliability:
[
{
taskId:
"final-review",

state:
"reliable",

reason:
"human verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
resilience.resilience[0]!.reason,
"human verified"
);

}
);
