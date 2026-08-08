import assert from "node:assert/strict";
import test from "node:test";

import {
createLifecycleIntelligenceFeedback
} from "./lifecycle-intelligence-feedback-foundation-engine";

test(
"creates trusted feedback from trusted outcome",
() => {

const feedback =
createLifecycleIntelligenceFeedback(
{
version:
"1.0.0",

objective:
"Feedback test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-action",

outcome:
[
{
taskId:
"outcome-boundary",

state:
"completed",

reason:
"verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
feedback.version,
"1.0.0"
);

assert.equal(
feedback.trusted,
true
);

assert.equal(
feedback.feedback[0]!.taskId,
"outcome-boundary"
);

assert.equal(
feedback.feedback[0]!.state,
"learned"
);

assert.equal(
feedback.source,
"controlled-execution-lifecycle-intelligence-outcome"
);

}
);

test(
"blocks feedback from blocked outcome",
() => {

const feedback =
createLifecycleIntelligenceFeedback(
{
version:
"1.0.0",

objective:
"Blocked feedback test",

trusted:
false,

source:
"controlled-execution-lifecycle-intelligence-action",

outcome:
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
feedback.trusted,
false
);

assert.equal(
feedback.feedback[0]!.state,
"blocked"
);

assert.equal(
feedback.blockedReasons.length,
1
);

}
);

test(
"preserves outcome provenance in feedback",
() => {

const feedback =
createLifecycleIntelligenceFeedback(
{
version:
"1.0.0",

objective:
"Provenance feedback test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-action",

outcome:
[
{
taskId:
"final-review",

state:
"completed",

reason:
"human verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
feedback.feedback[0]!.reason,
"human verified"
);

}
);
