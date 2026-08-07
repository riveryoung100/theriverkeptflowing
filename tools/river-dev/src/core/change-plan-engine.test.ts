import assert from "node:assert/strict";
import test from "node:test";

import {
createExecutionChangePlan
} from "./change-plan-engine";

test(
"creates executable change plan from ready implementation",
() => {

const plan =
createExecutionChangePlan(
{
version:
"1.0.0",

objective:
"Change plan test",

ready:
true,

implementations: [

{
taskId:
"task-1",

state:
"ready",

reason:
"implementation ready"

}

],

blockedReasons:
[]

}
);

assert.equal(
plan.version,
"1.0.0"
);

assert.equal(
plan.changes[0]!.state,
"planned"
);

assert.equal(
plan.executable,
true
);

}
);


test(
"blocks change plan from blocked implementation",
() => {

const plan =
createExecutionChangePlan(
{
version:
"1.0.0",

objective:
"Blocked change plan test",

ready:
false,

implementations: [

{
taskId:
"task-1",

state:
"blocked",

reason:
"implementation blocked"

}

],

blockedReasons:
[
"implementation blocked"
]

}
);

assert.equal(
plan.executable,
false
);

assert.equal(
plan.changes[0]!.state,
"blocked"
);

assert.equal(
plan.blockedReasons.length,
1
);

}
);


test(
"requires confirmation for gated implementation",
() => {

const plan =
createExecutionChangePlan(
{
version:
"1.0.0",

objective:
"Confirmation change plan test",

ready:
false,

implementations: [

{
taskId:
"task-1",

state:
"confirmation-required",

reason:
"awaiting confirmation"

}

],

blockedReasons:
[]

}
);

assert.equal(
plan.executable,
false
);

assert.equal(
plan.changes[0]!.state,
"confirmation-required"
);

}
);
