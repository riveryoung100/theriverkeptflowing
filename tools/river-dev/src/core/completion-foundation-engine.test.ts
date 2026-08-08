import assert from "node:assert/strict";
import test from "node:test";

import {
createExecutionCompletion
} from "./completion-foundation-engine";

test(
"creates completed execution from approved approval",
() => {

const completion =
createExecutionCompletion(
{
version:
"1.0.0",

objective:
"Completion test",

approved:
true,

approvals:
[
{
taskId:
"approval-boundary",

state:
"approved",

reason:
"verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
completion.version,
"1.0.0"
);

assert.equal(
completion.completed,
true
);

assert.equal(
completion.completion[0]!.taskId,
"approval-boundary"
);

assert.equal(
completion.completion[0]!.state,
"completed"
);

assert.equal(
completion.source,
"controlled-execution-approval"
);

}
);

test(
"blocks completion from rejected approval",
() => {

const completion =
createExecutionCompletion(
{
version:
"1.0.0",

objective:
"Blocked completion test",

approved:
false,

approvals:
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
completion.completed,
false
);

assert.equal(
completion.completion[0]!.state,
"blocked"
);

assert.equal(
completion.blockedReasons.length,
1
);

}
);

test(
"preserves approval provenance in completion",
() => {

const completion =
createExecutionCompletion(
{
version:
"1.0.0",

objective:
"Provenance completion test",

approved:
true,

approvals:
[
{
taskId:
"final-review",

state:
"approved",

reason:
"human verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
completion.completion[0]!.reason,
"human verified"
);

}
);
