import assert from "node:assert/strict";
import test from "node:test";

import {
createExecutionAuthorization
} from "./authorization-engine";

test(
"creates authorized execution from approved approval",
() => {

const authorization =
createExecutionAuthorization(
{
version:
"1.0.0",

objective:
"Authorization test",

approved:
true,

approvals: [

{
taskId:
"task-1",

state:
"approved",

reason:
"approval granted"
}

],

blockedReasons:
[]

}
);

assert.equal(
authorization.version,
"1.0.0"
);

assert.equal(
authorization.authorizations[0]!.state,
"authorized"
);

assert.equal(
authorization.authorized,
true
);

}
);

test(
"blocks authorization from blocked approval",
() => {

const authorization =
createExecutionAuthorization(
{
version:
"1.0.0",

objective:
"Blocked authorization test",

approved:
false,

approvals: [

{
taskId:
"task-1",

state:
"blocked",

reason:
"approval blocked"
}

],

blockedReasons:
[
"approval blocked"
]

}
);

assert.equal(
authorization.authorized,
false
);

assert.equal(
authorization.authorizations[0]!.state,
"blocked"
);

assert.equal(
authorization.blockedReasons.length,
1
);

}
);

test(
"requires confirmation for pending review approval",
() => {

const authorization =
createExecutionAuthorization(
{
version:
"1.0.0",

objective:
"Confirmation authorization test",

approved:
false,

approvals: [

{
taskId:
"task-1",

state:
"pending-review",

reason:
"awaiting confirmation"
}

],

blockedReasons:
[]

}
);

assert.equal(
authorization.authorized,
false
);

assert.equal(
authorization.authorizations[0]!.state,
"confirmation-required"
);

}
);
