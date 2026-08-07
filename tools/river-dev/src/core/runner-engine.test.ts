import assert from "node:assert/strict";
import test from "node:test";

import {
createExecutionRunner
} from "./runner-engine";

test(
"creates executable runner state from approved simulation",
() => {

const runner =
createExecutionRunner(
{
version:
"1.0.0",

objective:
"Runner test",

ready:
true,

steps: [

{
taskId:
"task-1",

state:
"simulated",

reason:
"simulation passed"
}

],

blockedReasons:
[]

}
);

assert.equal(
runner.version,
"1.0.0"
);

assert.equal(
runner.steps[0]!.state,
"executable"
);

assert.equal(
runner.ready,
true
);

}
);


test(
"blocks runner state from rejected simulation",
() => {

const runner =
createExecutionRunner(
{
version:
"1.0.0",

objective:
"Blocked runner test",

ready:
false,

steps: [

{
taskId:
"task-1",

state:
"blocked",

reason:
"approval rejected"
}

],

blockedReasons:
[
"approval rejected"
]

}
);

assert.equal(
runner.ready,
false
);

assert.equal(
runner.steps[0]!.state,
"blocked"
);

assert.equal(
runner.blockedReasons.length,
1
);

}
);


test(
"requires approval before runner readiness",
() => {

const runner =
createExecutionRunner(
{
version:
"1.0.0",

objective:
"Approval runner test",

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
runner.ready,
false
);

assert.equal(
runner.steps[0]!.state,
"approval-required"
);

}
);
