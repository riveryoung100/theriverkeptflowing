import assert from "node:assert/strict";
import test from "node:test";

import {
createExecutionAction
} from "./action-engine";

test(
"creates executable actions from ready runner state",
() => {

const action =
createExecutionAction(
{
version:
"1.0.0",

objective:
"Action test",

ready:
true,

steps: [

{
taskId:
"task-1",

state:
"executable",

reason:
"runner approved"
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
action.actions[0]!.state,
"executable"
);

assert.equal(
action.ready,
true
);

}
);

test(
"blocks actions from blocked runner state",
() => {

const action =
createExecutionAction(
{
version:
"1.0.0",

objective:
"Blocked action test",

ready:
false,

steps: [

{
taskId:
"task-1",

state:
"blocked",

reason:
"execution blocked"
}

],

blockedReasons:
[
"execution blocked"
]

}
);

assert.equal(
action.ready,
false
);

assert.equal(
action.actions[0]!.state,
"blocked"
);

assert.equal(
action.blockedReasons.length,
1
);

}
);

test(
"requires approval before action readiness",
() => {

const action =
createExecutionAction(
{
version:
"1.0.0",

objective:
"Approval action test",

ready:
true,

steps: [

{
taskId:
"task-1",

state:
"approval-required",

reason:
"awaiting approval"
}

],

blockedReasons:
[]

}
);

assert.equal(
action.ready,
false
);

assert.equal(
action.actions[0]!.state,
"approval-required"
);

}
);
