import assert from "node:assert/strict";
import test from "node:test";

import {
createExecutionResult
} from "./result-engine";

test(
"creates successful results from dispatchable state",
() => {

const result =
createExecutionResult(
{
version:
"1.0.0",

objective:
"Result test",

ready:
true,

dispatches: [

{
taskId:
"task-1",

state:
"dispatchable",

reason:
"dispatch approved"
}

],

blockedReasons:
[]

}
);

assert.equal(
result.version,
"1.0.0"
);

assert.equal(
result.results[0]!.state,
"successful"
);

assert.equal(
result.ready,
true
);

}
);

test(
"blocks results from blocked dispatch",
() => {

const result =
createExecutionResult(
{
version:
"1.0.0",

objective:
"Blocked result test",

ready:
false,

dispatches: [

{
taskId:
"task-1",

state:
"blocked",

reason:
"dispatch blocked"
}

],

blockedReasons:
[
"dispatch blocked"
]

}
);

assert.equal(
result.ready,
false
);

assert.equal(
result.results[0]!.state,
"blocked"
);

assert.equal(
result.blockedReasons.length,
1
);

}
);

test(
"requires approval before result readiness",
() => {

const result =
createExecutionResult(
{
version:
"1.0.0",

objective:
"Approval result test",

ready:
true,

dispatches: [

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
result.ready,
false
);

assert.equal(
result.results[0]!.state,
"approval-required"
);

}
);
