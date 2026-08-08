import assert from "node:assert/strict";
import test from "node:test";

import {
createLifecycleIntelligenceInsight
} from "./lifecycle-intelligence-insight-foundation-engine";

test(
"creates trusted insight from trusted knowledge",
() => {

const insight =
createLifecycleIntelligenceInsight(
{
version:
"1.0.0",

objective:
"Insight test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-learning",

knowledge:
[
{
taskId:
"knowledge-boundary",

state:
"stored",

reason:
"verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
insight.version,
"1.0.0"
);

assert.equal(
insight.trusted,
true
);

assert.equal(
insight.insight[0]!.taskId,
"knowledge-boundary"
);

assert.equal(
insight.insight[0]!.state,
"identified"
);

assert.equal(
insight.source,
"controlled-execution-lifecycle-intelligence-knowledge"
);

}
);

test(
"blocks insight from blocked knowledge",
() => {

const insight =
createLifecycleIntelligenceInsight(
{
version:
"1.0.0",

objective:
"Blocked insight test",

trusted:
false,

source:
"controlled-execution-lifecycle-intelligence-learning",

knowledge:
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
insight.trusted,
false
);

assert.equal(
insight.insight[0]!.state,
"blocked"
);

assert.equal(
insight.blockedReasons.length,
1
);

}
);

test(
"preserves knowledge provenance in insight",
() => {

const insight =
createLifecycleIntelligenceInsight(
{
version:
"1.0.0",

objective:
"Provenance insight test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-learning",

knowledge:
[
{
taskId:
"final-review",

state:
"stored",

reason:
"human verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
insight.insight[0]!.reason,
"human verified"
);

}
);
