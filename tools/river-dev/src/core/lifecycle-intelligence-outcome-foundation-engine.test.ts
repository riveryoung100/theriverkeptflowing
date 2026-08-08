import assert from "node:assert/strict";
import test from "node:test";

import {
createLifecycleIntelligenceOutcome
} from "./lifecycle-intelligence-outcome-foundation-engine";

test(
"creates trusted outcome from trusted action",
() => {

const outcome =
createLifecycleIntelligenceOutcome(
{
version:
"1.0.0",

objective:
"Outcome test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-decision",

action:
[
{
taskId:
"action-boundary",

state:
"acted",

reason:
"verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
outcome.version,
"1.0.0"
);

assert.equal(
outcome.trusted,
true
);

assert.equal(
outcome.outcome[0]!.taskId,
"action-boundary"
);

assert.equal(
outcome.outcome[0]!.state,
"completed"
);

assert.equal(
outcome.source,
"controlled-execution-lifecycle-intelligence-action"
);

}
);

test(
"blocks outcome from blocked action",
() => {

const outcome =
createLifecycleIntelligenceOutcome(
{
version:
"1.0.0",

objective:
"Blocked outcome test",

trusted:
false,

source:
"controlled-execution-lifecycle-intelligence-decision",

action:
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
outcome.trusted,
false
);

assert.equal(
outcome.outcome[0]!.state,
"blocked"
);

assert.equal(
outcome.blockedReasons.length,
1
);

}
);

test(
"preserves action provenance in outcome",
() => {

const outcome =
createLifecycleIntelligenceOutcome(
{
version:
"1.0.0",

objective:
"Provenance outcome test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-decision",

action:
[
{
taskId:
"final-review",

state:
"acted",

reason:
"human verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
outcome.outcome[0]!.reason,
"human verified"
);

}
);
