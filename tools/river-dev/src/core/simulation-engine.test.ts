import assert from "node:assert/strict";
import test from "node:test";

import {
createExecutionSimulation
} from "./simulation-engine";

test(
"creates deterministic execution simulations",
() => {

const simulation =
createExecutionSimulation(
{
version:
"1.0.0",

objective:
"Simulation test",

ready:
true,

approvals: [

{
taskId:
"task-1",

state:
"approved",

reason:
"human approved"
}

],

blockedReasons:
[]

}
);

assert.equal(
simulation.version,
"1.0.0"
);

assert.equal(
simulation.steps[0]!.state,
"simulated"
);

assert.equal(
simulation.ready,
true
);

}
);

test(
"blocks rejected approval simulations",
() => {

const simulation =
createExecutionSimulation(
{
version:
"1.0.0",

objective:
"Rejected simulation test",

ready:
false,

approvals: [

{
taskId:
"task-1",

state:
"rejected",

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
simulation.ready,
false
);

assert.equal(
simulation.steps[0]!.state,
"blocked"
);

assert.equal(
simulation.blockedReasons.length,
1
);

}
);

test(
"requires approval before simulation readiness",
() => {

const simulation =
createExecutionSimulation(
{
version:
"1.0.0",

objective:
"Pending approval test",

ready:
true,

approvals: [

{
taskId:
"task-1",

state:
"pending",

reason:
"awaiting approval"
}

],

blockedReasons:
[]

}
);

assert.equal(
simulation.ready,
false
);

assert.equal(
simulation.steps[0]!.state,
"approval-required"
);

}
);
