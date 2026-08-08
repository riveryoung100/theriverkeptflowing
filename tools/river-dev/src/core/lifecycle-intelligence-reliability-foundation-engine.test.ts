import assert from "node:assert/strict";
import test from "node:test";

import {
createLifecycleIntelligenceReliability
} from "./lifecycle-intelligence-reliability-foundation-engine";

test(
"creates trusted reliability from trusted compliance",
() => {

const reliability =
createLifecycleIntelligenceReliability(
{
version:
"1.0.0",

objective:
"Reliability test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-compliance",

compliance:
[
{
taskId:
"compliance-boundary",

state:
"compliant",

reason:
"verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
reliability.version,
"1.0.0"
);

assert.equal(
reliability.trusted,
true
);

assert.equal(
reliability.reliability[0]!.taskId,
"compliance-boundary"
);

assert.equal(
reliability.reliability[0]!.state,
"reliable"
);

assert.equal(
reliability.source,
"controlled-execution-lifecycle-intelligence-compliance"
);

}
);

test(
"blocks reliability from blocked compliance",
() => {

const reliability =
createLifecycleIntelligenceReliability(
{
version:
"1.0.0",

objective:
"Blocked reliability test",

trusted:
false,

source:
"controlled-execution-lifecycle-intelligence-compliance",

compliance:
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
reliability.trusted,
false
);

assert.equal(
reliability.reliability[0]!.state,
"blocked"
);

assert.equal(
reliability.blockedReasons.length,
1
);

}
);

test(
"preserves compliance provenance in reliability",
() => {

const reliability =
createLifecycleIntelligenceReliability(
{
version:
"1.0.0",

objective:
"Provenance reliability test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-compliance",

compliance:
[
{
taskId:
"final-review",

state:
"compliant",

reason:
"human verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
reliability.reliability[0]!.reason,
"human verified"
);

}
);
