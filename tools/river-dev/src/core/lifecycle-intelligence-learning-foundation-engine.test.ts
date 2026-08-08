import assert from "node:assert/strict";
import test from "node:test";

import {
createLifecycleIntelligenceLearning
} from "./lifecycle-intelligence-learning-foundation-engine";

test(
"creates trusted learning from trusted feedback",
() => {

const learning =
createLifecycleIntelligenceLearning(
{
version:
"1.0.0",

objective:
"Learning test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-outcome",

feedback:
[
{
taskId:
"feedback-boundary",

state:
"learned",

reason:
"verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
learning.version,
"1.0.0"
);

assert.equal(
learning.trusted,
true
);

assert.equal(
learning.learning[0]!.taskId,
"feedback-boundary"
);

assert.equal(
learning.learning[0]!.state,
"learned"
);

assert.equal(
learning.source,
"controlled-execution-lifecycle-intelligence-feedback"
);

}
);

test(
"blocks learning from blocked feedback",
() => {

const learning =
createLifecycleIntelligenceLearning(
{
version:
"1.0.0",

objective:
"Blocked learning test",

trusted:
false,

source:
"controlled-execution-lifecycle-intelligence-outcome",

feedback:
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
learning.trusted,
false
);

assert.equal(
learning.learning[0]!.state,
"blocked"
);

assert.equal(
learning.blockedReasons.length,
1
);

}
);

test(
"preserves feedback provenance in learning",
() => {

const learning =
createLifecycleIntelligenceLearning(
{
version:
"1.0.0",

objective:
"Provenance learning test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-outcome",

feedback:
[
{
taskId:
"final-review",

state:
"learned",

reason:
"human verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
learning.learning[0]!.reason,
"human verified"
);

}
);
