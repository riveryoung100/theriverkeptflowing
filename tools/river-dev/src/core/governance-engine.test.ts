import assert from "node:assert/strict";
import test from "node:test";

import {
createExecutionGovernance
} from "./governance-engine";

test(
"creates approved governance from complete audit",
() => {

const governance =
createExecutionGovernance(
{
version:
"1.0.0",

objective:
"Governance test",

complete:
true,

history: [

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
governance.version,
"1.0.0"
);

assert.equal(
governance.decisions[0]!.state,
"approved"
);

assert.equal(
governance.approved,
true
);

}
);

test(
"blocks governance from blocked audit",
() => {

const governance =
createExecutionGovernance(
{
version:
"1.0.0",

objective:
"Blocked governance test",

complete:
false,

history: [

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
governance.approved,
false
);

assert.equal(
governance.decisions[0]!.state,
"blocked"
);

assert.equal(
governance.blockedReasons.length,
1
);

}
);

test(
"requires review for approval-required audit",
() => {

const governance =
createExecutionGovernance(
{
version:
"1.0.0",

objective:
"Review governance test",

complete:
false,

history: [

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
governance.approved,
false
);

assert.equal(
governance.decisions[0]!.state,
"review-required"
);

}
);
