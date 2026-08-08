import assert from "node:assert/strict";
import test from "node:test";

import {
createExecutionApproval
} from "./approval-foundation-engine";

test(
"creates approved execution approval from approved review",
() => {

const approval =
createExecutionApproval(
{
version:
"1.0.0",

objective:
"Approval test",

approved:
true,

source:
"controlled-execution-result",

findings:
[
"boundary:successful"
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
approval.approved,
true
);

assert.equal(
approval.approvals[0]!.taskId,
"boundary:successful"
);

assert.equal(
approval.approvals[0]!.state,
"approved"
);

}
);

test(
"rejects execution approval from blocked review",
() => {

const approval =
createExecutionApproval(
{
version:
"1.0.0",

objective:
"Blocked approval test",

approved:
false,

source:
"controlled-execution-result",

findings:
[
"decision:blocked"
],

blockedReasons:
[
"approval required"
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
"preserves review findings in approval steps",
() => {

const approval =
createExecutionApproval(
{
version:
"1.0.0",

objective:
"Provenance approval test",

approved:
true,

source:
"controlled-execution-result",

findings:
[
"approval:verified"
],

blockedReasons:
[]

}
);

assert.equal(
approval.approvals[0]!.taskId,
"approval:verified"
);

assert.equal(
approval.approvals[0]!.reason,
"approval:verified"
);

}
);
