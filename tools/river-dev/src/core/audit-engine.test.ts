import assert from "node:assert/strict";
import test from "node:test";

import {
createExecutionAudit
} from "./audit-engine";

test(
"creates complete audit from successful result",
() => {

const audit =
createExecutionAudit(
{
version:
"1.0.0",

objective:
"Audit test",

ready:
true,

results: [

{
taskId:
"task-1",

state:
"successful",

reason:
"execution complete"
}

],

blockedReasons:
[]

}
);

assert.equal(
audit.version,
"1.0.0"
);

assert.equal(
audit.history[0]!.state,
"successful"
);

assert.equal(
audit.complete,
true
);

}
);

test(
"blocks audit completion from blocked result",
() => {

const audit =
createExecutionAudit(
{
version:
"1.0.0",

objective:
"Blocked audit test",

ready:
false,

results: [

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
audit.complete,
false
);

assert.equal(
audit.history[0]!.state,
"blocked"
);

assert.equal(
audit.blockedReasons.length,
1
);

}
);

test(
"preserves approval-required audit state",
() => {

const audit =
createExecutionAudit(
{
version:
"1.0.0",

objective:
"Approval audit test",

ready:
false,

results: [

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
audit.complete,
false
);

assert.equal(
audit.history[0]!.state,
"approval-required"
);

}
);
