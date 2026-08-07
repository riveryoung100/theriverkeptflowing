import assert from "node:assert/strict";
import test from "node:test";

import {
createExecutionApproval
} from "./approval-engine";

test(
"creates approved resolution from allowed policy",
() => {

const approval =
createExecutionApproval(
{
version:
"1.0.0",

objective:
"Approval test",

allowed:
true,

policies: [

{
taskId:
"task-1",

state:
"allowed",

reason:
"policy allowed"
}

],

blockedReasons:
[]

}
);

assert.equal(
approval.version,
"1.0.0"
);

assert.equal(
approval.approvals[0]!.state,
"approved"
);

assert.equal(
approval.approved,
true
);

}
);

test(
"blocks approval resolution from blocked policy",
() => {

const approval =
createExecutionApproval(
{
version:
"1.0.0",

objective:
"Blocked approval test",

allowed:
false,

policies: [

{
taskId:
"task-1",

state:
"blocked",

reason:
"policy blocked"
}

],

blockedReasons:
[
"policy blocked"
]

}
);

assert.equal(
approval.approved,
false
);

assert.equal(
approval.approvals[0]!.state,
"blocked"
);

assert.equal(
approval.blockedReasons.length,
1
);

}
);

test(
"requires pending review for review-required policy",
() => {

const approval =
createExecutionApproval(
{
version:
"1.0.0",

objective:
"Review approval test",

allowed:
false,

policies: [

{
taskId:
"task-1",

state:
"review-required",

reason:
"awaiting review"
}

],

blockedReasons:
[]

}
);

assert.equal(
approval.approved,
false
);

assert.equal(
approval.approvals[0]!.state,
"pending-review"
);

}
);
