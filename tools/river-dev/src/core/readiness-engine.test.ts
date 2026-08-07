import assert from "node:assert/strict";
import test from "node:test";

import {
createExecutionReadiness
} from "./readiness-engine";

test(
"creates ready execution readiness from valid validation",
() => {

const readiness =
createExecutionReadiness(
{
version:
"1.0.0",

objective:
"Readiness test",

valid:
true,

validations: [

{
taskId:
"task-1",

state:
"validated",

reason:
"validation passed"

}

],

blockedReasons:
[]

}
);

assert.equal(
readiness.version,
"1.0.0"
);

assert.equal(
readiness.readiness[0]!.state,
"ready"
);

assert.equal(
readiness.ready,
true
);

}
);


test(
"blocks readiness from blocked validation",
() => {

const readiness =
createExecutionReadiness(
{
version:
"1.0.0",

objective:
"Blocked readiness test",

valid:
false,

validations: [

{
taskId:
"task-1",

state:
"blocked",

reason:
"validation blocked"

}

],

blockedReasons:
[
"validation blocked"
]

}
);

assert.equal(
readiness.ready,
false
);

assert.equal(
readiness.readiness[0]!.state,
"blocked"
);

assert.equal(
readiness.blockedReasons.length,
1
);

}
);


test(
"requires confirmation for gated validation",
() => {

const readiness =
createExecutionReadiness(
{
version:
"1.0.0",

objective:
"Confirmation readiness test",

valid:
false,

validations: [

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
readiness.ready,
false
);

assert.equal(
readiness.readiness[0]!.state,
"confirmation-required"
);

}
);
