import assert from "node:assert/strict";
import test from "node:test";

import {
createLifecycleIntelligenceAction
} from "./lifecycle-intelligence-action-foundation-engine";

test(
"creates trusted action from trusted decision",
() => {

const action =
createLifecycleIntelligenceAction(
{
version:
"1.0.0",

objective:
"Action test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-orchestration",

decision:
[
{
taskId:
"decision-boundary",

state:
"decided",

reason:
"verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
action.version,
"1.0.0"
);

assert.equal(
action.trusted,
true
);

assert.equal(
action.action[0]!.taskId,
"decision-boundary"
);

assert.equal(
action.action[0]!.state,
"acted"
);

assert.equal(
action.source,
"controlled-execution-lifecycle-intelligence-decision"
);

}
);

test(
"blocks action from blocked decision",
() => {

const action =
createLifecycleIntelligenceAction(
{
version:
"1.0.0",

objective:
"Blocked action test",

trusted:
false,

source:
"controlled-execution-lifecycle-intelligence-orchestration",

decision:
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
action.trusted,
false
);

assert.equal(
action.action[0]!.state,
"blocked"
);

assert.equal(
action.blockedReasons.length,
1
);

}
);

test(
"preserves decision provenance in action",
() => {

const action =
createLifecycleIntelligenceAction(
{
version:
"1.0.0",

objective:
"Provenance action test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-orchestration",

decision:
[
{
taskId:
"final-review",

state:
"decided",

reason:
"human verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
action.action[0]!.reason,
"human verified"
);

}
);
